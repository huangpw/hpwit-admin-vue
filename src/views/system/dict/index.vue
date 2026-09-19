<script setup lang="tsx">
import type { HTMLAttributes } from 'vue'

import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NFlex,
  NInput,
  NPopconfirm,
  NSpace,
  NTag,
} from 'naive-ui'

import CopyText from '@/components/custom/CopyText.vue'
import { useBoolean } from '@/hooks'
import {
  fetchDelDictByIds,
  fetchDelDictItemByIds,
  fetchDictItemList,
  fetchDictList,
  fetchUpdateDictItemStatus,
  fetchUpdateDictStatus,
} from '@/service'

import DictItemModal from './components/DictItemModal.vue'
import DictModal from './components/DictModal.vue'
import { getTertiaryColor } from '@/utils'

/**
 * Naive UI <n-tag> 支持的 type 联合类型(不含 'tertiary')。
 * 字典项的 tagType 字段直接作为 n-tag 的 type,
 * 不在枚举内(含空值)统一 fallback 为 'default'。
 * 'tertiary' 不是合法值,在 render 中单独走 NTag color 自定义色 + 不传 type。
 */
type TagType = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'

const { bool: dictLoading, setTrue: startDictLoading, setFalse: endDictLoading } = useBoolean(false)
const { bool: contentLoading, setTrue: startContentLoading, setFalse: endContentLoading } = useBoolean(false)

const dictRef = ref<InstanceType<typeof DictModal>>()
const dictContentRef = ref<InstanceType<typeof DictItemModal>>()
const dictKeyword = ref('')
const contentKeyword = ref('')
const lastDictCode = ref('')

function handleDictSearch() {
  getDictList(dictKeyword.value)
}

function handleContentSearch() {
  if (!lastDictCode.value)
    return
  getDictItemContent(lastDictCode.value, contentKeyword.value)
}

// 加载分类库列表
onMounted(() => {
  getDictList()
})

const dictData = ref<Entity.Dict[]>([])
const dictContentData = ref<Entity.DictItem[]>([])

async function getDictList(keywordValue?: string) {
  startDictLoading()
  const { data, isSuccess } = await fetchDictList(keywordValue)
  if (isSuccess) {
    data.forEach((item) => {
      item.isActive = false
    })
    dictData.value = data
    getDictItemContent(data[0]?.dictCode || '')
  }
  endDictLoading()
}

// 获取分类数据列表
async function getDictItemContent(code: string, keywordValue = '') {
  startContentLoading()
  const res = await fetchDictItemList(code, keywordValue)
  dictContentData.value = res.data
  lastDictCode.value = code

  // 先清除其他行高亮
  dictData.value.forEach(r => r.isActive = false)
  // 当前行高亮
  const index = dictData.value.findIndex(r => r.dictCode === code)
  dictData.value[index].isActive = true
  endContentLoading()
}

// 分类库列配置
const dictColumns: DataTableColumns<Entity.Dict> = [
  {
    title: '#',
    key: 'key',
    width: 50,
    render: (_, index) => {
      return `${index + 1}`
    },
  },
  {
    title: '分类名称',
    key: 'name',
  },
  {
    title: '分类编码',
    key: 'dictCode',
    render: (row) => {
      return (
        <CopyText value={row.dictCode} />
      )
    },
  },
  {
    title: '状态',
    align: 'center',
    key: 'status',
    // width: '120',
    render: (row: any) => {
      return (
        <n-switch
          size="small"
          value={row.status === 1}
          onUpdateValue={async (val: boolean) => {
            row.status = val ? 1 : 0
            const res = await fetchUpdateDictStatus(row.id, row.status)
            if (res.isSuccess) {
              window.$message.success(res.message)
            }
            else {
              window.$message.error(res.message)
            }
          }}
        />
      )
    },
    // render: (row) => {
    //   if (row.status) {
    //     return (
    //       <NTag size="small" type={row.status === 1 ? 'success' : 'error'}>
    //         {row.status === 0 ? '禁用' : '启用'}
    //       </NTag>
    //     )
    //   }
    // },
  },
  {
    title: '操作',
    key: 'actions',
    align: 'center',
    render: (row) => {
      return (
        <NFlex justify="center">
          <NButton
            size="small"
            onClick={() => getDictItemContent(row.dictCode || '')}
          >
            查看分类
          </NButton>
          <NButton
            size="small"
            onClick={() => dictRef.value!.openModal('edit', row)}
          >
            编辑
          </NButton>
          <NPopconfirm onPositiveClick={() => deleteDict(row.id!)}>
            {{
              default: () => (
                <span>
                  确认删除分类
                  <b>{row.label}</b>
                  {' '}
                  ？
                </span>
              ),
              trigger: () => <NButton size="small" type="error">删除</NButton>,
            }}
          </NPopconfirm>
        </NFlex>
      )
    },
  },
]
// 分类数据列配置
const contentColumns: DataTableColumns<Entity.DictItem> = [
  {
    title: '#',
    key: 'key',
    width: 50,
    render: (_, index) => {
      return `${index + 1}`
    },
  },
  {
    title: '分类编码',
    key: 'dictCode',
    // render: (row) => {
    //   return <NTag type="warning">{row.dictCode}</NTag>
    // },
  },
  {
    title: '属性名称',
    key: 'label',
  },
  {
    title: '属性值',
    key: 'value',
  },
  {
    title: '标签类型',
    key: 'tagType',
    // 字典项的 tagType 字段直接作为 n-tag 的 type,
    // 不在 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' 枚举内
    // (含空值)统一 fallback 为 'default';tertiary 单独走中性灰阶
    render: (row: Entity.DictItem) => {
      // 用 narrowed 前的原始字符串与 'tertiary' 比较,避免 TagType 联合类型不重叠的告警
      if (row.tagType === 'tertiary') {
        return (
          <NTag color={getTertiaryColor()}>
            {row.tagType}
          </NTag>
        )
      }
      else {
        const type = (row.tagType || 'default') as TagType
        return (
          <NTag type={type}>
            {row.tagType}
          </NTag>
        )
      }
    },
  },
  {
    title: '状态',
    align: 'center',
    key: 'status',
    // width: '120',
    render: (row: any) => {
      return (
        <n-switch
          size="small"
          value={row.status === 1}
          onUpdateValue={async (val: boolean) => {
            row.status = val ? 1 : 0
            const res = await fetchUpdateDictItemStatus(row.id, row.status)
            if (res.isSuccess) {
              window.$message.success(res.message)
            }
            else {
              window.$message.error(res.message)
            }
          }}
        />
      )
    },
    // render: (row) => {
    //   if (row.status) {
    //     return (
    //       <NTag size="small" type={row.status === 1 ? 'success' : 'error'}>
    //         {row.status === 0 ? '禁用' : '启用'}
    //       </NTag>
    //     )
    //   }
    // },
  },
  {
    title: '排序',
    key: 'sort',
  },
  {
    title: '备注',
    key: 'remark',
  },
  {
    title: '操作',
    key: 'actions',
    align: 'center',
    // width: '15em',
    render: (row) => {
      return (
        <NFlex justify="center">
          <NButton
            size="small"
            onClick={() => dictContentRef.value!.openModal('edit', row)}
          >
            编辑
          </NButton>
          <NPopconfirm onPositiveClick={() => deleteDictItem(row)}>
            {{
              default: () => (
                <span>
                  确认删除分类值
                  <b>{row.label}</b>
                  {' '}
                  ？
                </span>
              ),
              trigger: () => <NButton size="small" type="error">删除</NButton>,
            }}
          </NPopconfirm>
        </NFlex>
      )
    },
  },
]

// 删除分类库ById
async function deleteDict(id: number) {
  const { isSuccess } = await fetchDelDictByIds(String(id)) as Service.ResponseResult<null>
  if (isSuccess) {
    window.$message.success(`删除成功`)
    getDictList()
  }
}

// 删除分类数据ById
async function deleteDictItem(row: Entity.DictItem) {
  const { isSuccess } = await fetchDelDictItemByIds(String(row.id)) as Service.ResponseResult<null>
  if (isSuccess) {
    window.$message.success(`删除成功`)
    getDictItemContent(row.dictCode)
  }
}

// 单击获取
function rowProps(row: any, _index: number): HTMLAttributes {
  return {
    // 单击行触发:加载分类数据并高亮(选中态由 getDictItemContent 内部统一管理)
    onClick: (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 操作列按钮(查看/编辑/删除)的点击不触发行选中,避免冒泡冲突
      if (target.closest('button'))
        return
      getDictItemContent(row.dictCode)
    },
  }
}
// 选中行高亮
function rowClassName(row: any) {
  return row.isActive ? 'row-active' : ''
}
</script>

<template>
  <NFlex>
    <!-- 分类项 -->
    <div class="basis-2/5">
      <n-card>
        <template #header>
          <NSpace vertical size="large">
            <div class="flex gap-4">
              <NButton type="primary" @click="dictRef!.openModal('add')">
                <template #icon>
                  <icon-park-outline-add-one />
                </template>
                新建
              </NButton>

              <NButton type="primary" secondary @click="() => getDictList()">
                <template #icon>
                  <icon-park-outline-refresh />
                </template>
                刷新
              </NButton>
            </div>
          </NSpace>
        </template>
        <template #header-extra>
          <NSpace>
            <NInput
              v-model:value="dictKeyword"
              clearable
              placeholder="请输入分类名称或编码"
              @keyup.enter="handleDictSearch"
            />
            <NButton type="primary" secondary @click="handleDictSearch">
              搜索
            </NButton>
          </NSpace>
          <!-- <NFlex>
            <NButton type="primary" secondary @click="getDictList">
              <template #icon>
                <icon-park-outline-refresh />
              </template>
              刷新
            </NButton>
          </NFlex> -->
        </template>
        <n-data-table
          :columns="dictColumns"
          :data="dictData"
          :loading="dictLoading"
          :pagination="false"
          :bordered="false"
          :row-props="rowProps"
          :row-class-name="rowClassName"
        />
      </n-card>
    </div>
    <!-- 分类数据 -->
    <div class="flex-1">
      <n-card>
        <template #header>
          <NFlex>
            <NButton type="primary" :disabled="!lastDictCode" @click="dictContentRef!.openModal('add')">
              <template #icon>
                <icon-park-outline-add-one />
              </template>
              新建
            </NButton>
            <NButton type="primary" :disabled="!lastDictCode" secondary @click="getDictItemContent(lastDictCode)">
              <template #icon>
                <icon-park-outline-refresh />
              </template>
              刷新
            </NButton>
          </NFlex>
        </template>
        <template #header-extra>
          <NFlex class="w-full">
            <NInput
              v-model:value="contentKeyword"
              class="flex-1"
              clearable
              placeholder="请输入属性名称或值"
              :disabled="!lastDictCode"
              @keyup.enter="handleContentSearch"
            />
            <NButton type="primary" secondary :disabled="!lastDictCode" @click="handleContentSearch">
              搜索
            </NButton>
          </NFlex>
        </template>
        <n-data-table
          :columns="contentColumns"
          :data="dictContentData"
          :loading="contentLoading"
          :pagination="false"
          :bordered="false"
        />
      </n-card>
    </div>
    <!-- 分类库弹窗 -->
    <DictModal ref="dictRef" modal-name="分类" @success="getDictList" />
    <!-- 分类数据弹窗 -->
    <DictItemModal
      ref="dictContentRef"
      :dict-data="dictData"
      modal-name="属性"
      :dict-code="lastDictCode"
      @success="getDictItemContent(lastDictCode)"
    />
  </NFlex>
</template>

<style scoped>
/* 颜色高亮 —— 选中态用半透明深蓝,与 hover 区分明显 */
::v-deep .n-data-table-tr.row-active > .n-data-table-td {
  background-color: rgba(24, 144, 255, 0.2) !important;
  /* background-color: #cceeff !important; */
}
</style>
