import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, History, Search, X } from 'lucide-react'
import { Badge } from '../../components/ui'
import {
  type LogType,
  LOG_ITEMS_PER_PAGE,
  LOG_TYPE_CONFIG,
  SAMPLE_LOGS,
} from './data/logData'
import { formatDate } from './helpers/sharedHelpers'

// ── Helpers ──

const LOG_TYPES: LogType[] = ['status-change', 'field-edit', 'clarification', 'submission', 'approval']

function formatLogTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatLogDate(date: Date): string {
  return `${formatDate(date.toISOString().split('T')[0])}, ${formatLogTime(date)}`
}

// ── Component ──

export function LogTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<LogType>>(new Set(LOG_TYPES))
  const [currentPage, setCurrentPage] = useState(1)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  const filteredLogs = useMemo(() => {
    return SAMPLE_LOGS.filter((log) => {
      if (!selectedTypes.has(log.type)) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          log.name.toLowerCase().includes(q) ||
          log.createdBy.toLowerCase().includes(q) ||
          log.previousValue.toLowerCase().includes(q) ||
          log.newValue.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [searchQuery, selectedTypes])

  const filteredCount = filteredLogs.length
  const totalPages = Math.max(1, Math.ceil(filteredCount / LOG_ITEMS_PER_PAGE))
  const visibleLogs = useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * LOG_ITEMS_PER_PAGE, currentPage * LOG_ITEMS_PER_PAGE)
  }, [filteredLogs, currentPage])

  const showPagination = filteredCount > LOG_ITEMS_PER_PAGE

  const rangeStart = filteredCount > 0 ? (currentPage - 1) * LOG_ITEMS_PER_PAGE + 1 : 0
  const rangeEnd = Math.min(currentPage * LOG_ITEMS_PER_PAGE, filteredCount)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedTypes])

  const allSelected = selectedTypes.size === LOG_TYPES.length
  const noneSelected = selectedTypes.size === 0
  const filterLabel = noneSelected
    ? 'No types'
    : allSelected
      ? 'All types'
      : `${selectedTypes.size} type${selectedTypes.size > 1 ? 's' : ''}`

  function toggleType(type: LogType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelectedTypes(new Set())
    } else {
      setSelectedTypes(new Set(LOG_TYPES))
    }
  }

  // ── Render ──

  return (
    <div className="edit-activity__logs">
      {/* ── Header ── */}
      <div className="edit-activity__members-header">
        <div className="edit-activity__members-header-text">
          <h2>
            Activity Logs
            <span className="edit-activity__members-count-badge">{filteredCount} Records</span>
          </h2>
          <p>Complete audit trail of all changes</p>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="edit-activity__members-toolbar">
        {/* Search */}
        <div className="edit-activity__members-search">
          <Search size={15} />
          <input
            className="edit-activity__members-search-input"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              className="edit-activity__members-search-clear"
              onClick={() => setSearchQuery('')}
              type="button"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        {/* Type filter dropdown */}
        <div className="edit-activity__logs-filter-wrap" ref={filterRef}>
          <button
            className="edit-activity__logs-filter-trigger"
            onClick={() => setFilterOpen((p) => !p)}
            type="button"
          >
            <span className="edit-activity__logs-filter-trigger-dot" />
            {filterLabel}
            <ChevronDown size={13} />
          </button>

          {filterOpen ? (
            <div className="edit-activity__logs-filter-dropdown">
              <div className="edit-activity__logs-filter-dropdown-header">
                <button
                  className="edit-activity__logs-filter-select-all"
                  onClick={handleSelectAll}
                  type="button"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              {LOG_TYPES.map((type) => {
                const config = LOG_TYPE_CONFIG[type]
                const checked = selectedTypes.has(type)
                return (
                  <label key={type} className="edit-activity__logs-filter-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(type)}
                    />
                    <span className="edit-activity__logs-filter-item-check" />
                    <Badge tone={config.tone}>{config.label}</Badge>
                  </label>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── DataGrid ── */}
      {visibleLogs.length > 0 ? (
        <div className="data-grid edit-activity__logs-grid">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Previous Value</th>
                <th>New Value</th>
                <th>Created On</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map((log) => {
                const typeConfig = LOG_TYPE_CONFIG[log.type]
                return (
                  <tr key={log.id}>
                    <td className="edit-activity__logs-cell-name">{log.name}</td>
                    <td>
                      <Badge tone={typeConfig.tone}>{typeConfig.label}</Badge>
                    </td>
                    <td className="edit-activity__logs-cell-value">{log.previousValue}</td>
                    <td className="edit-activity__logs-cell-value">{log.newValue}</td>
                    <td className="edit-activity__logs-cell-date">{formatLogDate(log.createdOn)}</td>
                    <td className="edit-activity__logs-cell-user">{log.createdBy}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="edit-activity__members-empty">
          <History size={40} strokeWidth={1.2} />
          <h3>No logs match your search</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* ── Pagination ── */}
      {showPagination ? (
        <div className="edit-activity__members-pagination">
          <span className="edit-activity__members-pagination-info">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{filteredCount}</strong> log{filteredCount !== 1 ? 's' : ''}
          </span>
          <div className="edit-activity__members-pagination-controls">
            <button
              className="edit-activity__members-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              type="button"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="edit-activity__members-page-numbers">
              {(() => {
                const pages: (number | 'ellipsis')[] = []
                const total = totalPages
                const current = currentPage
                const siblingCount = 1
                if (total <= 7) {
                  for (let i = 1; i <= total; i++) pages.push(i)
                } else {
                  pages.push(1)
                  if (current > siblingCount + 2) pages.push('ellipsis')
                  const start = Math.max(2, current - siblingCount)
                  const end = Math.min(total - 1, current + siblingCount)
                  for (let i = start; i <= end; i++) pages.push(i)
                  if (current < total - siblingCount - 1) pages.push('ellipsis')
                  if (total > 1) pages.push(total)
                }
                return pages.map((page, idx) =>
                  page === 'ellipsis' ? (
                    <span className="edit-activity__members-page-ellipsis" key={`ellipsis-${idx}`}>...</span>
                  ) : (
                    <button
                      key={page}
                      className={`edit-activity__members-page-num${page === current ? ' edit-activity__members-page-num--active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ),
                )
              })()}
            </div>
            <button
              className="edit-activity__members-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              type="button"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
