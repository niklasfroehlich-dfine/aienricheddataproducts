const config = require('../config');

const { serviceBinding, deploymentId, resourceGroup } = config.aiCore;

/** Liest die AI-Core-Credentials aus dem Service-Binding. */
function getAiCoreCredentials() {
  const vcap = JSON.parse(process.env.VCAP_SERVICES || '{}');
  const binding = (vcap[serviceBinding] || [])[0];
  if (!binding) throw new Error('Kein AI-Core-Binding gefunden (VCAP_SERVICES)');
  return binding.credentials;
}

/** Holt ein OAuth-Token via Client Credentials. */
async function getAiCoreToken(creds) {
  const res = await fetch(`${creds.url}/oauth/token?grant_type=client_credentials`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer
        .from(`${creds.clientid}:${creds.clientsecret}`)
        .toString('base64')
    }
  });
  if (!res.ok) throw new Error(`Token-Fehler ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

/**
 * Baut den RPT-Payload: spaltenorientiert, fehlende Warengruppen werden
 * mit dem Platzhalter [PREDICT] markiert.
 */
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

/**
 * Fuehrt die Inferenz aus.
 *
 * @returns {Promise<{ok: true, result: object} | {ok: false, status: number, error: string}>}
 */
async function predictProductGroups(products) {
  const creds   = getAiCoreCredentials();
  const token   = await getAiCoreToken(creds);
  const payload = buildRptPayload(products);

  const url = `${creds.serviceurls.AI_API_URL}/v2/inference/deployments/${deploymentId}/predict`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'AI-Resource-Group': resourceGroup,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, error: text };
  }

  return { ok: true, result: JSON.parse(text) };
}

module.exports = {
  getAiCoreCredentials,
  getAiCoreToken,
  buildRptPayload,
  predictProductGroups
};