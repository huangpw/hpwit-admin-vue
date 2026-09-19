<template>
  <n-modal v-model:show="modalVisible" :mask-closable="false" preset="card" :title="modalTitle" class="w-700px"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-form label-placement="left" :model="formModel" ref="formRef" label-align="left" :label-width="100">
      <!-- 文件选择 -->
      <n-form-item>
        <n-upload ref="uploadRef" directory-dnd :multiple="props.multiple" :default-upload="false"
          :show-file-list="true" :max="props.max" :accept="FILE_TYPE_CONFIG[fileType].accept || undefined"
          :on-change="handleFileChange">
          <n-upload-dragger>
            <div style="margin-bottom: 12px">
              <n-icon size="68" :depth="5">
                <icon-park-outline-file-addition />
              </n-icon>
            </div>
            <n-text style="font-size: 16px">
              点击或者拖动文件到该区域来上传
            </n-text>
            <n-p depth="3" style="margin: 8px 0 0 0">
              请不要上传敏感数据，比如你的银行卡号和密码，信用卡号有效期和安全码
            </n-p>
          </n-upload-dragger>
        </n-upload>
      </n-form-item>

    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">
          取消
        </n-button>
        <n-button type="primary" :loading="loading" @click="handleImport">
          开始上传
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import type {
  FormInst,
  UploadFileInfo,
  UploadInst,
  UploadOnChange,
} from 'naive-ui';

import { fetchUploadFile } from '@/service';

const formRef = ref<FormInst | null>(null)
const uploadRef = ref(null)
const loading = ref(false);

const FILE_TYPE_CONFIG = {
  excel: {
    accept: '.xls,.xlsx',
    mime: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  },
  image: {
    accept: '.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg',
    mime: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml']
  },
  pdf: {
    accept: '.pdf',
    mime: ['application/pdf']
  },
  all: {
    accept: '',      // 👈 不限制
    mime: []          // 👈 不校验
  }
} as const

export type UploadFileType =
  | 'excel'
  | 'image'
  | 'pdf'
  | 'all'   // 👈 不限制类型
// 定义字段类型
interface Props {
  visible?: boolean
  modalName?: string
  max?: number,
  multiple?: boolean,
  fileType?: UploadFileType
}
// 接收父组件传递参数
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  modalName: '',
  max: 1,
  multiple: false
})

// 父组件调用事件
interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'success', res: any): void
}
const emit = defineEmits<Emits>()

// 表单数据
const defaultFormModal: Entity.UploadFile = {
  file: null,
  fileName: null
}
const formModel = ref({ ...defaultFormModal })

// 弹窗状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})
// 关闭弹窗
function closeModal(visible = false) {
  Object.assign(formModel.value, defaultFormModal)
  emit('update:visible', visible)
}

// 弹窗标题
const modalTitle = computed(() => `上传${props.modalName || '文件'}`)

// 文件格式校验
const beforeUpload: UploadBeforeUpload = ({ file }) => {
  const rawFile = file.file
  if (!rawFile) return false

  // ✅ 不限制类型
  if (props.fileType === 'all') {
    return true
  }

  const config = FILE_TYPE_CONFIG[props.fileType]

  const isValidMime = config.mime.includes(rawFile.type as any)
  const isValidExt = new RegExp(`(${config.accept.replace(/\./g, '\\.')})$`, 'i')
    .test(rawFile.name)

  if (!isValidMime || !isValidExt) {
    window.$message.warning(`文件类型必须是 ${config.accept}`)
    return false
  }

  return true
}

// 选择文件
const handleFileChange: UploadOnChange = ({ file, fileList }: {
  file: UploadFileInfo
  fileList: UploadFileInfo[]
}) => {
  if(fileList.length === 0) {
    formModel.value.file = null
    formModel.value.fileName = null
    return
  }
  formModel.value.file = file.file
  formModel.value.fileName = file.name
};

// 导入
const handleImport = async () => {
  if (!formModel.value.file) {
    window.$message.warning(`请先选择${ props.modalName }文件`);
    return
  }

  const formData = new FormData();
  formData.append("file", formModel.value.file);

  loading.value = true;
  try {
    const res = await fetchUploadFile(formData);
    //  console.log(res, 'fetchS1ExhibitorImport');
     if(res.code === 200) {
       window.$message.success("上传成功");
       emit('success', res.data);
       closeModal(false);
     } else {
       window.$message.error(res.message);
     }
  } catch (err: any) {
    window.$message.error(err.response?.data?.message || "上传异常");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped></style>
