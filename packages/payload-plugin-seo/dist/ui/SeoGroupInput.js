'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* SEO group renderer, mounted by shadcn-admin's group-level `.input` override
   (v3.19). Receives the whole `meta` group object as `value` (live — the bridge
   re-renders on every keystroke) plus `renderChild`, which it uses to render the
   real subfield inputs back through the host form. `value` drives the read-only
   SERP / social previews and the character counters; it is never written here
   (the delegated inputs own writes via the bridge's setValueAtPath).

   IMPORTANT: this module is pulled into the Payload server config graph (it is
   referenced as a direct component reference in `field.custom`, the verified
   `.cell`/`.input` pattern). The Payload CLI loads that graph in plain Node, so
   this file must stay Node-safe: NO value imports from
   `payload-plugin-shadcn-admin/client` (its barrel pulls @payloadcms/ui → CSS
   imports that crash Node). Types are `import type` (erased); visuals are plain
   token-classed divs; the active locale arrives as a prop. */ import * as React from 'react';
import { ChevronDown, Globe, ImageIcon, Search } from 'lucide-react';
const makeTr = (t)=>{
    const tt = t;
    return (key, fallback)=>tt ? tt(key) : fallback;
};
const TITLE_IDEAL = 60;
const DESC_IDEAL = 160;
/** Reads a leaf that may be a localized `{ [locale]: value }` object. */ function readLeaf(raw, locale) {
    if (raw == null) return '';
    if (typeof raw === 'string') return raw;
    if (locale && typeof raw === 'object' && !Array.isArray(raw) && locale in raw) {
        const v = raw[locale];
        return typeof v === 'string' ? v : '';
    }
    return '';
}
/** Length-vs-ideal meter with semantic color states + over-limit overflow. */ function CharCount({ label, count, ideal }) {
    const over = count - ideal;
    const tone = count === 0 ? 'bg-muted text-muted-foreground' : over > 0 ? 'bg-destructive/15 text-destructive' : count > ideal * 0.9 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    return /*#__PURE__*/ _jsxs("span", {
        className: "inline-flex items-center gap-1.5",
        children: [
            /*#__PURE__*/ _jsx("span", {
                className: "text-xs text-muted-foreground",
                children: label
            }),
            /*#__PURE__*/ _jsxs("span", {
                className: `inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${tone}`,
                children: [
                    count,
                    "/",
                    ideal,
                    over > 0 ? /*#__PURE__*/ _jsxs("span", {
                        className: "ml-1 font-semibold",
                        children: [
                            "+",
                            over
                        ]
                    }) : null
                ]
            })
        ]
    });
}
/** Resolves an upload field value (id or populated doc) to an image URL. */ function useImageUrl(value, collectionSlug) {
    const [url, setUrl] = React.useState(null);
    // Populated object → read url synchronously.
    const inlineUrl = value && typeof value === 'object' && 'url' in value ? value.url ?? null : null;
    const id = value == null ? null : typeof value === 'object' ? value.id ?? null : value;
    React.useEffect(()=>{
        if (inlineUrl || id == null) {
            setUrl(null);
            return;
        }
        let active = true;
        fetch(`/api/${collectionSlug}/${id}?depth=0`, {
            credentials: 'include'
        }).then((r)=>r.ok ? r.json() : null).then((doc)=>{
            if (!active || !doc) return;
            setUrl(doc.thumbnailURL || doc.url || null);
        }).catch(()=>{});
        return ()=>{
            active = false;
        };
    }, [
        id,
        inlineUrl,
        collectionSlug
    ]);
    return inlineUrl ?? url;
}
function PreviewCard({ icon, title, children }) {
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex h-full flex-col rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                children: [
                    icon,
                    title
                ]
            }),
            children
        ]
    });
}
/** Always-open styled section, matching the preview cards' surface language. */ function Section({ title, children }) {
    return /*#__PURE__*/ _jsxs("section", {
        className: "flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
        children: [
            title ? /*#__PURE__*/ _jsx("div", {
                className: "text-sm font-medium",
                children: title
            }) : null,
            children
        ]
    });
}
/** Hand-rolled collapsible (Node-safe: useState + div + button + lucide icon).
   Replaces Payload's native collapsible chrome so the sections read as cards
   that match the previews instead of a bare "Toggle" row. */ function CollapsibleSection({ title, defaultOpen = false, children }) {
    const [open, setOpen] = React.useState(defaultOpen);
    return /*#__PURE__*/ _jsxs("div", {
        className: "rounded-lg border bg-card text-card-foreground shadow-sm",
        children: [
            /*#__PURE__*/ _jsxs("button", {
                type: "button",
                onClick: ()=>setOpen((o)=>!o),
                className: "flex w-full items-center justify-between px-4 py-3 text-sm font-medium",
                children: [
                    title,
                    /*#__PURE__*/ _jsx(ChevronDown, {
                        className: `size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`
                    })
                ]
            }),
            open ? /*#__PURE__*/ _jsx("div", {
                className: "flex flex-col gap-4 border-t px-4 py-4",
                children: children
            }) : null
        ]
    });
}
export function SeoGroupInput(props) {
    const { field, value, nestedPath, renderChild, fieldPerms, activeLocale, t } = props;
    const tr = makeTr(t);
    const meta = value && typeof value === 'object' ? value : {};
    const og = meta.og && typeof meta.og === 'object' ? meta.og : {};
    const subfields = field.fields ?? [];
    const childPrefix = nestedPath ? `${nestedPath}.` : '';
    // Name → field map so the styled sections can compose subfields by name.
    const byName = {};
    for (const f of subfields)if (f.name) byName[f.name] = f;
    // Upload collection slug, read off the image field's relationTo.
    const imageField = subfields.find((f)=>f.name === 'image');
    const imageSlug = typeof imageField?.relationTo === 'string' && imageField.relationTo || 'media';
    const imageUrl = useImageUrl(meta.image, imageSlug);
    const title = readLeaf(meta.title, activeLocale);
    const description = readLeaf(meta.description, activeLocale);
    const ogTitle = readLeaf(og.title, activeLocale) || title;
    const ogDescription = readLeaf(og.description, activeLocale) || description;
    const canonical = typeof meta.canonicalUrl === 'string' && meta.canonicalUrl ? meta.canonicalUrl : '';
    const { host, crumb } = (()=>{
        try {
            const u = new URL(canonical || 'https://example.com');
            const segs = u.pathname.split('/').filter(Boolean);
            return {
                host: u.host,
                crumb: segs.length ? `${u.host} › ${segs.join(' › ')}` : u.host
            };
        } catch  {
            return {
                host: 'example.com',
                crumb: 'example.com'
            };
        }
    })();
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-5",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "grid grid-cols-1 gap-3 lg:grid-cols-2",
                children: [
                    /*#__PURE__*/ _jsx(PreviewCard, {
                        icon: /*#__PURE__*/ _jsx(Search, {
                            className: "size-3.5"
                        }),
                        title: tr('pluginSeo:searchPreview', 'Search result preview'),
                        children: /*#__PURE__*/ _jsxs("div", {
                            className: "flex flex-1 flex-col gap-1",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ _jsx("span", {
                                            className: "flex size-6 items-center justify-center rounded-full bg-muted",
                                            children: /*#__PURE__*/ _jsx(Globe, {
                                                className: "size-3 text-muted-foreground"
                                            })
                                        }),
                                        /*#__PURE__*/ _jsx("span", {
                                            className: "truncate text-xs text-muted-foreground",
                                            children: crumb
                                        }),
                                        activeLocale ? /*#__PURE__*/ _jsx("span", {
                                            className: "rounded bg-muted px-1 text-[10px] font-medium uppercase text-muted-foreground",
                                            children: activeLocale
                                        }) : null
                                    ]
                                }),
                                /*#__PURE__*/ _jsx("div", {
                                    className: "text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]",
                                    children: title || tr('pluginSeo:metaTitlePlaceholder', 'Your meta title appears here')
                                }),
                                /*#__PURE__*/ _jsx("p", {
                                    className: "line-clamp-2 text-sm leading-snug text-muted-foreground",
                                    children: description || tr('pluginSeo:metaDescPlaceholder', 'Your meta description appears here. Add one to control the snippet shown in search results.')
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3",
                                    children: [
                                        /*#__PURE__*/ _jsx(CharCount, {
                                            label: tr('pluginSeo:charCountTitle', 'Title'),
                                            count: title.length,
                                            ideal: TITLE_IDEAL
                                        }),
                                        /*#__PURE__*/ _jsx(CharCount, {
                                            label: tr('pluginSeo:charCountDescription', 'Description'),
                                            count: description.length,
                                            ideal: DESC_IDEAL
                                        })
                                    ]
                                })
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsx(PreviewCard, {
                        icon: /*#__PURE__*/ _jsx(Globe, {
                            className: "size-3.5"
                        }),
                        title: tr('pluginSeo:socialPreview', 'Social share preview'),
                        children: /*#__PURE__*/ _jsxs("div", {
                            className: "overflow-hidden rounded-lg border",
                            children: [
                                /*#__PURE__*/ _jsx("div", {
                                    className: "flex h-44 w-full items-center justify-center bg-muted",
                                    children: imageUrl ? // eslint-disable-next-line @next/next/no-img-element
                                    /*#__PURE__*/ _jsx("img", {
                                        src: imageUrl,
                                        alt: "",
                                        className: "size-full object-cover"
                                    }) : /*#__PURE__*/ _jsxs("div", {
                                        className: "flex flex-col items-center gap-1 text-muted-foreground",
                                        children: [
                                            /*#__PURE__*/ _jsx(ImageIcon, {
                                                className: "size-6"
                                            }),
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "text-xs",
                                                children: tr('pluginSeo:noOgImage', 'No OG image')
                                            })
                                        ]
                                    })
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "flex flex-col gap-0.5 border-t bg-muted/30 px-3 py-2.5",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "text-[11px] uppercase tracking-wide text-muted-foreground",
                                            children: host
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "truncate text-sm font-semibold",
                                            children: ogTitle || tr('pluginSeo:ogTitlePlaceholder', 'Open Graph title')
                                        }),
                                        /*#__PURE__*/ _jsx("p", {
                                            className: "line-clamp-2 text-xs text-muted-foreground",
                                            children: ogDescription || tr('pluginSeo:ogDescPlaceholder', 'Open Graph description')
                                        })
                                    ]
                                })
                            ]
                        })
                    })
                ]
            }),
            renderChild ? /*#__PURE__*/ _jsx(SeoSections, {
                byName: byName,
                childPrefix: childPrefix,
                fieldPerms: fieldPerms,
                renderChild: renderChild,
                tr: tr
            }) : null
        ]
    });
}
/** Composes the delegated subfield inputs into the styled section layout. */ function SeoSections({ byName, childPrefix, fieldPerms, renderChild, tr }) {
    const field = (name)=>byName[name] ? renderChild(byName[name], childPrefix, fieldPerms) : null;
    // Subfields not wired into a section below — rendered in a trailing block so
    // a future addition to metaField.ts is never silently dropped.
    const known = new Set([
        'title',
        'description',
        'image',
        'noindex',
        'nofollow',
        'canonicalUrl',
        'og',
        'twitter',
        'breadcrumbTitle',
        'schema',
        // Opt-in virtual field — listed so it's never dropped into "Other", but
        // intentionally never rendered (it's a read-only, API-only computed value).
        'jsonLdComputed'
    ]);
    const leftover = Object.keys(byName).filter((n)=>!known.has(n));
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-4",
        children: [
            /*#__PURE__*/ _jsxs(Section, {
                title: tr('pluginSeo:sectionBasics', 'Basics'),
                children: [
                    field('title'),
                    field('description'),
                    field('image')
                ]
            }),
            /*#__PURE__*/ _jsxs(CollapsibleSection, {
                title: tr('pluginSeo:sectionRobots', 'Robots & canonical'),
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex flex-wrap gap-4",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                className: "min-w-[180px] flex-1",
                                children: field('noindex')
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "min-w-[180px] flex-1",
                                children: field('nofollow')
                            })
                        ]
                    }),
                    field('canonicalUrl')
                ]
            }),
            /*#__PURE__*/ _jsxs(CollapsibleSection, {
                title: tr('pluginSeo:sectionSocial', 'Social (Open Graph & Twitter)'),
                children: [
                    field('og'),
                    field('twitter')
                ]
            }),
            /*#__PURE__*/ _jsx(CollapsibleSection, {
                title: tr('pluginSeo:sectionStructuredData', 'Structured data'),
                children: field('schema')
            }),
            /*#__PURE__*/ _jsx(CollapsibleSection, {
                title: tr('pluginSeo:sectionAdvanced', 'Advanced'),
                children: field('breadcrumbTitle')
            }),
            leftover.length ? /*#__PURE__*/ _jsx(Section, {
                title: tr('pluginSeo:sectionOther', 'Other'),
                children: leftover.map((n)=>/*#__PURE__*/ _jsx(React.Fragment, {
                        children: field(n)
                    }, n))
            }) : null
        ]
    });
}
