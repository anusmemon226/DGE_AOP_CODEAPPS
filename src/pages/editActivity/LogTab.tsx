import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, History, RefreshCw, Search, X } from 'lucide-react'
import { Badge, Button } from '../../components/ui'
import {
  Dga_aop_project_logsesdga_type,
  type Dga_aop_project_logses,
  type Dga_aop_project_logsesdga_type as LogTypeCode,
} from '../../generated/models/Dga_aop_project_logsesModel'
import type { Systemusers } from '../../generated/models/SystemusersModel'
import { Dga_aop_project_logsesService } from '../../generated/services/Dga_aop_project_logsesService'
import { SystemusersService } from '../../generated/services/SystemusersService'
import { formatDate } from './helpers/sharedHelpers'
import { LOG_ITEMS_PER_PAGE } from './data/logData'

type ActivityLogRow = {
  createdBy: string
  createdOn: string
  id: string
  name: string
  newValue: string
  oldValue: string
  type: string
  typeCode: LogTypeCode | null
}

type LogTabProps = {
  isExecutionPhase: boolean
  projectId: string
}

type LogView = 'approval' | 'reporting'
type ReportingTypeFilter = 'all' | '776140002' | '776140000' | '776140003' | '776140001'

const APPROVAL_LOG_TYPE: LogTypeCode = 776140004
const REPORTING_LOG_TYPES = new Set<LogTypeCode>([776140002, 776140000, 776140003, 776140001])

const LOG_TYPE_LABELS: Record<LogTypeCode, string> = {
  776140000: 'Milestone',
  776140001: 'Budget',
  776140002: 'Project',
  776140003: 'Procurement',
  776140004: 'Project Updates',
}

const REPORTING_TYPE_OPTIONS: ReadonlyArray<{ label: string; value: ReportingTypeFilter }> = [
  { label: 'All Reporting Logs', value: 'all' },
  { label: 'Project', value: '776140002' },
  { label: 'Milestone', value: '776140000' },
  { label: 'Procurement', value: '776140003' },
  { label: 'Budget', value: '776140001' },
]

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
  const error = (result as { error?: unknown })?.error
  const message = typeof error === 'string' ? error : (error as { message?: string } | undefined)?.message

  if (!message) return fallbackMessage

  try {
    const parsed = JSON.parse(message) as { error?: { message?: string } }
    return parsed.error?.message ?? message
  } catch {
    return message
  }
}

function assertOperationSuccess(result: unknown, fallbackMessage: string) {
  if ((result as { success?: boolean })?.success === false) {
    throw new Error(getOperationErrorMessage(result, fallbackMessage))
  }
}

function escapeODataValue(value: string) {
  return value.replace(/'/g, "''")
}

function mapLogTypeLabel(typeCode?: LogTypeCode | null) {
  if (!typeCode) return '—'
  return LOG_TYPE_LABELS[typeCode] ?? Dga_aop_project_logsesdga_type[typeCode] ?? `Type ${typeCode}`
}

function getLogTypeTone(typeCode?: LogTypeCode | null): 'neutral' | 'info' | 'success' | 'warning' {
  switch (typeCode) {
    case 776140004:
      return 'info'
    case 776140002:
      return 'success'
    case 776140000:
      return 'neutral'
    case 776140003:
      return 'warning'
    case 776140001:
      return 'info'
    default:
      return 'neutral'
  }
}

async function loadUserNames(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.map(normalizeId).filter(Boolean)))
  const namesById: Record<string, string> = {}

  if (uniqueIds.length === 0) {
    return namesById
  }

  const result = await SystemusersService.getAll({
    filter: uniqueIds.map((id) => `systemuserid eq '${escapeODataValue(id)}'`).join(' or '),
    select: ['systemuserid', 'fullname', 'internalemailaddress'],
  })
  assertOperationSuccess(result, 'Could not load activity log creators.')

  ;((result.data ?? []) as Systemusers[]).forEach((user) => {
    const userId = normalizeId(user.systemuserid)
    if (userId) {
      namesById[userId] = user.fullname || user.internalemailaddress || 'User'
    }
  })

  return namesById
}

function mapLogRow(log: Dga_aop_project_logses, userNamesById: Record<string, string>): ActivityLogRow {
  const creatorId = normalizeId(log._createdby_value)
  const typeCode = log.dga_type ?? null

  return {
    createdBy: creatorId ? userNamesById[creatorId] || 'User' : '—',
    createdOn: log.createdon ? formatDate(log.createdon.split('T')[0]) : '—',
    id: log.dga_aop_project_logsid,
    name: log.dga_name || '—',
    newValue: log.dga_new_value || '—',
    oldValue: log.dga_previous_value || '—',
    type: mapLogTypeLabel(typeCode),
    typeCode,
  }
}

export function LogTab({ isExecutionPhase, projectId }: LogTabProps) {
  const [logs, setLogs] = useState<ActivityLogRow[]>([])
  const [activeView, setActiveView] = useState<LogView>('approval')
  const [reportingTypeFilter, setReportingTypeFilter] = useState<ReportingTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadLogs() {
    const normalizedProjectId = normalizeId(projectId)
    if (!normalizedProjectId) {
      setLogs([])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await Dga_aop_project_logsesService.getAll({
        filter: `_dga_aop_project_value eq '${escapeODataValue(normalizedProjectId)}'`,
        orderBy: ['createdon desc'],
        select: [
          'createdon',
          '_createdby_value',
          'dga_aop_project_logsid',
          'dga_name',
          'dga_new_value',
          'dga_previous_value',
          'dga_type',
        ],
      })
      assertOperationSuccess(result, 'Could not load activity logs.')
      const logRows = (result.data ?? []) as Dga_aop_project_logses[]
      const userNamesById = await loadUserNames(logRows.map((log) => log._createdby_value ?? ''))
      setLogs(logRows.map((log) => mapLogRow(log, userNamesById)))
    } catch (err) {
      console.error('Failed to load activity logs:', err)
      setLogs([])
      setError(err instanceof Error ? err.message : 'Could not load activity logs.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadLogs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const effectiveView: LogView = isExecutionPhase ? activeView : 'approval'

  const activeTabLogs = useMemo(() => {
    if (effectiveView === 'approval') {
      return logs.filter((log) => log.typeCode === APPROVAL_LOG_TYPE)
    }

    return logs.filter((log) => {
      if (!log.typeCode || !REPORTING_LOG_TYPES.has(log.typeCode)) return false
      if (reportingTypeFilter === 'all') return true
      return String(log.typeCode) === reportingTypeFilter
    })
  }, [effectiveView, logs, reportingTypeFilter])

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return activeTabLogs

    return activeTabLogs.filter((log) => [
      log.createdBy,
      log.createdOn,
      log.name,
      log.newValue,
      log.oldValue,
      log.type,
    ].some((value) => value.toLowerCase().includes(query)))
  }, [activeTabLogs, searchQuery])

  const approvalCount = useMemo(() => logs.filter((log) => log.typeCode === APPROVAL_LOG_TYPE).length, [logs])
  const reportingCount = useMemo(() => logs.filter((log) => log.typeCode && REPORTING_LOG_TYPES.has(log.typeCode)).length, [logs])
  const reportingTypeCounts = useMemo(() => {
    return logs.reduce<Record<ReportingTypeFilter, number>>((counts, log) => {
      if (log.typeCode && REPORTING_LOG_TYPES.has(log.typeCode)) {
        counts.all += 1
        const typeKey = String(log.typeCode) as ReportingTypeFilter
        counts[typeKey] += 1
      }

      return counts
    }, {
      '776140000': 0,
      '776140001': 0,
      '776140002': 0,
      '776140003': 0,
      all: 0,
    })
  }, [logs])
  const filteredCount = filteredLogs.length
  const totalPages = Math.max(1, Math.ceil(filteredCount / LOG_ITEMS_PER_PAGE))
  const visibleLogs = useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * LOG_ITEMS_PER_PAGE, currentPage * LOG_ITEMS_PER_PAGE)
  }, [filteredLogs, currentPage])
  const showPagination = filteredCount > LOG_ITEMS_PER_PAGE
  const rangeStart = filteredCount > 0 ? (currentPage - 1) * LOG_ITEMS_PER_PAGE + 1 : 0
  const rangeEnd = Math.min(currentPage * LOG_ITEMS_PER_PAGE, filteredCount)
  const emptyTitle = effectiveView === 'approval' ? 'No approval logs found' : 'No reporting logs found'
  const emptyDescription = searchQuery
    ? 'Try adjusting your search criteria.'
    : effectiveView === 'approval'
      ? 'Approval workflow logs will appear here after activity workflow actions.'
      : 'Reporting logs will appear here after execution field updates.'

  function switchView(nextView: LogView) {
    setActiveView(nextView)
    setCurrentPage(1)
  }

  return (
    <div className="edit-activity__logs">
      <div className="edit-activity__members-header">
        <div className="edit-activity__members-header-text">
          <h2>
            Activity Logs
            <span className="edit-activity__members-count-badge">{filteredCount} Records</span>
          </h2>
          <p>Activity history and reporting updates for this activity</p>
        </div>
        <Button icon={<RefreshCw size={15} />} onClick={() => void loadLogs()} type="button" variant="secondary">
          Refresh
        </Button>
      </div>

      {isExecutionPhase ? (
        <div className="edit-activity__logs-tabs" role="tablist" aria-label="Activity log categories">
          <button
            aria-selected={activeView === 'approval'}
            className={`edit-activity__logs-tab${activeView === 'approval' ? ' edit-activity__logs-tab--active' : ''}`}
            onClick={() => switchView('approval')}
            role="tab"
            type="button"
          >
            Approval Logs
            <span>{approvalCount}</span>
          </button>
          <button
            aria-selected={activeView === 'reporting'}
            className={`edit-activity__logs-tab${activeView === 'reporting' ? ' edit-activity__logs-tab--active' : ''}`}
            onClick={() => switchView('reporting')}
            role="tab"
            type="button"
          >
            Reporting Logs
            <span>{reportingCount}</span>
          </button>
        </div>
      ) : null}

      <div className="edit-activity__members-toolbar">
        <div className="edit-activity__members-search">
          <Search size={15} />
          <input
            className="edit-activity__members-search-input"
            placeholder={effectiveView === 'approval' ? 'Search approval logs...' : 'Search reporting logs...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
          />
          {searchQuery ? (
            <button
              aria-label="Clear search"
              className="edit-activity__members-search-clear"
              onClick={() => {
                setSearchQuery('')
                setCurrentPage(1)
              }}
              type="button"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        {isExecutionPhase && activeView === 'reporting' ? (
          <div className="edit-activity__logs-type-filters" aria-label="Reporting log type filters">
            {REPORTING_TYPE_OPTIONS.map((option) => (
              <button
                className={`edit-activity__logs-type-filter${reportingTypeFilter === option.value ? ' edit-activity__logs-type-filter--active' : ''}`}
                key={option.value}
                onClick={() => {
                  setReportingTypeFilter(option.value)
                  setCurrentPage(1)
                }}
                type="button"
              >
                {option.label}
                <span>{reportingTypeCounts[option.value]}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="edit-activity__members-error">{error}</div>
      ) : null}

      {isLoading ? (
        <div className="data-grid edit-activity__logs-grid">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Created On</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, index) => (
                <tr key={`activity-log-skeleton-${index}`}>
                  <td colSpan={6}>
                    <span className="edit-activity__logs-loading-row" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : visibleLogs.length > 0 ? (
        <div className="data-grid edit-activity__logs-grid">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Created On</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map((log) => (
                <tr key={log.id}>
                  <td className="edit-activity__logs-cell-name">{log.name}</td>
                  <td>
                    <Badge tone={getLogTypeTone(log.typeCode)}>{log.type}</Badge>
                  </td>
                  <td className="edit-activity__logs-cell-value">{log.oldValue}</td>
                  <td className="edit-activity__logs-cell-value">{log.newValue}</td>
                  <td className="edit-activity__logs-cell-date">{log.createdOn}</td>
                  <td className="edit-activity__logs-cell-user">{log.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="edit-activity__members-empty">
          <History size={40} strokeWidth={1.2} />
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
        </div>
      )}

      {showPagination ? (
        <div className="edit-activity__members-pagination">
          <span className="edit-activity__members-pagination-info">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{filteredCount}</strong> log{filteredCount !== 1 ? 's' : ''}
          </span>
          <div className="edit-activity__members-pagination-controls">
            <button
              aria-label="Previous page"
              className="edit-activity__members-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="edit-activity__members-page-numbers">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1
                return (
                  <button
                    className={`edit-activity__members-page-num${page === currentPage ? ' edit-activity__members-page-num--active' : ''}`}
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            <button
              aria-label="Next page"
              className="edit-activity__members-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              type="button"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
