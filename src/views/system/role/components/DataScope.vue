<script lang="ts" setup>
import {
  fetchMenuOptions,
  fetchRoleMenuIds,
  fetchUpdateRoleMenus,
} from '@/service'
import {
  executeAsync,
} from '@/utils'

defineOptions({ name: 'DataScope' })

const emit = defineEmits<{
  (e: 'success'): void
}>()

const { t } = useI18n()

const spin = ref(false)
const modalVisible = ref<boolean>(false)
const title = ref<string>('')
const loading = ref<boolean>(false)

/** 搜索过滤 */
const pattern = ref<string>('')
/** 是否展开 */
const expandAll = ref<boolean>(true)
/** 父子联动 */
const cascade = ref<boolean>(false)

// 菜单权限下拉
const menuPermOptions = ref<Entity.OptionTree[]>([])
const selectedKeys = ref<string[]>([])

const roleId = ref<string>('')

defineExpose({
  open: async (row: Entity.RoleModel, t: string) => {
    roleId.value = String(row.id)
    title.value = t
    modalVisible.value = true
    loading.value = true
    // 获取所有的菜单
    const options = await fetchMenuOptions()
    menuPermOptions.value = options.data

    fetchRoleMenuIds(String(row.id))
      .then(async (res) => {
        await nextTick()
        updateCheckedKeys(res.data || [])
      })
      .finally(() => (loading.value = false))
  },
})

/** 选中改变 */
function updateCheckedKeys(keys: string[]) {
  selectedKeys.value = keys
}
function handleAssignPermSubmit() {
  return executeAsync(
    () => fetchUpdateRoleMenus(roleId.value, selectedKeys.value),
    () => {
      handleClose()
      emit('success')
    },
  )
}

/** 取消 */
function handleClose() {
  modalVisible.value = false
}
</script>

<template>
  <n-drawer v-model:show="modalVisible" resizable :default-width="520">
    <n-drawer-content :title="title">
      <template #header>
        <n-spin :show="loading">
          <n-flex vertical class="w-full" :size="[0, 20]">
            {{ title }}
            <n-flex align="center" :size="[20, 0]">
              <div flex-1>
                <n-input v-model:value="pattern" :placeholder="t('common.search')" clearable>
                  <template #prefix>
                    <icon-park-outline-search />
                  </template>
                </n-input>
              </div>
              <n-flex>
                <n-checkbox v-model:checked="expandAll">
                  {{ t("common.expand") }}/{{ t("common.collapse") }}
                </n-checkbox>
                <n-checkbox v-model:checked="cascade">
                  {{ t("common.linkage") }}
                </n-checkbox>
              </n-flex>
            </n-flex>
          </n-flex>
        </n-spin>
      </template>

      <n-tree
        ref="treeInst" block-line checkable :show-irrelevant-nodes="false" :show-line="true" :selectable="true"
        :pattern="pattern" :data="menuPermOptions" :default-expand-all="expandAll" :checked-keys="selectedKeys"
        :cascade="cascade" key-field="value" label-field="label" @update:checked-keys="updateCheckedKeys"
      />
      <template #footer>
        <n-flex>
          <!-- v-hasPerm="['sys:role:assign']" -->
          <n-button type="primary" :loading="spin" @click="handleAssignPermSubmit">
            <template #icon>
              <icon-park-outline-check />
            </template>
            {{ t("common.submit") }}
          </n-button>
          <n-button strong secondary @click="handleClose">
            <template #icon>
              <icon-park-outline-close />
            </template>
            {{ t("common.cancel") }}
          </n-button>
        </n-flex>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>
