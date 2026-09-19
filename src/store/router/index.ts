import type { MenuOption } from 'naive-ui'
import { router } from '@/router'
import { staticRoutes } from '@/router/routes.static'
import { fetchUserRoutes } from '@/service'
import { $t } from '@/utils'
import { createMenus, createRoutes, generateCacheRoutes } from './helper'

interface RoutesStatus {
  isInitAuthRoute: boolean
  menus: MenuOption[]
  rowRoutes: AppRoute.RowRoute[]
  activeMenu: string | null
  cacheRoutes: string[]
}
export const useRouteStore = defineStore('route-store', {
  state: (): RoutesStatus => {
    return {
      isInitAuthRoute: false,
      activeMenu: null,
      menus: [],
      rowRoutes: [],
      cacheRoutes: [],
    }
  },
  actions: {
    resetRouteStore() {
      this.resetRoutes()
      this.$reset()
    },
    resetRoutes() {
      if (router.hasRoute('appRoot'))
        router.removeRoute('appRoot')
    },
    // set the currently highlighted menu key
    setActiveMenu(key: string) {
      this.activeMenu = key
    },

    async initRouteInfo() {
      if (import.meta.env.VITE_ROUTE_LOAD_MODE === 'dynamic') {
        try {
          // Get current user's menu routes from backend
          // (Sa-Token identifies the user via the accessToken in the request header)
          const result = await fetchUserRoutes()

          if (!result.isSuccess || !result.data) {
            throw new Error('Failed to fetch user routes')
          }

          return result.data
        }
        catch (error) {
          console.error('Failed to initialize route info:', error)
          throw error
        }
      }
      else {
        this.rowRoutes = staticRoutes
        return staticRoutes
      }
    },
    async initAuthRoute() {
      this.isInitAuthRoute = false

      try {
        // Initialize route information
        const rowRoutes = await this.initRouteInfo()
        if (!rowRoutes) {
          const error = new Error('Failed to get route information')
          window.$message.error($t(`app.getRouteError`))
          throw error
        }
        // 个人中心属于登录用户的内置页面，即使后端动态菜单未返回，也应可直接访问。
        const userCenterRoute = staticRoutes.find(route => route.name === 'userCenter')
        const resolvedRoutes = rowRoutes.some(route => route.name === 'userCenter') || !userCenterRoute
          ? rowRoutes
          : [...rowRoutes, userCenterRoute]
        this.rowRoutes = resolvedRoutes

        // Generate actual route and insert
        const routes = createRoutes(resolvedRoutes)
        router.addRoute(routes)

        // Generate side menu
        this.menus = createMenus(resolvedRoutes)

        // Generate the route cache
        this.cacheRoutes = generateCacheRoutes(resolvedRoutes)

        this.isInitAuthRoute = true
      }
      catch (error) {
        // 重置状态并重新抛出错误
        this.isInitAuthRoute = false
        throw error
      }
    },
  },
})
