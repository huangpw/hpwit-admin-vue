export const orderNo = 'SO-DEMO-001'
export const orderPage = 'DEMO_ORDER'

const currency = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function lineAmount(quantity: number | null, price: number | null) {
  return (quantity ?? 0) * Math.round((price ?? 0) * 100)
}

export function formatAmount(cents: number) {
  return currency.format(cents / 100)
}
