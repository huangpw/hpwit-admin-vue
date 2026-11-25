import type { Component } from 'vue'
import { defineAsyncComponent } from 'vue'

const modules = import.meta.glob<{ default: Component }>('/src/views/**/approval.vue')

export const componentOptions = Object.keys(modules)
  .map(key => key.replace('/src/views/', ''))
  .sort()
  .map(value => ({ label: value, value }))

const components = new Map(
  Object.entries(modules).map(([key, load]) => [key, defineAsyncComponent(load)]),
)

export function getApprovalComponent(path?: string) {
  if (!path)
    return undefined
  const relative = path.replace(/^\/?(?:src\/views\/)?/, '')
  return components.get(`/src/views/${relative}`)
}
