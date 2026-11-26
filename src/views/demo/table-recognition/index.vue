<script setup lang="ts">
import type { TableRecognitionDraft } from '@/service/api/table-recognition'
import type { DataTableColumns } from 'naive-ui'
import { recognizeTableImage } from '@/service/api/table-recognition'
import { useEventListener } from '@vueuse/core'

interface TableRow {
  id: number
  cells: (string | null)[]
  children?: TableRow[]
}

const fileInput = ref<HTMLInputElement>()
const selectedFile = shallowRef<File>()
const preview = ref('')
const result = shallowRef<TableRecognitionDraft>()
const loading = ref(false)
const errorMessage = ref('')
let requestSequence = 0

const isTree = computed(() => result.value?.tableType === 'TREE')

const columns = computed<DataTableColumns<TableRow>>(() => (result.value?.columns ?? []).map((title, index) => ({
  title,
  key: `column-${index}`,
  width: index === 0 && isTree.value ? 240 : 160,
  render: row => h('span', { class: 'table-cell' }, row.cells[index] ?? ''),
})))
const scrollWidth = computed(() => columns.value.reduce((width, column) => width + Number(column.width), 0))

const tableRows = computed<TableRow[]>(() => {
  const data = result.value
  if (!data)
    return []
  const rows: TableRow[] = data.rows.map((row, id) => ({ id, cells: row.cells }))
  if (data.tableType !== 'TREE')
    return rows

  const roots: TableRow[] = []
  rows.forEach((row, index) => {
    const parent = data.rows[index].parentRow
    if (parent === null)
      roots.push(row)
    else
      (rows[parent].children ??= []).push(row)
  })
  return roots
})

function clearImage() {
  requestSequence++
  if (preview.value)
    URL.revokeObjectURL(preview.value)
  selectedFile.value = undefined
  preview.value = ''
  result.value = undefined
  errorMessage.value = ''
  loading.value = false
}

function setImage(file?: File) {
  if (!file)
    return
  if (file.type ? !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) : !/\.(?:jpe?g|png|webp)$/i.test(file.name)) {
    errorMessage.value = '请选择 JPEG、PNG 或 WebP 图片'
    return
  }
  if (!file.size || file.size > 8 * 1024 * 1024) {
    errorMessage.value = '请选择有效且不超过 8 MB 的表格图片'
    return
  }
  clearImage()
  selectedFile.value = file
  preview.value = URL.createObjectURL(file)
}

function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  setImage(input.files?.[0])
  input.value = ''
}

function dropFile(event: DragEvent) {
  setImage(event.dataTransfer?.files[0])
}

useEventListener('paste', (event: ClipboardEvent) => {
  const file = Array.from(event.clipboardData?.files ?? []).find(item => item.type.startsWith('image/'))
  if (file) {
    event.preventDefault()
    setImage(file)
  }
})

async function recognize() {
  const file = selectedFile.value
  if (!file || loading.value)
    return

  const sequence = ++requestSequence
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await recognizeTableImage(file)
    if (sequence !== requestSequence)
      return
    if (!response.isSuccess || !response.data) {
      errorMessage.value = response.message || '识别失败，请重试'
      return
    }
    result.value = response.data
  }
  catch {
    if (sequence === requestSequence)
      errorMessage.value = '识别失败，请重试'
  }
  finally {
    if (sequence === requestSequence)
      loading.value = false
  }
}

onBeforeUnmount(clearImage)
</script>

<template>
  <n-el class="recognition-page">
    <header class="page-header">
      <h1>AI 截图识表</h1>
      <p>上传或粘贴 PDF 等文件的表格截图，识别后与原图对照核对。</p>
    </header>

    <n-alert v-if="errorMessage" type="error" class="error-banner" role="alert">
      {{ errorMessage }}
    </n-alert>

    <div class="workspace">
      <n-card title="表格截图" size="small" class="source-panel">
        <div
          class="preview"
          :class="{ 'preview-empty': !preview }"
          @dragover.prevent
          @drop.prevent="dropFile"
        >
          <img v-if="preview" :src="preview" alt="待识别的表格截图">
          <div v-else class="upload-prompt">
            <n-icon size="28">
              <icon-park-outline-upload-picture />
            </n-icon>
            <strong>拖入图片或粘贴截图</strong>
            <span>JPEG、PNG、WebP，最大 8 MB</span>
            <n-button secondary type="primary" @click="fileInput?.click()">
              选取图片
            </n-button>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          aria-label="选择表格截图"
          hidden
          @change="selectFile"
        >
        <div v-if="selectedFile" class="source-actions">
          <span class="filename" :title="selectedFile.name">{{ selectedFile.name }}</span>
          <n-button text @click="fileInput?.click()">
            更换
          </n-button>
          <n-button text @click="clearImage">
            移除
          </n-button>
        </div>
        <n-button block type="primary" :disabled="!selectedFile" :loading="loading" @click="recognize">
          <template #icon>
            <icon-park-outline-magic />
          </template>
          {{ result ? '重新识别' : '开始识表' }}
        </n-button>
      </n-card>

      <n-card size="small" class="result-panel" aria-label="识表结果">
        <template #header>
          识表结果
        </template>
        <template v-if="result" #header-extra>
          <span class="dimensions">{{ isTree ? '树形表格' : '普通表格' }} · {{ result.rows.length }} 行 · {{ result.columns.length }} 列</span>
        </template>

        <div v-if="result" class="result-content">
          <n-data-table
            :key="result.tableType"
            :columns="columns"
            :data="tableRows"
            :default-expand-all="isTree"
            :row-key="row => row.id"
            :scroll-x="scrollWidth"
            :max-height="560"
            :loading="loading"
            size="small"
            striped
          />
          <p class="review-note">
            空白或无法辨认的单元格留空，请对照原图核对。
          </p>
        </div>
        <div v-else class="result-empty" :aria-busy="loading">
          <n-spin v-if="loading" size="small" description="正在识别表头和单元格…" />
          <n-empty v-else description="上传表格图片并开始识表" />
        </div>
      </n-card>
    </div>
  </n-el>
</template>

<style scoped>
.recognition-page {
  container-type: inline-size;
  color: var(--text-color-1);
}

.page-header {
  margin: 4px 0 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
}

.page-header p,
.review-note {
  margin: 6px 0 0;
  color: var(--text-color-2);
  font-size: 13px;
}

.error-banner {
  margin-bottom: 14px;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(0, 2.4fr);
  align-items: start;
  gap: 16px;
}

.source-panel,
.result-panel {
  min-width: 0;
}

.preview {
  display: grid;
  min-height: 190px;
  margin-bottom: 14px;
  overflow: hidden;
  border-radius: var(--border-radius);
  background: var(--action-color);
  place-items: center;
}

.preview-empty {
  border: 1px dashed var(--border-color);
}

.preview img {
  display: block;
  width: 100%;
  max-height: 520px;
  object-fit: contain;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 12px;
  text-align: center;
}

.upload-prompt .n-icon {
  color: var(--primary-color);
}

.upload-prompt span,
.dimensions,
.filename {
  color: var(--text-color-2);
  font-size: 12px;
}

.source-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.filename {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-empty {
  display: grid;
  min-height: 245px;
  place-items: center;
}

:deep(.table-cell) {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.review-note {
  margin-top: 12px;
}

@container (max-width: 720px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
