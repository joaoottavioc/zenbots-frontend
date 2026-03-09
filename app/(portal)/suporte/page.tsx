"use client";

import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  MessageCircle,
  Mail,
  HelpCircle,
  Bot,
  CreditCard,
  ShoppingBag,
  Settings,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/layout/page-container";

const faqItems = [
  {
    category: "whatsapp",
    question: "Como conecto meu WhatsApp ao bot?",
    answer:
      'Acesse a página "Meus BotZ", clique no bot desejado e selecione "Conectar WhatsApp". Siga o fluxo de login com sua conta Meta/Facebook. Após a autorização, o número será vinculado automaticamente.',
  },
  {
    category: "whatsapp",
    question: "O bot parou de responder no WhatsApp. O que faço?",
    answer:
      'Verifique se a conexão com o WhatsApp está ativa na página do bot. Caso esteja desconectado, reconecte pelo fluxo de login. Se o problema persistir, entre em contato com nosso suporte.',
  },
  {
    category: "pedidos",
    question: "A taxa de entrega não está aparecendo para o cliente.",
    answer:
      'Verifique a configuração do seu Bot. Se o valor estiver como R$ 0,00, o sistema entende como "Entrega Grátis". A taxa só é exibida quando o cliente escolhe a opção "Entrega" no fluxo de conversa.',
  },
  {
    category: "pedidos",
    question: "Como cancelo um pedido já confirmado?",
    answer:
      'Na página "Pedidos", localize o pedido e clique no botão "Cancelar". O cliente será notificado automaticamente via WhatsApp. Se o pagamento já foi realizado via PIX, o estorno deve ser feito manualmente pelo painel do Mercado Pago.',
  },
  {
    category: "pagamentos",
    question: "Como funciona o estorno de PIX?",
    answer:
      "O ZenBotZ processa pagamentos, mas o estorno deve ser feito diretamente no painel do Mercado Pago. O sistema apenas registra se o pagamento foi aprovado ou estornado.",
  },
  {
    category: "pagamentos",
    question: "Como integro minha conta do Mercado Pago?",
    answer:
      'Acesse "Integração Pix" no menu lateral e clique em "Conectar Mercado Pago". Você será redirecionado para autorizar o acesso. Após isso, seus pagamentos PIX serão processados automaticamente.',
  },
  {
    category: "produtos",
    question: "Posso alterar o cardápio em massa?",
    answer:
      'Sim. Na aba "Produtos", utilize a função de importar cardápio para subir um arquivo atualizado. Para ajustes pontuais de preço ou disponibilidade, edite diretamente na listagem de produtos.',
  },
  {
    category: "conta",
    question: "Como altero minha senha?",
    answer:
      'Vá em "Configurações" > "Segurança" e preencha sua senha atual junto com a nova senha. A nova senha precisa ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
  },
];

const categories = [
  { key: "all", label: "Todas", icon: HelpCircle },
  { key: "whatsapp", label: "WhatsApp", icon: Bot },
  { key: "pedidos", label: "Pedidos", icon: ShoppingBag },
  { key: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { key: "conta", label: "Conta", icon: Settings },
];

export default function SuportePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const supportWhatsApp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

  const filtered = faqItems.filter((item) => {
    const matchesCategory =
      activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      !search ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <PageContainer>
      <PageHeader
        title="Suporte"
        description="Encontre respostas rápidas ou fale com nosso time."
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar nas perguntas frequentes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 text-sm"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat.key)}
            className="gap-1.5"
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* FAQ */}
      <Card className="shadow-sm border-slate-200 mb-8">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            Perguntas Frequentes
          </CardTitle>
          <CardDescription className="text-xs">
            {filtered.length === 0
              ? "Nenhum resultado encontrado."
              : `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {filtered.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {filtered.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="hover:no-underline text-sm text-slate-700 hover:text-slate-900 text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Tente buscar por outro termo ou entre em contato conosco.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Contact section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                WhatsApp
              </p>
              <p className="text-xs text-muted-foreground">
                Resposta em minutos no horário comercial.
              </p>
            </div>
            {supportWhatsApp ? (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                asChild
              >
                <a
                  href={`https://wa.me/${supportWhatsApp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Conversar
                </a>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled
              >
                Indisponível
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">E-mail</p>
              <p className="text-xs text-muted-foreground">
                Para assuntos detalhados ou documentação.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              asChild
            >
              <a href="mailto:suporte@zenbotz.com.br">Enviar</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
