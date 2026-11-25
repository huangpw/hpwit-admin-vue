<script setup lang="tsx">
import type {
  DataTableColumns,
} from 'naive-ui'
import {
  NButton,
  NSpace,
} from 'naive-ui'

import { useBoolean } from '@/hooks'
import { fetchLogPage } from '@/service'

import TableModal from './components/TableModal.vue'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: visible } = useBoolean(false)

const initialModel = {
  keywords: '',
  createTime: null,
}
const model = ref({ ...initialModel })

// 列表项
const columns: DataTableColumns<Entity.Log> = [
  {
    title: '操作时间',
    key: 'createTime',
    width: 210,
  },
  {
    title: '操作人',
    key: 'operator',
    width: 130,
  },
  {
    title: '日志模块',
    key: 'module',
    width: 130,
  },
  {
    title: '日志内容',
    key: 'content',
  },
  {
    title: 'IP地址',
    key: 'ip',
    width: 160,
  },
  {
    title: '地区',
    key: 'region',
    width: 210,
  },
  {
    title: '浏览器',
    key: 'browser',
    width: 160,
  },
  {
    title: '终端系统',
    key: 'os',
    width: 160,
    ellipsis: true, // Naive UI 内置省略功能
  },
  {
    title: '执行时间(ms)',
    key: 'executionTime',
    width: 160,
  },
]

const pagination = ref({
  pageNum: 1,
  pageSize: 10,
  count: 0,
})
const listData = ref<Entity.Log[]>([])
onMounted(() => {
  getLogPage()
})
async function getLogPage() {
  startLoading()
  await fetchLogPage({
    pageNum: pagination.value.pageNum,
    pageSize: pagination.value.pageSize,
    ...model.value,
  }).then((res: any) => {
    listData.value = res.data.list
    // total
    endLoading()
  })
}
function changePage(page: number, size: number) {
  // window.$message.success(`分页器:${page},${size}`)
  pagination.value.pageNum = page
  pagination.value.pageSize = size
  getLogPage()
}
function handleResetSearch() {
  model.value = { ...initialModel }
}

type ModalType = 'add' | 'edit'
const modalType = ref<ModalType>('add')
const editData = ref<Entity.User | null>(null)
</script>

<template>
  <NSpace vertical size="large">
    <n-card>
      <n-form :model="model" label-placement="left" inline :show-feedback="false">
        <n-flex>
          <n-form-item label="关键字" path="keywords">
            <n-input v-model:value="model.keywords" placeholder="日志内容" />
          </n-form-item>
          <n-form-item label="操作时间" path="keywords">
            <n-date-picker v-model:value="model.createTime" type="datetimerange" clearable />
          </n-form-item>

          <n-flex class="ml-auto">
            <NButton type="primary" @click="getLogPage">
              <template #icon>
                <icon-park-outline-search />
              </template>
              搜索
            </NButton>
            <NButton strong secondary @click="handleResetSearch">
              <template #icon>
                <icon-park-outline-redo />
              </template>
              重置
            </NButton>
          </n-flex>
        </n-flex>
      </n-form>
    </n-card>
    <n-card>
      <NSpace vertical size="large">
        <!-- <div class="flex gap-4">
          <NButton type="primary" @click="handleAddTable">
            <template #icon>
              <icon-park-outline-add-one />
            </template>
            新建
          </NButton>
          <NButton strong secondary>
            <template #icon>
              <icon-park-outline-afferent />
            </template>
            批量导入
          </NButton>
          <NButton strong secondary class="ml-a">
            <template #icon>
              <icon-park-outline-download />
            </template>
            下载
          </NButton>
        </div> -->
        <n-data-table :columns="columns" :data="listData" :loading="loading" />
        <!-- 分页 -->
        <Pagination :count="pagination.count" @change="changePage" />
        <TableModal v-model:visible="visible" :type="modalType" :modal-data="editData" />
      </NSpace>
    </n-card>
  </NSpace>
</template>
