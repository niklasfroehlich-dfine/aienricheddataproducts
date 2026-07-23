sap.ui.define([], function () {
  "use strict";

  return {

    /**
     * Produkte, die im Reset-Dialog vorausgewählt sind.
     *
     * Das sind die Produkte, die im Rahmen der Demo eine Warengruppe
     * bekommen und danach wieder geleert werden sollen. Einträge, die in
     * der Datenbank nicht existieren, werden ignoriert und im Dialog
     * als Hinweis angezeigt.
     */
    resetPreselection: [
      "EWMS4-PAL00",
      "EWMS4-PAL01",
      "EWMS4-PALISU",
      "EWMS4-CAR00",
      "EWMS4-STOCON00",
      "EWMS4-WBTRO00",
      "KUP001",
      "T-AN1",
      "TEST",
      "TST"
    ]

  };
});