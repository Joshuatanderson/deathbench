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

export function IncidentTable({ incidents, labs, models, onEdit }: IncidentTableProps) {
  const labNames = useMemo(() => new Map(labs.map((lab) => [String(lab.id), lab.name])), [labs])
  const modelNames = useMemo(
    () => new Map(models.map((model) => [String(model.id), model.name])),
    [models]
  )
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("link", {
          header: "Source",
          cell: ({ row }) => (
            <a
              className="flex max-w-[34rem] items-center gap-2 truncate text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
              href={row.original.link}
              target="_blank"
              rel="noreferrer"
            >
              <span className="truncate">{row.original.link}</span>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </a>
          ),
        }),
        columnHelper.accessor("labId", {
          header: "Lab",
          cell: ({ row }) => labNames.get(String(row.original.labId)) ?? "Unknown",
        }),
        columnHelper.accessor("modelId", {
          header: "Model",
          cell: ({ row }) => modelNames.get(String(row.original.modelId)) ?? "Unknown",
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
      <Table>
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
