/// <reference path="../global.d.ts"/>

/* 字典数据库表字段 */
namespace Entity {
  // 字典库 (兼容 setting 现有 + system 完整字段)
  interface Dict {
    // 兼容 setting/dictionary 现有字段
    id?: number
    isRoot?: 0 | 1
    code: string
    label: string
    value?: number
    // system/dict 完整字段
    dictCode?: string
    name?: string
    status?: number
    remark?: string
    isDelete?: number
    isActive?: boolean
  }

  // 字典项 (system/dict 详情子表)
  interface DictItem {
    id?: number
    dictCode: string
    label: string
    value: string
    sort?: number
    status?: number
    remark?: string
    tagType?: string
  }
}
