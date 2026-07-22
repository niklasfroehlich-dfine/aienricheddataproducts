using MainService as service from '../../srv/service';

annotate service.Products with @(

    // ===== Kopfzeile der Object Page =====
    UI.HeaderInfo : {
        $Type          : 'UI.HeaderInfoType',
        TypeName       : 'Produkt',
        TypeNamePlural : 'Produkte',
        Title          : { $Type : 'UI.DataField', Value : ProductDescription },
        Description    : { $Type : 'UI.DataField', Value : Product },
    },

    // ===== Object Page: Stammdaten =====
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Label : 'Produkt',            Value : Product },
            { $Type : 'UI.DataField', Label : 'Bezeichnung',        Value : ProductDescription },
            { $Type : 'UI.DataField', Label : 'Produktart',         Value : ProductType },
            { $Type : 'UI.DataField', Label : 'Warengruppe',        Value : ProductGroup },
            { $Type : 'UI.DataField', Label : 'Positionstypengr.',  Value : ItemCategoryGroup },
            { $Type : 'UI.DataField', Label : 'Handling-Unit-Typ',  Value : HandlingUnitType },
            { $Type : 'UI.DataField', Label : 'Basismengeneinheit', Value : BaseUnit },
            { $Type : 'UI.DataField', Label : 'Bruttogewicht',      Value : GrossWeight },
            { $Type : 'UI.DataField', Label : 'Nettogewicht',       Value : NetWeight },
            { $Type : 'UI.DataField', Label : 'Volumen',            Value : MaterialVolume },
            { $Type : 'UI.DataField', Label : 'Dispostufe',         Value : LowLevelCode },
            { $Type : 'UI.DataField', Label : 'Sparte',             Value : Division },
            { $Type : 'UI.DataField', Label : 'Chargenpflicht',     Value : IsBatchManagementRequired },
        ],
    },

    // ===== Object Page: Bewertung =====
    UI.FieldGroup #Valuation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Label : 'Bewertungsklasse', Value : ValuationClass },
            { $Type : 'UI.DataField', Label : 'Standardpreis',    Value : StandardPrice },
            { $Type : 'UI.DataField', Label : 'Preissteuerung',   Value : InventoryValuationProcedure },
            { $Type : 'UI.DataField', Label : 'Eigenfertigung',   Value : IsProducedInhouse },
        ],
    },

    // ===== Object Page: KI-Vorschlag =====
    UI.FieldGroup #Prediction : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'KI-Vorschlag',
                Value : PredictedProductGroup,
                Criticality : ConfidenceCriticality,
            },
            { $Type : 'UI.DataField', Label : 'Konfidenz', Value : PredictionConfidence },
            { $Type : 'UI.DataField', Label : 'Herkunft',  Value : ProductGroupSource },
            {
                $Type : 'UI.DataFieldForAction',
                Label : 'Vorschlag übernehmen',
                Action : 'MainService.applyPrediction',
            },
            {
                $Type : 'UI.DataFieldForAction',
                Label : 'Produktgruppe manuell setzen',
                Action : 'MainService.setProductGroup',
            },
        ],
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneratedFacet1',
            Label  : 'Stammdaten',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ValuationFacet',
            Label  : 'Bewertung',
            Target : '@UI.FieldGroup#Valuation',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'PredictionFacet',
            Label  : 'KI-Vorschlag',
            Target : '@UI.FieldGroup#Prediction',
        },
    ],

    // ===== Tabelle: Tab "Alle Produkte" =====
    UI.LineItem : [
        { $Type : 'UI.DataField', Label : 'Produkt',      Value : Product },
        { $Type : 'UI.DataField', Label : 'Bezeichnung',  Value : ProductDescription },
        { $Type : 'UI.DataField', Label : 'Produktart',   Value : ProductType },
        { $Type : 'UI.DataField', Label : 'Warengruppe',  Value : ProductGroup },
        { $Type : 'UI.DataField', Label : 'Bew.klasse',   Value : ValuationClass },
        { $Type : 'UI.DataField', Label : 'Einheit',      Value : BaseUnit },
        { $Type : 'UI.DataField', Label : 'Bruttogew.',   Value : GrossWeight },
        { $Type : 'UI.DataField', Label : 'Herkunft',     Value : ProductGroupSource },
        {
            $Type : 'UI.DataField',
            Label : 'KI-Vorschlag',
            Value : PredictedProductGroup,
            Criticality : ConfidenceCriticality,
        },
        { $Type : 'UI.DataField', Label : 'Konfidenz',    Value : PredictionConfidence },
    ],

    // ===== Tabelle: Tab "KI-Vorschläge" =====
    UI.LineItem #WithPrediction : [
        { $Type : 'UI.DataField', Label : 'Produkt',       Value : Product },
        { $Type : 'UI.DataField', Label : 'Bezeichnung',   Value : ProductDescription },
        { $Type : 'UI.DataField', Label : 'Produktart',    Value : ProductType },
        { $Type : 'UI.DataField', Label : 'HU-Typ',        Value : HandlingUnitType },
        { $Type : 'UI.DataField', Label : 'Bew.klasse',    Value : ValuationClass },
        {
            $Type : 'UI.DataField',
            Label : 'KI-Vorschlag',
            Value : PredictedProductGroup,
            Criticality : ConfidenceCriticality,
        },
        { $Type : 'UI.DataField', Label : 'Konfidenz', Value : PredictionConfidence },
        { $Type : 'UI.DataField', Label : 'Herkunft',  Value : ProductGroupSource },
        {
            $Type : 'UI.DataFieldForAction',
            Label : 'Vorschlag übernehmen',
            Action : 'MainService.applyPrediction',
        },
    ],

    UI.SelectionPresentationVariant #TabAll : {
        $Type : 'UI.SelectionPresentationVariantType',
        Text : 'Alle Produkte',
        SelectionVariant : {
            $Type : 'UI.SelectionVariantType',
            SelectOptions : [],
        },
        PresentationVariant : {
            $Type : 'UI.PresentationVariantType',
            Visualizations : ['@UI.LineItem'],
        },
    },

    UI.SelectionPresentationVariant #TabPredicted : {
        $Type : 'UI.SelectionPresentationVariantType',
        Text : 'KI-Vorschläge',
        SelectionVariant : {
            $Type : 'UI.SelectionVariantType',
            SelectOptions : [
                {
                    $Type : 'UI.SelectOptionType',
                    PropertyName : PredictionConfidence,
                    Ranges : [
                        {
                            $Type : 'UI.SelectionRangeType',
                            Sign : #I,
                            Option : #GT,
                            Low : 0,
                        },
                    ],
                },
            ],
        },
        PresentationVariant : {
            $Type : 'UI.PresentationVariantType',
            Visualizations : ['@UI.LineItem#WithPrediction'],
            SortOrder : [
                {
                    $Type : 'Common.SortOrderType',
                    Property : PredictionConfidence,
                    Descending : true,
                },
            ],
        },
    },

    UI.SelectionFields : [
        Product,
        ProductGroup,
        ProductType,
        ItemCategoryGroup,
        ValuationClass,
    ],
);

annotate service.Products with actions {
  applyPrediction @(
    Common.SideEffects : {
      TargetProperties : ['_it/ProductGroup', '_it/ProductGroupSource']
    }
  );
  setProductGroup @(
    Common.SideEffects : {
      TargetProperties : ['_it/ProductGroup', '_it/ProductGroupSource']
    }
  ) (
    value @title : 'Neue Produktgruppe'
  );
};