import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurações experimentais (mantendo o que você já tinha)
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },

  // ▼▼▼ AQUI ESTÁ A MÁGICA DO PROXY ▼▼▼
  async rewrites() {
    return [
      {
        // 1. O Gatilho: Qualquer rota que comece com /api/v1/
        source: '/api/v1/:path*',
        
        // 2. O Destino: O Backend FastAPI rodando no Docker
        // Como o seu docker-compose.yml mapeia "8000:8000",
        // usamos 127.0.0.1 para acessar o container de fora.
        destination: 'http://127.0.0.1:8000/api/v1/:path*', 
      },
    ]
  },
};

export default nextConfig;