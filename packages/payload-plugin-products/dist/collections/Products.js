import { DesignerField } from '../ui/designer/DesignerField.js';
import { VariantsPlaceholder } from '../ui/designer/VariantsPlaceholder.js';
import { SeoPlaceholder } from '../ui/designer/SeoPlaceholder.js';
import { denormalizeResolvedDims } from '../hooks/denormalizeResolvedDims.js';
import { ensureRowId } from '../hooks/ensureRowId.js';
import { normalizeView } from '../hooks/normalizeView.js';
import { reconcileColorMockups } from '../hooks/reconcileColorMockups.js';
import { normalizeMockupTransform, normalizePlacements } from '../ui/printArea.js';
import { productsT } from '../translations.js';
const slugify = (value)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// Fill `slug` from `title` when empty, then slugify — so editors don't hand-type
// a slug and the persisted value is always clean. Mirrors the menus plugin.
const formatSlug = ({ value, data, originalDoc })=>{
    if (typeof value === 'string' && value.length > 0) return slugify(value);
    const fallback = data?.title ?? originalDoc?.title;
    return typeof fallback === 'string' ? slugify(fallback) : value;
};
const sanitizeMockupTransform = ({ value })=>value === undefined ? undefined : normalizeMockupTransform(value);
const validatePrintAreaTemplate = (value, { siblingData })=>siblingData?.printAreaSource === 'template' && !value ? 'pluginProducts:templateRequired' : true;
const validateCustomWidth = (value, { siblingData })=>siblingData?.printAreaSource === 'custom' && (typeof value !== 'number' || value <= 0) ? 'pluginProducts:widthRequired' : true;
const validateCustomHeight = (value, { siblingData })=>siblingData?.printAreaSource === 'custom' && (typeof value !== 'number' || value <= 0) ? 'pluginProducts:heightRequired' : true;
const sanitizePrintAreaPlacement = ({ value })=>value === undefined ? undefined : normalizePlacements(value);
/**
 * Builds the `products` collection — Phase 2 layout.
 *
 * Top-level admin tabs (unnamed, label-only — form paths stay flat):
 *   - General : title, slug, status, description, price
 *   - Designer: `views` array + `designerCanvas` ui field
 *   - Variants: placeholder (color matrix lands in Phase 3)
 *   - SEO     : empty group for downstream SEO plugin wiring
 *
 * The Phase 1 top-level `mockup` upload + single `printAreas` JSON field have
 * been REMOVED. Each view now carries its own mockup + print-area config;
 * physical mm live on the view (via `printAreaTemplate` ref or custom
 * widthMm/heightMm). No data migration ships in this phase — existing v0.1.1
 * docs lose those fields on first save under v0.2.
 */ export const buildProductsCollection = ({ slug, mediaCollectionSlug, printTemplatesSlug, colorSwatchesSlug, defaultViewPresets, overrides })=>{
    const generalFields = [
        {
            name: 'title',
            type: 'text',
            required: true,
            label: productsT('pluginProducts:titleLabel'),
            admin: {
                description: productsT('pluginProducts:titleDesc')
            }
        },
        {
            name: 'slug',
            type: 'text',
            required: true,
            unique: true,
            index: true,
            label: productsT('pluginProducts:slugLabel'),
            admin: {
                description: productsT('pluginProducts:slugDesc')
            },
            hooks: {
                beforeValidate: [
                    formatSlug
                ]
            }
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'draft',
            label: productsT('pluginProducts:statusLabel'),
            options: [
                {
                    value: 'draft',
                    label: productsT('pluginProducts:statusDraft')
                },
                {
                    value: 'publish',
                    label: productsT('pluginProducts:statusPublish')
                }
            ]
        },
        {
            name: 'description',
            type: 'richText',
            label: productsT('pluginProducts:descriptionLabel')
        },
        {
            name: 'price',
            type: 'number',
            min: 0,
            label: productsT('pluginProducts:priceLabel'),
            admin: {
                description: productsT('pluginProducts:priceDesc')
            }
        },
        {
            name: 'colors',
            type: 'relationship',
            relationTo: colorSwatchesSlug,
            hasMany: true,
            label: productsT('pluginProducts:colorsLabel'),
            admin: {
                // `isSortable: true` on a `relationship hasMany` is valid in Payload
                // 3.x — surfaces drag handles. The `reconcileColorMockups` hook keys
                // each view's `colorMockups[]` order off this array, so reordering
                // colors propagates cleanly across all views.
                allowCreate: true,
                isSortable: true,
                description: productsT('pluginProducts:colorsDesc')
            }
        }
    ];
    const viewsField = {
        name: 'views',
        type: 'array',
        minRows: 1,
        label: productsT('pluginProducts:viewsLabel'),
        hooks: {
            beforeChange: [
                normalizeView
            ]
        },
        fields: [
            {
                name: 'id',
                type: 'text',
                admin: {
                    hidden: true
                },
                hooks: {
                    beforeChange: [
                        ensureRowId
                    ]
                }
            },
            {
                name: 'name',
                type: 'text',
                required: true,
                label: productsT('pluginProducts:viewNameLabel')
            },
            {
                name: 'printAreaSource',
                type: 'radio',
                required: true,
                defaultValue: 'template',
                label: productsT('pluginProducts:printAreaSourceLabel'),
                options: [
                    {
                        value: 'template',
                        label: productsT('pluginProducts:sourceTemplate')
                    },
                    {
                        value: 'custom',
                        label: productsT('pluginProducts:sourceCustom')
                    }
                ]
            },
            {
                name: 'printAreaTemplate',
                type: 'relationship',
                relationTo: printTemplatesSlug,
                admin: {
                    condition: (_, sib)=>sib?.printAreaSource === 'template'
                },
                validate: validatePrintAreaTemplate
            },
            {
                name: 'widthMm',
                type: 'number',
                min: 1,
                label: productsT('pluginProducts:widthMmLabel'),
                admin: {
                    condition: (_, sib)=>sib?.printAreaSource === 'custom'
                },
                validate: validateCustomWidth
            },
            {
                name: 'heightMm',
                type: 'number',
                min: 1,
                label: productsT('pluginProducts:heightMmLabel'),
                admin: {
                    condition: (_, sib)=>sib?.printAreaSource === 'custom'
                },
                validate: validateCustomHeight
            },
            {
                name: 'bleedMm',
                type: 'number',
                min: 0,
                label: productsT('pluginProducts:bleedMmLabel'),
                admin: {
                    condition: (_, sib)=>sib?.printAreaSource === 'custom'
                }
            },
            // Denormalized by the collection afterRead hook — read-only mirror of
            // the resolved template (or custom) dims so the editor doesn't refetch.
            {
                name: 'resolvedDimsMm',
                type: 'json',
                admin: {
                    hidden: true
                }
            },
            // Per-(view, color) variant rows. Reconciled against `data.colors[]`
            // by the collection `beforeChange` hook (`reconcileColorMockups`) — see
            // `src/hooks/reconcileColorMockups.ts`. Rows are key/value-stable
            // across edits: identity is the color-swatch id, not the array index,
            // so adding/removing colors only adds/prunes the affected rows.
            {
                name: 'colorMockups',
                type: 'array',
                label: productsT('pluginProducts:colorMockupsLabel'),
                fields: [
                    {
                        name: 'id',
                        type: 'text',
                        admin: {
                            hidden: true
                        },
                        hooks: {
                            beforeChange: [
                                ensureRowId
                            ]
                        }
                    },
                    {
                        name: 'color',
                        type: 'relationship',
                        relationTo: colorSwatchesSlug,
                        hasMany: false,
                        required: true,
                        admin: {
                            allowCreate: true
                        }
                    },
                    {
                        name: 'mockup',
                        type: 'upload',
                        relationTo: mediaCollectionSlug,
                        label: productsT('pluginProducts:mockupLabel')
                    },
                    {
                        name: 'mockupTransform',
                        type: 'json',
                        admin: {
                            hidden: true
                        },
                        hooks: {
                            beforeChange: [
                                sanitizeMockupTransform
                            ]
                        }
                    },
                    {
                        name: 'printAreaPlacement',
                        type: 'json',
                        admin: {
                            hidden: true
                        },
                        hooks: {
                            beforeChange: [
                                sanitizePrintAreaPlacement
                            ]
                        }
                    },
                    {
                        name: 'placementLocked',
                        type: 'checkbox',
                        defaultValue: false,
                        label: productsT('pluginProducts:placementLockedLabel'),
                        admin: {
                            description: productsT('pluginProducts:placementLockedDesc')
                        }
                    }
                ]
            }
        ]
    };
    const designerCanvasField = {
        name: 'designerCanvas',
        type: 'ui',
        admin: {},
        // `custom` lives at the TOP of the field, NOT under `admin`. shadcn-admin's
        // extractCollection reads `field.custom['plugin-shadcn-admin']` and carries
        // it across the RSC→client boundary; the FieldInput switch then routes
        // `ui` fields through the override. Phase 1's `printAreas` field used the
        // same placement — Phase 2 has to match.
        custom: {
            'plugin-shadcn-admin': {
                input: DesignerField,
                mediaCollectionSlug,
                defaultViewPresets,
                printTemplatesSlug,
                colorSwatchesSlug
            }
        }
    };
    const variantsPlaceholder = {
        name: 'variantsPlaceholder',
        type: 'ui',
        admin: {},
        custom: {
            'plugin-shadcn-admin': {
                input: VariantsPlaceholder
            }
        }
    };
    const seoPlaceholder = {
        name: 'seoPlaceholder',
        type: 'ui',
        admin: {},
        custom: {
            'plugin-shadcn-admin': {
                input: SeoPlaceholder
            }
        }
    };
    return {
        slug,
        labels: {
            singular: productsT('pluginProducts:productSingular'),
            plural: productsT('pluginProducts:productPlural')
        },
        admin: {
            useAsTitle: 'title',
            defaultColumns: [
                'title',
                'slug',
                'status',
                'price',
                'updatedAt'
            ],
            description: productsT('pluginProducts:productsDesc'),
            ...overrides?.admin
        },
        hooks: {
            // Order matters: reconcile colorMockups against `data.colors[]` BEFORE
            // any consumer-supplied beforeChange runs. Consumer hooks are
            // concatenated, not replaced, so they still fire after.
            beforeChange: [
                reconcileColorMockups,
                ...overrides?.hooks?.beforeChange ?? []
            ],
            afterRead: [
                denormalizeResolvedDims(printTemplatesSlug),
                ...overrides?.hooks?.afterRead ?? []
            ],
            ...Object.fromEntries(Object.entries(overrides?.hooks ?? {}).filter(([k])=>![
                    'beforeChange',
                    'afterRead'
                ].includes(k)))
        },
        fields: [
            {
                type: 'tabs',
                tabs: [
                    {
                        label: productsT('pluginProducts:generalTab'),
                        fields: generalFields
                    },
                    {
                        label: productsT('pluginProducts:designerTab'),
                        fields: [
                            viewsField,
                            designerCanvasField
                        ]
                    },
                    {
                        label: productsT('pluginProducts:variantsTab'),
                        fields: [
                            variantsPlaceholder
                        ]
                    },
                    {
                        label: productsT('pluginProducts:seoTab'),
                        // The downstream SEO plugin extends this tab via `overrides.fields`
                        // (a `seo` group, typically). The placeholder ui field keeps the
                        // tab visible until that wiring is added — shadcn-admin filters
                        // out tabs with no visible children, and an empty group counts as
                        // none, so we surface a real placeholder.
                        fields: [
                            seoPlaceholder
                        ]
                    }
                ]
            },
            ...overrides?.fields ?? []
        ],
        ...overrides ? Object.fromEntries(Object.entries(overrides).filter(([k])=>![
                'admin',
                'hooks',
                'fields'
            ].includes(k))) : {}
    };
};
