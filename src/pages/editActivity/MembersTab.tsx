import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Mail,
  Rows,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { Button, ConfirmationDialog, Modal, SearchInput } from '../../components/ui'
import type { Dga_aop_projects_systemuserset } from '../../generated/models/Dga_aop_projects_systemusersetModel'
import type { Systemusers } from '../../generated/models/SystemusersModel'
import { SystemusersService } from '../../generated/services/SystemusersService'
import { Dga_aop_projects_systemusersetService } from '../../generated/services/Dga_aop_projects_systemusersetService'

// ── Types ──

type MemberFilter = 'all' | 'division' | 'non-division'

type MockUser = {
  avatarUrl: string | null
  email: string
  id: string
  isDivisionMember: boolean
  name: string
}

type ActivityMember = MockUser & {
  addedAt: string
  associationId: string
}

// ── Mock data removed — ready for dynamic implementation ──

const ITEMS_PER_PAGE = 12
const LAZY_BATCH = 12
const ACTIVITY_MEMBER_API_URL = 'https://orgb0eb9d4d.crm6.dynamics.com/api/data/v9.2/dga_WebApiForPortal'
const ACTIVITY_MEMBER_TARGET_TABLE = 'dga_aop_projects'
const ACTIVITY_MEMBER_RELATED_TABLE = 'systemuser'
const ACTIVITY_MEMBER_RELATIONSHIP = 'dga_aop_projects_systemuser_systemuser'

type MembersTabProps = {
  projectId: string
}

type ActivityMemberApiAction = 'associate' | 'disassociate'

type ActivityMemberApiResponse = {
  error?: { message?: string }
  message?: string
  success?: boolean
}

function getCustomApiToken() {
  const envToken = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_DGA_CUSTOM_API_TOKEN
  return envToken
    ?? window.localStorage.getItem('DGA_CUSTOM_API_TOKEN')
    ?? window.localStorage.getItem('API_TOKEN')
    ?? window.sessionStorage.getItem('DGA_CUSTOM_API_TOKEN')
    ?? window.sessionStorage.getItem('API_TOKEN')
    ?? ''
}

async function callActivityMemberApi(actionName: ActivityMemberApiAction, projectId: string, userId: string) {
  const token = getCustomApiToken()

  if (!token) {
    throw new Error('Custom API token is missing. Set VITE_DGA_CUSTOM_API_TOKEN or store API_TOKEN in browser storage.')
  }

  const response = await fetch(ACTIVITY_MEMBER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      actionName,
      isAdmin: true,
      userId: '',
      targetTableName: ACTIVITY_MEMBER_TARGET_TABLE,
      relatedTableName: ACTIVITY_MEMBER_RELATED_TABLE,
      targetId: projectId.replace(/[{}]/g, ''),
      relatedId: userId.replace(/[{}]/g, ''),
      relationship: ACTIVITY_MEMBER_RELATIONSHIP,
    }),
  })

  const result = await response.json().catch(() => ({} as ActivityMemberApiResponse)) as ActivityMemberApiResponse

  if (!response.ok || result.success === false) {
    throw new Error(result.error?.message ?? result.message ?? `Failed to ${actionName} activity member.`)
  }

  return result
}

function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
  const error = (result as { error?: { message?: string } | string })?.error
  const message = typeof error === 'string' ? error : error?.message

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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function isDivisionUser(user: Systemusers) {
  const text = [
    user.businessunitidname,
    user.jobtitle,
    user.title,
  ].filter(Boolean).join(' ').toLowerCase()

  return text.includes('division')
}

function mapSystemUserToMember(user: Systemusers): MockUser | null {
  if (!user.systemuserid) return null

  const email = user.internalemailaddress ?? user.domainname ?? ''
  const name = user.fullname ?? email ?? user.domainname ?? 'Unnamed User'

  return {
    avatarUrl: null,
    email,
    id: user.systemuserid,
    isDivisionMember: isDivisionUser(user),
    name,
  }
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function getProjectMemberFilter(projectId: string) {
  return `dga_aop_projectsid eq '${projectId.replace(/[{}]/g, '')}'`
}

function mapAssociationsToMembers(
  associations: Dga_aop_projects_systemuserset[],
  users: MockUser[],
): ActivityMember[] {
  const userById = new Map(users.map((user) => [normalizeId(user.id), user]))

  return associations
    .filter((association) => association.dga_aop_projects_systemuserid && association.systemuserid)
    .map((association) => {
      const user = userById.get(normalizeId(association.systemuserid))

      return {
        avatarUrl: user?.avatarUrl ?? null,
        email: user?.email ?? '',
        id: association.systemuserid,
        isDivisionMember: user?.isDivisionMember ?? false,
        name: user?.name ?? `User ${association.systemuserid}`,
        addedAt: '',
        associationId: association.dga_aop_projects_systemuserid,
      }
    })
}

// ── Component ──

export function MembersTab({ projectId }: MembersTabProps) {
  const [availableUsers, setAvailableUsers] = useState<MockUser[]>([])
  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [members, setMembers] = useState<ActivityMember[]>([])
  const [isMembersLoading, setIsMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState('')
  const [membersNotice, setMembersNotice] = useState('')
  const [memberToDelete, setMemberToDelete] = useState<ActivityMember | null>(null)
  const [isSavingMembers, setIsSavingMembers] = useState(false)
  const [isRemovingMember, setIsRemovingMember] = useState(false)
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false)
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  const [memberSelectionError, setMemberSelectionError] = useState('')

  const [memberListSearch, setMemberListSearch] = useState('')
  const [memberViewMode, setMemberViewMode] = useState<'pagination' | 'lazy'>('pagination')
  const [currentPage, setCurrentPage] = useState(1)
  const [lazyVisibleCount, setLazyVisibleCount] = useState(12)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMembersContext = useCallback(async () => {
    if (!projectId) {
      setUsersError('')
      setMembersError('Activity id is missing from the edit URL.')
      setAvailableUsers([])
      setMembers([])
      return
    }

    setIsUsersLoading(true)
    setIsMembersLoading(true)
    setUsersError('')
    setMembersError('')
    setMembersNotice('')

    try {
      const [usersResult, associationsResult] = await Promise.all([
        SystemusersService.getAll({
          select: [
            'systemuserid',
            'fullname',
            'internalemailaddress',
            'domainname',
            'jobtitle',
            'title',
            'isdisabled',
          ],
          orderBy: ['fullname asc'],
        }),
        Dga_aop_projects_systemusersetService.getAll(
          {
          select: [
            'dga_aop_projects_systemuserid',
            'dga_aop_projectsid',
            'systemuserid',
          ],
          filter: getProjectMemberFilter(projectId),
        }
      ),
      ])

      assertOperationSuccess(usersResult, 'Unable to load users.')
      assertOperationSuccess(associationsResult, 'Unable to load associated activity members.')

      const users = (usersResult.data ?? [])
        .map((user) => mapSystemUserToMember(user as Systemusers))
        .filter((user): user is MockUser => Boolean(user))
      const associations = (associationsResult.data ?? []) as Dga_aop_projects_systemuserset[]

      setAvailableUsers(users)
      setMembers(mapAssociationsToMembers(associations, users))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load associated activity members.'
      setUsersError(message)
      setMembersError(message)
      setAvailableUsers([])
      setMembers([])
    } finally {
      setIsUsersLoading(false)
      setIsMembersLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMembersContext()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadMembersContext])

  // ── Computed ──

  const filteredMembers = useMemo(() => {
    if (!memberListSearch.trim()) return members
    const q = memberListSearch.toLowerCase()
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
  }, [members, memberListSearch])

  useEffect(() => {
    if (memberViewMode !== 'lazy') return undefined
    const sentinel = sentinelRef.current
    if (!sentinel) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLazyVisibleCount((prev) => {
            const next = prev + LAZY_BATCH
            return next >= filteredMembers.length ? filteredMembers.length : next
          })
        }
      },
      { rootMargin: '100px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [memberViewMode, filteredMembers.length])

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE))

  const visibleMembers = useMemo(() => {
    if (memberViewMode === 'pagination') {
      return filteredMembers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    }
    return filteredMembers.slice(0, lazyVisibleCount)
  }, [filteredMembers, memberViewMode, currentPage, lazyVisibleCount])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1)
      setLazyVisibleCount(12)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [memberListSearch, members.length])

  // ── Handlers ──

  const handleOpenAddMembersModal = useCallback(() => {
    setSelectedMemberIds(new Set())
    setMemberFilter('all')
    setMemberSearchQuery('')
    setMemberSelectionError('')
    setMembersNotice('')
    setIsAddMembersModalOpen(true)
  }, [])

  const handleCloseAddMembersModal = useCallback(() => {
    setSelectedMemberIds(new Set())
    setMemberFilter('all')
    setMemberSearchQuery('')
    setMemberSelectionError('')
    setIsAddMembersModalOpen(false)
  }, [])

  const handleAddSelectedMembers = useCallback(async () => {
    if (isSavingMembers) return

    if (!projectId) {
      setMemberSelectionError('Activity id is missing from the edit URL.')
      return
    }

    if (selectedMemberIds.size === 0) {
      setMemberSelectionError('Please select at least one user to add.')
      return
    }

    const existingIds = new Set(members.map((member) => normalizeId(member.id)))
    const selectedUserIds = Array.from(selectedMemberIds)
      .map((userId) => userId.replace(/[{}]/g, ''))
      .filter((userId) => !existingIds.has(normalizeId(userId)))

    if (selectedUserIds.length === 0) {
      setMemberSelectionError('Selected users are already added to this activity.')
      return
    }

    setIsSavingMembers(true)
    setMemberSelectionError('')
    setMembersNotice('')

    const results = await Promise.allSettled(
      selectedUserIds.map((userId) =>
        callActivityMemberApi('associate', projectId, userId),
      ),
    )

    const failures = results.filter((result) => {
      if (result.status === 'rejected') return true
      return result.value.success === false
    })

    setIsSavingMembers(false)

    if (failures.length > 0) {
      const firstFailure = failures[0]
      const message = firstFailure.status === 'rejected'
        ? firstFailure.reason instanceof Error ? firstFailure.reason.message : 'Unable to add one or more members.'
        : getOperationErrorMessage(firstFailure.value, 'Unable to add one or more members.')
      const successCount = selectedUserIds.length - failures.length

      setMemberSelectionError(`${successCount} of ${selectedUserIds.length} member${selectedUserIds.length !== 1 ? 's' : ''} added. ${message}`)
      return
    }

    await loadMembersContext()
    setSelectedMemberIds(new Set())
    setMemberSelectionError('')
    setMembersNotice(`${selectedUserIds.length} member${selectedUserIds.length !== 1 ? 's' : ''} added successfully.`)
    setIsAddMembersModalOpen(false)
  }, [isSavingMembers, loadMembersContext, members, projectId, selectedMemberIds])

  const handleRemoveMember = useCallback((member: ActivityMember) => {
    setMemberToDelete(member)
  }, [])

  const handleConfirmDeleteMember = useCallback(async () => {
    if (!memberToDelete) return
    if (isRemovingMember) return

    if (!projectId) {
      setMembersError('Activity id is missing from the edit URL.')
      return
    }

    setIsRemovingMember(true)
    setMembersError('')
    setMembersNotice('')

    try {
      await callActivityMemberApi('disassociate', projectId, memberToDelete.id)
      await loadMembersContext()
      setMemberToDelete(null)
      setMembersNotice('Member removed successfully.')
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : 'Unable to remove member.')
    } finally {
      setIsRemovingMember(false)
    }
  }, [isRemovingMember, loadMembersContext, memberToDelete, projectId])

  const handleCancelDeleteMember = useCallback(() => {
    setMemberToDelete(null)
  }, [])

  const handleToggleUserSelection = useCallback((userId: string) => {
    setMemberSelectionError('')
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }, [])

  // ── Computed for add-modal ──

  const filteredUsers = useMemo(() => {
    const existingIds = new Set(members.map((m) => m.id))
    const notAddedUsers = availableUsers.filter((u) => !existingIds.has(u.id))

    return notAddedUsers.filter((user) => {
      if (memberFilter === 'division' && !user.isDivisionMember) return false
      if (memberFilter === 'non-division' && user.isDivisionMember) return false
      if (memberSearchQuery.trim()) {
        const q = memberSearchQuery.toLowerCase()
        if (!user.name.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [availableUsers, members, memberFilter, memberSearchQuery])

  const memberCount = members.length
  const filteredCount = filteredMembers.length
  const hasFilter = memberListSearch.trim().length > 0
  const showingText = hasFilter
    ? `${filteredCount} of ${memberCount} Member${memberCount !== 1 ? 's' : ''}`
    : `${memberCount} Member${memberCount !== 1 ? 's' : ''}`
  const showPagination = memberViewMode === 'pagination' && filteredCount > ITEMS_PER_PAGE
  const showLoadMore = memberViewMode === 'lazy' && lazyVisibleCount < filteredCount
  const rangeStart = filteredCount > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredCount)

  // ── Add Members Modal ──

  function renderAddMembersModal() {
    const selectedCount = selectedMemberIds.size
    const hasSelection = selectedCount > 0
    const selectedUsers = hasSelection
      ? availableUsers.filter((u) => selectedMemberIds.has(u.id))
      : []

    return (
      <div className="edit-activity__members-modal-wrapper">
        <Modal
          actions={
            <div className="edit-activity__members-modal-actions">
              <Button onClick={handleCloseAddMembersModal} variant="secondary">
                Cancel
              </Button>
              <Button disabled={isUsersLoading || isSavingMembers || Boolean(usersError)} icon={<UserCheck size={16} />} onClick={handleAddSelectedMembers}>
                {isSavingMembers ? 'Adding...' : 'Add Selected Members'}
              </Button>
            </div>
          }
          isOpen={isAddMembersModalOpen}
          onClose={handleCloseAddMembersModal}
          title="Add Activity Members"
        >
          <div className="edit-activity__members-modal">
            {/* Filter tabs */}
            <div className="edit-activity__members-modal-filters">
              {([
                { label: 'All Users', value: 'all' as const },
                { label: 'Division Users', value: 'division' as const },
                { label: 'Non-Division Users', value: 'non-division' as const },
              ]).map((filter) => {
                const filterModClass = filter.value === 'division' ? 'edit-activity__members-modal-filter--division'
                  : filter.value === 'non-division' ? 'edit-activity__members-modal-filter--external'
                    : ''
                return (
                  <button
                    key={filter.value}
                    className={`edit-activity__members-modal-filter ${memberFilter === filter.value ? 'edit-activity__members-modal-filter--active' : ''} ${filterModClass}`}
                    onClick={() => setMemberFilter(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <div className="edit-activity__members-modal-search">
              <SearchInput
                label="Search users"
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                value={memberSearchQuery}
              />
            </div>

            {/* Error message */}
            {usersError ? (
              <div className="edit-activity__members-modal-error">
                <AlertCircle size={13} />
                {usersError}
              </div>
            ) : memberSelectionError ? (
              <div className="edit-activity__members-modal-error">
                <AlertCircle size={13} />
                {memberSelectionError}
              </div>
            ) : null}

            {/* Users list */}
            <div className="edit-activity__members-modal-list">
              {isUsersLoading ? (
                <div className="edit-activity__members-modal-empty">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="edit-activity__members-modal-empty">
                  {memberSearchQuery ? 'No users match your search.' : 'All users are already added to this activity.'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <label className="edit-activity__members-modal-user" key={user.id}>
                    <div className="edit-activity__members-modal-user-avatar">
                      {user.avatarUrl ? (
                        <img alt={user.name} src={user.avatarUrl} />
                      ) : (
                        <span>{getInitials(user.name)}</span>
                      )}
                    </div>
                    <div className="edit-activity__members-modal-user-info">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <div className="edit-activity__members-modal-user-badge">
                      <span className={`edit-activity__member-card-badge ${user.isDivisionMember ? 'edit-activity__member-card-badge--division' : 'edit-activity__member-card-badge--external'}`}>
                        {user.isDivisionMember ? 'Division' : 'External'}
                      </span>
                    </div>
                    <div className={`edit-activity__members-modal-user-check ${selectedMemberIds.has(user.id) ? 'edit-activity__members-modal-user-check--checked' : ''}`}>
                      {selectedMemberIds.has(user.id) ? <Check size={14} strokeWidth={3} /> : null}
                    </div>
                    <input
                      checked={selectedMemberIds.has(user.id)}
                      className="edit-activity__members-modal-user-input"
                      onChange={() => handleToggleUserSelection(user.id)}
                      type="checkbox"
                    />
                  </label>
                ))
              )}
            </div>

            {/* Selected summary */}
            {hasSelection ? (
              <div className="edit-activity__members-modal-selected">
                <div className="edit-activity__members-modal-selected-header">
                  <UserCheck size={14} />
                  <span>{selectedCount} user{selectedCount > 1 ? 's' : ''} selected</span>
                </div>
                <div className="edit-activity__members-modal-selected-tags">
                  {selectedUsers.slice(0, 5).map((user) => (
                    <button
                      className={`edit-activity__members-modal-selected-tag ${user.isDivisionMember ? 'edit-activity__members-modal-selected-tag--division' : 'edit-activity__members-modal-selected-tag--external'}`}
                      key={user.id}
                      onClick={() => handleToggleUserSelection(user.id)}
                      type="button"
                    >
                      {user.name}
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  ))}
                  {selectedCount > 5 ? (
                    <span className="edit-activity__members-modal-selected-more">+{selectedCount - 5} more</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      </div>
    )
  }

  // ── Render ──

  return (
    <div className="edit-activity__members">
      {/* Header bar */}
      <div className="edit-activity__members-header">
        <div className="edit-activity__members-header-text">
          <h2>
            Activity Members
            <span className="edit-activity__members-count-badge">{showingText}</span>
          </h2>
          <p>Manage users assigned to this activity.</p>
        </div>
        <Button disabled={!projectId || isMembersLoading} icon={<UserPlus size={16} />} onClick={handleOpenAddMembersModal}>
          Add Members
        </Button>
      </div>

      {membersError ? (
        <div className="edit-activity__members-modal-error">
          <AlertCircle size={13} />
          {membersError}
        </div>
      ) : membersNotice ? (
        <div className="edit-activity__members-modal-selected-header">
          <Check size={14} />
          <span>{membersNotice}</span>
        </div>
      ) : null}

      {/* Toolbar: search + view toggle */}
      {memberCount > 0 ? (
        <div className="edit-activity__members-toolbar">
          <div className="edit-activity__members-search">
            <Search size={15} />
            <input
              className="edit-activity__members-search-input"
              onChange={(e) => setMemberListSearch(e.target.value)}
              placeholder="Search members by name or email..."
              type="text"
              value={memberListSearch}
            />
            {memberListSearch ? (
              <button
                className="edit-activity__members-search-clear"
                onClick={() => setMemberListSearch('')}
                type="button"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <div className="edit-activity__members-view-toggle" role="group" aria-label="View mode">
            <button
              className={`edit-activity__members-view-btn${memberViewMode === 'pagination' ? ' edit-activity__members-view-btn--active' : ''}`}
              onClick={() => { setMemberViewMode('pagination'); setCurrentPage(1) }}
              title="Paginated view"
              type="button"
            >
              <LayoutList size={14} />
              <span>Pages</span>
            </button>
            <button
              className={`edit-activity__members-view-btn${memberViewMode === 'lazy' ? ' edit-activity__members-view-btn--active' : ''}`}
              onClick={() => { setMemberViewMode('lazy'); setLazyVisibleCount(12) }}
              title="Scroll-to-load view"
              type="button"
            >
              <Rows size={14} />
              <span>Scroll</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Cards grid */}
      {isMembersLoading ? (
        <div className="edit-activity__members-empty">
          <UsersRound size={40} strokeWidth={1.2} />
          <h3>Loading members...</h3>
          <p>Fetching users assigned to this activity.</p>
        </div>
      ) : filteredCount === 0 ? (
        <div className="edit-activity__members-empty">
          {hasFilter ? (
            <>
              <Search size={36} strokeWidth={1.2} />
              <h3>No members match your search</h3>
              <p>Try a different name or email.</p>
            </>
          ) : (
            <>
              <UsersRound size={40} strokeWidth={1.2} />
              <h3>No members assigned</h3>
              <p>Click <strong>Add Members</strong> to assign users to this activity.</p>
            </>
          )}
        </div>
      ) : (
        <div className="edit-activity__members-grid">
          {visibleMembers.map((member) => (
            <div className="edit-activity__member-card" key={member.id}>
              <div className="edit-activity__member-card-avatar">
                {member.avatarUrl ? (
                  <img alt={member.name} src={member.avatarUrl} />
                ) : (
                  <span>{getInitials(member.name)}</span>
                )}
              </div>
              <div className="edit-activity__member-card-info">
                <strong>{member.name}</strong>
                <span className="edit-activity__member-card-email">
                  <Mail size={12} />
                  {member.email}
                </span>
              </div>
              <div className="edit-activity__member-card-meta">
                <span className={`edit-activity__member-card-badge ${member.isDivisionMember ? 'edit-activity__member-card-badge--division' : 'edit-activity__member-card-badge--external'}`}>
                  {member.isDivisionMember ? 'Division Member' : 'Non-Division Member'}
                </span>
              </div>
              <button
                aria-label={`Remove ${member.name}`}
                className="edit-activity__member-card-remove"
                onClick={() => handleRemoveMember(member)}
                title="Remove member"
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {showPagination ? (
        <div className="edit-activity__members-pagination">
          <span className="edit-activity__members-pagination-info">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{filteredCount}</strong> member{filteredCount !== 1 ? 's' : ''}
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

      {/* Load More (lazy mode — auto-triggered on scroll) */}
      {showLoadMore ? (
        <div className="edit-activity__members-sentinel" ref={sentinelRef} aria-hidden="true">
          <span className="edit-activity__members-sentinel-dot" />
          <span className="edit-activity__members-sentinel-dot" />
          <span className="edit-activity__members-sentinel-dot" />
        </div>
      ) : memberViewMode === 'lazy' && filteredCount > 0 ? (
        <div className="edit-activity__members-sentinel--done" aria-hidden="true">
          <Check size={13} />
          <span>All {filteredCount} member{filteredCount !== 1 ? 's' : ''} loaded</span>
        </div>
      ) : null}

      {/* Add Members Modal */}
      {renderAddMembersModal()}

      {/* Confirm Delete Member */}
      <ConfirmationDialog
        confirmLabel={isRemovingMember ? 'Removing...' : 'Remove Member'}
        danger
        description="This member will be removed from this activity. This action cannot be undone."
        isOpen={memberToDelete !== null}
        onCancel={handleCancelDeleteMember}
        onConfirm={handleConfirmDeleteMember}
        title={memberToDelete ? `Are you sure you want to remove ${memberToDelete.name}?` : ''}
      />
    </div>
  )
}
