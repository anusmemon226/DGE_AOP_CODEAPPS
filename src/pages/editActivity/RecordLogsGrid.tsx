import { useEffect, useState } from 'react'
import { History, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui'
import type {
  Dga_aop_project_logses,
  Dga_aop_project_logsesdga_type,
} from '../../generated/models/Dga_aop_project_logsesModel'
import type { Systemusers } from '../../generated/models/SystemusersModel'
import { Dga_aop_project_logsesService } from '../../generated/services/Dga_aop_project_logsesService'
import { SystemusersService } from '../../generated/services/SystemusersService'
import { formatDate } from './helpers/sharedHelpers'

type RecordLogRow = {
  createdBy: string
  createdOn: string
  id: string
  name: string
  newValue: string
  oldValue: string
}

type RecordLogsGridProps = {
  emptyMessage: string
  logType: Dga_aop_project_logsesdga_type
  projectId: string
  recordId: string
  recordName: string
  variant?: 'default' | 'compact'
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function escapeODataValue(value: string) {
  return value.replace(/'/g, "''")
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
  assertOperationSuccess(result, 'Could not load log creators.')

  ;((result.data ?? []) as Systemusers[]).forEach((user) => {
    const userId = normalizeId(user.systemuserid)
    if (userId) {
      namesById[userId] = user.fullname || user.internalemailaddress || 'User'
    }
  })

  return namesById
}

function mapLogRow(log: Dga_aop_project_logses, userNamesById: Record<string, string>): RecordLogRow {
  const creatorId = normalizeId(log._createdby_value)

  return {
    createdBy: creatorId ? userNamesById[creatorId] || 'User' : '—',
    createdOn: log.createdon ? formatDate(log.createdon.split('T')[0]) : '—',
    id: log.dga_aop_project_logsid,
    name: log.dga_name || '—',
    newValue: log.dga_new_value || '—',
    oldValue: log.dga_previous_value || '—',
  }
}

export function RecordLogsGrid({
  emptyMessage,
  logType,
  projectId,
  recordId,
  recordName,
  variant = 'default',
}: RecordLogsGridProps) {
  const [logs, setLogs] = useState<RecordLogRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadLogs() {
    const normalizedProjectId = normalizeId(projectId)
    const normalizedRecordId = normalizeId(recordId)
    const lookupFilter = logType === 776140000
      ? `_dga_milestone_value eq '${escapeODataValue(normalizedRecordId)}'`
      : logType === 776140003
        ? `_dga_procurement_value eq '${escapeODataValue(normalizedRecordId)}'`
        : ''

    if (!normalizedProjectId || !normalizedRecordId || !lookupFilter) {
      setLogs([])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await Dga_aop_project_logsesService.getAll({
        filter: `_dga_aop_project_value eq '${escapeODataValue(normalizedProjectId)}' and dga_type eq ${logType} and ${lookupFilter}`,
        orderBy: ['createdon desc'],
        select: [
          'createdon',
          '_createdby_value',
          'dga_aop_project_logsid',
          'dga_name',
          '_dga_milestone_value',
          'dga_new_value',
          'dga_previous_value',
          '_dga_procurement_value',
          'dga_type',
        ],
      })
      assertOperationSuccess(result, 'Could not load record logs.')

      const logRows = (result.data ?? []) as Dga_aop_project_logses[]
      const userNamesById = await loadUserNames(logRows.map((log) => log._createdby_value ?? ''))
      setLogs(logRows.map((log) => mapLogRow(log, userNamesById)))
    } catch (err) {
      console.error('Failed to load record logs:', err)
      setLogs([])
      setError(err instanceof Error ? err.message : 'Could not load record logs.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadLogs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, logType, recordId, recordName])

  if (variant === 'compact') {
    return (
      <div className="edit-activity__record-logs edit-activity__record-logs--compact">
        <div className="edit-activity__record-logs-tabs-action">
          <button
            aria-label="Refresh logs"
            className="edit-activity__record-logs-refresh"
            disabled={isLoading}
            onClick={() => void loadLogs()}
            type="button"
          >
            <RefreshCw className={isLoading ? 'edit-activity__record-logs-refresh-icon--loading' : undefined} size={14} />
          </button>
        </div>

        {error ? <div className="edit-activity__members-error">{error}</div> : null}

        {isLoading ? (
          <div className="edit-activity__record-logs-grid edit-activity__record-logs-grid--compact">
            <div className="edit-activity__record-logs-row edit-activity__record-logs-row--header">
              <div className="edit-activity__record-logs-cell">Name</div>
              <div className="edit-activity__record-logs-cell">Old Value</div>
              <div className="edit-activity__record-logs-cell">New Value</div>
              <div className="edit-activity__record-logs-cell">Created On</div>
              <div className="edit-activity__record-logs-cell">Created By</div>
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="edit-activity__record-logs-row" key={`record-log-compact-skeleton-${index}`}>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--skeleton" data-label="Name">
                  <span className="edit-activity__logs-loading-row" />
                </div>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--skeleton" data-label="Old Value">
                  <span className="edit-activity__logs-loading-row" />
                </div>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--skeleton" data-label="New Value">
                  <span className="edit-activity__logs-loading-row" />
                </div>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--skeleton" data-label="Created On">
                  <span className="edit-activity__logs-loading-row" />
                </div>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--skeleton" data-label="Created By">
                  <span className="edit-activity__logs-loading-row" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length > 0 ? (
          <div className="edit-activity__record-logs-grid edit-activity__record-logs-grid--compact">
            <div className="edit-activity__record-logs-row edit-activity__record-logs-row--header">
              <div className="edit-activity__record-logs-cell">Name</div>
              <div className="edit-activity__record-logs-cell">Old Value</div>
              <div className="edit-activity__record-logs-cell">New Value</div>
              <div className="edit-activity__record-logs-cell">Created On</div>
              <div className="edit-activity__record-logs-cell">Created By</div>
            </div>
            {logs.map((log) => (
              <div className="edit-activity__record-logs-row" key={log.id}>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--name" data-label="Name" title={log.name}>{log.name}</div>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--value" data-label="Old Value" title={log.oldValue}>{log.oldValue}</div>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--value" data-label="New Value" title={log.newValue}>{log.newValue}</div>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--date" data-label="Created On">{log.createdOn}</div>
                <div className="edit-activity__record-logs-cell edit-activity__record-logs-cell--user" data-label="Created By" title={log.createdBy}>{log.createdBy}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="edit-activity__members-empty edit-activity__record-logs-empty edit-activity__record-logs-empty--compact">
            <History size={28} strokeWidth={1.4} />
            <h3>No logs found</h3>
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="edit-activity__record-logs">
      <div className="edit-activity__record-logs-header">
        <div>
          <h3>Record Logs</h3>
          <p>Execution reporting history for this record.</p>
        </div>
        <Button icon={<RefreshCw size={14} />} onClick={() => void loadLogs()} type="button" variant="secondary">
          Refresh
        </Button>
      </div>

      {error ? <div className="edit-activity__members-error">{error}</div> : null}

      {isLoading ? (
        <div className="data-grid edit-activity__logs-grid edit-activity__record-logs-grid">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Created On</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, index) => (
                <tr key={`record-log-skeleton-${index}`}>
                  <td colSpan={5}>
                    <span className="edit-activity__logs-loading-row" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : logs.length > 0 ? (
        <div className="data-grid edit-activity__logs-grid edit-activity__record-logs-grid">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Created On</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="edit-activity__logs-cell-name">{log.name}</td>
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
        <div className="edit-activity__members-empty edit-activity__record-logs-empty">
          <History size={36} strokeWidth={1.2} />
          <h3>No logs found</h3>
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}
