import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터: Access Token 자동 첨부
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    console.log('🔑 Request Interceptor:', {
      url: config.url,
      hasToken: !!token,
      token: token ? `${token.substring(0, 20)}...` : 'null'
    });
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 에러 시 로그인 페이지로
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response Success:', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

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

