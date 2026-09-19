import { request } from '../http'

interface Ilogin {
  username: string
  password: string
  /** 验证码 key（从 /captcha 接口获取） */
  captchaKey?: string
  /** 用户输入的验证码 */
  captchaCode?: string
}

/** 图形验证码响应 */
export interface CaptchaResult {
  /** 验证码 key（登录时回传） */
  key: string
  /** 验证码 base64 图片（data:image/png;base64,xxx） */
  img: string
}

/** 登录 */
export function fetchLogin(data: Ilogin) {
  const methodInstance = request.Post<Service.ResponseResult<Api.Login.Info>>('/v1/auth/login', data)
  methodInstance.meta = {
    authRole: null,
  }
  return methodInstance
}

/** 退出登录 */
export function fetchLogout() {
  return request.Get('/v1/auth/logout')
}

/** 检查是否登录中 */
export function fetchCheckLogin() {
  return request.Get('/v1/auth/check/login')
}

/** 刷新token */
export function fetchUpdateToken(data: any) {
  const method = request.Post<Service.ResponseResult<Api.Login.Info>>('/updateToken', data)
  method.meta = {
    authRole: 'refreshToken',
  }
  return method
}

/** 获取图形验证码 */
export function fetchCaptcha() {
  return request.Get<Service.ResponseResult<CaptchaResult>>('/v1/auth/captcha')
}
