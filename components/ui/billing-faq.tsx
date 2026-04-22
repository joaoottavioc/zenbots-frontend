"use client";

import type { ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface BillingFAQItem {
  id: string;
  question: string;
  answer: ReactNode;
}

export interface BillingFAQProps {
  items: BillingFAQItem[];
  title?: string;
}

export function BillingFAQ({ items, title = "Perguntas frequentes" }: BillingFAQProps) {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <Accordion type="single" collapsible className="w-full">
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <div className="text-slate-600">{item.answer}</div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export const USAGE_PAGE_FAQ_ITEMS: BillingFAQItem[] = [
  {
    id: "limit",
    question: "Como funciona o limite do plano Grátis?",
    answer: (
      <p>
        Você pode processar até 15 pedidos concluídos por mês sem custo. A partir do 16º pedido,
        cobramos R$ 1,39 por pedido adicional. O contador zera todo dia 1º e o histórico continua
        visível no painel de pedidos normalmente.
      </p>
    ),
  },
  {
    id: "cancel",
    question: "Posso cancelar quando quiser?",
    answer: (
      <p>
        Sim. O plano Pro mensal pode ser cancelado a qualquer momento — você continua no Pro até o
        fim do ciclo já pago, e depois volta automaticamente para o Grátis. O plano anual é não
        reembolsável, mas também não renova se você cancelar antes.
      </p>
    ),
  },
  {
    id: "no-upgrade",
    question: "O que acontece com meus pedidos se eu não atualizar?",
    answer: (
      <p>
        Nada é bloqueado: seu bot continua atendendo normalmente. Os pedidos acima do limite
        entram como excedentes a R$ 1,39 cada, somados no fim do mês. O painel mostra em tempo real
        quanto você já acumulou e quanto pode chegar se continuar nesse ritmo.
      </p>
    ),
  },
  {
    id: "fair-use",
    question: "O que é o fair-use de 5.000 pedidos do Pro?",
    answer: (
      <p>
        O Pro é ilimitado para a enorme maioria dos restaurantes. Acima de 5.000 pedidos no mês,
        entramos em contato para desenhar um plano sob medida — sem surpresa na fatura.
      </p>
    ),
  },
];
