'use client'

/* Client table for the versions LIST view. Server-driven: the RSC
   (AutoVersionsView) fetches a page of versions and hands them here.
   Pagination writes to the URL (`?page=`) and lets the RSC refetch. Matches
   Payload's native list (snapshots excluded, all locales shown). Replaces the
   old 20-capped VersionsDialog. v3.9. */

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Badge } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import { persistedStatusPill, toneClassName } from '../drafts/statusPill.js'

export type VersionRow = {
  id: string
  updatedAt: string
  status: 'draft' | 'published' | null
  autosave: boolean
  publishedLocale: string | null
}

export type VersionsListProps = {
  rows: VersionRow[]
  /** `/admin/collections/{slug}/{id}` — version links append `/versions/{id}`. */
  basePath: string
  page: number
  totalPages: number
}

const formatTimestamp = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function VersionsList({
  rows,
  basePath,
  page,
  totalPages,
}: VersionsListProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const router = useRouter()
  const searchParams = useSearchParams()

  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('page', String(next))
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('general:updatedAt')}</TableHead>
              <TableHead>{t('version:status')}</TableHead>
              <TableHead>{t('shadcnAdmin:colType')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {t('shadcnAdmin:noPriorVersions')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const pill = persistedStatusPill(row.status, t)
                return (
                  <TableRow key={row.id} className="cursor-pointer">
                    <TableCell>
                      <a
                        href={`${basePath}/versions/${row.id}`}
                        className="font-medium hover:underline"
                      >
                        {formatTimestamp(row.updatedAt)}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('font-medium', toneClassName(pill.tone))}
                      >
                        {pill.label}
                        {row.publishedLocale ? (
                          <span className="ml-1 uppercase opacity-70">
                            {row.publishedLocale}
                          </span>
                        ) : null}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.autosave
                        ? t('version:autosave')
                        : t('shadcnAdmin:manualType')}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            {t('shadcnAdmin:pageNofM', { current: page, total: totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            {t('shadcnAdmin:previous')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            {t('shadcnAdmin:next')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
