<script setup lang="tsx">
import type { DataTableColumns } from 'naive-ui'
import type { PageConfig } from '@/service/api/flowable'
import { listBusinessPages, saveBusinessPage } from '@/service/api/flowable'
import { NButton, NTag } from 'naive-ui'
import ApprovalListLayout from '../common/ApprovalListLayout.vue'
import { componentOptions } from '../common/business-components'

const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const keyword = ref('')
const appliedKeyword = ref('')
const rows = ref<PageConfig[]>([])
const busy = ref(false)
const showing = ref(false)
const saving = ref(false)
const editing = ref(false)
const form = ref<PageConfig>({ code: '', name: '', component: '', routePath: '', enabled: true, sortOrder: 0 })
let loadSequence = 0

async function load() {
  const sequence = ++loadSequence
  busy.value = true
  try {
    const result = await listBusinessPages(page.value, pageSize.value, appliedKeyword.value)
    if (sequence === loadSequence && result.isSuccess) {
      rows.value = result.data.list
      total.value = result.data.total
    }
  }
  finally {
    if (sequence === loadSequence)
      busy.value = false
  }
}

function edit(row?: PageConfig) {
  editing.value = Boolean(row)
  form.value = row ? { ...row } : { code: '', name: '', component: '', routePath: '', enabled: true, sortOrder: 0 }
  showing.value = true
}

async function save() {
  if (!/^[A-Z][A-Z\d_]{0,63}$/.test(form.value.code) || !form.value.name.trim() || !form.value.component) {
    window.$message.warning('请填写大写页面编码、名称并选择审批组件')
    return
  }
  if (form.value.routePath && !/^(?:\/[\w-]+)+$/.test(form.value.routePath)) {
    window.$message.warning('请输入站内路径，例如 /flowable/order')
    return
  }
  saving.value = true
  try {
    const result = await saveBusinessPage(form.value, editing.value)
    if (result.isSuccess) {
      showing.value = false
      window.$message.success('已保存业务页面')
      await load()
    }
  }
  finally {
    saving.value = false
  }
}

const columns: DataTableColumns<PageConfig> = [
  {
    title: '序号',
    key: 'index',
    width: 70,
    align: 'center',
    render: (_, index) => (page.value - 1) * pageSize.value + index + 1,
  },
  { title: '名称', key: 'name' },
  { title: '编码', key: 'code' },
  { title: '审批组件', key: 'component' },
  { title: '业务路由', key: 'routePath', render: row => row.routePath || '—' },
  { title: '排序', key: 'sortOrder' },
  { title: '状态', key: 'enabled', render: row => <NTag type={row.enabled ? 'success' : 'default'}>{row.enabled ? '启用' : '停用'}</NTag> },
  { title: '操作', key: 'edit', render: row => <NButton size="small" onClick={() => edit(row)}>编辑</NButton> },
]

function changePage(value: number, size = pageSize.value) {
  page.value = value
  pageSize.value = size
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

onMounted(load)
</script>

<template>
  <ApprovalListLayout
    :page="page" :page-size="pageSize" :total="total" :loading="busy"
    @search="search" @reset="resetSearch" @change="changePage"
  >
    <template #filters>
      <n-form-item label="关键字" :label-props="{ for: 'business-page-keyword' }">
        <n-input v-model:value="keyword" clearable maxlength="150" placeholder="页面名称或编码" :input-props="{ id: 'business-page-keyword' }" />
      </n-form-item>
    </template>
    <template #actions>
      <NButton type="primary" @click="edit()">
        <template #icon>
          <icon-park-outline-add-one />
        </template>
        新增业务页面
      </NButton>
    </template>
    <template #trailing>
      <NButton strong secondary :loading="busy" @click="load">
        <template #icon>
          <icon-park-outline-refresh />
        </template>
        刷新
      </NButton>
    </template>
    <n-data-table :columns="columns" :data="rows" :loading="busy" :row-key="row => row.code" :scroll-x="860" />
    <template #overlays>
      <n-modal
        v-model:show="showing" preset="card" :title="editing ? '编辑业务页面' : '新增业务页面'"
        style="width: min(620px, 95vw)" :mask-closable="!saving" :closable="!saving"
      >
        <n-form label-placement="top" :disabled="saving">
          <n-form-item label="页面编码" required>
            <n-input v-model:value="form.code" :disabled="editing" maxlength="64" placeholder="例如 PURCHASE_ORDER" />
          </n-form-item>
          <n-form-item label="显示名称" required>
            <n-input v-model:value="form.name" maxlength="100" />
          </n-form-item>
          <n-form-item label="审批组件" required>
            <n-select
              v-model:value="form.component" :options="componentOptions" filterable
              placeholder="选择已随前端构建的 approval.vue 组件"
            />
          </n-form-item>
          <n-form-item label="业务页面路由">
            <n-input v-model:value="form.routePath" maxlength="180" placeholder="选填，例如 /flowable/order" />
          </n-form-item>
          <n-form-item label="排序">
            <n-input-number v-model:value="form.sortOrder" :precision="0" :min="-99999" :max="99999" />
          </n-form-item>
          <n-form-item label="启用">
            <n-switch v-model:value="form.enabled" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-flex justify="end">
            <NButton :disabled="saving" @click="showing = false">
              取消
            </NButton>
            <NButton type="primary" :loading="saving" @click="save">
              保存
            </NButton>
          </n-flex>
        </template>
      </n-modal>
    </template>
  </ApprovalListLayout>
</template>
