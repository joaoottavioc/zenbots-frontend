import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PremiumLockProps {
  isLocked: boolean;
  children: React.ReactNode;
  title?: string;
  description?: string;
  priceLabel?: string; // 👈 Nova prop para o preço
  onUpgrade?: () => void;
}

export function PremiumLock({ 
  isLocked, 
  children, 
  title = "Recurso Premium", 
  description = "Faça o upgrade para o plano PRO para desbloquear análises avançadas e aumentar suas vendas.",
  priceLabel = "A partir de R$ 10,00/mês", // Valor padrão atualizado
  onUpgrade 
}: PremiumLockProps) {
  
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Conteúdo "Fundo" (Blur) */}
      <div className="filter blur-md opacity-50 select-none pointer-events-none aria-hidden overflow-hidden h-full">
        {children}
      </div>

      {/* O Overlay de Bloqueio */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center shadow-lg border-purple-100 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-purple-600" />
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
            {title} <Sparkles className="w-4 h-4 text-yellow-500" />
          </h3>
          
          <p className="text-slate-500 mb-6 text-sm leading-relaxed">
            {description}
          </p>

          <Button 
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-200"
          >
            Desbloquear Agora
          </Button>
          
          <p className="text-xs text-slate-400 mt-4">
            {priceLabel}. Cancele quando quiser.
          </p>
        </Card>
      </div>
    </div>
  );
}