import { request } from '../http'

export type Category = 'LEAVE' | 'EXPENSE' | 'PURCHASE' | 'SEAL' | 'OTHER'
export type BusinessPage = string
export type FieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'BOOLEAN'
export type Status = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'WITHDRAWN' | 'CANCELLED' | 'TERMINATED'
export type Action = 'START' | 'APPROVE' | 'REJECT' | 'WITHDRAW' | 'CANCEL' | 'TRANSFER'
  | 'ADD_SIGN' | 'SIGN_APPROVE' | 'RETURN' | 'COMMENT' | 'ATTACH' | 'REMIND' | 'CC'
  | 'FORCE_APPROVE' | 'FORCE_REJECT' | 'TERMINATE' | 'ASSIGN' | 'MOVE' | 'SAVE_DRAFT' | 'DELETE'
  | 'RESUBMIT' | 'RESTART'
export type Operation = Exclude<Action, 'START' | 'SIGN_APPROVE' | 'SAVE_DRAFT'> | 'EDIT' | 'MARK_READ'
export type Inbox = 'MINE' | 'TODO' | 'DONE' | 'CC' | 'REMIND' | 'ALL' | 'ENDED'

export interface PageConfig {
  code: string
  name: string
  component: string
  routePath: string
  enabled: boolean
  sortOrder: number
}

export interface Command {
  operation: Operation
  taskId?: string | null
  userId?: string | null
  nodeId?: string | null
  comment?: string
}

export interface Choice {
  value: string
  label: string
}

export type FieldValue = string | number | boolean | null

export interface Field {
  key: string
  label: string
  type: FieldType
  required: boolean
}

export interface ModelSummary {
  id: string
  processKey: string
  name: string
  category: Category
  description: string
  revision: number
  publishedRevision: number | null
  publishedVersion: number | null
  definitionId: string | null
  updatedAt: string
}

export type CallbackStatus = Exclude<Status, 'DRAFT'>

export interface StatusCallback {
  statusMapping: Partial<Record<CallbackStatus, number>>
  operationEndpoints?: Partial<Record<Action, string>>
}

export interface Draft {
  model: ModelSummary
  xml: string
  fields: Field[]
  businessPage: BusinessPage | null
  restoredPageConfig: PageConfig | null
  statusCallback?: StatusCallback | null
}

export interface ModelForm {
  name: string
  category: Category
  description: string
  xml: string
  fields: Field[]
  revision: number | null
  businessPage: BusinessPage | null
  statusCallback: StatusCallback | null
}

export interface Definition {
  id: string
  modelId: string
  processKey: string
  name: string
  category: Category
  description: string
  version: number
  fields: Field[]
  businessPage: BusinessPage | null
  pageConfig: PageConfig | null
  statusCallback?: StatusCallback | null
}

export interface ModelVersion {
  version: number
  name: string
  publishedAt: string
  current: boolean
}

export interface ModelVersions {
  draftRevision: number
  unpublishedChanges: boolean
  versions: Page<ModelVersion>
}

export interface ModelVersionDetail {
  definition: Definition
  xml: string
}

export interface StartForm {
  definitionId: string
  requestId: string
  title: string
  businessNo: string
  values: Record<string, FieldValue>
}

export interface Instance {
  id: string
  definitionId: string
  definitionVersion: number
  definitionName: string
  category: Category
  title: string
  businessNo: string
  applicantId: string
  applicantName: string
  status: Status
  startedAt: string
  finishedAt: string | null
  taskId: string | null
  taskName: string | null
  unread: number | null
  listOperations: Operation[]
  inboxAt: string | null
  activityComment: string | null
  activityAction: Action | null
}

export interface OrderItem {
  sku: string
  name: string
  quantity: number
  price: number
}

export interface OrderApproval {
  instanceId: string | null
  status: Status | null
}

export interface Order {
  customer: string
  department: string
  date: string
  deliveryDate: string | null
  contact: string
  phone: string
  address: string
  note: string
  items: OrderItem[]
}

export interface Activity {
  id: string
  name: string | null
  type: string
  active: boolean
  cancelled: boolean
  startedAt: string
  endedAt: string | null
}

export interface Detail {
  instance: Instance
  values: Record<string, FieldValue>
  fields: Field[]
  xml: string
  activities: Activity[]
  actions: {
    taskName: string | null
    actorId: string
    actorName: string
    action: Action
    comment: string
    createdAt: string
  }[]
  canApprove: boolean
  canWithdraw: boolean
  businessPage: BusinessPage | null
  pageConfig: PageConfig | null
  operations: Operation[]
  attachments: { id: string, name: string, size: number }[]
  moveTargets: Choice[]
  sourceId: string | null
  order?: Order | null
  callbackDelivery?: {
    state: 'PENDING' | 'RETRYING' | 'DELIVERED'
    attempts: number
    nextAttemptAt: string | null
    deliveredAt: string | null
  } | null
}

interface Page<T> {
  list: T[]
  total: number
}

const base = '/v1/flowable'

export function getOrder() {
  return request.Get<Service.ResponseResult<Order>>(`${base}/order`)
}

export function getOrderApproval() {
  return request.Get<Service.ResponseResult<OrderApproval>>(`${base}/order/approval-status`)
}

export function saveOrder(form: Order) {
  return request.Put<Service.ResponseResult<Order>>(`${base}/order`, form)
}

export function listModels(pageNum: number, pageSize: number, keyword?: string) {
  return request.Get<Service.ResponseResult<Page<ModelSummary>>>(`${base}/models`, {
    params: { pageNum, pageSize, ...(keyword ? { keyword } : {}) },
  })
}

export function getDraft(id: string) {
  return request.Get<Service.ResponseResult<Draft>>(`${base}/models/${id}`)
}

export function saveDraft(id: string | null, form: ModelForm) {
  return id
    ? request.Put<Service.ResponseResult<Draft>>(`${base}/models/${id}`, form)
    : request.Post<Service.ResponseResult<Draft>>(`${base}/models`, form)
}

export function publishDraft(id: string, revision: number) {
  return request.Post<Service.ResponseResult<Definition>>(`${base}/models/${id}/publish`, undefined, { params: { revision } })
}

export function listModelVersions(id: string, pageNum: number, pageSize: number) {
  return request.Get<Service.ResponseResult<ModelVersions>>(`${base}/models/${id}/versions`, { params: { pageNum, pageSize } })
}

export function getModelVersion(id: string, version: number) {
  return request.Get<Service.ResponseResult<ModelVersionDetail>>(`${base}/models/${id}/versions/${version}`)
}

export function restoreModelVersion(id: string, version: number, revision: number) {
  return request.Post<Service.ResponseResult<Draft>>(`${base}/models/${id}/versions/${version}/restore`, { revision })
}

export function listApprovers(roles: boolean, search: string) {
  return request.Get<Service.ResponseResult<{ value: string, label: string }[]>>(`${base}/approvers`, { params: { roles, search } })
}

export function listDefinitions() {
  return request.Get<Service.ResponseResult<Definition[]>>(`${base}/definitions`)
}

export function startApproval(form: StartForm) {
  return request.Post<Service.ResponseResult<string>>(`${base}/instances`, form)
}

export interface InboxFilter {
  keyword?: string
  category?: Category
  status?: Status
  from?: string
  until?: string
  unread?: boolean
}

export interface InboxMetrics {
  total: number
  statuses: Partial<Record<Status, number>>
  unread: number
  waitingDay: number
}

export function listInstances(inbox: Inbox, pageNum: number, pageSize: number, businessNo?: string, filter?: InboxFilter) {
  return request.Get<Service.ResponseResult<Page<Instance>>>(`${base}/instances`, {
    params: { inbox, pageNum, pageSize, ...filter, ...(businessNo ? { businessNo } : {}) },
  })
}

export function getApprovalOverview() {
  return request.Get<Service.ResponseResult<{ inboxes: Partial<Record<Inbox, InboxMetrics>> }>>(`${base}/overview`)
}

export function batchApproval(operation: Operation, items: { instanceId: string, taskId: string }[], comment: string, userId: string | null) {
  return request.Post<Service.ResponseResult<void>>(`${base}/instances/batch`, { operation, items, comment, userId })
}

export function markNoticesRead(kind: 'CC' | 'REMIND', instanceIds?: string[]) {
  return request.Post<Service.ResponseResult<number>>(`${base}/notices/read`, { instanceIds }, { params: { kind } })
}

export function getApproval(id: string) {
  return request.Get<Service.ResponseResult<Detail>>(`${base}/instances/${id}`)
}

export function actOnApproval(id: string, command: Command) {
  return request.Post<Service.ResponseResult<string | null>>(`${base}/instances/${id}/actions`, command)
}

export function listBusinessPages(pageNum: number, pageSize: number, keyword?: string) {
  return request.Get<Service.ResponseResult<Page<PageConfig>>>(`${base}/business-pages`, {
    params: { pageNum, pageSize, ...(keyword ? { keyword } : {}) },
  })
}

export function listBusinessPageOptions() {
  return request.Get<Service.ResponseResult<PageConfig[]>>(`${base}/business-pages/options`)
}

export function listStatusCallbackOptions(businessPage: BusinessPage) {
  return request.Get<Service.ResponseResult<Choice[]>>(`${base}/models/status-callback-options`, {
    params: { businessPage },
  })
}

export function saveBusinessPage(config: PageConfig, editing: boolean) {
  return editing
    ? request.Put<Service.ResponseResult<PageConfig>>(`${base}/business-pages/${config.code}`, config)
    : request.Post<Service.ResponseResult<PageConfig>>(`${base}/business-pages`, config)
}

export function listParticipants(search: string) {
  return request.Get<Service.ResponseResult<Choice[]>>(`${base}/participants`, { params: { search } })
}

export function saveApplicationDraft(form: StartForm, id?: string) {
  return id
    ? request.Put<Service.ResponseResult<string>>(`${base}/drafts/${id}`, form)
    : request.Post<Service.ResponseResult<string>>(`${base}/drafts`, form)
}

export function getEditDefinition(id: string) {
  return request.Get<Service.ResponseResult<Definition>>(`${base}/instances/${id}/edit-definition`)
}

export function resubmitApplication(id: string, form: StartForm) {
  return request.Post<Service.ResponseResult<string>>(`${base}/instances/${id}/resubmit`, form)
}

export function uploadApprovalAttachment(id: string, file: File) {
  const body = new FormData()
  body.append('file', file)
  return request.Post<Service.ResponseResult<void>>(`${base}/instances/${id}/attachments`, body, { headers: {} })
}

export function downloadApprovalAttachment(id: string, attachment: string) {
  return request.Get<Service.ResponseResult<{ name: string, base64: string }>>(`${base}/instances/${id}/attachments/${attachment}`)
}
