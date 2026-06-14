/* Collection afterRead: project each view's resolved physical dimensions into
   `view.resolvedDimsMm` so the canvas / Designer can read mm without fetching
   the referenced print-template doc itself. Batches a single payload.find
   against the templates collection for the union of ids referenced in this
   doc's views; for views with `printAreaSource: 'custom'` it just copies the
   already-stored widthMm/heightMm/bleedMm. */ export const denormalizeResolvedDims = (printTemplatesSlug)=>async ({ doc, req })=>{
        const views = Array.isArray(doc?.views) ? doc.views : [];
        if (views.length === 0) return doc;
        const idsToFetch = Array.from(new Set(views.filter((v)=>v?.printAreaSource === 'template' && v?.printAreaTemplate != null).map((v)=>{
            const ref = v.printAreaTemplate;
            if (ref != null && typeof ref === 'object') {
                return ref.id;
            }
            return ref;
        }).filter((id)=>id != null).map((id)=>String(id))));
        let byId = new Map();
        if (idsToFetch.length > 0) {
            try {
                const { docs } = await req.payload.find({
                    collection: printTemplatesSlug,
                    where: {
                        id: {
                            in: idsToFetch
                        }
                    },
                    depth: 0,
                    limit: idsToFetch.length,
                    pagination: false
                });
                byId = new Map(docs.map((d)=>[
                        String(d.id),
                        d
                    ]));
            } catch  {
            // If the templates collection is missing (consumer disabled it) or the
            // query fails, fall through with an empty map — views without resolved
            // dims simply won't render the canvas (DesignerCanvas gates on
            // `hasViewDims`).
            }
        }
        doc.views = views.map((v)=>{
            if (v?.printAreaSource === 'template' && v?.printAreaTemplate != null) {
                const ref = v.printAreaTemplate;
                const id = ref != null && typeof ref === 'object' ? String(ref.id) : String(ref);
                const tpl = byId.get(id);
                if (tpl && typeof tpl.widthMm === 'number' && typeof tpl.heightMm === 'number') {
                    const dims = {
                        widthMm: tpl.widthMm,
                        heightMm: tpl.heightMm
                    };
                    if (typeof tpl.bleedMm === 'number') dims.bleedMm = tpl.bleedMm;
                    return {
                        ...v,
                        resolvedDimsMm: dims
                    };
                }
            }
            if (v?.printAreaSource === 'custom' && typeof v.widthMm === 'number' && typeof v.heightMm === 'number' && v.widthMm > 0 && v.heightMm > 0) {
                const dims = {
                    widthMm: v.widthMm,
                    heightMm: v.heightMm
                };
                if (typeof v.bleedMm === 'number') dims.bleedMm = v.bleedMm;
                return {
                    ...v,
                    resolvedDimsMm: dims
                };
            }
            return v;
        });
        return doc;
    };
