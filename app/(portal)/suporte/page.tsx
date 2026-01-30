"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { 
    LifeBuoy, 
    Mail, 
    MessageCircle, 
    FileText, 
    ExternalLink, 
    Youtube, 
    Activity,
    CheckCircle2
} from 'lucide-react';

// Schema de validação
const supportFormSchema = z.object({
  subject: z.string().min(5, "O assunto deve ser mais detalhado."),
  message: z.string().min(20, "Por favor, descreva melhor seu problema (mínimo 20 caracteres)."),
});

export default function SuportePage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof supportFormSchema>>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof supportFormSchema>) {
    setIsSubmitting(true);
    // Simulação de delay de rede
    setTimeout(() => {
        setIsSubmitting(false);
        toast({ 
            title: "Chamado #10234 aberto! 🎫", 
            description: "Recebemos sua solicitação. Resposta estimada: 4 horas.",
            className: "bg-emerald-600 text-white border-emerald-500"
        });
        form.reset({ subject: "", message: "" });
    }, 1500);
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* --- 1. TOOLBAR DA PÁGINA (Padrão Profissional) --- */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
        
        {/* Lado Esquerdo: Título */}
        <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-50 rounded-lg">
                <LifeBuoy className="h-6 w-6 text-blue-600" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Central de Ajuda</h2>
                <p className="text-xs text-slate-500 font-medium">Suporte técnico e documentação</p>
            </div>
        </div>
        
        {/* Lado Direito: Link Externo */}
        <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" className="hidden md:flex gap-2 text-slate-600">
                <FileText className="w-4 h-4" /> 
                Manual do Usuário
                <ExternalLink className="w-3 h-3 opacity-50" />
            </Button>
        </div>
      </div>

      {/* --- 2. CARDS DE ACESSO RÁPIDO (Quick Actions) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 bg-white">
              <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                      <Youtube className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                      <p className="font-bold text-slate-700">Tutoriais em Vídeo</p>
                      <p className="text-xs text-slate-500">Aprenda a configurar seu bot</p>
                  </div>
              </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 bg-white">
              <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-full">
                      <Activity className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                      <p className="font-bold text-slate-700">Status do Sistema</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                          Todos serviços operacionais
                      </p>
                  </div>
              </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 bg-white">
              <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                      <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                      <p className="font-bold text-slate-700">API Documentation</p>
                      <p className="text-xs text-slate-500">Para desenvolvedores</p>
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* --- 3. CONTEÚDO PRINCIPAL (Grid Assimétrico) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: FAQ (Ocupa 7 colunas em telas grandes) */}
        <div className="lg:col-span-7 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-slate-400" />
                Dúvidas Comuns
            </h3>
            
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-b px-4">
                            <AccordionTrigger className="hover:no-underline hover:text-blue-600 text-slate-700 py-4">
                                Como conecto meu WhatsApp?
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-500 leading-relaxed pb-4">
                                Vá até a aba <strong>Configurações</strong>, clique em "Conexão WhatsApp" e escaneie o QR Code ou insira o Token da Meta. Se precisar de ajuda com o Embedded Signup, consulte o manual.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2" className="border-b px-4">
                            <AccordionTrigger className="hover:no-underline hover:text-blue-600 text-slate-700 py-4">
                                A taxa de entrega não está aparecendo.
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-500 leading-relaxed pb-4">
                                Verifique a configuração do seu Bot. Se o valor for R$ 0,00, o sistema entende como "Entrega Grátis". Além disso, a taxa só é somada quando o cliente seleciona explicitamente a opção "Entrega" no fluxo de conversa.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="border-b px-4">
                            <AccordionTrigger className="hover:no-underline hover:text-blue-600 text-slate-700 py-4">
                                Como funciona o estorno de PIX?
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-500 leading-relaxed pb-4">
                                O ZenBotZ processa pagamentos, mas o estorno deve ser feito diretamente no painel do seu banco ou Mercado Pago. O sistema apenas registra se o pagamento foi "Approved" ou "Refunded".
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4" className="border-none px-4">
                            <AccordionTrigger className="hover:no-underline hover:text-blue-600 text-slate-700 py-4">
                                Posso alterar o cardápio em massa?
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-500 leading-relaxed pb-4">
                                Sim. Utilize a função "Importar Cardápio" para subir um PDF novo. O sistema detectará as mudanças. Para ajustes pontuais de preço, utilize a aba "Produtos".
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>

        {/* COLUNA DIREITA: FORMULÁRIO (Ocupa 5 colunas) */}
        <div className="lg:col-span-5">
            <Card className="border-slate-200 shadow-md sticky top-4">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Mail className="w-4 h-4 text-blue-600" />
                        Ticket de Suporte
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Problemas técnicos? Nosso time responde rápido.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase text-slate-500">Assunto</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Resumo do problema..." {...field} className="bg-slate-50" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase text-slate-500">Detalhes</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Descreva o que aconteceu, passos para reproduzir, etc..." 
                                                className="min-h-[140px] bg-slate-50 resize-none"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <Button 
                                type="submit" 
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-lg shadow-slate-200"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Enviando..." : "Abrir Chamado"}
                            </Button>
                        </form>
                    </Form>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                         <p className="text-xs text-slate-400 mb-2">Precisa de urgência?</p>
                         <a href="#" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-bold hover:underline transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            Chat via WhatsApp
                         </a>
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}