<script setup lang="ts">
import type { FormRules } from 'naive-ui'

import { useBoolean } from '@/hooks'
import {
  fetchAddDictItem,
  fetchUpdateDictItem,
} from '@/service'

interface Props {
  modalName?: string
  dictCode?: string
  status?: boolean
  dictData?: Entity.Dict[]
}

const {
  modalName = '',
  dictCode,
  status = false,
  dictData = [],
} = defineProps<Props>()

const emit = defineEmits<{
  open: []
  close: []
  success: []
}>()

const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const formDefault: Entity.DictItem = {
  id: undefined,
  dictCode: '',
  label: '',
  value: '',
  tagType: 'default',
  status: 1,
  sort: 1,
  remark: '',
}
const formModel = ref<Entity.DictItem>({ ...formDefault })

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

async function openModal(type: ModalType = 'add', data?: any) {
  emit('open')
  modalType.value = type
  showModal()
  const handlers = {
    async add() {
      formModel.value = { ...formDefault }
      formModel.value.dictCode = dictCode ?? ''
      // formModel.value.status = status ? 1 : 0
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
  if (modalType.value === 'view')
    return
  await formRef.value?.validate()
  const id = formModel.value.id
  if (modalType.value === 'edit' && id == null)
    return
  startLoading()
  try {
    const result = modalType.value === 'add'
      ? await fetchAddDictItem(formModel.value.dictCode, formModel.value)
      : await fetchUpdateDictItem(formModel.value.dictCode, id!, formModel.value)
    if (result.isSuccess) {
      window.$message.success('提交成功')
      emit('success')
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

const rules: FormRules = {
  label: {
    required: true,
    message: '请输入属性名称',
    trigger: ['input', 'blur'],
  },
  dictCode: {
    required: true,
    validator: (_rule, value) => {
      if (value === undefined || value === null) {
        return new Error('请选择分类编码')
      }
      return true
    },
    trigger: 'blur',
    // message: '请输入分类编码',
    // trigger: ['input', 'blur'],
  },
  value: {
    required: true,
    message: '请输入属性值',
    trigger: ['input', 'blur'],
  },
}
const dictOptions = computed(() => dictData.filter(item => item.dictCode).map(item => ({
  label: item.name ?? item.dictCode,
  value: item.dictCode!,
})))

const tagTypeOptions = [{
  label: 'default',
  value: 'default',
}, {
  label: 'tertiary',
  value: 'tertiary',
}, {
  label: 'primary',
  value: 'primary',
}, {
  label: 'success',
  value: 'success',
}, {
  label: 'info',
  value: 'info',
}, {
  label: 'warning',
  value: 'warning',
}, {
  label: 'error',
  value: 'error',
}]
</script>

<template>
  <n-modal
    v-model:show="modalVisible" :mask-closable="false" preset="card" :title="modalTitle" class="w-700px"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-form
      ref="formRef" :rules="rules" label-placement="left" :model="formModel" :label-width="100"
      :disabled="modalType === 'view'"
    >
      <n-form-item label="分类编码" path="dictCode">
        <n-select v-model:value="formModel.dictCode" :options="dictOptions" />
      </n-form-item>

      <n-form-item label="属性名称" path="label">
        <n-input v-model:value="formModel.label" />
      </n-form-item>

      <n-form-item v-if="!status" label="属性值" path="value">
        <n-input v-model:value="formModel.value" />
      </n-form-item>

      <n-form-item label="标签类型" path="tagType">
        <n-select v-model:value="formModel.tagType" :options="tagTypeOptions" />
      </n-form-item>

      <n-form-item label="备注" path="remark">
        <n-input v-model:value="formModel.remark" />
      </n-form-item>

      <n-form-item label="状态" path="status">
        <n-switch v-model:value="formModel.status" :checked-value="1" :unchecked-value="0" />
      </n-form-item>

      <n-form-item label="排序" path="sort">
        <n-input-number v-model:value="formModel.sort" />
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
