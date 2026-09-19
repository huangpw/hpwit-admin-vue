/// <reference path="../global.d.ts"/>

/* 角色数据库表字段 */
namespace Entity {
  type RoleType = 'super' | 'admin' | 'user' | 'guest' | 'visitor' | 'other'

  interface Role {
    /** 角色id */
    id?: number
    /** 角色类型 (setting 字符串枚举) */
    role?: RoleType
  }

  interface RoleModel {
    /** 角色ID */
    id: number
    /** 角色名称 */
    name?: string
    /** 角色编码 */
    code?: string
    /** 数据权限 */
    dataScope?: number
    /** 数据权限名称 */
    dataScopeName?: string
    /** 角色状态 */
    status?: number
    /** 排序 */
    sort?: number
    /** 创建时间 yyyy-MM-dd HH:mm:ss */
    createTime?: string
    /** 更新时间 yyyy-MM-dd HH:mm:ss */
    updateTime?: string
  }
}
