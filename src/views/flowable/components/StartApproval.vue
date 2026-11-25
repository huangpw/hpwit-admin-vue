<script setup lang="ts">
import type { BusinessPage, Definition, Detail, FieldValue } from '@/service/api/flowable'
import { getEditDefinition, listDefinitions, resubmitApplication, saveApplicationDraft, startApproval } from '@/service/api/flowable'
import { categoryLabels } from '../labels'

const props = defineProps<{
  source?: Detail
  editOnly?: boolean
  business?: { page: BusinessPage, title: string, businessNo: string, values: Record<string, FieldValue> }
}>()
const emit = defineEmits<{ close: [], started: [id: string] }>()
const definitions = ref<Definition[]>([])
const definitionId = ref<string | null>(null)
const title = ref(props.source?.instance.title ?? props.business?.title ?? '')
const businessNo = ref(props.source?.instance.businessNo ?? props.business?.businessNo ?? '')
const values = ref<Record<string, FieldValue>>({})
const loading = ref(false)
const submitting = ref(false)
defineExpose({ submitting })

let requestId: string | undefined
let lastPayload = ''

const availableDefinitions = computed(() => definitions.value.filter(
  definition => props.source || (props.business
    ? definition.businessPage === props.business.page
    : definition.businessPage !== 'DEMO_ORDER'),
))
const selected = computed(() => availableDefinitions.value.find(definition => definition.id === definitionId.value))
const options = computed(() => availableDefinitions.value.map(definition => ({
  value: definition.id,
  label: `${definition.name} · ${categoryLabels[definition.category]} · V${definition.version}`,
})))
const decimal = /^-?\d{1,12}(?:\.\d{1,6})?$/
const booleans = [{ label: '是', value: 'yes' }, { label: '否', value: 'no' }]

async function load() {
  loading.value = true
  try {
    if (props.source) {
      const result = await getEditDefinition(props.source.instance.id)
      if (result.isSuccess) {
        definitions.value = [result.data]
        if (!selected.value || selected.value.id !== result.data.id)
          select(result.data.id)
      }
      return
    }
    const result = await listDefinitions()
    if (result.isSuccess) {
      definitions.value = result.data
      if (!selected.value)
        select(props.business && availableDefinitions.value.length === 1 ? availableDefinitions.value[0].id : null)
    }
  }
  finally {
    loading.value = false
  }
}

function select(id: string | null) {
  definitionId.value = id
  const oldTypes = new Map(props.source?.fields.map(field => [field.key, field.type]))
  values.value = Object.fromEntries((selected.value?.fields ?? []).map((field) => {
    const saved = oldTypes.get(field.key) === field.type ? props.source?.values[field.key] : null
    return [field.key, props.business?.values[field.key] ?? saved ?? null]
  }))
}

function businessValue(key: string) {
  return Object.hasOwn(props.business?.values ?? {}, key) || (selected.value?.businessPage === 'DEMO_ORDER' && key === 'amount')
}

function booleanOption(key: string) {
  return values.value[key] === true ? 'yes' : values.value[key] === false ? 'no' : null
}

async function submit(asDraft: boolean) {
  if (submitting.value)
    return
  const definition = selected.value
  if (!definition || !title.value.trim()) {
    window.$message.warning('请选择流程并填写申请标题')
    return
  }
  if (definition.businessPage && !businessNo.value.trim()) {
    window.$message.warning('请填写关联业务单号')
    return
  }
  for (const field of definition.fields) {
    const value = values.value[field.key]
    if (value == null || (typeof value === 'string' && !value.trim())) {
      if (!asDraft && field.required) {
        window.$message.warning(`请填写${field.label}`)
        return
      }
    }
    else if (field.type === 'NUMBER' && !decimal.test(String(value))) {
      window.$message.warning(`${field.label}最多 12 位整数和 6 位小数`)
      return
    }
  }
  const form = { definitionId: definition.id, title: title.value, businessNo: businessNo.value, values: values.value }
  const payload = JSON.stringify({ ...form, asDraft })
  if (lastPayload !== payload) {
    const random = crypto.getRandomValues(new Uint8Array(16))
    random[6] = (random[6] & 0x0F) | 0x40
    random[8] = (random[8] & 0x3F) | 0x80
    const hex = Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('')
    requestId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    lastPayload = payload
  }
  if (!requestId)
    return
  submitting.value = true
  try {
    const data = { ...form, requestId }
    let result
    if (asDraft)
      result = await saveApplicationDraft(data, props.source?.instance.id)
    else if (props.source)
      result = await resubmitApplication(props.source.instance.id, data)
    else
      result = await startApproval(data)
    if (result.isSuccess) {
      window.$message.success(asDraft ? '草稿已保存' : '申请已提交')
      emit('started', result.data)
    }
  }
  finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <n-drawer-content :title="editOnly ? '编辑申请' : source ? '重新提交' : '发起申请'" :closable="!submitting">
    <n-form label-placement="top" :disabled="submitting">
      <n-form-item label="流程" required>
        <n-input-group>
          <n-select
            :value="definitionId" :options="options" :loading="loading" :disabled="Boolean(source)" filterable
            placeholder="选择已发布流程" @update:value="select"
          />
          <n-button :disabled="submitting" @click="load">
            刷新
          </n-button>
        </n-input-group>
      </n-form-item>
      <n-alert v-if="selected?.description" class="mb-4" type="info">
        {{ selected.description }}
      </n-alert>
      <n-empty v-if="!loading && !availableDefinitions.length" :description="business ? '暂无关联此订单页面的已发布流程' : '暂无通用已发布流程'" />
      <template v-if="selected">
        <n-form-item label="申请标题" required>
          <n-input v-model:value="title" :readonly="Boolean(business)" maxlength="150" placeholder="例如 11 月差旅报销" />
        </n-form-item>
        <n-form-item label="业务单号" :required="Boolean(selected.businessPage)">
          <n-input
            v-model:value="businessNo" :readonly="Boolean(business || source)" maxlength="100"
            :placeholder="selected.businessPage ? '请输入关联业务单号' : '选填，关联已有业务单据'"
          />
        </n-form-item>
        <n-form-item v-for="field in selected.fields" :key="field.key" :label="field.label" :required="field.required">
          <n-input
            v-if="field.type === 'NUMBER'" :value="String(values[field.key] ?? '')" :readonly="businessValue(field.key)"
            :input-props="{ inputmode: 'decimal' }"
            maxlength="20" placeholder="最多 12 位整数和 6 位小数"
            @update:value="values[field.key] = $event.trim()"
          />
          <n-date-picker
            v-else-if="field.type === 'DATE'" class="w-full" type="date" clearable
            :formatted-value="(values[field.key] as string | null) ?? null" value-format="yyyy-MM-dd"
            @update:formatted-value="values[field.key] = $event"
          />
          <n-select
            v-else-if="field.type === 'BOOLEAN'" clearable :options="booleans" :value="booleanOption(field.key)"
            @update:value="values[field.key] = $event === null ? null : $event === 'yes'"
          />
          <n-input
            v-else :value="(values[field.key] as string) ?? ''"
            :type="field.type === 'TEXTAREA' ? 'textarea' : 'text'" :maxlength="field.type === 'TEXTAREA' ? 1000 : 200"
            @update:value="values[field.key] = $event"
          />
        </n-form-item>
      </template>
    </n-form>
    <template #footer>
      <n-space>
        <n-button :disabled="submitting" @click="emit('close')">
          取消
        </n-button>
        <n-button
          v-if="!source || editOnly || source.operations.includes('EDIT')"
          :type="editOnly ? 'primary' : 'default'" :disabled="!selected || loading" :loading="submitting" @click="submit(true)"
        >
          保存草稿
        </n-button>
        <n-button v-if="!editOnly" type="primary" :disabled="!selected || loading" :loading="submitting" @click="submit(false)">
          提交申请
        </n-button>
      </n-space>
    </template>
  </n-drawer-content>
</template>
