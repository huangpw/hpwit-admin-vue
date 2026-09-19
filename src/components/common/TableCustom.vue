<script setup lang="ts">

</script>

<template>
  <n-dropdown trigger="hover" :options="options" @select="handleSelect">
    <n-button tertiary size="small" class="my-btn">
      <template #icon>
        <n-icon>
          <icon-park-outline-sort-three font-size="15px" />
        </n-icon>
      </template>
    </n-button>
  </n-dropdown>
  <n-button tertiary size="small" class="my-btn">
    <template #icon>
      <n-icon>
        <icon-park-outline-align-text-right font-size="15px" />
      </n-icon>
    </template>
  </n-button>
  <n-button tertiary size="small" class="my-btn">
    <template #icon>
      <n-icon>
        <icon-park-outline-setting-two font-size="15px" />
      </n-icon>
    </template>
  </n-button>
</template>
