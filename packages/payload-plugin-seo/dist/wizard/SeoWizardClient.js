'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Client stepper for the SEO setup wizard. Reached only via importMap (string
   path registration in plugin.ts), never imported at config-load, so it may
   freely use the shadcn-admin `/client` UI primitives — unlike the Node-safe
   `SeoGroupInput` `.input` override.

   Edits a curated subset of the `seo-settings` global and upserts it via
   `POST /api/globals/{slug}` (the verb Payload uses for globals — singletons
   have no id). The site-wide checklist is recomputed live from local state;
   per-collection completeness comes from the server and refreshes on save. */ import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@payloadcms/ui';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Plus, TriangleAlert, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator, Textarea } from 'payload-plugin-shadcn-ui';
// SearchableSelect + UploadFieldInput stay in the admin plugin: both depend on
// bridge-internal hooks (relationship picker, multipart upload handler).
import { SearchableSelect, UploadFieldInput } from 'payload-plugin-shadcn-admin/client';
import { OG_LOCALE_OPTIONS } from '../fields/seoSettingsGlobal.js';
import { computeSettingsChecklist, completionPercent } from './audit.js';
const CHANGEFREQS = [
    {
        value: 'always',
        key: 'pluginSeo:cfAlways'
    },
    {
        value: 'hourly',
        key: 'pluginSeo:cfHourly'
    },
    {
        value: 'daily',
        key: 'pluginSeo:cfDaily'
    },
    {
        value: 'weekly',
        key: 'pluginSeo:cfWeekly'
    },
    {
        value: 'monthly',
        key: 'pluginSeo:cfMonthly'
    },
    {
        value: 'yearly',
        key: 'pluginSeo:cfYearly'
    },
    {
        value: 'never',
        key: 'pluginSeo:cfNever'
    }
];
const idOf = (v)=>{
    if (v == null) return null;
    if (typeof v === 'object') return v.id ?? null;
    return v;
};
export function SeoWizardClient({ settingsSlug, mediaSlug, initialData, collections, collectionSlugs, defaultLocale, useAsTitleBySlug, uploadCollectionsBySlug }) {
    const { t } = useTranslation();
    const router = useRouter();
    const tr = React.useCallback((k)=>t(k), [
        t
    ]);
    const [data, setData] = React.useState(()=>({
            ...initialData,
            defaultOgImage: idOf(initialData.defaultOgImage),
            organization: {
                ...initialData.organization ?? {},
                logo: idOf(initialData.organization?.logo)
            }
        }));
    const [step, setStep] = React.useState(0);
    const [saving, setSaving] = React.useState(false);
    const [saved, setSaved] = React.useState(false);
    const [error, setError] = React.useState(null);
    const set = (key, value)=>{
        setData((d)=>({
                ...d,
                [key]: value
            }));
        setSaved(false);
    };
    const setOrg = (patch)=>{
        setData((d)=>({
                ...d,
                organization: {
                    ...d.organization ?? {},
                    ...patch
                }
            }));
        setSaved(false);
    };
    const setSitemap = (patch)=>{
        setData((d)=>({
                ...d,
                sitemap: {
                    ...d.sitemap ?? {},
                    ...patch
                }
            }));
        setSaved(false);
    };
    const checklist = computeSettingsChecklist(data);
    const percent = completionPercent(checklist);
    const steps = [
        {
            key: 'pluginSeo:tabDefaults',
            render: renderDefaults
        },
        {
            key: 'pluginSeo:tabTemplates',
            render: renderPatterns
        },
        {
            key: 'pluginSeo:tabOrganization',
            render: renderOrganization
        },
        {
            key: 'pluginSeo:tabSitemap',
            render: renderSitemap
        },
        {
            key: 'pluginSeo:wizardStepReview',
            render: renderReview
        }
    ];
    const isLast = step === steps.length - 1;
    async function save() {
        setSaving(true);
        setError(null);
        try {
            const url = defaultLocale ? `/api/globals/${settingsSlug}?locale=${defaultLocale}` : `/api/globals/${settingsSlug}`;
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                let msg = tr('pluginSeo:wizardSaveError');
                try {
                    const body = await res.json();
                    if (body.errors?.[0]?.message) msg = body.errors[0].message;
                } catch  {
                /* keep generic message */ }
                setError(msg);
                return;
            }
            setSaved(true);
            router.refresh();
        } catch  {
            setError(tr('pluginSeo:wizardSaveError'));
        } finally{
            setSaving(false);
        }
    }
    // ---- step renderers ----
    function renderDefaults() {
        return /*#__PURE__*/ _jsxs("div", {
            className: "space-y-4",
            children: [
                /*#__PURE__*/ _jsx(Field, {
                    label: tr('pluginSeo:titleTemplateLabel'),
                    description: tr('pluginSeo:titleTemplateDesc'),
                    children: /*#__PURE__*/ _jsx(Input, {
                        value: data.titleTemplate ?? '',
                        placeholder: "%s — Acme",
                        onChange: (e)=>set('titleTemplate', e.target.value)
                    })
                }),
                /*#__PURE__*/ _jsx(Field, {
                    label: tr('pluginSeo:defaultDescriptionLabel'),
                    description: tr('pluginSeo:defaultDescriptionDesc'),
                    children: /*#__PURE__*/ _jsx(Textarea, {
                        value: data.defaultDescription ?? '',
                        onChange: (e)=>set('defaultDescription', e.target.value)
                    })
                }),
                /*#__PURE__*/ _jsx(Field, {
                    label: tr('pluginSeo:defaultOgImageLabel'),
                    description: tr('pluginSeo:defaultOgImageDesc'),
                    children: /*#__PURE__*/ _jsx(UploadFieldInput, {
                        fieldName: "defaultOgImage",
                        relationTo: mediaSlug,
                        hasMany: false,
                        useAsTitleBySlug: useAsTitleBySlug,
                        uploadCollectionsBySlug: uploadCollectionsBySlug,
                        value: idOf(data.defaultOgImage),
                        onChange: (v)=>set('defaultOgImage', v ?? null)
                    })
                }),
                /*#__PURE__*/ _jsxs("div", {
                    className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
                    children: [
                        /*#__PURE__*/ _jsx(Field, {
                            label: tr('pluginSeo:defaultTwitterCardLabel'),
                            children: /*#__PURE__*/ _jsxs(Select, {
                                value: data.defaultTwitterCard ?? 'summary_large_image',
                                onValueChange: (v)=>set('defaultTwitterCard', v),
                                children: [
                                    /*#__PURE__*/ _jsx(SelectTrigger, {
                                        children: /*#__PURE__*/ _jsx(SelectValue, {})
                                    }),
                                    /*#__PURE__*/ _jsxs(SelectContent, {
                                        children: [
                                            /*#__PURE__*/ _jsx(SelectItem, {
                                                value: "summary",
                                                children: tr('pluginSeo:twitterCardSummary')
                                            }),
                                            /*#__PURE__*/ _jsx(SelectItem, {
                                                value: "summary_large_image",
                                                children: tr('pluginSeo:twitterCardSummaryLarge')
                                            })
                                        ]
                                    })
                                ]
                            })
                        }),
                        /*#__PURE__*/ _jsx(Field, {
                            label: tr('pluginSeo:defaultLocaleLabel'),
                            children: /*#__PURE__*/ _jsx(SearchableSelect, {
                                id: "seo-default-locale",
                                options: OG_LOCALE_OPTIONS,
                                value: data.defaultLocale ?? '',
                                onChange: (v)=>set('defaultLocale', v || null)
                            })
                        })
                    ]
                }),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex gap-6",
                    children: [
                        /*#__PURE__*/ _jsx(Checkbox, {
                            label: tr('pluginSeo:noindex'),
                            checked: !!data.defaultNoindex,
                            onChange: (v)=>set('defaultNoindex', v)
                        }),
                        /*#__PURE__*/ _jsx(Checkbox, {
                            label: tr('pluginSeo:nofollow'),
                            checked: !!data.defaultNofollow,
                            onChange: (v)=>set('defaultNofollow', v)
                        })
                    ]
                })
            ]
        });
    }
    function renderPatterns() {
        const rows = data.collectionTemplates ?? [];
        const update = (i, patch)=>{
            const next = rows.map((r, idx)=>idx === i ? {
                    ...r,
                    ...patch
                } : r);
            set('collectionTemplates', next);
        };
        return /*#__PURE__*/ _jsxs("div", {
            className: "space-y-4",
            children: [
                /*#__PURE__*/ _jsx("p", {
                    className: "text-sm text-muted-foreground",
                    children: tr('pluginSeo:templateTokensDesc')
                }),
                rows.map((row, i)=>/*#__PURE__*/ _jsx(Card, {
                        children: /*#__PURE__*/ _jsxs(CardContent, {
                            className: "space-y-3 pt-4",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "flex items-center justify-between gap-2",
                                    children: [
                                        collectionSlugs.length > 0 ? /*#__PURE__*/ _jsxs(Select, {
                                            value: row.collection ?? undefined,
                                            onValueChange: (v)=>update(i, {
                                                    collection: v
                                                }),
                                            children: [
                                                /*#__PURE__*/ _jsx(SelectTrigger, {
                                                    className: "flex-1",
                                                    children: /*#__PURE__*/ _jsx(SelectValue, {
                                                        placeholder: tr('pluginSeo:templateCollectionLabel')
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsx(SelectContent, {
                                                    children: collectionSlugs.map((s)=>/*#__PURE__*/ _jsx(SelectItem, {
                                                            value: s,
                                                            children: s
                                                        }, s))
                                                })
                                            ]
                                        }) : /*#__PURE__*/ _jsx(Input, {
                                            value: row.collection ?? '',
                                            placeholder: tr('pluginSeo:templateCollectionLabel'),
                                            onChange: (e)=>update(i, {
                                                    collection: e.target.value
                                                })
                                        }),
                                        /*#__PURE__*/ _jsx(Button, {
                                            type: "button",
                                            variant: "ghost",
                                            size: "icon",
                                            onClick: ()=>set('collectionTemplates', rows.filter((_, idx)=>idx !== i)),
                                            "aria-label": tr('pluginSeo:wizardRemove'),
                                            children: /*#__PURE__*/ _jsx(X, {
                                                className: "size-4"
                                            })
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsx(Input, {
                                    value: row.titleTemplate ?? '',
                                    placeholder: tr('pluginSeo:patternTitleLabel'),
                                    onChange: (e)=>update(i, {
                                            titleTemplate: e.target.value
                                        })
                                }),
                                /*#__PURE__*/ _jsx(Textarea, {
                                    value: row.descriptionTemplate ?? '',
                                    placeholder: tr('pluginSeo:patternDescriptionLabel'),
                                    onChange: (e)=>update(i, {
                                            descriptionTemplate: e.target.value
                                        })
                                })
                            ]
                        })
                    }, i)),
                /*#__PURE__*/ _jsxs(Button, {
                    type: "button",
                    variant: "outline",
                    onClick: ()=>set('collectionTemplates', [
                            ...rows,
                            {}
                        ]),
                    children: [
                        /*#__PURE__*/ _jsx(Plus, {
                            className: "size-4"
                        }),
                        " ",
                        tr('pluginSeo:patternsAdd')
                    ]
                })
            ]
        });
    }
    function renderOrganization() {
        const social = data.organization?.sameAs ?? [];
        const updateSocial = (i, url)=>setOrg({
                sameAs: social.map((s, idx)=>idx === i ? {
                        url
                    } : s)
            });
        return /*#__PURE__*/ _jsxs("div", {
            className: "space-y-4",
            children: [
                /*#__PURE__*/ _jsxs("div", {
                    className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
                    children: [
                        /*#__PURE__*/ _jsx(Field, {
                            label: tr('pluginSeo:orgNameLabel'),
                            children: /*#__PURE__*/ _jsx(Input, {
                                value: data.organization?.name ?? '',
                                onChange: (e)=>setOrg({
                                        name: e.target.value
                                    })
                            })
                        }),
                        /*#__PURE__*/ _jsx(Field, {
                            label: tr('pluginSeo:labelUrl'),
                            children: /*#__PURE__*/ _jsx(Input, {
                                value: data.organization?.url ?? '',
                                placeholder: "https://example.com",
                                onChange: (e)=>setOrg({
                                        url: e.target.value
                                    })
                            })
                        })
                    ]
                }),
                /*#__PURE__*/ _jsx(Field, {
                    label: tr('pluginSeo:orgLogoLabel'),
                    children: /*#__PURE__*/ _jsx(UploadFieldInput, {
                        fieldName: "organizationLogo",
                        relationTo: mediaSlug,
                        hasMany: false,
                        useAsTitleBySlug: useAsTitleBySlug,
                        uploadCollectionsBySlug: uploadCollectionsBySlug,
                        value: idOf(data.organization?.logo),
                        onChange: (v)=>setOrg({
                                logo: v ?? null
                            })
                    })
                }),
                /*#__PURE__*/ _jsx(Field, {
                    label: tr('pluginSeo:sameAsLabel'),
                    children: /*#__PURE__*/ _jsxs("div", {
                        className: "space-y-2",
                        children: [
                            social.map((s, i)=>/*#__PURE__*/ _jsxs("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ _jsx(Input, {
                                            value: s?.url ?? '',
                                            placeholder: "https://…",
                                            onChange: (e)=>updateSocial(i, e.target.value)
                                        }),
                                        /*#__PURE__*/ _jsx(Button, {
                                            type: "button",
                                            variant: "ghost",
                                            size: "icon",
                                            onClick: ()=>setOrg({
                                                    sameAs: social.filter((_, idx)=>idx !== i)
                                                }),
                                            "aria-label": tr('pluginSeo:wizardRemove'),
                                            children: /*#__PURE__*/ _jsx(X, {
                                                className: "size-4"
                                            })
                                        })
                                    ]
                                }, i)),
                            /*#__PURE__*/ _jsxs(Button, {
                                type: "button",
                                variant: "outline",
                                size: "sm",
                                onClick: ()=>setOrg({
                                        sameAs: [
                                            ...social,
                                            {
                                                url: ''
                                            }
                                        ]
                                    }),
                                children: [
                                    /*#__PURE__*/ _jsx(Plus, {
                                        className: "size-4"
                                    }),
                                    " ",
                                    tr('pluginSeo:sameAsAdd')
                                ]
                            })
                        ]
                    })
                })
            ]
        });
    }
    function renderSitemap() {
        return /*#__PURE__*/ _jsxs("div", {
            className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
            children: [
                /*#__PURE__*/ _jsx(Field, {
                    label: tr('pluginSeo:changefreqLabel'),
                    children: /*#__PURE__*/ _jsxs(Select, {
                        value: data.sitemap?.changefreq ?? undefined,
                        onValueChange: (v)=>setSitemap({
                                changefreq: v
                            }),
                        children: [
                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                children: /*#__PURE__*/ _jsx(SelectValue, {
                                    placeholder: "—"
                                })
                            }),
                            /*#__PURE__*/ _jsx(SelectContent, {
                                children: CHANGEFREQS.map((c)=>/*#__PURE__*/ _jsx(SelectItem, {
                                        value: c.value,
                                        children: tr(c.key)
                                    }, c.value))
                            })
                        ]
                    })
                }),
                /*#__PURE__*/ _jsx(Field, {
                    label: tr('pluginSeo:priorityLabel'),
                    description: tr('pluginSeo:priorityDesc'),
                    children: /*#__PURE__*/ _jsx(Input, {
                        type: "number",
                        min: 0,
                        max: 1,
                        step: 0.1,
                        value: data.sitemap?.priority ?? '',
                        onChange: (e)=>setSitemap({
                                priority: e.target.value === '' ? null : Number(e.target.value)
                            })
                    })
                })
            ]
        });
    }
    function renderReview() {
        return /*#__PURE__*/ _jsxs("div", {
            className: "space-y-6",
            children: [
                /*#__PURE__*/ _jsxs("div", {
                    children: [
                        /*#__PURE__*/ _jsxs("div", {
                            className: "mb-2 flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ _jsx("h3", {
                                    className: "text-sm font-medium",
                                    children: tr('pluginSeo:healthSettingsTitle')
                                }),
                                /*#__PURE__*/ _jsxs("span", {
                                    className: "text-sm text-muted-foreground",
                                    children: [
                                        percent,
                                        "% ",
                                        tr('pluginSeo:healthCompleteSuffix')
                                    ]
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "h-2 w-full overflow-hidden rounded-full bg-muted",
                            children: /*#__PURE__*/ _jsx("div", {
                                className: "h-full bg-primary transition-all",
                                style: {
                                    width: `${percent}%`
                                }
                            })
                        }),
                        /*#__PURE__*/ _jsx("ul", {
                            className: "mt-3 space-y-2",
                            children: checklist.map((item)=>/*#__PURE__*/ _jsxs("li", {
                                    className: "flex items-center gap-2 text-sm",
                                    children: [
                                        /*#__PURE__*/ _jsx(StatusIcon, {
                                            status: item.status
                                        }),
                                        /*#__PURE__*/ _jsx("span", {
                                            children: tr(item.labelKey)
                                        })
                                    ]
                                }, item.id))
                        })
                    ]
                }),
                /*#__PURE__*/ _jsx(Separator, {}),
                /*#__PURE__*/ _jsxs("div", {
                    children: [
                        /*#__PURE__*/ _jsx("h3", {
                            className: "mb-2 text-sm font-medium",
                            children: tr('pluginSeo:healthCollectionsTitle')
                        }),
                        collections.length === 0 ? /*#__PURE__*/ _jsx("p", {
                            className: "text-sm text-muted-foreground",
                            children: tr('pluginSeo:healthNoCollections')
                        }) : /*#__PURE__*/ _jsx("ul", {
                            className: "space-y-2",
                            children: collections.map((c)=>/*#__PURE__*/ _jsxs("li", {
                                    className: "flex items-center justify-between gap-2 text-sm",
                                    children: [
                                        /*#__PURE__*/ _jsxs("span", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ _jsx(StatusIcon, {
                                                    status: c.missing === 0 ? 'ok' : 'warn'
                                                }),
                                                c.label,
                                                c.missing === 0 ? /*#__PURE__*/ _jsx(Badge, {
                                                    variant: "secondary",
                                                    children: tr('pluginSeo:healthAllGood')
                                                }) : /*#__PURE__*/ _jsxs(Badge, {
                                                    variant: "outline",
                                                    children: [
                                                        c.missing,
                                                        " ",
                                                        tr('pluginSeo:healthOf'),
                                                        " ",
                                                        c.total,
                                                        ' ',
                                                        tr('pluginSeo:healthMissingSuffix')
                                                    ]
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("a", {
                                            className: "inline-flex items-center gap-1 text-primary hover:underline",
                                            href: `/admin/collections/${c.slug}`,
                                            children: [
                                                tr('pluginSeo:wizardReview'),
                                                /*#__PURE__*/ _jsx(ExternalLink, {
                                                    className: "size-3"
                                                })
                                            ]
                                        })
                                    ]
                                }, c.slug))
                        })
                    ]
                }),
                /*#__PURE__*/ _jsxs("a", {
                    className: "inline-flex items-center gap-1 text-sm text-primary hover:underline",
                    href: `/admin/globals/${settingsSlug}`,
                    children: [
                        tr('pluginSeo:wizardOpenSettings'),
                        /*#__PURE__*/ _jsx(ExternalLink, {
                            className: "size-3"
                        })
                    ]
                })
            ]
        });
    }
    return /*#__PURE__*/ _jsxs("div", {
        className: "mx-auto w-full max-w-3xl space-y-6",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex items-start justify-between gap-3",
                children: [
                    /*#__PURE__*/ _jsx("p", {
                        className: "max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground",
                        children: tr('pluginSeo:wizardIntro')
                    }),
                    defaultLocale ? /*#__PURE__*/ _jsx(Badge, {
                        variant: "outline",
                        className: "mt-1 shrink-0",
                        children: defaultLocale
                    }) : null
                ]
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "flex flex-wrap gap-2",
                children: steps.map((s, i)=>/*#__PURE__*/ _jsxs("button", {
                        type: "button",
                        onClick: ()=>setStep(i),
                        className: `rounded-md px-4 py-2 text-sm font-medium transition-colors ${i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`,
                        children: [
                            i + 1,
                            ". ",
                            tr(s.key)
                        ]
                    }, s.key))
            }),
            /*#__PURE__*/ _jsxs(Card, {
                children: [
                    /*#__PURE__*/ _jsxs(CardHeader, {
                        children: [
                            /*#__PURE__*/ _jsx(CardTitle, {
                                children: tr(steps[step].key)
                            }),
                            step === steps.length - 1 ? /*#__PURE__*/ _jsx(CardDescription, {
                                children: tr('pluginSeo:healthTitle')
                            }) : null
                        ]
                    }),
                    /*#__PURE__*/ _jsx(CardContent, {
                        children: steps[step].render()
                    })
                ]
            }),
            error ? /*#__PURE__*/ _jsx("p", {
                className: "text-sm text-destructive",
                children: error
            }) : null,
            /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ _jsxs(Button, {
                        type: "button",
                        variant: "outline",
                        disabled: step === 0,
                        onClick: ()=>setStep((s)=>Math.max(0, s - 1)),
                        children: [
                            /*#__PURE__*/ _jsx(ArrowLeft, {
                                className: "size-4"
                            }),
                            " ",
                            tr('pluginSeo:wizardBack')
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                            saved ? /*#__PURE__*/ _jsxs("span", {
                                className: "flex items-center gap-1 text-sm text-muted-foreground",
                                children: [
                                    /*#__PURE__*/ _jsx(Check, {
                                        className: "size-4"
                                    }),
                                    " ",
                                    tr('pluginSeo:wizardSaved')
                                ]
                            }) : null,
                            /*#__PURE__*/ _jsx(Button, {
                                type: "button",
                                onClick: save,
                                disabled: saving,
                                children: saving ? tr('pluginSeo:wizardSaving') : tr('pluginSeo:wizardSave')
                            }),
                            !isLast ? /*#__PURE__*/ _jsxs(Button, {
                                type: "button",
                                variant: "secondary",
                                onClick: ()=>setStep((s)=>Math.min(steps.length - 1, s + 1)),
                                children: [
                                    tr('pluginSeo:wizardNext'),
                                    " ",
                                    /*#__PURE__*/ _jsx(ArrowRight, {
                                        className: "size-4"
                                    })
                                ]
                            }) : null
                        ]
                    })
                ]
            })
        ]
    });
}
// ---- small presentational helpers ----
function Field({ label, description, children }) {
    return /*#__PURE__*/ _jsxs("div", {
        className: "space-y-1.5",
        children: [
            /*#__PURE__*/ _jsx(Label, {
                children: label
            }),
            children,
            description ? /*#__PURE__*/ _jsx("p", {
                className: "text-xs text-muted-foreground",
                children: description
            }) : null
        ]
    });
}
function Checkbox({ label, checked, onChange }) {
    return /*#__PURE__*/ _jsxs("label", {
        className: "flex items-center gap-2 text-sm",
        children: [
            /*#__PURE__*/ _jsx("input", {
                type: "checkbox",
                className: "size-4 rounded border-input",
                checked: checked,
                onChange: (e)=>onChange(e.target.checked)
            }),
            label
        ]
    });
}
function StatusIcon({ status }) {
    if (status === 'ok') return /*#__PURE__*/ _jsx(Check, {
        className: "size-4 shrink-0 text-green-600"
    });
    if (status === 'warn') return /*#__PURE__*/ _jsx(TriangleAlert, {
        className: "size-4 shrink-0 text-amber-500"
    });
    return /*#__PURE__*/ _jsx(X, {
        className: "size-4 shrink-0 text-muted-foreground"
    });
}
