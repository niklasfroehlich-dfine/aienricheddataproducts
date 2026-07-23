const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const config = require('../config');

const { destinationName, paths } = config.integrationSuite;

/**
 * Generischer Aufruf gegen die Integration Suite.
 *
 * Hinweis: Der Cloud-SDK-Client basiert auf Axios, daher kann auch bei
 * method 'GET' ein JSON-Body ueber `data` mitgegeben werden - genau so,
 * wie es die iFlows mit HTTPS-Sender erwarten.
 *
 * @param {object}  options
 * @param {string}  options.path            Pfad des iFlow-Endpunkts
 * @param {string} [options.method='GET']   HTTP-Methode
 * @param {object} [options.data]           Request-Body (auch bei GET erlaubt)
 * @param {object} [options.headers]        Zusaetzliche Header
 * @param {object} [options.requestConfig]  Weitere Cloud-SDK-Optionen
 */
async function callIntegrationSuite({
  path,
  method = 'GET',
  data,
  headers = {},
  requestConfig = {}
}) {
  const request = {
    method,
    url: path,
    headers: {
      Accept: 'application/json',
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    }
  };

  if (data !== undefined) request.data = data;

  return executeHttpRequest({ destinationName }, request, requestConfig);
}

/** Liefert die Materialstammdaten aus dem ERP (OData-Antwort im d.results-Format). */
async function fetchMaterialData() {
  const response = await callIntegrationSuite({ path: paths.materialData });
  return response.data;
}

/** Stoesst den Batch-Request-iFlow an und liefert dessen Rohantwort. */
async function fetchBatchRequest() {
  const response = await callIntegrationSuite({ path: paths.batchRequest });
  return response.data;
}

const { maxParallelCalls } = config.integrationSuite;

/** Schreibt eine einzelne Warengruppe ins ERP. */
async function setProductGroup({ productId, productGroup }) {
  return callIntegrationSuite({
    path: paths.setProductGroup,
    // Der iFlow haengt aktuell am HTTPS-Sender mit GET + JSON-Body.
    // Nach Umstellung in der Integration Suite hier auf 'PATCH' aendern.
    method: 'GET',
    data: { productId, productGroup }
  });
}

/** Zieht eine lesbare Meldung aus Cloud-SDK-/Axios-Fehlern. */
function describeError(err) {
  const statusCode = err?.response?.status ?? err?.cause?.response?.status ?? 0;
  const payload    = err?.response?.data   ?? err?.cause?.response?.data;

  let message;
  if (typeof payload === 'string' && payload.trim()) message = payload.trim();
  else if (payload)                                  message = JSON.stringify(payload);
  else                                               message = err?.message ?? 'Unbekannter Fehler';

  return { statusCode, message: message.slice(0, 500) };
}

/** Arbeitet eine Liste mit begrenzter Parallelitaet ab, Reihenfolge bleibt erhalten. */
async function runWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  });

  await Promise.all(runners);
  return results;
}

/**
 * Schreibt mehrere Zuordnungen. Bricht bei Fehlern nicht ab, sondern
 * liefert pro Eintrag ein Statusobjekt zurueck.
 */
async function writeProductGroups(assignments) {
  return runWithLimit(assignments, maxParallelCalls, async ({ productId, productGroup }) => {
    try {
      const response = await setProductGroup({ productId, productGroup });
      return {
        productId, productGroup,
        success: true,
        statusCode: response.status,
        message: 'Warengruppe im ERP gesetzt.'
      };
    } catch (err) {
      const { statusCode, message } = describeError(err);
      return { productId, productGroup, success: false, statusCode, message };
    }
  });
}

module.exports = {
  callIntegrationSuite,
  fetchMaterialData,
  fetchBatchRequest,
  setProductGroup,
  writeProductGroups
};