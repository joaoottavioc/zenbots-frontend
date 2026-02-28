// lib/api.ts
import axios from 'axios';
import { getToken, clearToken } from './auth';
import { emitSessionExpired } from './auth-events';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL
});

// Interceptor para adicionar o token em CADA requisição
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: redireciona para /login em caso de 401 (token expirado/inválido)
const AUTH_ROUTES = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      emitSessionExpired();
      clearToken();

      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthRoute = AUTH_ROUTES.some((route) => currentPath.startsWith(route));

      if (!isAuthRoute && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);