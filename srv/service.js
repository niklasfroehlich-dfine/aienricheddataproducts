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
    // TODO: hier deinen funktionierenden Integration-Suite-Call einsetzen
    const response = await callIntegrationSuite();

    const rawProducts = response?.d?.results || [];

    const mappedProducts = rawProducts.map(p => ({
      Product: p.Product,
      ProductType: p.ProductType || null,
      ProductGroup: p.ProductGroup || null,
      BaseUnit: p.BaseUnit || null,
      GrossWeight: toDecimal(p.GrossWeight),
      NetWeight: toDecimal(p.NetWeight),
      WeightUnit: p.WeightUnit || null
    }));

    if (mappedProducts.length > 0) {
      await UPSERT.into(Products).entries(mappedProducts);
    }

    return `${mappedProducts.length} products loaded`;
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