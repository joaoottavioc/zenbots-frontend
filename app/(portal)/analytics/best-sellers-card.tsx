"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight, Store } from "lucide-react";
import { useRouter } from "next/navigation";

interface BestSeller {
  name: string;
  quantity: number;
  revenue: number;
}

export function BestSellersCard({ botId }: { botId: string }) {
  const router = useRouter();

  const { data: products, isLoading, isError } = useQuery<BestSeller[]>({
    queryKey: ['best-sellers-widget', botId],
    queryFn: async () => (await api.get(`/bots/${botId}/analytics/best-sellers`)).data,
    enabled: !!botId,
  });

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full rounded-xl" />;
  }

  if (isError) {
    return (
      <Card className="h-full flex flex-col justify-center items-center text-center p-6 border-red-200">
        <h3 className="font-semibold text-slate-700">Erro ao carregar dados</h3>
        <p className="text-sm text-muted-foreground mt-1">Não foi possível carregar os destaques.</p>
      </Card>
    );
  }

  // Se não tiver dados, mostra estado vazio
  if (!products || products.length === 0) {
    return (
      <Card className="h-full flex flex-col justify-center items-center text-center p-6 bg-slate-50/50 border-dashed">
        <div className="bg-white p-3 rounded-full shadow-sm mb-3">
            <Store className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-slate-700">Sem dados de vendas</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
            O ranking aparecerá aqui assim que você tiver pedidos.
        </p>
      </Card>
    );
  }

  // Pega apenas o Top 4 para o Widget (não lotar a home)
  const topProducts = products.slice(0, 4);

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Destaques da Loja
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">
                Top {topProducts.length}
            </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="space-y-4">
            {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`
                            flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0
                            ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200' : 
                              index === 1 ? 'bg-slate-100 text-slate-600' : 
                              index === 2 ? 'bg-amber-50 text-amber-700' : 'bg-transparent text-slate-400'}
                        `}>
                            {index + 1}
                        </div>
                        <div className="truncate">
                            <p className="text-sm font-medium text-slate-700 truncate" title={product.name}>
                                {product.name}
                            </p>
                        </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 shrink-0">
                        {product.quantity} <span className="text-[10px] text-muted-foreground font-normal">un</span>
                    </div>
                </div>
            ))}
        </div>

        <div className="mt-auto pt-4">
            <Button 
                variant="outline" 
                className="w-full text-xs h-8 gap-2 group-hover:border-primary/50 group-hover:text-primary transition-colors"
                onClick={() => router.push('/analytics')}
            >
                Ver Relatório Completo
                <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}