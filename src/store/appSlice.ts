import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  MOCK_NOTIFICATIONS,
  type AopRole,
  type AppNotification,
  type LanguageCode,
  type ThemeMode,
} from '../constants/app'
import { getContext } from '@microsoft/power-apps/app'
import { Dga_assessment_cyclesService } from '../generated/services/Dga_assessment_cyclesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import type { Dga_assessment_cycles } from '../generated/models/Dga_assessment_cyclesModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'

const SELECTED_CYCLE_STORAGE_KEY = 'aop:selected-cycle-id'

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function getStoredSelectedCycle() {
  if (typeof window === 'undefined') return ''

  try {
    return window.localStorage.getItem(SELECTED_CYCLE_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function persistSelectedCycle(cycleId: string) {
  if (typeof window === 'undefined') return

  try {
    if (cycleId) {
      window.localStorage.setItem(SELECTED_CYCLE_STORAGE_KEY, cycleId)
    } else {
      window.localStorage.removeItem(SELECTED_CYCLE_STORAGE_KEY)
    }
  } catch {
    // localStorage can be unavailable in embedded/runtime contexts.
  }
}

export const fetchAssessmentCycles = createAsyncThunk(
  'app/fetchAssessmentCycles',
  async () => {
    const result = await Dga_assessment_cyclesService.getAll({
      filter: '(statuscode eq 1 or statuscode eq 776140002)',
      orderBy: ['createdon desc'],
      select: [
        'dga_assessment_cycleid',
        'dga_name',
        'dga_scheduled_start_date',
        'dga_scheduled_end_date',
        'statuscode',
        'createdon',
      ],
    })
    return (result.data ?? []) as Dga_assessment_cycles[]
  },
)

export const fetchPlanningInstances = createAsyncThunk<
  Dga_project_planning_instances[],
  string | undefined,
  { rejectValue: string }
>(
  'app/fetchPlanningInstances',
  async (cycleId, { rejectWithValue }) => {
    if (!cycleId) {
      return []
    }

    try {
      const result = await Dga_project_planning_instancesService.getAll({
        filter: `_dga_assessment_cycle_value eq ${cycleId}`,
        select: [
          'dga_project_planning_instanceid',
          '_dga_assessment_cycle_value',
          '_dga_division_member_team_value',
          '_dga_divisional_hierarchy_value',
        ],
      })
      return (result.data ?? []) as Dga_project_planning_instances[]
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unable to load planning instances.')
    }
  },
)

export const fetchCurrentUser = createAsyncThunk(
  'app/fetchCurrentUser',
  async () => {
    const ctx = await getContext()
    const objectId = ctx.user.objectId
    if (!objectId) return null

    const usersResult = await SystemusersService.getAll({
      filter: `azureactivedirectoryobjectid eq ${objectId}`,
      select: [
        'systemuserid',
        'fullname',
        'internalemailaddress',
        'entityimage_url',
      ],
    })
    return (usersResult.data?.[0] ?? null) as Systemusers | null
  },
)

type AppState = {
  selectedRole: AopRole
  selectedCycle: string
  defaultCycleId: string
  assessmentCycles: Dga_assessment_cycles[]
  assessmentCyclesLoading: boolean
  planningInstances: Dga_project_planning_instances[]
  planningInstancesCycleId: string
  planningInstancesLoading: boolean
  planningInstancesError: string | null
  currentUser: Systemusers | null
  currentUserLoading: boolean
  themeMode: ThemeMode
  language: LanguageCode
  notifications: AppNotification[]
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
  isNotificationPanelOpen: boolean
  isAiAssistantOpen: boolean
}

const initialState: AppState = {
  selectedRole: 'AOP - Division Member',
  selectedCycle: getStoredSelectedCycle(),
  defaultCycleId: '',
  assessmentCycles: [],
  assessmentCyclesLoading: false,
  planningInstances: [],
  planningInstancesCycleId: '',
  planningInstancesLoading: false,
  planningInstancesError: null,
  currentUser: null,
  currentUserLoading: false,
  themeMode: 'light',
  language: 'en',
  notifications: MOCK_NOTIFICATIONS,
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  isNotificationPanelOpen: false,
  isAiAssistantOpen: false,
}

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setSelectedRole: (state, action: PayloadAction<AopRole>) => {
      state.selectedRole = action.payload
      state.isMobileSidebarOpen = false
    },
    setSelectedCycle: (state, action: PayloadAction<string>) => {
      state.selectedCycle = action.payload
      state.planningInstances = []
      state.planningInstancesCycleId = ''
      state.planningInstancesError = null
      persistSelectedCycle(action.payload)
    },
    setDefaultCycle: (state, action: PayloadAction<string>) => {
      state.defaultCycleId = action.payload
    },
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload
    },
    setLanguage: (state, action: PayloadAction<LanguageCode>) => {
      state.language = action.payload
    },
    toggleSidebarCollapsed: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed
    },
    toggleMobileSidebar: (state) => {
      state.isMobileSidebarOpen = !state.isMobileSidebarOpen
    },
    closeMobileSidebar: (state) => {
      state.isMobileSidebarOpen = false
    },
    toggleNotificationPanel: (state) => {
      state.isNotificationPanelOpen = !state.isNotificationPanelOpen
    },
    closeNotificationPanel: (state) => {
      state.isNotificationPanelOpen = false
    },
    markAllNotificationsRead: (state) => {
      state.notifications.forEach((notification) => {
        notification.unread = false
      })
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((item) => item.id === action.payload)
      if (notification) {
        notification.unread = false
      }
    },
    toggleAiAssistant: (state) => {
      state.isAiAssistantOpen = !state.isAiAssistantOpen
    },
    closeAiAssistant: (state) => {
      state.isAiAssistantOpen = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssessmentCycles.pending, (state) => {
        state.assessmentCyclesLoading = true
      })
      .addCase(fetchAssessmentCycles.fulfilled, (state, action) => {
        state.assessmentCycles = action.payload
        state.assessmentCyclesLoading = false

        const fallbackCycleId = action.payload[0]?.dga_assessment_cycleid ?? ''
        const validSelectedCycle = action.payload.find(
          (cycle) => normalizeId(cycle.dga_assessment_cycleid) === normalizeId(state.selectedCycle),
        )
        const nextSelectedCycle = validSelectedCycle?.dga_assessment_cycleid ?? fallbackCycleId

        if (state.selectedCycle !== nextSelectedCycle) {
          state.selectedCycle = nextSelectedCycle
          state.planningInstances = []
          state.planningInstancesCycleId = ''
          state.planningInstancesError = null
        }

        persistSelectedCycle(nextSelectedCycle)

        if (!state.defaultCycleId && fallbackCycleId) {
          state.defaultCycleId = fallbackCycleId
        }
      })
      .addCase(fetchAssessmentCycles.rejected, (state) => {
        state.assessmentCyclesLoading = false
      })
      .addCase(fetchPlanningInstances.pending, (state) => {
        state.planningInstancesLoading = true
        state.planningInstances = []
        state.planningInstancesCycleId = ''
        state.planningInstancesError = null
      })
      .addCase(fetchPlanningInstances.fulfilled, (state, action) => {
        state.planningInstances = action.payload
        state.planningInstancesCycleId = action.meta.arg ?? ''
        state.planningInstancesLoading = false
        state.planningInstancesError = null
      })
      .addCase(fetchPlanningInstances.rejected, (state, action) => {
        state.planningInstances = []
        state.planningInstancesCycleId = action.meta.arg ?? ''
        state.planningInstancesLoading = false
        state.planningInstancesError = action.payload ?? action.error.message ?? 'Unable to load planning instances.'
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.currentUserLoading = true
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.currentUser = action.payload
        state.currentUserLoading = false
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.currentUserLoading = false
      })
  },
})

export const {
  closeAiAssistant,
  closeMobileSidebar,
  closeNotificationPanel,
  markAllNotificationsRead,
  markNotificationRead,
  setLanguage,
  setDefaultCycle,
  setSelectedCycle,
  setSelectedRole,
  setThemeMode,
  toggleMobileSidebar,
  toggleAiAssistant,
  toggleNotificationPanel,
  toggleSidebarCollapsed,
} = appSlice.actions

export default appSlice.reducer
