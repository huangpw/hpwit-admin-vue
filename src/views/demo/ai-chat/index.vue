<script setup lang="ts">
import type { AiChatMessage, AiChatSession } from '@/service/api/ai-chat'
import type { NScrollbar } from 'naive-ui'
import {
  AiChatStreamError,
  createAiChatSession,
  deleteAiChatSession,
  listAiChatMessages,
  listAiChatSessions,
  renameAiChatSession,
  streamAiChatMessage,
} from '@/service/api/ai-chat'
import { NButton, NDropdown, NInput, NTag, useDialog, useMessage, useThemeVars } from 'naive-ui'
import NovaIcon from '@/components/common/NovaIcon.vue'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'

type RenderedMessage = Omit<AiChatMessage, 'id'> & {
  id: number | string
  temporary?: boolean
}

const theme = useThemeVars()
const dialog = useDialog()
const message = useMessage()
const sessions = ref<AiChatSession[]>([])
const messages = ref<RenderedMessage[]>([])
const activeSessionId = ref<string>()
const search = ref('')
const input = ref('')
const loadingSessions = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)
const mobileSidebarVisible = ref(false)
const streamError = ref('')
const renameVisible = ref(false)
const renameValue = ref('')
const renamingSession = ref<AiChatSession>()
const chatScroller = ref<InstanceType<typeof NScrollbar>>()
const inputRef = ref<InstanceType<typeof NInput>>()
let abortController: AbortController | undefined

const visibleSessions = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  if (!keyword)
    return sessions.value
  return sessions.value.filter(session => `${session.title} ${session.preview ?? ''}`.toLocaleLowerCase().includes(keyword))
})
const activeSession = computed(() => sessions.value.find(session => session.id === activeSessionId.value))
const hasMessages = computed(() => messages.value.some(item => !item.temporary || item.content))
const suggestions = [
  { icon: 'icon-park-outline:doc-detail', title: '整理一份方案', prompt: '帮我整理一份清晰、可执行的项目方案。' },
  { icon: 'icon-park-outline:code', title: '解释代码', prompt: '请解释下面这段代码的用途和关键逻辑：' },
  { icon: 'icon-park-outline:light', title: '头脑风暴', prompt: '围绕一个企业管理后台，给我一些提升工作效率的功能创意。' },
  { icon: 'icon-park-outline:translate', title: '润色文字', prompt: '请帮我润色下面这段文字，使表达更清楚、自然：' },
]
const sessionMenu = [
  { label: '重命名', key: 'rename', icon: () => h(NovaIcon, { icon: 'icon-park-outline:edit' }) },
  { label: '删除会话', key: 'delete', props: { class: 'danger-option' }, icon: () => h(NovaIcon, { icon: 'icon-park-outline:delete' }) },
]

async function loadSessions(preferredId?: string) {
  loadingSessions.value = true
  try {
    const result = await listAiChatSessions()
    if (!result.isSuccess)
      throw new Error(result.message)
    sessions.value = result.data
    const nextId = preferredId && result.data.some(item => item.id === preferredId)
      ? preferredId
      : activeSessionId.value && result.data.some(item => item.id === activeSessionId.value)
        ? activeSessionId.value
        : result.data[0]?.id
    if (nextId) {
      await selectSession(nextId)
    }
    else {
      activeSessionId.value = undefined
      messages.value = []
    }
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '无法加载会话列表')
  }
  finally {
    loadingSessions.value = false
  }
}

async function selectSession(id: string) {
  if (sending.value || id === activeSessionId.value)
    return
  activeSessionId.value = id
  mobileSidebarVisible.value = false
  messages.value = []
  loadingMessages.value = true
  try {
    const result = await listAiChatMessages(id)
    if (activeSessionId.value === id && result.isSuccess)
      messages.value = result.data
    await scrollToBottom('auto')
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '无法读取会话消息')
  }
  finally {
    loadingMessages.value = false
  }
}

async function newSession() {
  if (sending.value)
    return
  try {
    const result = await createAiChatSession()
    if (!result.isSuccess)
      throw new Error(result.message)
    sessions.value = [result.data, ...sessions.value]
    activeSessionId.value = result.data.id
    messages.value = []
    mobileSidebarVisible.value = false
    streamError.value = ''
    await nextTick()
    inputRef.value?.focus()
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '无法创建会话')
  }
}

function showRename(session: AiChatSession) {
  renamingSession.value = session
  renameValue.value = session.title
  renameVisible.value = true
}

async function confirmRename() {
  const session = renamingSession.value
  const title = renameValue.value.trim()
  if (!session || !title)
    return
  try {
    const result = await renameAiChatSession(session.id, title)
    if (!result.isSuccess)
      throw new Error(result.message)
    sessions.value = sessions.value.map(item => item.id === session.id ? result.data : item)
    renameVisible.value = false
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '重命名失败')
  }
}

async function copyMessage(content: string) {
  try {
    await navigator.clipboard.writeText(content)
    message.success('已复制')
  }
  catch {
    message.error('复制失败，请检查浏览器剪贴板权限')
  }
}

function confirmDelete(session: AiChatSession) {
  if (sending.value)
    return
  dialog.warning({
    title: '删除会话',
    content: `确定删除「${session.title}」及其中的全部消息吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await deleteAiChatSession(session.id)
        if (!result.isSuccess)
          throw new Error(result.message)
        sessions.value = sessions.value.filter(item => item.id !== session.id)
        if (activeSessionId.value === session.id) {
          activeSessionId.value = undefined
          messages.value = []
          const next = sessions.value[0]
          if (next)
            await selectSession(next.id)
        }
      }
      catch (error) {
        message.error(error instanceof Error ? error.message : '删除会话失败')
      }
    },
  })
}

function handleSessionAction(key: string | number, session: AiChatSession) {
  if (key === 'rename')
    showRename(session)
  if (key === 'delete')
    confirmDelete(session)
}

async function sendMessage(text = input.value) {
  const content = text.trim()
  if (!content || sending.value)
    return
  streamError.value = ''
  input.value = ''

  try {
    if (!activeSessionId.value) {
      const created = await createAiChatSession()
      if (!created.isSuccess)
        throw new Error(created.message)
      sessions.value = [created.data, ...sessions.value]
      activeSessionId.value = created.data.id
    }

    const sessionId = activeSessionId.value
    if (!sessionId)
      return
    const now = new Date().toISOString()
    const userMessage: RenderedMessage = {
      id: `user-${Date.now()}`,
      sessionId,
      role: 'user',
      content,
      createdAt: now,
      temporary: true,
    }
    const assistantMessage: RenderedMessage = {
      id: `assistant-${Date.now()}`,
      sessionId,
      role: 'assistant',
      content: '',
      createdAt: now,
      temporary: true,
    }
    messages.value.push(userMessage, assistantMessage)
    sending.value = true
    abortController = new AbortController()
    await scrollToBottom()
    await streamAiChatMessage(sessionId, content, abortController.signal, {
      onChunk: (chunk) => {
        assistantMessage.content += chunk
        void scrollToBottom()
      },
      onDone: () => {
        assistantMessage.temporary = false
      },
    })
    await loadSessionMessages(sessionId)
    await loadSessions(sessionId)
    await scrollToBottom()
  }
  catch (error) {
    if (abortController?.signal.aborted) {
      messages.value = messages.value.filter(item => !item.temporary || item.role === 'user')
      if (activeSessionId.value) {
        await loadSessionMessages(activeSessionId.value)
        await loadSessions(activeSessionId.value)
      }
    }
    else {
      streamError.value = error instanceof AiChatStreamError
        ? error.message
        : error instanceof Error ? error.message : '发送失败，请重试'
      messages.value = messages.value.filter(item => !item.temporary || item.role === 'user')
      message.error(streamError.value)
      if (activeSessionId.value)
        await loadSessionMessages(activeSessionId.value)
      if (activeSessionId.value)
        await loadSessions(activeSessionId.value)
    }
    input.value = content
  }
  finally {
    sending.value = false
    abortController = undefined
    await scrollToBottom()
  }
}

async function loadSessionMessages(id: string) {
  const result = await listAiChatMessages(id)
  if (result.isSuccess && activeSessionId.value === id)
    messages.value = result.data
}

function stopGeneration() {
  abortController?.abort()
}

async function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
  await nextTick()
  chatScroller.value?.scrollTo({ top: 1e9, behavior })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void sendMessage()
  }
}

function formatSessionDate(value: string) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString())
    return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  if (date.toDateString() === yesterday.toDateString())
    return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

onMounted(() => void loadSessions())
onBeforeUnmount(() => abortController?.abort())
</script>

<template>
  <n-el class="ai-chat" :style="{ '--chat-accent': theme.primaryColor, '--chat-border': theme.borderColor, '--chat-text': theme.textColorBase, '--chat-muted': theme.textColor3, '--chat-surface': theme.cardColor, '--chat-page': theme.bodyColor }">
    <aside class="session-sidebar" :class="{ 'mobile-open': mobileSidebarVisible }">
      <div class="sidebar-heading">
        <div class="brand-mark">
          <icon-park-outline:robot-one />
        </div>
        <div class="brand-copy">
          <strong>AI 聊天助手</strong>
          <span>与你一起探索思路</span>
        </div>
      </div>

      <NButton type="primary" block class="new-chat-button" :disabled="sending" @click="newSession">
        <template #icon>
          <icon-park-outline:add-one />
        </template>
        新建会话
      </NButton>

      <NInput v-model:value="search" clearable size="small" placeholder="搜索会话" class="session-search">
        <template #prefix>
          <icon-park-outline:search />
        </template>
      </NInput>

      <div class="session-list-heading">
        <span>最近会话</span>
        <n-spin v-if="loadingSessions" size="small" />
        <span v-else class="session-count">{{ visibleSessions.length }}</span>
      </div>

      <n-scrollbar class="session-scroll">
        <div v-if="!visibleSessions.length && !loadingSessions" class="empty-sessions">
          <icon-park-outline:message-one />
          <span>{{ search ? '没有匹配的会话' : '还没有会话，开始一段对话吧' }}</span>
        </div>
        <div v-for="session in visibleSessions" :key="session.id" class="session-row" :class="{ active: session.id === activeSessionId }">
          <button class="session-select" :disabled="sending" @click="selectSession(session.id)">
            <span class="session-title">{{ session.title }}</span>
            <span class="session-preview">{{ session.preview || '新会话' }}</span>
          </button>
          <NDropdown :options="sessionMenu" trigger="click" placement="bottom-end" @select="key => handleSessionAction(key, session)">
            <NButton quaternary circle size="tiny" class="session-more" aria-label="会话操作" @click.stop>
              <template #icon>
                <icon-park-outline:more />
              </template>
            </NButton>
          </NDropdown>
          <span class="session-time">{{ formatSessionDate(session.updatedAt) }}</span>
        </div>
      </n-scrollbar>

      <div class="sidebar-footer">
        <div class="privacy-dot" />
        <span>对话仅当前账号可见</span>
      </div>
    </aside>
    <button v-if="mobileSidebarVisible" class="sidebar-backdrop" aria-label="关闭会话列表" @click="mobileSidebarVisible = false" />

    <main class="chat-main">
      <header class="chat-header">
        <div class="current-session">
          <NButton quaternary circle size="small" class="mobile-menu-button" aria-label="打开会话列表" @click="mobileSidebarVisible = true">
            <template #icon>
              <icon-park-outline:hamburger-button />
            </template>
          </NButton>
          <span class="current-session-title">{{ activeSession?.title || '新的对话' }}</span>
          <NTag size="small" round :bordered="false" class="model-tag">
            DeepSeek
          </NTag>
        </div>
        <div class="header-status">
          <span class="status-indicator" />
          <span>AI 助手已就绪</span>
        </div>
      </header>

      <n-scrollbar ref="chatScroller" class="conversation-scroll">
        <div v-if="loadingMessages" class="conversation-loading">
          <n-spin size="medium" />
        </div>
        <div v-else-if="!hasMessages" class="welcome-state">
          <div class="welcome-orb">
            <icon-park-outline:robot-one />
          </div>
          <NTag size="small" round :bordered="false" class="welcome-tag">
            AI 助手
          </NTag>
          <h1>你好，有什么可以帮你？</h1>
          <p>提问、整理思路、编写内容，或一起解决工作中的问题。</p>
          <div class="suggestion-grid">
            <button v-for="item in suggestions" :key="item.title" class="suggestion-card" :disabled="sending" @click="sendMessage(item.prompt)">
              <span class="suggestion-icon"><NovaIcon :icon="item.icon" /></span>
              <strong>{{ item.title }}</strong>
              <span>{{ item.prompt }}</span>
              <icon-park-outline:arrow-up class="suggestion-arrow" />
            </button>
          </div>
        </div>

        <div v-else class="message-list">
          <article v-for="item in messages" :key="item.id" class="message-row" :class="item.role">
            <div v-if="item.role === 'assistant'" class="assistant-avatar">
              <icon-park-outline:robot-one />
            </div>
            <div class="message-content-wrap">
              <div class="message-meta">
                <strong>{{ item.role === 'assistant' ? 'AI 助手' : '我' }}</strong>
                <span>{{ new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span>
                <span v-if="item.temporary && sending && item.role === 'assistant'" class="streaming-indicator">正在生成</span>
              </div>
              <div class="message-bubble" :class="item.role">
                <MarkdownRenderer
                  v-if="item.role === 'assistant' && item.content"
                  :markdown="item.content" :enable-gfm="true" :enable-latex="true" :enable-shiki="true"
                  :enable-mermaid="false" :enable-animate="true" :sanitize="true" class="markdown-content"
                />
                <span v-else-if="item.content" class="plain-content">{{ item.content }}</span>
                <span v-else class="typing-dots"><i /><i /><i /></span>
              </div>
              <div v-if="item.role === 'assistant' && item.content" class="message-actions">
                <NButton quaternary size="tiny" @click="copyMessage(item.content)">
                  <template #icon>
                    <icon-park-outline:copy />
                  </template>
                  复制
                </NButton>
              </div>
            </div>
            <div v-if="item.role === 'user'" class="user-avatar">
              <icon-park-outline:people />
            </div>
          </article>
          <div v-if="streamError" class="stream-error">
            <icon-park-outline:caution />{{ streamError }}
          </div>
        </div>
      </n-scrollbar>

      <footer class="composer-area">
        <div class="composer-card" :class="{ focused: input.trim() }">
          <NInput
            ref="inputRef" v-model:value="input" type="textarea" :autosize="{ minRows: 1, maxRows: 6 }"
            :maxlength="8000" placeholder="给 AI 助手发送消息…" :disabled="sending" class="composer-input"
            @keydown="handleKeydown"
          />
          <div class="composer-toolbar">
            <span class="composer-hint"><kbd>Enter</kbd> 发送 <span>·</span> <kbd>Shift</kbd> + <kbd>Enter</kbd> 换行</span>
            <div class="composer-actions">
              <span class="character-count" :class="{ near: input.length > 7200 }">{{ input.length }}/8000</span>
              <NButton v-if="sending" type="error" secondary circle aria-label="停止生成" @click="stopGeneration">
                <template #icon>
                  <icon-park-outline:pause-one />
                </template>
              </NButton>
              <NButton v-else type="primary" circle :disabled="!input.trim()" aria-label="发送消息" @click="sendMessage()">
                <template #icon>
                  <icon-park-outline:up />
                </template>
              </NButton>
            </div>
          </div>
        </div>
        <p class="disclaimer">
          AI 生成的内容可能不准确，请结合实际情况判断。
        </p>
      </footer>
    </main>

    <n-modal v-model:show="renameVisible" preset="dialog" title="重命名会话" positive-text="保存" negative-text="取消" @positive-click="confirmRename">
      <NInput v-model:value="renameValue" maxlength="80" show-count placeholder="输入会话名称" @keydown.enter="confirmRename" />
    </n-modal>
  </n-el>
</template>

<style scoped>
.ai-chat {
  --chat-radius: 14px;
  display: flex;
  min-height: min(760px, calc(100dvh - 170px));
  height: calc(100dvh - 170px);
  overflow: hidden;
  border: 1px solid var(--chat-border);
  border-radius: 18px;
  background: var(--chat-page);
  color: var(--chat-text);
  box-shadow: 0 12px 42px rgb(15 23 42 / 4%);
}

.session-sidebar {
  display: flex;
  flex: 0 0 282px;
  flex-direction: column;
  gap: 14px;
  padding: 20px 14px 12px;
  border-right: 1px solid var(--chat-border);
  background: var(--chat-surface);
}

.sidebar-heading { display: flex; align-items: center; gap: 11px; padding: 0 5px 4px; }
.brand-mark, .welcome-orb { display: grid; place-items: center; color: white; background: linear-gradient(140deg, #6c82ff, #8263db); }
.brand-mark { width: 40px; height: 40px; border-radius: 13px; font-size: 21px; box-shadow: 0 6px 16px rgb(108 130 255 / 25%); }
.brand-copy { display: grid; gap: 3px; }
.brand-copy strong { font-size: 14px; font-weight: 650; }
.brand-copy span, .sidebar-footer, .session-time { color: var(--chat-muted); font-size: 11px; }
.new-chat-button { height: 38px; border-radius: 10px; font-weight: 600; }
.session-search { margin-top: 1px; }
.session-search :deep(.n-input) { border-radius: 9px; }
.session-list-heading { display: flex; align-items: center; justify-content: space-between; padding: 4px 5px 0; font-size: 11px; font-weight: 650; color: var(--chat-muted); letter-spacing: .04em; }
.session-count { min-width: 20px; text-align: center; }
.session-scroll { min-height: 0; flex: 1; margin: -4px -5px 0; }
.session-row { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 24px; align-items: center; margin: 3px 4px; padding: 9px 8px 12px 10px; border: 1px solid transparent; border-radius: 10px; transition: background .15s, border-color .15s; }
.session-row:hover, .session-row.active { background: color-mix(in srgb, var(--chat-accent) 7%, var(--chat-surface)); }
.session-row.active { border-color: color-mix(in srgb, var(--chat-accent) 19%, transparent); }
.session-select { display: grid; gap: 4px; min-width: 0; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.session-select:disabled { cursor: default; }
.session-title, .session-preview { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-title { font-size: 12px; font-weight: 600; }
.session-preview { color: var(--chat-muted); font-size: 11px; }
.session-more { opacity: 0; color: var(--chat-muted); }
.session-row:hover .session-more, .session-row.active .session-more { opacity: 1; }
.session-time { position: absolute; right: 10px; bottom: 5px; font-size: 9px; }
.empty-sessions { display: grid; justify-items: center; gap: 9px; padding: 36px 16px; color: var(--chat-muted); text-align: center; font-size: 12px; }
.empty-sessions :deep(svg) { width: 25px; height: 25px; opacity: .6; }
.sidebar-footer { display: flex; align-items: center; gap: 7px; padding: 11px 6px 2px; border-top: 1px solid var(--chat-border); }
.privacy-dot, .status-indicator { width: 7px; height: 7px; border-radius: 50%; background: #38b781; }
.chat-main { display: flex; flex: 1; flex-direction: column; min-width: 0; background: var(--chat-page); }
.chat-header { display: flex; flex: 0 0 58px; align-items: center; justify-content: space-between; gap: 12px; padding: 0 25px; border-bottom: 1px solid var(--chat-border); background: var(--chat-surface); }
.current-session, .header-status { display: flex; align-items: center; gap: 10px; }
.mobile-menu-button { display: none; }
.current-session-title { overflow: hidden; max-width: min(55vw, 520px); font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.model-tag, .welcome-tag { background: color-mix(in srgb, var(--chat-accent) 10%, transparent); color: var(--chat-accent); font-size: 10px; }
.header-status { color: var(--chat-muted); font-size: 11px; }
.status-indicator { width: 6px; height: 6px; box-shadow: 0 0 0 3px rgb(56 183 129 / 12%); }
.conversation-scroll { flex: 1; min-height: 0; }
.conversation-loading { display: grid; height: 100%; min-height: 260px; place-items: center; }
.welcome-state { display: flex; min-height: 100%; flex-direction: column; align-items: center; justify-content: center; padding: 36px 30px 22px; text-align: center; }
.welcome-orb { width: 62px; height: 62px; margin-bottom: 18px; border-radius: 22px; font-size: 31px; box-shadow: 0 10px 30px rgb(108 130 255 / 28%); }
.welcome-state h1 { margin: 14px 0 8px; font-size: clamp(22px, 3vw, 30px); font-weight: 680; letter-spacing: -.035em; }
.welcome-state > p { margin: 0 0 25px; color: var(--chat-muted); font-size: 13px; }
.suggestion-grid { display: grid; width: min(100%, 690px); grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; text-align: left; }
.suggestion-card { position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr); align-items: center; gap: 3px 9px; min-height: 76px; padding: 12px 14px; border: 1px solid var(--chat-border); border-radius: 12px; background: var(--chat-surface); color: var(--chat-text); cursor: pointer; text-align: left; transition: border-color .15s, transform .15s, box-shadow .15s; }
.suggestion-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--chat-accent) 40%, var(--chat-border)); box-shadow: 0 8px 18px rgb(15 23 42 / 5%); }
.suggestion-icon { grid-row: span 2; display: grid; width: 27px; height: 27px; place-items: center; border-radius: 8px; background: color-mix(in srgb, var(--chat-accent) 10%, transparent); color: var(--chat-accent); font-size: 15px; }
.suggestion-card strong { font-size: 12px; font-weight: 650; }
.suggestion-card > span:nth-of-type(2) { overflow: hidden; padding-right: 12px; color: var(--chat-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.suggestion-arrow { position: absolute; top: 13px; right: 12px; color: var(--chat-muted); font-size: 12px; }
.message-list { width: min(100%, 900px); margin: 0 auto; padding: 26px 34px 40px; }
.message-row { display: flex; align-items: flex-start; gap: 11px; margin: 0 0 25px; }
.message-row.user { justify-content: flex-end; }
.assistant-avatar, .user-avatar { display: grid; flex: 0 0 29px; width: 29px; height: 29px; place-items: center; border-radius: 10px; font-size: 15px; }
.assistant-avatar { background: linear-gradient(140deg, #7187ff, #8867dd); color: white; }
.user-avatar { background: color-mix(in srgb, var(--chat-accent) 10%, var(--chat-surface)); color: var(--chat-accent); }
.message-content-wrap { min-width: 0; max-width: min(82%, 720px); }
.message-row.user .message-content-wrap { display: grid; justify-items: end; }
.message-meta { display: flex; align-items: center; gap: 8px; margin: 1px 2px 7px; color: var(--chat-muted); font-size: 10px; }
.message-meta strong { color: var(--chat-text); font-size: 11px; font-weight: 650; }
.streaming-indicator { color: var(--chat-accent); }
.message-bubble { max-width: 100%; padding: 12px 15px; border: 1px solid var(--chat-border); border-radius: 4px 14px 14px; background: var(--chat-surface); line-height: 1.7; overflow-wrap: anywhere; }
.message-bubble.user { border: 0; border-radius: 14px 4px 14px 14px; background: color-mix(in srgb, var(--chat-accent) 10%, var(--chat-surface)); }
.plain-content { display: block; white-space: pre-wrap; font-size: 13px; }
.markdown-content { display: block; min-width: 0; font-size: 13px; line-height: 1.75; }
.markdown-content :deep(p:first-child) { margin-top: 0; }
.markdown-content :deep(p:last-child) { margin-bottom: 0; }
.markdown-content :deep(pre) { max-width: 100%; overflow: auto; border-radius: 9px; }
.markdown-content :deep(table) { display: block; max-width: 100%; overflow: auto; border-collapse: collapse; }
.markdown-content :deep(img) { max-width: 100%; }
.message-actions { display: flex; gap: 4px; margin-top: 4px; opacity: .7; }
.typing-dots { display: flex; align-items: center; gap: 4px; height: 20px; }
.typing-dots i { width: 5px; height: 5px; border-radius: 50%; background: var(--chat-accent); animation: bounce 1.2s infinite ease-in-out; }
.typing-dots i:nth-child(2) { animation-delay: .15s; }
.typing-dots i:nth-child(3) { animation-delay: .3s; }
@keyframes bounce { 0%, 60%, 100% { opacity: .45; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-4px); } }
.stream-error { display: flex; align-items: center; gap: 8px; margin: 0 44px; padding: 10px 12px; border-radius: 9px; background: color-mix(in srgb, #e34c4c 9%, var(--chat-surface)); color: #c94545; font-size: 11px; }
.composer-area { width: min(100%, 900px); margin: 0 auto; padding: 10px 34px 14px; }
.composer-card { padding: 11px 12px 9px; border: 1px solid var(--chat-border); border-radius: 15px; background: var(--chat-surface); box-shadow: 0 5px 18px rgb(15 23 42 / 4%); transition: border-color .2s, box-shadow .2s; }
.composer-card:focus-within, .composer-card.focused { border-color: color-mix(in srgb, var(--chat-accent) 52%, var(--chat-border)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--chat-accent) 8%, transparent); }
.composer-input :deep(.n-input__textarea-el) { padding: 2px 3px; font-size: 13px; line-height: 1.65; }
.composer-input :deep(.n-input__border), .composer-input :deep(.n-input__state-border) { display: none; }
.composer-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 2px 0; }
.composer-hint, .character-count { color: var(--chat-muted); font-size: 10px; }
.composer-hint { display: flex; align-items: center; gap: 5px; }
.composer-hint kbd { padding: 2px 5px; border: 1px solid var(--chat-border); border-radius: 4px; background: var(--chat-page); font: inherit; }
.composer-actions { display: flex; align-items: center; gap: 10px; }
.character-count.near { color: #d28c27; }
.disclaimer { margin: 8px 0 0; color: var(--chat-muted); text-align: center; font-size: 9px; }

@media (max-width: 800px) {
  .ai-chat { height: calc(100dvh - 130px); min-height: 520px; border-radius: 12px; }
  .session-sidebar { flex-basis: 220px; padding: 14px 10px 10px; }
  .chat-header { padding: 0 15px; }
  .message-list, .composer-area { padding-right: 16px; padding-left: 16px; }
  .suggestion-grid { grid-template-columns: 1fr; }
  .welcome-state { justify-content: flex-start; padding-top: 50px; }
}

@media (max-width: 620px) {
  .ai-chat { position: relative; min-height: 560px; height: calc(100dvh - 105px); }
  .session-sidebar { position: absolute; z-index: 10; inset: 0 auto 0 0; width: min(282px, 82vw); height: 100%; flex-basis: auto; box-shadow: 10px 0 32px rgb(15 23 42 / 14%); transform: translateX(-110%); transition: transform .2s ease; }
  .session-sidebar.mobile-open { transform: translateX(0); }
  .sidebar-backdrop { position: absolute; z-index: 9; inset: 0; width: 100%; height: 100%; border: 0; background: rgb(15 23 42 / 25%); }
  .mobile-menu-button { display: inline-flex; flex: 0 0 auto; }
  .chat-header { flex-basis: 52px; padding: 0 12px; }
  .header-status { font-size: 0; }
  .current-session-title { max-width: 45vw; }
  .message-list { padding: 20px 12px 28px; }
  .message-row { gap: 7px; margin-bottom: 20px; }
  .message-content-wrap { max-width: 88%; }
  .composer-area { padding: 8px 10px 12px; }
  .composer-hint { font-size: 0; }
  .composer-hint kbd { font-size: 10px; }
}
</style>
