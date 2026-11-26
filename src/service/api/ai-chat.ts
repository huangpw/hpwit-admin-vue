import { local } from '@/utils'
import { request } from '../http'

export interface AiChatSession {
  id: string
  title: string
  preview: string | null
  createdAt: string
  updatedAt: string
}

export interface AiChatMessage {
  id: number
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export function listAiChatSessions() {
  return request.Get<Service.ResponseResult<AiChatSession[]>>('/v1/agnet/chat/sessions')
}

export function createAiChatSession() {
  return request.Post<Service.ResponseResult<AiChatSession>>('/v1/agnet/chat/sessions')
}

export function listAiChatMessages(sessionId: string) {
  return request.Get<Service.ResponseResult<AiChatMessage[]>>(`/v1/agnet/chat/sessions/${encodeURIComponent(sessionId)}/messages`)
}

export function renameAiChatSession(sessionId: string, title: string) {
  return request.Patch<Service.ResponseResult<AiChatSession>>(
    `/v1/agnet/chat/sessions/${encodeURIComponent(sessionId)}`,
    { title },
  )
}

export function deleteAiChatSession(sessionId: string) {
  return request.Delete<Service.ResponseResult<null>>(`/v1/agnet/chat/sessions/${encodeURIComponent(sessionId)}`)
}

export class AiChatStreamError extends Error {
}

interface StreamHandlers {
  onChunk: (content: string) => void
  onDone: () => void
}

export async function streamAiChatMessage(
  sessionId: string,
  content: string,
  signal: AbortSignal,
  handlers: StreamHandlers,
) {
  const token = local.get('accessToken')
  const response = await fetch(
    `${__URL_MAP__.url.path}/v1/agnet/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
      signal,
    },
  )

  if (!response.ok) {
    const result = await response.json().catch(() => undefined) as { message?: string } | undefined
    throw new AiChatStreamError(result?.message || `请求失败 (${response.status})`)
  }
  if (!response.body)
    throw new AiChatStreamError('浏览器不支持流式响应')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let pending = ''

  function consumeFrame(frame: string) {
    let event = 'message'
    const data: string[] = []
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith('event:'))
        event = line.slice(6).trim()
      else if (line.startsWith('data:'))
        data.push(line.slice(5).trimStart())
    }
    if (!data.length)
      return
    const payload = JSON.parse(data.join('\n')) as { content?: string, message?: string }
    if (event === 'chunk' && payload.content) {
      handlers.onChunk(payload.content)
    }
    else if (event === 'error') {
      throw new AiChatStreamError(payload.message || 'AI 回复失败，请稍后重试')
    }
    else if (event === 'done') {
      handlers.onDone()
      return true
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      pending += decoder.decode(value, { stream: !done })
      const frames = pending.split(/\r?\n\r?\n/)
      pending = frames.pop() ?? ''
      for (const frame of frames) {
        if (consumeFrame(frame))
          return
      }
      if (done)
        break
    }
    if (pending.trim() && consumeFrame(pending))
      return
  }
  finally {
    // 完成事件后停止读取，连接关闭阶段的异常不会覆盖已完成的回复。
    void reader.cancel().catch(() => {})
    reader.releaseLock()
  }

  if (!signal.aborted)
    throw new AiChatStreamError('AI 连接意外结束，请重试')
}
