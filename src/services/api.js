import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gracie-backend.onrender.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: (email, password ) => api.post('/auth/login', { email, password }),
  signup: (userData) => api.post('/auth/register', userData),
};

export const chatAPI = {
  sendMessage: (message, userId) => api.post('/chat/message', { message, user_id: userId }),
  getHistory: (userId) => api.get(`/chat/history/${userId}`),
};

export const journalAPI = {
  getEntries: (userId) => api.get(`/journal/entries/${userId}`),
  createEntry: (entry) => api.post('/journal/entry', entry),
};

export default api;
