import { request } from '../http';

// 用户列表导入
export function fetchUploadFile(formData: FormData) {
  return request.Post('/v1/files', formData, {
    headers: {}
  })
}
