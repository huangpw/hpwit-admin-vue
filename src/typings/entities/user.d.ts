/// <reference path="../global.d.ts"/>

/** 用户数据库表字段 */
namespace Entity {
  type RoleType = 'super' | 'admin' | 'user' | 'guest' | 'visitor' | 'other'

  interface User {
    /** 用户id */
    id?: number | null
    /** 用户名 */
    username?: string | null
    /** 昵称 */
    nickname?: string | null
    /** 密码 */
    password?: string | null
    /** 性别 (0=保密 1=男 2=女) */
    gender?: 0 | 1 | 2 | null
    /** 部门ID */
    deptId?: number | null
    /** 部门名称 */
    deptName?: string
    /** 用户头像 */
    avatar?: string
    /** 手机号 (system) */
    mobile?: string | null
    /** 电话 (setting 兼容) */
    tel?: string
    /** 状态 (0=禁用 1=启用) */
    status?: 0 | 1
    /** 邮箱 */
    email?: string | null
    /** 备注 */
    remark?: string | null
    /** 用户角色类型 (setting 字符串枚举) */
    role?: RoleType[]
    /** 用户角色ID (system 数字ID数组) */
    roleIds?: number[]
    /** 用户角色名称 (system 字符串) */
    roleNames?: string
    /** 创建时间 */
    createTime?: string
  }
}
