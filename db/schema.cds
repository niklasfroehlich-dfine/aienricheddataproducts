namespace capSimpleFrontend;

@cds.search: { Product, ProductDescription, ProductGroup, ProductType }
entity Products {
  key Product      : String(40) @title: 'Product';
      ProductType  : String(10) @title: 'Product Type';
      ProductGroup : String(20) @title: 'Product Group';
      BaseUnit     : String(10) @title: 'Base Unit';
      GrossWeight  : Decimal(15,3) @title: 'Gross Weight' @Measures.Unit: WeightUnit;
      NetWeight    : Decimal(15,3) @title: 'Net Weight'   @Measures.Unit: WeightUnit;
      WeightUnit   : String(10) @title: 'Weight Unit';

      // --- neu aus A_Product ---
      ItemCategoryGroup         : String(10) @title: 'Item Category Group';
      HandlingUnitType          : String(10) @title: 'Handling Unit Type';
      MaterialVolume            : Decimal(15,3) @title: 'Volume' @Measures.Unit: VolumeUnit;
      VolumeUnit                : String(10) @title: 'Volume Unit';
      LowLevelCode              : String(10) @title: 'Low-Level Code';
      Division                  : String(10) @title: 'Division';
      IsBatchManagementRequired : Boolean    @title: 'Batch Managed';

      // --- neu aus to_Description ---
      ProductDescription        : String(255) @title: 'Description';

      // --- neu aus to_Valuation ---
      ValuationClass              : String(10) @title: 'Valuation Class';
      StandardPrice               : Decimal(15,2) @title: 'Standard Price' @Measures.ISOCurrency: Currency;
      Currency                    : String(5) @title: 'Currency';
      InventoryValuationProcedure : String(5) @title: 'Price Control';
      IsProducedInhouse           : Boolean   @title: 'Produced In-House';

      PredictedProductGroup : String(20)    @title: 'AI Suggestion';
      PredictionConfidence  : Decimal(5,4)  @title: 'Confidence';
      ProductGroupSource    : String(10)    @title: 'Source';

      // Zuletzt erfolgreich ins ERP übertragene Warengruppe.
      // Weicht sie von ProductGroup ab, gilt der Eintrag als "offen".
      SyncedProductGroup : String(9)  @title: 'Synced to ERP';
      LastSyncedAt       : Timestamp  @title: 'Last Synced';

      ConfidenceCriticality : Integer = case
          when PredictionConfidence >= 0.8 then 3
          when PredictionConfidence >= 0.5 then 2
          when PredictionConfidence is not null then 1
        end;
}
