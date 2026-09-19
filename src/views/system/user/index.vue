<script setup lang="tsx">
import type {
  DataTableColumns,
  TreeOption,
} from 'naive-ui'
import {
  NAvatar,
  NButton,
  NInput,
  NPopconfirm,
  NSpace,
  NSwitch,
  NTag,
} from 'naive-ui'

import CopyText from '@/components/custom/CopyText.vue'
import { useBoolean } from '@/hooks'
import {
  fetchDeptOptions,
  fetchExportUser,
  fetchUserPage,
} from '@/service'
import {
  cleanParams,
  downloadLink,
} from '@/utils'

import ImportModal from './components/ImportModal.vue'
import TableModal from './components/TableModal.vue'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: importVisible, setTrue: openImportModal } = useBoolean(false)

const initialModel = {
  username: '',
  nickname: '',
  mobile: '',
  deptId: null as number | null,
}
const model = ref({ ...initialModel })
function handleResetSearch() {
  model.value = { ...initialModel }
}

const modalRef = ref()

function deleteUser(id: number) {
  window.$message.success(`删除用户id:${id}`)
}
// 列表项
const columns: DataTableColumns<Entity.User> = [
  {
    title: '序号',
    key: 'index',
    width: 60,
    align: 'center',
    render: (_row, index) => index + 1,
  },
  {
    title: '昵称',
    align: 'center',
    key: 'nickname',
  },
  {
    title: '头像',
    align: 'center',
    key: 'avatar',
    render: (row) => {
      return (
        <NAvatar
          src={row.avatar}
          fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
        />
      )
    },
  },
  {
    title: '用户名',
    align: 'center',
    key: 'username',
  },
  {
    title: '性别',
    align: 'center',
    key: 'gender',
    render: (row) => {
      const genderMap: Record<number, { label: string, type: 'default' | 'success' | 'warning' }> = {
        0: { label: '保密', type: 'default' },
        1: { label: '男', type: 'success' },
        2: { label: '女', type: 'warning' },
      }

      const gender = genderMap[row.gender || 0]

      if (!gender)
        return '-'

      return (
        <NTag type={gender.type}>
          {gender.label}
        </NTag>
      )
    },
  },
  {
    title: '邮箱',
    align: 'center',
    key: 'email',
    render: (row) => {
      return (
        <CopyText value={row.email ?? undefined} />
      )
    },
  },
  {
    title: '手机号',
    align: 'center',
    key: 'mobile',
    render: (row) => {
      return (
        <CopyText value={row.mobile ?? undefined} />
      )
    },
  },
  // {
  //   title: '部门名称',
  //   align: 'center',
  //   key: 'deptName',
  //   render: (row) => {
  //     if (!row.deptName) {
  //       return '-'
  //     }
  //     return (
  //       <NTag size="small" type="default">
  //         {row.deptName}
  //       </NTag>
  //     )
  //   }
  // },
  {
    title: '角色',
    key: 'roleNames',
    align: 'center',
    width: 240,
    render: (row) => {
      if (!row.roleNames) {
        return '-'
      }
      const roles = row.roleNames.split(',')
      return (
        <NSpace justify="center" wrap>
          {roles.map(role => (
            <NTag size="small" type="info">
              {role}
            </NTag>
          ))}
        </NSpace>
      )
    },
  },
  {
    title: '状态',
    align: 'center',
    key: 'status',
    render: (row) => {
      return (
        <NSwitch
          value={row.status}
          checked-value={1}
          unchecked-value={0}
          onUpdateValue={(value: 0 | 1) =>
            handleUpdateDisabled(value, row.id!)}
        >
          {{ checked: () => '启用', unchecked: () => '禁用' }}
        </NSwitch>
      )
    },
  },
  {
    title: '备注',
    align: 'center',
    key: 'remark',
  },
  {
    title: '操作',
    align: 'center',
    key: 'actions',
    width: '16rem',
    render: (row) => {
      return (
        <NSpace justify="center">
          <NButton
            size="small"
            onClick={() => handleResetPassword(row)}
          >
            重置密码
          </NButton>
          <NButton
            size="small"
            onClick={() => modalRef.value.openModal('edit', row)}
          >
            编辑
          </NButton>
          <NPopconfirm onPositiveClick={() => deleteUser(row.id!)}>
            {{
              default: () => '确认删除',
              trigger: () => <NButton v-permission={['sys:user:delete']} size="small" type="error">删除</NButton>,
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
function handleUpdateDisabled(value: 0 | 1, id: number) {
  const index = listData.value.findIndex(item => item.id === id)
  if (index > -1)
    listData.value[index].status = value
}
// 加载用户列表
async function getUserPage() {
  startLoading()
  const params = cleanParams({
    pageNum: pagination.value.pageNum,
    pageSize: pagination.value.pageSize,
    ...model.value,
  })
  await fetchUserPage(params).then((res: any) => {
    listData.value = res.data.list
    pagination.value.count = res.data.total
    endLoading()
  })
}

onMounted(() => {
  getDeptOptions()
  getUserPage()
})

function changePage(page: number, size: number) {
  pagination.value.pageNum = page
  pagination.value.pageSize = size
  getUserPage()
  // window.$message.success(`分页器:${page},${size}`)
}

const treeData = ref<TreeOption[]>()

async function getDeptOptions() {
  const { isSuccess, data } = await fetchDeptOptions()
  if (isSuccess) {
    treeData.value = data as any
  }
}
// 树表点击事件
function handleSelect(keys: Array<string | number>, _options: Array<TreeOption | null>) {
  model.value.deptId = keys[0] as number
  // console.log('选中 key:', keys)
  // console.log('选中节点数据:', options?.[0])
  getUserPage()
}
// 导出数据
async function exportUser() {
  try {
    const res = await fetchExportUser() // .send()
    downloadLink(res, '用户列表.xlsx')
  }
  catch {
  }
}
// 重置密码
const password = ref('')
function handleResetPassword(row: Entity.User) {
  window.$dialog.warning({
    title: '重置密码',
    content: () =>
      h(NInput, {
        'type': 'password',
        'placeholder': `请输入用户【${row.username}】的新密码`,
        'value': password.value,
        'onUpdate:value': (val: string) => {
          password.value = val
        },
      }),
    positiveText: '确定',
    negativeText: '取消',
    async onPositiveClick() {
      if (!password.value || password.value.length < 6) {
        window.$message.error('密码至少需要 6 位字符')
        // 阻止对话框关闭
        return false
      }

      try {
        // await UserAPI.resetPassword(row.id, password.value)
        window.$message.success('密码重置成功')
      }
      catch {
        window.$message.error('密码重置失败')
        return false
      }
    },
  })
}
</script>

<template>
  <n-flex :wrap="false">
    <!-- 左树: 部门列表 -->
    <n-card class="w-70">
      <n-tree
        block-line :data="treeData" :show-line="true" key-field="value" label-field="label" :cancelable="false"
        default-expand-all @update:selected-keys="handleSelect"
      />
    </n-card>

    <!-- 左表: 用户列表 -->
    <NSpace vertical class="flex-1 min-w-0">
      <n-card>
        <n-form ref="formRef" :model="model" label-placement="left" inline :show-feedback="false">
          <n-flex>
            <n-form-item label="昵称" path="nickname">
              <NInput v-model:value="model.nickname" placeholder="请输入">
                <template #password-invisible-icon />
              </NInput>
            </n-form-item>
            <n-form-item label="用户名" path="username">
              <NInput v-model:value="model.username" placeholder="请输入" />
            </n-form-item>
            <n-form-item label="手机号" path="mobile">
              <NInput v-model:value="model.mobile" placeholder="请输入" />
            </n-form-item>
            <n-flex class="ml-auto">
              <NButton type="primary" @click="getUserPage">
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

      <n-card class="flex-1 min-w-0">
        <template #header>
          <div class="flex gap-4">
            <NButton v-permission="['sys:user:add']" type="primary" @click="modalRef.openModal('add')">
              <template #icon>
                <icon-park-outline-add-one />
              </template>
              新建用户
            </NButton>
            <NButton strong secondary @click="openImportModal">
              <template #icon>
                <icon-park-outline-upload />
              </template>
              导入
            </NButton>
            <NButton strong secondary @click="exportUser">
              <template #icon>
                <icon-park-outline-download />
              </template>
              导出
            </NButton>

            <n-flex class="ml-auto">
              <!-- <NButton strong secondary class="ml-a" @click="openImportModal">
                <template #icon>
                  <icon-park-outline-upload />
                </template>
                导入
              </NButton>
              <NButton strong secondary class="ml-a" @click="exportUser">
                <template #icon>
                  <icon-park-outline-download />
                </template>
                导出
              </NButton> -->
            </n-flex>
          </div>
        </template>
        <NSpace vertical>
          <n-data-table :columns="columns" :data="listData" :loading="loading" />
          <Pagination :count="pagination.count" @change="changePage" />
        </NSpace>

        <TableModal ref="modalRef" modal-name="用户" @success="getUserPage" />

        <!-- 导入弹窗 -->
        <ImportModal v-model:visible="importVisible" modal-name="用户" />
      </n-card>
    </NSpace>
  </n-flex>
</template>

<style>
.my-btn {
  width: 30px;
  height: 30px;
}
</style>
