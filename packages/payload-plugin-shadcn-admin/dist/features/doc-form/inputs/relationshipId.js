/* The relationship / upload pickers surface ids as strings (they key search
   results, chips and selection by `String(id)`). But Payload validates an id
   against the related collection's id type — `isValidID(value, 'number')`
   (payload/dist/utilities/isValidID.js) returns true ONLY when
   `typeof value === 'number'`. So a numeric-id collection (Postgres / SQLite /
   D1) rejects a string id with "The following field is invalid: <Field>" the
   moment the value is *changed* via a picker (an untouched value loaded from
   the doc stays a number, which is why the bug is intermittent).

   Coerce canonical-integer id strings back to numbers at the point a
   relationship/upload field emits its value (FieldInput), so both the doc form
   and the bulk-edit drawer send the right type. Non-numeric ids (Mongo
   ObjectIds, uuids, slugs) never match `/^\d+$/`, so string-id collections are
   left untouched. Handles single ids, hasMany arrays, and polymorphic
   `{ relationTo, value }` envelopes (single or array). */ // Only coerce when the integer round-trips exactly: this leaves leading-zero
// ids ("012") and ids beyond Number's safe-integer range (precision loss) as
// strings, so genuine string-id collections are never corrupted.
const coerceId = (v)=>typeof v === 'string' && /^\d+$/.test(v) && String(Number(v)) === v ? Number(v) : v;
export const coerceRelationshipValue = (v)=>{
    if (Array.isArray(v)) return v.map(coerceRelationshipValue);
    if (v !== null && typeof v === 'object' && 'value' in v) {
        return {
            ...v,
            value: coerceId(v.value)
        };
    }
    return coerceId(v);
};
