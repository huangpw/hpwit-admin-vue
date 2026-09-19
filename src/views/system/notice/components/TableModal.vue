<script setup lang="ts">
import type { FormInst } from 'naive-ui'
import { useBoolean } from '@/hooks'
import {
  fetchAddNotice,
  fetchDictOptions,
  fetchUpdateNotice,
  fetchUserOptions,
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
interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'success'): void
}
const defaultFormModal: Entity.Notice = {
  id: null,
  title: null,
  publishStatus: 0,
  type: null,
  publisherName: '',
  level: null,
  content: null,
  publishTime: '',
  isRead: null,
  targetType: 1,
  createTime: null,
  revokeTime: null,
  targetUserIds: [],
}
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const formRef = ref<FormInst | null>(null)
const formModel = ref({ ...defaultFormModal })
// 富文本编辑器只接受 string，用代理对 content 做空值转换
const contentModel = computed({
  get: () => formModel.value.content ?? '',
  set: (value: string) => {
    formModel.value.content = value
  },
})

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
    add: '添加通知公告',
    edit: '编辑通知公告',
    view: '查看通知公告',
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
    view: () => {
      if (modalData)
        formModel.value = { ...modalData }
    },
  }
  handlers[type]()
}
watch(
  () => visible,
  (newValue) => {
    if (newValue) {
      getTypeOptions()
      getLevelOptions()
      UpdateFormModelByModalType()
    }
  },
)

const rules = {
  title: {
    required: true,
    message: '请输入通知标题',
    trigger: ['input', 'blur'],
  },
  type: {
    required: true,
    validator: (_rule: unknown, value: number | null) => {
      if (value === undefined || value === null) {
        return new Error('请选择通知类型')
      }
      return true
    },
    trigger: 'blur',
  },
  content: {
    required: true,
    message: '请输入通知内容',
    trigger: ['input', 'blur'],
  },
}

async function onSubmit() {
  await formRef.value?.validate()
  startLoading()
  const res = type === 'add' ? await fetchAddNotice(formModel.value) : await fetchUpdateNotice(formModel.value)
  if (res.isSuccess) {
    window.$message.success('提交成功')
    emit('success')
    closeModal()
  }
  else {
    window.$message.error(res.message)
  }
  endLoading()
}

// 后端返回的 value 是字符串,这里转 number 以匹配 Entity.Notice.type
const typeOptions = ref<Entity.Option[]>([])
async function getTypeOptions() {
  const { data } = await fetchDictOptions('notice_type')
  typeOptions.value = (data ?? []).map(option => ({
    ...option,
    value: Number(option.value),
  }))
}

const levelOptions = ref<Entity.Option[]>([])
async function getLevelOptions() {
  const { data } = await fetchDictOptions('notice_level')
  levelOptions.value = data ?? []
}

function onUpdateValue(value: number) {
  if (value === 2) {
    getUserList()
  }
}

const userOptions = ref<Entity.Option[]>([])
async function getUserList() {
  // 加载用户
  const res = await fetchUserOptions({})
  if (res.data.length > 0) {
    userOptions.value = res.data.map((item): Entity.Option => {
      return {
        label: item.nickname ?? '',
        value: item.id ?? undefined,
      }
    })
  }
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible" :mask-closable="false" preset="card" draggable :title="title" class="w-1200px"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-form ref="formRef" label-placement="left" :model="formModel" :rules="rules" label-align="right" :label-width="100" :disabled="type === 'view'">
      <n-grid :cols="24" :x-gap="18">
        <n-form-item-grid-item :span="24" label="标题" path="title">
          <n-input v-model:value="formModel.title" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="12" label="通知类型" path="type">
          <n-select v-model:value="formModel.type" :options="typeOptions" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="12" />

        <n-form-item-grid-item :span="12" label="通知等级" path="level">
          <n-select v-model:value="formModel.level" :options="levelOptions" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="12" />

        <n-form-item-grid-item :span="24" label="目标类型" path="targetType">
          <n-radio-group v-model:value="formModel.targetType" name="radiogroup" @update:value="onUpdateValue">
            <n-space>
              <n-radio :value="1">
                全体
              </n-radio>
              <n-radio :value="2">
                指定
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="formModel.targetType === 2" :span="24" label="指定用户" path="targetUserIds">
          <n-select v-model:value="formModel.targetUserIds" multiple :options="userOptions" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="24" label="通知内容" path="content">
          <div class="h-400px w-full mb-6">
            <RichTextEditor v-model="contentModel" :disabled="type === 'view'" />
          </div>
        </n-form-item-grid-item>
      </n-grid>
    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">
          取消
        </n-button>
        <n-button v-if="type !== 'view'" type="primary" :loading="loading" @click="onSubmit">
          提交
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped></style>
