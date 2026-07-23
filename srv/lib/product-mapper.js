/**
 * Umwandlung der ERP-Rohdaten in das Format der Products-Entitaet.
 */

/** Spalten, die als Input fuer die KI-Vorhersage aus der DB gelesen werden. */
const PREDICTION_INPUT_COLUMNS = [
  'Product', 'ProductType', 'ProductGroup', 'BaseUnit',
  'GrossWeight', 'NetWeight', 'WeightUnit',
  'ItemCategoryGroup', 'HandlingUnitType',
  'MaterialVolume', 'VolumeUnit', 'LowLevelCode', 'Division',
  'IsBatchManagementRequired', 'ProductDescription',
  'ValuationClass', 'StandardPrice', 'Currency',
  'InventoryValuationProcedure', 'IsProducedInhouse'
];

/** Leere Strings und undefined zu null, alles andere zu Number. */
function toDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return Number(value);
}

/** Bevorzugt die englische, dann die deutsche, sonst die erste Beschreibung. */
function pickDescription(node) {
  const rows = node?.results || [];
  return rows.find(d => d.Language === 'EN')?.ProductDescription
      ?? rows.find(d => d.Language === 'DE')?.ProductDescription
      ?? rows[0]?.ProductDescription
      ?? null;
}

/** Erster Bewertungsdatensatz, sonst leeres Objekt. */
function pickValuation(node) {
  return (node?.results || [])[0] || {};
}

/** Mappt einen einzelnen ERP-Datensatz auf die Products-Entitaet. */
function mapProduct(p) {
  const val = pickValuation(p.to_Valuation);

  return {
    Product:     p.Product,
    ProductType: p.ProductType || null,
    ProductGroup: p.ProductGroup || null,
    BaseUnit:    p.BaseUnit || null,
    GrossWeight: toDecimal(p.GrossWeight),
    NetWeight:   toDecimal(p.NetWeight),
    WeightUnit:  p.WeightUnit || null,

    ItemCategoryGroup:         p.ItemCategoryGroup || null,
    HandlingUnitType:          p.HandlingUnitType || null,
    MaterialVolume:            toDecimal(p.MaterialVolume),
    VolumeUnit:                p.VolumeUnit || null,
    LowLevelCode:              p.LowLevelCode || null,
    Division:                  p.Division || null,
    IsBatchManagementRequired: p.IsBatchManagementRequired ?? null,

    ProductDescription: pickDescription(p.to_Description),

    ValuationClass:              val.ValuationClass || null,
    StandardPrice:               toDecimal(val.StandardPrice),
    Currency:                    val.Currency || null,
    InventoryValuationProcedure: val.InventoryValuationProcedure || null,
    IsProducedInhouse:           val.IsProducedInhouse ?? null,

    ProductGroupSource: p.ProductGroup ? 'ORIGINAL' : null
  };
}

/** Extrahiert die Produktliste aus der OData-Antwort und mappt sie. */
function mapProductsFromOData(payload) {
  const rawProducts = payload?.d?.results || [];
  return rawProducts.map(mapProduct);
}

module.exports = {
  PREDICTION_INPUT_COLUMNS,
  toDecimal,
  pickDescription,
  pickValuation,
  mapProduct,
  mapProductsFromOData
};