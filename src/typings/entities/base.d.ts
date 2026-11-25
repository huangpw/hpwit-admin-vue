/// <reference path="../global.d.ts"/>

namespace Entity {
  /** Legacy base-resource payloads. Additional fields depend on the template. */
  interface BaseInformationTempl {
    id?: string | number
    [field: string]: unknown
  }

  interface BaseTimeinterval {
    id?: string | number
    [field: string]: unknown
  }
}
