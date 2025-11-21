// app/dashboard/page.tsx
"use client";

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api'; 
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// Interface Bot (como você já tinha)
interface Bot {
  id: number;
  restaurant_name: string;
  whatsapp_number: string;
}

// ▼▼▼ ESTA É A SUA LÓGICA ORIGINAL (QUE ESTAVA CORRETA) ▼▼▼
// Definimos a URL do backend, com um fallback para localhost:8000
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Dashboard() {
  
  const { data: bots, isLoading, error } = useQuery<Bot[]>({
    queryKey: ['myBots'],
    queryFn: async () => {
      
      // ▼▼▼ USANDO A SUA LÓGICA CORRETA DE CHAMADA ▼▼▼
      const response = await api.get(`${API_BASE}/bots`);
      return response.data;
    }
  });

  // O resto da página (com o novo design do Figma) continua igual
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        {/* 1. O Título do seu design */}
        <h1 className="text-3xl font-bold">Seus Bots Aparecem Aqui</h1>
        
        {/* 2. O Botão "+" do seu design */}
        <Button asChild>
          <Link href="/bots/novo"> {/* Link para a futura página de criação */}
            <Plus className="mr-2 h-4 w-4" />
            Criar Novo Bot
          </Link>
        </Button>
      </div>

      {/* 3. Mostra o feedback de erro que você viu */}
      {isLoading && <div>Carregando seus bots...</div>}
      {error && <div>Falha ao buscar bots: {error.message}</div>}
      
      {/* 4. A Lista de Bots (Cards) */}
      <div className="flex flex-col gap-4">
        {bots?.map(bot => (
          <Link href={`/bots/${bot.id}`} key={bot.id}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  {/* O Card do "Bistrot" */}
                  <div>
                    <CardTitle>{bot.restaurant_name}</CardTitle>
                    <p className="text-sm text-gray-500">{bot.whatsapp_number}</p>
                  </div>
                  
                  {/* O Status "Ativo" do seu design */}
                  <div className="flex items-center text-sm font-medium text-green-600">
                    <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                    Ativo
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}