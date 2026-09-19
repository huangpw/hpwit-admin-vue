<script setup lang="tsx">
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NPopconfirm,
  NSpace,
  NSwitch,
  NTag,
} from 'naive-ui'
import { renderProCopyableText } from 'pro-naive-ui'

import { useBoolean } from '@/hooks'
import {
  fetchDelMenuById,
  fetchMenuList,
} from '@/service'
import {
  arrayToTree,
  createIcon,
} from '@/utils'

import TableModal from './components/TableModal.vue'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// 删除菜单
async function deleteData(id: number) {
  // window.$message.success(`删除菜单id:${id}`)
  await fetchDelMenuById(String(id))
  window.$message.success(`删除成功`)
  getAllMenus()
}

const menuTypeName = {
  dir: '目录',
  page: '菜单',
  link: '外链',
  button: '按钮',
  unknown: '未知',
}

const tableModalRef = ref()
const columns: DataTableColumns<any> = [
  {
    type: 'selection',
    width: 30,
  },
  {
    title: '菜单名称',
    key: 'name',
    width: 200,
  },
  {
    title: '图标',
    align: 'center',
    key: 'icon',
    width: '6em',
    render: (row) => {
      return row.icon && createIcon(row.icon, { size: 20 })
    },
  },
  {
    title: '菜单类型',
    align: 'center',
    key: 'menuType',
    width: '6em',
    render: (row) => {
      const menuType = typeof row.menuType === 'string' && row.menuType in menuTypeName
        ? row.menuType as keyof typeof menuTypeName
        : 'unknown'
      const menuTagType: Record<string, NaiveUI.ThemeColor> = {
        dir: 'primary',
        page: 'warning',
        link: 'success',
        button: 'info',
        unknown: 'error',
      }
      const tagType = menuTagType[menuType as string] ?? 'default'
      const typeLabel = menuTypeName[menuType] ?? menuTypeName.unknown
      return <NTag size="small" type={tagType}>{typeLabel}</NTag>
    },
  },
  {
    title: '路由名称',
    align: 'center',
    key: 'routeName',
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '路由路径',
    key: 'routePath',
    render: row => renderProCopyableText(row.routePath),
  },
  {
    title: '组件路径',
    key: 'component',
    ellipsis: {
      tooltip: true,
    },
    render: (row) => {
      return row.component || '-'
    },
  },
  {
    title: '登录访问',
    key: 'requiresAuth',
    align: 'center',
    width: '6em',
    render: (row) => {
      return <NSwitch value={Number(row.requiresAuth) === 1} />
    },
  },
  {
    title: '权限标识',
    key: 'perm',
    render: row => renderProCopyableText(row.perm),
  },
  {
    title: '状态',
    align: 'center',
    key: 'visible',
    width: '6em',
    render: (row) => {
      return <NTag type="warning">{row.visible === 1 ? '显示' : '隐藏'}</NTag>
    },
  },
  {
    title: '排序',
    key: 'sort',
    align: 'center',
    width: '6em',
  },
  {
    title: '操作',
    align: 'center',
    key: 'actions',
    width: '20em',
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
            type="info"
            onClick={() => tableModalRef.value.openModal('add', row)}
          >
            新增
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

const tableData = ref<AppRoute.RowRoute[]>([])
const expandedRowKeys = ref<Array<string | number>>([])
const menuName = ref('')

const filteredTableData = computed(() => {
  const keyword = menuName.value.trim().toLowerCase()
  if (!keyword)
    return tableData.value

  const filterTree = (items: AppRoute.RowRoute[]): AppRoute.RowRoute[] => items.reduce<AppRoute.RowRoute[]>((result, item) => {
    const children = item.children ? filterTree(item.children) : []
    if (item.name.toLowerCase().includes(keyword) || children.length) {
      result.push(children.length ? { ...item, children } : item)
    }
    return result
  }, [])

  return filterTree(tableData.value)
})

onMounted(() => {
  getAllMenus()
})
async function getAllMenus() {
  startLoading()
  const { data } = await fetchMenuList()
  tableData.value = arrayToTree(data)
  expandedRowKeys.value = getAllExpandKeys(tableData.value)
  endLoading()
}

function getAllExpandKeys(tree: AppRoute.RowRoute[]) {
  const keys: number[] = []
  const walk = (items: AppRoute.RowRoute[]) => {
    items.forEach((item) => {
      if (item.children?.length) {
        keys.push(item.id)
        walk(item.children)
      }
    })
  }
  walk(tree)
  return keys
}

const checkedRowKeys = ref<number[]>([])
async function handlePositiveClick() {
  window.$message.success(`批量删除id:${checkedRowKeys.value.join(',')}`)
}
</script>

<template>
  <NSpace vertical size="large">
    <n-card>
      <n-form label-placement="left" inline :show-feedback="false">
        <n-flex class="w-full" align="center">
          <n-form-item label="菜单名称">
            <n-input v-model:value="menuName" clearable placeholder="请输入菜单名称" @keyup.enter="menuName = menuName.trim()" />
          </n-form-item>
          <n-flex>
            <NButton type="primary" @click="menuName = menuName.trim()">
              <template #icon>
                <icon-park-outline-search />
              </template>
              查询
            </NButton>
            <NButton strong secondary @click="menuName = ''">
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

            <NButton type="primary" secondary @click="getAllMenus">
              <template #icon>
                <icon-park-outline-refresh />
              </template>
              刷新
            </NButton>
            <NButton type="primary" secondary @click="expandedRowKeys = getAllExpandKeys(tableData)">
              展开全部
            </NButton>
            <NButton type="primary" secondary @click="expandedRowKeys = []">
              折叠全部
            </NButton>
          </div>
        </NSpace>
      </template>

      <template #header-extra>
      <!-- <n-flex>
        <NButton type="primary" secondary @click="getAllMenus">
          <template #icon>
            <icon-park-outline-refresh />
          </template>
          刷新
        </NButton>
        <NPopconfirm @positive-click="handlePositiveClick">
          <template #trigger>
            <NButton type="error" secondary>
              <template #icon>
                <icon-park-outline-delete-five />
              </template>
              批量删除
            </NButton>
          </template>
          确认删除所有选中菜单？
        </NPopconfirm>
      </n-flex> -->
      </template>

      <n-data-table
        v-model:checked-row-keys="checkedRowKeys"
        :row-key="(row: AppRoute.RowRoute) => row.id"
        :expanded-row-keys="expandedRowKeys"
        :columns="columns"
        :data="filteredTableData"
        :loading="loading"
        size="small"
        :scroll-x="1200"
        @update:expanded-row-keys="expandedRowKeys = $event"
      />
      <TableModal ref="tableModalRef" :all-menus="tableData" modal-name="菜单管理" @success="getAllMenus" />
    </n-card>
  </NSpace>
</template>
