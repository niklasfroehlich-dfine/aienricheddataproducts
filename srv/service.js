const cds = require('@sap/cds');

const config           = require('./config');
const integrationSuite = require('./lib/integration-suite');
const aiCore           = require('./lib/ai-core');
const mapper           = require('./lib/product-mapper');

const LOG = cds.log('product-group');

module.exports = cds.service.impl(async function () {

  const { Products } = cds.entities(config.cdsNamespace);

  // ---------------------------------------------------------------- Health

  this.on('ping', () => 'pong from CAP backend');

  // ----------------------------------------------------- Integration Suite

  this.on('triggerIntegration', async () => {
    try {
      const data = await integrationSuite.fetchBatchRequest();
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch (error) {
      return `Integration Suite Fehler: ${error.message}`;
    }
  });

  this.on('readProductData', async () => {
    await DELETE.from(Products);

    const payload  = await integrationSuite.fetchMaterialData();
    const products = mapper.mapProductsFromOData(payload);

    if (products.length > 0) {
      await INSERT.into(Products).entries(products);
    }

    return `${products.length} products loaded`;
  });

  // ------------------------------------------------------------- AI Core

  this.on('enrichProductData', async () => {
    const products = await SELECT.from(Products)
      .columns(...mapper.PREDICTION_INPUT_COLUMNS);

    if (products.length === 0) {
      return JSON.stringify({ error: 'Keine Produkte in der DB' });
    }

    const prediction = await aiCore.predictProductGroups(products);

    if (!prediction.ok) {
      return JSON.stringify({ status: prediction.status, error: prediction.error });
    }

    const { result } = prediction;
    const predictions = result.predictions || [];

    let updated = 0;
    for (const row of predictions) {
      const candidate = (row.ProductGroup || [])[0];
      if (!candidate) continue;

      await UPDATE(Products)
        .set({
          PredictedProductGroup: candidate.prediction,
          PredictionConfidence:  candidate.confidence
        })
        .where({ Product: row.Product });

      updated++;
    }

    return JSON.stringify({
      status:       result.status,
      rows_total:   result.metadata?.num_rows,
      rows_queried: result.metadata?.num_query_rows,
      rows_updated: updated
    });
  });

  // --------------------------------------------- Warengruppen-Pflege (lokal)

  this.on('applyPrediction', async (req) => {
    const { Product } = req.params[0];

    const [row] = await SELECT.from(Products)
      .columns('Product', 'PredictedProductGroup')
      .where({ Product });

    if (!row?.PredictedProductGroup) {
      return req.reject(400, 'Für dieses Produkt gibt es keinen KI-Vorschlag.');
    }

    await UPDATE(Products)
      .set({
        ProductGroup:       row.PredictedProductGroup,
        ProductGroupSource: 'AI'
      })
      .where({ Product });
  });

  this.on('setProductGroup', async (req) => {
    const { Product } = req.params[0];
    const value = (req.data.value ?? '').trim();

    await UPDATE(Products)
      .set(value
        ? { ProductGroup: value, ProductGroupSource: 'MANUAL' }
        // Leere Eingabe = Änderung zurücknehmen
        : { ProductGroup: null, ProductGroupSource: 'MANUAL' })
      .where({ Product });
  });

  // ------------------------------------------------------- Helfer fuer ERP

  /** Prueft die uebergebenen IDs gegen die DB und liefert die gefundenen zurueck. */
  async function resolveProductIds(req, rawIds) {
    const ids = [...new Set(
      (rawIds ?? []).map(p => String(p ?? '').trim()).filter(Boolean)
    )];

    if (!ids.length) {
      req.reject(400, 'Es wurde kein Produkt übergeben.');
      return null;
    }

    const rows = await SELECT.from(Products)
      .columns('Product', 'ProductGroup')
      .where({ Product: { in: ids } });

    const missing = ids.filter(id => !rows.some(r => r.Product === id));
    if (missing.length) {
      req.reject(400, `Unbekannte Produkte: ${missing.join(', ')}`);
      return null;
    }

    return rows;
  }

  /**
   * Schreibt Zuordnungen ins ERP und aktualisiert danach nur die Produkte,
   * deren Schreibvorgang bestaetigt wurde.
   *
   * @param {Function} onSuccess  wird pro erfolgreichem Produkt aufgerufen
   * @param {string}   label      Verb fuer die Ergebnismeldung
   */
  async function pushToErp(req, assignments, onSuccess, label) {
    LOG.info(`${assignments.length} Produkt(e) werden ins ERP geschrieben (${label})`);

    const results   = await integrationSuite.writeProductGroups(assignments);
    const succeeded = results.filter(r => r.success);
    const failed    = results.filter(r => !r.success);

    for (const r of succeeded) {
      await onSuccess(r);
    }

    // Fehler einzeln als Message anhaengen -> erscheinen im Fiori Message Popover.
    for (const r of failed) {
      LOG.warn(`Fehler bei ${r.productId}: ${r.message}`);
      req.warn(`${r.productId}: ${r.message}`);
    }

    return {
      total:     results.length,
      succeeded: succeeded.length,
      failed:    failed.length,
      message:   failed.length
        ? `${succeeded.length} von ${results.length} Produkten ${label}, ${failed.length} fehlgeschlagen.`
        : `${succeeded.length} Produkt(e) erfolgreich ${label}.`
    };
  }

  // ------------------------------------------------ Uebertragung ins ERP

  this.on('writeProductGroupsToErp', async (req) => {
    const rows = await resolveProductIds(req, req.data.products);
    if (!rows) return;

    // Die zu schreibende Warengruppe kommt bewusst aus der DB und nicht vom
    // Client - so kann kein veralteter Frontend-Stand zurueckgeschrieben werden.
    const assignments = rows.map(r => ({
      productId:    r.Product,
      productGroup: r.ProductGroup?.trim() ?? ''
    }));

    const syncedAt = new Date().toISOString();

    return pushToErp(req, assignments, async (r) => {
      await UPDATE(Products)
        .set({
          SyncedProductGroup: r.productGroup || null,
          LastSyncedAt:       syncedAt
        })
        .where({ Product: r.productId });
    }, 'übertragen');
  });

  // ------------------------------------------------------ Demo-Reset

  /**
   * Leert die Warengruppe der ausgewaehlten Produkte im ERP und danach lokal.
   *
   * Bewusst ERP zuerst: Schlaegt der Schreibvorgang fehl, bleibt der lokale
   * Stand unveraendert und stimmt weiter mit dem ERP ueberein.
   *
   * KI-Vorschlaege (PredictedProductGroup/PredictionConfidence) bleiben
   * erhalten, damit die Demo ohne erneuten Modell-Lauf wiederholt werden kann.
   */
  this.on('resetProductGroups', async (req) => {
    const rows = await resolveProductIds(req, req.data.products);
    if (!rows) return;

    const assignments = rows.map(r => ({
      productId:    r.Product,
      productGroup: ''
    }));

    const resetAt = new Date().toISOString();

    return pushToErp(req, assignments, async (r) => {
      await UPDATE(Products)
        .set({
          ProductGroup:       null,
          ProductGroupSource: null,
          SyncedProductGroup: null,
          LastSyncedAt:       resetAt
        })
        .where({ Product: r.productId });
    }, 'zurückgesetzt');
  });

});