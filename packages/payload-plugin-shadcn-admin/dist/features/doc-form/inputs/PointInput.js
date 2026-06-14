'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Point field input. Payload stores points as GeoJSON [lng, lat] on disk and
   accepts the same shape on REST POST/PATCH. The list-view cell flips to
   lat-first for human-readable display; this input keeps the storage order
   so values round-trip without surprises.

   We hold local string state per coordinate while the user types so partial
   input like `52.` displays correctly — round-tripping through Number()
   then String() would strip trailing decimal points. The parent only sees
   numbers (or null if both fields are blank). */ import * as React from 'react';
import { Input } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
const stringifyCoord = (v)=>{
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    if (typeof v === 'string') return v;
    return '';
};
const incomingFromValue = (value)=>{
    if (Array.isArray(value) && value.length >= 2) {
        return {
            lng: stringifyCoord(value[0]),
            lat: stringifyCoord(value[1])
        };
    }
    return {
        lng: '',
        lat: ''
    };
};
/* Accept a coord candidate. Trailing dot ('52.') and lone minus ('-') are
   "still typing" — return null so the parent value doesn't get rewritten
   mid-keystroke. */ const parseCoord = (raw)=>{
    const t = raw.trim();
    if (t === '') return null;
    if (t === '-' || t === '.' || t === '-.' || t.endsWith('.')) return 'invalid';
    const n = Number(t);
    return Number.isFinite(n) ? n : 'invalid';
};
export function PointInput({ id, value, onChange, required, invalid, disabled }) {
    const incoming = incomingFromValue(value);
    const [lngText, setLngText] = React.useState(incoming.lng);
    const [latText, setLatText] = React.useState(incoming.lat);
    // Re-baseline ONLY when the parent value changes to something the local
    // text doesn't already represent — e.g. Discard, server-side initial
    // values, or programmatic reset. Without this guard, typing `52.` would
    // get clobbered back to `52` on the next render.
    React.useEffect(()=>{
        const next = incomingFromValue(value);
        const lngParsed = parseCoord(lngText);
        const latParsed = parseCoord(latText);
        const lngMismatch = typeof lngParsed === 'number' ? next.lng !== String(lngParsed) : next.lng !== '' || lngText === '';
        const latMismatch = typeof latParsed === 'number' ? next.lat !== String(latParsed) : next.lat !== '' || latText === '';
        if (lngMismatch) setLngText(next.lng);
        if (latMismatch) setLatText(next.lat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        value
    ]);
    const emit = (nextLngText, nextLatText)=>{
        const lngParsed = parseCoord(nextLngText);
        const latParsed = parseCoord(nextLatText);
        // Both blank → null (cleared).
        if (lngParsed === null && latParsed === null) {
            onChange(null);
            return;
        }
        // Either side is mid-keystroke ('52.', '-') → don't push a half-formed
        // pair upstream. The text state still holds what the user typed.
        if (lngParsed === 'invalid' || latParsed === 'invalid') return;
        onChange([
            typeof lngParsed === 'number' ? lngParsed : 0,
            typeof latParsed === 'number' ? latParsed : 0
        ]);
    };
    const ariaInvalid = invalid ? true : undefined;
    const invalidRing = 'aria-invalid:border-destructive aria-invalid:ring-destructive/40';
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-row gap-2",
        children: [
            /*#__PURE__*/ _jsxs("label", {
                className: "flex flex-1 flex-col gap-1",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        className: "text-xs text-muted-foreground",
                        children: "Longitude"
                    }),
                    /*#__PURE__*/ _jsx(Input, {
                        id: id ? `${id}-lng` : undefined,
                        type: "text",
                        inputMode: "decimal",
                        value: lngText,
                        onChange: (e)=>{
                            setLngText(e.target.value);
                            emit(e.target.value, latText);
                        },
                        required: required,
                        disabled: disabled,
                        "aria-invalid": ariaInvalid,
                        className: cn(invalidRing)
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("label", {
                className: "flex flex-1 flex-col gap-1",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        className: "text-xs text-muted-foreground",
                        children: "Latitude"
                    }),
                    /*#__PURE__*/ _jsx(Input, {
                        id: id ? `${id}-lat` : undefined,
                        type: "text",
                        inputMode: "decimal",
                        value: latText,
                        onChange: (e)=>{
                            setLatText(e.target.value);
                            emit(lngText, e.target.value);
                        },
                        required: required,
                        disabled: disabled,
                        "aria-invalid": ariaInvalid,
                        className: cn(invalidRing)
                    })
                ]
            })
        ]
    });
}
