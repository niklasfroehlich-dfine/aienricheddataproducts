sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/BusyIndicator",
  "sap/ui/core/Fragment",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "aienricheddataproductsui/ext/config/demoConfig"
], function (MessageToast, MessageBox, BusyIndicator, Fragment, JSONModel, Filter, FilterOperator, demoConfig) {
  "use strict";

  const TRANSFER_FRAGMENT = "aienricheddataproductsui.ext.fragment.TransferUpdatesDialog";
  const RESET_FRAGMENT    = "aienricheddataproductsui.ext.fragment.ResetDemoDialog";

  const PENDING_PATH  = "/PendingProductGroupUpdates";
  const PRODUCTS_PATH = "/Products";
  const MAX_ROWS      = 1000;

  // Dialoge werden einmal geladen und danach wiederverwendet.
  let oTransferDialog = null;
  let oResetDialog    = null;

  // ExtensionAPI der List-Report-Seite, wird beim Buttonklick gesetzt.
  let oPageApi = null;

  /** Liest alle noch nicht uebertragenen Aenderungen aus dem Backend. */
  async function loadPendingRows(oModel) {
    const oListBinding = oModel.bindList(PENDING_PATH, null, null, null, {
      $select: "Product,ProductDescription,ProductGroup,ProductGroupSource,SyncedProductGroup"
    });

    const aContexts = await oListBinding.requestContexts(0, MAX_ROWS);

    // 'selected' steuert die Checkbox im Dialog - initial alles vorausgewaehlt.
    return aContexts.map(oCtx => Object.assign({ selected: true }, oCtx.getObject()));
  }

  /**
   * Liest alle Produkte fuer den Reset-Dialog.
   *
   * Vorausgewaehlt sind genau die Produkte aus demoConfig.resetPreselection.
   * Alle uebrigen Produkte stehen zur freien Auswahl darunter.
   */
  async function loadResetRows(oModel) {
    const oListBinding = oModel.bindList(PRODUCTS_PATH, null, null, null, {
      $select: "Product,ProductDescription,ProductGroup,ProductGroupSource,PredictionConfidence"
    });

    const aContexts = await oListBinding.requestContexts(0, MAX_ROWS);
    const oPreselected = new Set(demoConfig.resetPreselection);

    const aRows = aContexts.map(oCtx => {
      const oData = oCtx.getObject();
      return Object.assign({ selected: oPreselected.has(oData.Product) }, oData);
    });

    // Vorausgewaehlte nach oben, darunter alphabetisch.
    aRows.sort((a, b) =>
      (Number(b.selected) - Number(a.selected)) || a.Product.localeCompare(b.Product)
    );

    // Konfigurierte Produkte, die es in der DB gar nicht gibt.
    const aLoaded = new Set(aRows.map(oRow => oRow.Product));
    const aMissing = demoConfig.resetPreselection.filter(sId => !aLoaded.has(sId));

    let sHint = "Für die ausgewählten Produkte wird die Warengruppe im SAP-System geleert. " +
                "Vorausgewählt sind die in der Demo-Konfiguration hinterlegten Produkte.";
    if (aMissing.length) {
      sHint += " Nicht in der Datenbank gefunden: " + aMissing.join(", ") + ".";
    }

    return { rows: aRows, hint: sHint };
  }

  /** Ruft eine unbound Action mit einer Produktliste auf und liefert das Ergebnis. */
  async function invokeWithProducts(oModel, sActionPath, aProductIds) {
    const oOperation = oModel.bindContext(sActionPath);
    oOperation.setParameter("products", aProductIds);
    await oOperation.invoke();
    return oOperation.getBoundContext().getObject();
  }

  /** Zeigt das Ergebnis einer Massenaktion an. */
  function showResult(oResult) {
    if (oResult.failed > 0) {
      MessageBox.warning(oResult.message);
    } else {
      MessageToast.show(oResult.message);
    }
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
            name:       TRANSFER_FRAGMENT,
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
        const oResult = await invokeWithProducts(
          oPageApi.getModel(),
          "/writeProductGroupsToErp(...)",
          aSelected.map(oRow => oRow.Product)
        );

        oTransferDialog.close();
        showResult(oResult);
        oPageApi.refresh();

      } catch (oError) {
        MessageBox.error("Übertragung fehlgeschlagen: " + oError.message);
      } finally {
        oTransferDialog.setBusy(false);
      }
    },

    onCancelTransfer: function () {
      oTransferDialog.close();
    },

    // ------------------------------------------------------ Demo-Reset

    /** Oeffnet den Reset-Dialog mit allen Produkten. */
    onResetDemo: async function () {
      oPageApi = this;
      const oModel = this.getModel();

      BusyIndicator.show(0);
      try {
        const oData = await loadResetRows(oModel);

        if (oData.rows.length === 0) {
          MessageToast.show("Es sind keine Produkte geladen.");
          return;
        }

        if (!oResetDialog) {
          oResetDialog = await Fragment.load({
            id:         "resetDemo",
            name:       RESET_FRAGMENT,
            controller: oHandlers
          });
        }

        oResetDialog.setModel(new JSONModel(oData), "reset");
        oResetDialog.open();

      } catch (oError) {
        MessageBox.error("Produkte konnten nicht geladen werden: " + oError.message);
      } finally {
        BusyIndicator.hide();
      }
    },

    /** Clientseitige Suche im Reset-Dialog. Die Auswahl bleibt dabei erhalten. */
    onSearchReset: function (oEvent) {
      const sQuery = (oEvent.getParameter("newValue") || "").trim();
      const oTable = Fragment.byId("resetDemo", "resetTable");
      const oBinding = oTable.getBinding("items");

      oBinding.filter(sQuery
        ? new Filter({
            filters: [
              new Filter("Product", FilterOperator.Contains, sQuery),
              new Filter("ProductDescription", FilterOperator.Contains, sQuery)
            ],
            and: false
          })
        : []);
    },

    onConfirmReset: async function () {
      const aSelected = oResetDialog.getModel("reset")
        .getProperty("/rows")
        .filter(oRow => oRow.selected);

      if (aSelected.length === 0) {
        MessageToast.show("Bitte mindestens ein Produkt auswählen.");
        return;
      }

      oResetDialog.setBusy(true);
      try {
        const oResult = await invokeWithProducts(
          oPageApi.getModel(),
          "/resetProductGroups(...)",
          aSelected.map(oRow => oRow.Product)
        );

        oResetDialog.close();
        showResult(oResult);
        oPageApi.refresh();

      } catch (oError) {
        MessageBox.error("Zurücksetzen fehlgeschlagen: " + oError.message);
      } finally {
        oResetDialog.setBusy(false);
      }
    },

    onCancelReset: function () {
      oResetDialog.close();
    }

  };

  return oHandlers;
});