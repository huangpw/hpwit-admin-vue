import { request } from '../http'

export interface TableRecognitionDraft {
  tableType: 'FLAT' | 'TREE'
  columns: string[]
  rows: { cells: (string | null)[], parentRow: number | null }[]
}

export function recognizeTableImage(file: File) {
  const body = new FormData()
  body.append('file', file)
  return request.Post<Service.ResponseResult<TableRecognitionDraft>>(
    '/v1/agnet/table/recognize',
    body,
    { timeout: 85_000, shareRequest: false },
  )
}
