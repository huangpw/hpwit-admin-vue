<script setup lang="ts">
import type { FormRules } from 'naive-ui'

import { useBoolean } from '@/hooks'
import {
  fetchAddDict,
  fetchUpdateDict,
} from '@/service'

interface Props {
  modalName?: string
}

// 父组件传参
const {
  modalName = '字典项',
} = defineProps<Props>()

// 子组件传参
const emits = defineEmits(['open', 'submit', 'close', 'success'])

// 显示弹窗状态
const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)
// 提交按钮状态
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// 表单字段源
const formDefault: Entity.DictForm = {
  id: undefined,
  dictCode: '',
  name: '',
  status: 1,
  remark: '',
}
const formModel = ref<Entity.DictForm>({ ...formDefault })
// 弹窗类型
type ModalType = 'add' | 'view' | 'edit'
const modalType = shallowRef<ModalType>('add')
const modalTitle = computed(() => {
  const titleMap: Record<ModalType, string> = {
    add: `添加${modalName}`,
    view: `查看${modalName}`,
    edit: `编辑${modalName}`,
  }
  return titleMap[modalType.value]
})

// 父组件调用方法
async function openModal(type: ModalType = 'add', data?: any) {
  emits('open') // 给父组件回调
  modalType.value = type
  showModal() // 显示弹窗
  const handlers = {
    async add() { // 新增
      formModel.value = { ...formDefault }
    },
    async view() { // 查看
      if (!data)
        return
      formModel.value = { ...data }
    },
    async edit() { // 编辑
      if (!data)
        return
      formModel.value = { ...data }
    },
  }
  await handlers[type]()
}

// 关闭弹窗
function closeModal() {
  hiddenModal()
  endLoading()
  emits('close')
}

// 将方法暴露给父组件
defineExpose({
  openModal,
})

// 提交
const formRef = ref()
async function submitModal() {
  if (modalType.value === 'view')
    return
  await formRef.value?.validate()
  startLoading()
  try {
    const result = modalType.value === 'add'
      ? await fetchAddDict(formModel.value)
      : await fetchUpdateDict(formModel.value)
    if (result.isSuccess) {
      window.$message.success('提交成功')
      emits('success')
      closeModal()
    }
    else {
      window.$message.error(result.message)
    }
  }
  finally {
    endLoading()
  }
}

// 数据校验
const rules: FormRules = {
  name: {
    required: true,
    message: '请输入分类名称',
    trigger: ['input', 'blur'],
  },
  dictCode: {
    required: true,
    message: '请输入分类编码',
    trigger: ['input', 'blur'],
  },
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    :title="modalTitle"
    draggable
    class="w-700px"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-form ref="formRef" :rules="rules" label-placement="left" :model="formModel" :label-width="100">
      <n-form-item label="字典名称" path="name">
        <n-input v-model:value="formModel.name" />
      </n-form-item>
      <n-form-item label="字典码" path="dictCode">
        <n-input v-model:value="formModel.dictCode" />
      </n-form-item>
      <n-form-item label="备注" path="remark">
        <n-input v-model:value="formModel.remark" />
      </n-form-item>
      <n-form-item label="状态" path="status">
        <n-switch v-model:value="formModel.status" :checked-value="1" :unchecked-value="0" />
      </n-form-item>
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
