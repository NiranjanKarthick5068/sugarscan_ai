import axios from 'axios';
import EventSource from 'react-native-sse';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';
import {
  User, AuthTokens, HealthProfile, ScanResult,
  GlucoseReading, GlucoseTrends, DashboardData, ChatSession
} from '../types';

export function getApiErrorMessage(error: any, fallback = 'Something went wrong.'): string {
  if (error?.response?.data?.detail) return error.response.data.detail;
  if (error?.message === 'Network Error') return 'Cannot reach the server. Check your connection.';
  if (error?.message) return error.message;
  return fallback;
}

import { API_URL } from '../lib/apiConfig';

if (__DEV__) {
  console.log(`[Network] API_URL configured as: ${API_URL}`);
  if (API_URL.includes('localhost') || API_URL.includes('127.0.0.1')) {
    console.warn("[Network] WARNING: API_URL is pointing to localhost. Physical Android devices will not be able to connect to the Mac unless you use your Mac LAN IP.");
  }
}

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Pinggy-No-Screen': 'true',
  },
});

// Request interceptor to attach access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh and format validation errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Format FastAPI validation error arrays into a single string
    if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
      error.response.data.detail = error.response.data.detail.map((d: any) => d.msg || String(d)).join('\\n');
    }

    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Supabase handles token refresh automatically via the client.
        // Force a refresh here for the retry case.
        const { data: refreshData, error: refreshError } = await import('../lib/supabase').then(m =>
          m.supabase.auth.refreshSession()
        );
        if (refreshError || !refreshData.session) throw refreshError || new Error('Session refresh failed');

        const { access_token } = refreshData.session;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return axios(originalRequest);

      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        await useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (data: any) => {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },
  login: async (data: any) => {
    const res = await apiClient.post('/auth/login', data);
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  }
};

export const userAPI = {
  me: async (): Promise<User> => {
    const res = await apiClient.get('/users/me');
    return res.data;
  },
  update: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.patch('/users/me', data);
    return res.data;
  },
  getHealthProfile: async (): Promise<HealthProfile> => {
    const res = await apiClient.get('/users/me/health');
    return res.data;
  },
  upsertHealthProfile: async (data: Partial<HealthProfile>): Promise<HealthProfile> => {
    const res = await apiClient.put('/users/me/health', data);
    return res.data;
  }
};

export const scanAPI = {
  upload: async (imageUri: string): Promise<ScanResult> => {
    // Normalize URI so Android always gets an explicit file:// scheme
    const normalizedUri =
      Platform.OS === 'android' && !imageUri.startsWith('file://') && !imageUri.startsWith('content://')
        ? `file://${imageUri}`
        : imageUri;

    const formData = new FormData();
    if (Platform.OS === 'web') {
      const imgResponse = await fetch(normalizedUri);
      const blob = await imgResponse.blob();
      formData.append('image', blob, 'scan.jpg');
    } else {
      formData.append('image', {
        uri: normalizedUri,
        name: 'scan.jpg',
        type: 'image/jpeg'
      } as any);
    }
    // Native fetch avoids Axios Network Errors with FormData on Android React Native
    const token = useAuthStore.getState().accessToken;
    const response = await fetch(`${API_URL}/api/v1/scans/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'X-Pinggy-No-Screen': 'true',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        // Do NOT manually set Content-Type to multipart/form-data with fetch,
        // fetch automatically sets it along with the correct boundary string.
      },
      body: formData
    });
    
    if (!response.ok) {
      let detail = `Upload failed with status ${response.status}`;
      try {
        const body = await response.json();
        if (body?.detail) detail = body.detail;
      } catch {
        // response wasn't JSON, keep the generic message
      }
      throw new Error(detail);
    }
    return response.json();
  },
  logManual: async (text: string): Promise<ScanResult> => {
    const res = await apiClient.post('/scans/manual', { text });
    return res.data;
  },
  list: async (page = 1, perPage = 20) => {
    const res = await apiClient.get(`/scans/?page=${page}&per_page=${perPage}`);
    return res.data;
  },
  get: async (id: string): Promise<ScanResult> => {
    const res = await apiClient.get(`/scans/${id}`);
    return res.data;
  },
  correct: async (id: string, data: Partial<ScanResult>): Promise<ScanResult> => {
    const res = await apiClient.patch(`/scans/${id}/correct`, data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/scans/${id}`);
  },
  stats: async () => {
    const res = await apiClient.get('/scans/stats');
    return res.data;
  }
};

export const glucoseAPI = {
  log: async (data: any): Promise<GlucoseReading> => {
    const res = await apiClient.post('/glucose/', data);
    return res.data;
  },
  list: async (days = 7): Promise<GlucoseReading[]> => {
    const res = await apiClient.get(`/glucose/?days=${days}`);
    return res.data;
  },
  trends: async (days = 7): Promise<GlucoseTrends> => {
    const res = await apiClient.get(`/glucose/trends?days=${days}`);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/glucose/${id}`);
  }
};

// mealAPI has been removed, meal functionality is now unified under scanAPI (meal_scans).

export const dashboardAPI = {
  get: async (): Promise<DashboardData> => {
    const res = await apiClient.get('/dashboard/');
    return res.data;
  }
};

export const healthAPI = {
  getStatusSummary: async () => {
    const res = await apiClient.get('/health/status-summary');
    return res.data;
  },
  getScore: async () => {
    const res = await apiClient.get('/health/score');
    return res.data;
  },
  getInsights: async () => {
    const res = await apiClient.get('/health/insights');
    return res.data;
  }
};

export const analyticsAPI = {
  getAITwinTrends: async () => {
    const res = await apiClient.get('/analytics/ai-twin/trends');
    return res.data;
  }
};

export const chatAPI = {
  sessions: async (): Promise<ChatSession[]> => {
    const res = await apiClient.get('/chat/sessions');
    return res.data;
  },
  session: async (id: string): Promise<ChatSession> => {
    const res = await apiClient.get(`/chat/sessions/${id}`);
    return res.data;
  },
  deleteSession: async (id: string): Promise<void> => {
    await apiClient.delete(`/chat/sessions/${id}`);
  },
  // Streaming chat wrapper
  streamMessage: (content: string, sessionId?: string, isVoice?: boolean, onToken?: (t: string) => void, onSession?: (id: string) => void) => {
    return new Promise<void>((resolve, reject) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) return reject(new Error('No active session'));
      
      const sse = new EventSource(`${API_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, session_id: sessionId, is_voice: isVoice }),
        pollingInterval: 0 // disable auto-reconnect
      });

      sse.addEventListener('message', (event) => {
        try {
          if (!event.data) return;
          const data = JSON.parse(event.data);
          if (data.session_id && onSession) onSession(data.session_id);
          if (data.token && onToken) onToken(data.token);
          if (data.error) throw new Error(data.error);
          if (data.done) {
            sse.close();
            resolve();
          }
        } catch (e) {
          sse.close();
          reject(e);
        }
      });

      sse.addEventListener('error', (e) => {
        console.error('SSE Error:', e);
        sse.close();
        reject(e);
      });
    });
  },
  
  transcribeAudio: async (uri: string): Promise<string> => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      formData.append('file', blob, 'recording.webm');
    } else {
      const filename = uri.split('/').pop() || 'audio.m4a';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `audio/${match[1]}` : 'audio/m4a';
      formData.append('file', { uri, name: filename, type } as any);
    }

    const res = await apiClient.post('/chat/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.text;
  }
};
