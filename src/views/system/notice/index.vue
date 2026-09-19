<script setup lang="tsx">
import type { DataTableColumns } from 'naive-ui'
import { useBoolean } from '@/hooks'
import {
  fetchDelNoticeByIds,
  fetchNoticeForm,
  fetchNoticesPage,
  fetchPublishNotice,
  fetchRevokeNotice,
} from '@/service'
import { cleanParams } from '@/utils'
import { NButton, NFlex, NPopconfirm, NSpace, NTag, NText } from 'naive-ui'
import TableModal from './components/TableModal.vue'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: visible, setTrue: openModal } = useBoolean(false)

const initialModel = {
  title: '',
  publishStatus: null,
}
const model = ref({ ...initialModel })

const pagination = ref({
  pageNum: 1,
  pageSize: 10,
  count: 0,
})
// 选中行
const checkedRowKeys = ref<number[]>([])
const listData = ref<Entity.Notice[]>([])

onMounted(() => {
  getNoticePage()
})
async function getNoticePage() {
  startLoading()
  const params = cleanParams({
    pageNum: pagination.value.pageNum,
    pageSize: pagination.value.pageSize,
    ...model.value,
  })
  await fetchNoticesPage(params).then((res: any) => {
    pagination.value.count = res.data.total
    listData.value = res.data.list
    endLoading()
  })
}
function changePage(page: number, size: number) {
  pagination.value.pageNum = page
  pagination.value.pageSize = size
  getNoticePage()
}
function handleResetSearch() {
  model.value = { ...initialModel }
  getNoticePage()
}

type ModalType = 'add' | 'edit' | 'view'
const modalType = ref<ModalType>('add')
function setModalType(type: ModalType) {
  modalType.value = type
}

const editData = ref<Entity.Notice | null>(null)
function setEditData(data: Entity.Notice | null) {
  editData.value = data
}
// 查看
async function handleViewTable(row: Entity.Notice) {
  if (row.id) {
    const res = await fetchNoticeForm(row.id)
    setEditData(res.data || res)
    setModalType('view')
    openModal()
  }
}
// 编辑
async function handleEditTable(row: Entity.Notice) {
  const res = await fetchNoticeForm(row.id as number)
  setEditData(res.data || res)
  setModalType('edit')
  openModal()
}
// 新增
function handleAddTable() {
  openModal()
  setModalType('add')
}
const publishStatusOptions = [
  {
    label: '未发布',
    value: 0,
  },
  {
    label: '已发布',
    value: 1,
  },
  {
    label: '已撤回',
    value: -1,
  },
]
// 发布
async function publishData(id: number) {
  startLoading()
  const { isSuccess, message } = await fetchPublishNotice(id)
  if (isSuccess) {
    window.$message.success('发布成功')
    getNoticePage()
  }
  else {
    window.$message.error(message)
  }
  endLoading()
}
// 撤回
async function revokeData(id: number) {
  startLoading()
  const { isSuccess, message } = await fetchRevokeNotice(id)
  if (isSuccess) {
    window.$message.success('撤回成功')
    getNoticePage()
  }
  else {
    window.$message.error(message)
  }
  endLoading()
}
// 删除
async function deleteData(id: number) {
  startLoading()
  const { isSuccess, message } = await fetchDelNoticeByIds(String(id))
  if (isSuccess) {
    window.$message.success('删除成功')
    getNoticePage()
  }
  else {
    window.$message.error(message)
  }
  endLoading()
}
// 批量删除
async function delBatchData() {
  startLoading()
  const ids = checkedRowKeys.value.join(',')
  const { isSuccess, message } = await fetchDelNoticeByIds(ids)
  if (isSuccess) {
    window.$message.success('删除成功')
    getNoticePage()
  }
  else {
    window.$message.error(message)
  }
  endLoading()
}

const columns: DataTableColumns<Entity.Notice> = [
  {
    type: 'selection',
    width: 50,
    // 已发布的通知禁用选择
    disabled: row => row.publishStatus === 1,
  },
  {
    title: '#',
    key: 'key',
    width: 50,
    render: (_, index) => {
      return `${index + 1}`
    },
  },
  {
    title: '通知标题',
    key: 'title',
  },
  {
    title: '通知类型',
    key: 'type',
  },
  {
    title: '发布人',
    key: 'publisherName',
  },
  {
    title: '通知等级',
    key: 'level',
  },
  {
    title: '目标类型',
    align: 'center',
    key: 'targetType',
    render: (row) => {
      const targetTypeMap: Record<number, { label: string, type: 'success' | 'warning' }> = {
        1: { label: '全体', type: 'success' },
        2: { label: '指定', type: 'warning' },
      }

      const targetType = targetTypeMap[row.targetType || 1]

      if (!targetType)
        return '-'

      return (
        <NTag type={targetType.type}>
          {targetType.label}
        </NTag>
      )
    },
  },
  {
    title: '发布状态',
    align: 'center',
    key: 'publishStatus',
    render: (row) => {
      const publishStatusMap: Record<number, { label: string, type: 'default' | 'success' | 'warning' | 'error' }> = {
        '0': { label: '未发布', type: 'default' },
        '1': { label: '已发布', type: 'warning' },
        '-1': { label: '已撤回', type: 'error' },
      }

      const publishStatus = publishStatusMap[row.publishStatus || 0]

      if (!publishStatus)
        return '-'

      return (
        <NTag type={publishStatus.type}>
          {publishStatus.label}
        </NTag>
      )
    },
  },
  {
    title: '操作时间',
    key: 'createTime',
    align: 'center',
    render: ({ createTime, publishTime, revokeTime, publishStatus }) => (
      <NFlex vertical size={[0, 0]}>
        <NText>
          创建时间：
          {createTime}
        </NText>
        {publishStatus === 1 && (
          <NText>
            发布时间：
            {publishTime}
          </NText>
        )}
        {publishStatus === -1 && (
          <NText>
            撤回时间：
            {revokeTime}
          </NText>
        )}
      </NFlex>
    ),
  },
  {
    title: '操作',
    align: 'center',
    key: 'actions',
    render: (row) => {
      const published = row.publishStatus === 1
      return (
        <NFlex justify="center">
          <NButton size="small" onClick={() => handleViewTable(row)}>
            查看
          </NButton>
          {published
            ? (
                <NPopconfirm onPositiveClick={() => revokeData(row.id!)}>
                  {{
                    default: () => '确认撤回?',
                    trigger: () => <NButton size="small" type="error">撤回</NButton>,
                  }}
                </NPopconfirm>
              )
            : (
                <>
                  <NPopconfirm onPositiveClick={() => publishData(row.id!)}>
                    {{
                      default: () => '确认发布?',
                      trigger: () => <NButton size="small" type="primary">发布</NButton>,
                    }}
                  </NPopconfirm>
                  <NButton size="small" onClick={() => handleEditTable(row)}>
                    编辑
                  </NButton>
                  <NPopconfirm onPositiveClick={() => deleteData(row.id!)}>
                    {{
                      default: () => '确认删除?',
                      trigger: () => <NButton size="small" type="error">删除</NButton>,
                    }}
                  </NPopconfirm>
                </>
              )}
        </NFlex>
      )
    },
  },
]
</script>

<template>
  <NSpace vertical size="large">
    <n-card>
      <n-form :model="model" label-placement="left" inline :show-feedback="false">
        <NFlex>
          <n-form-item label="标题" path="title">
            <n-input v-model:value="model.title" placeholder="请输入" />
          </n-form-item>

          <n-form-item label="发布状态" path="publishStatus">
            <n-select v-model:value="model.publishStatus" :options="publishStatusOptions" placeholder="请选择" style="width: 180px;" />
          </n-form-item>

          <NFlex class="ml-auto">
            <NButton type="primary" @click="getNoticePage">
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
          </NFlex>
        </NFlex>
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
          <NButton strong secondary type="error" :disabled="!checkedRowKeys.length" @click="delBatchData">
            <template #icon>
              <icon-park-outline-delete-five />
            </template>
            批量删除
          </NButton>
          <NButton strong secondary class="ml-a">
            <template #icon>
              <icon-park-outline-download />
            </template>
            下载
          </NButton>
        </div>
        <n-data-table v-model:checked-row-keys="checkedRowKeys" :columns="columns" :data="listData" :loading="loading" :row-key="(row: Entity.Notice) => row.id!" />
        <!-- 分页 -->
        <Pagination :count="pagination.count" @change="changePage" />
        <!-- 表单 -->
        <TableModal v-model:visible="visible" :type="modalType" :modal-data="editData" @success="getNoticePage" />
      </NSpace>
    </n-card>
  </NSpace>
</template>
