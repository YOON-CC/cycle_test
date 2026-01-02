import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Message {
  id: number
  content: string
  timestamp: string
}

export interface MessageRequest {
  content: string
}

export const messageApi = {
  // 메시지 생성
  create: async (data: MessageRequest): Promise<Message> => {
    const response = await apiClient.post<Message>('/messages', data)
    return response.data
  },

  // 모든 메시지 조회
  getAll: async (): Promise<Message[]> => {
    const response = await apiClient.get<Message[]>('/messages')
    return response.data
  },

  // 특정 메시지 조회
  getById: async (id: number): Promise<Message> => {
    const response = await apiClient.get<Message>(`/messages/${id}`)
    return response.data
  },

  // 헬스 체크
  health: async (): Promise<string> => {
    const response = await apiClient.get<string>('/health')
    return response.data
  },
}

