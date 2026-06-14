'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import Link from 'next/link';
import { Clock, FileText, Layers, Plus } from 'lucide-react';
import { Badge } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from 'payload-plugin-shadcn-ui';
const relativeTime = (iso)=>{
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diffMs = then - Date.now();
    const abs = Math.abs(diffMs);
    const units = [
        [
            'year',
            31536000000
        ],
        [
            'month',
            2592000000
        ],
        [
            'day',
            86400000
        ],
        [
            'hour',
            3600000
        ],
        [
            'minute',
            60000
        ]
    ];
    const rtf = new Intl.RelativeTimeFormat(undefined, {
        numeric: 'auto'
    });
    for (const [unit, ms] of units){
        if (abs >= ms) return rtf.format(Math.round(diffMs / ms), unit);
    }
    return rtf.format(Math.round(diffMs / 1000), 'second');
};
export function DashboardClient({ recent, sections }) {
    return /*#__PURE__*/ _jsxs("div", {
        className: "space-y-8",
        children: [
            recent.length > 0 && /*#__PURE__*/ _jsxs(Card, {
                children: [
                    /*#__PURE__*/ _jsx(CardHeader, {
                        children: /*#__PURE__*/ _jsxs(CardTitle, {
                            className: "flex items-center gap-2 text-base",
                            children: [
                                /*#__PURE__*/ _jsx(Clock, {
                                    className: "size-4 text-muted-foreground"
                                }),
                                "Recently updated"
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsx(CardContent, {
                        className: "p-0",
                        children: /*#__PURE__*/ _jsx("ul", {
                            className: "divide-y",
                            children: recent.map((doc)=>/*#__PURE__*/ _jsx("li", {
                                    children: /*#__PURE__*/ _jsxs(Link, {
                                        className: "flex items-center justify-between gap-3 px-6 py-2.5 text-sm transition-colors hover:bg-accent",
                                        href: doc.href,
                                        children: [
                                            /*#__PURE__*/ _jsxs("span", {
                                                className: "flex min-w-0 items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx(FileText, {
                                                        className: "size-4 shrink-0 text-muted-foreground"
                                                    }),
                                                    /*#__PURE__*/ _jsx("span", {
                                                        className: "truncate font-medium",
                                                        children: doc.title
                                                    }),
                                                    /*#__PURE__*/ _jsx("span", {
                                                        className: "shrink-0 text-xs text-muted-foreground",
                                                        children: doc.collectionLabel
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "shrink-0 text-xs text-muted-foreground",
                                                children: relativeTime(doc.updatedAt)
                                            })
                                        ]
                                    })
                                }, doc.href))
                        })
                    })
                ]
            }),
            sections.map((section)=>/*#__PURE__*/ _jsxs("section", {
                    className: "space-y-3",
                    children: [
                        /*#__PURE__*/ _jsx("h2", {
                            className: "text-sm font-semibold tracking-wide text-muted-foreground uppercase",
                            children: section.label
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
                            children: section.items.map((item)=>/*#__PURE__*/ _jsxs(Card, {
                                    className: "flex flex-col",
                                    children: [
                                        /*#__PURE__*/ _jsx(CardHeader, {
                                            children: /*#__PURE__*/ _jsxs(CardTitle, {
                                                className: "flex items-center justify-between gap-2 text-base",
                                                children: [
                                                    /*#__PURE__*/ _jsxs("span", {
                                                        className: "flex min-w-0 items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ _jsx(Layers, {
                                                                className: "size-4 shrink-0 text-muted-foreground"
                                                            }),
                                                            /*#__PURE__*/ _jsx("span", {
                                                                className: "truncate",
                                                                children: item.label
                                                            })
                                                        ]
                                                    }),
                                                    item.type === 'collections' && typeof item.count === 'number' && /*#__PURE__*/ _jsx(Badge, {
                                                        variant: "secondary",
                                                        children: new Intl.NumberFormat().format(item.count)
                                                    })
                                                ]
                                            })
                                        }),
                                        /*#__PURE__*/ _jsxs(CardFooter, {
                                            className: "mt-auto gap-2",
                                            children: [
                                                /*#__PURE__*/ _jsx(Button, {
                                                    asChild: true,
                                                    size: "sm",
                                                    variant: "outline",
                                                    children: /*#__PURE__*/ _jsx(Link, {
                                                        href: item.listHref,
                                                        children: item.type === 'globals' ? 'Open' : 'View all'
                                                    })
                                                }),
                                                item.createHref && /*#__PURE__*/ _jsx(Button, {
                                                    asChild: true,
                                                    size: "sm",
                                                    variant: "ghost",
                                                    children: /*#__PURE__*/ _jsxs(Link, {
                                                        href: item.createHref,
                                                        children: [
                                                            /*#__PURE__*/ _jsx(Plus, {
                                                                className: "size-4"
                                                            }),
                                                            "New"
                                                        ]
                                                    })
                                                })
                                            ]
                                        })
                                    ]
                                }, `${item.type}:${item.slug}`))
                        })
                    ]
                }, section.label))
        ]
    });
}
