import type { Action, Category, FieldType, Operation, Status } from '@/service/api/flowable'
import { formatDateTime } from '@/utils/date'

export const categoryLabels: Record<Category, string> = {
  LEAVE: '请假',
  EXPENSE: '报销',
  PURCHASE: '采购',
  SEAL: '用章',
  OTHER: '其他',
}

export const fieldLabels: Record<FieldType, string> = {
  TEXT: '短文本',
  TEXTAREA: '长文本',
  NUMBER: '数字',
  DATE: '日期',
  BOOLEAN: '是 / 否',
}

export const statusLabels: Record<Status, string> = {
  DRAFT: '草稿',
  PENDING: '审批中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  RETURNED: '已退回',
  WITHDRAWN: '已撤回',
  CANCELLED: '已取消',
  TERMINATED: '已终止',
}

export const statusTypes = {
  DRAFT: 'default',
  PENDING: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  RETURNED: 'warning',
  WITHDRAWN: 'default',
  CANCELLED: 'default',
  TERMINATED: 'warning',
} as const

export const operationLabels: Record<Operation, string> = {
  APPROVE: '同意',
  REJECT: '驳回',
  WITHDRAW: '撤回',
  CANCEL: '取消申请',
  TRANSFER: '转交',
  ADD_SIGN: '加签',
  RETURN: '退回发起人',
  COMMENT: '评论',
  ATTACH: '添加附件',
  REMIND: '催办',
  CC: '抄送',
  FORCE_APPROVE: '强制通过',
  FORCE_REJECT: '强制驳回',
  TERMINATE: '终止流程',
  ASSIGN: '指定审批人',
  MOVE: '流程干预',
  DELETE: '删除',
  RESUBMIT: '重新提交',
  RESTART: '重启流程',
  EDIT: '编辑',
  MARK_READ: '已读',
}

export const actionLabels: Record<Action, string> = {
  ...operationLabels,
  START: '提交申请',
  APPROVE: '审批通过',
  SIGN_APPROVE: '加签通过',
  SAVE_DRAFT: '保存草稿',
}

export function optionsOf<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map(value => ({ value, label: labels[value] }))
}

export function displayTime(value: string | null) {
  return value ? formatDateTime(Date.parse(value)) || '—' : '—'
}
