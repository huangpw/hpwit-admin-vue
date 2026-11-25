<script setup lang="ts">
defineProps<{
  page: number
  pageSize: number
  total: number
  loading?: boolean
  pageSizes?: number[]
  showQuickJumper?: boolean
}>()

const emit = defineEmits<{
  search: []
  reset: []
  change: [page: number, pageSize: number]
}>()
</script>

<template>
  <n-space vertical size="large" class="approval-list-layout">
    <n-card v-if="$slots.filters">
      <slot name="filter-tabs" />
      <n-form label-placement="left" inline :show-feedback="false" @submit.prevent="emit('search')">
        <n-flex align="center" class="list-filter-row">
          <slot name="filters" />
          <n-flex class="ml-auto" :wrap="false">
            <n-button type="primary" attr-type="submit" :loading="loading">
              <template #icon>
                <icon-park-outline-search />
              </template>
              搜索
            </n-button>
            <n-button strong secondary @click="emit('reset')">
              <template #icon>
                <icon-park-outline-redo />
              </template>
              重置
            </n-button>
          </n-flex>
        </n-flex>
      </n-form>
    </n-card>
    <slot name="summary" />
    <n-card>
      <n-space vertical size="large">
        <header v-if="$slots.actions || $slots.trailing" class="list-toolbar">
          <n-space v-if="$slots.actions" align="center">
            <slot name="actions" />
          </n-space>
          <n-space v-if="$slots.trailing" class="ml-auto" align="center">
            <slot name="trailing" />
          </n-space>
        </header>
        <slot />
        <n-pagination
          v-if="total > 0"
          :page="page" :page-size="pageSize" :item-count="total" :page-sizes="pageSizes ?? [10, 20, 30, 50]"
          :display-order="['size-picker', 'pages', 'quick-jumper']" show-size-picker :show-quick-jumper="showQuickJumper"
          @update:page="emit('change', $event, pageSize)" @update:page-size="emit('change', 1, $event)"
        />
      </n-space>
      <slot name="overlays" />
    </n-card>
  </n-space>
</template>

<style scoped>
.approval-list-layout {
  min-width: 0;
}

.list-filter-row {
  width: 100%;
}

.list-filter-row :deep(.n-form-item) {
  margin-right: 0;
}

.list-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.approval-list-layout :deep(.n-pagination) {
  flex-wrap: wrap;
}
</style>
