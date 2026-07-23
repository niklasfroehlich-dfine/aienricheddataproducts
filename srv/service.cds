using { capSimpleFrontend as db } from '../db/schema';

type ProductGroupSyncResult : {
    total     : Integer;
    succeeded : Integer;
    failed    : Integer;
    message   : String;
}

@requires: 'any'
service MainService {
  function ping() returns String;
  function triggerIntegration() returns String;
  function readProductData() returns String;
  function enrichProductData() returns LargeString;
  // Übergeben werden nur die Produkt-IDs; die Warengruppe liest
  // das Backend selbst aus der DB.
  action writeProductGroupsToErp(
    products : array of String(40)
  ) returns ProductGroupSyncResult;
  // Leert die Warengruppe der übergebenen Produkte im ERP und lokal.
  action resetProductGroups(
    products : array of String(40)
  ) returns ProductGroupSyncResult;

  // Alle geänderten, aber noch nicht übertragenen Produkte.
  // Sobald SyncedProductGroup == ProductGroup ist, verschwindet der Eintrag.
  @readonly
  entity PendingProductGroupUpdates as
    select from db.Products {
      Product,
      ProductDescription,
      ProductGroup,
      ProductGroupSource,
      PredictedProductGroup,
      PredictionConfidence,
      SyncedProductGroup,
      LastSyncedAt
    }
    where ProductGroupSource in ('MANUAL', 'AI')
      and coalesce(SyncedProductGroup, '') <> coalesce(ProductGroup, '');


  @readonly
  entity Products as projection on db.Products actions {
    action applyPrediction();
    action setProductGroup(value : String(20));
  };
}