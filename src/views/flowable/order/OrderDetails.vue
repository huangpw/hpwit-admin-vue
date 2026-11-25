<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { Order, OrderItem } from '@/service/api/flowable'
import { formatAmount, lineAmount, orderNo } from './order'

const props = defineProps<{ order: Order }>()
const items = computed(() => props.order.items.map((item, index) => ({ ...item, key: index })))
const total = computed(() => props.order.items.reduce((sum, item) => sum + lineAmount(item.quantity, item.price), 0))
const columns: DataTableColumns<OrderItem> = [
  { title: '商品编码', key: 'sku' },
  { title: '商品名称', key: 'name' },
  { title: '数量', key: 'quantity', align: 'right' },
  { title: '单价（元）', key: 'price', align: 'right', render: row => formatAmount(lineAmount(1, row.price)) },
  { title: '小计（元）', key: 'subtotal', align: 'right', render: row => formatAmount(lineAmount(row.quantity, row.price)) },
]
</script>

<template>
  <div>
    <n-descriptions bordered :column="2" label-placement="left">
      <n-descriptions-item label="订单编号">
        {{ orderNo }}
      </n-descriptions-item>
      <n-descriptions-item label="下单日期">
        {{ order.date }}
      </n-descriptions-item>
      <n-descriptions-item label="客户名称">
        {{ order.customer }}
      </n-descriptions-item>
      <n-descriptions-item label="经办部门">
        {{ order.department }}
      </n-descriptions-item>
      <n-descriptions-item v-if="order.deliveryDate" label="预计交付">
        {{ order.deliveryDate }}
      </n-descriptions-item>
      <n-descriptions-item v-if="order.contact" label="联系人">
        {{ order.contact }}
      </n-descriptions-item>
      <n-descriptions-item v-if="order.phone" label="联系电话">
        {{ order.phone }}
      </n-descriptions-item>
      <n-descriptions-item v-if="order.address" label="收货地址" :span="2">
        {{ order.address }}
      </n-descriptions-item>
      <n-descriptions-item v-if="order.note" label="订单备注" :span="2">
        <span class="whitespace-pre-wrap">{{ order.note }}</span>
      </n-descriptions-item>
    </n-descriptions>
    <n-data-table class="mt-3" :columns="columns" :data="items" :scroll-x="520" size="small" />
    <n-flex justify="end" class="mt-3">
      <n-text strong>
        订单合计 ¥{{ formatAmount(total) }}
      </n-text>
    </n-flex>
  </div>
</template>
