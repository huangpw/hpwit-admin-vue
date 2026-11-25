export function cleanParams<T extends Record<string, any>>(params: T): Partial<T> {
  const result: Partial<T> = {}

  Object.keys(params).forEach((name) => {
    const key = name as keyof T
    const value = params[key]
    if (value !== null && value !== undefined && value !== '') {
      result[key] = value
    }
  })

  return result
}

type QueryParams = Record<string, any> | Array<Record<string, any>>

export function buildQueryString(params?: QueryParams): string {
  if (!params)
    return ''

  const list = Array.isArray(params) ? params : [params]

  const query = list
    .flatMap(obj =>
      Object.entries(obj)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`),
    )
    .join('&')

  return query ? `?${query}` : ''
}

/**
 * 参数 params 转化成 query
 * @param params
 * @returns 合并后的查询参数对象
 */
export function buildQueryObject(params?: any): any {
  if (!params)
    return ''
  const list = Array.isArray(params) ? params : [params]

  // 将数组[]转成对象{}
  const query = Object.assign({}, ...list)

  return query
}
