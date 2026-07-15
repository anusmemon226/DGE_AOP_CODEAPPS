export type EditActivityOperationAlertKind = 'processing' | 'success' | 'error'

export type EditActivityOperationAlertPayload = {
  kind: EditActivityOperationAlertKind
  message?: string
  title: string
}

export type EditActivityOperationNotifier = (payload: EditActivityOperationAlertPayload | null) => void
