import { request } from '../http';

export function fetchSendEmail(data: any) {
  return request.Post<Service.ResponseResult<any>>('/mail/send', data)
}
