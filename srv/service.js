const AICORE_DEPLOYMENT_ID = 'dd208f9b4152c64f';
const AICORE_RESOURCE_GROUP = 'default';

const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

module.exports = cds.service.impl(async function () {
  const { Products } = cds.entities('capSimpleFrontend');

  this.on('ping', () => {
    return 'pong from CAP backend';
  });

  this.on('triggerIntegration', async () => {
    try {
      const response = await executeHttpRequest(
        { destinationName: 'RPT_INTEGRATION_SUITE' },
        {
          method: 'GET',
          url: '/http/erp-product-details/batch-request'
        }
      );

      return typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

    } catch (error) {
      return `Integration Suite Fehler: ${error.message}`;
    }
  });

  this.on('readProductData', async () => {
    await DELETE.from(Products);

    const response = await callIntegrationSuite();

    const rawProducts = response?.d?.results || [];

    const mappedProducts = rawProducts.map(p => {
      const val = pickValuation(p.to_Valuation);
      return {
        Product: p.Product,
        ProductType: p.ProductType || null,
        ProductGroup: p.ProductGroup || null,
        BaseUnit: p.BaseUnit || null,
        GrossWeight: toDecimal(p.GrossWeight),
        NetWeight: toDecimal(p.NetWeight),
        WeightUnit: p.WeightUnit || null,

        ItemCategoryGroup: p.ItemCategoryGroup || null,
        HandlingUnitType: p.HandlingUnitType || null,
        MaterialVolume: toDecimal(p.MaterialVolume),
        VolumeUnit: p.VolumeUnit || null,
        LowLevelCode: p.LowLevelCode || null,
        Division: p.Division || null,
        IsBatchManagementRequired: p.IsBatchManagementRequired ?? null,

        ProductDescription: pickDescription(p.to_Description),

        ValuationClass: val.ValuationClass || null,
        StandardPrice: toDecimal(val.StandardPrice),
        Currency: val.Currency || null,
        InventoryValuationProcedure: val.InventoryValuationProcedure || null,
        IsProducedInhouse: val.IsProducedInhouse ?? null,

        ProductGroupSource: p.ProductGroup ? 'ORIGINAL' : null
      };
    });

    if (mappedProducts.length > 0) {
      await INSERT.into(Products).entries(mappedProducts);
    }

    return `${mappedProducts.length} products loaded`;
  });

  this.on('enrichProductData', async () => {
    const products = await SELECT.from(Products).columns(
      'Product', 'ProductType', 'ProductGroup', 'BaseUnit',
      'GrossWeight', 'NetWeight', 'WeightUnit',
      'ItemCategoryGroup', 'HandlingUnitType',
      'MaterialVolume', 'VolumeUnit', 'LowLevelCode', 'Division',
      'IsBatchManagementRequired', 'ProductDescription',
      'ValuationClass', 'StandardPrice', 'Currency',
      'InventoryValuationProcedure', 'IsProducedInhouse'
    );
    if (products.length === 0) return JSON.stringify({ error: 'Keine Produkte in der DB' });

    const creds = getAiCoreCredentials();
    const token = await getAiCoreToken(creds);
    const payload = buildRptPayload(products);

    const url = `${creds.serviceurls.AI_API_URL}/v2/inference/deployments/${AICORE_DEPLOYMENT_ID}/predict`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'AI-Resource-Group': AICORE_RESOURCE_GROUP,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    if (!res.ok) return JSON.stringify({ status: res.status, error: text });

    const result = JSON.parse(text);
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
      status: result.status,
      rows_total: result.metadata?.num_rows,
      rows_queried: result.metadata?.num_query_rows,
      rows_updated: updated
    });
  });

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
        ProductGroup: row.PredictedProductGroup,
        ProductGroupSource: 'AI'
      })
      .where({ Product });
  });

  this.on('setProductGroup', async (req) => {
    const { Product } = req.params[0];
    const { value } = req.data;

    if (!value || !value.trim()) {
      return req.reject(400, 'Bitte eine Produktgruppe angeben.');
    }

    await UPDATE(Products)
      .set({
        ProductGroup: value.trim(),
        ProductGroupSource: 'MANUAL'
      })
      .where({ Product });
  });
});

function toDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return Number(value);
}

async function callIntegrationSuite() {
  const response = await executeHttpRequest(
    { destinationName: 'RPT_INTEGRATION_SUITE' },
    {
      method: 'GET',
      url: '/http/material-data-from-erp',
      headers: {
        Accept: 'application/json'
      }
    }
  );

  return response.data;
}

function getAiCoreCredentials() {
  const vcap = JSON.parse(process.env.VCAP_SERVICES || '{}');
  const binding = (vcap.aicore || [])[0];
  if (!binding) throw new Error('Kein AI-Core-Binding gefunden (VCAP_SERVICES)');
  return binding.credentials;
}

async function getAiCoreToken(creds) {
  const res = await fetch(`${creds.url}/oauth/token?grant_type=client_credentials`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${creds.clientid}:${creds.clientsecret}`).toString('base64')
    }
  });
  if (!res.ok) throw new Error(`Token-Fehler ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

function buildRptPayload(products) {
  const fields = {
    Product:                     'string',
    ProductDescription:          'string',
    ProductType:                 'string',
    ProductGroup:                'string',
    ItemCategoryGroup:           'string',
    HandlingUnitType:            'string',
    BaseUnit:                    'string',
    GrossWeight:                 'numeric',
    NetWeight:                   'numeric',
    WeightUnit:                  'string',
    MaterialVolume:              'numeric',
    VolumeUnit:                  'string',
    LowLevelCode:                'string',
    Division:                    'string',
    IsBatchManagementRequired:   'string',
    ValuationClass:              'string',
    StandardPrice:               'numeric',
    Currency:                    'string',
    InventoryValuationProcedure: 'string',
    IsProducedInhouse:           'string'
  };

  const cols = {};
  const data_schema = {};
  for (const [name, dtype] of Object.entries(fields)) {
    cols[name] = [];
    data_schema[name] = { dtype };
  }

  for (const p of products) {
    for (const name of Object.keys(fields)) {
      if (name === 'ProductGroup') {
        cols.ProductGroup.push(
          p.ProductGroup && String(p.ProductGroup).trim() !== ''
            ? p.ProductGroup
            : '[PREDICT]'
        );
      } else {
        const v = p[name];
        cols[name].push(
          v === undefined || v === '' ? null
          : typeof v === 'boolean' ? String(v)
          : v
        );
      }
    }
  }

  return {
    index_column: 'Product',
    prediction_config: {
      target_columns: [{
        name: 'ProductGroup',
        prediction_placeholder: '[PREDICT]',
        task_type: 'classification',
        top_k: 1
      }]
    },
    columns: cols,
    data_schema
  };
}

function pickDescription(node) {
  const rows = node?.results || [];
  return rows.find(d => d.Language === 'EN')?.ProductDescription
      ?? rows.find(d => d.Language === 'DE')?.ProductDescription
      ?? rows[0]?.ProductDescription
      ?? null;
}

function pickValuation(node) {
  return (node?.results || [])[0] || {};
}