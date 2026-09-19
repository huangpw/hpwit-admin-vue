<script setup lang="ts">
import type { FormItemRule, FormRules } from 'naive-ui'

import { useBoolean } from '@/hooks'
import {
  fetchAddDept,
  fetchDeptOptions,
  fetchUpdateDept,
} from '@/service'

interface Props {
  modalName?: string
  allDepts: Entity.Dept[]
}

const {
  modalName = '',
} = defineProps<Props>()

const emit = defineEmits<{
  open: []
  close: []
  success: []
}>()

const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
// 部门表单
const formDefault: Entity.Dept = {
  id: null,
  parentId: -1,
  name: null,
  code: null,
  sort: 1,
  status: 1,
}
const formModel = ref<Entity.Dept>({ ...formDefault })
// 标题
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

// 打开弹窗表单
async function openModal(type: ModalType = 'add', data: Entity.Dept) {
  emit('open')
  modalType.value = type
  getDeptOptions() // 加载部门树
  showModal()
  const handlers = {
    async add() {
      formModel.value = { ...formDefault }
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
      formModel.value.parentId = data.parentId === 0 ? -1 : data.parentId
    },
  }
  await handlers[type]()
}
// 关闭弹窗
function closeModal() {
  hiddenModal()
  endLoading()
  emit('close')
}
// 将组件方法暴露出去
defineExpose({
  openModal,
})
// 提交表单
const formRef = ref()
async function submitModal() {
  const submit = {
    id: formModel.value.id,
    name: formModel.value.name,
    code: formModel.value.code,
    parentId: formModel.value.parentId === -1 ? 0 : formModel.value.parentId,
    status: formModel.value.status,
    sort: formModel.value.sort,
  }
  const handlers = {
    async add() {
      await fetchAddDept(submit)
      window.$message.success('提交成功')
      emit('success') // ⭐ 通知父组件
      return true
    },
    async edit() {
      await fetchUpdateDept(submit)
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
// 表单验证规则
const rules: FormRules = {
  parentId: {
    required: true,
    // message: '请选择上级部门',
    validator: (_rule: FormItemRule, value: unknown) => {
      if (value === undefined || value === null) {
        return new Error('请选择上级部门')
      }
      return true
    },
    trigger: 'blur',
  },
  name: {
    required: true,
    message: '请输入部门名称',
    trigger: 'blur',
  },
  code: {
    required: true,
    message: '请输入部门编号',
    trigger: 'blur',
  },
  sort: {
    required: true,
    type: 'number',
    message: '请输入显示排序',
    trigger: ['change', 'blur'],
  },
}
// 加载部门树
const options = ref()
async function getDeptOptions() {
  const { data } = await fetchDeptOptions()
  if (data.length > 0) {
    options.value = [{
      value: -1,
      label: '顶级部门',
      children: data,
    }]
  }
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
      ref="formRef" :rules="rules" label-placement="left" :label-width="100" :model="formModel"
      :disabled="modalType === 'view'"
    >
      <n-grid :cols="2" :x-gap="18">
        <n-form-item-grid-item :span="2" path="parentId">
          <template #label>
            上级部门
          </template>
          <n-tree-select
            v-model:value="formModel.parentId" filterable clearable :options="options" default-expand-all
            key-field="value" label-field="label" children-field="children" placeholder="请选择上级部门"
          />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="部门名称" path="name">
          <n-input v-model:value="formModel.name" placeholder="请输入部门名称" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="部门编号" path="code">
          <n-input v-model:value="formModel.code" placeholder="请输入部门编号" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" path="sort">
          <template #label>
            显示排序
          </template>
          <n-input-number v-model:value="formModel.sort" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="部门状态" path="status">
          <n-radio-group v-model:value="formModel.status" name="radiogroup">
            <n-space>
              <n-radio :value="1">
                正常
              </n-radio>
              <n-radio :value="0">
                禁用
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item-grid-item>
      </n-grid>
    </n-form>
    <template v-if="modalType !== 'view'" #action>
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

<style scoped></style>
