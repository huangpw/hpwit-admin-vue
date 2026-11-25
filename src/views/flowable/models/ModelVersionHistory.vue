<script setup lang="tsx">
import type { DataTableColumns } from 'naive-ui'
import type { Action, CallbackStatus, Draft, ModelSummary, ModelVersion, ModelVersionDetail, ModelVersions } from '@/service/api/flowable'
import { getModelVersion, listModelVersions, restoreModelVersion } from '@/service/api/flowable'
import { NButton, NTag } from 'naive-ui'
import { downloadLink } from '@/utils/file'
import ProcessDiagram from '../components/ProcessDiagram.vue'
import { actionLabels, categoryLabels, displayTime, fieldLabels, statusLabels } from '../labels'

const props = defineProps<{ model: ModelSummary }>()
const emit = defineEmits<{ close: [], restored: [draft: Draft] }>()
const page = ref(1)
const pageSize = 10
const history = ref<ModelVersions>()
const loading = ref(false)
const detail = ref<ModelVersionDetail>()
const loadingVersion = ref<number>()
const restoring = ref(false)
let detailRequest = 0

async function load() {
  loading.value = true
  history.value = undefined
  try {
    const result = await listModelVersions(props.model.id, page.value, pageSize)
    if (result.isSuccess)
      history.value = result.data
  }
  finally {
    loading.value = false
  }
}

function changePage(value: number) {
  page.value = value
  void load()
}

async function view(version: number) {
  const request = ++detailRequest
  loadingVersion.value = version
  detail.value = undefined
  try {
    const result = await getModelVersion(props.model.id, version)
    if (request === detailRequest && result.isSuccess)
      detail.value = result.data
  }
  finally {
    if (request === detailRequest)
      loadingVersion.value = undefined
  }
}

function download(entry: ModelVersionDetail) {
  const data = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json;charset=utf-8' })
  downloadLink(data, `${entry.definition.processKey}-v${entry.definition.version}.json`)
}

function confirmRestore(version: number) {
  const current = history.value
  if (!current || restoring.value)
    return
  window.$dialog.warning({
    title: `恢复 V${version} 为草稿？`,
    content: current.unpublishedChanges
      ? '此操作会覆盖当前未发布的草稿。恢复后可继续编辑，发布后才会供新申请使用。'
      : '恢复后可继续编辑，发布后才会供新申请使用。',
    positiveText: '恢复为草稿',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (restoring.value)
        return false
      restoring.value = true
      try {
        const result = await restoreModelVersion(props.model.id, version, current.draftRevision)
        if (result.isSuccess) {
          window.$message.success(`已将 V${version} 恢复为草稿`)
          emit('restored', result.data)
          return
        }
        await load()
      }
      finally {
        restoring.value = false
      }
    },
  })
}

function close(show: boolean) {
  if (!show && !restoring.value)
    emit('close')
}

const columns: DataTableColumns<ModelVersion> = [
  { title: '版本', key: 'version', width: 72, render: row => `V${row.version}` },
  { title: '发布名称', key: 'name', minWidth: 150, ellipsis: { tooltip: true } },
  { title: '发布时间', key: 'publishedAt', width: 170, render: row => displayTime(row.publishedAt) },
  { title: '状态', key: 'current', width: 104, render: row => row.current ? <NTag size="small" type="success">当前发布</NTag> : '历史版本' },
  {
    title: '操作',
    key: 'action',
    width: 86,
    render: row => (
      <NButton size="small" secondary loading={loadingVersion.value === row.version} onClick={() => view(row.version)}>查看</NButton>
    ),
  },
]

onMounted(load)
</script>

<template>
  <n-drawer :show="true" width="min(100vw, 860px)" :mask-closable="!restoring" @update:show="close">
    <n-drawer-content :title="`${model.name} · 版本历史`" :closable="!restoring">
      <n-data-table
        :columns="columns" :data="history?.versions.list ?? []" :loading="loading"
        :row-key="row => row.version" :scroll-x="600" size="small"
      />
      <n-flex v-if="(history?.versions.total ?? 0) > pageSize" class="mt-3" justify="end">
        <n-pagination :page="page" :page-size="pageSize" :item-count="history?.versions.total" @update:page="changePage" />
      </n-flex>
      <template v-if="detail">
        <n-divider>V{{ detail.definition.version }} 发布配置</n-divider>
        <n-descriptions bordered label-placement="left" :column="1" class="mb-4">
          <n-descriptions-item label="场景">
            {{ categoryLabels[detail.definition.category] }}
          </n-descriptions-item>
          <n-descriptions-item v-if="detail.definition.description" label="用途说明">
            {{ detail.definition.description }}
          </n-descriptions-item>
          <n-descriptions-item label="关联业务页面">
            {{ detail.definition.pageConfig?.name || detail.definition.businessPage || '—' }}
          </n-descriptions-item>
          <n-descriptions-item v-if="detail.definition.statusCallback && Object.keys(detail.definition.statusCallback.statusMapping).length" label="同库状态映射">
            <n-space>
              <NTag v-for="(value, status) in detail.definition.statusCallback.statusMapping" :key="status" size="small">
                {{ statusLabels[status as CallbackStatus] }} → {{ value }}
              </NTag>
            </n-space>
          </n-descriptions-item>
          <n-descriptions-item v-if="detail.definition.statusCallback?.operationEndpoints && Object.keys(detail.definition.statusCallback.operationEndpoints).length" label="操作回写接口">
            <n-space>
              <NTag v-for="(endpoint, operation) in detail.definition.statusCallback.operationEndpoints" :key="operation" size="small">
                {{ actionLabels[operation as Action] }} → {{ endpoint }}
              </NTag>
            </n-space>
          </n-descriptions-item>
          <n-descriptions-item label="流程表单字段">
            <n-space v-if="detail.definition.fields.length">
              <NTag v-for="field in detail.definition.fields" :key="field.key" size="small">
                {{ field.label }} · {{ field.key }} · {{ fieldLabels[field.type] }}{{ field.required ? ' · 必填' : '' }}
              </NTag>
            </n-space>
            <span v-else>—</span>
          </n-descriptions-item>
        </n-descriptions>
        <ProcessDiagram :key="detail.definition.id" :xml="detail.xml" />
        <n-flex justify="end" class="mt-4">
          <NButton :disabled="restoring" @click="download(detail)">
            导出版本
          </NButton>
          <NButton type="primary" :disabled="!history || loading" :loading="restoring" @click="confirmRestore(detail.definition.version)">
            恢复为草稿
          </NButton>
        </n-flex>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>
