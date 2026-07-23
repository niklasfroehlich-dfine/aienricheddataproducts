using { capSimpleFrontend as db } from '../db/schema';

type ProductGroupAssignment : {
  productId    : String(40) not null;
  productGroup : String(9)  not null;
}

type ProductGroupResult : {
  productId    : String(40);
  productGroup : String(9);
  success      : Boolean;
  statusCode   : Integer;
  message      : String;
}


@requires: 'any'
service MainService {
  function ping() returns String;
  function triggerIntegration() returns String;
  function readProductData() returns String;
  function enrichProductData() returns LargeString;
  action writeProductGroupsToErp(
    assignments : array of ProductGroupAssignment
  ) returns array of ProductGroupResult;

  @readonly
  entity Products as projection on db.Products actions {
    action applyPrediction();
    action setProductGroup(value : String(20));
  };
}