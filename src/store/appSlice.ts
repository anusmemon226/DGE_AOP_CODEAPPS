import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  AOP_CYCLES,
  MOCK_NOTIFICATIONS,
  type AopRole,
  type AppNotification,
  type CycleId,
  type LanguageCode,
  type ThemeMode,
} from '../constants/app'

type AppState = {
  selectedRole: AopRole
  selectedCycle: CycleId
  defaultCycleId: CycleId
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
  selectedCycle: AOP_CYCLES.find((cycle) => cycle.isDefault)?.id ?? AOP_CYCLES[0].id,
  defaultCycleId: AOP_CYCLES.find((cycle) => cycle.isDefault)?.id ?? AOP_CYCLES[0].id,
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
    setSelectedCycle: (state, action: PayloadAction<CycleId>) => {
      state.selectedCycle = action.payload
    },
    setDefaultCycle: (state, action: PayloadAction<CycleId>) => {
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
