namespace capSimpleFrontend;

entity Products {
  key Product      : String(40);
      ProductType  : String(10);
      ProductGroup : String(20);
      BaseUnit     : String(10);
      GrossWeight  : Decimal(15,3) @Measures.Unit: WeightUnit;
      NetWeight    : Decimal(15,3) @Measures.Unit: WeightUnit;
      WeightUnit   : String(10);
}