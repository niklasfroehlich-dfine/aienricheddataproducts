namespace capSimpleFrontend;

@cds.search: { Product, ProductDescription, ProductGroup, ProductType }
entity Products {
  key Product      : String(40);
      ProductType  : String(10);
      ProductGroup : String(20);
      BaseUnit     : String(10);
      GrossWeight  : Decimal(15,3) @Measures.Unit: WeightUnit;
      NetWeight    : Decimal(15,3) @Measures.Unit: WeightUnit;
      WeightUnit   : String(10);

      // --- neu aus A_Product ---
      ItemCategoryGroup         : String(10);
      HandlingUnitType          : String(10);
      MaterialVolume            : Decimal(15,3) @Measures.Unit: VolumeUnit;
      VolumeUnit                : String(10);
      LowLevelCode              : String(10);
      Division                  : String(10);
      IsBatchManagementRequired : Boolean;

      // --- neu aus to_Description ---
      ProductDescription        : String(255);

      // --- neu aus to_Valuation ---
      ValuationClass              : String(10);
      StandardPrice               : Decimal(15,2) @Measures.ISOCurrency: Currency;
      Currency                    : String(5);
      InventoryValuationProcedure : String(5);
      IsProducedInhouse           : Boolean;

      PredictedProductGroup : String(20);
      PredictionConfidence  : Decimal(5,4);
      ProductGroupSource    : String(10);

      ConfidenceCriticality : Integer = case
          when PredictionConfidence >= 0.8 then 3
          when PredictionConfidence >= 0.5 then 2
          when PredictionConfidence is not null then 1
        end;
}