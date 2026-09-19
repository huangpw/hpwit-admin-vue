<script setup lang="ts">
import type { FormItemRule, FormRules } from 'naive-ui'

import HelpInfo from '@/components/common/HelpInfo.vue'
import { Regex } from '@/constants'
import { useBoolean } from '@/hooks'
import {
  fetchAddMenu,
  fetchMenuOptions,
  fetchUpdateMenu,
} from '@/service'

interface Props {
  modalName?: string
  allMenus: AppRoute.RowRoute[]
}

const {
  modalName = '',
} = defineProps<Props>()

const emit = defineEmits<{
  open: []
  close: []
  success: []
}>()

const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

interface MenuForm {
  id: number | null
  name: string
  type: number
  parentId: number
  routeName: string
  routePath: string
  icon: string
  component: string | null
  params: string | null
  visible: number
  alwaysShow: number
  keepAlive: number
  requiresAuth: number
  redirect: string | null
  perm: string | null
  sort: number
}

const formDefault: MenuForm = {
  name: '', // 菜单名称
  type: 2,
  id: null,
  parentId: 0, // 父级目录，0 表示顶级菜单
  routeName: '',
  routePath: '',
  icon: '',
  component: null,
  params: null,
  visible: 1,
  alwaysShow: 1,
  keepAlive: 1,
  requiresAuth: 0,
  redirect: null,
  perm: null,
  sort: 1,
}
const formModel = ref<MenuForm>({ ...formDefault })

type ModalType = 'add' | 'view' | 'edit'
const modalType = shallowRef<ModalType>('add')
const modalTitle = computed(() => {
  const titleMap: Record<ModalType, string> = {
    add: '添加',
    view: '查看',
    edit: '编辑',
  }
  return `${titleMap[modalType.value]}${modalName}`
})

// 打开弹窗表单
async function openModal(type: ModalType = 'add', data?: AppRoute.RowRoute) {
  emit('open')
  modalType.value = type
  await getMenuList() // 获取菜单选项列表
  const handlers = {
    async add() {
      formModel.value = { ...formDefault }
      const parentId = data?.id
      formModel.value.parentId = parentId === 0 || parentId === -1 || parentId === undefined || parentId === null
        ? 0
        : Number(parentId)
    },
    async view() {
      if (!data)
        return
      formModel.value = { ...formDefault, ...(data as Partial<MenuForm>) }
    },
    async edit() {
      if (!data)
        return
      formModel.value = { ...formDefault, ...(data as Partial<MenuForm>) }
      // Menu APIs may expose the parent as `pid` (route shape) or `parentId` (menu shape).
      const parentId = data.pid ?? (data as AppRoute.RowRoute & { parentId?: number | string | null }).parentId
      formModel.value.parentId = parentId === 0 || parentId === -1 || parentId === null || parentId === undefined
        ? 0
        : Number(parentId)
    },
  }
  await handlers[type]()
  showModal()
}

// 关闭弹窗表单
function closeModal() {
  hiddenModal()
  endLoading()
  emit('close')
}

// 将方法暴露到父组件
defineExpose({
  openModal,
})

// 表单提交
const formRef = ref()
async function submitModal() {
  const submit = { ...formModel.value, parentId: formModel.value.parentId <= 0 ? 0 : formModel.value.parentId }

  const handlers = {
    async add() {
      const result = await fetchAddMenu(submit as unknown as AppRoute.RowRoute)
      if (!result.isSuccess) {
        window.$message.error(result.message)
        return false
      }
      window.$message.success('提交成功')
      emit('success')
      return true
    },
    async edit() {
      const result = await fetchUpdateMenu(submit as unknown as AppRoute.RowRoute)
      if (!result.isSuccess) {
        window.$message.error(result.message)
        return false
      }
      window.$message.success('提交成功')
      emit('success')
      return true
    },
    async view() {
      return true
    },
  }
  await formRef.value?.validate()
  startLoading()
  await handlers[modalType.value]() && closeModal()
}

// 表单校验规则
const rules: FormRules = {
  parentId: {
    required: true,
    // message: '请选择上级部门',
    validator: (_rule: FormItemRule, value: unknown) => {
      if (value === undefined || value === null) {
        return new Error('请选择上级部门')
      }
      return true
    },
    trigger: 'blur',
  },
  name: {
    required: true,
    message: '请输入菜单名称',
    trigger: 'blur',
  },
  routeName: {
    required: true,
    // message: '请输入菜单名称',
    validator(rule: FormItemRule, value: string) {
      if (!value)
        return new Error('请输入路由名称')

      if (!new RegExp(Regex.RouteName).test(value))
        return new Error('路由名称只能包含英文数字_!@#$%^&*~-')

      return true
    },
    trigger: 'blur',
  },
  type: {
    required: true,
    // message: '请选择菜单类型',
    validator: (_rule: FormItemRule, value: unknown) => {
      if (value === undefined || value === null) {
        return new Error('请选择菜单类型')
      }
      return true
    },
    trigger: 'blur',
  },
  routePath: {
    required: true,
    message: '请输入路由路径',
    trigger: 'blur',
  },
  component: {
    required: true,
    message: '请输入组件路径',
    trigger: 'blur',
  },
  visible: {
    required: true,
    validator: (_rule: FormItemRule, value: unknown) => {
      if (value === undefined || value === null) {
        return new Error('请选择显示状态')
      }
      return true
    },
    // message: '请选择显示状态',
    trigger: 'blur',
  },
}

// 父级菜单选择
interface MenuOptionTree {
  value: number
  label: string
  children?: MenuOptionTree[]
}

const options = ref<MenuOptionTree[]>([])
const expandedKeys = ref<number[]>([-1])
async function getMenuList() {
  const { data } = await fetchMenuOptions({ onlyParent: true })
  // Keep tree-select values consistent with the numeric form field.
  const normalizeOptions = (items: Entity.OptionTree[]): MenuOptionTree[] => items.map(item => ({
    ...item,
    value: Number(item.value),
    children: item.children ? normalizeOptions(item.children) : undefined,
  }))
  options.value = [{
    value: 0,
    label: '顶级菜单',
    children: normalizeOptions(data || []),
  }]
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    draggable
    preset="card"
    :title="modalTitle"
    class="w-720px"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-form
      ref="formRef"
      :rules="rules"
      label-placement="left"
      :label-width="100"
      :model="formModel"
      :disabled="modalType === 'view'"
    >
      <n-grid :cols="2" :x-gap="18">
        <n-form-item-grid-item :span="2" path="parentId">
          <template #label>
            父级目录
            <HelpInfo message="不填写则为顶层菜单" />
          </template>
          <n-tree-select
            v-model:value="formModel.parentId"
            filterable
            clearable
            :options="options"
            key-field="value"
            default-expand-all
            label-field="label"
            children-field="children"
            :default-expanded-keys="expandedKeys"
            placeholder="请选择父级目录"
          />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="菜单名称" path="name">
          <n-input v-model:value="formModel.name" placeholder="请输入菜单名称" />
        </n-form-item-grid-item>

        <n-form-item-grid-item :span="2" label="菜单类型" path="type">
          <n-radio-group v-model:value="formModel.type" name="radiogroup">
            <n-space>
              <n-radio :value="2">
                目录
              </n-radio>
              <n-radio :value="1">
                菜单
              </n-radio>
              <n-radio :value="3">
                外链
              </n-radio>
              <n-radio :value="4">
                按钮
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1, 2].includes(formModel.type)" :span="2" label="路由名称" path="routeName">
          <template #label>
            路由名称
            <HelpInfo message="如果需要开启缓存，需保证页面 defineOptions 中的 name 与此处一致，建议使用驼峰" />
          </template>
          <n-input v-model:value="formModel.routeName" placeholder="userSystem" />
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1, 2].includes(formModel.type)" :span="2" label="路由路径" path="routePath">
          <template #label>
            路由路径
            <HelpInfo message="定义应用中不同页面对应的 URL 路径，目录需以 / 开头，菜单项不用。例如：系统管理目录 /system，系统管理下的用户管理菜单 user" />
          </template>
          <n-input v-model:value="formModel.routePath" placeholder="/system/user" />
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1].includes(formModel.type)" :span="2" label="组件路径" path="component">
          <template #label>
            组件路径
            <HelpInfo message="组件页面完整路径，相对于 src/views/，如 system/user/index，缺省后缀 .vue" />
          </template>
          <n-input-group>
            <n-input-group-label>src/views</n-input-group-label>
            <n-input v-model:value="formModel.component" placeholder="/system/user/index" />
            <n-input-group-label>.vue</n-input-group-label>
          </n-input-group>
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[3].includes(formModel.type)" :span="2" label="组件路径">
          <template #label>
            组件路径
            <HelpInfo message="组件页面完整路径，相对于 src/views/，如 system/user/index，缺省后缀 .vue" />
          </template>
          <n-input-group>
            <n-input-group-label>src/views</n-input-group-label>
            <n-input v-model:value="formModel.component" placeholder="/system/user/index" />
            <n-input-group-label>.vue</n-input-group-label>
          </n-input-group>
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1].includes(formModel.type)" :span="2" label="路由参数" path="params">
          <template #label>
            路由参数
            <HelpInfo message="组件页面使用 `useRoute().query.参数名` 获取路由参数值" />
          </template>

          <n-space vertical>
            <div>
              <n-button>添加路由参数</n-button>
            </div>
            <div>
              <n-input-group>
                <n-input :style="{ width: '33%' }" />
                <n-input :style="{ width: '33%' }" />

                <n-button tertiary>
                  <template #icon>
                    <icon-park-outline-plus />
                  </template>
                </n-button>
                <n-button tertiary type="error">
                  <template #icon>
                    <icon-park-outline-delete color="red" />
                  </template>
                </n-button>
              </n-input-group>
            </div>
          </n-space>
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1, 2, 3].includes(formModel.type)" :span="2" label="图标" path="icon">
          <icon-select v-model:value="formModel.icon" :disabled="modalType === 'view'" />
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1, 2, 3].includes(formModel.type)" :span="1" label="显示状态" path="visible">
          <n-radio-group v-model:value="formModel.visible" name="radiogroup">
            <n-space>
              <n-radio :value="1">
                显示
              </n-radio>
              <n-radio :value="0">
                隐藏
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1, 2].includes(formModel.type)" :span="1" label="始终显示" path="alwaysShow">
          <template #label>
            始终显示
            <HelpInfo message="即使目录或菜单下只有一个子节点，也会显示父节点。" />
          </template>
          <n-radio-group v-model:value="formModel.alwaysShow" name="radiogroup">
            <n-space>
              <n-radio :value="1">
                显示
              </n-radio>
              <n-radio :value="0">
                隐藏
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1].includes(formModel.type)" :span="1" label="页面缓存" path="keepAlive">
          <n-radio-group v-model:value="formModel.keepAlive" name="radiogroup">
            <n-space>
              <n-radio :value="1">
                开启
              </n-radio>
              <n-radio :value="0">
                关闭
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1].includes(formModel.type)" :span="1" label="登录访问" path="requiresAuth">
          <n-radio-group v-model:value="formModel.requiresAuth" name="radiogroup">
            <n-space>
              <n-radio :value="1">
                开启
              </n-radio>
              <n-radio :value="0">
                关闭
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[2].includes(formModel.type)" :span="2" label="跳转路由" path="redirect">
          <n-input v-model:value="formModel.redirect" placeholder="跳转路由" />
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[4].includes(formModel.type)" :span="2" label="权限标识" path="perm">
          <n-input v-model:value="formModel.perm" placeholder="sys:user:add" />
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[3].includes(formModel.type)" :span="2" path="href">
          <template #label>
            外链地址
            <HelpInfo message="填写后，点击菜单将跳转到该地址，组件路径任意填写" />
          </template>
          <n-input v-model:value="formModel.routePath" placeholder="https://example.com" />
        </n-form-item-grid-item>

        <n-form-item-grid-item v-if="[1, 2, 3, 4].includes(formModel.type)" :span="2" path="sort">
          <template #label>
            菜单排序
            <HelpInfo message="数字越小，同级中越靠前" />
          </template>
          <n-input-number v-model:value="formModel.sort" />
        </n-form-item-grid-item>
      </n-grid>
    </n-form>

    <template v-if="modalType !== 'view'" #action>
      <n-space justify="center">
        <n-button @click="closeModal">
          取消
        </n-button>
        <n-button type="primary" :loading="submitLoading" @click="submitModal">
          提交
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped></style>
