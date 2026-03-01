import { useState, useRef, useEffect, useCallback } from 'react'
import { chatbotAPI } from '../services/api'
import {
  Send, Mic, MicOff, Volume2, VolumeX, Bot, User, Loader2,
  Settings, Trash2, Sparkles, Cpu, Database, AudioWaveform,
  Languages, Copy, Check, Download, Sun, Zap, DollarSign,
  Leaf, Lightbulb, Wrench, MessageCircle, ArrowRight, X,
  ChevronRight, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

/* 
   Safe Markdown renderer  pure React elements, zero dangerouslySetInnerHTML
 */
function MarkdownContent({ content }) {
  if (!content) return null

  const parseInline = (text, keyBase) => {
    const parts = []
    const RE = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
    let last = 0, m, idx = 0
    while ((m = RE.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index))
      if (m[2] !== undefined)
        parts.push(<strong key={`${keyBase}-b${idx}`} className="font-semibold text-amber-300">{m[2]}</strong>)
      else if (m[3] !== undefined)
        parts.push(<em key={`${keyBase}-i${idx}`} className="italic text-sky-300">{m[3]}</em>)
      else if (m[4] !== undefined)
        parts.push(<code key={`${keyBase}-c${idx}`} className="bg-white/10 text-amber-200 font-mono text-[13px] px-1.5 py-0.5 rounded">{m[4]}</code>)
      last = m.index + m[0].length; idx++
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts
  }

  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (hMatch) {
      const level = hMatch[1].length
      const cls = level === 1 ? 'text-xl font-bold text-amber-400 mt-4 mb-2'
        : level === 2 ? 'text-base font-semibold text-amber-300 mt-3 mb-1'
        : 'text-sm font-semibold text-sky-300 mt-2 mb-1'
      const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
      elements.push(<Tag key={i} className={cls}>{parseInline(hMatch[2], i)}</Tag>)
      i++; continue
    }

    if (/^[-*]\s/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        const txt = lines[i].trim().replace(/^[-*]\s/, '')
        items.push(
          <li key={i} className="flex items-start gap-2.5">
            <span className="text-amber-400 mt-1 text-xs flex-shrink-0"></span>
            <span className="leading-relaxed">{parseInline(txt, `li${i}`)}</span>
          </li>
        )
        i++
      }
      elements.push(<ul key={`ul${i}`} className="space-y-1.5 my-2">{items}</ul>)
      continue
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      const items = []
      let num = 1
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        const txt = lines[i].trim().replace(/^\d+[.)]\s/, '')
        items.push(
          <li key={i} className="flex items-start gap-2.5">
            <span className="text-amber-400 font-mono text-xs mt-1 flex-shrink-0 w-4">{num}.</span>
            <span className="leading-relaxed">{parseInline(txt, `ol${i}`)}</span>
          </li>
        )
        i++; num++
      }
      elements.push(<ol key={`ol${i}`} className="space-y-1.5 my-2">{items}</ol>)
      continue
    }

    if (!trimmed) { elements.push(<div key={i} className="h-2" />); i++; continue }
    elements.push(<p key={i} className="leading-relaxed">{parseInline(trimmed, i)}</p>)
    i++
  }

  return <div className="space-y-1 text-[14.5px]">{elements}</div>
}

/* 
   Message bubble
 */
function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isError = message.isError

  const copy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1 ${
        isUser
          ? 'bg-gradient-to-br from-orange-500 to-amber-500'
          : 'bg-gradient-to-br from-violet-600 to-purple-700'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Sparkles className="w-4 h-4 text-white" />}
      </div>

      {/* Bubble + meta */}
      <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`relative px-4 py-3 rounded-2xl text-sm ${
          isUser
            ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-tr-sm'
            : isError
              ? 'bg-red-900/30 text-red-300 border border-red-500/30 rounded-tl-sm'
              : 'bg-[#1c2e47] text-slate-200 rounded-tl-sm border border-white/5'
        }`}>
          {/* Voice badge */}
          {message.isVoice && (
            <div className="flex items-center gap-1.5 mb-2 text-[11px] text-amber-300/70">
              <AudioWaveform className="w-3 h-3" />
              <span>Voice transcribed</span>
            </div>
          )}

          {isUser
            ? <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            : <MarkdownContent content={message.content} />}

          {/* Context badge */}
          {message.contextUsed && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
              <Database className="w-3 h-3" />
              <span>From knowledge base</span>
            </div>
          )}

          {/* Copy btn  visible on hover */}
          {!isUser && !isError && (
            <button
              onClick={copy}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-[#243a56] border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-[#2d4968] shadow-lg"
              title="Copy"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-green-400" />
                : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[11px] text-slate-600 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

/* 
   Typing indicator
 */
function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl flex-shrink-0 bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mt-1">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="bg-[#1c2e47] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
      </div>
    </div>
  )
}

/* 
   Status pill
 */
function Pill({ on, label, icon: Icon }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
      on
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
        : 'bg-white/5 text-slate-500 border-white/10'
    }`}>
      <Icon className="w-3 h-3" />
      {label}
      {on && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />}
    </div>
  )
}

/* 
   Quick-ask card
 */
function QuickCard({ q, icon: Icon, delay, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group p-3.5 bg-[#142035] hover:bg-[#1c2e47] rounded-xl border border-white/5 hover:border-amber-500/30 text-left transition-all duration-200 animate-fadeInUp"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-slate-300 group-hover:text-slate-100 leading-snug line-clamp-2 transition-colors">{q}</p>
          <div className="flex items-center gap-1 mt-2 text-[11px] text-amber-500/0 group-hover:text-amber-500/70 transition-all duration-200">
            <span>Ask</span>
            <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  )
}

/* 
   Main Chatbot component
 */
const WELCOME = `Welcome to **HelioSmart Assistant**! 

I'm your AI-powered solar energy consultant.

## What I can help you with:

- **Solar System Design**  Optimal panel configurations and roof layouts
- **Energy Estimations**  Accurate production calculations using PVWatts
- **Financial Analysis**  ROI, payback periods, and savings projections
- **Technical Specs**  Inverter selection, wiring, and mounting
- **Environmental Impact**  CO2 offset and sustainability metrics

*How can I assist with your solar journey today?*`

const SUGGESTIONS = [
  { q: 'What is HelioSmart and how does it work?', icon: Lightbulb },
  { q: 'How do I create a solar estimation?', icon: Sun },
  { q: 'What size solar system do I need?', icon: Zap },
  { q: 'What is the typical ROI for solar in Morocco?', icon: DollarSign },
  { q: 'How much CO2 will my system offset?', icon: Leaf },
  { q: 'String inverter vs microinverter  which is better?', icon: Wrench },
]

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME, timestamp: new Date().toISOString() },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [serviceStatus, setServiceStatus] = useState(null)
  const [language, setLanguage] = useState('en')
  const [useRag, setUseRag] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [chatHistory, setChatHistory] = useState([])
  const [ready, setReady] = useState(false)

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    // Lock body scroll — only while on this page
    document.body.style.overflow = 'hidden'
    setTimeout(() => setReady(true), 80)
    checkStatus()
    loadHistory()
    return () => { document.body.style.overflow = '' }
  }, [])

  // Keep polling while backend is still loading models
  useEffect(() => {
    if (serviceStatus?.initializing === false || serviceStatus?.llm_available) return
    if (!serviceStatus) return
    const id = setInterval(checkStatus, 3000)
    return () => clearInterval(id)
  }, [serviceStatus])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`
    }
  }, [input])

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setRecordingDuration(0)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording])

  const checkStatus = async () => {
    try {
      const r = await chatbotAPI.getStatus()
      setServiceStatus(r.data)
    } catch {
      setServiceStatus({ llm_available: false, rag_available: false, stt_available: false, tts_available: false })
    }
  }

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('hs_chat_history')
      if (saved) setChatHistory(JSON.parse(saved))
    } catch {}
  }

  const saveHistory = useCallback((msgs) => {
    const item = {
      id: Date.now(),
      date: new Date().toISOString(),
      preview: msgs.find(m => m.role === 'user')?.content?.slice(0, 60) || 'New chat',
      messages: msgs,
    }
    const updated = [item, ...chatHistory].slice(0, 10)
    setChatHistory(updated)
    localStorage.setItem('hs_chat_history', JSON.stringify(updated))
  }, [chatHistory])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const next = [...messages, { role: 'user', content: text, timestamp: new Date().toISOString() }]
    setMessages(next)
    setIsLoading(true)

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }))
      const r = await chatbotAPI.chat(text, language, 500, useRag, history)
      const { response: reply, context_used } = r.data
      const done = [...next, { role: 'assistant', content: reply, contextUsed: context_used, timestamp: new Date().toISOString() }]
      setMessages(done)
      if (audioEnabled && serviceStatus?.tts_available) playTTS(reply)
    } catch {
      setMessages(p => [...p, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        isError: true,
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const playTTS = async (text) => {
    try {
      const r = await chatbotAPI.textToSpeech(text, language)
      const blob = new Blob([r.data], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play()
    } catch {}
  }

  const startRecording = async () => {
    if (!serviceStatus?.stt_available) {
      setMessages(p => [...p, { role: 'assistant', content: 'Speech-to-text is currently unavailable. Please type instead.', isError: true, timestamp: new Date().toISOString() }])
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      mediaRecorderRef.current = rec
      audioChunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      rec.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await handleAudio(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      rec.start()
      setIsRecording(true)
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Microphone access denied. Please allow microphone permissions.', isError: true, timestamp: new Date().toISOString() }])
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleAudio = async (blob) => {
    setIsLoading(true)
    try {
      const file = new File([blob], 'rec.wav', { type: 'audio/wav' })
      const r = await chatbotAPI.uploadAudio(file)
      const { transcription, response: reply } = r.data
      setMessages(p => [
        ...p,
        { role: 'user', content: transcription, isVoice: true, timestamp: new Date().toISOString() },
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ])
      if (audioEnabled && serviceStatus?.tts_available) playTTS(reply)
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Could not process audio. Please try again.', isError: true, timestamp: new Date().toISOString() }])
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    saveHistory(messages)
    setMessages([{ role: 'assistant', content: WELCOME, timestamp: new Date().toISOString() }])
  }

  const exportChat = () => {
    const txt = messages
      .map(m => `${m.role === 'user' ? 'You' : 'HelioSmart'} [${new Date(m.timestamp).toLocaleString()}]:\n${m.content}`)
      .join('\n\n---\n\n')
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `heliosmart-chat-${Date.now()}.txt` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmtDur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div
      className="flex h-full overflow-hidden transition-opacity duration-500"
      style={{ opacity: ready ? 1 : 0, background: '#0b1827' }}
    >
      {/*  Sidebar  */}
      <aside
        className={`flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden border-r border-white/5 ${
          showSidebar ? 'w-64' : 'w-0'
        }`}
        style={{ background: '#0f1f33' }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Sun className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100 leading-none">HelioSmart</p>
              <p className="text-[11px] text-slate-500 mt-0.5">AI Consultant</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="New chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 chat-scrollbar">
          {chatHistory.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <MessageCircle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-600">No chat history yet</p>
            </div>
          ) : chatHistory.map(c => (
            <button
              key={c.id}
              onClick={() => setMessages(c.messages)}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <p className="text-[12px] text-slate-400 group-hover:text-slate-200 truncate transition-colors leading-snug">{c.preview}</p>
              <p className="text-[10px] text-slate-600 mt-1">{new Date(c.date).toLocaleDateString()}</p>
            </button>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>via Ollama LLM</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                serviceStatus?.llm_available ? 'bg-emerald-500' :
                serviceStatus?.initializing ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
              }`} />
              <span>{
                serviceStatus?.llm_available ? 'Online' :
                serviceStatus?.initializing ? 'Loading…' : 'Offline'
              }</span>
            </div>
          </div>
        </div>
      </aside>

      {/*  Main  */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 flex-shrink-0" style={{ background: '#0d1e31' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(s => !s)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
            >
              {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-900/50">
                <Sparkles className="w-5 h-5 text-white" />
                {serviceStatus?.llm_available && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0d1e31]" />
                )}
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-100 leading-none">HelioSmart Assistant</h1>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {serviceStatus?.llm_available ? 'Ready to help' : serviceStatus?.initializing ? 'Loading models…' : 'Running in fallback mode'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5">
              <Pill on={serviceStatus?.llm_available} label="AI" icon={Cpu} />
              <Pill on={serviceStatus?.rag_available} label="RAG" icon={Database} />
              <Pill on={serviceStatus?.stt_available} label="Voice" icon={AudioWaveform} />
            </div>

            <div className="w-px h-5 bg-white/10 mx-1" />

            <button
              onClick={exportChat}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
              title="Export chat"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                showSettings ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Settings drawer */}
        {showSettings && (
          <div className="border-b border-white/5 px-5 py-4 flex-shrink-0 animate-fadeIn" style={{ background: '#0c1929' }}>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-slate-500" />
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-amber-500/40"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                </select>
              </div>

              <button
                onClick={() => setAudioEnabled(v => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  audioEnabled
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-300'
                }`}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>Audio {audioEnabled ? 'On' : 'Off'}</span>
              </button>

              <button
                onClick={() => setUseRag(v => !v)}
                disabled={!serviceStatus?.rag_available}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  useRag && serviceStatus?.rag_available
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-300'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Knowledge Base {useRag && serviceStatus?.rag_available ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 space-y-5 chat-scrollbar" style={{ background: '#0b1827' }}>
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick-ask cards */}
        {messages.length <= 1 && !isLoading && (
          <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2.5 flex-shrink-0" style={{ background: '#0b1827' }}>
            {SUGGESTIONS.map((s, i) => (
              <QuickCard key={s.q} q={s.q} icon={s.icon} delay={i * 60} onClick={() => setInput(s.q)} />
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-white/5" style={{ background: '#0d1e31' }}>
          {isRecording ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-400 font-medium">Recording</span>
                <span className="text-sm text-red-300 font-mono">{fmtDur(recordingDuration)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
              >
                <MicOff className="w-3.5 h-3.5" />
                Stop
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <button
                onClick={startRecording}
                disabled={isLoading || !serviceStatus?.stt_available}
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  serviceStatus?.stt_available
                    ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    : 'bg-white/5 text-slate-700 cursor-not-allowed'
                }`}
                title={serviceStatus?.stt_available ? 'Voice input' : 'Voice unavailable'}
              >
                <Mic className="w-4 h-4" />
              </button>

              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Ask about solar systems, ROI, panel sizing"
                  disabled={isLoading}
                  rows={1}
                  className="w-full resize-none py-2.5 px-4 pr-12 rounded-xl text-sm text-slate-200 placeholder-slate-600 transition-all"
                  style={{
                    minHeight: '44px',
                    maxHeight: '128px',
                    background: '#142035',
                    border: '1px solid rgba(255,255,255,0.08)',
                    outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(245,158,11,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                {input.length > 0 && (
                  <span className="absolute right-3 bottom-2.5 text-[11px] text-slate-600 select-none pointer-events-none">
                    {input.length}
                  </span>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !isLoading ? 'linear-gradient(135deg,#f59e0b,#ea580c)' : 'rgba(255,255,255,0.05)',
                  boxShadow: input.trim() && !isLoading ? '0 4px 16px rgba(245,158,11,0.3)' : 'none',
                }}
              >
                {isLoading
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
          )}
          <p className="text-center text-[11px] text-slate-700 mt-2">Enter to send  Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}