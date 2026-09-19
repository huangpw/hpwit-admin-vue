<script setup lang="ts">
import type { FormItemRule } from 'naive-ui'
import { useBoolean } from '@/hooks'
import {
  fetchAddRole,
  fetchUpdateRole,
} from '@/service'

interface Props {
  visible: boolean
  type?: ModalType
  modalData?: any
}
const {
  visible,
  type = 'add',
  modalData = null,
} = defineProps<Props>()

const emit = defineEmits<Emits>()
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// 初始化表单
const defaultFormModal: Entity.RoleModel = {
  id: 0,
  name: '',
  code: '',
  status: 1,
  sort: 1,
}
const formModel = ref({ ...defaultFormModal })
// 方法类型
interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'close'): void
  (e: 'success'): void
}
// 模态框显示状态
const modalVisible = computed({
  get() {
    return visible
  },
  set(visible) {
    closeModal(visible)
  },
})
// 关闭模态框
function closeModal(visible = false) {
  emit('update:visible', visible)
  endLoading()
  emit('close')
}
type ModalType = 'add' | 'edit'
const title = computed(() => {
  const titles: Record<ModalType, string> = {
    add: '添加角色',
    edit: '编辑角色',
  }
  return titles[type]
})
// 根据模态框类型更新表单数据
function UpdateFormModelByModalType() {
  const handlers = {
    add: () => {
      formModel.value = { ...defaultFormModal }
    },
    edit: () => {
      if (modalData)
        formModel.value = { ...modalData }
    },
  }
  handlers[type]()
}
watch(
  () => visible,
  (newValue) => {
    if (newValue)
      UpdateFormModelByModalType()
  },
)
// (1：所有数据，2：部门及子部门数据，3：本部门数据，4：本人数据)
const options = [
  {
    label: '所有数据',
    value: 1,
  },
  {
    label: '部门及子部门数据',
    value: 2,
  },
  {
    label: '本部门数据',
    value: 3,
  },
  {
    label: '本人数据',
    value: 4,
  },
]
// 表单校验规则
const rules = {
  name: {
    required: true,
    message: '请输入角色名称',
    trigger: 'blur',
  },
  code: {
    required: true,
    message: '请输入角色编码',
    trigger: 'blur',
  },
  dataScope: {
    required: true,
    // message: '请选择菜单类型',
    validator: (_rule: FormItemRule, value: unknown) => {
      if (value === undefined || value === null) {
        return new Error('请选择数据权限')
      }
      return true
    },
    trigger: 'blur',
  },
}
// 表单提交
const formRef = ref()
async function submitModal() {
  const handlers = {
    async add() {
      await fetchAddRole(formModel.value)
      window.$message.success('提交成功')
      emit('success') // ⭐ 通知父组件
      return true
    },
    async edit() {
      await fetchUpdateRole(formModel.value)
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
  await handlers[type]() && closeModal()
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible" :mask-closable="false" preset="card" :title="title" class="w-700px" :segmented="{
      content: true,
      action: true,
    }" draggable
  >
    <n-form ref="formRef" label-placement="left" :model="formModel" :rules="rules" label-align="left" :label-width="80">
      <n-grid :cols="24" :x-gap="18">
        <n-form-item-grid-item :span="24" label="角色名称" path="name">
          <n-input v-model:value="formModel.name" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="24" label="角色编码" path="code">
          <n-input v-model:value="formModel.code" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="24" label="数据权限" path="dataScope">
          <n-select v-model:value="formModel.dataScope" :options="options" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="24" label="状态" path="status">
          <n-radio-group v-model:value="formModel.status">
            <n-space>
              <n-radio :value="1">
                正常
              </n-radio>
              <n-radio :value="0">
                停用
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="24" label="排序" path="sort">
          <n-input-number v-model:value="formModel.sort" />
        </n-form-item-grid-item>
      </n-grid>
    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">
          取消
        </n-button>
        <n-button type="primary" :loading="submitLoading" @click="submitModal">
          提交
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped></style>
