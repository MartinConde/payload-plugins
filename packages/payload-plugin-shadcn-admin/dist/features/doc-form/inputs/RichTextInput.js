'use client';
import { jsx as _jsx } from "react/jsx-runtime";
/* richText field shim. Mounts Payload's pre-rendered <RichTextField/> element
   (lifted from serverProps.formState.customComponents.Field) inside a small
   Form + OperationProvider so `useField` and friends inside RichTextField
   resolve. The rest of the provider chain (Auth, Config, DocumentInfo,
   Modal, Locale, Translation, etc.) is already in scope via Payload's admin
   shell and the DocumentView wrapper above our AutoCollectionDocView.

   Value flow:
   - prop `value` is the parent bridge's source of truth (a SerializedEditorState)
   - we hand it to Form as the field's initial state
   - Form's onChange fires after every keystroke; we read formState[path].value
     and pipe it up via props.onChange
   - if the parent value changes from outside (Discard / save reload), we
     remount Form via a key bump so its internal reducer re-baselines

   Loop guard: a single shared `lastEmittedRef` is consulted by BOTH the
   onChange listener (don't re-emit values we just received) AND the remount
   useEffect (don't bump key for values we ourselves just emitted). Without
   this guard you get: bridge updates → useEffect sees new prop → bumps key
   → Form remounts → onChange fires → bridge updates → loop. */ import * as React from 'react';
import { Form } from '../../../internal/payloadAdapter.js';
import { OperationProvider } from '../../../internal/payloadAdapter.js';
// JSON-stringify round-trip compare. Lexical state is JSON-safe so this is
// reliable. Zero new deps (avoid pulling in dequal — only transitively present).
const sameValue = (a, b)=>{
    if (a === b) return true;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch  {
        return false;
    }
};
export function RichTextInput({ path, rendered, value, onChange, operation }) {
    // Shared loop guard. Holds the last value we either received from the parent
    // OR emitted up to the parent — whichever was most recent. Initialized to the
    // parent's value at mount.
    const lastSyncedRef = React.useRef(value);
    const [remountKey, setRemountKey] = React.useState(0);
    // External value change → remount Form so its internal reducer reseeds from
    // the new initialState. Guarded against echoes of our own emits.
    React.useEffect(()=>{
        if (sameValue(value, lastSyncedRef.current)) return;
        lastSyncedRef.current = value;
        setRemountKey((k)=>k + 1);
    }, [
        value
    ]);
    // Form's onChange contract: Array<({formState}) => Promise<FormState>>.
    // We read the field's new value, dequal against the loop-guard ref, and
    // emit upward if changed. Return the input formState unchanged.
    const onFormStateChange = React.useCallback(async ({ formState })=>{
        const next = formState[path]?.value;
        if (!sameValue(next, lastSyncedRef.current)) {
            lastSyncedRef.current = next;
            onChange(next);
        }
        return formState;
    }, [
        path,
        onChange
    ]);
    const initialState = React.useMemo(()=>({
            [path]: {
                value,
                initialValue: value,
                valid: true,
                customComponents: {
                    Field: rendered.Field
                }
            }
        }), // Recompute initialState only when we remount — the Form takes initialState
    // once at mount and ignores subsequent changes. Tying this to remountKey
    // keeps the seed in sync with what the new Form instance will read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        remountKey
    ]);
    return /*#__PURE__*/ _jsx(OperationProvider, {
        operation: operation,
        children: /*#__PURE__*/ _jsx(Form, {
            el: "div",
            isDocumentForm: false,
            disableValidationOnSubmit: true,
            initialState: initialState,
            onChange: [
                onFormStateChange
            ],
            children: rendered.Field
        }, remountKey)
    });
}
