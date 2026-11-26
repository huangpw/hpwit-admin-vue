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

export function recognizeProductImages(files: readonly File[]) {
  const formData = new FormData()
  for (const file of files)
    formData.append('files', file)

  return request.Post<Service.ResponseResult<ProductRecognitionDraft>>(
    '/v1/agnet/product/recognize-multiple',
    formData,
    { timeout: 90_000, shareRequest: false },
  )
}
