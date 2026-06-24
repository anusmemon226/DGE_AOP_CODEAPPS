import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  MOCK_NOTIFICATIONS,
  type AopRole,
  type AppNotification,
  type LanguageCode,
  type ThemeMode,
} from '../constants/app'
import { Dga_assessment_cyclesService } from '../generated/services/Dga_assessment_cyclesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import type { Dga_assessment_cycles } from '../generated/models/Dga_assessment_cyclesModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'

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

export const fetchPlanningInstances = createAsyncThunk(
  'app/fetchPlanningInstances',
  async (cycleId: string | undefined) => {
    const filter = cycleId
      ? `_dga_assessment_cycle_value eq ${cycleId}`
      : undefined
    const result = await Dga_project_planning_instancesService.getAll({
      filter,
      select: [
        'dga_project_planning_instanceid',
        'dga_name',
        '_dga_assessment_cycle_value',
        '_dga_divisional_hierarchy_value',
      ],
    })
    return (result.data ?? []) as Dga_project_planning_instances[]
  },
)

type AppState = {
  selectedRole: AopRole
  selectedCycle: string
  defaultCycleId: string
  assessmentCycles: Dga_assessment_cycles[]
  assessmentCyclesLoading: boolean
  planningInstances: Dga_project_planning_instances[]
  planningInstancesLoading: boolean
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
  selectedCycle: '',
  defaultCycleId: '',
  assessmentCycles: [],
  assessmentCyclesLoading: false,
  planningInstances: [],
  planningInstancesLoading: false,
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
        // Auto-select first cycle if none selected yet
        if (!state.selectedCycle && action.payload.length > 0) {
          state.selectedCycle = action.payload[0].dga_assessment_cycleid
        }
        if (!state.defaultCycleId && action.payload.length > 0) {
          state.defaultCycleId = action.payload[0].dga_assessment_cycleid
        }
      })
      .addCase(fetchAssessmentCycles.rejected, (state) => {
        state.assessmentCyclesLoading = false
      })
      .addCase(fetchPlanningInstances.pending, (state) => {
        state.planningInstancesLoading = true
      })
      .addCase(fetchPlanningInstances.fulfilled, (state, action) => {
        state.planningInstances = action.payload
        state.planningInstancesLoading = false
      })
      .addCase(fetchPlanningInstances.rejected, (state) => {
        state.planningInstancesLoading = false
      })
  },
})

export const {
  closeAiAssistant,
  closeMobileSidebar,
  closeNotificationPanel,
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
