using MainService as service from '../../srv/service';
annotate service.Products with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Product',
                Value : Product,
            },
            {
                $Type : 'UI.DataField',
                Label : 'ProductType',
                Value : ProductType,
            },
            {
                $Type : 'UI.DataField',
                Label : 'ProductGroup',
                Value : ProductGroup,
            },
            {
                $Type : 'UI.DataField',
                Label : 'BaseUnit',
                Value : BaseUnit,
            },
            {
                $Type : 'UI.DataField',
                Label : 'GrossWeight',
                Value : GrossWeight,
            },
            {
                $Type : 'UI.DataField',
                Label : 'NetWeight',
                Value : NetWeight,
            },
            {
                $Type : 'UI.DataField',
                Label : 'WeightUnit',
                Value : WeightUnit,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Product',
            Value : Product,
        },
        {
            $Type : 'UI.DataField',
            Label : 'ProductType',
            Value : ProductType,
        },
        {
            $Type : 'UI.DataField',
            Label : 'ProductGroup',
            Value : ProductGroup,
        },
        {
            $Type : 'UI.DataField',
            Label : 'BaseUnit',
            Value : BaseUnit,
        },
        {
            $Type : 'UI.DataField',
            Label : 'GrossWeight',
            Value : GrossWeight,
        },
        {
            $Type : 'UI.DataField',
            Value : NetWeight,
            Label : 'NetWeight',
        },
        {
            $Type : 'UI.DataField',
            Value : WeightUnit,
            Label : 'WeightUnit',
        },
    ],
);

