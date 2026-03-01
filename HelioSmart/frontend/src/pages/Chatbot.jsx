import { useState, useRef, useEffect, useCallback } from 'react'
import { chatbotAPI } from '../services/api'
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  User,
  Loader2,
  Settings,
  Trash2,
  Sparkles,
  Cpu,
  Database,
  AudioWaveform,
  Languages,
  RefreshCw,
  Copy,
  Check,
  Clock,
  Download,
  Sun,
  Zap,
  DollarSign,
  Leaf,
  Lightbulb,
  Wrench,
  TrendingUp,
  MessageCircle,
  ArrowRight,
} from 'lucide-react'

// Simple Markdown Parser Component
function MarkdownContent({ content }) {
  // Parse markdown-like syntax
  const parseMarkdown = (text) => {
    // Replace headers
    text = text.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-sky-300 mb-2 mt-3">$1</h3>')
    text = text.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-amber-300 mb-3 mt-4">$1</h2>')
    text = text.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-amber-400 mb-4 mt-5">$1</h1>')
    
    // Replace bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-300 font-semibold">$1</strong>')
    
    // Replace italic
    text = text.replace(/\*(.*?)\*/g, '<em class="text-sky-300 italic">$1</em>')
    
    // Replace bullet points
    text = text.replace(/^• (.*$)/gim, '<li class="flex items-start gap-2 mb-1"><span class="text-amber-400 mt-1.5">•</span><span>$1</span></li>')
    text = text.replace(/^- (.*$)/gim, '<li class="flex items-start gap-2 mb-1"><span class="text-amber-400 mt-1.5">•</span><span>$1</span></li>')
    
    // Replace code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-amber-200 font-mono">$1</code>')
    
    // Replace newlines with breaks (but not inside lists)
    const lines = text.split('\n')
    let inList = false
    let result = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.startsWith('<li')) {
        if (!inList) {
          result.push('<ul class="space-y-1 my-3 ml-1">')
          inList = true
        }
        result.push(line)
      } else {
        if (inList) {
          result.push('</ul>')
          inList = false
        }
        if (line.trim()) {
          result.push(line)
        } else {
          result.push('<br/>')
        }
      }
    }
    
    if (inList) {
      result.push('</ul>')
    }
    
    return result.join('')
  }

  const htmlContent = parseMarkdown(content)
  
  return (
    <div 
      className="prose prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

// Message component with solar styling
function ChatMessage({ message, isLast }) {
  const [copied, setCopied] = useState(false)
  const [showTimestamp, setShowTimestamp] = useState(false)
  const isUser = message.role === 'user'
  const isError = message.isError

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slideIn`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar with glow */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative ${
            isUser
              ? 'bg-gradient-to-br from-amber-500 to-orange-600'
              : 'bg-gradient-to-br from-violet-500 to-purple-600'
          }`}
        >
          {!isUser && (
            <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-lg" />
          )}
          {isUser ? (
            <User className="w-5 h-5 text-white relative z-10" />
          ) : (
            <Bot className="w-5 h-5 text-white relative z-10" />
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-1">
          <div
            className={`relative rounded-2xl px-5 py-4 transition-all ${
              isUser
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-br-md shadow-lg shadow-orange-500/20'
                : isError
                  ? 'bg-red-900/30 text-red-200 border border-red-500/30 rounded-bl-md'
                  : 'bg-[#1e2d45] border-l-4 border-amber-500 text-slate-200 rounded-bl-md shadow-lg hover:border-amber-400 transition-colors'
            }`}
          >
            {/* Voice indicator */}
            {message.isVoice && (
              <div className="flex items-center gap-2 mb-3 text-xs text-amber-300/80">
                <AudioWaveform className="w-3.5 h-3.5" />
                <span>Voice message transcribed</span>
              </div>
            )}

            {/* Message text with markdown */}
            <div className="text-[15px] leading-relaxed">
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <MarkdownContent content={message.content} />
              )}
            </div>

            {/* Context indicator */}
            {message.contextUsed && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Database className="w-3 h-3" />
                <span>Knowledge base enhanced</span>
              </div>
            )}

            {/* Copy button for assistant messages */}
            {!isUser && !isError && (
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-400"
                title="Copy message"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Timestamp - subtle, appears on hover */}
          <span
            className={`text-[11px] text-slate-600 transition-opacity duration-200 ${
              isUser ? 'text-right mr-1' : 'ml-1'
            } ${showTimestamp ? 'opacity-100' : 'opacity-0'}`}
          >
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}

// Typing indicator with solar amber dots
function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 relative">
          <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-lg" />
          <Bot className="w-5 h-5 text-white relative z-10" />
        </div>
        <div className="bg-[#1e2d45] border-l-4 border-amber-500/50 rounded-2xl rounded-bl-md px-5 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s] shadow-lg shadow-amber-500/50" />
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s] shadow-lg shadow-amber-500/50" />
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce shadow-lg shadow-amber-500/50" />
            </div>
            <span className="text-sm text-slate-400 ml-1">HelioSmart is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Service status badge with tooltip
function StatusBadge({ available, label, icon: Icon, description }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-help ${
          available
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10'
            : 'bg-slate-800 text-slate-500 border border-slate-700'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
        {available && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-xs text-slate-300 rounded-lg border border-slate-700 whitespace-nowrap z-50 shadow-xl">
          {description}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  )
}

// Suggestion card component
function SuggestionCard({ question, icon: Icon, delay, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative p-4 bg-[#162236] hover:bg-[#1e2d45] rounded-xl border border-slate-700/50 hover:border-amber-500/50 transition-all duration-300 text-left animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-5 h-5 text-amber-400" />
        </div>
        <p className="text-sm text-slate-300 group-hover:text-slate-200 line-clamp-2 transition-colors">
          {question}
        </p>
        <div className="mt-3 flex items-center gap-1 text-xs text-amber-500/0 group-hover:text-amber-500/80 transition-all duration-300">
          <span>Ask this</span>
          <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  )
}

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Welcome to **HelioSmart Assistant**! ☀️

I'm your AI-powered solar energy consultant, ready to illuminate your path to clean energy.

## What I can help you with:

• **Solar System Design** — Optimal panel configurations and roof layouts
• **Energy Estimations** — Accurate production calculations using PVWatts
• **Financial Analysis** — ROI, payback periods, and savings projections  
• **Technical Specifications** — Inverter selection, wiring, and mounting
• **Environmental Impact** — CO2 offset and sustainability metrics

*How can I assist with your solar journey today?*`,
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [serviceStatus, setServiceStatus] = useState(null)
  const [language, setLanguage] = useState('en')
  const [useRag, setUseRag] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [chatHistory, setChatHistory] = useState([])
  const [isPageLoaded, setIsPageLoaded] = useState(false)

  const messagesEndRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const textareaRef = useRef(null)

  // Page load animation
  useEffect(() => {
    setTimeout(() => setIsPageLoaded(true), 100)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Check service status on mount
  useEffect(() => {
    checkServiceStatus()
    loadChatHistory()
  }, [])

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(recordingTimerRef.current)
      setRecordingDuration(0)
    }
    return () => clearInterval(recordingTimerRef.current)
  }, [isRecording])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const checkServiceStatus = async () => {
    try {
      const response = await chatbotAPI.getStatus()
      setServiceStatus(response.data)
    } catch (error) {
      console.error('Failed to check service status:', error)
      setServiceStatus({
        llm_available: false,
        rag_available: false,
        stt_available: false,
        tts_available: false,
      })
    }
  }

  const loadChatHistory = () => {
    const saved = localStorage.getItem('heliosmart_chat_history')
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load chat history:', e)
      }
    }
  }

  const saveChatHistory = useCallback(
    (newMessages) => {
      const historyItem = {
        id: Date.now(),
        date: new Date().toISOString(),
        preview: newMessages[1]?.content?.substring(0, 50) + '...' || 'New conversation',
        messages: newMessages,
      }
      const updated = [historyItem, ...chatHistory].slice(0, 10)
      setChatHistory(updated)
      localStorage.setItem('heliosmart_chat_history', JSON.stringify(updated))
    },
    [chatHistory]
  )

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const newMessages = [
      ...messages,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    ]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const response = await chatbotAPI.chat(userMessage, language, 400, useRag)
      const { response: botResponse, context_used } = response.data

      const updatedMessages = [
        ...newMessages,
        {
          role: 'assistant',
          content: botResponse,
          contextUsed: context_used,
          timestamp: new Date().toISOString(),
        },
      ]
      setMessages(updatedMessages)

      if (audioEnabled && serviceStatus?.tts_available) {
        playAudioResponse(botResponse)
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I apologize, but I encountered an error processing your request. Please try again or check your connection.',
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const playAudioResponse = async (text) => {
    try {
      const response = await chatbotAPI.textToSpeech(text, language)
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audio.play()
    } catch (error) {
      console.error('TTS error:', error)
    }
  }

  const startRecording = async () => {
    if (!serviceStatus?.stt_available) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Speech-to-text is currently unavailable. Please type your message instead.',
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ])
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await handleAudioUpload(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Microphone access error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Could not access microphone. Please ensure you have granted microphone permissions in your browser settings.',
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleAudioUpload = async (audioBlob) => {
    setIsLoading(true)
    try {
      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' })
      const response = await chatbotAPI.uploadAudio(audioFile)
      const { transcription, response: botResponse } = response.data

      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: transcription,
          isVoice: true,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: botResponse,
          timestamp: new Date().toISOString(),
        },
      ])

      if (audioEnabled && serviceStatus?.tts_available) {
        playAudioResponse(botResponse)
      }
    } catch (error) {
      console.error('Audio upload error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry, I could not process your audio. Please try speaking more clearly or type your message instead.',
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    saveChatHistory(messages)
    setMessages([
      {
        role: 'assistant',
        content: `Welcome back! ☀️

I'm ready to help you with your solar energy questions. What would you like to explore today?

• Solar system design and sizing
• Energy production estimates
• Financial analysis and incentives
• Technical specifications`,
        timestamp: new Date().toISOString(),
      },
    ])
  }

  const exportChat = () => {
    const chatText = messages
      .map(
        (m) =>
          `${m.role === 'user' ? 'You' : 'HelioSmart Assistant'} (${new Date(m.timestamp).toLocaleString()}):\n${m.content}`
      )
      .join('\n\n---\n\n')

    const blob = new Blob([chatText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heliosmart-chat-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const suggestedQuestions = [
    { question: 'What is HelioSmart and how does it work?', icon: Lightbulb },
    { question: 'How do I create a solar estimation?', icon: Sun },
    { question: 'What size solar system do I need?', icon: Zap },
    { question: 'What is the typical ROI for solar in Morocco?', icon: DollarSign },
    { question: 'How much CO2 will my system offset?', icon: Leaf },
    { question: 'String inverter vs microinverter?', icon: Wrench },
  ]

  return (
    <div 
      className="min-h-[calc(100vh-140px)] flex gap-6 transition-opacity duration-700"
      style={{ 
        opacity: isPageLoaded ? 1 : 0,
        background: 'linear-gradient(135deg, #0f1a2e 0%, #162236 50%, #0f1a2e 100%)'
      }}
    >
      {/* Sidebar - Chat History */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <div 
          className="h-full rounded-2xl border flex flex-col overflow-hidden"
          style={{ 
            background: '#162236',
            borderColor: 'rgba(100, 116, 139, 0.2)'
          }}
        >
          {/* Sidebar Header */}
          <div className="p-5 border-b" style={{ borderColor: 'rgba(100, 116, 139, 0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sun className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">HelioSmart</h3>
                <p className="text-xs text-slate-500">AI Consultant</p>
              </div>
            </div>
          </div>

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                  <Sun className="w-8 h-8 text-amber-500/50" />
                </div>
                <p className="text-slate-400 text-sm mb-2">Your solar journey starts here</p>
                <p className="text-slate-600 text-xs">Conversations will appear here</p>
              </div>
            ) : (
              chatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setMessages(chat.messages)}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-800/50 transition-all text-sm group"
                >
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-slate-600 group-hover:text-amber-500/70 mt-0.5 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-300 truncate group-hover:text-slate-200 transition-colors">
                        {chat.preview}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {new Date(chat.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t" style={{ borderColor: 'rgba(100, 116, 139, 0.2)' }}>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Powered by Ollama</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div 
          className="rounded-2xl border mb-4 flex-shrink-0 animate-fadeIn"
          style={{ 
            background: '#162236',
            borderColor: 'rgba(100, 116, 139, 0.2)'
          }}
        >
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/20 relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-amber-500 blur-xl opacity-50" />
                <Sparkles className="w-7 h-7 text-white relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100">
                  HelioSmart Assistant
                </h1>
                <p className="text-slate-500 flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  AI-Powered Solar Consultant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Service Status */}
              <div className="hidden md:flex items-center gap-2">
                <StatusBadge
                  available={serviceStatus?.llm_available}
                  label="AI"
                  icon={Cpu}
                  description="Large Language Model powered by Ollama"
                />
                <StatusBadge
                  available={serviceStatus?.rag_available}
                  label="RAG"
                  icon={Database}
                  description="Retrieval Augmented Generation from your documents"
                />
                <StatusBadge
                  available={serviceStatus?.stt_available}
                  label="Voice"
                  icon={AudioWaveform}
                  description="Speech-to-text for voice messages"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2.5 rounded-xl transition-all ${
                    showSettings
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={exportChat}
                  className="p-2.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 rounded-xl transition-all"
                  title="Export chat"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={clearChat}
                  className="p-2.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all"
                  title="Clear chat"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div 
              className="border-t p-5 animate-fadeIn"
              style={{ 
                background: 'rgba(30, 45, 69, 0.5)',
                borderColor: 'rgba(100, 116, 139, 0.2)'
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="fr">🇫🇷 French</option>
                    <option value="ar">🇸🇦 Arabic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Audio Response
                  </label>
                  <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                      audioEnabled
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {audioEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Enabled</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span>Disabled</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Knowledge Base
                  </label>
                  <button
                    onClick={() => setUseRag(!useRag)}
                    disabled={!serviceStatus?.rag_available}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                      useRag && serviceStatus?.rag_available
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    } ${!serviceStatus?.rag_available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Database className="w-4 h-4" />
                    <span>
                      {useRag && serviceStatus?.rag_available ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div 
          className="flex-1 rounded-2xl border flex flex-col min-h-0 mb-4 overflow-hidden animate-fadeIn"
          style={{ 
            background: '#162236',
            borderColor: 'rgba(100, 116, 139, 0.2)'
          }}
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-6 chat-scrollbar">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div 
            className="border-t p-4"
            style={{ 
              background: 'rgba(30, 45, 69, 0.5)',
              borderColor: 'rgba(100, 116, 139, 0.2)'
            }}
          >
            {isRecording ? (
              <div 
                className="flex items-center justify-center gap-4 py-4 rounded-xl border animate-pulse"
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.3)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 font-medium">Recording</span>
                  <span className="text-red-300 font-mono text-lg">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <MicOff className="w-4 h-4" />
                  Stop
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <button
                  onClick={startRecording}
                  disabled={isLoading || !serviceStatus?.stt_available}
                  className={`p-3.5 rounded-xl transition-all flex-shrink-0 ${
                    serviceStatus?.stt_available
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                  }`}
                  title={serviceStatus?.stt_available ? 'Voice input' : 'Voice input unavailable'}
                >
                  <Mic className="w-5 h-5" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about solar energy, system design, or financial analysis..."
                    disabled={isLoading}
                    rows={1}
                    className="w-full resize-none py-3 px-4 pr-16 min-h-[50px] max-h-[120px] bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  />
                  <div className="absolute right-3 bottom-3 text-xs text-slate-600">
                    {input.length > 0 && `${input.length}`}
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 active:scale-95"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Suggestion Cards */}
        {messages.length <= 2 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-shrink-0">
            {suggestedQuestions.map((item, index) => (
              <SuggestionCard
                key={item.question}
                question={item.question}
                icon={item.icon}
                delay={index * 100}
                onClick={() => setInput(item.question)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
