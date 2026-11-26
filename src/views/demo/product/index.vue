<script setup lang="ts">
import type { ProductRecognitionDraft } from '@/service/api/product'
import { recognizeProductImage, recognizeProductImages } from '@/service/api/product'

type ImageMode = 'single' | 'multiple'
interface ProductImage {
  file: File
  url: string
}

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_TOTAL_SIZE = 24 * 1024 * 1024
const MAX_IMAGES = 5
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const fileInput = ref<HTMLInputElement>()
const mode = ref<ImageMode>('single')
const images = shallowRef<ProductImage[]>([])
const activeIndex = ref(0)
const activeImage = computed(() => images.value[activeIndex.value])
const requiredImages = computed(() => mode.value === 'multiple' ? 2 : 1)
const recognizing = ref(false)
const canRecognize = computed(() => images.value.length >= requiredImages.value && !recognizing.value)
const recognized = ref(false)
const errorMessage = ref('')
let requestSequence = 0
const emptyDraft: ProductRecognitionDraft = {
  productName: null,
  model: null,
  description: null,
  categorySuggestion: null,
  tags: [],
  accessories: [],
  serialNumber: null,
}
const draft = reactive(structuredClone(emptyDraft))
const manual = reactive({
  officialPrice: null as number | null,
  usedPriceEstimate: '',
  warrantyStatus: '',
})
const editedFields = new Set<keyof ProductRecognitionDraft>()

function setField<K extends keyof ProductRecognitionDraft>(key: K, value: ProductRecognitionDraft[K]) {
  draft[key] = value
  editedFields.add(key)
}

function fillDraft<K extends keyof ProductRecognitionDraft>(key: K, source: ProductRecognitionDraft) {
  if (!editedFields.has(key))
    draft[key] = source[key]
}

const fields = Object.keys(emptyDraft) as (keyof ProductRecognitionDraft)[]

function addImages(files: File[]) {
  if (!files.length)
    return
  const existing = mode.value === 'multiple' ? images.value : []
  const limit = mode.value === 'multiple' ? MAX_IMAGES : 1
  if (existing.length + files.length > limit) {
    errorMessage.value = mode.value === 'multiple' ? '多图模式最多添加 5 张图片' : '单图模式每次只能选择 1 张图片'
    return
  }
  if (files.some(file => file.type ? !ACCEPTED_IMAGE_TYPES.includes(file.type) : !/\.(?:jpe?g|png|webp)$/i.test(file.name))) {
    errorMessage.value = '请选择 JPEG、PNG 或 WebP 图片'
    return
  }
  if (files.some(file => file.size === 0 || file.size > MAX_IMAGE_SIZE)) {
    errorMessage.value = '请选择有效且不超过 8 MB 的商品图片'
    return
  }
  const existingSize = existing.reduce((total, image) => total + image.file.size, 0)
  if (files.reduce((total, file) => total + file.size, existingSize) > MAX_TOTAL_SIZE) {
    errorMessage.value = '图片总大小不能超过 24 MB'
    return
  }

  updateImages([...existing, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))], existing.length)
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  addImages(Array.from(input.files ?? []))
  input.value = ''
}

function handleDrop(event: DragEvent) {
  addImages(Array.from(event.dataTransfer?.files ?? []))
}

function changeMode(value: ImageMode) {
  if (mode.value === value)
    return
  mode.value = value
  // 切回单图时保留当前预览的图片。
  const next = value === 'single' && activeImage.value ? [activeImage.value] : images.value
  updateImages(next, value === 'single' ? 0 : activeIndex.value)
}

function removeImage(index: number) {
  const next = images.value.filter((_, current) => current !== index)
  const nextIndex = index < activeIndex.value ? activeIndex.value - 1 : activeIndex.value
  updateImages(next, Math.min(nextIndex, Math.max(0, next.length - 1)))
}

async function recognize() {
  if (!canRecognize.value)
    return

  const files = images.value.map(image => image.file)
  const sequence = ++requestSequence
  errorMessage.value = ''
  recognizing.value = true
  try {
    const result = mode.value === 'single' ? await recognizeProductImage(files[0]) : await recognizeProductImages(files)
    if (sequence !== requestSequence)
      return
    if (!result.isSuccess || !result.data) {
      errorMessage.value = result.message || '图片识别失败，请重试'
      return
    }
    fields.forEach(key => fillDraft(key, result.data))
    recognized.value = true
  }
  catch {
    if (sequence === requestSequence)
      errorMessage.value = '图片识别失败，请重试'
  }
  finally {
    if (sequence === requestSequence)
      recognizing.value = false
  }
}

function updateImages(next: ProductImage[], nextIndex: number) {
  requestSequence++
  for (const image of images.value) {
    if (!next.includes(image))
      URL.revokeObjectURL(image.url)
  }
  images.value = next
  activeIndex.value = nextIndex
  recognized.value = false
  recognizing.value = false
  errorMessage.value = ''
  const empty = structuredClone(emptyDraft)
  fields.forEach(key => fillDraft(key, empty))
}

function resetDraft() {
  updateImages([], 0)
  editedFields.clear()
  Object.assign(draft, structuredClone(emptyDraft))
  Object.assign(manual, { officialPrice: null, usedPriceEstimate: '', warrantyStatus: '' })
}

onBeforeUnmount(() => {
  requestSequence++
  for (const image of images.value)
    URL.revokeObjectURL(image.url)
})
</script>

<template>
  <n-el class="product-page">
    <header class="page-heading">
      <div>
        <h1>AI 识图录入</h1>
        <p>上传商品图片，识别后可核对和编辑商品草稿。</p>
      </div>
      <div v-if="recognized" class="ready-status">
        <icon-park-outline-check-one />
        草稿已生成
      </div>
    </header>

    <div class="workspace">
      <section class="image-section" aria-label="商品图片">
        <div class="image-mode">
          <n-radio-group :value="mode" size="small" aria-label="图片识别模式" @update:value="changeMode">
            <n-radio-button value="single">
              单图模式
            </n-radio-button>
            <n-radio-button value="multiple">
              多图模式
            </n-radio-button>
          </n-radio-group>
          <span>{{ mode === 'multiple' ? '同一商品的 2 至 5 张图片' : '上传 1 张商品图片' }}</span>
        </div>
        <div
          class="image-stage"
          :class="{ 'has-image': activeImage }"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <img v-if="activeImage" :src="activeImage.url" :alt="activeImage.file.name" class="product-image">
          <div v-else class="upload-prompt">
            <div class="upload-icon">
              <icon-park-outline-upload-picture />
            </div>
            <strong>将商品图片拖到这里</strong>
            <span>支持 JPEG、PNG、WebP，单张最大 8 MB</span>
            <n-button type="primary" @click="fileInput?.click()">
              <template #icon>
                <icon-park-outline-folder-open />
              </template>
              选择图片
            </n-button>
          </div>
          <div v-if="activeImage" class="image-toolbar">
            <span class="file-name" :title="activeImage.file.name">{{ activeImage.file.name }}</span>
            <n-button quaternary circle size="small" color="#ffffff" title="移除当前图片" aria-label="移除当前图片" @click="removeImage(activeIndex)">
              <template #icon>
                <icon-park-outline-close />
              </template>
            </n-button>
          </div>
          <div v-if="recognizing" class="image-loading">
            <n-spin size="large" />
            <span>正在识别商品…</span>
          </div>
        </div>
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          :multiple="mode === 'multiple'"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          tabindex="-1"
          aria-label="选择商品图片"
          @change="handleFileChange"
        >
        <div v-if="mode === 'multiple' && images.length" class="thumbnails" aria-label="已选商品图片">
          <button
            v-for="(image, index) in images"
            :key="image.url"
            type="button"
            class="thumbnail"
            :aria-label="`预览第 ${index + 1} 张图片`"
            :aria-pressed="activeIndex === index"
            @click="activeIndex = index"
          >
            <img :src="image.url" alt="">
          </button>
        </div>
        <div class="image-footer">
          <div class="image-caption">
            <icon-park-outline-picture />
            <span v-if="mode === 'multiple'">已选 {{ images.length }}/{{ MAX_IMAGES }} 张 · 总计最多 24 MB</span>
            <span v-else>{{ activeImage ? '原始商品图片' : '等待上传图片' }}</span>
          </div>
          <n-button v-if="activeImage" secondary :disabled="mode === 'multiple' && images.length >= MAX_IMAGES" @click="fileInput?.click()">
            <template #icon>
              <icon-park-outline-refresh v-if="mode === 'single'" />
              <icon-park-outline-upload-picture v-else />
            </template>
            {{ mode === 'multiple' ? '追加图片' : '更换图片' }}
          </n-button>
        </div>
      </section>

      <section class="form-section" aria-label="商品识别结果">
        <div class="form-heading">
          <div>
            <h2>商品信息</h2>
            <span>也可手动录入，草稿仅保留在当前页面。</span>
          </div>
          <n-button
            type="primary"
            :loading="recognizing"
            :disabled="!canRecognize"
            @click="recognize"
          >
            <template #icon>
              <icon-park-outline-magic />
            </template>
            {{ recognized ? '重新识别' : '开始识别' }}
          </n-button>
        </div>

        <n-alert v-if="errorMessage" class="review-alert" type="error" role="alert">
          {{ errorMessage }}
        </n-alert>
        <n-alert v-else-if="recognized" class="review-alert" type="success" role="status">
          请核对识别结果。已手动编辑的字段会保留。
        </n-alert>

        <n-form label-placement="top" :show-feedback="false" class="product-form">
          <div class="field-grid">
            <n-form-item label="商品名称">
              <n-input :value="draft.productName" placeholder="请输入商品名称" :maxlength="120" @update:value="setField('productName', $event)" />
            </n-form-item>
            <n-form-item label="型号">
              <n-input :value="draft.model" placeholder="请输入型号" :maxlength="100" @update:value="setField('model', $event)" />
            </n-form-item>
            <n-form-item label="归类建议">
              <n-input :value="draft.categorySuggestion" placeholder="请输入商品分类" :maxlength="100" @update:value="setField('categorySuggestion', $event)" />
            </n-form-item>
            <n-form-item label="设备序列号">
              <n-input :value="draft.serialNumber" placeholder="仅识别图片中清晰可见的序列号" :maxlength="100" @update:value="setField('serialNumber', $event)" />
            </n-form-item>
          </div>
          <n-form-item label="商品描述">
            <n-input
              :value="draft.description"
              type="textarea"
              placeholder="商品外观、规格及可见特征"
              :maxlength="500"
              :autosize="{ minRows: 3, maxRows: 5 }"
              @update:value="setField('description', $event)"
            />
          </n-form-item>
          <div class="field-grid">
            <n-form-item label="归档标签">
              <n-dynamic-tags :value="draft.tags" :max="8" :input-props="{ maxlength: 50 }" @update:value="setField('tags', $event)" />
            </n-form-item>
            <n-form-item label="随附配件">
              <n-dynamic-tags :value="draft.accessories" :max="8" :input-props="{ maxlength: 50 }" @update:value="setField('accessories', $event)" />
            </n-form-item>
            <n-form-item label="官方指导价（元）">
              <n-input-number v-model:value="manual.officialPrice" class="price-input" :min="0" :precision="2" :show-button="false" placeholder="手动填写" />
            </n-form-item>
            <n-form-item label="二手估值区间">
              <n-input v-model:value="manual.usedPriceEstimate" :maxlength="80" placeholder="手动填写" />
            </n-form-item>
          </div>
          <n-form-item label="保修信息">
            <n-input v-model:value="manual.warrantyStatus" :maxlength="100" placeholder="手动填写" />
          </n-form-item>
          <n-button secondary @click="resetDraft">
            清空草稿
          </n-button>
        </n-form>
      </section>
    </div>
  </n-el>
</template>

<style scoped>
.product-page {
  container: product-layout / inline-size;
  min-height: 100%;
  padding: 24px;
  color: var(--text-color-1);
  background: var(--body-color);
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  max-width: 1440px;
  margin: 0 auto 20px;
}

.page-heading h1,
.form-heading h2 {
  margin: 0;
  color: var(--text-color-1);
  font-size: 22px;
  font-weight: 650;
}

.page-heading p {
  margin: 6px 0 0;
  color: var(--text-color-2);
  font-size: 13px;
}

.ready-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--success-color);
  font-size: 13px;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(420px, 1.1fr);
  gap: 18px;
  max-width: 1440px;
  min-height: 610px;
  margin: 0 auto;
}

.image-section,
.form-section {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: var(--card-color);
}

.image-section {
  display: flex;
  flex-direction: column;
  min-height: 610px;
}

.image-mode,
.thumbnails {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
}

.image-mode {
  justify-content: space-between;
  color: var(--text-color-2);
  font-size: 12px;
}

.thumbnails {
  border-bottom: 1px solid var(--divider-color);
}

.thumbnail {
  width: 52px;
  height: 52px;
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: var(--action-color);
  cursor: pointer;
}

.thumbnail[aria-pressed='true'] {
  border: 2px solid var(--primary-color);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-stage {
  position: relative;
  display: grid;
  flex: 1;
  min-height: 420px;
  place-items: center;
  overflow: hidden;
  background: var(--action-color);
}

.image-stage.has-image {
  background: #202522;
}

.product-image {
  width: 100%;
  height: 100%;
  max-height: 680px;
  object-fit: contain;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}

.upload-prompt strong {
  color: var(--text-color-1);
  font-size: 15px;
}

.upload-prompt > span {
  max-width: 300px;
  color: var(--text-color-2);
  font-size: 12px;
  line-height: 1.6;
}

.upload-icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--primary-color);
  background: var(--card-color);
  font-size: 24px;
}

.image-toolbar {
  position: absolute;
  right: 12px;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  border-radius: 4px;
  color: #fff;
  background: rgb(20 27 23 / 75%);
}

.file-name {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #fff;
  background: rgb(19 25 22 / 67%);
  pointer-events: none;
}

.image-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 58px;
  padding: 0 16px;
}

.image-caption {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color-2);
  font-size: 13px;
}

.form-section {
  display: flex;
  flex-direction: column;
  padding: 22px 24px;
}

.form-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--divider-color);
}

.form-heading h2 {
  font-size: 17px;
}

.form-heading h2 + span {
  display: block;
  margin-top: 5px;
  color: var(--text-color-2);
  font-size: 12px;
}

.review-alert {
  margin-top: 16px;
}

.product-form {
  padding-top: 18px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.product-form :deep(.n-form-item) {
  margin-bottom: 16px;
}

.price-input {
  width: 100%;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container product-layout (max-width: 780px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .image-section {
    min-height: 440px;
  }

  .image-stage {
    min-height: 360px;
  }
}

@media (max-width: 560px) {
  .product-page {
    padding: 16px 12px;
  }

  .page-heading {
    align-items: flex-start;
  }

  .ready-status {
    align-items: flex-end;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
  }

  .workspace {
    gap: 12px;
  }

  .image-section {
    min-height: 340px;
  }

  .image-stage {
    min-height: 280px;
  }

  .form-section {
    padding: 18px 14px;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
