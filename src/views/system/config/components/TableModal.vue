<script setup lang="ts">
import { useBoolean } from '@/hooks';
import {
  fetchAddConfig,
  fetchUpdateConfig,
} from '@/service';

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

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'success'): void
}
const emit = defineEmits<Emits>()

const defaultFormModal: Entity.Config = {
  id: null,
  configName: null,
  configKey: null,
  configValue: null,
  remark: null,
}
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const formRef = ref<FormInst | null>(null)
const formModel = ref({ ...defaultFormModal })

const modalVisible = computed({
  get() {
    return visible
  },
  set(visible) {
    closeModal(visible)
  },
})
function closeModal(visible = false) {
  emit('update:visible', visible)
}
type ModalType = 'add' | 'edit' | 'view'
const title = computed(() => {
  const titles: Record<ModalType, string> = {
    add: '添加系统配置',
    edit: '编辑系统配置',
  }
  return titles[type]
})
// 定义表单基础方法
function UpdateFormModelByModalType() {
  const handlers = {
    // 新增
    add: () => {
      formModel.value = { ...defaultFormModal }
    },
    // 编辑
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

const rules = {
  configName: {
    required: true,
    message: '请输入配置名称',
    trigger: ['input', 'blur']
  },
  configKey: {
    required: true,
    message: '请输入配置项',
    trigger: ['input', 'blur']
  },
  configValue: {
    required: true,
    message: '请输入配置值',
    trigger: ['input', 'blur']
  }
}

const onSubmit = async () => {
  await formRef.value?.validate()
  startLoading()
  const res = type === 'add' ? await fetchAddConfig(formModel.value) : await fetchUpdateConfig(formModel.value)
  if (res.isSuccess) {
    window.$message.success('提交成功')
    emit('success')
    closeModal()
  } else {
    window.$message.error(res.message)
  }
  endLoading()
}

</script>

<template>
  <n-modal v-model:show="modalVisible" :mask-closable="false" preset="card" :title="title" class="w-700px" :segmented="{
      content: true,
      action: true,
    }">
    <n-form label-placement="left" :model="formModel" ref="formRef" :rules="rules" label-align="left" :label-width="80">
      <n-grid :cols="24" :x-gap="18">

        <n-form-item-grid-item :span="24" label="配置名称" path="configName">
          <n-input v-model:value="formModel.configName" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="24" label="配置项" path="configKey">
          <n-input v-model:value="formModel.configKey" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="24" label="配置值" path="configValue">
          <n-input v-model:value="formModel.configValue" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="24" label="备注" path="remark">
          <n-input type="textarea" size="small" v-model:value="formModel.remark" :autosize="{
              minRows: 5,
              maxRows: 8,
            }" />
        </n-form-item-grid-item>

      </n-grid>
    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">
          取消
        </n-button>
        <n-button type="primary" :loading="loading" @click="onSubmit">
          提交
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped></style>
