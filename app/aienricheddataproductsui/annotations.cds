using MainService as service from '../../srv/service';

annotate service.Products with @(

    // ===== Object Page header =====
    UI.HeaderInfo : {
        $Type          : 'UI.HeaderInfoType',
        TypeName       : 'Product',
        TypeNamePlural : 'Products',
        Title          : { $Type : 'UI.DataField', Value : ProductDescription },
        Description    : { $Type : 'UI.DataField', Value : Product },
    },

    // ===== Object Page: master data =====
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : Product },
            { $Type : 'UI.DataField', Value : ProductDescription },
            { $Type : 'UI.DataField', Value : ProductType },
            { $Type : 'UI.DataField', Value : ProductGroup },
            { $Type : 'UI.DataField', Value : ItemCategoryGroup },
            { $Type : 'UI.DataField', Value : HandlingUnitType },
            { $Type : 'UI.DataField', Value : BaseUnit },
            { $Type : 'UI.DataField', Value : GrossWeight },
            { $Type : 'UI.DataField', Value : NetWeight },
            { $Type : 'UI.DataField', Value : MaterialVolume },
            { $Type : 'UI.DataField', Value : LowLevelCode },
            { $Type : 'UI.DataField', Value : Division },
            { $Type : 'UI.DataField', Value : IsBatchManagementRequired },
        ],
    },

    // ===== Object Page: valuation =====
    UI.FieldGroup #Valuation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : ValuationClass },
            { $Type : 'UI.DataField', Value : StandardPrice },
            { $Type : 'UI.DataField', Value : InventoryValuationProcedure },
            { $Type : 'UI.DataField', Value : IsProducedInhouse },
        ],
    },

    // ===== Object Page: AI suggestion =====
    UI.FieldGroup #Prediction : {
        $Type : 'UI.FieldGroupType',
        Data : [
            // Current value first, so it can be compared with the suggestion.
            { $Type : 'UI.DataField', Value : ProductGroup },
            { $Type : 'UI.DataField', Value : ProductGroupSource },
            {
                $Type : 'UI.DataField',
                Value : PredictedProductGroup,
                Criticality : ConfidenceCriticality,
            },
            { $Type : 'UI.DataField', Value : PredictionConfidence },
            {
                $Type : 'UI.DataFieldForAction',
                Label : 'Apply Suggestion',
                Action : 'MainService.applyPrediction',
            },
            {
                $Type : 'UI.DataFieldForAction',
                Label : 'Set Product Group Manually',
                Action : 'MainService.setProductGroup',
            },
        ],
    },

    // ===== Object Page: ERP synchronisation =====
    UI.FieldGroup #ErpSync : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : SyncedProductGroup },
            { $Type : 'UI.DataField', Value : LastSyncedAt },
        ],
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneratedFacet1',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ValuationFacet',
            Label  : 'Valuation',
            Target : '@UI.FieldGroup#Valuation',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'PredictionFacet',
            Label  : 'AI Suggestion',
            Target : '@UI.FieldGroup#Prediction',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ErpSyncFacet',
            Label  : 'ERP Synchronisation',
            Target : '@UI.FieldGroup#ErpSync',
        },
    ],

    // ===== Table: tab "All Products" =====
    // Focus: which group is set, where does it come from, is it in the ERP yet.
    UI.LineItem : [
        { $Type : 'UI.DataField', Value : Product },
        { $Type : 'UI.DataField', Value : ProductDescription },
        { $Type : 'UI.DataField', Value : ProductType },
        { $Type : 'UI.DataField', Value : ValuationClass },
        { $Type : 'UI.DataField', Value : ProductGroup },
        { $Type : 'UI.DataField', Value : ProductGroupSource },
        { $Type : 'UI.DataField', Value : SyncedProductGroup },
        {
            $Type : 'UI.DataField',
            Value : PredictedProductGroup,
            Criticality : ConfidenceCriticality,
        },
        { $Type : 'UI.DataField', Value : PredictionConfidence },
    ],

    // ===== Table: tab "AI Suggestions" =====
    // Focus: judge the suggestion. The three columns after the description are
    // the strongest model inputs, so the suggestion can be sanity-checked.
    UI.LineItem #WithPrediction : [
        { $Type : 'UI.DataField', Value : Product },
        { $Type : 'UI.DataField', Value : ProductDescription },
        { $Type : 'UI.DataField', Value : ProductType },
        { $Type : 'UI.DataField', Value : HandlingUnitType },
        { $Type : 'UI.DataField', Value : ValuationClass },
        { $Type : 'UI.DataField', Value : ProductGroup },
        {
            $Type : 'UI.DataField',
            Value : PredictedProductGroup,
            Criticality : ConfidenceCriticality,
        },
        { $Type : 'UI.DataField', Value : PredictionConfidence },
        { $Type : 'UI.DataField', Value : ProductGroupSource },
        {
            $Type : 'UI.DataFieldForAction',
            Label : 'Apply Suggestion',
            Action : 'MainService.applyPrediction',
        },
    ],

    UI.SelectionPresentationVariant #TabAll : {
        $Type : 'UI.SelectionPresentationVariantType',
        Text : 'All Products',
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
        Text : 'AI Suggestions',
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
        ProductGroupSource,
        ProductType,
        ValuationClass,
        ItemCategoryGroup,
    ],
);

// Technical helper for the traffic-light colouring - never shown as a column.
annotate service.Products with {
    ConfidenceCriticality @UI.Hidden;
};

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
    value @title : 'New Product Group'
  );
};
