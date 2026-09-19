import { request } from '../http';

// ***** 资讯模板 Start *****
/**
 * 获取所有资讯模板分页列表
 */
export function fetchBaseInformationTemplPage(params: any) {
  return request.Get<Service.ResponseResult<Entity.BaseInformationTempl[]>>('/v1/base/information/templ/page', { params })
}

/**
 * 获取所有资讯模板列表
 */
export function fetchBaseInformationTemplList(params: any) {
  return request.Get<Service.ResponseResult<Entity.BaseInformationTempl[]>>('/v1/base/information/templ/list', { params })
}

/**
 * 根据 Id 查询资讯模板信息
 */
export function fetchBaseInformationTemplById(id: string) {
  return request.Get<Service.ResponseResult<Entity.BaseInformationTempl>>(`/v1/base/information/templ/${id}/form`)
}

/**
 * 添加资讯模板信息
 */
export function fetchBaseInformationTemplAdd(data: Entity.BaseInformationTempl) {
  return request.Post<Service.ResponseResult<Entity.BaseInformationTempl>>('/v1/base/information/templ', data)
}

/**
 * 修改资讯模板信息
 */
export function fetchBaseInformationTemplUpdate(data: Entity.BaseInformationTempl) {
  return request.Put<Service.ResponseResult<Entity.BaseInformationTempl>>(`/v1/base/information/templ/${data.id}`, data)
}

/**
 * 根据 Id 删除资讯模板信息
 */
export function fetchBaseInformationTemplDelete(id: string) {
  return request.Delete<Service.ResponseResult<Entity.BaseInformationTempl>>(`/v1/base/information/templ/${id}`)
}

/**
 * 根据 Ids 批量删除资讯模板信息
 */
// export function fetchBaseInformationTemplDeleteByIds(ids: string[]) {
//   return request.Delete<Service.ResponseResult<Entity.BaseInformationTempl>>(`/v1/base/information/templ/batch`, { ids })
// }
// ***** 资讯模板 End *****



// ***** 时间区间 Start *****
/**
 * 获取所有时间区间分页列表
 */
export function fetchBaseTimeintervalPage(params: any) {
  return request.Get<Service.ResponseResult<Entity.BaseTimeinterval[]>>('/v1/base/timeinterval/page', { params })
}

/**
 * 根据 Id 查询时间区间信息
 */
export function fetchBaseTimeintervalById(id: string) {
  return request.Get<Service.ResponseResult<Entity.BaseTimeinterval>>(`/v1/base/timeinterval/${id}/form`)
}

/**
 * 添加时间区间信息
 */
export function fetchBaseTimeintervalAdd(data: Entity.BaseTimeinterval) {
  return request.Post<Service.ResponseResult<Entity.BaseTimeinterval>>('/v1/base/timeinterval', data)
}

/**
 * 修改时间区间信息
 */
export function fetchBaseTimeintervalUpdate(data: Entity.BaseTimeinterval) {
  return request.Put<Service.ResponseResult<Entity.BaseTimeinterval>>(`/v1/base/timeinterval/${data.id}`, data)
}

/**
 * 根据 Id 删除时间区间信息
 */
export function fetchBaseTimeintervalDelete(id: string) {
  return request.Delete<Service.ResponseResult<Entity.BaseTimeinterval>>(`/v1/base/timeinterval/${id}`)
}

/**
 * 根据 Ids 批量删除时间区间信息
 */
// export function fetchBaseTimeintervalDeleteByIds(ids: string[]) {
//   return request.Delete<Service.ResponseResult<Entity.BaseTimeinterval>>(`/v1/base/timeinterval/batch`, { ids })
// }
// ***** 时间区间 End *****
