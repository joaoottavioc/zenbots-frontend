"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface BestSeller {
  name: string;
  quantity: number;
  revenue: number;
}

export function BestSellersCard({ botId }: { botId: string }) {
  const { data: products, isLoading } = useQuery<BestSeller[]>({
    queryKey: ['best-sellers', botId],
    
    // 2. CORRIJA A URL AQUI (adicione ${API_BASE})
    queryFn: async () => (await api.get(`${API_BASE}/bots/${botId}/analytics/best-sellers`)).data,
    
    enabled: !!botId,
  });

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full rounded-xl" />;
  }

  // Encontra o valor máximo para calcular a porcentagem da barra de progresso
  const maxQuantity = products && products.length > 0 ? products[0].quantity : 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Produtos Campeões
                </CardTitle>
                <CardDescription>Itens mais pedidos pelos clientes</CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {!products || products.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Nenhuma venda registrada ainda.
          </div>
        ) : (
          <div className="space-y-6">
            {products.map((product, index) => {
              // Calcula a largura da barra baseada no item mais vendido (regra de 3)
              const percentage = (product.quantity / maxQuantity) * 100;
              
              return (
                <div key={product.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className={`font-bold w-4 ${index === 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
                            #{index + 1}
                        </span>
                        <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]" title={product.name}>
                            {product.name}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="font-bold">{product.quantity}</span> <span className="text-xs text-muted-foreground">vendas</span>
                    </div>
                  </div>
                  
                  {/* Barra de Progresso Customizada */}
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary transition-all duration-500 ease-out rounded-full" 
                        style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}