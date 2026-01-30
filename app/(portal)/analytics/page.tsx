"use client";

import React, { useState, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  LayoutDashboard, 
  Trophy, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Utensils, 
  ArrowRight,
  Medal
} from 'lucide-react';
import { BotSelector } from '@/components/ui/bot-selector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Interface dos dados vindos da API
interface BestSeller {
  name: string;
  quantity: number;
  revenue: number;
}

export default function BestSellersPage() {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);

  // --- Fetch de Dados ---
  const { data: products, isLoading } = useQuery<BestSeller[]>({
    queryKey: ['best-sellers-full', selectedBotId],
    queryFn: async () => {
      if (!selectedBotId) return [];
      const res = await api.get(`${API_BASE}/bots/${selectedBotId}/analytics/best-sellers`);
      return res.data;
    },
    enabled: !!selectedBotId,
  });

  // --- Cálculos de KPIs (Memoized) ---
  const stats = useMemo(() => {
    if (!products || products.length === 0) return null;

    const totalRevenue = products.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalItems = products.reduce((acc, curr) => acc + curr.quantity, 0);
    const maxQuantity = Math.max(...products.map(p => p.quantity));
    const averageTicket = totalRevenue / totalItems;

    return { totalRevenue, totalItems, maxQuantity, averageTicket };
  }, [products]);

  // Formatador de Moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-8 pb-10 fade-in">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
            <Trophy className="h-8 w-8 text-yellow-500" /> 
            Produtos Campeões
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada da performance do seu cardápio.
          </p>
        </div>
        <div className="w-full md:w-[300px]">
           <BotSelector selectedBotId={selectedBotId} onBotChange={setSelectedBotId} />
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* --- ESTADOS DE CARREGAMENTO / VAZIO --- */}
      {isLoading ? (
         <DashboardSkeleton />
      ) : !products || products.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* --- KPI CARDS (Resumo) --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* KPI 1: Produto #1 */}
            <Card className="border-l-4 border-l-yellow-400 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Item Mais Vendido
                </CardTitle>
                <Medal className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate" title={products[0].name}>
                  {products[0].name}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {products[0].quantity} unidades vendidas
                </p>
              </CardContent>
            </Card>

            {/* KPI 2: Faturamento Top 5 */}
            <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Faturamento (Top 5)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Receita gerada pelos campeões
                </p>
              </CardContent>
            </Card>

            {/* KPI 3: Ticket Médio Itens */}
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Preço Médio (Top 5)
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(stats?.averageTicket || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Média de valor por item vendido
                </p>
              </CardContent>
            </Card>
          </div>

          {/* --- CONTEÚDO PRINCIPAL (TABELA COM GRÁFICOS INLINE) --- */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Ranking de Performance</CardTitle>
              <CardDescription>
                Lista ordenada por volume de vendas. A barra indica a participação relativa ao líder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px]">Rank</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Receita Total</TableHead>
                    <TableHead className="w-[30%] hidden md:table-cell">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => {
                    // Porcentagem relativa ao 1º lugar
                    const percentage = (product.quantity / (stats?.maxQuantity || 1)) * 100;
                    
                    return (
                      <TableRow key={product.name} className="group">
                        <TableCell className="font-medium">
                          <RankBadge index={index} />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-700">{product.name}</div>
                          <div className="text-xs text-muted-foreground md:hidden">
                             {/* Mobile only sub-info */}
                             Performance: {Math.round(percentage)}%
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-600">
                          {product.quantity}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">
                          {formatCurrency(product.revenue)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-middle">
                          <div className="flex items-center gap-2">
                             <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(index)}`} 
                                    style={{ width: `${percentage}%` }}
                                />
                             </div>
                             <span className="text-xs text-muted-foreground w-[35px]">
                                {Math.round(percentage)}%
                             </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// --- Componentes Auxiliares ---

function RankBadge({ index }: { index: number }) {
  if (index === 0) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 px-2 shadow-sm">
        <Trophy className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-600" />
        #1
      </Badge>
    );
  }
  if (index === 1) {
    return (
      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 px-2">
        #2
      </Badge>
    );
  }
  if (index === 2) {
    return (
      <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 px-2">
        #3
      </Badge>
    );
  }
  return <span className="text-muted-foreground ml-2 font-mono text-sm">#{index + 1}</span>;
}

function getBarColor(index: number) {
    if (index === 0) return "bg-yellow-500";
    if (index === 1) return "bg-slate-400";
    if (index === 2) return "bg-amber-600";
    return "bg-emerald-500";
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
            <Skeleton className="h-[400px] rounded-xl" />
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Utensils className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Nenhum dado encontrado</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
                Selecione uma loja ativa ou aguarde as primeiras vendas para ver a análise de performance.
            </p>
            {/* Hack para garantir que o selector funcione se estiver nulo */}
            <div className="mt-6 opacity-0 pointer-events-none h-0">
               <BotSelector selectedBotId={null} onBotChange={() => {}} />
            </div>
        </div>
    )
}