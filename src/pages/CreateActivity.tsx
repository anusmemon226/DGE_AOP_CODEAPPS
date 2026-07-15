import { useEffect, useState, type ChangeEvent } from 'react'
import { AlignLeft, Bot, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, FileSpreadsheet, FileText, Paperclip, RefreshCcw, Save, Send, Settings2, Sparkles, Trash2, UploadCloud } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  EmptyState,
  Input,
  RadioGroup,
  Select,
  Textarea,
  Tooltip,
  TooltipProvider,
  type SelectOption,
} from '../components/ui'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { PowerApps_V2__RetrieveAOPProjectDatafromExcelService } from '../generated/services/PowerApps_V2__RetrieveAOPProjectDatafromExcelService'
import { SystemusersService } from '../generated/services/SystemusersService'
import type { Dga_aop_projectsesBase, Dga_aop_projectses } from '../generated/models/Dga_aop_projectsesModel'
import type { Dga_divisional_hierarchies } from '../generated/models/Dga_divisional_hierarchiesModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { useAppSelector } from '../store/hooks'
import type { UserRole } from '../store/userSlice'

type TabValue = 'manual' | 'copilot'
type ActivityTypeValue = '1' | '2' | '3' | '4'
type ActivityScopeValue = '1' | '2'
type StrategyValue = '576610000' | '576610001' | '576610002'
type ClassificationValue = '576610000' | '576610001' | '576610002'
type YesNoValue = '1' | '0'

type CreateActivityForm = {
  activityName: string
  activityType: ActivityTypeValue | ''
  sectorId: string
  sectorName: string
  divisionId: string
  divisionName: string
  activityScope: ActivityScopeValue | ''
  strategies: StrategyValue[]
  activityClassification: ClassificationValue | ''
  budgetRequired: YesNoValue | ''
  procurementRequired: YesNoValue | ''
  adeoReported: YesNoValue | ''
  activityLeadId: string
  plannedStartDate: string
  plannedEndDate: string
  scopeDescription: string
  summary: string
  adeoProjectName: string
  adeoProjectDescription: string
  longTermImpact: string
  overallLongTermImpact: string
  stakeholder: string
  activityKpi: string
  activityPlan: string
  risks: string
}

type FieldErrors = Partial<Record<keyof CreateActivityForm | 'submit' | 'context', string>>

const FIELD_LABELS: Partial<Record<keyof CreateActivityForm, string>> = {
  activityName: 'Activity / Initiative Name',
  activityType: 'Activity Type',
  sectorName: 'Sector',
  divisionName: 'Division',
  activityScope: 'Activity Scope',
  strategies: 'Strategy Categorization',
  activityClassification: 'Activity Classification',
  budgetRequired: 'Budget requirement',
  procurementRequired: 'Procurement requirement',
  adeoReported: 'ADEO reporting',
  activityLeadId: 'Activity Lead / PM Name',
  plannedStartDate: 'Planned Start Date',
  plannedEndDate: 'Planned End Date',
  scopeDescription: 'Scope',
  summary: 'Summary',
  adeoProjectName: 'اسم المشروع',
  adeoProjectDescription: 'وصف المشروع',
  longTermImpact: 'Long Term Impact',
  overallLongTermImpact: 'طويلة المدى / اهداف المشروع العامة',
  stakeholder: 'Stakeholder',
  activityKpi: 'Activity KPI',
  risks: 'Risks',
}

const CREATE_ACTIVITY_TOOLTIPS = {
  activityType: <><p>Select the activity type from the below options:</p><ul><li><strong>New Project:</strong> Started in 2026</li><li><strong>Ongoing Project:</strong> Started before 2026</li><li><strong>Contract:</strong> Contract-based or payment-related item</li><li><strong>Internal Operations:</strong> Activity related to internal departmental operations</li></ul></>,
  activityName: <>Input the name of the project/activity.</>,
  activityScope: <><p>Select the project type from the below options:</p><ul><li><strong>Strategic:</strong> The project is derived from the Abu Dhabi Digital Strategy</li><li><strong>Operational:</strong> The project is operational in nature</li></ul></>,
  strategies: <>Select the strategy under which this project is categorized. You can select multiple options.</>,
  activityClassification: <><p>Select the activity classification from the below options:</p><ul><li><strong>EPM Registered Project:</strong> Project that is or will be registered in the EPM system</li><li><strong>Operational Activity:</strong> Operational activity with defined deliverables and outcomes</li><li><strong>Payment Only:</strong> Non-project item related to contracts or payments</li></ul></>,
  budgetRequired: <>This project will require budget.</>,
  paymentOnlyWarning: <>Payment Only activities are considered budget required.</>,
  procurementRequired: <>This project will require procurement, either through a new tender, contract renewal, etc.</>,
  budgetNoWarning: <>Procurement is automatically No when budget is not required.</>,
  adeoReported: <>This project is or will be included with the DGE Execution Plan and reported to ADEO.</>,
  activityLead: <>Input the name of the Project Manager/Activity Lead that will be responsible for inputting this activity&apos;s progress.</>,
  plannedStartDate: <>Input the planned start date of the project or activity.</>,
  plannedEndDate: <>Input the planned end date of the project or activity.</>,
  scope: <>Input a detailed description of what will be covered in the scope of this project or activity.</>,
  summary: <>Input a detailed summary of the project mentioning the objective, high-level scope statement, and the expected value or benefit from completion of this project or activity.</>,
} as const

type ActivityContext = {
  currentUserId: string
  currentUserName: string
  ownerTeamId: string
  roleTeamId: string
  cycleId: string
  division: Dga_divisional_hierarchies
  sector: Dga_divisional_hierarchies
  planningInstance: Dga_project_planning_instances
}

type DgaAopProjectCreatePayload = Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid' | 'dga_project_categorized_under' | 'ownerid' | 'owneridtype'> & {
  dga_project_categorized_under?: string
  'ownerid@odata.bind': string
}

type OwnerAssignmentPayload = Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid' | 'ownerid'>> & {
  'ownerid@odata.bind': string
}

type CopilotAttachment = {
  id: string
  name: string
  size: number
  type: string
  file: File
}

type RetrieveAopProjectDataFromExcelInput = {
  file?: {
    name?: string
    contentBytes?: string
    mimeType?: string
  }
}

type AiImportPhase = 'idle' | 'uploaded' | 'processing' | 'ready' | 'error'

type AiMappingSection = 'project' | 'milestones' | 'procurements' | 'dependencies' | 'budgets' | 'engagementPlans'

type AiHeaderMapping = {
  logical_name: string
  matched_header: string
  status: string
}

type AiMappingBySection = Partial<Record<AiMappingSection, AiHeaderMapping[]>>

type AiMappingResponse = {
  source?: string
  mapping?: AiMappingBySection
  notes?: string[]
}

type AiImportedChildRecord = {
  fields: Record<string, string>
  id: string
  section: Exclude<AiMappingSection, 'project'>
  title: string
}

type AiImportedActivityPreview = {
  children: Record<Exclude<AiMappingSection, 'project'>, AiImportedChildRecord[]>
  dataQuality: {
    detectedFields: number
    missingFields: number
    unmatchedRecords: number
  }
  id: string
  projectFields: Record<string, string>
  rowIndex: number
  sheetName: string
  sourceTable: number
  title: string
  warnings: string[]
}

type ParsedWorkbookTable = ExcelTableRegion & {
  section: AiMappingSection | 'unknown'
  verticalKeyValue: boolean
}

type ParsedProjectRecord = {
  fields: Record<string, string>
  id: string
  rowIndex: number
  sheetName: string
  sourceTable: number
}

type ParsedChildRecord = AiImportedChildRecord & {
  projectKey: string
  rowIndex: number
  sheetName: string
  sourceTable: number
}

const INITIAL_FORM: CreateActivityForm = {
  activityName: '',
  activityType: '',
  sectorId: '',
  sectorName: '',
  divisionId: '',
  divisionName: '',
  activityScope: '',
  strategies: [],
  activityClassification: '',
  budgetRequired: '',
  procurementRequired: '',
  adeoReported: '',
  activityLeadId: '',
  plannedStartDate: '',
  plannedEndDate: '',
  scopeDescription: '',
  summary: '',
  adeoProjectName: '',
  adeoProjectDescription: '',
  longTermImpact: '',
  overallLongTermImpact: '',
  stakeholder: '',
  activityKpi: '',
  activityPlan: '',
  risks: '',
}

const ACTIVITY_TYPE_OPTIONS = [
  { label: 'Select activity type', value: '' },
  { label: 'New Project', value: '1', description: 'A new planned initiative for the selected cycle.' },
  { label: 'Ongoing Project', value: '2', description: 'Continuation of an existing project.' },
  { label: 'Contract Operations', value: '3', description: 'Activity managed through contract operations.' },
  { label: 'Internal Operations', value: '4', description: 'Internal operational work.' },
] as const satisfies SelectOption<ActivityTypeValue | ''>[]

const ACTIVITY_SCOPE_OPTIONS = [
  { label: 'Select activity scope', value: '' },
  { label: 'Strategic', value: '1', description: 'Aligned to strategic outcomes.' },
  { label: 'Operational', value: '2', description: 'Division operational activity.' },
] as const satisfies SelectOption<ActivityScopeValue | ''>[]

const STRATEGY_OPTIONS = [
  { label: 'Government of the Future Strategy', value: '576610000' },
  { label: 'DGE Corporate Strategy', value: '576610001' },
  { label: 'Abu Dhabi Government Digital Strategy', value: '576610002' },
] as const satisfies SelectOption<StrategyValue>[]

const CLASSIFICATION_OPTIONS = [
  { label: 'Select classification', value: '' },
  { label: 'EPM Registered Project', value: '576610000' },
  { label: 'Operational Activity', value: '576610001' },
  { label: 'Payment Only', value: '576610002' },
] as const satisfies SelectOption<ClassificationValue | ''>[]

const YES_NO_OPTIONS = [
  { label: 'Select answer', value: '' },
  { label: 'Yes', value: '1', className: 'choice--yes' },
  { label: 'No', value: '0', className: 'choice--no' },
] as const satisfies SelectOption<YesNoValue | ''>[]

const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024
const EXCEL_XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const CSV_MIME_TYPE = 'text/csv'
const EXCEL_UPLOAD_ERROR = 'Only Excel .xlsx files are supported for AI draft generation.'
const NO_TABLES_FOUND_ERROR = 'No table data was found in the uploaded Excel file.'
const MIN_TABLE_NON_EMPTY_CELLS = 3
const AI_IMPORT_SECTIONS: AiMappingSection[] = ['project', 'milestones', 'procurements', 'dependencies', 'budgets', 'engagementPlans']
const AI_CHILD_SECTIONS: Array<Exclude<AiMappingSection, 'project'>> = ['milestones', 'procurements', 'dependencies', 'budgets', 'engagementPlans']
const AI_SECTION_LABELS: Record<AiMappingSection, string> = {
  project: 'Activity Details',
  milestones: 'Milestones',
  procurements: 'Procurements',
  dependencies: 'Dependencies',
  budgets: 'Budgets',
  engagementPlans: 'Engagement Plans',
}
const AI_SECTION_ALIASES: Record<AiMappingSection, string[]> = {
  project: ['project details', 'project summary', 'projects', 'project', 'activity details', 'activity'],
  milestones: ['milestones', 'milestone'],
  procurements: ['procurements', 'procurement', 'procurement plans', 'procurement plan'],
  dependencies: ['dependencies', 'dependency'],
  budgets: ['budgets', 'budget', 'monthly budget plan', 'monthly budgets', 'aop monthly budgets'],
  engagementPlans: ['engagement plans', 'engagement plan', 'engagements', 'engagement'],
}
const AI_LOGICAL_SECTION_HINTS: Record<AiMappingSection, string[]> = {
  project: ['dga_project_name', 'dga_activity_type', 'dga_project_phase', 'dga_sector', 'dga_department', 'dga_activity_lead'],
  milestones: ['dga_weightage', 'dga_milestone_description', 'dga_actual_start_date'],
  procurements: ['dga_pr_ticket_number', 'dga_purchase_request_raising_by_quarter', 'dga_expected_awarding_by_quarter', 'dga_item_service_description'],
  dependencies: ['dga_type_of_support', 'dga_date_of_support', 'dga_name_of_external_entity'],
  budgets: ['dga_planned_budget'],
  engagementPlans: ['dga_engagement_type', 'dga_sub_type', 'dga_type_of_activity'],
}
const AI_PREVIEW_FIELD_LABELS: Record<string, string> = {
  dga_activity_lead: 'Activity Lead',
  dga_activity_type: 'Activity Type',
  dga_adeo_review_required: 'ADEO Required',
  dga_department: 'Division',
  dga_does_this_project_require_procurement: 'Procurement Required',
  dga_doesthisprojectrequirebudgetallocation: 'Budget Required',
  dga_name: 'Name',
  dga_planned_budget: 'Planned Budget',
  dga_planned_end_date: 'Planned End Date',
  dga_planned_start_date: 'Planned Start Date',
  dga_project_name: 'Activity Name',
  dga_project_phase: 'Project Phase',
  dga_project_type: 'Project Type',
  dga_sector: 'Sector',
  dga_strategic_vs_operation: 'Scope',
}

type ExcelTableRegion = {
  columns: string[]
  rows: string[][]
  sheetName: string
  tableNumber: number
}

function getResultValue<T>(result: unknown): T | undefined {
  const shaped = result as { data?: T; value?: T; result?: T; record?: T }

  return shaped.data ?? shaped.value ?? shaped.result ?? shaped.record
}

function getResultArray<T>(result: unknown): T[] {
  const value = getResultValue<T[]>(result)

  if (Array.isArray(value)) {
    return value
  }

  if (Array.isArray(result)) {
    return result as T[]
  }

  return []
}

function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
  const error = (result as { error?: { message?: string } | string })?.error
  const message = typeof error === 'string' ? error : error?.message

  if (!message) {
    return fallbackMessage
  }

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

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${id})`
}

function normalizeId(id: string | null | undefined) {
  return (id ?? '').replace(/[{}]/g, '').toLowerCase()
}

function withoutUndefined<TRecord extends Record<string, unknown>>(record: TRecord) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as TRecord
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function isXlsxFile(file: File) {
  const normalizedName = file.name.toLowerCase()
  const hasXlsxExtension = normalizedName.endsWith('.xlsx')
  const hasBlockedXlsExtension = normalizedName.endsWith('.xls')
  const hasValidMime = !file.type || file.type === EXCEL_XLSX_MIME_TYPE

  return hasXlsxExtension && !hasBlockedXlsExtension && hasValidMime
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error('Unable to read the selected Excel file. Please try again.'))
        return
      }

      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(new Error('Unable to read the selected Excel file. Please try again.'))
    }

    reader.readAsArrayBuffer(file)
  })
}

function normalizeCellValue(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function isBlankCell(value: unknown) {
  return normalizeCellValue(value) === ''
}

function isBlankRow(row: unknown[]) {
  return row.every(isBlankCell)
}

function getNonEmptyCellCount(row: unknown[]) {
  return row.filter((cell) => !isBlankCell(cell)).length
}

function isPlaceholderDataRow(row: string[]) {
  const normalizedValues = row.map(normalizeHeader).filter(Boolean)
  const joined = normalizedValues.join(' ')

  return normalizedValues.length === 0 ||
    joined.includes('no records provided') ||
    joined.includes('total planned budget')
}

function getColumnLabel(index: number) {
  let label = ''
  let value = index + 1

  while (value > 0) {
    const remainder = (value - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    value = Math.floor((value - 1) / 26)
  }

  return `Column ${label}`
}

function getContiguousBands(indices: number[]) {
  const bands: Array<[number, number]> = []
  let start: number | null = null
  let previous: number | null = null

  indices.forEach((index) => {
    if (start === null || previous === null || index !== previous + 1) {
      if (start !== null && previous !== null) {
        bands.push([start, previous])
      }

      start = index
    }

    previous = index
  })

  if (start !== null && previous !== null) {
    bands.push([start, previous])
  }

  return bands
}

function getSectionFromLabel(value: string): AiMappingSection | 'unknown' {
  const normalizedValue = normalizeHeader(value)

  for (const section of AI_IMPORT_SECTIONS) {
    if (AI_SECTION_ALIASES[section].some((alias) => normalizedValue.includes(alias))) {
      return section
    }
  }

  return 'unknown'
}

function getSectionBeforeRow(rows: string[][], rowIndex: number): AiMappingSection | 'unknown' {
  for (let index = rowIndex - 1; index >= 0; index -= 1) {
    const row = rows[index]
    const firstValue = row.find((cell) => !isBlankCell(cell)) ?? ''
    const section = getSectionFromLabel(firstValue)

    if (section !== 'unknown') {
      return section
    }
  }

  return 'unknown'
}

function inferSectionFromHeaderRow(headerRow: string[], fallbackSection: AiMappingSection | 'unknown') {
  if (fallbackSection !== 'unknown') {
    return fallbackSection
  }

  const normalizedHeaders = headerRow.map(normalizeHeader).filter(Boolean)

  for (const section of AI_IMPORT_SECTIONS) {
    if (AI_LOGICAL_SECTION_HINTS[section].some((hint) => normalizedHeaders.includes(hint))) {
      return section
    }
  }

  if (normalizedHeaders.includes('month') && normalizedHeaders.includes('planned budget')) {
    return 'budgets'
  }

  for (const section of AI_IMPORT_SECTIONS) {
    if (AI_SECTION_ALIASES[section].some((alias) => normalizedHeaders.some((header) => header.includes(alias)))) {
      return section
    }
  }

  if (normalizedHeaders.includes('field') && normalizedHeaders.includes('value')) {
    return 'project'
  }

  return 'unknown'
}

function isFieldValueHeader(row: string[]) {
  return normalizeHeader(row[0] ?? '') === 'field' && normalizeHeader(row[1] ?? '') === 'value'
}

function getTablesFromBlock(blockRows: string[][], sheetName: string, startingTableNumber: number): ParsedWorkbookTable[] {
  const tables: ParsedWorkbookTable[] = []
  const rows = blockRows.filter((row) => !isBlankRow(row))
  const fieldValueIndex = rows.findIndex(isFieldValueHeader)

  if (fieldValueIndex >= 0) {
    const section = getSectionBeforeRow(rows, fieldValueIndex)
    const dataRows = rows
      .slice(fieldValueIndex + 1)
      .filter((row) => !isPlaceholderDataRow(row) && !isBlankCell(row[0]) && !isBlankCell(row[1]))

    if (dataRows.length > 0) {
      tables.push({
        columns: ['Field', 'Value'],
        rows: dataRows.map((row) => [row[0], row[1]]),
        section: section === 'unknown' ? 'project' : section,
        sheetName,
        tableNumber: startingTableNumber,
        verticalKeyValue: true,
      })
    }

    return tables
  }

  const headerIndex = rows.findIndex((row, index) => {
    if (getNonEmptyCellCount(row) < 2 || isPlaceholderDataRow(row)) {
      return false
    }

    const section = inferSectionFromHeaderRow(row, getSectionBeforeRow(rows, index))

    return section !== 'unknown' || row.some((cell) => normalizeHeader(cell).startsWith('dga_'))
  })

  if (headerIndex < 0) {
    return tables
  }

  const columns = rows[headerIndex].map((value, index) => value || getColumnLabel(index))
  const section = inferSectionFromHeaderRow(columns, getSectionBeforeRow(rows, headerIndex))
  const dataRows = rows
    .slice(headerIndex + 1)
    .filter((row) => !isPlaceholderDataRow(row))

  if (section !== 'unknown' && dataRows.length > 0) {
    tables.push({
      columns,
      rows: dataRows,
      section,
      sheetName,
      tableNumber: startingTableNumber,
      verticalKeyValue: false,
    })
  }

  return tables
}

function getTableRegionsFromSheet(sheetName: string, sheet: XLSX.WorkSheet): ParsedWorkbookTable[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    blankrows: true,
    defval: '',
    header: 1,
    raw: false,
  })

  if (rows.length === 0) {
    return []
  }

  const maxColumnCount = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const normalizedRows = rows.map((row) => Array.from({ length: maxColumnCount }, (_, index) => normalizeCellValue(row[index])))
  const rowBands: Array<[number, number]> = []
  let bandStart: number | null = null

  normalizedRows.forEach((row, rowIndex) => {
    if (isBlankRow(row)) {
      if (bandStart !== null) {
        rowBands.push([bandStart, rowIndex - 1])
        bandStart = null
      }

      return
    }

    if (bandStart === null) {
      bandStart = rowIndex
    }
  })

  if (bandStart !== null) {
    rowBands.push([bandStart, normalizedRows.length - 1])
  }

  const detectedTables: ParsedWorkbookTable[] = []

  rowBands.forEach(([startRow, endRow]) => {
    const usedColumnIndices = Array.from({ length: maxColumnCount }, (_, columnIndex) => columnIndex)
      .filter((columnIndex) => {
        for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
          if (!isBlankCell(normalizedRows[rowIndex][columnIndex])) {
            return true
          }
        }

        return false
      })

    getContiguousBands(usedColumnIndices).forEach(([startColumn, endColumn]) => {
      const tableRows = normalizedRows
        .slice(startRow, endRow + 1)
        .map((row) => row.slice(startColumn, endColumn + 1))
        .filter((row) => !isBlankRow(row))
      const nonEmptyCellCount = tableRows.flat().filter((cell) => !isBlankCell(cell)).length

      if (tableRows.length < 2 || nonEmptyCellCount < MIN_TABLE_NON_EMPTY_CELLS) {
        return
      }

      detectedTables.push(...getTablesFromBlock(tableRows, sheetName, detectedTables.length + 1))
    })
  })

  return detectedTables
}

function buildCsvFileName(excelFileName: string) {
  const baseName = excelFileName.replace(/\.xlsx$/i, '').trim() || 'aop-project-data'

  return `${baseName}.csv`
}

function escapeCsvValue(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

function generateTablesCsvBase64(tables: ExcelTableRegion[]) {
  const lines: string[] = []

  tables.forEach((table, index) => {
    if (index > 0) {
      lines.push('')
    }

    lines.push(`# ${table.sheetName} - Table ${table.tableNumber}`)
    lines.push(table.columns.map(escapeCsvValue).join(','))
    table.rows.forEach((row) => {
      lines.push(row.map(escapeCsvValue).join(','))
    })
  })

  const csv = lines.join('\r\n')
  const bytes = new TextEncoder().encode(csv)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return window.btoa(binary)
}

async function extractExcelTables(file: File) {
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(buffer, { type: 'array' })
  const tables = workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName]

    return sheet ? getTableRegionsFromSheet(sheetName, sheet) : []
  })

  if (tables.length === 0) {
    throw new Error(NO_TABLES_FOUND_ERROR)
  }

  return tables
}

async function convertExcelFileToCsv(file: File) {
  const tables = await extractExcelTables(file)
  const contentBytes = generateTablesCsvBase64(tables)

  if (!contentBytes) {
    throw new Error('Unable to generate a CSV from the uploaded Excel file. Please try again.')
  }

  return {
    contentBytes,
    mimeType: CSV_MIME_TYPE,
    name: buildCsvFileName(file.name),
    tables,
  }
}

function unwrapOperationData(result: unknown): unknown {
  const shaped = result as { data?: unknown; value?: unknown; result?: unknown; output?: unknown }

  return shaped.data ?? shaped.value ?? shaped.result ?? result
}

function extractAiOutputText(result: unknown): string {
  let data = unwrapOperationData(result)

  if (typeof (data as { success?: unknown })?.success === 'string') {
    try {
      data = JSON.parse((data as { success: string }).success)
    } catch {
      return (data as { success: string }).success
    }
  }

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return String(data)
    }
  }

  const output = (data as { output?: unknown })?.output

  if (Array.isArray(output)) {
    for (const item of output) {
      const content = (item as { content?: unknown })?.content

      if (!Array.isArray(content)) {
        continue
      }

      const textItem = content.find((entry) => typeof (entry as { text?: unknown })?.text === 'string')
      const text = (textItem as { text?: string } | undefined)?.text

      if (text) {
        return text
      }
    }
  }

  const directText = (data as { text?: unknown; response?: unknown })?.text ?? (data as { response?: unknown })?.response

  return typeof directText === 'string' ? directText : ''
}

function parseAiMappingResponse(result: unknown): AiMappingResponse {
  const text = extractAiOutputText(result)

  if (!text.trim()) {
    throw new Error('AI Assistant response did not include mapping text.')
  }

  try {
    return JSON.parse(text) as AiMappingResponse
  } catch {
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as AiMappingResponse
    }

    throw new Error('AI Assistant response could not be parsed into a header mapping.')
  }
}

function normalizeHeader(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function getFoundMappings(mapping: AiMappingBySection | undefined, section: AiMappingSection) {
  return (mapping?.[section] ?? []).filter((item) => item.status === 'Found' && item.matched_header?.trim() && item.logical_name?.trim())
}

function getMissingMappingCount(mapping: AiMappingBySection | undefined) {
  return AI_IMPORT_SECTIONS.reduce(
    (count, section) => count + (mapping?.[section] ?? []).filter((item) => item.status !== 'Found' || !item.matched_header?.trim()).length,
    0,
  )
}

function getFoundMappingCount(mapping: AiMappingBySection | undefined) {
  return AI_IMPORT_SECTIONS.reduce((count, section) => count + getFoundMappings(mapping, section).length, 0)
}

function getRowValueByHeader(table: ExcelTableRegion, row: string[], header: string) {
  const targetHeader = normalizeHeader(header)
  const columnIndex = table.columns.findIndex((column) => normalizeHeader(column) === targetHeader)

  if (columnIndex < 0) {
    return ''
  }

  return normalizeCellValue(row[columnIndex])
}

function getRowValueByMapping(table: ExcelTableRegion, row: string[], mapping: AiHeaderMapping) {
  return getRowValueByHeader(table, row, mapping.matched_header) || getRowValueByHeader(table, row, mapping.logical_name)
}

function mapRowFields(table: ExcelTableRegion, row: string[], mappings: AiHeaderMapping[]) {
  return mappings.reduce<Record<string, string>>((fields, mapping) => {
    const value = getRowValueByMapping(table, row, mapping)

    if (value) {
      fields[mapping.logical_name] = value
    }

    return fields
  }, {})
}

function mapVerticalFields(table: ExcelTableRegion, mappings: AiHeaderMapping[]) {
  return mappings.reduce<Record<string, string>>((fields, mapping) => {
    const valueRow = table.rows.find((row) => {
      const key = normalizeHeader(row[0] ?? '')

      return key === normalizeHeader(mapping.matched_header) || key === normalizeHeader(mapping.logical_name)
    })
    const value = normalizeCellValue(valueRow?.[1])

    if (value) {
      fields[mapping.logical_name] = value
    }

    return fields
  }, {})
}

function mapTableRecordFields(table: ParsedWorkbookTable, row: string[], mappings: AiHeaderMapping[]) {
  return table.verticalKeyValue ? mapVerticalFields(table, mappings) : mapRowFields(table, row, mappings)
}

function formatLogicalName(logicalName: string) {
  return AI_PREVIEW_FIELD_LABELS[logicalName] ?? logicalName
    .replace(/^dga_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getChildTitle(section: Exclude<AiMappingSection, 'project'>, fields: Record<string, string>, fallbackIndex: number) {
  if (fields.dga_name) {
    return fields.dga_name
  }

  if (section === 'budgets' && fields.dga_name) {
    return fields.dga_name
  }

  return `${AI_SECTION_LABELS[section]} ${fallbackIndex}`
}

function getProjectMatchKey(fields: Record<string, string>) {
  return normalizeHeader(fields.dga_project_name || fields.dga_aop_project || fields.dga_name || '')
}

function createEmptyChildren(): AiImportedActivityPreview['children'] {
  return {
    budgets: [],
    dependencies: [],
    engagementPlans: [],
    milestones: [],
    procurements: [],
  }
}

function buildImportedActivityPreviews(tables: ParsedWorkbookTable[], mappingResponse: AiMappingResponse): AiImportedActivityPreview[] {
  const mapping = mappingResponse.mapping
  const projectMappings = getFoundMappings(mapping, 'project')
  const missingFields = getMissingMappingCount(mapping)
  const projectRecords: ParsedProjectRecord[] = []
  const childRecords: ParsedChildRecord[] = []

  tables.forEach((table) => {
    if (table.section === 'project') {
      const rowsToMap = table.verticalKeyValue ? [table.rows[0] ?? []] : table.rows

      rowsToMap.forEach((row, rowIndex) => {
        const fields = mapTableRecordFields(table, row, projectMappings)

        if (Object.values(fields).some(Boolean)) {
          projectRecords.push({
            fields,
            id: `${table.sheetName}-${table.tableNumber}-${rowIndex}`,
            rowIndex: rowIndex + 1,
            sheetName: table.sheetName,
            sourceTable: table.tableNumber,
          })
        }
      })

      return
    }

    if (!AI_CHILD_SECTIONS.includes(table.section as Exclude<AiMappingSection, 'project'>)) {
      return
    }

    const section = table.section as Exclude<AiMappingSection, 'project'>
    const mappings = getFoundMappings(mapping, section)
    const rowsToMap = table.verticalKeyValue ? [table.rows[0] ?? []] : table.rows

    rowsToMap.forEach((row, rowIndex) => {
      const fields = mapTableRecordFields(table, row, mappings)

      if (!Object.values(fields).some(Boolean)) {
        return
      }

      childRecords.push({
        fields,
        id: `${table.sheetName}-${table.tableNumber}-${rowIndex}-${section}`,
        projectKey: getProjectMatchKey(fields),
        rowIndex: rowIndex + 1,
        section,
        sheetName: table.sheetName,
        sourceTable: table.tableNumber,
        title: getChildTitle(section, fields, childRecords.filter((record) => record.section === section).length + 1),
      })
    })
  })

  const previews = projectRecords.map<AiImportedActivityPreview>((record, index) => ({
    children: createEmptyChildren(),
    dataQuality: {
      detectedFields: Object.keys(record.fields).length,
      missingFields,
      unmatchedRecords: 0,
    },
    id: record.id,
    projectFields: record.fields,
    rowIndex: record.rowIndex,
    sheetName: record.sheetName,
    sourceTable: record.sourceTable,
    title: record.fields.dga_project_name ?? record.fields.dga_name ?? `AOP Activity ${index + 1}`,
    warnings: [],
  }))
  const previewByProjectKey = new Map(previews.map((preview) => [getProjectMatchKey(preview.projectFields), preview]))
  const unmatchedRecords: ParsedChildRecord[] = []

  childRecords.forEach((record) => {
    const targetPreview = record.projectKey
      ? previewByProjectKey.get(record.projectKey)
      : previews.length === 1
        ? previews[0]
        : undefined

    if (targetPreview) {
      targetPreview.children[record.section].push(record)
      return
    }

    unmatchedRecords.push(record)
  })

  if (unmatchedRecords.length > 0 && previews.length > 0) {
    previews[0].dataQuality.unmatchedRecords = unmatchedRecords.length
    previews[0].warnings.push(`${unmatchedRecords.length} related record${unmatchedRecords.length === 1 ? '' : 's'} could not be matched to an activity.`)
  }

  previews.forEach((preview) => {
    if (!preview.projectFields.dga_project_name) {
      preview.warnings.push('Activity name was not detected.')
    }

    if (!preview.projectFields.dga_planned_start_date || !preview.projectFields.dga_planned_end_date) {
      preview.warnings.push('Planned dates are incomplete.')
    }
  })

  return previews
}

function normalizeControlledRules(form: CreateActivityForm): CreateActivityForm {
  const nextForm = { ...form }

  if (nextForm.activityScope !== '1') {
    nextForm.strategies = []
  }

  if (nextForm.activityClassification === '576610002') {
    nextForm.budgetRequired = '1'
  }

  if (nextForm.budgetRequired === '0') {
    nextForm.procurementRequired = '0'
  }

  if (nextForm.adeoReported === '0') {
    nextForm.adeoProjectName = ''
    nextForm.adeoProjectDescription = ''
    nextForm.longTermImpact = ''
    nextForm.overallLongTermImpact = ''
    nextForm.stakeholder = ''
    nextForm.activityKpi = ''
    nextForm.activityPlan = ''
    nextForm.risks = ''
  }

  return nextForm
}

function validateForm(form: CreateActivityForm) {
  const errors: FieldErrors = {}
  const requiredFields: Array<keyof CreateActivityForm> = [
    'activityName',
    'activityType',
    'sectorName',
    'divisionName',
    'activityScope',
    'activityClassification',
    'activityLeadId',
    'plannedStartDate',
    'plannedEndDate',
    'scopeDescription',
    'summary',
    'adeoReported',
  ]

  if (form.activityClassification !== '576610002') {
    requiredFields.push('budgetRequired')
  }

  if (form.budgetRequired !== '0') {
    requiredFields.push('procurementRequired')
  }

  if (form.adeoReported === '1') {
    requiredFields.push(
      'adeoProjectName',
      'adeoProjectDescription',
      'longTermImpact',
      'overallLongTermImpact',
      'stakeholder',
      'activityKpi',
      'risks',
    )
  }

  function requiredMessage(field: keyof CreateActivityForm) {
    if (field === 'activityType') {
      return 'Select an Activity Type.'
    }

    if (field === 'activityScope') {
      return 'Choose Strategic or Operational Activity Scope.'
    }

    if (field === 'activityClassification') {
      return 'Choose an Activity Classification.'
    }

    if (field === 'budgetRequired') {
      return 'Select whether this project requires a budget.'
    }

    if (field === 'procurementRequired') {
      return 'Select whether this project requires procurement.'
    }

    if (field === 'adeoReported') {
      return 'Select whether this project is reported in ADEO.'
    }

    if (field === 'activityLeadId') {
      return 'Select an Activity Lead / PM Name.'
    }

    if (field === 'plannedStartDate') {
      return 'Select a Planned Start Date.'
    }

    if (field === 'plannedEndDate') {
      return 'Select a Planned End Date.'
    }

    return `Enter ${FIELD_LABELS[field] ?? 'this field'}.`
  }

  requiredFields.forEach((field) => {
    if (!String(form[field] ?? '').trim()) {
      errors[field] = requiredMessage(field)
    }
  })

  if (form.plannedStartDate && form.plannedEndDate) {
    if (form.plannedStartDate >= form.plannedEndDate) {
      errors.plannedStartDate = 'Planned Start Date must be earlier than Planned End Date.'
      errors.plannedEndDate = 'Planned End Date must be later than Planned Start Date.'
    }
  }

  return errors
}

function getRuntimeErrors(form: CreateActivityForm, fields: Array<keyof CreateActivityForm>) {
  const formErrors = validateForm(form)
  const nextErrors: FieldErrors = {}

  fields.forEach((field) => {
    if (formErrors[field]) {
      nextErrors[field] = formErrors[field]
    }
  })

  if (fields.includes('plannedStartDate') || fields.includes('plannedEndDate')) {
    if (formErrors.plannedStartDate) {
      nextErrors.plannedStartDate = formErrors.plannedStartDate
    }

    if (formErrors.plannedEndDate) {
      nextErrors.plannedEndDate = formErrors.plannedEndDate
    }
  }

  return nextErrors
}

function buildProjectType(activityType: ActivityTypeValue) {
  if (activityType === '1') {
    return 1
  }

  if (activityType === '2') {
    return 2
  }

  return 3
}

function serializeStrategies(strategies: StrategyValue[]) {
  return strategies.length > 0 ? strategies.join(',') : undefined
}

function buildProjectPayload(form: CreateActivityForm, context: ActivityContext): DgaAopProjectCreatePayload {
  return withoutUndefined({
    dga_activity_classification: Number(form.activityClassification) as Dga_aop_projectsesBase['dga_activity_classification'],
    'dga_activity_lead@odata.bind': toEntityBind('systemusers', form.activityLeadId),
    dga_activity_type: Number(form.activityType) as Dga_aop_projectsesBase['dga_activity_type'],
    dga_adeo_review_required: form.adeoReported === '1',
    'dga_department@odata.bind': toEntityBind('dga_divisional_hierarchies', context.division.dga_divisional_hierarchyid),
    dga_description_summary: form.summary,
    dga_does_this_project_require_procurement: form.procurementRequired
      ? Number(form.procurementRequired) as Dga_aop_projectsesBase['dga_does_this_project_require_procurement']
      : undefined,
    dga_doesthisprojectrequirebudgetallocation: form.budgetRequired
      ? Number(form.budgetRequired) as Dga_aop_projectsesBase['dga_doesthisprojectrequirebudgetallocation']
      : undefined,
    dga_longtermimpactprojectlongtermimpact: form.longTermImpact,
    dga_name: form.activityName.trim(),
    dga_planned_end_date: form.plannedEndDate,
    dga_planned_start_date: form.plannedStartDate,
    dga_project_activity_status: 776140014,
    dga_project_categorized_under: serializeStrategies(form.strategies),
    dga_project_description: form.adeoProjectDescription || form.scopeDescription,
    dga_project_kpi: form.activityKpi || undefined,
    dga_project_long_term_impact: form.overallLongTermImpact,
    dga_project_name: form.adeoProjectName || form.activityName.trim(),
    dga_project_phase: 776140000,
    dga_project_plan_if_any: form.activityPlan,
    'dga_project_planning_instance@odata.bind': toEntityBind('dga_project_planning_instances', context.planningInstance.dga_project_planning_instanceid),
    dga_project_type: buildProjectType(form.activityType as ActivityTypeValue),
    'dga_record_creator@odata.bind': toEntityBind('systemusers', context.currentUserId),
    'dga_record_creator_team@odata.bind': toEntityBind('teams', context.roleTeamId),
    dga_registered_or_will_be_registered_in_epm: form.activityClassification === '576610000',
    dga_risks: form.risks,
    dga_scope: form.scopeDescription,
    'dga_sector@odata.bind': toEntityBind('dga_divisional_hierarchies', context.sector.dga_divisional_hierarchyid),
    dga_stakeholders: form.stakeholder,
    dga_strategic_vs_operation: form.activityScope ? Number(form.activityScope) as Dga_aop_projectsesBase['dga_strategic_vs_operation'] : undefined,
    importsequencenumber: undefined,
    overriddencreatedon: undefined,
    'ownerid@odata.bind': toEntityBind('systemusers', context.currentUserId),
    statecode: 0,
    statuscode: 1,
    timezoneruleversionnumber: undefined,
    utcconversiontimezonecode: undefined,
  })
}

async function getDivisionMemberTeamId(planningInstance: Dga_project_planning_instances) {
  const existingTeamId = normalizeId(planningInstance._dga_division_member_team_value)

  if (existingTeamId) {
    return existingTeamId
  }

  if (!planningInstance.dga_project_planning_instanceid) {
    return ''
  }

  const result = await Dga_project_planning_instancesService.get(planningInstance.dga_project_planning_instanceid, {
    select: [
      'dga_project_planning_instanceid',
      '_dga_division_member_team_value',
    ],
  })
  assertOperationSuccess(result, 'Unable to load Division Member team for the planning instance.')

  return normalizeId(getResultValue<Dga_project_planning_instances>(result)?._dga_division_member_team_value)
}

async function assignActivityToDivisionMemberTeam(projectId: string, planningInstance: Dga_project_planning_instances) {
  const divisionMemberTeamId = await getDivisionMemberTeamId(planningInstance)

  if (!divisionMemberTeamId) {
    throw new Error('Division Member team could not be resolved from the current planning instance.')
  }

  const payload: OwnerAssignmentPayload = {
    'ownerid@odata.bind': toEntityBind('teams', divisionMemberTeamId),
  }

  console.log('Assign activity owner payload', payload)
  const result = await Dga_aop_projectsesService.update(projectId, payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>)
  assertOperationSuccess(result, 'Activity was created, but owner assignment to the Division Member team failed.')
}

function resolveCreationContext({
  allHierarchies,
  currentRole,
  currentRoleDivisionalHierarchy,
  planningInstances,
  selectedCycle,
  systemUser,
}: {
  allHierarchies: Dga_divisional_hierarchies[]
  currentRole: UserRole | null
  currentRoleDivisionalHierarchy: { hierarchyId: string } | null
  planningInstances: Dga_project_planning_instances[]
  selectedCycle: string
  systemUser: Systemusers | null
}): ActivityContext {
  if (!selectedCycle) {
    throw new Error('Select an assessment cycle before creating an activity.')
  }

  if (!systemUser?.systemuserid) {
    throw new Error('Current system user could not be resolved.')
  }

  if (!currentRole?.teamId) {
    throw new Error('Current role team could not be resolved.')
  }

  if (!currentRoleDivisionalHierarchy?.hierarchyId) {
    throw new Error('Current role divisional hierarchy could not be resolved.')
  }

  const division = allHierarchies.find(
    (hierarchy) => normalizeId(hierarchy.dga_divisional_hierarchyid) === normalizeId(currentRoleDivisionalHierarchy.hierarchyId),
  )

  if (!division?.dga_divisional_hierarchyid) {
    throw new Error('Current division could not be resolved from the selected role.')
  }

  const sector = division._dga_parent_divisional_hierarchy_value
    ? allHierarchies.find(
      (hierarchy) => normalizeId(hierarchy.dga_divisional_hierarchyid) === normalizeId(division._dga_parent_divisional_hierarchy_value),
    )
    : undefined

  if (!sector?.dga_divisional_hierarchyid) {
    throw new Error('Current sector could not be resolved from the selected division.')
  }

  const matchingPlanningInstances = planningInstances.filter(
    (instance) =>
      normalizeId(instance._dga_assessment_cycle_value) === normalizeId(selectedCycle) &&
      normalizeId(instance._dga_divisional_hierarchy_value) === normalizeId(division.dga_divisional_hierarchyid),
  )

  if (matchingPlanningInstances.length === 0) {
    throw new Error('No planning instance was found for the selected cycle and current division.')
  }

  if (matchingPlanningInstances.length > 1) {
    throw new Error('Multiple planning instances were found for the selected cycle and current division.')
  }

  return {
    currentUserId: systemUser.systemuserid,
    currentUserName: systemUser.fullname ?? systemUser.internalemailaddress ?? 'AOP - Division Member',
    ownerTeamId: currentRole.teamId,
    roleTeamId: currentRole.teamId,
    cycleId: selectedCycle,
    division,
    sector,
    planningInstance: matchingPlanningInstances[0],
  }
}

export function CreateActivity() {
  const navigate = useNavigate()
  const {
    assessmentCycles,
    planningInstances,
    planningInstancesCycleId,
    planningInstancesError,
    planningInstancesLoading,
    selectedCycle,
  } = useAppSelector((state) => state.app)
  const {
    currentRole,
    currentRoleDivisionalHierarchy,
    divisionalHierarchies: allHierarchies,
    systemUser,
  } = useAppSelector((state) => state.user)
  const activeTab: TabValue = 'manual'
  const [form, setForm] = useState<CreateActivityForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [context, setContext] = useState<ActivityContext | null>(null)
  const [activityLeadOptions, setActivityLeadOptions] = useState<SelectOption<string>[]>([])
  const [isContextLoading, setIsContextLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState('')
  const [creationWarning, setCreationWarning] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [isCopilotGenerating, setIsCopilotGenerating] = useState(false)
  const [copilotGenerationStatus, setCopilotGenerationStatus] = useState('')
  const [aiImportPhase, setAiImportPhase] = useState<AiImportPhase>('idle')
  const [aiMappingResponse, setAiMappingResponse] = useState<AiMappingResponse | null>(null)
  const [aiImportedActivities, setAiImportedActivities] = useState<AiImportedActivityPreview[]>([])
  const [selectedAiActivityIds, setSelectedAiActivityIds] = useState<string[]>([])
  const [expandedAiActivityIds, setExpandedAiActivityIds] = useState<string[]>([])
  const cycle = assessmentCycles.find((item) => item.dga_assessment_cycleid === selectedCycle)
  const isStrategic = form.activityScope === '1'
  const isPaymentOnly = form.activityClassification === '576610002'
  const isBudgetNo = form.budgetRequired === '0'
  const isAdeoVisible = form.adeoReported === '1'
  useEffect(() => {
    let isMounted = true

    async function loadContext() {
      setIsContextLoading(true)
      setErrors((currentErrors) => ({ ...currentErrors, context: undefined }))
      setContext(null)

      if (planningInstancesLoading || (selectedCycle && planningInstancesCycleId !== selectedCycle)) {
        return
      }

      try {
        if (planningInstancesError) {
          throw new Error(planningInstancesError)
        }

        const nextContext = resolveCreationContext({
          allHierarchies,
          currentRole,
          currentRoleDivisionalHierarchy,
          planningInstances,
          selectedCycle,
          systemUser,
        })

        const [usersResult] = await Promise.all([
          SystemusersService.getAll({
            select: ['systemuserid', 'fullname', 'internalemailaddress']
          }),
        ])

        if (!isMounted) {
          return
        }

        const users = getResultArray<Systemusers>(usersResult.data).filter((user) => !user.isdisabled)
        setContext(nextContext)
        setActivityLeadOptions(
          users.map((user) => ({
            label: user.fullname ?? user.internalemailaddress ?? 'Unnamed user',
            value: user.systemuserid,
            meta: user.internalemailaddress,
          })),
        )
        setForm({
          ...INITIAL_FORM,
          divisionId: nextContext.division.dga_divisional_hierarchyid,
          divisionName: nextContext.division.dga_name,
          sectorId: nextContext.sector.dga_divisional_hierarchyid,
          sectorName: nextContext.sector.dga_name,
        })
        resetAiImportState()
        setSuccessMessage('')
        setCreationWarning('')
        setCreatedProjectId('')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrors((currentErrors) => ({
          ...currentErrors,
          context: error instanceof Error ? error.message : 'Unable to load Create Activity context.',
        }))
      } finally {
        if (isMounted) {
          setIsContextLoading(false)
        }
      }
    }

    loadContext()

    return () => {
      isMounted = false
    }
  }, [
    allHierarchies,
    currentRole,
    currentRoleDivisionalHierarchy,
    planningInstances,
    planningInstancesCycleId,
    planningInstancesError,
    planningInstancesLoading,
    selectedCycle,
    systemUser,
  ])

  function updateForm(nextFields: Partial<CreateActivityForm>) {
    setSuccessMessage('')
    if (!createdProjectId) {
      setCreationWarning('')
    }
    const changedFields = Object.keys(nextFields) as Array<keyof CreateActivityForm>
    const normalizedForm = normalizeControlledRules({ ...form, ...nextFields })

    setForm(normalizedForm)
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      const allRuntimeErrors = validateForm(normalizedForm)
      const runtimeErrors = getRuntimeErrors(normalizedForm, changedFields)

      Object.keys(nextErrors).forEach((key) => {
        const field = key as keyof CreateActivityForm

        if (field in INITIAL_FORM && !allRuntimeErrors[field]) {
          delete nextErrors[field]
        }
      })

      changedFields.forEach((key) => {
        if (runtimeErrors[key]) {
          nextErrors[key] = runtimeErrors[key]
        } else {
          delete nextErrors[key]
        }
      })

      if (changedFields.includes('plannedStartDate') || changedFields.includes('plannedEndDate')) {
        if (runtimeErrors.plannedStartDate) {
          nextErrors.plannedStartDate = runtimeErrors.plannedStartDate
        } else {
          delete nextErrors.plannedStartDate
        }

        if (runtimeErrors.plannedEndDate) {
          nextErrors.plannedEndDate = runtimeErrors.plannedEndDate
        } else {
          delete nextErrors.plannedEndDate
        }
      }

      delete nextErrors.submit

      return nextErrors
    })
  }

  function toggleStrategy(strategy: StrategyValue) {
    const nextStrategies = form.strategies.includes(strategy)
      ? form.strategies.filter((item) => item !== strategy)
      : [...form.strategies, strategy]

    updateForm({ strategies: nextStrategies })
  }

  function addAttachments(files: FileList | File[]) {
    setAttachmentError('')
    setCopilotGenerationStatus('')
    setAiMappingResponse(null)
    setAiImportedActivities([])
    setSelectedAiActivityIds([])
    setExpandedAiActivityIds([])

    const [file] = Array.from(files)

    if (!file) {
      return
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachmentError(`${file.name} is larger than the 8 MB limit.`)
      setAttachments([])
      setAiImportPhase('error')
      return
    }

    if (!isXlsxFile(file)) {
      setAttachmentError(EXCEL_UPLOAD_ERROR)
      setAttachments([])
      setAiImportPhase('error')
      return
    }

    setAttachments([{
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: 'Excel workbook',
      file,
    }])
    setAiImportPhase('uploaded')
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addAttachments(event.target.files)
    }

    event.target.value = ''
  }

  function resetAiImportState() {
    setAttachments([])
    setAttachmentError('')
    setCopilotGenerationStatus('')
    setAiImportPhase('idle')
    setAiMappingResponse(null)
    setAiImportedActivities([])
    setSelectedAiActivityIds([])
    setExpandedAiActivityIds([])
  }

  async function createCopilotDraft() {
    const [attachment] = attachments

    if (!attachment) {
      setAttachmentError('Upload an Excel .xlsx file before creating an AI draft preview.')
      setAiImportPhase('error')
      return
    }

    setAttachmentError('')
    setAiMappingResponse(null)
    setAiImportedActivities([])
    setSelectedAiActivityIds([])
    setExpandedAiActivityIds([])
    setIsCopilotGenerating(true)
    setAiImportPhase('processing')
    setCopilotGenerationStatus('Reading workbook...')

    try {
      const convertedFile = await convertExcelFileToCsv(attachment.file)
      setCopilotGenerationStatus('Analyzing headers...')
      const payload: RetrieveAopProjectDataFromExcelInput = {
        file: {
          name: convertedFile.name,
          contentBytes: convertedFile.contentBytes,
          mimeType: convertedFile.mimeType,
        },
      }
      const result = await PowerApps_V2__RetrieveAOPProjectDatafromExcelService.Run(
        payload as Parameters<typeof PowerApps_V2__RetrieveAOPProjectDatafromExcelService.Run>[0],
      )
      console.log('Create activity AI draft converted payload', {
        fileName: convertedFile.name,
        mimeType: convertedFile.mimeType,
        tableCount: convertedFile.tables.length,
      })
      assertOperationSuccess(result, 'AI Assistant could not process the uploaded Excel file.')
      console.log('Create activity AI draft response', result)
      setCopilotGenerationStatus('Preparing draft preview...')
      const mappingResponse = parseAiMappingResponse(result)
      const previews = buildImportedActivityPreviews(convertedFile.tables, mappingResponse)

      if (previews.length === 0) {
        throw new Error('No project-like activity data was found in the uploaded Excel file. Please include a Project Details section or a project table with activity fields.')
      }

      setAiMappingResponse(mappingResponse)
      setAiImportedActivities(previews)
      setExpandedAiActivityIds(previews.slice(0, 1).map((preview) => preview.id))
      setAiImportPhase('ready')
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'AI Assistant could not process the uploaded Excel file.')
      setAiImportPhase('error')
    } finally {
      setIsCopilotGenerating(false)
      setCopilotGenerationStatus('')
    }
  }

  function removeAttachment(attachmentId: string) {
    setAttachments((currentAttachments) => currentAttachments.filter((item) => item.id !== attachmentId))
    setAiImportPhase('idle')
    setAiMappingResponse(null)
    setAiImportedActivities([])
    setSelectedAiActivityIds([])
    setExpandedAiActivityIds([])
  }

  function renderAttachmentList(className = '') {
    if (attachments.length === 0) {
      return null
    }

    return (
      <div className={className ? `copilot-attachments ${className}` : 'copilot-attachments'}>
        {attachments.map((attachment) => (
          <div className="copilot-attachment" key={attachment.id}>
            <Paperclip size={15} />
            <div>
              <strong>{attachment.name}</strong>
              <span>{formatFileSize(attachment.size)} · {attachment.type}</span>
            </div>
            <button
              aria-label={`Remove ${attachment.name}`}
              onClick={() => removeAttachment(attachment.id)}
              type="button"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    )
  }

  function toggleAiActivitySelection(activityId: string) {
    setSelectedAiActivityIds((currentIds) => currentIds.includes(activityId)
      ? currentIds.filter((id) => id !== activityId)
      : [...currentIds, activityId])
  }

  function toggleAiActivityExpanded(activityId: string) {
    setExpandedAiActivityIds((currentIds) => currentIds.includes(activityId)
      ? currentIds.filter((id) => id !== activityId)
      : [...currentIds, activityId])
  }

  function toggleSelectAllAiActivities() {
    setSelectedAiActivityIds((currentIds) => currentIds.length === aiImportedActivities.length
      ? []
      : aiImportedActivities.map((activity) => activity.id))
  }

  function handleImportAsDraft() {
    if (selectedAiActivityIds.length === 0) {
      return
    }

    setSuccessMessage(`${selectedAiActivityIds.length} draft activity preview${selectedAiActivityIds.length === 1 ? '' : 's'} selected. Draft creation will be enabled in the next step.`)
  }

  function renderMappingSummary() {
    if (!aiMappingResponse?.mapping) {
      return null
    }

    const foundCount = getFoundMappingCount(aiMappingResponse.mapping)
    const missingCount = getMissingMappingCount(aiMappingResponse.mapping)

    return (
      <div className="copilot-import__mapping">
        <div className="copilot-import__mapping-header">
          <div>
            <span>AI Header Mapping</span>
            <strong>{foundCount} fields detected</strong>
          </div>
          <span>{missingCount} not detected</span>
        </div>
        <div className="copilot-import__mapping-grid">
          {AI_IMPORT_SECTIONS.map((section) => {
            const found = getFoundMappings(aiMappingResponse.mapping, section)
            const missing = (aiMappingResponse.mapping?.[section] ?? []).length - found.length

            return (
              <div className="copilot-import__mapping-card" key={section}>
                <strong>{AI_SECTION_LABELS[section]}</strong>
                <span>{found.length} found · {Math.max(0, missing)} missing</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderFieldPairs(fields: Record<string, string>, limit?: number) {
    const entries = Object.entries(fields).filter(([, value]) => value)
    const visibleEntries = typeof limit === 'number' ? entries.slice(0, limit) : entries

    if (visibleEntries.length === 0) {
      return <span className="copilot-import__empty-text">No mapped values found.</span>
    }

    return (
      <div className="copilot-import__field-grid">
        {visibleEntries.map(([logicalName, value]) => (
          <div key={logicalName}>
            <span>{formatLogicalName(logicalName)}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    )
  }

  function renderChildSection(activity: AiImportedActivityPreview, section: Exclude<AiMappingSection, 'project'>) {
    const records = activity.children[section]

    return (
      <div className="copilot-import__child-section" key={section}>
        <div className="copilot-import__child-section-header">
          <strong>{AI_SECTION_LABELS[section]}</strong>
          <span>{records.length}</span>
        </div>
        {records.length > 0 ? (
          <div className="copilot-import__child-list">
            {records.map((record) => (
              <div className="copilot-import__child-record" key={record.id}>
                <strong>{record.title}</strong>
                {renderFieldPairs(record.fields, 4)}
              </div>
            ))}
          </div>
        ) : (
          <span className="copilot-import__empty-text">No {AI_SECTION_LABELS[section].toLowerCase()} detected for this row.</span>
        )}
      </div>
    )
  }

  function renderAiImportedActivity(activity: AiImportedActivityPreview) {
    const isSelected = selectedAiActivityIds.includes(activity.id)
    const isExpanded = expandedAiActivityIds.includes(activity.id)
    const childCount = AI_CHILD_SECTIONS.reduce((count, section) => count + activity.children[section].length, 0)

    return (
      <article className={isSelected ? 'copilot-import__activity copilot-import__activity--selected' : 'copilot-import__activity'} key={activity.id}>
        <div className="copilot-import__activity-main">
          <Checkbox
            checked={isSelected}
            label=""
            onChange={() => toggleAiActivitySelection(activity.id)}
          />
          <button
            aria-label={isExpanded ? `Collapse ${activity.title}` : `Expand ${activity.title}`}
            className="copilot-import__expand"
            onClick={() => toggleAiActivityExpanded(activity.id)}
            type="button"
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          <button className="copilot-import__activity-title" onClick={() => toggleAiActivityExpanded(activity.id)} type="button">
            <strong>{activity.title}</strong>
            <span>{activity.sheetName} · Table {activity.sourceTable} · Row {activity.rowIndex}</span>
          </button>
          <div className="copilot-import__activity-meta">
            <span>{activity.dataQuality.detectedFields} fields</span>
            <span>{childCount} child section{childCount === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="copilot-import__activity-quick">
          {renderFieldPairs({
            dga_sector: activity.projectFields.dga_sector,
            dga_department: activity.projectFields.dga_department,
            dga_planned_start_date: activity.projectFields.dga_planned_start_date,
            dga_planned_end_date: activity.projectFields.dga_planned_end_date,
            dga_does_this_project_require_procurement: activity.projectFields.dga_does_this_project_require_procurement,
            dga_doesthisprojectrequirebudgetallocation: activity.projectFields.dga_doesthisprojectrequirebudgetallocation,
          })}
        </div>
        {activity.warnings.length > 0 ? (
          <div className="copilot-import__warnings">
            {activity.warnings.map((warning) => (
              <span key={warning}>{warning}</span>
            ))}
          </div>
        ) : null}
        {isExpanded ? (
          <div className="copilot-import__activity-details">
            <div className="copilot-import__project-details">
              <strong>Activity Details</strong>
              {renderFieldPairs(activity.projectFields)}
            </div>
            <div className="copilot-import__child-grid">
              {AI_CHILD_SECTIONS.map((section) => renderChildSection(activity, section))}
            </div>
          </div>
        ) : null}
      </article>
    )
  }

  function renderAiImportResults() {
    if (aiImportPhase !== 'ready') {
      return null
    }

    const allSelected = aiImportedActivities.length > 0 && selectedAiActivityIds.length === aiImportedActivities.length

    return (
      <div className="copilot-import__results">
        {renderMappingSummary()}
        <div className="copilot-import__results-toolbar">
          <div>
            <span>Draft Preview</span>
            <strong>{aiImportedActivities.length} activit{aiImportedActivities.length === 1 ? 'y' : 'ies'} extracted</strong>
          </div>
          <div className="copilot-import__results-actions">
            <Checkbox
              checked={allSelected}
              label="Select all"
              onChange={toggleSelectAllAiActivities}
            />
            <Button disabled={selectedAiActivityIds.length === 0} icon={<CheckCircle2 size={16} />} onClick={handleImportAsDraft}>
              Import as Draft
            </Button>
          </div>
        </div>
        <div className="copilot-import__activity-list">
          {aiImportedActivities.map(renderAiImportedActivity)}
        </div>
      </div>
    )
  }

  function scrollToFirstInvalidField() {
    window.requestAnimationFrame(() => {
      const invalidField = document.querySelector<HTMLElement>(
        ".create-activity__manual-form [aria-invalid='true']:not(:disabled), .create-activity__manual-form .radio-group--invalid input:not(:disabled)",
      )

      if (!invalidField) {
        return
      }

      invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      invalidField.focus({ preventScroll: true })
    })
  }

  async function validateUniqueActivityName() {
    if (!form.activityName.trim()) {
      return true
    }

    const filterParts = [`dga_name eq '${escapeODataValue(form.activityName.trim())}'`]
    const cyclePlanningInstanceIds = planningInstances
      .filter((item) => normalizeId(item._dga_assessment_cycle_value) === normalizeId(context?.cycleId))
      .map((item) => item.dga_project_planning_instanceid)
      .filter(Boolean)

    if (cyclePlanningInstanceIds.length === 0) {
      return false
    }

    filterParts.push(`(${cyclePlanningInstanceIds.map((id) => `_dga_project_planning_instance_value eq ${id}`).join(' or ')})`)

    const result = await Dga_aop_projectsesService.getAll({
      select: ['dga_aop_projectsid', 'dga_name'],
      filter: filterParts.join(' and '),
      top: 1,
    })
    const matches = getResultArray<Dga_aop_projectses>(result)

    return matches.length === 0
  }

  async function saveDraft() {
    if (isSaving) {
      return
    }

    if (createdProjectId) {
      navigate(`${APP_ROUTE_PATHS.editActivity}?id=${createdProjectId}`)
      return
    }

    setSuccessMessage('')
    setCreationWarning('')
    const nextErrors = validateForm(form)

    if (!context) {
      nextErrors.context = 'Create Activity context is not loaded.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      scrollToFirstInvalidField()
      return
    }

    setIsSaving(true)

    try {
      const isUnique = await validateUniqueActivityName()

      if (!isUnique) {
        setErrors({ activityName: 'Activity Name must be unique within the selected cycle.' })
        scrollToFirstInvalidField()
        return
      }

      const projectPayload = buildProjectPayload(form, context!)
      console.log('Create activity payload', projectPayload)
      const projectResult = await Dga_aop_projectsesService.create(projectPayload as unknown as Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>)
      assertOperationSuccess(projectResult, 'Unable to save activity draft.')

      const createdProject = getResultValue<Dga_aop_projectses>(projectResult)
      const projectId = createdProject?.dga_aop_projectsid

      if (!projectId) {
        throw new Error('Activity was created, but the created record id was not returned.')
      }

      setCreatedProjectId(projectId)
      await assignActivityToDivisionMemberTeam(projectId, context!.planningInstance)
      
      setSuccessMessage('Activity created successfully.')
      navigate(`${APP_ROUTE_PATHS.editActivity}?id=${projectId}`)
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Unable to save activity draft.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isContextLoading) {
    return (
      <div className="create-activity" aria-label="Loading Create Activity context...">
        {/* Hero header skeleton */}
        <header className="create-activity__hero create-activity__hero--skeleton" aria-hidden="true">
          <div className="create-activity__hero-body">
            <div className="skeleton-icon-box skeleton-shimmer" />
            <div className="create-activity__hero-content">
              <div className="skeleton-line skeleton-shimmer" style={{ width: '28%', height: '0.7rem', marginBottom: '0.15rem' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '45%', height: '1.5rem', marginBottom: '0.15rem' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '65%', height: '0.85rem' }} />
            </div>
            <div className="skeleton-pills">
              <div className="skeleton-pill skeleton-shimmer" />
              <div className="skeleton-pill skeleton-shimmer" />
            </div>
          </div>
          <div className="create-activity__hero-footer">
            <div className="create-activity__hero-chips">
              <span className="skeleton-chip skeleton-shimmer" />
              <span className="skeleton-chip skeleton-shimmer" />
              <span className="skeleton-chip skeleton-shimmer" />
            </div>
            <div className="skeleton-button skeleton-shimmer" />
          </div>
        </header>

        {/* Two-column layout skeleton */}
        <div className="create-activity__manual-layout">
          <div className="create-activity__manual-form">
            {/* Form card skeleton */}
            <div className="card create-activity__section create-activity__section--skeleton" aria-hidden="true">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <div className="skeleton-section-icon skeleton-shimmer" />
                  <div>
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '0.65rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '55%', height: '0.95rem' }} />
                  </div>
                </div>
              </div>
              <div className="create-activity__form-stack">
                {/* 2-column row */}
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '35%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '45%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                {/* 2-column row */}
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '25%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                {/* Radio group row */}
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                </div>
                {/* Radio group row */}
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '38%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                </div>
                {/* 3-column row */}
                <div className="create-activity__form-row create-activity__form-row--three">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '55%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '60%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                </div>
                {/* Select row */}
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                {/* Date range row */}
                <div className="create-activity__date-range">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                  <div className="skeleton-date-connector skeleton-shimmer" />
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '38%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                {/* 2-column textarea row */}
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-textarea skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-textarea skeleton-shimmer" />
                  </div>
                </div>
              </div>
            </div>

            {/* Second card skeleton */}
            <div className="card create-activity__section create-activity__section--skeleton" aria-hidden="true">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <div className="skeleton-section-icon skeleton-shimmer" />
                  <div>
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '35%', height: '0.65rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '48%', height: '0.95rem' }} />
                  </div>
                </div>
              </div>
              <div className="create-activity__form-stack">
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '35%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-textarea skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '42%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-textarea skeleton-shimmer" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="create-activity">
      {activeTab === 'manual' ? (
        <header className="create-activity__hero">
          <nav aria-label="Breadcrumb" className="create-activity__breadcrumb">
            <Link to={APP_ROUTE_PATHS.dashboard}>Dashboard</Link>
            <ChevronRight aria-hidden="true" size={14} />
            <span>Create Activity</span>
          </nav>
          <div className="create-activity__hero-top">
            <div className="create-activity__hero-body">
              <div className="create-activity__hero-icon" aria-hidden="true">
                <FileText size={22} />
              </div>
              <div className="create-activity__hero-content">
                <h1>{form.activityName.trim() || 'New Activity'}</h1>
                <p>{cycle?.dga_name ?? 'Loading...'} &mdash; Activity planning for the Digital Connect Annual Operating Plan.</p>
              </div>
            </div>
            <dl className="create-activity__organization-context">
              <div>
                <dt>Sector</dt>
                <dd title={form.sectorName}>{form.sectorName || 'Loading...'}</dd>
              </div>
              <div>
                <dt>Division</dt>
                <dd title={form.divisionName}>{form.divisionName || 'Loading...'}</dd>
              </div>
            </dl>
          </div>

          <div className="create-activity__hero-footer">
            <div className="create-activity__hero-chips">
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Status</span>
                <Badge>Draft</Badge>
              </span>
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Phase</span>
                <Badge tone="info">Planning</Badge>
              </span>
            </div>
            <div className="create-activity__hero-actions">
              <Button disabled={isSaving || Boolean(errors.context)} icon={<Save size={16} />} onClick={saveDraft}>
                {isSaving ? 'Saving...' : createdProjectId ? 'Open Created Activity' : 'Save Draft'}
              </Button>
            </div>
          </div>
        </header>
      ) : null}

      {errors.context ? (
        <EmptyState
          action={
            <Button icon={<RefreshCcw size={16} />} onClick={() => window.location.reload()} variant="secondary">
              Refresh
            </Button>
          }
          description={errors.context}
          title="Create Activity context unavailable"
        />
      ) : null}

      {successMessage ? <div className="create-activity__notice create-activity__notice--success">{successMessage}</div> : null}
      {creationWarning ? (
        <div className="create-activity__notice create-activity__notice--warning">
          <span>{creationWarning}</span>
          <Button onClick={() => navigate(`${APP_ROUTE_PATHS.editActivity}?id=${createdProjectId}`)} variant="secondary">
            Open Created Activity
          </Button>
        </div>
      ) : null}
      {errors.submit ? <div className="create-activity__notice create-activity__notice--error">{errors.submit}</div> : null}

      {activeTab === 'manual' ? (
        <TooltipProvider>
        <div className="create-activity__manual-layout"><div className="create-activity__manual-form"><div className="create-activity__card-grid">
          <div className="create-activity__card-column create-activity__card-column--left">
          <Card className="create-activity__section create-activity__section--grid-card create-activity__section--overview">
            <div className="create-activity__section-header"><div className="create-activity__section-header-inner"><span className="create-activity__section-header-icon" aria-hidden="true"><ClipboardList size={17} /></span><div><h2>Overview</h2><p>Define the activity, its scope, and strategic alignment.</p></div></div></div>
            <div className="create-activity__form-stack">
              <Select error={errors.activityType} id="activity-type" label="Activity Type" onChange={(value) => updateForm({ activityType: value })} options={ACTIVITY_TYPE_OPTIONS} required tooltip={CREATE_ACTIVITY_TOOLTIPS.activityType} value={form.activityType} />
              <Input error={errors.activityName} label="Activity / Initiative Name" onChange={(event) => updateForm({ activityName: event.target.value })} placeholder="Enter activity name" required tooltip={CREATE_ACTIVITY_TOOLTIPS.activityName} value={form.activityName} />
              <RadioGroup className="create-activity__radio create-activity__radio--scope" error={errors.activityScope} label="Activity Scope" name="activity-scope" onChange={(value) => updateForm({ activityScope: value })} options={ACTIVITY_SCOPE_OPTIONS.filter((option) => option.value !== '')} required tooltip={CREATE_ACTIVITY_TOOLTIPS.activityScope} value={form.activityScope} />
              {isStrategic ? <fieldset className="checkbox-group create-activity__strategy-group"><legend className="field__label field__label--with-tooltip">What strategy is this project/activity categorized under?<Tooltip content={CREATE_ACTIVITY_TOOLTIPS.strategies} label="More information about strategy categorization" /></legend><div className="checkbox-group__options">{STRATEGY_OPTIONS.map((option) => <Checkbox checked={form.strategies.includes(option.value)} key={option.value} label={option.label} onChange={() => toggleStrategy(option.value)} />)}</div>{errors.strategies ? <span className="field__error">{errors.strategies}</span> : null}</fieldset> : null}
            </div>
          </Card>
          <Card className="create-activity__section create-activity__section--grid-card create-activity__section--timeline">
            <div className="create-activity__section-header"><div className="create-activity__section-header-inner"><span className="create-activity__section-header-icon" aria-hidden="true"><CalendarDays size={17} /></span><div><h2>Activity Timeline</h2><p>Set the planned start and end dates for this activity.</p></div></div></div>
            <div className="create-activity__form-stack"><div className="create-activity__date-range" role="group" aria-label="Activity timeline">
              <DatePicker error={errors.plannedStartDate} id="planned-start-date" label="Planned Start Date" onChange={(value) => updateForm({ plannedStartDate: value })} required tooltip={CREATE_ACTIVITY_TOOLTIPS.plannedStartDate} value={form.plannedStartDate} />
              <span className="create-activity__date-connector" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg></span>
              <DatePicker error={errors.plannedEndDate} id="planned-end-date" label="Planned End Date" min={form.plannedStartDate} onChange={(value) => updateForm({ plannedEndDate: value })} required tooltip={CREATE_ACTIVITY_TOOLTIPS.plannedEndDate} value={form.plannedEndDate} />
            </div></div>
          </Card>
          <Card className="create-activity__section create-activity__section--grid-card create-activity__section--scope-summary">
            <div className="create-activity__section-header"><div className="create-activity__section-header-inner"><span className="create-activity__section-header-icon" aria-hidden="true"><AlignLeft size={17} /></span><div><h2>Scope &amp; Summary</h2><p>Describe the activity boundaries and expected outcome.</p></div></div></div>
            <div className="create-activity__form-stack">
              <Textarea error={errors.scopeDescription} label="Scope" onChange={(event) => updateForm({ scopeDescription: event.target.value })} placeholder="Describe in-scope and out-of-scope boundaries" required tooltip={CREATE_ACTIVITY_TOOLTIPS.scope} value={form.scopeDescription} />
              <Textarea error={errors.summary} label="Summary" onChange={(event) => updateForm({ summary: event.target.value })} placeholder="Summarize the expected outcome" required tooltip={CREATE_ACTIVITY_TOOLTIPS.summary} value={form.summary} />
            </div>
          </Card>
          </div>
          <div className="create-activity__card-column create-activity__card-column--right">
          <Card className="create-activity__section create-activity__section--grid-card create-activity__section--activity-details">
            <div className="create-activity__section-header"><div className="create-activity__section-header-inner"><span className="create-activity__section-header-icon" aria-hidden="true"><Settings2 size={17} /></span><div><h2>Activity Details</h2><p>Confirm classification, ownership, and reporting requirements.</p></div></div></div>
            <div className="create-activity__form-stack">
              <RadioGroup className="create-activity__radio create-activity__radio--classification" error={errors.activityClassification} label="Activity Classification" name="activity-classification" onChange={(value) => updateForm({ activityClassification: value })} options={CLASSIFICATION_OPTIONS.filter((option) => option.value !== '')} required tooltip={CREATE_ACTIVITY_TOOLTIPS.activityClassification} value={form.activityClassification} />
              {!isPaymentOnly ? <RadioGroup className="create-activity__radio create-activity__radio--yes-no" error={errors.budgetRequired} label="Does this project require Budget?" name="budget-required" onChange={(value) => updateForm({ budgetRequired: value })} options={YES_NO_OPTIONS.filter((option) => option.value !== '')} required tooltip={CREATE_ACTIVITY_TOOLTIPS.budgetRequired} value={form.budgetRequired} /> : <RadioGroup className="create-activity__radio create-activity__radio--yes-no" disabled label="Does this project require Budget?" name="budget-required" onChange={() => undefined} options={YES_NO_OPTIONS.filter((option) => option.value !== '')} required tooltip={CREATE_ACTIVITY_TOOLTIPS.paymentOnlyWarning} tooltipTone="warning" value="1" />}
              {isBudgetNo ? <RadioGroup className="create-activity__radio create-activity__radio--yes-no" disabled label="Does this project require procurement?" name="procurement-required" onChange={() => undefined} options={YES_NO_OPTIONS.filter((option) => option.value !== '')} required tooltip={CREATE_ACTIVITY_TOOLTIPS.budgetNoWarning} tooltipTone="warning" value="0" /> : <RadioGroup className="create-activity__radio create-activity__radio--yes-no" error={errors.procurementRequired} label="Does this project require procurement?" name="procurement-required" onChange={(value) => updateForm({ procurementRequired: value })} options={YES_NO_OPTIONS.filter((option) => option.value !== '')} required tooltip={CREATE_ACTIVITY_TOOLTIPS.procurementRequired} value={form.procurementRequired} />}
              <RadioGroup className="create-activity__radio create-activity__radio--yes-no" error={errors.adeoReported} label="Execution plan project reported in ADEO" name="adeo-reported" onChange={(value) => updateForm({ adeoReported: value })} options={YES_NO_OPTIONS.filter((option) => option.value !== '')} required tooltip={CREATE_ACTIVITY_TOOLTIPS.adeoReported} value={form.adeoReported} />
              <Select className="create-activity__activity-details-full-row" error={errors.activityLeadId} id="activity-lead" label="Activity Lead / PM Name" onChange={(value) => updateForm({ activityLeadId: value })} options={activityLeadOptions.length > 0 ? [{ label: 'Select Activity Lead', value: '' }, ...activityLeadOptions] : [{ label: 'No users available', value: '' }]} required tooltip={CREATE_ACTIVITY_TOOLTIPS.activityLead} value={form.activityLeadId || ''} />
            </div>
          </Card>
          {isAdeoVisible ? <Card className="create-activity__section create-activity__section--grid-card create-activity__section--adeo">
            <div className="create-activity__section-header"><div className="create-activity__section-header-inner"><span className="create-activity__section-header-icon" aria-hidden="true"><FileText size={17} /></span><div><h2>ADEO Activity Overview</h2><p>Capture the ADEO reporting details required for this activity.</p></div></div></div>
            <div className="create-activity__form-stack">
              <Input error={errors.adeoProjectName} label="اسم المشروع" onChange={(event) => updateForm({ adeoProjectName: event.target.value })} placeholder="أدخل اسم المشروع" required value={form.adeoProjectName} />
              <Input error={errors.adeoProjectDescription} label="وصف المشروع" onChange={(event) => updateForm({ adeoProjectDescription: event.target.value })} placeholder="أدخل وصفاً مختصراً للمشروع" required value={form.adeoProjectDescription} />
              <Textarea error={errors.longTermImpact} label="Long Term Impact" onChange={(event) => updateForm({ longTermImpact: event.target.value })} placeholder="Describe the expected long-term impact of this activity" required value={form.longTermImpact} />
              <Textarea error={errors.overallLongTermImpact} label="طويلة المدى / اهداف المشروع العامة" onChange={(event) => updateForm({ overallLongTermImpact: event.target.value })} placeholder="اكتب الأهداف العامة طويلة المدى للمشروع" required value={form.overallLongTermImpact} />
              <Input error={errors.stakeholder} label="Stakeholder" onChange={(event) => updateForm({ stakeholder: event.target.value })} placeholder="Enter the primary stakeholder or entity" required value={form.stakeholder} />
              <Input error={errors.activityKpi} label="Activity KPI" onChange={(event) => updateForm({ activityKpi: event.target.value })} placeholder="Enter the KPI used to measure success" required value={form.activityKpi} />
              <Input label="Activity Plan (If any)" onChange={(event) => updateForm({ activityPlan: event.target.value })} placeholder="Enter the activity plan reference, if available" value={form.activityPlan} />
              <Textarea error={errors.risks} label="Risks" onChange={(event) => updateForm({ risks: event.target.value })} placeholder="Describe key risks, dependencies, or mitigation needs" required value={form.risks} />
            </div>
          </Card> : null}
          </div>
        </div></div></div>
        </TooltipProvider>
      ) : (
       <div className="create-activity__copilot">
          <section className="copilot-assistant">
            <div className="copilot-assistant__hero">
              <div className="copilot-assistant__icons" aria-hidden="true">
                <Sparkles size={30} />
                <Bot size={28} />
                <FileSpreadsheet size={20} />
              </div>
              <h2>Create AOP Activity using AI.</h2>
              <p>
                Upload an Excel file relevant to AOP. AI will detect matching headers, map them to AOP fields,
                and prepare a draft import preview for your review.
              </p>
            </div>

            <div className="copilot-import">
              <div className="copilot-import__upload">
                <div className="copilot-import__upload-icon">
                  <UploadCloud size={32} />
                </div>
                <div>
                  <strong>Upload Excel file relevant to AOP</strong>
                  <p>Use a workbook with activity rows. Multiple sheets and tables are supported.</p>
                </div>
                <label className="copilot-import__upload-button">
                  <FileSpreadsheet size={16} />
                  Choose Excel File
                  <input accept=".xlsx" onChange={handleFileInput} type="file" />
                </label>
              </div>

              {renderAttachmentList('copilot-import__attachments')}

              <div className="copilot-import__steps">
                {[
                  { label: 'Reading workbook', active: aiImportPhase === 'processing' },
                  { label: 'Converting to CSV', active: aiImportPhase === 'processing' },
                  { label: 'Analyzing headers', active: aiImportPhase === 'processing' },
                  { label: 'Preparing draft preview', active: aiImportPhase === 'ready' },
                ].map((step, index) => (
                  <div className={step.active ? 'copilot-import__step copilot-import__step--active' : 'copilot-import__step'} key={step.label}>
                    <span>{index + 1}</span>
                    <strong>{step.label}</strong>
                  </div>
                ))}
              </div>

              {attachmentError ? <span className="field__error copilot-assistant__error">{attachmentError}</span> : null}

              <div className="copilot-import__actions">
                <Button disabled={attachments.length === 0 || isCopilotGenerating} icon={<Send size={16} />} onClick={createCopilotDraft}>
                  {isCopilotGenerating ? copilotGenerationStatus || 'Preparing draft preview...' : 'Create Draft Preview'}
                </Button>
                {attachments.length > 0 ? (
                  <Button disabled={isCopilotGenerating} onClick={resetAiImportState} variant="secondary">
                    Reset Upload
                  </Button>
                ) : null}
              </div>

              {renderAiImportResults()}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
