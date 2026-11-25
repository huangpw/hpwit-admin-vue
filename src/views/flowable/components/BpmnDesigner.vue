<script setup lang="ts">
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling'
import type { Connection, Element, Moddle } from 'bpmn-js/lib/model/Types'
import { listApprovers } from '@/service/api/flowable'
import Modeler from 'bpmn-js/lib/Modeler'
import { approvalPalette } from './ApprovalPalette'
import type { ProcessCanvas } from './flowableModdle'
import { flowableModdle } from './flowableModdle'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'

const props = defineProps<{ xml: string }>()
const emit = defineEmits<{ change: [] }>()
const container = ref<HTMLDivElement>()
const fileInput = ref<HTMLInputElement>()
const element = shallowRef<Element>()
const name = ref('')
const assignee = ref('')
const group = ref('')
const condition = ref('')
const defaultFlow = ref(false)
const loading = ref(true)
const ready = ref(false)
const error = ref('')
const approvers = ref<{ label: string, value: string }[]>([])
const roles = ref<{ label: string, value: string }[]>([])
const userLoading = ref(false)
const roleLoading = ref(false)
interface DesignerServices {
  canvas: ProcessCanvas
  modeling: Modeling
  moddle: Moddle
}
let modeler: Modeler<DesignerServices> | undefined
let userSearch = 0
let roleSearch = 0

const userTask = computed(() => element.value?.type === 'bpmn:UserTask')
const gatewayFlow = computed(() => element.value?.type === 'bpmn:SequenceFlow'
  && (element.value as Connection).source?.type === 'bpmn:ExclusiveGateway')
const nodeTitle = computed(() => {
  switch (element.value?.type) {
    case 'bpmn:StartEvent': return '开始事件'
    case 'bpmn:EndEvent': return '结束事件'
    case 'bpmn:UserTask': return '审批节点'
    case 'bpmn:ExclusiveGateway': return '排他网关'
    default: return '连线'
  }
})
const userOptions = computed(() => {
  const options = [{ value: `\${applicantId}`, label: '流程发起人' }, ...approvers.value]
  if (assignee.value && !options.some(option => option.value === assignee.value))
    options.push({ value: assignee.value, label: `用户 ID ${assignee.value}` })
  return options
})
const roleOptions = computed(() => {
  const options = [...roles.value]
  if (group.value && !options.some(option => option.value === group.value))
    options.push({ value: group.value, label: group.value })
  return options
})

function sync(selected: Element | undefined) {
  element.value = selected
  const data = selected?.businessObject
  name.value = data?.name ?? ''
  assignee.value = data?.get('flowable:assignee') ?? ''
  group.value = data?.get('flowable:candidateGroups') ?? ''
  condition.value = data?.conditionExpression?.body ?? ''
  defaultFlow.value = data?.sourceRef?.default === data && Boolean(data)
}

async function searchApprovers(isRole: boolean, query: string) {
  const sequence = isRole ? ++roleSearch : ++userSearch
  const busy = isRole ? roleLoading : userLoading
  busy.value = true
  try {
    const result = await listApprovers(isRole, query)
    if (sequence === (isRole ? roleSearch : userSearch) && result.isSuccess)
      (isRole ? roles : approvers).value = result.data
  }
  finally {
    if (sequence === (isRole ? roleSearch : userSearch))
      busy.value = false
  }
}

function selectionChanged(event: { newSelection: Element[] }) {
  const item = event.newSelection.length === 1 ? event.newSelection[0] : undefined
  const selected = item?.labelTarget as Element | undefined
  sync(selected ?? item)
  if (userTask.value) {
    void searchApprovers(false, '')
    void searchApprovers(true, '')
  }
}

function zoom() {
  modeler?.get('canvas').zoom('fit-viewport')
}

function update(properties: Record<string, unknown>) {
  if (element.value)
    modeler?.get('modeling').updateProperties(element.value, properties)
}

function updateApprover(value: string | null, isRole: boolean) {
  const key = isRole ? 'flowable:candidateGroups' : 'flowable:assignee'
  const other = isRole ? 'flowable:assignee' : 'flowable:candidateGroups'
  update(value ? { [key]: value, [other]: undefined } : { [key]: undefined })
}

function updateCondition(value: string) {
  const expression = value.trim()
    ? modeler?.get('moddle').create('bpmn:FormalExpression', { body: value.trim() })
    : undefined
  update({ conditionExpression: expression })
}

function setDefault(checked: boolean) {
  const connection = element.value as Connection
  if (!connection.source)
    return
  modeler?.get('modeling').updateProperties(connection.source as Element, {
    default: checked ? connection.businessObject : undefined,
  })
  if (checked && condition.value)
    updateCondition('')
}

async function loadXml(xml: string) {
  if (!modeler)
    return
  loading.value = true
  error.value = ''
  try {
    if (xml)
      await modeler.importXML(xml)
    else
      await modeler.createDiagram()
    ready.value = true
    sync(undefined)
    zoom()
  }
  catch {
    ready.value = false
    error.value = '无法打开 BPMN 图。请导入包含 BPMN 图形信息的文件。'
  }
  finally {
    loading.value = false
  }
}

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file)
    return
  if (file.size > 524288) {
    window.$message.error('BPMN 文件最大为 512 KB')
    return
  }
  const previous = ready.value ? await saveXml() : ''
  const xml = await file.text()
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    window.$message.error('BPMN 文件不能包含 DTD 或实体声明')
    return
  }
  await loadXml(xml)
  if (ready.value) {
    emit('change')
  }
  else {
    window.$message.error(error.value)
    await loadXml(previous)
  }
}

async function saveXml() {
  if (!modeler || !ready.value)
    throw new Error('请先打开 BPMN 图')
  return (await modeler.saveXML({ format: true })).xml ?? ''
}

async function exportXml() {
  const xml = await saveXml()
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'approval.bpmn'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

onMounted(() => {
  modeler = new Modeler<DesignerServices>({
    container: container.value,
    moddleExtensions: { flowable: flowableModdle },
    additionalModules: [approvalPalette],
  })
  modeler.on('selection.changed', selectionChanged)
  modeler.on('commandStack.changed', () => {
    if (ready.value) {
      sync(element.value)
      emit('change')
    }
  })
  void loadXml(props.xml)
})

onBeforeUnmount(() => modeler?.destroy())
defineExpose({ saveXml })
</script>

<template>
  <div>
    <n-flex align="center" justify="space-between" class="mb-3">
      <n-text depth="3">
        放置节点后使用连线工具连接。选中节点或连线可编辑属性。
      </n-text>
      <n-space>
        <input ref="fileInput" type="file" accept=".bpmn,.xml" hidden @change="importFile">
        <n-button secondary size="small" :disabled="loading" @click="fileInput?.click()">
          导入 BPMN
        </n-button>
        <n-button secondary size="small" :disabled="!ready || loading" @click="exportXml">
          下载 BPMN
        </n-button>
        <n-button secondary size="small" :disabled="!ready || loading" @click="zoom">
          适应画布
        </n-button>
      </n-space>
    </n-flex>
    <n-alert v-if="error" class="mb-3" type="error">
      {{ error }}
    </n-alert>
    <div class="designer">
      <div ref="container" class="canvas" />
      <div class="properties">
        <n-text strong>
          {{ element ? nodeTitle : '节点属性' }}
        </n-text>
        <n-form v-if="element" class="mt-3" label-placement="top" size="small">
          <n-form-item label="名称">
            <n-input v-model:value="name" maxlength="150" @change="update({ name })" />
          </n-form-item>
          <template v-if="userTask">
            <n-form-item label="指定审批人">
              <n-select
                filterable remote clearable :value="assignee || null" :options="userOptions" :loading="userLoading"
                placeholder="搜索系统用户" @search="searchApprovers(false, $event)" @update:value="updateApprover($event, false)"
              />
            </n-form-item>
            <n-form-item label="按角色审批">
              <n-select
                filterable remote clearable :value="group || null" :options="roleOptions" :loading="roleLoading"
                placeholder="搜索系统角色" @search="searchApprovers(true, $event)" @update:value="updateApprover($event, true)"
              />
            </n-form-item>
          </template>
          <template v-if="gatewayFlow">
            <n-form-item label="默认分支">
              <n-switch :value="defaultFlow" @update:value="setDefault" />
            </n-form-item>
            <n-form-item label="分支条件">
              <n-input v-model:value="condition" :disabled="defaultFlow" placeholder="${amount >= 1000}" @change="updateCondition" />
            </n-form-item>
            <n-text depth="3">
              条件可比较一个必填数字字段和一个数值。
            </n-text>
          </template>
        </n-form>
        <n-p v-else depth="3">
          点击图上的节点或连线。
        </n-p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.designer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 248px;
  overflow: hidden;
  border: 1px solid #8a97aa45;
  border-radius: 8px;
}

.canvas {
  height: calc(50vh + 50px);
  min-height: 400px;
  background: #fcfdff;
}

.properties {
  padding: 16px;
}

@media (max-width: 760px) {
  .designer {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
