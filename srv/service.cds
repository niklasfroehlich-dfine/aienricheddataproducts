using { capSimpleFrontend as db } from '../db/schema';

@requires: 'any'
service MainService {
  function ping() returns String;
  function triggerIntegration() returns String;
  function readProductData() returns String;
  function enrichProductData() returns LargeString;

  @readonly
  entity Products as projection on db.Products actions {
    action applyPrediction();
    action setProductGroup(value : String(20));
  };
}