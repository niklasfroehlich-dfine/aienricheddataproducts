using { capSimpleFrontend as db } from '../db/schema';

@requires: 'any'
service MainService {
  function ping() returns String;
  function triggerIntegration() returns String;

  function readProductData() returns String;

  @readonly
  entity Products as projection on db.Products;
}
