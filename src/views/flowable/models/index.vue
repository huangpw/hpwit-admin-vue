<script setup lang="tsx">
import type { DataTableColumns } from 'naive-ui'
import type { Action, BusinessPage, CallbackStatus, Category, Choice, Draft, Field, ModelSummary, StatusCallback } from '@/service/api/flowable'
import { getDraft, listBusinessPageOptions, listModels, listStatusCallbackOptions, publishDraft, saveDraft } from '@/service/api/flowable'
import { NButton, NFlex, NTag } from 'naive-ui'
import { formatDateTime } from '@/utils/date'
import ApprovalListLayout from '../common/ApprovalListLayout.vue'
import BpmnDesigner from '../components/BpmnDesigner.vue'
import { actionLabels, categoryLabels, fieldLabels, optionsOf, statusLabels } from '../labels'
import ModelVersionHistory from './ModelVersionHistory.vue'

const rows = ref<ModelSummary[]>([])
const page = ref(1)
const size = ref(10)
const total = ref(0)
const keyword = ref('')
const appliedKeyword = ref('')
const loading = ref(false)
const opening = ref(false)
const editing = ref(false)
const saving = ref(false)
const publishing = ref<string | null>(null)
const historyModel = ref<ModelSummary>()
const dirty = ref(false)
const designer = ref<InstanceType<typeof BpmnDesigner>>()
const localCallback = '@local'
const callbackStates: CallbackStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'WITHDRAWN', 'CANCELLED', 'TERMINATED']
const callbackActions: Action[] = [
  'SAVE_DRAFT',
  'START',
  'RESUBMIT',
  'APPROVE',
  'REJECT',
  'RETURN',
  'WITHDRAW',
  'CANCEL',
  'TRANSFER',
  'ADD_SIGN',
  'SIGN_APPROVE',
  'ASSIGN',
  'MOVE',
  'FORCE_APPROVE',
  'FORCE_REJECT',
  'TERMINATE',
  'RESTART',
  'CC',
  'REMIND',
  'COMMENT',
  'ATTACH',
  'DELETE',
]
const callbackOptions = ref<Choice[]>([])
const callbacksLoading = ref(false)
let callbackRequest = 0
const form = ref({
  id: null as string | null,
  name: '',
  category: 'OTHER' as Category,
  description: '',
  businessPage: null as BusinessPage | null,
  restoredPageConfig: null as Draft['restoredPageConfig'],
  localMapping: false,
  callbackMapping: emptyCallbackMapping(),
  operationEndpoints: {} as Partial<Record<Action, string | null>>,
  xml: '',
  fields: [] as Field[],
  revision: null as number | null,
})

function emptyCallbackMapping(): Record<CallbackStatus, number | null> {
  return { PENDING: null, APPROVED: null, REJECTED: null, RETURNED: null, WITHDRAWN: null, CANCELLED: null, TERMINATED: null }
}

const categoryOptions = optionsOf(categoryLabels)
const fieldTypes = optionsOf(fieldLabels)
const businessPages = ref<{ value: string, label: string }[]>([])
const businessPageOptions = computed(() => {
  const selected = form.value.businessPage
  return selected && !businessPages.value.some(option => option.value === selected)
    ? [...businessPages.value, { value: selected, label: `${selected}（已停用）`, disabled: true }]
    : businessPages.value
})

async function loadBusinessPages() {
  const result = await listBusinessPageOptions()
  if (result.isSuccess)
    businessPages.value = result.data.map(page => ({ value: page.code, label: page.name }))
}

async function loadCallbacks(page: BusinessPage | null) {
  const request = ++callbackRequest
  callbackOptions.value = []
  callbacksLoading.value = Boolean(page)
  if (!page)
    return

  try {
    const result = await listStatusCallbackOptions(page)
    if (request === callbackRequest && result.isSuccess)
      callbackOptions.value = result.data
  }
  finally {
    if (request === callbackRequest)
      callbacksLoading.value = false
  }
}

const supportsLocalMapping = computed(() => callbackOptions.value.some(option => option.value === localCallback))
const operationCallbackOptions = computed(() => callbackOptions.value.filter(option => option.value !== localCallback))

function changeBusinessPage(page: BusinessPage | null) {
  form.value.businessPage = page
  form.value.localMapping = false
  form.value.callbackMapping = emptyCallbackMapping()
  form.value.operationEndpoints = {}
  dirty.value = true
  void loadCallbacks(page)
}

function changeOperationEndpoint(action: Action, endpoint: string | null) {
  form.value.operationEndpoints[action] = endpoint
  dirty.value = true
}

let loadSequence = 0

async function load() {
  const sequence = ++loadSequence
  loading.value = true
  try {
    const result = await listModels(page.value, size.value, appliedKeyword.value)
    if (sequence === loadSequence && result.isSuccess) {
      rows.value = result.data.list
      total.value = result.data.total
    }
  }
  finally {
    if (sequence === loadSequence)
      loading.value = false
  }
}

function changePage(value: number, pageSize = size.value) {
  page.value = value
  size.value = pageSize
  void load()
}

function search() {
  appliedKeyword.value = keyword.value.trim()
  changePage(1)
}

function resetSearch() {
  keyword.value = ''
  search()
}

function fill(draft?: Draft) {
  form.value = {
    id: draft?.model.id ?? null,
    name: draft?.model.name ?? '',
    category: draft?.model.category ?? 'OTHER',
    description: draft?.model.description ?? '',
    businessPage: draft?.businessPage ?? null,
    restoredPageConfig: draft?.restoredPageConfig ?? null,
    localMapping: Object.keys(draft?.statusCallback?.statusMapping ?? {}).length > 0,
    callbackMapping: { ...emptyCallbackMapping(), ...draft?.statusCallback?.statusMapping },
    operationEndpoints: { ...draft?.statusCallback?.operationEndpoints },
    xml: draft?.xml ?? '',
    fields: draft?.fields ?? [],
    revision: draft?.model.revision ?? null,
  }
  dirty.value = false
  editing.value = true
  void loadCallbacks(form.value.businessPage)
}

async function open(row?: ModelSummary) {
  void loadBusinessPages()
  if (!row) {
    fill()
    return
  }
  opening.value = true
  try {
    const result = await getDraft(row.id)
    if (result.isSuccess)
      fill(result.data)
  }
  finally {
    opening.value = false
  }
}

function closeEditor(show: boolean) {
  if (show || saving.value)
    return
  if (!dirty.value) {
    editing.value = false
    return
  }
  window.$dialog.warning({
    title: '放弃草稿修改？',
    content: '当前修改尚未保存。',
    positiveText: '放弃修改',
    negativeText: '继续编辑',
    onPositiveClick: () => { editing.value = false },
  })
}

function addField() {
  form.value.fields.push({ key: '', label: '', type: 'TEXT', required: false })
  dirty.value = true
}

function removeField(index: number) {
  form.value.fields.splice(index, 1)
  dirty.value = true
}

async function save() {
  const draft = form.value
  if (!draft.name.trim()) {
    window.$message.warning('请输入模型名称')
    return
  }
  const keys = new Set<string>()
  for (const field of draft.fields) {
    const key = field.key.toLowerCase()
    if (!field.label.trim() || !/^[a-z]\w{0,39}$/.test(field.key) || keys.has(key)) {
      window.$message.warning('请填写字段名称和唯一编码。编码以小写字母开头，可包含字母、数字和下划线。')
      return
    }
    keys.add(key)
  }
  let statusCallback: StatusCallback | null = null
  const operationEndpoints: Partial<Record<Action, string>> = {}
  for (const action of callbackActions) {
    const endpoint = draft.operationEndpoints[action]
    if (endpoint)
      operationEndpoints[action] = endpoint
  }
  if (draft.localMapping || Object.keys(operationEndpoints).length) {
    const mapping: Partial<Record<CallbackStatus, number>> = {}
    if (draft.localMapping) {
      for (const status of callbackStates) {
        const value = draft.callbackMapping[status]
        if (value != null)
          mapping[status] = value
      }
      if (Object.keys(mapping).length !== callbackStates.length) {
        window.$message.warning('请填写同库回写的全部状态映射')
        return
      }
    }
    statusCallback = { statusMapping: mapping, operationEndpoints }
  }
  saving.value = true
  try {
    let xml: string | undefined
    try {
      xml = await designer.value?.saveXml()
    }
    catch {
      window.$message.warning('请检查 BPMN 图是否已打开')
      return
    }
    if (!xml)
      return
    const { id, name, category, description, fields, revision, businessPage } = draft
    const result = await saveDraft(id, { name, category, description, fields, revision, businessPage, xml, statusCallback })
    if (result.isSuccess) {
      window.$message.success('草稿已保存')
      editing.value = false
      dirty.value = false
      changePage(1)
    }
  }
  finally {
    saving.value = false
  }
}

function confirmPublish(row: ModelSummary) {
  window.$dialog.info({
    title: '发布流程版本',
    content: `发布「${row.name}」后，新申请使用新版本，审批中的申请继续使用原版本。`,
    positiveText: '发布',
    negativeText: '取消',
    onPositiveClick: async () => {
      publishing.value = row.id
      try {
        const result = await publishDraft(row.id, row.revision)
        if (result.isSuccess) {
          window.$message.success(`已发布 V${result.data.version}`)
          await load()
        }
      }
      finally {
        publishing.value = null
      }
    },
  })
}

function openRestoredDraft(draft: Draft) {
  historyModel.value = undefined
  void loadBusinessPages()
  fill(draft)
  void load()
}

const columns: DataTableColumns<ModelSummary> = [
  {
    title: '序号',
    key: 'index',
    width: 70,
    align: 'center',
    render: (_, index) => (page.value - 1) * size.value + index + 1,
  },
  { title: '模型名称', key: 'name', minWidth: 160, ellipsis: { tooltip: true } },
  { title: '场景', key: 'category', minWidth: 86, render: row => categoryLabels[row.category] },
  {
    title: '发布状态',
    key: 'publishedRevision',
    minWidth: 128,
    render: (row) => {
      const label = row.publishedRevision === row.revision ? '已发布' : row.definitionId ? '有待发布修改' : '未发布'
      return <NTag size="small" type={row.publishedRevision === row.revision ? 'success' : 'warning'}>{label}</NTag>
    },
  },
  { title: '版本', key: 'publishedVersion', width: 90, align: 'center', render: row => row.publishedVersion == null ? '—' : `V${row.publishedVersion}` },
  { title: '草稿修订', key: 'revision', minWidth: 90 },
  { title: '更新时间', key: 'updatedAt', minWidth: 160, render: row => formatDateTime(Date.parse(row.updatedAt)) || '—' },
  {
    title: '操作',
    key: 'actions',
    minWidth: 230,
    render: row => (
      <NFlex size={8} wrap={false}>
        <NButton size="small" disabled={opening.value} onClick={() => open(row)}>设计</NButton>
        {row.definitionId && (
          <NButton size="small" secondary onClick={() => { historyModel.value = row }}>版本历史</NButton>
        )}
        {row.revision !== row.publishedRevision && (
          <NButton
            size="small"
            type="primary"
            secondary
            loading={publishing.value === row.id}
            disabled={publishing.value !== null}
            onClick={() => confirmPublish(row)}
          >
            发布
          </NButton>
        )}
      </NFlex>
    ),
  },
]

onMounted(load)
</script>

<template>
  <ApprovalListLayout
    :page="page" :page-size="size" :total="total" :loading="loading"
    @search="search" @reset="resetSearch" @change="changePage"
  >
    <template #filters>
      <n-form-item label="关键字" :label-props="{ for: 'model-keyword' }">
        <n-input v-model:value="keyword" clearable maxlength="150" placeholder="模型名称或用途说明" :input-props="{ id: 'model-keyword' }" />
      </n-form-item>
    </template>
    <template #actions>
      <NButton type="primary" :disabled="opening" @click="open()">
        <template #icon>
          <icon-park-outline-add-one />
        </template>
        新建模型
      </NButton>
    </template>
    <template #trailing>
      <NButton strong secondary :loading="loading" @click="load">
        <template #icon>
          <icon-park-outline-refresh />
        </template>
        刷新
      </NButton>
    </template>
    <n-data-table :columns="columns" :data="rows" :loading="loading" :row-key="row => row.id" :scroll-x="1030" />
    <template #overlays>
      <ModelVersionHistory v-if="historyModel" :model="historyModel" @close="historyModel = undefined" @restored="openRestoredDraft" />
      <n-drawer :show="editing" width="min(100vw, 1280px)" :mask-closable="!saving" @update:show="closeEditor">
        <n-drawer-content :title="form.id ? '编辑流程模型' : '新建流程模型'" closable>
          <n-form label-placement="top">
            <n-grid :cols="12" :x-gap="14">
              <n-form-item-gi :span="8" label="模型名称" required>
                <n-input v-model:value="form.name" maxlength="100" placeholder="例如 采购审批" @update:value="dirty = true" />
              </n-form-item-gi>
              <n-form-item-gi :span="4" label="场景" required>
                <n-select v-model:value="form.category" :options="categoryOptions" @update:value="dirty = true" />
              </n-form-item-gi>
            </n-grid>
            <n-form-item label="关联业务页面">
              <n-select
                :value="form.businessPage" :options="businessPageOptions"
                clearable placeholder="可选，选择审批人需要看的业务页面" @update:value="changeBusinessPage"
              />
            </n-form-item>
            <n-alert v-if="form.restoredPageConfig && form.restoredPageConfig.code === form.businessPage" class="mb-4" type="info">
              发布此草稿时会沿用历史业务页面配置「{{ form.restoredPageConfig.name }}」。
            </n-alert>
            <n-form-item label="用途说明">
              <n-input
                v-model:value="form.description" type="textarea" maxlength="500" :autosize="{ minRows: 2, maxRows: 4 }"
                @update:value="dirty = true"
              />
            </n-form-item>
            <n-divider v-if="supportsLocalMapping || form.localMapping || operationCallbackOptions.length">
              业务同步
            </n-divider>
            <n-form-item v-if="supportsLocalMapping || form.localMapping" label="同库状态映射">
              <n-switch
                v-model:value="form.localMapping" aria-label="同库状态映射" :loading="callbacksLoading"
                @update:value="dirty = true"
              />
            </n-form-item>
            <n-grid v-if="form.localMapping" cols="1 s:2 m:3" responsive="screen" :x-gap="14">
              <n-form-item-gi v-for="status in callbackStates" :key="status" :label="statusLabels[status]" required>
                <n-input-number
                  v-model:value="form.callbackMapping[status]" :precision="0" :min="-2147483648" :max="2147483647"
                  :show-button="false" class="w-full" placeholder="输入业务状态值"
                  @update:value="dirty = true"
                />
              </n-form-item-gi>
            </n-grid>
            <n-collapse v-if="form.businessPage" class="mb-4">
              <n-collapse-item title="操作回写接口" name="operation-callbacks">
                <n-grid cols="1 s:2 m:3" responsive="screen" :x-gap="14">
                  <n-form-item-gi v-for="action in callbackActions" :key="action" :label="actionLabels[action]">
                    <n-select
                      :value="form.operationEndpoints[action] ?? null" :loading="callbacksLoading" clearable
                      :options="operationCallbackOptions" placeholder="选择已登记的接口"
                      @update:value="changeOperationEndpoint(action, $event)"
                    />
                  </n-form-item-gi>
                </n-grid>
              </n-collapse-item>
            </n-collapse>
          </n-form>
          <BpmnDesigner v-if="editing" ref="designer" :xml="form.xml" @change="dirty = true" />
          <n-divider>流程表单字段</n-divider>
          <n-alert v-if="form.businessPage === 'DEMO_ORDER'" class="mb-4" type="info">
            订单详情会在审批时显示。需要按金额分支时，添加编码为 amount 的必填数字字段，值由订单明细计算。
          </n-alert>
          <n-empty v-if="!form.fields.length" description="可添加此流程需要填写的申请字段" class="my-4" />
          <div v-for="(field, index) in form.fields" :key="index" class="field-row">
            <n-input v-model:value="field.label" maxlength="60" aria-label="字段名称" placeholder="字段名称" @update:value="dirty = true" />
            <n-input v-model:value="field.key" maxlength="40" aria-label="字段编码" placeholder="编码，如 amount" @update:value="dirty = true" />
            <n-select v-model:value="field.type" :options="fieldTypes" aria-label="字段类型" @update:value="dirty = true" />
            <n-checkbox v-model:checked="field.required" @update:checked="dirty = true">
              必填
            </n-checkbox>
            <NButton quaternary type="error" @click="removeField(index)">
              移除
            </NButton>
          </div>
          <NButton secondary :disabled="form.fields.length >= 24" @click="addField">
            添加字段
          </NButton>
          <template #footer>
            <n-space>
              <NButton :disabled="saving" @click="closeEditor(false)">
                取消
              </NButton>
              <NButton type="primary" :loading="saving" @click="save">
                保存草稿
              </NButton>
            </n-space>
          </template>
        </n-drawer-content>
      </n-drawer>
    </template>
  </ApprovalListLayout>
</template>

<style scoped>
.field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 108px auto auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

@media (max-width: 620px) {
  .field-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
</style>
