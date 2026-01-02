import { useState, useEffect } from 'react'
import { messageApi } from './api/client'
import type { Message } from './api/client'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  // 서버 상태 확인
  useEffect(() => {
    checkServerStatus()
    const interval = setInterval(checkServerStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkServerStatus = async () => {
    try {
      await messageApi.health()
      setServerStatus('online')
    } catch (error) {
      setServerStatus('offline')
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userInput = input
    setInput('')
    setLoading(true)

    try {
      const newMessage = await messageApi.create({ content: userInput })
      setMessages(prev => [...prev, newMessage])
    } catch (error) {
      console.error('Error:', error)
      alert('메시지 전송 실패. 백엔드 서버가 실행 중인지 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    try {
      const data = await messageApi.getAll()
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  useEffect(() => {
    if (serverStatus === 'online') {
      loadMessages()
    }
  }, [serverStatus])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800">풀스택 연습 프로젝트</h1>
          <p className="text-gray-600 mt-2">React + Spring Boot API 통신</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              serverStatus === 'online' ? 'bg-green-500' : 
              serverStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></span>
            <span className="text-sm text-gray-500">
              {serverStatus === 'online' ? '백엔드 연결됨' : 
               serverStatus === 'offline' ? '백엔드 연결 안됨' : '확인 중...'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">메시지 목록</h2>
            <button
              onClick={loadMessages}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              새로고침
            </button>
          </div>

          <div className="space-y-3 h-96 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                메시지가 없습니다. 아래에서 메시지를 입력해보세요!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                >
                  <p className="text-gray-800">{msg.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleString('ko-KR')}
                  </p>
                </div>
              ))
            )}
            {loading && (
              <div className="text-center text-gray-500 py-4">
                전송 중...
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || serverStatus !== 'online'}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || serverStatus !== 'online'}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              전송
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">프로젝트 정보</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>프론트엔드:</strong> React + TypeScript + Vite + Tailwind CSS</p>
            <p><strong>백엔드:</strong> Spring Boot (Java 17)</p>
            <p><strong>통신:</strong> RESTful API (Axios)</p>
            <p><strong>상태 관리:</strong> React Hooks</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
