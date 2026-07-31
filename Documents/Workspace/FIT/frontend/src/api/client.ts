import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const AUTH_TOKEN_KEY = 'fit_auth_token';

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('fit_auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { AUTH_TOKEN_KEY };
