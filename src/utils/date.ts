export function formatDateTime(
  timestamp: number | string | null | undefined
): string {
  // 1. 严格空值校验：null/undefined/空字符串直接返回空
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return ''
  }

  // 2. 转换为数字并校验：非数字直接返回空
  let time = Number(timestamp)
  if (isNaN(time)) {
    return ''
  }

  // 3. 秒级时间戳自动转毫秒（1e12 是毫秒/秒级的合理分界：1e12毫秒≈31709年，1e12秒≈31709876年）
  if (time < 1e12) {
    time = time * 1000
  }

  // 4. 核心校验：创建Date并判断是否有效，无效则返回空
  const date = new Date(time)
  if (date.toString() === 'Invalid Date') {
    return ''
  }

  // 补零工具函数
  const pad = (n: number) => (n < 10 ? `0${n}` : n)

  // 简化模板字符串拼接（直接换行，无需+号）
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}


export function getNow() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
