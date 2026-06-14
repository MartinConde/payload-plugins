import { productsT } from '../translations.js';
/**
 * Builds the `print-templates` collection: reusable physical print sizes (mm)
 * referenced by product views. Field surface is intentionally minimal in
 * Phase 1 — just enough metadata for aspect-lock and downstream DPI checks.
 *
 * Access: read for anyone, writes restricted to authenticated users.
 */ export const buildPrintTemplatesCollection = ({ slug, overrides })=>({
        slug,
        labels: {
            singular: productsT('pluginProducts:printTemplateSingular'),
            plural: productsT('pluginProducts:printTemplatePlural')
        },
        admin: {
            useAsTitle: 'name',
            defaultColumns: [
                'name',
                'widthMm',
                'heightMm',
                'category',
                'updatedAt'
            ],
            description: productsT('pluginProducts:printTemplatesDesc'),
            ...overrides?.admin
        },
        access: {
            read: ()=>true,
            create: ({ req: { user } })=>Boolean(user),
            update: ({ req: { user } })=>Boolean(user),
            delete: ({ req: { user } })=>Boolean(user),
            ...overrides?.access ?? {}
        },
        ...overrides?.hooks ? {
            hooks: overrides.hooks
        } : {},
        fields: [
            {
                name: 'name',
                type: 'text',
                required: true,
                label: productsT('pluginProducts:printTemplateNameLabel'),
                admin: {
                    description: productsT('pluginProducts:printTemplateNameDesc')
                }
            },
            {
                name: 'widthMm',
                type: 'number',
                required: true,
                min: 1,
                label: productsT('pluginProducts:printTemplateWidthMmLabel')
            },
            {
                name: 'heightMm',
                type: 'number',
                required: true,
                min: 1,
                label: productsT('pluginProducts:printTemplateHeightMmLabel')
            },
            {
                name: 'bleedMm',
                type: 'number',
                min: 0,
                label: productsT('pluginProducts:printTemplateBleedMmLabel')
            },
            {
                name: 'minDpi',
                type: 'number',
                defaultValue: 150,
                label: productsT('pluginProducts:printTemplateMinDpiLabel')
            },
            {
                name: 'category',
                type: 'text',
                label: productsT('pluginProducts:printTemplateCategoryLabel')
            },
            {
                name: 'description',
                type: 'textarea',
                label: productsT('pluginProducts:printTemplateDescriptionLabel')
            },
            ...overrides?.fields ?? []
        ],
        ...overrides ? Object.fromEntries(Object.entries(overrides).filter(([k])=>![
                'admin',
                'access',
                'hooks',
                'fields'
            ].includes(k))) : {}
    });
