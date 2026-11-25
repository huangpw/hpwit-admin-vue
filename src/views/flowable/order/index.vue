<script setup lang="tsx">
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import type { Instance, Order, OrderItem, Status } from '@/service/api/flowable'
import { getOrder, getOrderApproval, listInstances, saveOrder } from '@/service/api/flowable'
import { NButton, NTag, useThemeVars } from 'naive-ui'
import ApprovalDetail from '../common/ApprovalDetail.vue'
import ApprovalListLayout from '../common/ApprovalListLayout.vue'
import StartApproval from '../components/StartApproval.vue'
import { displayTime, statusLabels, statusTypes } from '../labels'
import { formatAmount, lineAmount, orderNo, orderPage } from './order'

interface ItemForm extends Omit<OrderItem, 'quantity' | 'price'> {
  id: number
  quantity: number | null
  price: number | null
}

type OrderForm = Omit<Order, 'date' | 'items'> & { date: string | null, items: ItemForm[] }

const theme = useThemeVars()
const formRef = ref<FormInst>()
const form = ref<OrderForm>()
const savedOrder = ref<Order>()
const savedPayload = ref('')
const orderLoading = ref(false)
const saving = ref(false)
let nextItemId = 0

const rules: FormRules = {
  customer: { required: true, whitespace: true, message: '请输入客户名称', trigger: 'blur' },
  department: { required: true, whitespace: true, message: '请输入经办部门', trigger: 'blur' },
  date: { required: true, message: '请选择下单日期', trigger: 'change' },
}

const rows = ref<Instance[]>([])
const approvalStatus = ref<Status | null>()
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const starting = ref(false)
const startForm = ref<InstanceType<typeof StartApproval>>()
const selected = ref('')
const showDetail = ref(false)
const detailPanel = ref<InstanceType<typeof ApprovalDetail>>()
const pageSize = ref(10)

const items = computed(() => form.value?.items ?? [])
const quantity = computed(() => items.value.reduce((sum, item) => sum + (item.quantity ?? 0), 0))
const amount = computed(() => items.value.reduce((sum, item) => sum + lineAmount(item.quantity, item.price), 0))
const orderPayload = computed(() => {
  if (!form.value)
    return undefined
  return {
    ...form.value,
    items: form.value.items.map(({ sku, name, quantity, price }) => ({ sku, name, quantity, price })),
  }
})
const dirty = computed(() => Boolean(form.value) && JSON.stringify(orderPayload.value) !== savedPayload.value)
const business = computed(() => ({
  page: orderPage,
  title: `订单 ${orderNo} 审批`,
  businessNo: orderNo,
  values: { amount: (amount.value / 100).toFixed(2) },
}))

function fillForm(order: Order) {
  savedOrder.value = order
  form.value = {
    ...order,
    items: order.items.map(item => ({ ...item, id: ++nextItemId })),
  }
  savedPayload.value = JSON.stringify(orderPayload.value)
  formRef.value?.restoreValidation()
}

async function loadOrder() {
  orderLoading.value = true
  try {
    const result = await getOrder()
    if (result.isSuccess)
      fillForm(result.data)
  }
  finally {
    orderLoading.value = false
  }
}

function addItem() {
  if (form.value && form.value.items.length < 100)
    form.value.items.push({ id: ++nextItemId, sku: '', name: '', quantity: 1, price: null })
}

function removeItem(index: number) {
  form.value?.items.splice(index, 1)
}

function reset() {
  const order = savedOrder.value
  if (!order)
    return
  window.$dialog.warning({
    title: '放弃未保存的修改？',
    content: '订单将恢复到最近保存的内容。',
    positiveText: '放弃修改',
    negativeText: '继续编辑',
    onPositiveClick: () => fillForm(order),
  })
}

async function persist() {
  if (!formRef.value || !form.value || saving.value)
    return false

  saving.value = true
  try {
    try {
      await formRef.value.validate()
    }
    catch {
      return false
    }

    const draft = form.value
    if (!draft.date)
      return false
    if (draft.deliveryDate && draft.deliveryDate < draft.date) {
      window.$message.warning('预计交付日期不能早于下单日期')
      return false
    }
    if (!draft.items.length) {
      window.$message.warning('请添加至少一条商品明细')
      return false
    }
    const items: OrderItem[] = []
    for (const [index, { sku, name, quantity, price }] of draft.items.entries()) {
      if (!sku.trim() || !name.trim() || quantity === null || price === null) {
        window.$message.warning(`请填写第 ${index + 1} 行的商品编码、名称、数量和单价`)
        return false
      }
      items.push({ sku: sku.trim(), name: name.trim(), quantity, price })
    }

    const result = await saveOrder({
      ...draft,
      customer: draft.customer.trim(),
      department: draft.department.trim(),
      date: draft.date,
      contact: draft.contact.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      note: draft.note.trim(),
      items,
    })
    if (!result.isSuccess)
      return false
    fillForm(result.data)
    window.$message.success('订单已保存')
    return true
  }
  finally {
    saving.value = false
  }
}

async function start() {
  if (approvalStatus.value === 'PENDING')
    return
  if (!dirty.value || await persist())
    starting.value = true
}

let loadSequence = 0
let approvalSequence = 0

async function loadApprovalStatus() {
  const sequence = ++approvalSequence
  const result = await getOrderApproval()
  if (sequence === approvalSequence && result.isSuccess) {
    approvalStatus.value = result.data.status ?? null
  }
}

function refreshApprovals() {
  void loadApplications()
  void loadApprovalStatus()
}

async function loadApplications() {
  const sequence = ++loadSequence
  loading.value = true
  try {
    const result = await listInstances('MINE', page.value, pageSize.value, orderNo)
    if (sequence === loadSequence && result.isSuccess) {
      rows.value = result.data.list
      total.value = result.data.total
      const lastPage = Math.max(1, Math.ceil(total.value / pageSize.value))
      if (page.value > lastPage)
        changePage(lastPage)
    }
  }
  finally {
    if (sequence === loadSequence)
      loading.value = false
  }
}

function open(id: string) {
  selected.value = id
  showDetail.value = true
}

function changePage(value: number, size = pageSize.value) {
  page.value = value
  pageSize.value = size
  void loadApplications()
}

function onStarted(id: string) {
  starting.value = false
  changePage(1)
  void loadApprovalStatus()
  open(id)
}

const columns: DataTableColumns<Instance> = [
  { title: '流程', key: 'definitionName', render: row => `${row.definitionName} · V${row.definitionVersion}` },
  {
    title: '状态',
    key: 'status',
    width: 104,
    render: row => <NTag size="small" type={statusTypes[row.status]}>{statusLabels[row.status]}</NTag>,
  },
  { title: '提交时间', key: 'startedAt', minWidth: 190, render: row => displayTime(row.startedAt) },
  {
    title: '操作',
    key: 'action',
    width: 90,
    render: row => <NButton size="small" secondary onClick={() => open(row.id)}>详情</NButton>,
  },
]

onMounted(() => {
  void loadOrder()
  refreshApprovals()
})

onActivated(() => {
  if (approvalStatus.value !== undefined)
    refreshApprovals()
})
</script>

<template>
  <div class="order-page" :style="{ '--order-line': theme.dividerColor, '--order-fill': theme.tableHeaderColor }">
    <header class="order-heading">
      <div>
        <h1>订单编辑</h1>
        <n-flex align="center" :size="10">
          <n-text depth="3">
            {{ orderNo }}
          </n-text>
          <NTag v-if="approvalStatus !== undefined" size="small" :type="approvalStatus ? statusTypes[approvalStatus] : 'default'">
            审批状态：{{ approvalStatus ? statusLabels[approvalStatus] : '待提交' }}
          </NTag>
          <NTag v-if="dirty" size="small" round type="warning">
            有未保存修改
          </NTag>
        </n-flex>
      </div>
      <n-space v-if="form">
        <NButton :disabled="saving || !dirty" @click="reset">
          放弃修改
        </NButton>
        <NButton :loading="saving" :disabled="!dirty" @click="persist">
          保存订单
        </NButton>
        <NButton type="primary" :disabled="saving || approvalStatus === 'PENDING'" @click="start">
          提交审批
        </NButton>
      </n-space>
    </header>

    <n-spin :show="orderLoading">
      <n-form v-if="form" ref="formRef" :model="form" :rules="rules" label-placement="top" :disabled="saving" class="order-layout">
        <div class="order-sections">
          <n-card title="基本信息" size="small">
            <div class="order-fields">
              <n-form-item label="客户名称" path="customer">
                <n-input v-model:value="form.customer" maxlength="100" placeholder="请输入客户名称" />
              </n-form-item>
              <n-form-item label="经办部门" path="department">
                <n-input v-model:value="form.department" maxlength="100" placeholder="请输入经办部门" />
              </n-form-item>
              <n-form-item label="下单日期" path="date">
                <n-date-picker v-model:formatted-value="form.date" type="date" value-format="yyyy-MM-dd" class="w-full" />
              </n-form-item>
              <n-form-item label="预计交付日期">
                <n-date-picker v-model:formatted-value="form.deliveryDate" type="date" value-format="yyyy-MM-dd" clearable class="w-full" />
              </n-form-item>
            </div>
          </n-card>

          <n-card title="商品明细" size="small">
            <template #header-extra>
              <NButton secondary type="primary" size="small" :disabled="saving || items.length >= 100" @click="addItem">
                新增商品
              </NButton>
            </template>
            <div class="item-scroll">
              <table class="item-table" aria-label="订单商品明细">
                <thead>
                  <tr>
                    <th scope="col" class="item-index">
                      序号
                    </th>
                    <th scope="col" class="item-sku">
                      商品编码
                    </th>
                    <th scope="col" class="item-name">
                      商品名称
                    </th>
                    <th scope="col" class="item-quantity">
                      数量
                    </th>
                    <th scope="col" class="item-price">
                      单价（元）
                    </th>
                    <th scope="col" class="item-subtotal">
                      小计（元）
                    </th>
                    <th scope="col" class="item-action">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in items" :key="item.id">
                    <td class="item-index">
                      {{ index + 1 }}
                    </td>
                    <td>
                      <n-input
                        v-model:value="item.sku" maxlength="50" size="small" placeholder="商品编码"
                        :input-props="{ 'aria-label': `第 ${index + 1} 行商品编码` }"
                      />
                    </td>
                    <td>
                      <n-input
                        v-model:value="item.name" maxlength="120" size="small" placeholder="商品名称"
                        :input-props="{ 'aria-label': `第 ${index + 1} 行商品名称` }"
                      />
                    </td>
                    <td>
                      <n-input-number
                        v-model:value="item.quantity" :min="1" :max="9999" :precision="0" size="small" :show-button="false" placeholder="数量"
                        :input-props="{ 'aria-label': `第 ${index + 1} 行数量`, 'inputmode': 'numeric' }"
                      />
                    </td>
                    <td>
                      <n-input-number
                        v-model:value="item.price" :min="0" :max="999999.99" :precision="2" :step="0.01" size="small" :show-button="false" placeholder="0.00"
                        :input-props="{ 'aria-label': `第 ${index + 1} 行单价`, 'inputmode': 'decimal' }"
                      />
                    </td>
                    <td class="item-subtotal">
                      {{ formatAmount(lineAmount(item.quantity, item.price)) }}
                    </td>
                    <td class="item-action">
                      <NButton text type="error" :disabled="saving" :aria-label="`移除第 ${index + 1} 行商品`" @click="removeItem(index)">
                        移除
                      </NButton>
                    </td>
                  </tr>
                  <tr v-if="!items.length">
                    <td colspan="7">
                      <n-empty class="py-4" description="请添加商品明细" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </n-card>

          <n-card title="交付与备注" size="small">
            <div class="order-fields">
              <n-form-item label="收货人">
                <n-input v-model:value="form.contact" maxlength="50" placeholder="请输入收货人" />
              </n-form-item>
              <n-form-item label="联系电话">
                <n-input v-model:value="form.phone" maxlength="30" placeholder="请输入联系电话" />
              </n-form-item>
              <n-form-item label="收货地址" class="field-wide">
                <n-input v-model:value="form.address" maxlength="250" placeholder="请输入详细收货地址" />
              </n-form-item>
              <n-form-item label="订单备注" class="field-wide">
                <n-input
                  v-model:value="form.note" type="textarea" maxlength="500" show-count
                  :autosize="{ minRows: 3, maxRows: 6 }" placeholder="填写配送要求或其他说明"
                />
              </n-form-item>
            </div>
          </n-card>
        </div>

        <aside class="order-summary">
          <n-card title="订单汇总" size="small">
            <dl class="summary-rows">
              <div>
                <dt>商品行数</dt>
                <dd>{{ items.length }} 行</dd>
              </div>
              <div>
                <dt>商品总数量</dt>
                <dd>{{ quantity }} 件</dd>
              </div>
            </dl>
            <div class="summary-total">
              <n-text depth="3">
                订单合计（CNY）
              </n-text>
              <n-text type="primary" strong class="order-amount">
                ¥{{ formatAmount(amount) }}
              </n-text>
            </div>
          </n-card>
        </aside>
      </n-form>
      <n-card v-else-if="!orderLoading">
        <n-empty description="订单加载失败">
          <template #extra>
            <NButton @click="loadOrder">
              重新加载
            </NButton>
          </template>
        </n-empty>
      </n-card>
    </n-spin>

    <ApprovalListLayout :page="page" :page-size="pageSize" :total="total" @change="changePage">
      <template #trailing>
        <NButton strong secondary :loading="loading" @click="refreshApprovals">
          <template #icon>
            <icon-park-outline-refresh />
          </template>
          刷新
        </NButton>
      </template>
      <n-data-table :columns="columns" :data="rows" :row-key="row => row.id" :loading="loading" :scroll-x="520">
        <template #empty>
          <n-empty description="暂无此订单的审批记录" />
        </template>
      </n-data-table>
    </ApprovalListLayout>

    <n-drawer v-model:show="starting" width="min(100vw, 560px)" :mask-closable="!startForm?.submitting" :close-on-esc="false">
      <StartApproval v-if="starting" ref="startForm" :business="business" @close="starting = false" @started="onStarted" />
    </n-drawer>
    <n-drawer v-model:show="showDetail" width="min(100vw, 860px)" :mask-closable="!detailPanel?.acting" :close-on-esc="false">
      <ApprovalDetail v-if="showDetail" :id="selected" :key="selected" ref="detailPanel" @changed="refreshApprovals" @close="showDetail = false" @select="open" />
    </n-drawer>
  </div>
</template>

<style scoped>
.order-page,
.order-sections {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}

.order-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-block: 4px;
}

.order-heading h1 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.35;
}

.order-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(236px, 0.3fr);
  align-items: start;
  gap: 16px;
}

.order-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
}

.field-wide {
  grid-column: 1 / -1;
}

.item-scroll {
  overflow-x: auto;
}

.item-table {
  width: 100%;
  min-width: 670px;
  border-collapse: collapse;
}

.item-table :is(th, td) {
  padding: 8px;
  border-bottom: 1px solid var(--order-line);
  text-align: left;
  white-space: nowrap;
}

.item-table th {
  background: var(--order-fill);
  font-weight: 500;
}

.item-table .item-index,
.item-table .item-action {
  width: 54px;
  text-align: center;
}

.item-sku {
  width: 130px;
}

.item-name {
  min-width: 140px;
}

.item-quantity {
  width: 86px;
}

.item-price {
  width: 118px;
}

.item-table .item-subtotal {
  width: 112px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.summary-rows {
  display: grid;
  gap: 12px;
  margin: 0;
}

.summary-rows div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.summary-rows dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.summary-total {
  display: grid;
  gap: 5px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--order-line);
}

.order-amount {
  font-size: 27px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

@media (max-width: 1150px) {
  .order-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 600px) {
  .order-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
