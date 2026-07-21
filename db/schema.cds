namespace capSimpleFrontend;

entity Products {
  key Product      : String(40);
      ProductType  : String(10);
      ProductGroup : String(20);
      BaseUnit     : String(10);
      GrossWeight  : Decimal(15,3) @Measures.Unit: WeightUnit;
      NetWeight    : Decimal(15,3) @Measures.Unit: WeightUnit;
      WeightUnit   : String(10);

      PredictedProductGroup : String(20);
      PredictionConfidence  : Decimal(5,4);
      ProductGroupSource    : String(10);

      ConfidenceCriticality : Integer = case
          when PredictionConfidence >= 0.8 then 3
          when PredictionConfidence >= 0.5 then 2
          when PredictionConfidence is not null then 1
        end;
}