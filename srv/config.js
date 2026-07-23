/**
 * Zentrale Konfiguration.
 *
 * Alle Werte lassen sich per Umgebungsvariable ueberschreiben, ohne dass
 * Code angefasst werden muss (z.B. andere Deployment-ID pro Landscape).
 */
module.exports = {

  /** CDS-Namespace, aus dem die Entitaeten geladen werden. */
  cdsNamespace: 'capSimpleFrontend',

  integrationSuite: {
    /** Name der Destination im BTP Cockpit. */
    destinationName: process.env.DEST_INTEGRATION_SUITE || 'RPT_INTEGRATION_SUITE',

    /** Endpunkte der einzelnen iFlows. */
    paths: {
      materialData:    '/http/material-data-from-erp',
      batchRequest:    '/http/erp-product-details/batch-request',
      setProductGroup: '/http/set-product-group'
    },

    maxParallelCalls: 1
  },

  aiCore: {
    /** Name des Service-Bindings in VCAP_SERVICES. */
    serviceBinding: 'aicore',
    deploymentId:   process.env.AICORE_DEPLOYMENT_ID  || 'dd208f9b4152c64f',
    resourceGroup:  process.env.AICORE_RESOURCE_GROUP || 'default'
  }

};