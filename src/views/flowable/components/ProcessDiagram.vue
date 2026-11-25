<script setup lang="ts">
import type { Activity } from '@/service/api/flowable'
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import type { ProcessCanvas } from './flowableModdle'
import { flowableModdle } from './flowableModdle'
import 'bpmn-js/dist/assets/diagram-js.css'

const props = defineProps<{ xml: string, activities?: Activity[] }>()
const container = ref<HTMLDivElement>()
const failed = ref(false)
interface ViewerServices {
  canvas: ProcessCanvas
  elementRegistry: { get: (id: string) => unknown }
}
let viewer: NavigatedViewer<ViewerServices> | undefined

function fit() {
  viewer?.get('canvas').zoom('fit-viewport')
}

onMounted(async () => {
  const diagram = new NavigatedViewer<ViewerServices>({ container: container.value, moddleExtensions: { flowable: flowableModdle } })
  viewer = diagram
  try {
    await diagram.importXML(props.xml)
    if (viewer !== diagram)
      return
    const canvas = diagram.get('canvas')
    const registry = diagram.get('elementRegistry')
    for (const activity of props.activities ?? []) {
      if (registry.get(activity.id)) {
        const marker = activity.active ? 'approval-current' : activity.cancelled ? 'approval-cancelled' : 'approval-visited'
        canvas.addMarker(activity.id, marker)
      }
    }
    fit()
  }
  catch {
    failed.value = true
  }
})
onBeforeUnmount(() => {
  viewer?.destroy()
  viewer = undefined
})
</script>

<template>
  <n-alert v-if="failed" type="info">
    此版本没有可显示的 BPMN 图形。
  </n-alert>
  <div v-show="!failed">
    <n-flex justify="space-between" align="center" class="mb-2">
      <n-space v-if="activities" size="small">
        <n-tag size="small" type="info">
          当前节点
        </n-tag>
        <n-tag size="small" type="success">
          已执行节点
        </n-tag>
        <n-tag size="small" type="warning">
          已中止节点
        </n-tag>
      </n-space>
      <n-button size="small" secondary @click="fit">
        适应画布
      </n-button>
    </n-flex>
    <div ref="container" class="process-view" />
  </div>
</template>

<style scoped>
.process-view {
  height: 400px;
  background: #fcfdff;
  border: 1px solid #8a97aa45;
  border-radius: 8px;
}

.process-view :deep(.approval-current .djs-visual > :first-child) {
  fill: #dbeafe !important;
  stroke: #2563eb !important;
}

.process-view :deep(.approval-visited .djs-visual > :first-child) {
  fill: #dcfce7 !important;
  stroke: #15803d !important;
}

.process-view :deep(.approval-cancelled .djs-visual > :first-child) {
  fill: #fef3c7 !important;
  stroke: #b45309 !important;
}
</style>
