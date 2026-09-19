import { request } from '../http'

/**
 * 获取当前登录用户的菜单路由列表（dynamic 模式）—— 后端 zyxhit-admin-boot 的 /v1/menu/routes/current
 *  返回字段已对齐前端 AppRoute.RowRoute：id / pid / name / path / title / requiresAuth / icon / menuType
 *  / componentPath / hide / order / href / keepAlive / redirect / params
 *  menuType 已经是 "page" | "dir" | "link" | "button" 字符串，可直接喂给 helper
 */
export function fetchUserRoutes() {
  return request.Get<Service.ResponseResult<AppRoute.RowRoute[]>>('/v1/menu/routes/current')
}

// 旧的错误接口保留兼容（指向 /v1/menu/list 给"菜单管理"页面用）
export function fetchAllRoutes() {
  return request.Get<Service.ResponseResult<AppRoute.RowRoute[]>>('/v1/menu/list')
}

// 获取所有用户信息
// export function fetchUserPage() {
//   return request.Get<Service.ResponseResult<Entity.User[]>>('/userPage')
// }

// ***** 用户管理 Start *****
export function fetchUserPage(params: object) {
  return request.Get<Service.ResponseResult<Entity.User[]>>('/v1/user/page', { params })
}
/** 获取用户列表 /v1/user/list (用于通知接收人下拉等) */
export function fetchUserOptions(params: object) {
  return request.Get<Service.ResponseResult<Entity.User[]>>('/v1/user/list', { params })
}
/** 新增用户  */
export function fetchAddUser(data: Entity.User) {
  return request.Post<Service.ResponseResult<null>>('/v1/user', data)
}
/** 根据id修改用户信息 */
export function fetchUpdateUser(data: Entity.User) {
  return request.Put<Service.ResponseResult<null>>(`/v1/user/${data.id}`, data)
}
/** 导出用户列表 */
export function fetchExportUser() {
  const methodInstance = request.Get<Blob>('/v1/user/export')
  methodInstance.meta = {
    // 标识为blob数据
    isBlob: true,
  }
  return methodInstance.send()
}

// 用户列表导入
export function fetchImportUser(formData: FormData) {
  return request.Post<Service.ResponseResult<null>>('/v1/user/import', formData, {
    headers: {},
  })
}

// ***** 用户管理 End *****

// ***** 角色管理 Start *****
// 获取所有角色列表
export function fetchRoleList(params: object) {
  return request.Get<Service.ResponseResult<{ list: Entity.RoleModel[], total: number }>>('/v1/role/page', { params })
}
export function fetchRoleOptions() {
  return request.Get<Service.ResponseResult<Entity.OptionTree[]>>('/v1/role/options')
}
// 新增角色 /v1/role
export function fetchAddRole(data: Entity.RoleModel) {
  return request.Post<Service.ResponseResult<null>>('/v1/role', data)
}
// 修改角色 /v1/role/{id}
export function fetchUpdateRole(data: Entity.RoleModel) {
  return request.Put<Service.ResponseResult<null>>(`/v1/role/${data.id}`, data)
}
// 删除角色 /v1/role/{ids}
export function fetchDelRoleByIds(ids: string) {
  return request.Delete(`/v1/role/${ids}`)
}
// 获取角色的菜单ID集合 /v1/role/{roleId}/menuIds
export function fetchRoleMenuIds(roleId: string) {
  return request.Get<Service.ResponseResult<string[]>>(`/v1/role/${roleId}/menuIds`)
}
// 角色分配菜单权限 /v1/role/{roleId}/menus
export function fetchUpdateRoleMenus(roleId: string, menuIds: string[]) {
  return request.Put(`/v1/role/${roleId}/menus`, menuIds)
}

// ***** 角色管理 End *****

// ***** 菜单管理 Start *****
export function fetchMenuList() {
  return request.Get<Service.ResponseResult<AppRoute.RowRoute[]>>('/v1/menu/list')
}
/** 获取菜单下拉列表 */
export function fetchMenuOptions(params: object = {}) {
  return request.Get<Service.ResponseResult<Entity.OptionTree[]>>('/v1/menu/options', { params })
}
/** 新增菜单  */
export function fetchAddMenu(data: AppRoute.RowRoute) {
  return request.Post<Service.ResponseResult<null>>('/v1/menu', data)
}
/** 根据id修改菜单信息 */
export function fetchUpdateMenu(data: AppRoute.RowRoute) {
  return request.Put<Service.ResponseResult<null>>(`/v1/menu/${data.id}`, data)
}
/** 根据id删除菜单 */
export function fetchDelMenuById(id: string) {
  return request.Delete(`/v1/menu/${id}`)
}
// ***** 菜单管理 End *****

// ***** 部门管理 Start *****
/** 获取部门管理列表 */
export function fetchDeptList() {
  return request.Get<Service.ResponseResult<Entity.Dept[]>>('/v1/dept/list')
}
/** 获取部门下拉列表 */
export function fetchDeptOptions() {
  return request.Get<Service.ResponseResult<Entity.OptionTree[]>>('/v1/dept/options')
}

/** 根据ids批量删除部门 */
export function fetchDelDeptByIds(ids: string) {
  return request.Delete(`/v1/dept/${ids}`)
}
/** 根据id修改部门信息 */
export function fetchUpdateDept(data: Entity.Dept) {
  return request.Put(`/v1/dept/${data.id}`, data)
}
/** 新增部门  */
export function fetchAddDept(data: Entity.Dept) {
  return request.Post('/v1/dept', data)
}
// ***** 部门管理 End *****

// ***** 数据字典模块 Start *****

// 请求获取字典库列表
export function fetchDictList(keywordValue?: string) {
  const params = { keywordValue }
  return request.Get<Service.ResponseResult<Entity.Dict[]>>('v1/dict/list', { params })
}
// 新增字典(新增分类) /v1/dict
export function fetchAddDict(data: Entity.Dict) {
  return request.Post('/v1/dict', data)
}
// 修改字典(新增分类) /v1/dict/{{id}}
export function fetchUpdateDict(data: Entity.Dict) {
  return request.Put(`/v1/dict/${data.id}`, data)
}
// 请求获取字典数据列表
export function fetchDictItemList(dictCode?: string, keywordValue?: string) {
  const params = { dictCode, keywordValue }
  return request.Get<Service.ResponseResult<Entity.DictItem[]>>(`/v1/dict/item/list`, { params })
}
/** 删除字典(分类) /v1/dict/{{ids}} */
export function fetchDelDictByIds(ids: string) {
  return request.Delete<Service.ResponseResult<null>>(`/v1/dict/${ids}`)
}
// 根据 dictCode 获取字典数据列表
export function fetchDictItemListByDictCode(dictCode?: string, status?: boolean) {
  const params: { status?: boolean } = {}
  if (status !== undefined) {
    params.status = status
  }
  return request.Get<Service.ResponseResult<Entity.DictItem[]>>(`/v1/dict/item/list/${dictCode}`, { params })
}
/**
 * 根据 dictCode 获取下拉选项(走 Redis 缓存)。
 *
 * 后端 zyxhit-admin-boot SysDictController#getDictOptions:
 *   GET /v1/dict/options?dictCode=xxx
 *   返回 List<Option<String>> = [{ value: string, label: string }, ...]
 *   已自动过滤 status=1 的项,按 sort 升序,管理员可通过
 *   DELETE /v1/dict/options/refresh/{dictCode} 主动失效缓存。
 *
 * 适用于表单下拉场景(如: gender / user_status);若需要字典项全字段
 * (status/tagType/remark 等)请改用 fetchDictItemListByDictCode。
 */
export function fetchDictOptions(dictCode: string) {
  return request.Get<Service.ResponseResult<Entity.Option[]>>('/v1/dict/options', {
    params: { dictCode },
  })
}
// 修改字典分类状态
export function fetchUpdateDictStatus(id?: number, status?: boolean) {
  return request.Put<Service.ResponseResult<null>>(`/v1/dict/status/${id}?status=${status}`)
}

// 修改字典数据状态
export function fetchUpdateDictItemStatus(id?: number, status?: boolean) {
  return request.Put<Service.ResponseResult<null>>(`/v1/dict/item/status/${id}?status=${status}`)
}

// 新增字典数据(分类属性) /v1/dict/{{dictCode}}/item
export function fetchAddDictItem(dictCode: string, data: Entity.DictItem) {
  return request.Post(`/v1/dict/${dictCode}/item`, data)
}
// 获取字典数据(分类属性)信息 /v1/dict/{{dictCode}}/item/{{itemId}}/form
export function fetchDictItemForm(dictCode: string, itemId: number) {
  return request.Get<Service.ResponseResult<Entity.DictItem>>(`/v1/dict/${dictCode}/item/${itemId}/form`)
}
// 修改字典数据(分类属性) /v1/dict/{{dictCode}}/item/{{itemId}}
export function fetchUpdateDictItem(dictCode: string, itemId: number, data: Entity.DictItem) {
  return request.Put(`/v1/dict/${dictCode}/item/${itemId}`, data)
}
/** 删除字典数据 /v1/dict/item/{{ids}} */
export function fetchDelDictItemByIds(ids: string) {
  return request.Delete<Service.ResponseResult<null>>(`/v1/dict/item/${ids}`)
}

// ***** 数据字典模块 End *****

// ***** 日志管理 Start *****
// 查询日志列表 /api/v1/logs/page
export function fetchLogPage(data: any) {
  return request.Get<Service.ResponseResult<Entity.Log[]>>('/v1/log/page', data)
}

// ***** 日志管理 End *****

// ***** 配置管理 Start *****
export function fetchConfigPage(data: any) {
  return request.Get<Service.ResponseResult<Entity.Config[]>>('/v1/config/page', data)
}
/** 新增 配置管理 /v1/config */
export function fetchAddConfig(data: Entity.Config) {
  return request.Post('/v1/config', data)
}
/** 修改 配置管理 /v1/config/{{id}} */
export function fetchUpdateConfig(data: Entity.Config) {
  return request.Put(`/v1/config/${data.id}`, data)
}
/** 删除 配置管理 /v1/config/{{id}} */
export function fetchDelConfigById(id: string) {
  return request.Delete(`/v1/config/${id}`)
}

// ***** 配置管理 End *****

// ***** 通知公告管理 Start *****
/** 查询 通知公告 分页列表 /v1/notices/page */
export function fetchNoticesPage(params: object) {
  return request.Get<Service.ResponseResult<Entity.Notice[]>>('/v1/notice/page', { params })
}
/** 查询 通知公告 表单数据 /v1/notice/{{id}}/form */
export function fetchNoticeForm(id: number) {
  return request.Get<Service.ResponseResult<Entity.Notice>>(`/v1/notice/${id}/form`)
}
/** 新增 通知公告 /v1/notice */
export function fetchAddNotice(data: Entity.Notice) {
  return request.Post<Service.ResponseResult<null>>('/v1/notice', data)
}
/** 修改 通知公告 /v1/notice/{{id}} */
export function fetchUpdateNotice(data: Entity.Notice) {
  return request.Put<Service.ResponseResult<null>>(`/v1/notice/${data.id}`, data)
}
/** 发布通知公告 /v1/notice/{{id}}/publish */
export function fetchPublishNotice(id: number) {
  return request.Put<Service.ResponseResult<null>>(`/v1/notice/${id}/publish`)
}
/** 撤回通知公告 /v1/notice/{{id}}/revoke */
export function fetchRevokeNotice(id: number) {
  return request.Put<Service.ResponseResult<null>>(`/v1/notice/${id}/revoke`)
}
/** 删除通知公告 /v1/notice/{{ids}} */
export function fetchDelNoticeByIds(ids: string) {
  return request.Delete<Service.ResponseResult<null>>(`/v1/notice/${ids}`)
}

// ***** 通知公告管理 End *****
