import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { getContext } from '@microsoft/power-apps/app'
import { Dga_divisional_hierarchiesService } from '../generated/services/Dga_divisional_hierarchiesService'
import { RolesService } from '../generated/services/RolesService'
import { SystemuserrolescollectionService } from '../generated/services/SystemuserrolescollectionService'
import { SystemusersService } from '../generated/services/SystemusersService'
import { TeammembershipsService } from '../generated/services/TeammembershipsService'
import { TeamrolescollectionService } from '../generated/services/TeamrolescollectionService'
import type { Dga_divisional_hierarchies } from '../generated/models/Dga_divisional_hierarchiesModel'
import type { Roles } from '../generated/models/RolesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import type { IGetAllOptions } from '../generated/models/CommonModels'
import { getAopRoleLabel, isAopRole } from '../constants/rolesMapping'

// ── Types ──

export type UserRole = {
  roleId: string
  teamId: string
  roleName: string
  internalEmailAddress: string
  entityImage: string
}

export type DivisionalHierarchyRef = {
  hierarchyId: string
  hierarchyName: string
  shortName: string
  teamId: string
  roleId: string
}

type UserState = {
  systemUser: Systemusers | null
  currentUserRoles: UserRole[]
  currentRole: UserRole | null
  currentRolesDivisionalHierarchies: DivisionalHierarchyRef[]
  currentRoleDivisionalHierarchy: DivisionalHierarchyRef | null
  divisionalHierarchies: Dga_divisional_hierarchies[]
  userLoading: boolean
  hierarchiesLoading: boolean
  initialized: boolean
}

const initialState: UserState = {
  systemUser: null,
  currentUserRoles: [],
  currentRole: null,
  currentRolesDivisionalHierarchies: [],
  currentRoleDivisionalHierarchy: null,
  divisionalHierarchies: [],
  userLoading: false,
  hierarchiesLoading: false,
  initialized: false,
}

// ── Async Thunk: full pipeline ──

export const initializeUserPipeline = createAsyncThunk(
  'user/initializePipeline',
  async (_, { rejectWithValue }) => {
    try {
      // 1. Get current AAD user via context
      const context = await getContext()
      const aadUserId = context.user.objectId
      if (!aadUserId) return rejectWithValue('No AAD user ID')

      // 2. Fetch system user by AAD object ID
      const userOptions: IGetAllOptions = {
        select: ['systemuserid', 'fullname', 'internalemailaddress', 'entityimage'],
        filter: `azureactivedirectoryobjectid eq '${aadUserId}'`,
      }
      const usersResponse = await SystemusersService.getAll(userOptions)
      const systemUser = (usersResponse.data ?? [])[0] ?? null
      if (!systemUser?.systemuserid) return rejectWithValue('No system user found')

      const systemUserId = systemUser.systemuserid

      // 3. Collect all roleIds from direct assignments + team memberships
      const roleUserMap = new Map<string, { roleId: string; teamId: string }>()

      // 3a. Direct role assignments
      const directRolesResponse = await SystemuserrolescollectionService.getAll({
        filter: `systemuserid eq '${systemUserId}'`,
      })
      ;(directRolesResponse.data ?? []).forEach((dr) => {
        if (dr.roleid) {
          roleUserMap.set(dr.roleid, { roleId: dr.roleid, teamId: '' })
        }
      })

      // 3b. Team memberships → team roles
      const teamMembershipResponse = await TeammembershipsService.getAll({
        filter: `systemuserid eq '${systemUserId}'`,
      })
      const teamMemberships = teamMembershipResponse.data ?? []

      if (teamMemberships.length > 0) {
        const teamFilter = teamMemberships
          .map((tm) => `teamid eq '${tm.teamid}'`)
          .join(' or ')
        const teamRolesResponse = await TeamrolescollectionService.getAll({
          filter: teamFilter,
        })
        ;(teamRolesResponse.data ?? []).forEach((tr) => {
          if (tr.roleid) {
            roleUserMap.set(tr.roleid, { roleId: tr.roleid, teamId: tr.teamid })
          }
        })
      }

      if (roleUserMap.size === 0) {
        return {
          systemUser,
          roles: [] as UserRole[],
          hierarchies: [] as Dga_divisional_hierarchies[],
        }
      }

      // 4. Fetch role names
      const roleIds = Array.from(roleUserMap.keys())
      const roleFilter = roleIds.map((id) => `roleid eq '${id}'`).join(' or ')
      const rolesResponse = await RolesService.getAll({
        select: ['roleid', 'name'],
        filter: roleFilter,
      })
      const rolesData = (rolesResponse.data ?? []) as Roles[]

      // 5. Filter to AOP roles
      const userRoles: UserRole[] = rolesData
        .filter((role) => isAopRole(role.name))
        .map((role) => {
          const paired = roleUserMap.get(role.roleid)
          return {
            roleId: role.roleid,
            teamId: paired?.teamId ?? '',
            roleName: getAopRoleLabel(role.name),
            internalEmailAddress: systemUser.internalemailaddress ?? '',
            entityImage: systemUser.entityimage ?? '',
          }
        })

      // 6. Fetch divisional hierarchies
      const hierarchyResponse = await Dga_divisional_hierarchiesService.getAll({
        select: [
          'dga_divisional_hierarchyid',
          'dga_name',
          '_dga_parent_divisional_hierarchy_value',
          '_dga_director_value',
          '_dga_division_member_team_id_value',
          'dga_type',
          'dga_short_name',
        ],
      })
      const hierarchies = (hierarchyResponse.data ?? []) as Dga_divisional_hierarchies[]

      return {
        systemUser,
        roles: userRoles,
        hierarchies,
      }
    } catch (error) {
      console.error('User pipeline error:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Pipeline failed')
    }
  },
)

// ── Slice ──

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentRole(state, action: PayloadAction<UserRole | null>) {
      state.currentRole = action.payload

      // Also update the matching divisional hierarchy
      if (action.payload) {
        state.currentRoleDivisionalHierarchy =
          state.currentRolesDivisionalHierarchies.find(
            (h) => h.roleId === action.payload!.roleId,
          ) ?? null
      } else {
        state.currentRoleDivisionalHierarchy = null
      }
    },
    setCurrentRolesDivisionalHierarchies(state, action: PayloadAction<DivisionalHierarchyRef[]>) {
      state.currentRolesDivisionalHierarchies = action.payload
    },
    setCurrentRoleDivisionalHierarchy(state, action: PayloadAction<DivisionalHierarchyRef | null>) {
      state.currentRoleDivisionalHierarchy = action.payload
    },
    setHierarchiesLoading(state, action: PayloadAction<boolean>) {
      state.hierarchiesLoading = action.payload
    },
    resetUserState() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeUserPipeline.pending, (state) => {
        state.userLoading = true
        state.hierarchiesLoading = true
      })
      .addCase(initializeUserPipeline.fulfilled, (state, action) => {
        const { systemUser, roles, hierarchies } = action.payload

        state.systemUser = systemUser
        state.currentUserRoles = roles
        state.divisionalHierarchies = hierarchies
        state.userLoading = false
        state.initialized = true

        // Derive divisional hierarchy references for each role
        const hierarchyRefs: DivisionalHierarchyRef[] = []

        roles.forEach((role) => {
          const roleNameLower = role.roleName.toLowerCase()
          const associatedTeamId = role.teamId
          if (!associatedTeamId) return

          // Division Member — match by _dga_division_member_team_id_value on Division type
          if (roleNameLower.includes('division member')) {
            hierarchies
              .filter(
                (h) =>
                  h._dga_division_member_team_id_value === associatedTeamId &&
                  Number(h.dga_type) === 776140002,
              )
              .forEach((h) => {
                hierarchyRefs.push({
                  hierarchyId: h.dga_divisional_hierarchyid,
                  hierarchyName: h.dga_name ?? '',
                  shortName: h.dga_short_name ?? '',
                  teamId: role.teamId,
                  roleId: role.roleId,
                })
              })
          }

          // Division Director — match by _dga_director_value on Division type
          if (roleNameLower.includes('division director')) {
            hierarchies
              .filter(
                (h) =>
                  h._dga_director_value === associatedTeamId &&
                  Number(h.dga_type) === 776140002,
              )
              .forEach((h) => {
                hierarchyRefs.push({
                  hierarchyId: h.dga_divisional_hierarchyid,
                  hierarchyName: h.dga_name ?? '',
                  shortName: h.dga_short_name ?? '',
                  teamId: role.teamId,
                  roleId: role.roleId,
                })
              })
          }

          // Executive Director — match by _dga_director_value on Sector type
          if (roleNameLower.includes('executive director')) {
            hierarchies
              .filter(
                (h) =>
                  h._dga_director_value === associatedTeamId &&
                  Number(h.dga_type) === 776140001,
              )
              .forEach((h) => {
                hierarchyRefs.push({
                  hierarchyId: h.dga_divisional_hierarchyid,
                  hierarchyName: h.dga_name ?? '',
                  shortName: h.dga_short_name ?? '',
                  teamId: role.teamId,
                  roleId: role.roleId,
                })
              })
          }
        })

        state.currentRolesDivisionalHierarchies = hierarchyRefs
        state.hierarchiesLoading = false

        // Auto-select first role
        if (roles.length > 0) {
          state.currentRole = roles[0]
          state.currentRoleDivisionalHierarchy = hierarchyRefs.find(
            (h) => h.roleId === roles[0].roleId,
          ) ?? null
        }
      })
      .addCase(initializeUserPipeline.rejected, (state) => {
        state.userLoading = false
        state.hierarchiesLoading = false
        state.initialized = true
      })
  },
})

export const {
  setCurrentRole,
  setCurrentRolesDivisionalHierarchies,
  setCurrentRoleDivisionalHierarchy,
  setHierarchiesLoading,
  resetUserState,
} = userSlice.actions

export default userSlice.reducer
