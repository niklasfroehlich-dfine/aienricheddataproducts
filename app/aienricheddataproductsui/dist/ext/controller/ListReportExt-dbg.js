sap.ui.define([
  "sap/m/MessageToast"
], function (MessageToast) {
  "use strict";

  return {
    onPing: function () {
      const oModel = this.getModel();
      const oOperation = oModel.bindContext("/ping(...)");

      oOperation.invoke().then(function () {
        const sResult = oOperation.getBoundContext().getProperty("value");
        MessageToast.show(sResult);
      }).catch(function (oError) {
        MessageToast.show("Fehler: " + oError.message);
      });
    }
  };
});