const cds = require('@sap/cds');

const config           = require('./config');
const integrationSuite = require('./lib/integration-suite');
const aiCore           = require('./lib/ai-core');
const mapper           = require('./lib/product-mapper');

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

  this.on('writeProductGroupsToErp', async (req) => {
    const assignments = req.data.assignments ?? [];

    if (!assignments.length) {
      return req.reject(400, 'Es wurde keine Zuordnung übergeben.');
    }

    const cleaned = assignments.map(a => ({
      productId:    a?.productId?.trim(),
      productGroup: a?.productGroup?.trim()
    }));

    if (cleaned.some(a => !a.productId || !a.productGroup)) {
      return req.reject(400, 'Jede Zuordnung benötigt productId und productGroup.');
    }

    const ids = cleaned.map(a => a.productId);
    const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (duplicates.length) {
      return req.reject(400, `Mehrfach enthaltene productId(s): ${duplicates.join(', ')}`);
    }

    const results = await integrationSuite.writeProductGroups(cleaned);

    const failed = results.filter(r => !r.success).length;
    if (failed) {
      req.warn(207, `${failed} von ${results.length} Zuordnung(en) konnten nicht geschrieben werden.`);
    }

    return results;
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

  // ------------------------------------------------------ Warengruppen-Pflege

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
    const { value }   = req.data;

    if (!value || !value.trim()) {
      return req.reject(400, 'Bitte eine Produktgruppe angeben.');
    }

    await UPDATE(Products)
      .set({
        ProductGroup:       value.trim(),
        ProductGroupSource: 'MANUAL'
      })
      .where({ Product });
  });

});