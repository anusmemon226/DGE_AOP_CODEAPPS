import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'
import { LoadingState } from './LoadingState'
import './ui.css'

export type DataGridColumn<TRow> = {
  key: string
  header: string
  render: (row: TRow) => ReactNode
}

type DataGridProps<TRow> = {
  columns: readonly DataGridColumn<TRow>[]
  emptyMessage?: string
  getRowKey: (row: TRow) => string
  isLoading?: boolean
  rows: readonly TRow[]
}

export function DataGrid<TRow>({ columns, emptyMessage = 'No records found', getRowKey, isLoading = false, rows }: DataGridProps<TRow>) {
  if (isLoading) {
    return <LoadingState label="Loading records..." />
  }

  if (rows.length === 0) {
    return <EmptyState description={emptyMessage} title="Nothing to show" />
  }

  return (
    <div className="data-grid">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
