<script setup lang="tsx">
import type {
  DataTableColumns,
  FormInst,
} from 'naive-ui';
import {
  NButton,
  NPopconfirm,
  NSpace,
  NSwitch,
  NTag,
} from 'naive-ui';

import { Gender } from '@/constants';
import { useBoolean } from '@/hooks';
import {
  fetchConfigPage,
  fetchDelConfigById,
} from '@/service';

import TableModal from './components/TableModal.vue';

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: visible, setTrue: openModal } = useBoolean(false)

const initialModel = {
  keywords: ''
}
const model = ref({ ...initialModel })

const formRef = ref<FormInst | null>()
async function deleteData(id?: number) {
  const res = await fetchDelConfigById(id)
  if (res.isSuccess) {
    window.$message.success('删除成功')
    getConfigPage()
  } else {
    window.$message.error(res.message)
  }
}
const columns: DataTableColumns<Entity.Config> = [
  {
    title: '#',
    key: 'key',
    width: 50,
    render: (_, index) => {
      return `${index + 1}`
    }
  },
  {
    title: '配置名称',
    key: 'configName',
  },
  {
    title: '配置项',
    key: 'configKey',
  },
  {
    title: '配置值',
    key: 'configValue',
  },
  {
    title: '描述',
    key: 'remark',
  },
  {
    title: '操作',
    align: 'center',
    key: 'actions',
    render: (row) => {
      return (
        <NSpace justify="center">
          <NButton size="small" onClick={() => handleEditTable(row)}>
            编辑
          </NButton>
          <NPopconfirm onPositiveClick={() => deleteData(row.id)}>
            {{
              default: () => '确认删除?',
              trigger: () => <NButton size="small" type="error" >删除</NButton>,
            }}
          </NPopconfirm>
        </NSpace>
      )
    },
  },
]

const pagination = ref({
  pageNum: 1,
  pageSize: 10,
  count: 0,
})
const listData = ref<Entity.User[]>([])

onMounted(() => {
  getConfigPage()
})
async function getConfigPage() {
  startLoading()
  await fetchConfigPage({
    pageNum: pagination.value.pageNum,
    pageSize: pagination.value.pageSize,
    ...model.value
  }).then((res: any) => {
    pagination.value.count = res.data.total
    listData.value = res.data.list
    endLoading()
  })
}
function changePage(page: number, size: number) {
  pagination.value.pageNum = page
  pagination.value.pageSize = size
  getConfigPage()
}
function handleResetSearch() {
  model.value = { ...initialModel }
  getConfigPage()
}

type ModalType = 'add' | 'edit'
const modalType = ref<ModalType>('add')
function setModalType(type: ModalType) {
  modalType.value = type
}

const editData = ref<Entity.User | null>(null)
function setEditData(data: Entity.User | null) {
  editData.value = data
}

function handleEditTable(row: Entity.User) {
  setEditData(row)
  setModalType('edit')
  openModal()
}
function handleAddTable() {
  openModal()
  setModalType('add')
}
</script>

<template>
  <NSpace vertical size="large">
    <n-card>
      <n-form ref="formRef" :model="model" label-placement="left" inline :show-feedback="false">
        <n-flex>
          <n-form-item label="关键字" path="keywords">
            <n-input v-model:value="model.keywords" placeholder="请输入配置键\配置名称" />
          </n-form-item>

          <n-flex class="ml-auto">
            <NButton type="primary" @click="getConfigPage">
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
        <div class="flex gap-4">
          <NButton type="primary" @click="handleAddTable">
            <template #icon>
              <icon-park-outline-add-one />
            </template>
            新建
          </NButton>
          <!-- <NButton strong secondary>
            <template #icon>
              <icon-park-outline-afferent />
            </template>
            批量导入
          </NButton> -->
          <NButton strong secondary class="ml-a">
            <template #icon>
              <icon-park-outline-download />
            </template>
            下载
          </NButton>
        </div>
        <n-data-table :columns="columns" :data="listData" :loading="loading" />
        <!-- 分页 -->
        <Pagination :count="pagination.count" @change="changePage" />
        <!-- 表单 -->
        <TableModal v-model:visible="visible" :type="modalType" :modal-data="editData" @success="getConfigPage" />
      </NSpace>
    </n-card>
  </NSpace>
</template>
