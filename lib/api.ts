// lib/api.ts
import axios from 'axios';
import { clearAuth, getCsrfToken } from './auth';
import { emitSessionExpired } from './auth-events';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

// Paths exempt from CSRF token injection (public auth endpoints)
const CSRF_EXEMPT_PATHS = [
  '/auth/token',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/logout',
];

// Interceptor: attach CSRF token on mutating requests
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

    if (isMutating) {
      const path = config.url || '';
      const isExempt = CSRF_EXEMPT_PATHS.some((exempt) => path.startsWith(exempt));

      if (!isExempt) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: redirect to /login on 401 (session expired/invalid)
const AUTH_ROUTES = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      emitSessionExpired();
      clearAuth();

      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthRoute = AUTH_ROUTES.some((route) => currentPath.startsWith(route));

      if (!isAuthRoute && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
