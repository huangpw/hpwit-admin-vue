<script setup lang="tsx">
import type {
  DataTableColumns,
} from 'naive-ui'
import {
  NButton,
  NPopconfirm,
  NSpace,
  NTag,
} from 'naive-ui'

import { useBoolean } from '@/hooks'
import {
  fetchDelRoleByIds,
  fetchRoleList,
} from '@/service'

import DataScope from './components/DataScope.vue'
// import { fetchEntrantsMacaoPage } from '@/service';
// import ImportModal from './components/ImportModal.vue';
import TableModal from './components/TableModal.vue'

const { t } = useI18n()

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: visible, setTrue: openModal } = useBoolean(false)
// const { bool: visibleImport, setTrue: openImportModal } = useBoolean(false)

const initialModel = {
  name: '',
  code: '',
}
const model = ref({ ...initialModel })

// 分页
const pagination = ref({
  pageNum: 1,
  pageSize: 10,
  count: 0,
})

/**
 * 分页组件 ref
 */
const paginationRef = ref<any>()
// 删除确认
async function deleteData(id: number) {
  // window.$message.success(`删除用户id:${id}`)

  await fetchDelRoleByIds(String(id))
  window.$message.success(`删除成功`)
  getRoleList()
}
// 列表项
const columns: DataTableColumns<Entity.RoleModel> = [
  {
    type: 'selection',
    width: 50,
  },
  {
    title: '序号',
    key: 'index',
    width: 70,
    align: 'center',
    render: (_, index) => (pagination.value.pageNum - 1) * pagination.value.pageSize + index + 1,
  },
  {
    title: '角色名称',
    key: 'name',
  },
  {
    title: '角色编码',
    key: 'code',
  },
  {
    title: '数据权限',
    key: 'dataScopeName',
  },
  {
    title: '状态',
    align: 'center',
    key: 'status',
    width: '10em',
    render: (row) => {
      return <NTag type="warning">{row.status === 1 ? '正常' : '禁用'}</NTag>
    },
  },
  {
    title: '排序',
    key: 'sort',
    align: 'center',
    width: '10em',
  },
  {
    title: '操作',
    align: 'center',
    key: 'actions',
    width: '20em',
    render: (row) => {
      const isRoot = row.code?.toLowerCase() !== 'root' // 不区分大小写
      return (
        <NSpace justify="center">
          {/* 只显示分配权限按钮给 root */}
          {isRoot && (
            <>
              <NButton
                size="small"
                type="primary"
                onClick={() => handleOpenAssignPermDialog(row)}
              >
                {t('common.assignPermission')}
              </NButton>
              <NButton
                size="small"
                onClick={() => handleEditTable(row)}
              >
                {t('common.edit')}
              </NButton>
              <NPopconfirm onPositiveClick={() => deleteData(row.id)}>
                {{
                  default: () => t('common.deleteConfirm'),
                  trigger: () => <NButton size="small" type="error">{t('common.delete')}</NButton>,
                }}
              </NPopconfirm>
            </>
          )}
        </NSpace>
      )
    },
  },
]
// 选中行
const checkedRowKeys = ref<number[]>([])
// 列表数据
const listData = ref<Entity.RoleModel[]>([])
// function handleUpdateDisabled(value: 0 | 1, id: number) {
//   const index = listData.value.findIndex(item => item.id === id)
//   if (index > -1)
//     listData.value[index].status = value
// }

// 加载数据
onMounted(() => {
  getRoleList()
})
// 加载数据
async function getRoleList() {
  startLoading()
  const res = await fetchRoleList({
    pageNum: pagination.value.pageNum,
    pageSize: pagination.value.pageSize,
    ...model.value,
  })
  listData.value = res.data.list
  pagination.value.count = res.data.total
  endLoading()
}
// 分页切换
function changePage(page: number, size: number) {
  pagination.value.pageNum = page
  pagination.value.pageSize = size
  getRoleList()
}
// 搜索
function onSearch() {
  pagination.value.pageNum = 1
  getRoleList()
}
// 重置
function onResetSearch() {
  model.value = { ...initialModel }
  // getRoleList()
  paginationRef.value?.reset()
}

// 操作类型
type ModalType = 'add' | 'edit'
const modalType = ref<ModalType>('add')
function setModalType(type: ModalType) {
  modalType.value = type
}
// 选中的编辑数据
const editData = ref<Entity.RoleModel | null>(null)
function setEditData(data: Entity.RoleModel | null) {
  editData.value = data
}
// 编辑
function handleEditTable(row: Entity.RoleModel) {
  setEditData(row)
  setModalType('edit')
  openModal()
}
// 新建
function handleAddTable() {
  openModal()
  setModalType('add')
}
// 导入
// function handleImportModal() {
//   openImportModal()
// }
// 批量删除
async function handleBatchDelete() {
  if (checkedRowKeys.value.length === 0) {
    return window.$message.warning(t('common.deleteConfirm'))
  }

  const ids = checkedRowKeys.value.join(',')
  await fetchDelRoleByIds(ids)
  window.$message.success(t('common.deleteSuccess'))

  getRoleList()

  // window.$message.success(`批量删除${checkedRowKeys.value}条数据`)
}

const dataScopeRef = ref<InstanceType<typeof DataScope> | null>(null)
function handleOpenAssignPermDialog(row: Entity.RoleModel) {
  dataScopeRef.value?.open(row, `【${row.name}】${t('route.permission')}`)
}
</script>

<template>
  <NSpace vertical size="large">
    <!-- 搜索框 -->
    <n-card>
      <n-form ref="formRef" :model="model" label-placement="left" inline :show-feedback="false">
        <n-flex>
          <n-form-item label="角色名称" path="name">
            <n-input v-model:value="model.name" placeholder="请输入" />
          </n-form-item>
          <n-form-item label="角色编码" path="code">
            <n-input v-model:value="model.code" placeholder="请输入" />
          </n-form-item>
          <n-flex class="ml-auto">
            <NButton type="primary" @click="onSearch">
              <template #icon>
                <icon-park-outline-search />
              </template>
              搜索
            </NButton>
            <NButton strong secondary @click="onResetSearch">
              <template #icon>
                <icon-park-outline-redo />
              </template>
              重置
            </NButton>
          </n-flex>
        </n-flex>
      </n-form>
    </n-card>
    <!-- 列表框 -->
    <n-card>
      <NSpace vertical size="large">
        <div class="flex gap-4">
          <NButton type="primary" @click="handleAddTable">
            <template #icon>
              <icon-park-outline-add-one />
            </template>
            新建
          </NButton>
          <NButton type="error" secondary @click="handleBatchDelete">
            <template #icon>
              <icon-park-outline-delete-five />
            </template>
            批量删除
          </NButton>
          <!-- <NPopconfirm @positive-click="handlePositiveClick">
            <template #trigger>
              <NButton type="error" secondary>
                <template #icon>
                  <icon-park-outline-delete-five />
                </template>
                批量删除
              </NButton>
            </template>
            确认删除所有选中角色？
          </NPopconfirm> -->
          <!-- <NButton strong secondary @click="handleImportModal">
            <template #icon>
              <icon-park-outline-afferent />
            </template>
            批量导入
          </NButton> -->
          <!-- 右侧按钮 -->
          <NButton strong secondary class="ml-a">
            <template #icon>
              <icon-park-outline-download />
            </template>
            下载
          </NButton>
        </div>
        <n-data-table
          v-model:checked-row-keys="checkedRowKeys" :columns="columns" :data="listData" :loading="loading"
          :row-key="(row: Entity.RoleModel) => row.id"
        />
        <Pagination
          :page="pagination.pageNum" :page-size="pagination.pageSize" :count="pagination.count"
          @change="changePage"
        />
        <!-- 新建弹窗 -->
        <TableModal v-model:visible="visible" :type="modalType" :modal-data="editData" @success="getRoleList" />
        <!-- 导入弹窗 -->
        <!-- <ImportModal v-model:visible=" visibleImport" /> -->

        <!-- 分配角色数据权限 -->
        <DataScope ref="dataScopeRef" @success="getRoleList" />
      </NSpace>
    </n-card>
  </NSpace>
</template>
