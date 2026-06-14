/* Build the bulk PATCH body from the picked dotted paths and a (locale-
   projected) values shim. Leaf paths under the same container are merged into
   one nested object — e.g. picking `myGroup.a` and `myGroup.b` yields
   `{ myGroup: { a, b } }` — so a single JSON PATCH carries them all. array /
   blocks paths carry their whole value (Payload replaces these containers
   wholesale). */ import { getByPath, setByPath } from '../../doc-form/fieldTree/sharedHelpers.js';
export const buildPatchBody = (pickedPaths, projectedShim)=>{
    let body = {};
    for (const path of pickedPaths){
        body = setByPath(body, path, getByPath(projectedShim, path));
    }
    return body;
};
