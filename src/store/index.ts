import { configureStore } from '@reduxjs/toolkit'
import appReducer from './appSlice'
import userReducer from './userSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
    user: userReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
