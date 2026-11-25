<script setup lang="tsx">
import type { DataTableColumns } from 'naive-ui'
import type { Category, Choice, Inbox, InboxFilter, InboxMetrics, Instance, Operation, Status } from '@/service/api/flowable'
import { batchApproval, getApprovalOverview, listInstances, listParticipants, markNoticesRead } from '@/service/api/flowable'
import { NButton, NTag, useThemeVars } from 'naive-ui'
import NovaIcon from '@/components/common/NovaIcon.vue'
import { actionLabels, categoryLabels, displayTime, operationLabels, optionsOf, statusLabels, statusTypes } from '../labels'
import StartApproval from '../components/StartApproval.vue'
import ApprovalDetail from './ApprovalDetail.vue'
import ApprovalListLayout from './ApprovalListLayout.vue'

const props = defineProps<{ monitor?: boolean, fixedInbox?: Inbox }>()
const router = useRouter()
const theme = useThemeVars()
const inbox = ref<Inbox>(props.fixedInbox ?? (props.monitor ? 'ALL' : 'TODO'))
const inboxes: { value: Inbox, label: string, icon: string }[] = [
  { value: 'TODO', label: '待我审批', icon: 'icon-park-outline:time' },
  { value: 'MINE', label: '我发起的', icon: 'icon-park-outline:send' },
  { value: 'DONE', label: '我已审批', icon: 'icon-park-outline:check-one' },
  { value: 'CC', label: '抄送我的', icon: 'icon-park-outline:inbox' },
  { value: 'REMIND', label: '催办提醒', icon: 'icon-park-outline:remind' },
  { value: 'ALL', label: '全部审批', icon: 'icon-park-outline:list-view' },
  { value: 'ENDED', label: '已结束', icon: 'icon-park-outline:check-one' },
]
const isCenter = !props.fixedInbox && !props.monitor
const title = computed(() => props.monitor ? '流程监控' : inboxes.find(item => item.value === props.fixedInbox)?.label ?? '审批中心')
const tabs = computed(() => inboxes.filter(item => props.monitor ? ['ALL', 'ENDED'].includes(item.value) : !['ALL', 'ENDED'].includes(item.value)))
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const rows = ref<Instance[]>([])
const loading = ref(false)
const starting = ref(false)
const startForm = ref<InstanceType<typeof StartApproval>>()
const detailId = ref('')
const detailPanel = ref<InstanceType<typeof ApprovalDetail>>()
const initialAction = ref<Operation>()
const selected = ref<string[]>([])
const overview = ref<Partial<Record<Inbox, InboxMetrics>>>({})
const batch = ref<Operation>()
const batchBusy = ref(false)
const batchComment = ref('')
const assignee = ref<string | null>(null)
const recipients = ref<Choice[]>([])
let listRequest = 0
let overviewRequest = 0
let userRequest = 0

function emptyFilter() {
  return { keyword: '', category: null as Category | null, status: null as Status | null, dates: null as [number, number] | null, unread: null as boolean | null }
}

const filter = ref(emptyFilter())
const applied = ref<InboxFilter>({})
const currentMetrics = computed(() => overview.value[inbox.value])
const statusOptions = optionsOf(statusLabels)
const categoryOptions = optionsOf(categoryLabels)
const selectedRows = computed(() => rows.value.filter(row => selected.value.includes(row.id)))
const proofOfRead = computed(() => inbox.value === 'CC' || inbox.value === 'REMIND')
const selectable = computed(() => inbox.value === 'TODO' || inbox.value === 'CC')
const cards = computed(() => {
  if (isCenter) {
    return tabs.value.slice(0, 4).map(item => ({
      label: item.label,
      value: overview.value[item.value]?.total,
      note: item.value === 'CC' ? `${overview.value.CC?.unread ?? 0} 项未读` : '',
      icon: item.icon,
      key: item.value,
    }))
  }
  const stats = currentMetrics.value
  if (!stats)
    return []
  const totalCard = { label: '全部记录', value: stats.total, note: '', icon: 'icon-park-outline:list-view' }
  switch (inbox.value) {
    case 'TODO':
      return [totalCard, { label: '等待超过 24 小时', value: stats.waitingDay, icon: 'icon-park-outline:time' }, { label: '24 小时内收到', value: stats.total - stats.waitingDay, icon: 'icon-park-outline:inbox' }]
    case 'MINE':
      return [totalCard, ...(['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'] as const).map(status => ({
        label: statusLabels[status],
        value: stats.statuses[status] ?? 0,
        icon: 'icon-park-outline:file-text',
        status,
      }))]
    case 'CC':
      return [totalCard, { label: '未读', value: stats.unread, icon: 'icon-park-outline:remind', unread: true }, { label: '已读', value: stats.total - stats.unread, icon: 'icon-park-outline:check-one', unread: false }]
    default:
      return [totalCard, ...(['APPROVED', 'REJECTED', 'PENDING'] as const).map(status => ({
        label: statusLabels[status],
        value: stats.statuses[status] ?? 0,
        icon: 'icon-park-outline:check-one',
        status,
      }))]
  }
})

async function load() {
  const sequence = ++listRequest
  loading.value = true
  selected.value = []
  try {
    const result = await listInstances(inbox.value, page.value, pageSize.value, undefined, applied.value)
    if (sequence !== listRequest || !result.isSuccess)
      return
    total.value = result.data.total
    const last = Math.max(1, Math.ceil(total.value / pageSize.value))
    if (page.value > last) {
      page.value = last
      await load()
      return
    }
    rows.value = result.data.list
  }
  finally {
    if (sequence === listRequest)
      loading.value = false
  }
}

async function refresh() {
  void load()
  if (props.monitor)
    return
  const sequence = ++overviewRequest
  const result = await getApprovalOverview()
  if (sequence === overviewRequest && result.isSuccess)
    overview.value = result.data.inboxes
}

function applyFilter() {
  const { dates, status, category, unread, keyword } = filter.value
  const end = dates ? new Date(dates[1]) : null
  end?.setHours(24, 0, 0, 0)
  applied.value = {
    keyword: keyword.trim() || undefined,
    category: category ?? undefined,
    status: status ?? undefined,
    unread: unread ?? undefined,
    from: dates ? new Date(dates[0]).toISOString() : undefined,
    until: end?.toISOString(),
  }
  page.value = 1
  void load()
}

function reset() {
  filter.value = emptyFilter()
  applyFilter()
}

function changeInbox(value: Inbox) {
  inbox.value = value
  rows.value = []
  total.value = 0
  reset()
}

function open(id: string, action?: Operation) {
  if (!action && router.hasRoute('flowableDetail')) {
    detailId.value = ''
    void router.push({ name: 'flowableDetail', params: { id }, query: props.monitor ? { monitor: '1' } : {} })
    return
  }
  initialAction.value = action
  detailId.value = id
}

function started(id: string) {
  starting.value = false
  inbox.value = 'MINE'
  rows.value = []
  total.value = 0
  filter.value = emptyFilter()
  applied.value = {}
  page.value = 1
  void refresh()
  open(id)
}

function pageChanged(value: number, size: number) {
  page.value = value
  pageSize.value = size
  void load()
}

function rowActions(row: Instance): Operation[] {
  if (inbox.value === 'TODO')
    return ['APPROVE', 'REJECT', 'TRANSFER']
  const ops = row.listOperations ?? []
  if (inbox.value === 'MINE')
    return ops.filter(item => ['EDIT', 'WITHDRAW', 'CANCEL', 'RESUBMIT', 'REMIND'].includes(item))
  if (inbox.value === 'ALL')
    return ops.filter(item => item === 'TERMINATE' || item === 'MOVE')
  if (inbox.value === 'ENDED')
    return ops.includes('RESTART') ? ['RESTART'] : ops.filter(item => item === 'RESUBMIT')
  return []
}

async function read(ids?: string[]) {
  const kind = inbox.value
  if (kind !== 'CC' && kind !== 'REMIND')
    return
  const result = await markNoticesRead(kind, ids)
  if (result.isSuccess)
    void refresh()
}

function readAll() {
  window.$dialog.info({
    title: '全部抄送标为已读',
    content: '将标记当前账号收到的全部抄送。',
    positiveText: '标为已读',
    negativeText: '取消',
    onPositiveClick: () => read(),
  })
}

async function searchUsers(keyword: string) {
  const sequence = ++userRequest
  const result = await listParticipants(keyword)
  if (sequence === userRequest && result.isSuccess)
    recipients.value = result.data
}

const recipientOptions = computed(() => recipients.value.map(({ label, value }) => ({ label, value })))

function beginBatch(operation: Operation) {
  if (selectedRows.value.length > 20) {
    window.$message.warning('每次最多处理 20 条待办')
    return
  }
  batchComment.value = ''
  assignee.value = null
  batch.value = operation
  if (operation === 'TRANSFER')
    void searchUsers('')
}

const showBatch = computed({
  get: () => Boolean(batch.value),
  set: (show) => {
    if (!show)
      batch.value = undefined
  },
})

async function confirmBatch() {
  const action = batch.value
  if (!action || !selectedRows.value.length || batchBusy.value)
    return
  if ((action === 'REJECT' && !batchComment.value.trim()) || (action === 'TRANSFER' && !assignee.value)) {
    window.$message.warning(action === 'REJECT' ? '请填写驳回原因' : '请选择接收人')
    return
  }
  batchBusy.value = true
  try {
    const items = selectedRows.value.flatMap(row => row.taskId ? [{ instanceId: row.id, taskId: row.taskId }] : [])
    const result = await batchApproval(action, items, batchComment.value.trim(), assignee.value)
    if (result.isSuccess) {
      batch.value = undefined
      window.$message.success('批量操作完成')
      void refresh()
    }
  }
  finally {
    batchBusy.value = false
  }
}

function exportList() {
  const records = selectedRows.value.length ? selectedRows.value : rows.value
  const lines = [['审批编号', '标题', '流程', '分类', '业务单号', '发起人', '状态', '时间'], ...records.map(row => [
    row.id,
    row.title,
    row.definitionName,
    categoryLabels[row.category],
    row.businessNo,
    row.applicantName,
    statusLabels[row.status],
    displayTime(row.inboxAt ?? row.startedAt),
  ])]
  const csv = lines.map(line => line.map((value) => {
    const safe = /^\s*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value
    return `"${safe.replaceAll('"', '""')}"`
  }).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.value}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const columns = computed<DataTableColumns<Instance>>(() => [
  ...(selectable.value ? [{ type: 'selection' as const }] : []),
  {
    title: '审批单号',
    key: 'id',
    width: 130,
    ellipsis: { tooltip: true },
  },
  {
    title: '流程标题',
    key: 'title',
    minWidth: 235,
    render: row => (
      <div class="approval-cell">
        <strong>{row.title}</strong>
        <span>
          {row.definitionName}
          {' '}
          · V
          {row.definitionVersion}
        </span>
      </div>
    ),
  },
  { title: '业务分类', key: 'category', width: 90, render: row => <NTag size="small" bordered={false}>{categoryLabels[row.category]}</NTag> },
  { title: '发起人', key: 'applicantName', width: 112, ellipsis: { tooltip: true } },
  { title: '业务单号', key: 'businessNo', minWidth: 140, render: row => row.businessNo || '—' },
  ...proofOfRead.value
    ? [{ title: '阅读状态', key: 'unread', width: 90, render: (row: Instance) => <NTag size="small" type={row.unread ? 'info' : 'default'}>{row.unread ? '未读' : '已读'}</NTag> }]
    : [],
  ...inbox.value === 'TODO' ? [{ title: '当前节点', key: 'taskName', minWidth: 110 }] : [],
  ...inbox.value === 'DONE'
    ? [{ title: '我的处理', key: 'activityAction', minWidth: 180, render: (row: Instance) => (
        <div class="approval-cell">
          <strong>{row.activityAction ? actionLabels[row.activityAction] : '—'}</strong>
          <span>{row.activityComment}</span>
        </div>
      ) }]
    : [],
  { title: inbox.value === 'DONE' ? '处理时间' : proofOfRead.value ? '接收时间' : inbox.value === 'TODO' ? '进入待办' : '提交时间', key: 'inboxAt', width: 190, render: row => displayTime(row.inboxAt ?? row.startedAt) },
  { title: '审批状态', key: 'status', width: 105, render: row => <NTag size="small" type={statusTypes[row.status]}>{statusLabels[row.status]}</NTag> },
  {
    title: '操作',
    key: 'actions',
    minWidth: inbox.value === 'TODO' || inbox.value === 'MINE' ? 224 : 160,
    render: row => (
      <div class="approval-actions">
        <NButton size="small" secondary onClick={() => open(row.id)}>查看</NButton>
        {rowActions(row).map(action => (
          <NButton
            key={action}
            size="small"
            quaternary
            type={action === 'APPROVE' ? 'primary' : action === 'REJECT' ? 'error' : 'default'}
            onClick={() => open(row.id, action)}
          >
            {operationLabels[action]}
          </NButton>
        ))}
        {Boolean(row.unread) && <NButton size="small" quaternary onClick={() => read([row.id])}>标为已读</NButton>}
      </div>
    ),
  },
])

onMounted(refresh)
</script>

<template>
  <ApprovalListLayout
    :page="page" :page-size="pageSize" :total="total" :loading="loading" :page-sizes="[10, 20, 30, 50, 100]"
    show-quick-jumper class="approval-workspace" :style="{ '--approval-accent': theme.primaryColor, '--approval-muted': theme.textColor3 }"
    @search="applyFilter" @reset="reset" @change="pageChanged"
  >
    <template v-if="!fixedInbox" #filter-tabs>
      <n-tabs :value="inbox" type="line" class="mb-4" @update:value="changeInbox">
        <n-tab v-for="item in tabs" :key="item.value" :name="item.value">
          {{ item.label }} <n-text v-if="overview[item.value]" depth="3">
            {{ overview[item.value]?.total }}
          </n-text>
        </n-tab>
      </n-tabs>
    </template>
    <template #filters>
      <n-form-item label="关键字" class="list-filter filter-keyword">
        <n-input v-model:value="filter.keyword" clearable maxlength="150" placeholder="标题、单号、流程或发起人" />
      </n-form-item>
      <n-form-item label="分类" class="list-filter filter-select">
        <n-select v-model:value="filter.category" clearable :options="categoryOptions" placeholder="全部分类" />
      </n-form-item>
      <n-form-item label="状态" class="list-filter filter-select">
        <n-select v-model:value="filter.status" clearable :options="statusOptions" placeholder="全部状态" />
      </n-form-item>
      <n-form-item label="日期" class="list-filter filter-dates">
        <n-date-picker v-model:value="filter.dates" type="daterange" clearable start-placeholder="起始日期" end-placeholder="结束日期" class="w-full" />
      </n-form-item>
    </template>
    <template #actions>
      <NButton v-if="isCenter || fixedInbox === 'MINE'" type="primary" @click="starting = true">
        <template #icon>
          <icon-park-outline-add-one />
        </template>
        发起申请
      </NButton>
      <NButton v-if="isCenter && router.hasRoute('flowableOrder')" @click="router.push({ name: 'flowableOrder' })">
        订单编辑
      </NButton>
      <template v-if="inbox === 'TODO'">
        <NButton
          v-for="op in (['APPROVE', 'REJECT', 'TRANSFER'] as const)" :key="op" secondary
          :type="op === 'APPROVE' ? 'primary' : op === 'REJECT' ? 'error' : 'default'" :disabled="!selected.length"
          @click="beginBatch(op)"
        >
          批量{{ operationLabels[op] }}
        </NButton>
      </template>
      <template v-if="inbox === 'CC'">
        <NButton
          v-for="mode in [{ text: '全部', value: null }, { text: '仅未读', value: true }, { text: '已读', value: false }]"
          :key="mode.text" :type="filter.unread === mode.value ? 'primary' : 'default'" secondary
          @click="filter.unread = mode.value; applyFilter()"
        >
          {{ mode.text }}
        </NButton>
        <NButton v-if="selected.length" secondary @click="read(selected)">
          选中项标为已读
        </NButton>
        <NButton secondary :disabled="!currentMetrics?.unread" @click="readAll">
          全部标为已读
        </NButton>
      </template>
    </template>
    <template #trailing>
      <n-text depth="3">
        {{ selected.length ? `已选 ${selected.length} 项` : `共 ${total} 项` }}
      </n-text>
      <NButton strong secondary :loading="loading" @click="refresh">
        <template #icon>
          <icon-park-outline-refresh />
        </template>
        刷新
      </NButton>
      <NButton strong secondary :disabled="!rows.length" @click="exportList">
        <template #icon>
          <icon-park-outline-download />
        </template>
        {{ selected.length ? '导出选中项' : '导出本页' }}
      </NButton>
    </template>

    <template v-if="cards.length" #summary>
      <div class="approval-metrics">
        <n-card v-for="card in cards" :key="card.label" size="small" class="metric-card">
          <n-flex justify="space-between" align="center" :wrap="false">
            <n-text depth="2">
              {{ card.label }}
            </n-text>
            <span class="metric-icon"><NovaIcon :icon="card.icon" :size="17" /></span>
          </n-flex>
          <div class="metric-value">
            {{ card.value ?? '—' }}
          </div>
          <n-text v-if="'note' in card && card.note" depth="3">
            {{ card.note }}
          </n-text>
          <NButton v-if="'key' in card && card.key" text type="primary" size="small" @click="changeInbox(card.key)">
            查看列表
          </NButton>
          <NButton v-else-if="'status' in card && card.status" text type="primary" size="small" @click="filter.status = card.status; applyFilter()">
            筛选
          </NButton>
          <NButton v-else-if="'unread' in card" text type="primary" size="small" @click="filter.unread = card.unread; applyFilter()">
            筛选
          </NButton>
        </n-card>
      </div>
    </template>

    <n-data-table
      v-model:checked-row-keys="selected" :columns="columns" :data="rows" :loading="loading" :row-key="row => row.id"
      :scroll-x="inbox === 'TODO' || inbox === 'DONE' || proofOfRead ? 1210 : 1100"
    />

    <template #overlays>
      <n-drawer v-model:show="starting" width="min(100vw, 560px)" :mask-closable="!startForm?.submitting" :close-on-esc="false">
        <StartApproval v-if="starting" ref="startForm" @close="starting = false" @started="started" />
      </n-drawer>
      <n-drawer
        :show="Boolean(detailId)" width="min(100vw, 1120px)" :mask-closable="!detailPanel?.acting"
        :close-on-esc="false" @update:show="detailId = ''"
      >
        <ApprovalDetail
          v-if="detailId" :id="detailId" :key="detailId" ref="detailPanel" :initial-action="initialAction"
          @changed="refresh" @close="detailId = ''" @select="open"
        />
      </n-drawer>
      <n-modal
        v-model:show="showBatch" preset="card" :title="batch ? `批量${operationLabels[batch]}` : ''"
        style="width: min(520px, 94vw)" :mask-closable="!batchBusy" :closable="!batchBusy"
      >
        <n-form label-placement="top" :disabled="batchBusy">
          <n-form-item v-if="batch === 'TRANSFER'" label="接收人" required>
            <n-select v-model:value="assignee" :options="recipientOptions" remote filterable @search="searchUsers" />
          </n-form-item>
          <n-form-item :label="batch === 'REJECT' ? '驳回原因' : '处理意见'" :required="batch === 'REJECT'">
            <n-input v-model:value="batchComment" type="textarea" maxlength="1000" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-flex justify="end">
            <NButton :disabled="batchBusy" @click="batch = undefined">
              取消
            </NButton>
            <NButton type="primary" :loading="batchBusy" @click="confirmBatch">
              确认处理 {{ selected.length }} 项
            </NButton>
          </n-flex>
        </template>
      </n-modal>
    </template>
  </ApprovalListLayout>
</template>

<style scoped>
.approval-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 12px; }
.metric-card { min-width: 0; }
.metric-icon { display: grid; place-items: center; color: var(--approval-accent); background: color-mix(in srgb, var(--approval-accent) 12%, transparent); border-radius: 8px; width: 32px; height: 32px; flex: 0 0 32px; }
.metric-value { margin: 5px 0; line-height: 1.15; font-size: 29px; font-weight: 650; font-variant-numeric: tabular-nums; }
.metric-card :deep(.n-button) { margin-left: 6px; }
.list-filter { min-width: 0; max-width: 100%; }
.list-filter.filter-keyword { width: 300px; }
.list-filter.filter-select { width: 160px; }
.list-filter.filter-dates { width: 300px; }
.approval-workspace :deep(.approval-cell) { display: grid; gap: 3px; }
.approval-workspace :deep(.approval-cell span) { color: var(--approval-muted); font-size: 12px; }
.approval-workspace :deep(.approval-actions) { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
</style>
