<script setup lang="ts">
import type { UploadOnChange } from 'naive-ui'
import { fetchImportUser } from '@/service'

// 接收父组件传递参数
const {
  visible,
} = defineProps<Props>()

// 父组件调用事件
const emit = defineEmits<Emits>()

// 定义字段类型
interface Props {
  visible: boolean
}
interface Emits {
  (e: 'update:visible', visible: boolean): void
}

// 表单数据
const defaultFormModal: Entity.ExcelImport = {
  file: null,
  fileName: null,
  operationType: ['add', 'update'],
}
const formModel = ref({ ...defaultFormModal })
// 弹窗状态
const modalVisible = computed({
  get() {
    return visible
  },
  set(visible) {
    closeModal(visible)
  },
})
// 关闭弹窗
function closeModal(visible = false) {
  Object.assign(formModel.value, defaultFormModal)
  emit('update:visible', visible)
}

// 弹窗标题
const title = computed(() => '用户导入')

const loading = ref(false)
// 验证规则
const rules = {
  // file: {
  //   required: true,
  //   message: '请选择Excel文件',
  //   trigger: ['input']
  // }
}

// 选择文件
const handleFileChange: UploadOnChange = ({ file, fileList }) => {
  if (fileList.length === 0) {
    formModel.value.file = null
    formModel.value.fileName = ''
  }
  else {
    formModel.value.file = file.file
    formModel.value.fileName = file.name
  }
}

// 导入
async function handleImport() {
  if (!formModel.value.file) {
    window.$message.warning('请先选择Excel文件')
    return
  }

  const formData = new FormData()
  formData.append('file', formModel.value.file)
  formData.append('operationType', Array.isArray(formModel.value.operationType)
    ? formModel.value.operationType.join(',')
    : formModel.value.operationType ?? '')

  loading.value = true
  try {
    const res = await fetchImportUser(formData)
    if (res.isSuccess) {
      window.$message.success('导入成功')
      closeModal(false)
    }
    else {
      window.$message.error(res.message)
    }
  }
  catch (err) {
    window.$message.error(err instanceof Error ? err.message : '导入异常')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible" :mask-closable="false" preset="card" :title="title" class="w-700px" :segmented="{
      content: true,
      action: true,
    }" draggable
  >
    <n-form
      ref="formRef" label-placement="left" :model="formModel" :rules="rules" label-align="left"
      :label-width="100"
    >
      <!-- 文件选择 -->
      <n-form-item label="Excel文件">
        <n-upload ref="uploadRef" :default-upload="false" :show-file-list="true" :max="1" :on-change="handleFileChange">
          <n-button>选择文件</n-button>
        </n-upload>
        <div v-if="formModel.fileName" style="margin-top: 8px;width: auto;">
          已选择：{{ formModel.fileName }}
        </div>
      </n-form-item>

      <n-form-item label="操作类型">
        <n-checkbox-group v-model:value="formModel.operationType">
          <n-space item-style="display: flex;">
            <n-checkbox value="add" label="新增" />
            <n-checkbox value="update" label="更新" />
          </n-space>
        </n-checkbox-group>
      </n-form-item>
    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">
          取消
        </n-button>
        <n-button type="primary" :loading="loading" @click="handleImport">
          开始导入
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped></style>
