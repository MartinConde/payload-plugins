'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Mockup-image controls: position (% of canvas), uniform scale (% of the
   fit-to-canvas baseline), exact rendered pixel size, alignment row, lock
   toggle, reset. The mockup is also draggable / corner-scalable directly on
   the canvas; these inputs let an author dial in precise values when needed.

   Width / height / scale are three faces of the same uniform-scale multiplier:
     renderedWidth  = canvasSize.width  * mockupTransform.scale
     renderedHeight = canvasSize.height * mockupTransform.scale
   so editing any one of them updates the others. We commit on blur so partial
   number entries (typing "1." mid-edit) don't fight the controlled input. */ import * as React from 'react';
import { AlignHorizontalJustifyCenterIcon, AlignHorizontalJustifyEndIcon, AlignHorizontalJustifyStartIcon, AlignVerticalJustifyCenterIcon, AlignVerticalJustifyEndIcon, AlignVerticalJustifyStartIcon, LockIcon, MaximizeIcon, RotateCcwIcon, UnlockIcon } from 'lucide-react';
import { Button, Card, CardContent, Input, Label, Separator } from 'payload-plugin-shadcn-ui';
import { baselineScaleFor } from '../fabric/coords.js';
import { useEditor } from '../EditorContext.js';
const pctFromUnit = (v)=>Math.round(v * 10000) / 100 // 0.1234 → 12.34
;
const unitFromPct = (v)=>v / 100;
const scalePctFromMul = (v)=>Math.round(v * 1000) / 10 // 1.234 → 123.4
;
const mulFromScalePct = (v)=>v / 100;
const pxRound = (v)=>Math.round(v);
export function ImageTab() {
    const { alignMockup, canvasSize, disabled, media, mockupTransform, resetMockupTransform, setMockupTransform, toggleMockupLock, tr } = useEditor();
    // Derived rendered pixel size at the current scale. With a square canvas +
    // fit-inside baseline this depends on the image's natural aspect, not just
    // the canvas dim: `rendered = natural * baseline * scale`.
    const natural = media ? {
        w: media.width,
        h: media.height
    } : {
        w: 0,
        h: 0
    };
    const baseline = baselineScaleFor(canvasSize, natural);
    const renderedWidth = pxRound(natural.w * baseline * mockupTransform.scale);
    const renderedHeight = pxRound(natural.h * baseline * mockupTransform.scale);
    // Live string-mirrors of every input, so the user can type intermediate values.
    const [xStr, setXStr] = React.useState(()=>String(pctFromUnit(mockupTransform.x)));
    const [yStr, setYStr] = React.useState(()=>String(pctFromUnit(mockupTransform.y)));
    const [scaleStr, setScaleStr] = React.useState(()=>String(scalePctFromMul(mockupTransform.scale)));
    const [wStr, setWStr] = React.useState(()=>String(renderedWidth));
    const [hStr, setHStr] = React.useState(()=>String(renderedHeight));
    // Re-sync when the transform or canvas size changes from somewhere else
    // (canvas drag, reset, window resize, another input).
    React.useEffect(()=>{
        setXStr(String(pctFromUnit(mockupTransform.x)));
    }, [
        mockupTransform.x
    ]);
    React.useEffect(()=>{
        setYStr(String(pctFromUnit(mockupTransform.y)));
    }, [
        mockupTransform.y
    ]);
    React.useEffect(()=>{
        setScaleStr(String(scalePctFromMul(mockupTransform.scale)));
    }, [
        mockupTransform.scale
    ]);
    React.useEffect(()=>{
        setWStr(String(renderedWidth));
    }, [
        renderedWidth
    ]);
    React.useEffect(()=>{
        setHStr(String(renderedHeight));
    }, [
        renderedHeight
    ]);
    const commitX = ()=>{
        const n = Number(xStr);
        if (Number.isFinite(n)) setMockupTransform((p)=>({
                ...p,
                x: unitFromPct(n)
            }));
    };
    const commitY = ()=>{
        const n = Number(yStr);
        if (Number.isFinite(n)) setMockupTransform((p)=>({
                ...p,
                y: unitFromPct(n)
            }));
    };
    const commitScale = ()=>{
        const n = Number(scaleStr);
        if (Number.isFinite(n) && n > 0) setMockupTransform((p)=>({
                ...p,
                scale: mulFromScalePct(n)
            }));
    };
    const commitWidthPx = ()=>{
        const n = Number(wStr);
        if (!Number.isFinite(n) || n <= 0 || natural.w <= 0 || baseline <= 0) return;
        setMockupTransform((p)=>({
                ...p,
                scale: n / (natural.w * baseline)
            }));
    };
    const commitHeightPx = ()=>{
        const n = Number(hStr);
        if (!Number.isFinite(n) || n <= 0 || natural.h <= 0 || baseline <= 0) return;
        setMockupTransform((p)=>({
                ...p,
                scale: n / (natural.h * baseline)
            }));
    };
    const controlsDisabled = disabled || !media;
    const blurOnEnter = (e)=>{
        if (e.key === 'Enter') e.currentTarget.blur();
    };
    return /*#__PURE__*/ _jsx(Card, {
        children: /*#__PURE__*/ _jsxs(CardContent, {
            className: "flex flex-col gap-4 py-4",
            children: [
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-col gap-1.5",
                    children: [
                        /*#__PURE__*/ _jsx(Label, {
                            children: tr('pluginProducts:imagePosition')
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "grid grid-cols-2 gap-2",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "flex flex-col gap-1.5",
                                    children: [
                                        /*#__PURE__*/ _jsx(Label, {
                                            htmlFor: "mt-x",
                                            className: "text-xs text-muted-foreground",
                                            children: "X %"
                                        }),
                                        /*#__PURE__*/ _jsx(Input, {
                                            id: "mt-x",
                                            type: "number",
                                            step: 1,
                                            value: xStr,
                                            disabled: controlsDisabled,
                                            onChange: (e)=>setXStr(e.target.value),
                                            onBlur: commitX,
                                            onKeyDown: blurOnEnter
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "flex flex-col gap-1.5",
                                    children: [
                                        /*#__PURE__*/ _jsx(Label, {
                                            htmlFor: "mt-y",
                                            className: "text-xs text-muted-foreground",
                                            children: "Y %"
                                        }),
                                        /*#__PURE__*/ _jsx(Input, {
                                            id: "mt-y",
                                            type: "number",
                                            step: 1,
                                            value: yStr,
                                            disabled: controlsDisabled,
                                            onChange: (e)=>setYStr(e.target.value),
                                            onBlur: commitY,
                                            onKeyDown: blurOnEnter
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-col gap-1.5",
                    children: [
                        /*#__PURE__*/ _jsx(Label, {
                            children: tr('pluginProducts:imageSizePx')
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "grid grid-cols-2 gap-2",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "flex flex-col gap-1.5",
                                    children: [
                                        /*#__PURE__*/ _jsx(Label, {
                                            htmlFor: "mt-w",
                                            className: "text-xs text-muted-foreground",
                                            children: "W px"
                                        }),
                                        /*#__PURE__*/ _jsx(Input, {
                                            id: "mt-w",
                                            type: "number",
                                            min: 1,
                                            step: 1,
                                            value: wStr,
                                            disabled: controlsDisabled,
                                            onChange: (e)=>setWStr(e.target.value),
                                            onBlur: commitWidthPx,
                                            onKeyDown: blurOnEnter
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "flex flex-col gap-1.5",
                                    children: [
                                        /*#__PURE__*/ _jsx(Label, {
                                            htmlFor: "mt-h",
                                            className: "text-xs text-muted-foreground",
                                            children: "H px"
                                        }),
                                        /*#__PURE__*/ _jsx(Input, {
                                            id: "mt-h",
                                            type: "number",
                                            min: 1,
                                            step: 1,
                                            value: hStr,
                                            disabled: controlsDisabled,
                                            onChange: (e)=>setHStr(e.target.value),
                                            onBlur: commitHeightPx,
                                            onKeyDown: blurOnEnter
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-col gap-1.5",
                    children: [
                        /*#__PURE__*/ _jsx(Label, {
                            htmlFor: "mt-scale",
                            children: tr('pluginProducts:imageScale')
                        }),
                        /*#__PURE__*/ _jsx(Input, {
                            id: "mt-scale",
                            type: "number",
                            min: 10,
                            max: 400,
                            step: 1,
                            value: scaleStr,
                            disabled: controlsDisabled,
                            onChange: (e)=>setScaleStr(e.target.value),
                            onBlur: commitScale,
                            onKeyDown: blurOnEnter
                        })
                    ]
                }),
                /*#__PURE__*/ _jsx(Separator, {}),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-col gap-1.5",
                    children: [
                        /*#__PURE__*/ _jsx(Label, {
                            children: tr('pluginProducts:align')
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "flex gap-1",
                            children: [
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    size: "icon",
                                    variant: "outline",
                                    disabled: controlsDisabled,
                                    title: tr('pluginProducts:alignLeft'),
                                    onClick: ()=>alignMockup('left'),
                                    children: /*#__PURE__*/ _jsx(AlignHorizontalJustifyStartIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    size: "icon",
                                    variant: "outline",
                                    disabled: controlsDisabled,
                                    title: tr('pluginProducts:alignCenterH'),
                                    onClick: ()=>alignMockup('centerH'),
                                    children: /*#__PURE__*/ _jsx(AlignHorizontalJustifyCenterIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    size: "icon",
                                    variant: "outline",
                                    disabled: controlsDisabled,
                                    title: tr('pluginProducts:alignRight'),
                                    onClick: ()=>alignMockup('right'),
                                    children: /*#__PURE__*/ _jsx(AlignHorizontalJustifyEndIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    size: "icon",
                                    variant: "outline",
                                    disabled: controlsDisabled,
                                    title: tr('pluginProducts:alignTop'),
                                    onClick: ()=>alignMockup('top'),
                                    children: /*#__PURE__*/ _jsx(AlignVerticalJustifyStartIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    size: "icon",
                                    variant: "outline",
                                    disabled: controlsDisabled,
                                    title: tr('pluginProducts:alignMiddle'),
                                    onClick: ()=>alignMockup('middle'),
                                    children: /*#__PURE__*/ _jsx(AlignVerticalJustifyCenterIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    size: "icon",
                                    variant: "outline",
                                    disabled: controlsDisabled,
                                    title: tr('pluginProducts:alignBottom'),
                                    onClick: ()=>alignMockup('bottom'),
                                    children: /*#__PURE__*/ _jsx(AlignVerticalJustifyEndIcon, {
                                        className: "size-4"
                                    })
                                })
                            ]
                        })
                    ]
                }),
                /*#__PURE__*/ _jsx(Separator, {}),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-wrap gap-2",
                    children: [
                        /*#__PURE__*/ _jsxs(Button, {
                            type: "button",
                            variant: "outline",
                            size: "sm",
                            disabled: controlsDisabled,
                            onClick: ()=>resetMockupTransform(),
                            children: [
                                /*#__PURE__*/ _jsx(RotateCcwIcon, {
                                    className: "size-4"
                                }),
                                tr('pluginProducts:imageReset')
                            ]
                        }),
                        /*#__PURE__*/ _jsxs(Button, {
                            type: "button",
                            variant: mockupTransform.locked ? 'default' : 'outline',
                            size: "sm",
                            disabled: controlsDisabled,
                            onClick: ()=>toggleMockupLock(),
                            title: tr('pluginProducts:imageLock'),
                            children: [
                                mockupTransform.locked ? /*#__PURE__*/ _jsx(LockIcon, {
                                    className: "size-4"
                                }) : /*#__PURE__*/ _jsx(UnlockIcon, {
                                    className: "size-4"
                                }),
                                tr('pluginProducts:imageLock')
                            ]
                        })
                    ]
                }),
                media && /*#__PURE__*/ _jsxs("p", {
                    className: "flex items-center gap-1.5 text-xs text-muted-foreground",
                    children: [
                        /*#__PURE__*/ _jsx(MaximizeIcon, {
                            className: "size-3.5"
                        }),
                        tr('pluginProducts:imageNaturalSize'),
                        ": ",
                        media.width,
                        " × ",
                        media.height,
                        "px"
                    ]
                })
            ]
        })
    });
}
