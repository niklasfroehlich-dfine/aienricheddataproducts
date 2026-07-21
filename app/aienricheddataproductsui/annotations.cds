using MainService as service from '../../srv/service';

annotate service.Products with @(

    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Label : 'Product',      Value : Product },
            { $Type : 'UI.DataField', Label : 'ProductType',  Value : ProductType },
            { $Type : 'UI.DataField', Label : 'ProductGroup', Value : ProductGroup },
            { $Type : 'UI.DataField', Label : 'BaseUnit',     Value : BaseUnit },
            { $Type : 'UI.DataField', Label : 'GrossWeight',  Value : GrossWeight },
            { $Type : 'UI.DataField', Label : 'NetWeight',    Value : NetWeight },
            { $Type : 'UI.DataField', Label : 'WeightUnit',   Value : WeightUnit },
        ],
    },

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
            ID     : 'PredictionFacet',
            Label  : 'KI-Vorschlag',
            Target : '@UI.FieldGroup#Prediction',
        },
    ],

    UI.LineItem : [
        { $Type : 'UI.DataField', Label : 'Product',       Value : Product },
        { $Type : 'UI.DataField', Label : 'Product Type',  Value : ProductType },
        { $Type : 'UI.DataField', Label : 'Product Group', Value : ProductGroup },
        { $Type : 'UI.DataField', Label : 'Base Unit',     Value : BaseUnit },
        { $Type : 'UI.DataField', Label : 'Gross Weight',  Value : GrossWeight },
        { $Type : 'UI.DataField', Label : 'Net Weight',    Value : NetWeight },
        { $Type : 'UI.DataField', Label : 'Source',        Value : ProductGroupSource },
        {
            $Type : 'UI.DataField',
            Label : 'Ai suggestion',
            Value : PredictedProductGroup,
            Criticality : ConfidenceCriticality,
        },
        { $Type : 'UI.DataField', Label : 'Confidence',    Value : PredictionConfidence },
    ],

    UI.LineItem #WithPrediction : [
        { $Type : 'UI.DataField', Label : 'Product',      Value : Product },
        { $Type : 'UI.DataField', Label : 'Product Type', Value : ProductType },
        { $Type : 'UI.DataField', Label : 'Base Unit',    Value : BaseUnit },
        {
            $Type : 'UI.DataField',
            Label : 'Ai suggestion',
            Value : PredictedProductGroup,
            Criticality : ConfidenceCriticality,
        },
        { $Type : 'UI.DataField', Label : 'Confidence', Value : PredictionConfidence },
        { $Type : 'UI.DataField', Label : 'Source',     Value : ProductGroupSource },
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
    ],
);