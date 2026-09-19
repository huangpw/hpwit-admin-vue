<script setup lang="tsx">
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NPopconfirm,
  NSpace,
  NTag,
} from 'naive-ui'

import { useBoolean } from '@/hooks'
import {
  fetchDelDeptByIds,
  fetchDeptList,
} from '@/service'
import {
  arrayToTree,
} from '@/utils'

import TableModal from './components/TableModal.vue'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

async function deleteData(id?: number | null) {
  if (id === null || id === undefined)
    return

  // window.$message.success(`删除菜单id:${id}`)

  await fetchDelDeptByIds(String(id))
  window.$message.success(`删除成功`)
  getDeptList()
}

const tableModalRef = ref()

const columns: DataTableColumns<Entity.Dept> = [
  {
    type: 'selection',
    width: 30,
  },
  {
    title: '部门名称',
    key: 'name',
    width: 250,
  },
  {
    title: '部门编号',
    key: 'code',
    width: 200,
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      return (
        <NTag type={row.status === 1 ? 'success' : 'error'}>
          {row.status === 1 ? '正常' : '停用'}
        </NTag>
      )
    },
  },
  {
    title: '排序',
    key: 'sort',
    width: 100,
  },
  {
    title: '操作',
    align: 'center',
    key: 'actions',
    width: '15em',
    render: (row) => {
      return (
        <NSpace justify="center">
          <NButton
            size="small"
            onClick={() => tableModalRef.value.openModal('view', row)}
          >
            查看
          </NButton>
          <NButton
            size="small"
            onClick={() => tableModalRef.value.openModal('edit', row)}
          >
            编辑
          </NButton>
          <NPopconfirm onPositiveClick={() => deleteData(row.id)}>
            {{
              default: () => '确认删除',
              trigger: () => <NButton size="small" type="error">删除</NButton>,
            }}
          </NPopconfirm>
        </NSpace>
      )
    },
  },
]

const tableData = ref<Entity.Dept[]>([])
const deptName = ref('')
const filteredTableData = computed(() => {
  const keyword = deptName.value.trim().toLowerCase()
  if (!keyword)
    return tableData.value
  const filterTree = (items: Entity.Dept[]): Entity.Dept[] => items.reduce<Entity.Dept[]>((result, item) => {
    const children = item.children ? filterTree(item.children) : []
    if (String(item.name ?? '').toLowerCase().includes(keyword) || children.length)
      result.push(children.length ? { ...item, children } : item)
    return result
  }, [])
  return filterTree(tableData.value)
})

function onSearch() {
  deptName.value = deptName.value.trim()
}

function onResetSearch() {
  deptName.value = ''
}
// 默认全部展开
const expandedRowKeys = ref<Array<string | number>>([])

onMounted(() => {
  getDeptList()
})
async function getDeptList() {
  startLoading()
  const { data } = await fetchDeptList()
  tableData.value = arrayToTree(data)

  // ⭐ 核心：手动全展开
  expandedRowKeys.value = getAllExpandKeys(tableData.value)

  endLoading()
}
// 批量删除
const checkedRowKeys = ref<Array<string | number>>([])
async function handlePositiveClick() {
  if (checkedRowKeys.value.length === 0) {
    return window.$message.warning('请选择要删除的部门')
  }
  const ids = checkedRowKeys.value.join(',')
  await fetchDelDeptByIds(ids)
  window.$message.success(`批量删除成功`)
  // window.$message.success(`批量删除id:${checkedRowKeys.value.join(',')}`)
  getDeptList()
}

function getAllExpandKeys(tree: Entity.Dept[]) {
  const keys: number[] = []

  const dfs = (list: Entity.Dept[]) => {
    list.forEach((item) => {
      if (item.children && item.children.length > 0) {
        if (item.id !== null && item.id !== undefined)
          keys.push(item.id)
        dfs(item.children)
      }
    })
  }

  dfs(tree)
  return keys
}
</script>

<template>
  <NSpace vertical size="large">
    <n-card>
      <n-form label-placement="left" inline :show-feedback="false">
        <n-flex class="w-full" align="center">
          <n-form-item label="部门名称">
            <n-input v-model:value="deptName" clearable placeholder="请输入" @keyup.enter="onSearch" />
          </n-form-item>
          <n-flex>
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
    <n-card>
      <template #header>
        <NSpace vertical size="large">
          <div class="flex gap-4">
            <NButton type="primary" @click="tableModalRef.openModal('add')">
              <template #icon>
                <icon-park-outline-add-one />
              </template>
              新建
            </NButton>

            <NPopconfirm @positive-click="handlePositiveClick">
              <template #trigger>
                <NButton type="error" secondary :disabled="!checkedRowKeys.length">
                  <template #icon>
                    <icon-park-outline-delete-five />
                  </template>
                  批量删除
                </NButton>
              </template>
              确认删除所有选中菜单？
            </NPopconfirm>

            <NButton type="primary" secondary @click="getDeptList">
              <template #icon>
                <icon-park-outline-refresh />
              </template>
              刷新
            </NButton>
          </div>
        </NSpace>
      </template>

      <!-- 部门树列表 -->
      <n-data-table
        v-model:checked-row-keys="checkedRowKeys"
        :expanded-row-keys="expandedRowKeys"
        :row-key="(row: Entity.Dept) => row.id ?? row.code ?? `${row.name ?? ''}-${row.parentId ?? ''}`"
        :columns="columns"
        :data="filteredTableData"
        :loading="loading"
        size="small"
        :scroll-x="1200"
        @update:expanded-row-keys="expandedRowKeys = $event"
      />
      <!-- 弹窗表单 -->
      <TableModal ref="tableModalRef" :all-depts="tableData" modal-name="部门管理" @success="getDeptList" />
    </n-card>
  </NSpace>
</template>
