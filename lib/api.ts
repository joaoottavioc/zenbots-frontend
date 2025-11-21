// lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL
});

// Interceptor para adicionar o token em CADA requisição
api.interceptors.request.use(
  (config) => {
    // Você vai salvar o token no localStorage após o login
    const token = localStorage.getItem('zenbots_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);