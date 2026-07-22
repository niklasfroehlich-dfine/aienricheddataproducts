sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/BusyIndicator"
], function (MessageToast, MessageBox, BusyIndicator) {
  "use strict";

  return {
    onLoadProducts: function () {
      const that = this;
      const oModel = this.getModel();
      const oOperation = oModel.bindContext("/readProductData(...)");

      BusyIndicator.show(0);

      oOperation.invoke().then(function () {
        BusyIndicator.hide();
        const sResult = oOperation.getBoundContext().getProperty("value");
        MessageToast.show(sResult);
        that.refresh();
      }).catch(function (oError) {
        BusyIndicator.hide();
        MessageBox.error("Laden fehlgeschlagen: " + oError.message);
      });
    },

    onEnrichProducts: function () {
      const that = this;
      const oModel = this.getModel();
      const oOperation = oModel.bindContext("/enrichProductData(...)");

      BusyIndicator.show(0);

      oOperation.invoke().then(function () {
        BusyIndicator.hide();
        const sResult = oOperation.getBoundContext().getProperty("value");

        let sMessage = sResult;
        try {
          const oResult = JSON.parse(sResult);
          if (oResult.error) {
            MessageBox.error("Anreicherung fehlgeschlagen: " + oResult.error);
            return;
          }
          sMessage = oResult.rows_updated + " von " + oResult.rows_queried +
                     " Produkten angereichert";
        } catch (e) {
          // Antwort war kein JSON – Rohtext anzeigen
        }

        MessageToast.show(sMessage);
        that.refresh();
      }).catch(function (oError) {
        BusyIndicator.hide();
        MessageBox.error("Anreicherung fehlgeschlagen: " + oError.message);
      });
    }
  };
});