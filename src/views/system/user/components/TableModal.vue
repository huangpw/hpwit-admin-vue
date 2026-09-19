<script setup lang="ts">
import type { FormItemRule } from 'naive-ui'
import { useBoolean } from '@/hooks'
import {
  fetchAddUser,
  fetchDeptOptions,
  fetchDictOptions,
  fetchRoleOptions,
  fetchUpdateUser,
} from '@/service'

interface Props {
  modalName?: string
}

const {
  modalName = '',
} = defineProps<Props>()

const emit = defineEmits<{
  open: [] // ⭐ 打开弹窗
  close: [] // ⭐ 关闭弹窗
  success: [] // ⭐ 提交成功
}>()

const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)

const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const formDefault: Entity.User = {
  id: null,
  username: null,
  nickname: null,
  password: null,
  deptId: null,
  gender: null,
  roleIds: [],
  mobile: null,
  email: null,
  remark: null,
  status: 1,
}
const formModel = ref<Entity.User>({ ...formDefault })

type ModalType = 'add' | 'view' | 'edit'
const modalType = shallowRef<ModalType>('add')
const modalTitle = computed(() => {
  const titleMap: Record<ModalType, string> = {
    add: '添加',
    view: '查看',
    edit: '编辑',
  }
  return `${titleMap[modalType.value]}${modalName}`
})

async function openModal(type: ModalType = 'add', data: any) {
  emit('open')
  modalType.value = type
  getDeptOptions()
  getRoleOptions()
  getGenderOptions()
  showModal()
  const handlers = {
    async add() {
      formModel.value = { ...formDefault }
      formModel.value.nickname = null
    },
    async view() {
      if (!data)
        return
      formModel.value = { ...data }
    },
    async edit() {
      if (!data)
        return
      formModel.value = { ...data }
      if (data.roleIds) {
        const roleIds = Array.isArray(data.roleIds) ? data.roleIds : String(data.roleIds).split(',')
        formModel.value.roleIds = roleIds.map(Number)
      }
    },
  }
  await handlers[type]()
}

function closeModal() {
  hiddenModal()
  endLoading()
  emit('close')
}

defineExpose({
  openModal,
})

const formRef = ref()
async function submitModal() {
  const handlers = {
    async add() {
      const result = await fetchAddUser(formModel.value)
      if (!result.isSuccess) {
        window.$message.error(result.message || '提交失败')
        return false
      }
      window.$message.success('提交成功')
      emit('success') // ⭐ 通知父组件
      return true
    },
    async edit() {
      const result = await fetchUpdateUser(formModel.value)
      if (!result.isSuccess) {
        window.$message.error(result.message || '提交失败')
        return false
      }
      window.$message.success('提交成功')
      emit('success') // ⭐ 通知父组件
      return true
    },
    async view() {
      return true
    },
  }
  await formRef.value?.validate()
  startLoading()
  await handlers[modalType.value]() && closeModal()
}

const rules = {
  username: {
    required: true,
    message: '请输入用户名',
    trigger: 'blur',
  },
  nickname: {
    required: true,
    message: '请输入用户名',
    trigger: 'blur',
  },
  password: {
    required: true,
    message: '请输入用户密码',
    trigger: 'blur',
  },
  deptId: {
    required: true,
    // message: '请选择上级部门',
    validator: (_rule: FormItemRule, value: any) => {
      if (value === undefined || value === null) {
        return new Error('请选择所属部门')
      }
      return true
    },
    trigger: 'blur',
  },
  roleIds: {
    type: 'array',
    required: true,
    trigger: ['blur', 'change'],
    message: '请选择角色',
  } as FormItemRule,
}

const roleOptions = ref()
async function getRoleOptions() {
  const { data } = await fetchRoleOptions()
  roleOptions.value = (data ?? []).map(option => ({
    ...option,
    value: Number(option.value),
  }))
}
const deptOptions = ref()
async function getDeptOptions() {
  const { data } = await fetchDeptOptions()
  deptOptions.value = data
}
// 性别下拉 —— 走后端 /v1/dict/options?dictCode=gender(自带 Redis 缓存、status=1 过滤、sort 排序)
// 后端返回的 value 是字符串,这里转 number 以匹配 Entity.User.gender (0 | 1 | 2)
const genderOptions = ref<Entity.Option[]>([])
async function getGenderOptions() {
  const { data } = await fetchDictOptions('gender')
  genderOptions.value = (data ?? []).map(option => ({
    ...option,
    value: Number(option.value),
  }))
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible" :mask-closable="false" preset="card" :title="modalTitle" class="w-700px"
    :segmented="{
      content: true,
      action: true,
    }" draggable
  >
    <n-form
      ref="formRef" :rules="rules" label-placement="left" :model="formModel" :label-width="100"
      :disabled="modalType === 'view'"
    >
      <n-grid :cols="2" :x-gap="18">
        <n-form-item-grid-item :span="2" label="用户名" path="username">
          <n-input v-model:value="formModel.username" type="text" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="用户昵称" path="nickname">
          <n-input v-model:value="formModel.nickname" type="text" />
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="modalType === 'add'" :span="2" label="用户密码" path="password">
          <n-input v-model:value="formModel.password" type="password" show-password-on="mousedown" />
        </n-form-item-grid-item>

        <!-- 树形选择 -->
        <n-form-item-grid-item :span="2" path="deptId">
          <template #label>
            所属部门
          </template>
          <n-tree-select
            v-model:value="formModel.deptId" filterable clearable :options="deptOptions" default-expand-all
            key-field="value" label-field="label" children-field="children" placeholder="请选择所属部门"
          />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="性别" path="gender">
          <n-select v-model:value="formModel.gender" :options="genderOptions" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="角色" path="roleIds">
          <n-select
            v-model:value="formModel.roleIds" multiple filterable key-field="value" label-field="label"
            value-field="value" :options="roleOptions"
          />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="手机号" path="mobile">
          <n-input v-model:value="formModel.mobile" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="邮箱" path="email">
          <n-input v-model:value="formModel.email" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="备注" path="remark">
          <n-input v-model:value="formModel.remark" type="textarea" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="1" label="状态" path="status">
          <n-switch v-model:value="formModel.status" :checked-value="1" :unchecked-value="0">
            <template #checked>
              启用
            </template>
            <template #unchecked>
              禁用
            </template>
          </n-switch>
        </n-form-item-grid-item>
      </n-grid>
    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal">
          取消
        </n-button>
        <n-button type="primary" :loading="submitLoading" @click="submitModal">
          提交
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
