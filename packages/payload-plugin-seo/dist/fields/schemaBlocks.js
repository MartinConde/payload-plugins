import { seoT } from '../translations.js';
/**
 * Curated structured-data builder. A `blocks` field where each block is one
 * schema.org type, exposing only the fields Google needs for the matching rich
 * result. Multiple blocks per document are supported (e.g. Article + FAQPage),
 * mirroring what Rank Math / Yoast allow. Stored data is mapped to JSON-LD by
 * the pure `buildJsonLd` helper (server virtual field or frontend).
 *
 * Label strategy: the block picker labels are translated via `seoT` (the most
 * visible surface). Shared concepts reuse existing `pluginSeo` keys
 * (`labelTitle`/`labelDescription`/`labelImage`/`labelUrl`/`labelType`).
 * schema.org-specific property names (sku, priceCurrency, ISO-8601 durations,
 * enum URLs, …) are left as plain English — they are technical vocabulary, the
 * same call already made for `'Open Graph'` / `'Twitter / X'` in metaField.ts.
 */ export const buildSchemaBlocksField = ({ name = 'schema', uploadsCollection, localized })=>{
    const img = (fieldName = 'image')=>({
            name: fieldName,
            type: 'upload',
            relationTo: uploadsCollection,
            label: seoT('pluginSeo:labelImage')
        });
    const labels = (key)=>({
            singular: seoT(key),
            plural: seoT(key)
        });
    const article = {
        slug: 'article',
        labels: labels('pluginSeo:schemaArticle'),
        fields: [
            {
                name: 'articleType',
                type: 'select',
                defaultValue: 'Article',
                label: seoT('pluginSeo:labelType'),
                options: [
                    {
                        label: 'Article',
                        value: 'Article'
                    },
                    {
                        label: 'BlogPosting',
                        value: 'BlogPosting'
                    },
                    {
                        label: 'NewsArticle',
                        value: 'NewsArticle'
                    }
                ]
            },
            {
                name: 'headline',
                type: 'text',
                localized,
                label: 'Headline'
            },
            {
                name: 'description',
                type: 'textarea',
                localized,
                label: seoT('pluginSeo:labelDescription')
            },
            img(),
            {
                name: 'datePublished',
                type: 'date',
                label: 'Date published'
            },
            {
                name: 'dateModified',
                type: 'date',
                label: 'Date modified'
            },
            {
                name: 'authorName',
                type: 'text',
                label: 'Author name'
            }
        ]
    };
    const product = {
        slug: 'product',
        labels: labels('pluginSeo:schemaProduct'),
        fields: [
            {
                name: 'name',
                type: 'text',
                localized,
                label: 'Name'
            },
            img(),
            {
                name: 'description',
                type: 'textarea',
                localized,
                label: seoT('pluginSeo:labelDescription')
            },
            {
                type: 'row',
                fields: [
                    {
                        name: 'brand',
                        type: 'text',
                        label: 'Brand'
                    },
                    {
                        name: 'sku',
                        type: 'text',
                        label: 'SKU'
                    }
                ]
            },
            {
                type: 'row',
                fields: [
                    {
                        name: 'price',
                        type: 'number',
                        label: 'Price'
                    },
                    {
                        name: 'priceCurrency',
                        type: 'text',
                        label: 'Price currency (ISO 4217, e.g. EUR)'
                    },
                    {
                        name: 'availability',
                        type: 'select',
                        label: 'Availability',
                        options: [
                            'InStock',
                            'OutOfStock',
                            'PreOrder',
                            'BackOrder'
                        ]
                    }
                ]
            },
            {
                type: 'row',
                fields: [
                    {
                        name: 'ratingValue',
                        type: 'number',
                        label: 'Rating value'
                    },
                    {
                        name: 'reviewCount',
                        type: 'number',
                        label: 'Review count'
                    }
                ]
            }
        ]
    };
    const faq = {
        slug: 'faq',
        labels: labels('pluginSeo:schemaFaq'),
        fields: [
            {
                name: 'questions',
                type: 'array',
                label: 'Questions',
                fields: [
                    {
                        name: 'question',
                        type: 'text',
                        localized,
                        label: 'Question'
                    },
                    {
                        name: 'answer',
                        type: 'textarea',
                        localized,
                        label: 'Answer'
                    }
                ]
            }
        ]
    };
    const howTo = {
        slug: 'howTo',
        labels: labels('pluginSeo:schemaHowTo'),
        fields: [
            {
                name: 'name',
                type: 'text',
                localized,
                label: 'Name'
            },
            {
                name: 'totalTime',
                type: 'text',
                label: 'Total time (ISO 8601, e.g. PT30M)'
            },
            {
                name: 'steps',
                type: 'array',
                label: 'Steps',
                fields: [
                    {
                        name: 'name',
                        type: 'text',
                        localized,
                        label: 'Name'
                    },
                    {
                        name: 'text',
                        type: 'textarea',
                        localized,
                        label: 'Text'
                    },
                    img()
                ]
            },
            {
                name: 'tools',
                type: 'array',
                label: 'Tools',
                fields: [
                    {
                        name: 'name',
                        type: 'text',
                        label: 'Name'
                    }
                ]
            },
            {
                name: 'supplies',
                type: 'array',
                label: 'Supplies',
                fields: [
                    {
                        name: 'name',
                        type: 'text',
                        label: 'Name'
                    }
                ]
            }
        ]
    };
    const event = {
        slug: 'event',
        labels: labels('pluginSeo:schemaEvent'),
        fields: [
            {
                name: 'name',
                type: 'text',
                localized,
                label: 'Name'
            },
            {
                type: 'row',
                fields: [
                    {
                        name: 'startDate',
                        type: 'date',
                        label: 'Start date'
                    },
                    {
                        name: 'endDate',
                        type: 'date',
                        label: 'End date'
                    }
                ]
            },
            {
                name: 'eventStatus',
                type: 'select',
                label: 'Event status',
                options: [
                    'EventScheduled',
                    'EventCancelled',
                    'EventPostponed',
                    'EventRescheduled',
                    'EventMovedOnline'
                ]
            },
            {
                name: 'locationName',
                type: 'text',
                label: 'Location name'
            },
            {
                name: 'locationAddress',
                type: 'text',
                label: 'Location address'
            },
            {
                type: 'row',
                fields: [
                    {
                        name: 'price',
                        type: 'number',
                        label: 'Price'
                    },
                    {
                        name: 'priceCurrency',
                        type: 'text',
                        label: 'Price currency (ISO 4217)'
                    },
                    {
                        name: 'url',
                        type: 'text',
                        label: seoT('pluginSeo:labelUrl')
                    }
                ]
            }
        ]
    };
    const localBusiness = {
        slug: 'localBusiness',
        labels: labels('pluginSeo:schemaLocalBusiness'),
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name'
            },
            img(),
            {
                type: 'row',
                fields: [
                    {
                        name: 'telephone',
                        type: 'text',
                        label: 'Telephone'
                    },
                    {
                        name: 'priceRange',
                        type: 'text',
                        label: 'Price range (e.g. $$)'
                    }
                ]
            },
            {
                name: 'address',
                type: 'group',
                label: 'Address',
                fields: [
                    {
                        name: 'streetAddress',
                        type: 'text',
                        label: 'Street address'
                    },
                    {
                        type: 'row',
                        fields: [
                            {
                                name: 'addressLocality',
                                type: 'text',
                                label: 'City'
                            },
                            {
                                name: 'addressRegion',
                                type: 'text',
                                label: 'Region / state'
                            },
                            {
                                name: 'postalCode',
                                type: 'text',
                                label: 'Postal code'
                            }
                        ]
                    },
                    {
                        name: 'addressCountry',
                        type: 'text',
                        label: 'Country (ISO 3166-1, e.g. DE)'
                    }
                ]
            },
            {
                name: 'openingHours',
                type: 'array',
                label: 'Opening hours',
                fields: [
                    {
                        name: 'days',
                        type: 'text',
                        label: 'Day(s) (e.g. Monday or Mo-Fr)'
                    },
                    {
                        type: 'row',
                        fields: [
                            {
                                name: 'opens',
                                type: 'text',
                                label: 'Opens (e.g. 09:00)'
                            },
                            {
                                name: 'closes',
                                type: 'text',
                                label: 'Closes (e.g. 17:00)'
                            }
                        ]
                    }
                ]
            }
        ]
    };
    const recipe = {
        slug: 'recipe',
        labels: labels('pluginSeo:schemaRecipe'),
        fields: [
            {
                name: 'name',
                type: 'text',
                localized,
                label: 'Name'
            },
            img(),
            {
                name: 'description',
                type: 'textarea',
                localized,
                label: seoT('pluginSeo:labelDescription')
            },
            {
                type: 'row',
                fields: [
                    {
                        name: 'prepTime',
                        type: 'text',
                        label: 'Prep time (ISO 8601)'
                    },
                    {
                        name: 'cookTime',
                        type: 'text',
                        label: 'Cook time (ISO 8601)'
                    },
                    {
                        name: 'recipeYield',
                        type: 'text',
                        label: 'Yield (e.g. 4 servings)'
                    }
                ]
            },
            {
                name: 'ingredients',
                type: 'array',
                label: 'Ingredients',
                fields: [
                    {
                        name: 'item',
                        type: 'text',
                        localized,
                        label: 'Item'
                    }
                ]
            },
            {
                name: 'instructions',
                type: 'array',
                label: 'Instructions',
                fields: [
                    {
                        name: 'text',
                        type: 'textarea',
                        localized,
                        label: 'Step'
                    }
                ]
            }
        ]
    };
    const video = {
        slug: 'video',
        labels: labels('pluginSeo:schemaVideo'),
        fields: [
            {
                name: 'name',
                type: 'text',
                localized,
                label: 'Name'
            },
            {
                name: 'description',
                type: 'textarea',
                localized,
                label: seoT('pluginSeo:labelDescription')
            },
            {
                name: 'thumbnailUrl',
                type: 'text',
                label: 'Thumbnail URL'
            },
            {
                name: 'uploadDate',
                type: 'date',
                label: 'Upload date'
            },
            {
                type: 'row',
                fields: [
                    {
                        name: 'contentUrl',
                        type: 'text',
                        label: 'Content URL'
                    },
                    {
                        name: 'embedUrl',
                        type: 'text',
                        label: 'Embed URL'
                    }
                ]
            },
            {
                name: 'duration',
                type: 'text',
                label: 'Duration (ISO 8601, e.g. PT2M30S)'
            }
        ]
    };
    const custom = {
        slug: 'custom',
        labels: labels('pluginSeo:schemaCustom'),
        fields: [
            {
                name: 'json',
                type: 'json',
                label: seoT('pluginSeo:jsonLd'),
                admin: {
                    description: seoT('pluginSeo:jsonLdDesc')
                }
            }
        ]
    };
    return {
        name,
        type: 'blocks',
        label: seoT('pluginSeo:schemaLabel'),
        admin: {
            description: seoT('pluginSeo:schemaDesc')
        },
        blocks: [
            article,
            product,
            faq,
            howTo,
            event,
            localBusiness,
            recipe,
            video,
            custom
        ]
    };
};
