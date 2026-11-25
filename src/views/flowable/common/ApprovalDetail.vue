<script setup lang="ts">
import type { Choice, Detail, FieldValue, Operation } from '@/service/api/flowable'
import {
  actOnApproval,
  downloadApprovalAttachment,
  getApproval,
  listParticipants,
  uploadApprovalAttachment,
} from '@/service/api/flowable'
import { local } from '@/utils'
import { NCard, NDrawerContent, useThemeVars } from 'naive-ui'
import { getApprovalComponent } from './business-components'
import { actionLabels, categoryLabels, displayTime, operationLabels, statusLabels, statusTypes } from '../labels'
import ProcessDiagram from '../components/ProcessDiagram.vue'
import StartApproval from '../components/StartApproval.vue'

const props = defineProps<{ id: string, standalone?: boolean, initialAction?: Operation }>()
const emit = defineEmits<{ changed: [], close: [], select: [id: string] }>()
const router = useRouter()
const theme = useThemeVars()
const detail = ref<Detail>()
const loading = ref(false)
const acting = ref(false)
defineExpose({ acting })

const decision = ref<Operation>()
const editor = ref<'EDIT' | 'RESUBMIT'>()
const editorForm = ref<InstanceType<typeof StartApproval>>()
const commandVisible = ref(false)
const fileInput = ref<HTMLInputElement>()
const comment = ref('')
const userId = ref<string | null>(null)
const nodeId = ref<string | null>(null)
const users = ref<Choice[]>([])
const userLoading = ref(false)
const userOptions = computed(() => users.value.map(({ label, value }) => ({ label, value })))
const moveOptions = computed(() => (detail.value?.moveTargets ?? []).map(({ label, value }) => ({ label, value })))
let searchSequence = 0
const activityLabels: Record<string, string> = { startEvent: '开始', endEvent: '结束', exclusiveGateway: '排他网关', userTask: '审批节点' }
const taskActions = new Set<Operation>(['APPROVE', 'REJECT', 'TRANSFER', 'ADD_SIGN', 'RETURN'])
const ownerActions = new Set<Operation>(['EDIT', 'WITHDRAW', 'CANCEL', 'RESUBMIT', 'DELETE'])
const userActions = new Set<Operation>(['TRANSFER', 'ADD_SIGN', 'ASSIGN', 'CC'])
const reasonActions = new Set<Operation>(['REJECT', 'RETURN', 'FORCE_APPROVE', 'FORCE_REJECT', 'TERMINATE', 'MOVE', 'COMMENT'])

const buttons = computed(() => (detail.value?.operations ?? [])
  .filter(action => action !== 'MOVE' || detail.value?.moveTargets.length))
const primary = computed(() => buttons.value.filter(action => taskActions.has(action) || ownerActions.has(action)))
const more = computed(() => [
  ...buttons.value.filter(action => !primary.value.includes(action))
    .map(action => ({ label: operationLabels[action], key: action })),
  { label: '打印', key: 'PRINT' },
])
const businessComponent = computed(() => getApprovalComponent(detail.value?.pageConfig?.component))
const businessRoute = computed(() => {
  const current = detail.value
  const path = current?.pageConfig?.routePath
  if (!path || router.currentRoute.value.path === path)
    return null
  if (current?.order && String(local.get('userInfo')?.id) !== current.instance.applicantId)
    return null
  return router.resolve(path).matched.some(route => route.components?.default && route.path === path) ? path : null
})

async function load() {
  loading.value = true
  try {
    const result = await getApproval(props.id)
    detail.value = result.isSuccess ? result.data : undefined
  }
  finally {
    loading.value = false
  }
}

function displayValue(value: FieldValue | undefined) {
  if (typeof value === 'boolean')
    return value ? '是' : '否'
  return typeof value === 'string' || typeof value === 'number' ? value : '—'
}

async function searchUsers(search: string) {
  const sequence = ++searchSequence
  userLoading.value = true
  try {
    const result = await listParticipants(search)
    if (sequence === searchSequence && result.isSuccess)
      users.value = result.data
  }
  finally {
    if (sequence === searchSequence)
      userLoading.value = false
  }
}

async function perform(operation: Operation) {
  if (acting.value || !detail.value)
    return
  if ((reasonActions.has(operation) && !comment.value.trim()) || (userActions.has(operation) && !userId.value)
    || (operation === 'MOVE' && !nodeId.value)) {
    window.$message.warning('请填写必填信息')
    return
  }
  acting.value = true
  try {
    const result = await actOnApproval(props.id, {
      operation,
      taskId: detail.value.instance.taskId,
      comment: comment.value,
      userId: userId.value,
      nodeId: nodeId.value,
    })
    if (result.isSuccess) {
      commandVisible.value = false
      window.$message.success('操作成功')
      emit('changed')
      if (result.data)
        emit('select', result.data)
      else if (operation === 'DELETE')
        emit('close')
      else
        await load()
    }
  }
  finally {
    acting.value = false
  }
}

function choose(action: Operation | 'PRINT') {
  if (action === 'PRINT') {
    window.print()
    return
  }
  if (action === 'EDIT' || action === 'RESUBMIT') {
    editor.value = action
    return
  }
  if (action === 'ATTACH') {
    fileInput.value?.click()
    return
  }
  if (action === 'MARK_READ') {
    void perform(action)
    return
  }
  decision.value = action
  comment.value = ''
  nodeId.value = null
  userId.value = null
  if (userActions.has(action))
    void searchUsers('')
  commandVisible.value = true
}

function edited(id: string) {
  editor.value = undefined
  emit('changed')
  if (id === props.id)
    void load()
  else
    emit('select', id)
}

async function attach(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || acting.value)
    return
  if (file.size > 2 * 1024 * 1024 || !file.size) {
    window.$message.warning('请选择 2 MB 以内的非空附件')
    return
  }
  acting.value = true
  try {
    const result = await uploadApprovalAttachment(props.id, file)
    if (result.isSuccess)
      await load()
  }
  finally {
    acting.value = false
  }
}

async function download(id: string) {
  const result = await downloadApprovalAttachment(props.id, id)
  if (!result.isSuccess)
    return
  const bytes = Uint8Array.from(atob(result.data.base64), value => value.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }))
  const link = document.createElement('a')
  link.href = url
  link.download = result.data.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

onMounted(async () => {
  await load()
  if (props.initialAction && buttons.value.includes(props.initialAction))
    choose(props.initialAction)
})
</script>

<template>
  <component :is="standalone ? NCard : NDrawerContent" title="审批详情" :closable="!standalone && !acting">
    <n-spin :show="loading">
      <n-empty v-if="!detail && !loading" description="无法读取此申请" />
      <main v-if="detail" class="approval-print" :style="{ '--detail-line': theme.dividerColor }">
        <header class="approval-heading">
          <div>
            <n-flex align="center" :size="8">
              <n-tag :type="statusTypes[detail.instance.status]" size="small">
                {{ statusLabels[detail.instance.status] }}
              </n-tag>
              <n-text depth="3">
                {{ detail.instance.definitionName }} · V{{ detail.instance.definitionVersion }}
              </n-text>
            </n-flex>
            <n-h2 class="my-2">
              {{ detail.instance.title }}
            </n-h2>
            <n-text depth="3">
              {{ detail.instance.applicantName }} · {{ displayTime(detail.instance.startedAt) }}
            </n-text>
          </div>
          <n-space class="approval-tools" :size="6" justify="end">
            <n-button
              v-for="action in primary" :key="action" size="small" :type="action === 'APPROVE' ? 'primary' : action === 'REJECT' ? 'error' : 'default'"
              :disabled="acting" @click="choose(action)"
            >
              {{ operationLabels[action] }}
            </n-button>
            <n-dropdown :options="more" @select="choose">
              <n-button size="small" :disabled="acting">
                更多操作
              </n-button>
            </n-dropdown>
            <n-button size="small" :disabled="acting" @click="emit('close')">
              关闭
            </n-button>
          </n-space>
        </header>

        <div class="approval-detail">
          <div class="approval-content">
            <n-alert v-if="detail.instance.status === 'RETURNED'" type="warning" class="mb-4">
              已退回，待发起人修改后重新提交。
            </n-alert>
            <n-alert
              v-if="detail.callbackDelivery && detail.callbackDelivery.state !== 'DELIVERED'"
              :type="detail.callbackDelivery.state === 'RETRYING' ? 'warning' : 'info'" class="mb-4"
            >
              <n-flex align="center" justify="space-between">
                <span v-if="detail.callbackDelivery.state === 'RETRYING'">
                  操作回写失败，已尝试 {{ detail.callbackDelivery.attempts }} 次，将自动重试。
                </span>
                <span v-else>操作回写中</span>
                <n-button size="small" secondary class="approval-tools" :loading="loading" @click="load">
                  刷新状态
                </n-button>
              </n-flex>
            </n-alert>
            <n-descriptions bordered :column="2" label-placement="left">
              <n-descriptions-item label="场景">
                {{ categoryLabels[detail.instance.category] }}
              </n-descriptions-item>
              <n-descriptions-item label="业务单号">
                {{ detail.instance.businessNo || '—' }}
              </n-descriptions-item>
              <n-descriptions-item label="结束时间">
                {{ displayTime(detail.instance.finishedAt) }}
              </n-descriptions-item>
              <n-descriptions-item v-if="detail.instance.taskName" label="当前待办">
                {{ detail.instance.taskName }}
              </n-descriptions-item>
              <n-descriptions-item v-if="detail.sourceId" label="来源申请" :span="2">
                {{ detail.sourceId }}
              </n-descriptions-item>
              <n-descriptions-item v-for="field in detail.fields" :key="field.key" :label="field.label" :span="field.type === 'TEXTAREA' ? 2 : 1">
                <span class="field-value">{{ displayValue(detail.values[field.key]) }}</span>
              </n-descriptions-item>
            </n-descriptions>

            <template v-if="detail.pageConfig">
              <n-divider>{{ detail.pageConfig.name }}</n-divider>
              <component
                :is="businessComponent" v-if="businessComponent" :business-no="detail.instance.businessNo" :instance-id="id"
                v-bind="detail.order ? { order: detail.order } : {}"
              />
              <n-empty v-else description="当前前端版本未包含此审批组件" />
              <n-flex v-if="businessRoute" justify="end" class="approval-tools mt-2">
                <RouterLink :to="businessRoute">{{ detail.order ? '编辑订单' : '打开业务页面' }}</RouterLink>
              </n-flex>
            </template>

            <template v-if="detail.attachments.length">
              <n-divider>附件</n-divider>
              <n-space v-for="file in detail.attachments" :key="file.id" align="center">
                <n-button text type="primary" @click="download(file.id)">
                  {{ file.name }}
                </n-button>
                <n-text depth="3">
                  {{ Math.max(1, Math.round(file.size / 1024)) }} KB
                </n-text>
              </n-space>
            </template>
          </div>
          <div class="approval-trail">
            <section>
              <n-divider>流程图</n-divider>
              <ProcessDiagram v-if="!loading" :xml="detail.xml" :activities="detail.activities" />
              <n-divider>节点轨迹</n-divider>
              <ol class="node-trail" role="list" aria-label="节点轨迹">
                <li v-for="(node, index) in detail.activities" :key="index">
                  <n-text v-if="index > 0" depth="3" aria-hidden="true">
                    →
                  </n-text>
                  <n-tag :type="node.active ? 'info' : node.cancelled ? 'warning' : 'success'" size="small">
                    {{ node.name || activityLabels[node.type] || node.type }}
                  </n-tag>
                </li>
              </ol>
            </section>

            <section>
              <n-divider>操作日志</n-divider>
              <n-timeline>
                <n-timeline-item
                  v-for="(action, index) in detail.actions" :key="index"
                  :title="actionLabels[action.action] || action.action" :time="displayTime(action.createdAt)"
                  :type="action.action === 'REJECT' ? 'error' : action.action === 'APPROVE' ? 'success' : 'info'"
                >
                  <div>{{ action.actorName }}{{ action.taskName ? ` · ${action.taskName}` : '' }}</div>
                  <div v-if="action.comment" class="field-value">
                    {{ action.comment }}
                  </div>
                </n-timeline-item>
              </n-timeline>
            </section>
          </div>
        </div>
      </main>
    </n-spin>
    <input ref="fileInput" type="file" hidden @change="attach">
    <n-modal
      v-model:show="commandVisible" preset="card" :title="decision && operationLabels[decision]"
      style="width: min(540px, 95vw)" :mask-closable="!acting" :closable="!acting"
    >
      <n-form v-if="decision" label-placement="top" :disabled="acting">
        <n-form-item v-if="userActions.has(decision)" label="选择用户" required>
          <n-select v-model:value="userId" remote filterable :options="userOptions" :loading="userLoading" @search="searchUsers" />
        </n-form-item>
        <n-form-item v-if="decision === 'MOVE'" label="目标审批节点" required>
          <n-select v-model:value="nodeId" :options="moveOptions" />
        </n-form-item>
        <n-form-item :label="reasonActions.has(decision) ? '原因或评论' : '备注'" :required="reasonActions.has(decision)">
          <n-input v-model:value="comment" type="textarea" maxlength="1000" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-flex justify="end">
          <n-button :disabled="acting" @click="commandVisible = false">
            取消
          </n-button>
          <n-button v-if="decision" type="primary" :loading="acting" @click="perform(decision)">
            确认
          </n-button>
        </n-flex>
      </template>
    </n-modal>
    <n-drawer
      :show="Boolean(editor)" width="min(100vw, 560px)"
      :mask-closable="!editorForm?.submitting" :close-on-esc="false" @update:show="editor = undefined"
    >
      <StartApproval v-if="editor && detail" ref="editorForm" :source="detail" :edit-only="editor === 'EDIT'" @close="editor = undefined" @started="edited" />
    </n-drawer>
  </component>
</template>

<style scoped>
.approval-heading { display: grid; grid-template-columns: minmax(230px, 1fr) 1.4fr; gap: 16px; margin-bottom: 20px; }
.approval-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
.approval-content, .approval-trail {
  min-width: 0;
}
.node-trail {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.node-trail li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.approval-print header {
  border-bottom: 1px solid var(--detail-line);
  padding-bottom: 16px;
}
.field-value { white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 720px) {
  .approval-heading { grid-template-columns: 1fr; }
}
</style>

<style>
@media print {
  body:has(.approval-print) * { visibility: hidden; }
  body .approval-print, body .approval-print * { visibility: visible; }
  body .approval-print .approval-tools, body .approval-print .approval-tools * { display: none; }
  body .approval-print { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 18px; }
  body .n-drawer-container:has(.approval-print), body .n-drawer:has(.approval-print),
  body .n-drawer-content:has(.approval-print), body .n-scrollbar-container:has(.approval-print) { overflow: visible !important; }
  body .n-drawer:has(.approval-print) { position: absolute; inset: 0; width: 100% !important; }
}
</style>
