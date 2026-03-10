"use client";

import React, { useState, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Trophy,
  DollarSign,
  ShoppingBag,
  Medal,
  Utensils
} from 'lucide-react';
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";
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
import { useRouter } from 'next/navigation';

// Importa o componente que acabamos de atualizar
import { PremiumLock } from '@/components/ui/premium-lock';

interface BestSeller {
  name: string;
  quantity: number;
  revenue: number;
}

interface SubscriptionStatus {
  status: string;
  is_active: boolean;
  days_remaining: number;
  next_payment: string;
  plan_type?: string;
}

export default function BestSellersPage() {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const router = useRouter();

  // --- 1. BUSCA O PREÇO DO PLANO ---
  const { data: pricingData } = useQuery({
    queryKey: ['plan-pricing', 'pro'],
    queryFn: async () => {
      const res = await api.get(`/plans/pricing`);
      return res.data;
    },
    staleTime: 1000 * 60 * 60, // Cache de 1 hora
  });

  // --- 2. VERIFICA STATUS DA ASSINATURA ANTES DE BUSCAR DADOS ---
  const { data: subStatus } = useQuery<SubscriptionStatus>({
    queryKey: ['billingStatus', selectedBotId],
    queryFn: async () => (await api.get(`/billing/status?bot_id=${selectedBotId}`)).data,
    enabled: !!selectedBotId,
  });

  const isPlanLocked = !!selectedBotId && subStatus !== undefined && subStatus.plan_type !== 'pro';

  // --- 3. BUSCA DADOS DE VENDAS (SOMENTE SE PLANO PERMITIR) ---
  const { data: products, isLoading } = useQuery<BestSeller[]>({
    queryKey: ['best-sellers-full', selectedBotId],
    queryFn: async () => {
      const res = await api.get(`/bots/${selectedBotId}/analytics/best-sellers`);
      return res.data;
    },
    enabled: !!selectedBotId && !isPlanLocked,
    retry: false,
  });

  // Formata o preço dinâmico para o componente
  const dynamicPriceLabel = useMemo(() => {
    if (pricingData?.price) {
      const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pricingData.price);
      return `A partir de ${price}/mês`;
    }
    return undefined; 
  }, [pricingData]);

  // --- DADOS FALSOS (Mock) PARA O BLUR ---
  const mockData: BestSeller[] = isPlanLocked ? [
    { name: "Combo Família Premium", quantity: 142, revenue: 8520 },
    { name: "X-Bacon Supremo", quantity: 98, revenue: 3430 },
    { name: "Coca-Cola 2L", quantity: 85, revenue: 1275 },
    { name: "Batata Frita Especial", quantity: 76, revenue: 2280 },
    { name: "Pudim de Leite", quantity: 45, revenue: 675 },
  ] : [];

  const displayProducts = isPlanLocked ? mockData : (products || []);

  // --- KPIs ---
  const stats = useMemo(() => {
    const source = displayProducts;
    if (!source || source.length === 0) return null;

    const totalRevenue = source.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalItems = source.reduce((acc, curr) => acc + curr.quantity, 0);
    const maxQuantity = Math.max(...source.map(p => p.quantity));
    const averageTicket = totalRevenue / totalItems;

    return { totalRevenue, totalItems, maxQuantity, averageTicket };
  }, [displayProducts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // --- REDIRECIONAMENTO CORRIGIDO ---
  const handleUpgradeClick = () => {
    // Redireciona para /settings na aba de assinatura, passando o bot selecionado
    if (selectedBotId) {
        // Assume que sua página de settings lê o ?tab=...
        router.push(`/settings?tab=subscription&bot_id=${selectedBotId}`); 
    } else {
        router.push(`/settings?tab=subscription`);
    }
  };

  return (
    <PageContainer className="pb-10">
      <PageHeader
        title="Produtos Campeões"
        description="Análise detalhada da performance do seu cardápio."
        selectedBotId={selectedBotId}
        onBotChange={setSelectedBotId}
      />

      {/* BLOQUEIO */}
      <PremiumLock 
        isLocked={isPlanLocked} 
        onUpgrade={handleUpgradeClick}
        priceLabel={dynamicPriceLabel} // Passando o preço do banco
        title="Desbloqueie a Inteligência de Vendas"
        description="Descubra quais produtos trazem mais lucro, ticket médio real e tendências de consumo com o Plano PRO."
      >
        {isLoading ? (
           <DashboardSkeleton />
        ) : !displayProducts || displayProducts.length === 0 ? (
          <AnalyticsEmptyState />
        ) : (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <Card className="border-l-4 border-l-yellow-400 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Item Mais Vendido</CardTitle>
                  <Medal className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold truncate" title={displayProducts[0].name}>
                    {displayProducts[0].name}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {displayProducts[0].quantity} unidades vendidas
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento (Top 5)</CardTitle>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Receita gerada pelos campeões</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Preço Médio (Top 5)</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    {formatCurrency(stats?.averageTicket || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Média de valor por item vendido</p>
                </CardContent>
              </Card>
            </div>

            {/* TABELA */}
            <Card className="shadow-sm mt-6">
              <CardHeader>
                <CardTitle>Ranking de Performance</CardTitle>
                <CardDescription>Lista ordenada por volume de vendas.</CardDescription>
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
                    {displayProducts.map((product, index) => {
                      const percentage = (product.quantity / (stats?.maxQuantity || 1)) * 100;
                      return (
                        <TableRow key={index} className="group">
                          <TableCell className="font-medium"><RankBadge index={index} /></TableCell>
                          <TableCell>
                            <div className="font-semibold text-slate-700">{product.name}</div>
                            <div className="text-xs text-muted-foreground md:hidden">Performance: {Math.round(percentage)}%</div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-600">{product.quantity}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">{formatCurrency(product.revenue)}</TableCell>
                          <TableCell className="hidden md:table-cell align-middle">
                            <div className="flex items-center gap-2">
                               <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(index)}`} style={{ width: `${percentage}%` }} />
                               </div>
                               <span className="text-xs text-muted-foreground w-[35px]">{Math.round(percentage)}%</span>
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
      </PremiumLock>
    </PageContainer>
  );
}

// Funções auxiliares (RankBadge, getBarColor, etc.) mantidas iguais...
function RankBadge({ index }: { index: number }) {
  if (index === 0) return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 px-2 shadow-sm"><Trophy className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-600" />#1</Badge>;
  if (index === 1) return <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 px-2">#2</Badge>;
  if (index === 2) return <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 px-2">#3</Badge>;
  return <span className="text-muted-foreground ml-2 font-mono text-sm">#{index + 1}</span>;
}

function getBarColor(index: number) {
    if (index === 0) return "bg-yellow-500";
    if (index === 1) return "bg-slate-400";
    if (index === 2) return "bg-amber-600";
    return "bg-emerald-500";
}

function DashboardSkeleton() {
    return <div className="space-y-6"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-[400px] rounded-xl" /></div>
}

function AnalyticsEmptyState() {
    return <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300"><div className="bg-white p-4 rounded-full shadow-sm inline-flex mb-4"><Utensils className="h-10 w-10 text-slate-400" /></div><h3 className="text-lg font-medium text-slate-900">Nenhum dado encontrado</h3><p className="text-slate-500 mt-1">Selecione um bot com vendas para ver a análise.</p></div>
}