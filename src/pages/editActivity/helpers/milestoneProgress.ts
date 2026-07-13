import type { Dga_aop_project_milestone_detailsesstatuscode } from '../../../generated/models/Dga_aop_project_milestone_detailsesModel'
import {
  cleanRecordId,
  getProjectRelatedRecordChange,
  parseProjectRelatedChanges,
  resolveProjectRelatedValue,
} from './projectRelatedChanges'

const CANCELLED_STATUS = 576610001

export type MilestoneProgressSource = {
  actualProgress?: number | string | null
  id: string
  plannedEndDate?: string | null
  plannedProgress?: number | string | null
  plannedStartDate?: string | null
  statuscode?: Dga_aop_project_milestone_detailsesstatuscode | number | string | null
}

export type MilestoneProgressResult = {
  actualProgress: number
  eligible: boolean
  plannedProgress: number
  weight: number
}

export type ProjectMilestoneProgress = {
  actual: number
  eligibleCount: number
  planned: number
  resultsById: Record<string, MilestoneProgressResult>
}

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : stripTime(date)
}

function parseNumber(value: unknown, fallback = 0) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  const parsed = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : fallback
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, value))
}

function roundProgress(value: number) {
  return Math.round(clampProgress(value) * 100) / 100
}

function getQuarterYear(value?: string | null) {
  const date = parseDate(value)
  if (!date) return null

  return {
    quarter: Math.floor(date.getMonth() / 3) + 1,
    year: date.getFullYear(),
  }
}

function getCurrentQuarterYear() {
  const now = new Date()
  return {
    quarter: Math.floor(now.getMonth() / 3) + 1,
    year: now.getFullYear(),
  }
}

function isFutureQuarter(value?: string | null) {
  const milestoneQuarter = getQuarterYear(value)
  if (!milestoneQuarter) return false

  const current = getCurrentQuarterYear()
  return milestoneQuarter.year > current.year
    || (milestoneQuarter.year === current.year && milestoneQuarter.quarter > current.quarter)
}

export function calculateMilestonePlannedProgress(
  plannedStartDate?: string | null,
  plannedEndDate?: string | null,
  today = stripTime(new Date()),
) {
  const startDate = parseDate(plannedStartDate)
  const endDate = parseDate(plannedEndDate)

  if (!startDate || !endDate) return 0
  if (today >= endDate) return 100
  if (today < startDate) return 0

  const totalDays = endDate.getTime() - startDate.getTime()
  const elapsedDays = today.getTime() - startDate.getTime()

  if (totalDays <= 0) return today >= endDate ? 100 : 0

  return roundProgress((elapsedDays / totalDays) * 100)
}

export function resolveMilestoneProgressStatus(
  milestone: MilestoneProgressSource,
  relatedChanges?: string | null,
) {
  const pendingStatus = resolveProjectRelatedValue(getProjectRelatedRecordChange(
    parseProjectRelatedChanges(relatedChanges),
    'milestones',
    cleanRecordId(milestone.id),
    'statuscode',
  ))

  return parseNumber(pendingStatus ?? milestone.statuscode, 0)
}

export function resolveMilestoneActualProgress(
  milestone: MilestoneProgressSource,
  relatedChanges?: string | null,
) {
  const pendingActual = resolveProjectRelatedValue(getProjectRelatedRecordChange(
    parseProjectRelatedChanges(relatedChanges),
    'milestones',
    cleanRecordId(milestone.id),
    'dga_actual_progress',
  ))

  return roundProgress(parseNumber(pendingActual ?? milestone.actualProgress, 0))
}

export function isMilestoneEligibleForProgress(
  milestone: MilestoneProgressSource,
  relatedChanges?: string | null,
) {
  if (!milestone.plannedEndDate) return false
  if (resolveMilestoneProgressStatus(milestone, relatedChanges) === CANCELLED_STATUS) return false
  if (isFutureQuarter(milestone.plannedEndDate)) return false

  return true
}

export function calculateProjectMilestoneProgress(
  milestones: MilestoneProgressSource[],
  relatedChanges?: string | null,
): ProjectMilestoneProgress {
  const today = stripTime(new Date())
  const eligibleMilestones = milestones.filter((milestone) => isMilestoneEligibleForProgress(milestone, relatedChanges))
  const totalItems = eligibleMilestones.length
  const resultsById: Record<string, MilestoneProgressResult> = {}

  milestones.forEach((milestone) => {
    const plannedProgress = calculateMilestonePlannedProgress(
      milestone.plannedStartDate,
      milestone.plannedEndDate,
      today,
    )
    const actualProgress = resolveMilestoneActualProgress(milestone, relatedChanges)

    resultsById[milestone.id] = {
      actualProgress,
      eligible: false,
      plannedProgress,
      weight: 0,
    }
  })

  if (totalItems === 0) {
    return {
      actual: 0,
      eligibleCount: 0,
      planned: 0,
      resultsById,
    }
  }

  const baseWeight = Math.floor(100 / totalItems)
  const remainder = 100 % totalItems
  let totalPlannedProgress = 0
  let totalActualProgress = 0

  eligibleMilestones.forEach((milestone, index) => {
    const weight = index < remainder ? baseWeight + 1 : baseWeight
    const plannedProgress = resultsById[milestone.id]?.plannedProgress ?? 0
    const actualProgress = resultsById[milestone.id]?.actualProgress ?? 0

    resultsById[milestone.id] = {
      actualProgress,
      eligible: true,
      plannedProgress,
      weight,
    }

    totalPlannedProgress += (plannedProgress / 100) * weight
    totalActualProgress += actualProgress
  })

  return {
    actual: roundProgress(totalActualProgress / totalItems),
    eligibleCount: totalItems,
    planned: roundProgress(totalPlannedProgress),
    resultsById,
  }
}
