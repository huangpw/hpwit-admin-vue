<script setup lang="ts">
import type { Order } from '@/service/api/flowable'
import { orderNo } from './order'
import OrderDetails from './OrderDetails.vue'

defineProps<{ businessNo: string, instanceId: string, order?: Order }>()
</script>

<template>
  <OrderDetails v-if="businessNo === orderNo && order" :order="order" />
  <n-empty v-else description="未找到订单明细" />
</template>
