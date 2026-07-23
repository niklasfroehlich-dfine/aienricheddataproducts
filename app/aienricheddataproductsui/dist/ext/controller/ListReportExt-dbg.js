sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/BusyIndicator",
  "sap/ui/core/Fragment",
  "sap/ui/model/json/JSONModel"
], function (MessageToast, MessageBox, BusyIndicator, Fragment, JSONModel) {
  "use strict";

  const FRAGMENT_NAME = "aienricheddataproductsui.ext.fragment.TransferUpdatesDialog";
  const PENDING_PATH  = "/PendingProductGroupUpdates";
  const MAX_PENDING   = 1000;

  // Dialog wird einmal geladen und danach wiederverwendet.
  let oTransferDialog = null;
  // ExtensionAPI der List-Report-Seite, wird beim Buttonklick gesetzt.
  let oPageApi = null;

  /** Liest alle noch nicht uebertragenen Aenderungen aus dem Backend. */
  async function loadPendingRows(oModel) {
    const oListBinding = oModel.bindList(PENDING_PATH, null, null, null, {
      $select: "Product,ProductDescription,ProductGroup,ProductGroupSource,SyncedProductGroup"
    });

    const aContexts = await oListBinding.requestContexts(0, MAX_PENDING);

    // 'selected' steuert die Checkbox im Dialog - initial alles vorausgewaehlt.
    return aContexts.map(oCtx => Object.assign({ selected: true }, oCtx.getObject()));
  }

  const oHandlers = {

    // -------------------------------------------------- bestehende Aktionen

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
    },

    // ------------------------------------------- Uebertragung ins ERP

    /** Oeffnet den Bestaetigungsdialog mit allen offenen Aenderungen. */
    onTransferUpdates: async function () {
      oPageApi = this;
      const oModel = this.getModel();

      BusyIndicator.show(0);
      try {
        const aRows = await loadPendingRows(oModel);

        if (aRows.length === 0) {
          MessageToast.show("Es gibt keine offenen Änderungen zum Übertragen.");
          return;
        }

        if (!oTransferDialog) {
          oTransferDialog = await Fragment.load({
            id:         "transferUpdates",
            name:       FRAGMENT_NAME,
            controller: oHandlers
          });
        }

        oTransferDialog.setModel(new JSONModel({ rows: aRows }), "pending");
        oTransferDialog.open();

      } catch (oError) {
        MessageBox.error("Offene Änderungen konnten nicht ermittelt werden: " + oError.message);
      } finally {
        BusyIndicator.hide();
      }
    },

    /** Ruft die Action fuer die im Dialog ausgewaehlten Produkte auf. */
    onConfirmTransfer: async function () {
      const aSelected = oTransferDialog.getModel("pending")
        .getProperty("/rows")
        .filter(oRow => oRow.selected);

      if (aSelected.length === 0) {
        MessageToast.show("Bitte mindestens ein Produkt auswählen.");
        return;
      }

      oTransferDialog.setBusy(true);
      try {
        const oModel = oPageApi.getModel();
        const oOperation = oModel.bindContext("/writeProductGroupsToErp(...)");

        oOperation.setParameter("products", aSelected.map(oRow => oRow.Product));
        await oOperation.invoke();

        const oResult = oOperation.getBoundContext().getObject();

        oTransferDialog.close();

        if (oResult.failed > 0) {
          MessageBox.warning(oResult.message);
        } else {
          MessageToast.show(oResult.message);
        }

        oPageApi.refresh();

      } catch (oError) {
        MessageBox.error("Übertragung fehlgeschlagen: " + oError.message);
      } finally {
        oTransferDialog.setBusy(false);
      }
    },

    onCancelTransfer: function () {
      oTransferDialog.close();
    }

  };

  return oHandlers;
});