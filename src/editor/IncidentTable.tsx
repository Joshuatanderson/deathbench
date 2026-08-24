import { createColumnHelper, useTable } from "@tanstack/react-table"
import { ExternalLink, Pencil } from "lucide-react"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { features, type DataTableFeatures } from "./data-table-features"
import type { Incident, Lab, Model } from "./types"

type IncidentTableProps = {
  incidents: Incident[]
  labs: Lab[]
  models: Model[]
  onEdit: (incident: Incident) => void
}

const columnHelper = createColumnHelper<DataTableFeatures, Incident>()
const transcriptLabels: Record<Incident["transcriptStatus"], string> = {
  none: "None public",
  excerpts: "Excerpts",
  partial: "Partial",
  "complete-final": "Complete final",
  sealed: "Sealed",
}

export function IncidentTable({ incidents, labs, models, onEdit }: IncidentTableProps) {
  const labNames = useMemo(() => new Map(labs.map((lab) => [String(lab.id), lab.name])), [labs])
  const modelNames = useMemo(
    () => new Map(models.map((model) => [String(model.id), model.name])),
    [models]
  )
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("title", {
          header: "Incident",
          cell: ({ row }) => (
            <a
              className="flex max-w-[26rem] items-center gap-2 text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
              href={row.original.link}
              target="_blank"
              rel="noreferrer"
            >
              <span>{row.original.title}</span>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </a>
          ),
        }),
        columnHelper.accessor("verdict", {
          header: "Verdict",
          cell: ({ row }) => (
            <span className="inline-flex border border-border px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em]">
              {row.original.verdict.replace("-", " ")}
            </span>
          ),
        }),
        columnHelper.accessor("evidenceClass", {
          header: "Evidence",
          cell: ({ row }) => `Class ${row.original.evidenceClass}`,
        }),
        columnHelper.accessor("labId", {
          header: "Lab",
          cell: ({ row }) => labNames.get(String(row.original.labId)) ?? "Unknown",
        }),
        columnHelper.accessor("modelId", {
          header: "Model",
          cell: ({ row }) => modelNames.get(String(row.original.modelId)) ?? "Unknown",
        }),
        columnHelper.accessor("victimCount", {
          header: "Deaths",
        }),
        columnHelper.accessor("transcriptStatus", {
          header: "Transcript",
          cell: ({ row }) => row.original.transcriptLink ? (
            <a
              className="underline decoration-border underline-offset-4 hover:decoration-primary"
              href={row.original.transcriptLink}
              target="_blank"
              rel="noreferrer"
            >
              {transcriptLabels[row.original.transcriptStatus]}
            </a>
          ) : transcriptLabels[row.original.transcriptStatus],
        }),
        columnHelper.accessor("updatedAt", {
          header: "Updated",
          cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
        }),
        columnHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          ),
        }),
      ]),
    [labNames, modelNames, onEdit]
  )
  const table = useTable({ features, data: incidents, columns })

  return (
    <div className="border border-border">
      <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground md:hidden">
        Swipe horizontally to view all columns.
      </p>
      <Table className="min-w-[72rem]">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                No incidents yet. Add the first source-linked record above.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
