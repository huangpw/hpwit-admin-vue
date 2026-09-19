<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/store/index'

const router = useRouter()
const appStore = useAppStore()

const name = import.meta.env.VITE_SHORT_APP_NAME

const hidenLogoText = computed(() => {
  if (['sidebar', 'mixed-sidebar', 'horizontal'].includes(appStore.layoutMode)) {
    return false
  }
  if (['two-column', 'mixed-two-column'].includes(appStore.layoutMode)) {
    return true
  }
  return appStore.collapsed
})
</script>

<template>
  <div
    class="h-60px text-xl flex-center cursor-pointer gap-2 p-x-2"
    @click="router.push('/')"
  >
    <svg-icons-logo class="text-1.5em" />
    <span
      v-show="!hidenLogoText"
      class="text-ellipsis overflow-hidden whitespace-nowrap"
    >{{ name }}</span>
  </div>
</template>

<style scoped></style>
