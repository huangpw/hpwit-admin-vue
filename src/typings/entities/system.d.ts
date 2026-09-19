/// <reference path="../global.d.ts"/>

/** 部门数据库表字段 */
namespace Entity {

  interface Dept {

    /** 主键 */
    id?: number | null;

    /** 部门名称 */
    name?: string | null;

    /** 部门编号 */
    code?: string | null;

    /** 父节点id */
    parentId?: number | string | null;

    /** 父节点id路径 */
    treePath?: string | null;

    /** 显示顺序 */
    sort?: number | null;

    /** 状态(1-正常 0-禁用) */
    status?: number | null;

    /** 创建人ID */
    createBy?: number;

    /** 创建时间 */
    createTime?: string; // 或 Date，如果你在代码中会用 Date 类型处理

    /** 修改人ID */
    updateBy?: number;

    /** 更新时间 */
    updateTime?: string; // 或 Date

    /** 逻辑删除标识(1-已删除 0-未删除) */
    isDeleted?: boolean;

    /** 子部门树节点 */
    children?: Dept[];
  }

  interface OptionTree {
    value: string
    label: string
    children?: OptionTree[]
  }

  interface Option {
    value: string | number | undefined
    label: string | undefined
  }

  interface Log {
    /** 主键 */
    id?: number;

    /** 日志模块 */
    module?: string;

    /** 日志内容 */
    content?: string;

    /** 请求路径 */
    requestUri?: string;

    /** 请求方法 */
    method?: string;

    /** IP地址 */
    ip?: string;

    /** 地区 */
    region?: string;

    /** 浏览器 */
    browser?: string;

    /** 终端系统 */
    os?: string;

    /** 执行时间(毫秒) */
    executionTime?: number;

    /** 创建人ID */
    createBy?: number;

    /** 创建时间 */
    createTime?: string; // 前端一般用 ISO 字符串

    /** 操作人 */
    operator?: string;
  }

  interface Config {
    /** 主键 */
    id: number | null

    /** 配置名称 */
    configName: string | null

    /** 配置键 */
    configKey: string | null

    /** 配置值 */
    configValue: string | null

    /** 描述、备注 */
    remark?: string | null
  }

  interface Notice {
    /** 通知ID */
    id: number | null;

    /** 通知标题 */
    title: string | null;

    /** 通知状态 */
    publishStatus: number;

    /** 通知类型 */
    type: number | null;

    /** 发布人姓名 */
    publisherName: string;

    /** 通知等级 */
    level: string | null;

    /** 通知内容 */
    content?: string | null;

    /** 发布时间 yyyy-MM-dd HH:mm */
    publishTime: string;

    /** 是否已读（0 未读，1 已读） */
    isRead: number | null;

    /** 目标类型 */
    targetType: number | null;

    /** 创建时间 yyyy-MM-dd HH:mm */
    createTime: string | null;

    /** 撤回时间 yyyy-MM-dd HH:mm */
    revokeTime: string | null;

    /** 接收人ID集合 */
    targetUserIds: string[];
  }
}
