/**
 * 中性灰阶配色 —— 用于 n-tag 之类的自定义色彩场景。
 * NTag.color 期望的是 TagColor 对象 { color, textColor, borderColor },不接受 string。
 */
export function getTertiaryColor(): { color: string; textColor: string; borderColor: string } {
  return {
    color: '#14B8A6',
    textColor: '#fff',
    borderColor: '#14B8A6',
  }
}
