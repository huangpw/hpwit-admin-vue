<script setup lang="ts">
import ApprovalDetail from './ApprovalDetail.vue'

const route = useRoute()
const router = useRouter()
const instance = computed(() => String(route.params.id))
const monitor = computed(() => route.query.monitor === '1')

function close() {
  if (window.history.state?.back) {
    router.back()
    return
  }
  const routes = ['flowableWork', 'flowableMine', 'flowableTodo', 'flowableDone', 'flowableCc', 'flowableMonitor']
  const name = monitor.value && router.hasRoute('flowableMonitor')
    ? 'flowableMonitor'
    : routes.find(routeName => router.hasRoute(routeName))
  void router.replace(name ? { name } : '/')
}

function select(id: string) {
  void router.replace({ name: 'flowableDetail', params: { id }, query: route.query })
}
</script>

<template>
  <ApprovalDetail :id="instance" :key="instance" standalone @close="close" @select="select" />
</template>
