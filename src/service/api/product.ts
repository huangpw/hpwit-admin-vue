import { request } from '../http'

export interface ProductRecognitionDraft {
  productName: string | null
  model: string | null
  description: string | null
  categorySuggestion: string | null
  tags: string[]
  accessories: string[]
  serialNumber: string | null
}

export function recognizeProductImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return request.Post<Service.ResponseResult<ProductRecognitionDraft>>(
    '/v1/agnet/product/recognize',
    formData,
    { timeout: 70_000, shareRequest: false },
  )
}
