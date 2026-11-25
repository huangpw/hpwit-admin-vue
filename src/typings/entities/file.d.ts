/// <reference path="../global.d.ts"/>

/* 导入字段 */
namespace Entity {

  interface ExcelImport {
    file?: File | null
    fileName?: string | null
    templateCode?: string
    delAll?: boolean
    operationType?: string[] | []
  }

  interface FileInfo {
    name: string
    url: string
  }

  interface UploadFile {
    file?: File | null
    fileName?: string | null
  }
}
