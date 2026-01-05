"use client";

import React from 'react';
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
import { LifeBuoy, Mail, MessageCircle, FileText } from 'lucide-react';

const supportFormSchema = z.object({
  subject: z.string().min(5, "O assunto deve ser mais detalhado."),
  message: z.string().min(20, "Por favor, descreva melhor seu problema (mínimo 20 caracteres)."),
});

export default function SuportePage() {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof supportFormSchema>>({
    resolver: zodResolver(supportFormSchema),
    // ▼▼▼ ADICIONE ESTAS LINHAS ▼▼▼
    defaultValues: {
      subject: "",
      message: "",
    },
    // ▲▲▲ FIM DA ADIÇÃO ▲▲▲
  });

  function onSubmit(values: z.infer<typeof supportFormSchema>) {
    console.log(values);
    // Simulação de envio
    setTimeout(() => {
        toast({ 
            title: "Chamado aberto! 🎫", 
            description: "Nossa equipe responderá em até 24h no seu email." 
        });
        form.reset({ subject: "", message: "" });
    }, 1000);
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <LifeBuoy className="h-8 w-8 text-blue-600" /> Central de Ajuda
            </h1>
            <p className="text-muted-foreground mt-1">
                Tire suas dúvidas ou fale com nosso time de sucesso.
            </p>
        </div>
        <Button variant="outline" className="gap-2">
            <FileText className="w-4 h-4" /> Ver Documentação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* COLUNA 1: FAQ (Perguntas Frequentes) */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Perguntas Frequentes</h2>
            
            <Accordion type="single" collapsible className="w-full bg-white rounded-lg border p-2 shadow-sm">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-slate-50 rounded">
                        Como conecto meu WhatsApp?
                    </AccordionTrigger>
                    <AccordionContent className="px-4 text-gray-600">
                        Vá até a aba "Meus Bots", clique em "Novo Bot" e insira o Token e o Phone ID fornecidos pelo painel da Meta for Developers.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-slate-50 rounded">
                        A taxa de entrega não está aparecendo. Por quê?
                    </AccordionTrigger>
                    <AccordionContent className="px-4 text-gray-600">
                        Verifique se você configurou o valor na edição do Bot. Se o valor for 0, o sistema pode ocultar ou mostrar como "Grátis". Lembre-se que o cliente precisa escolher "Entrega" para a taxa ser aplicada.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-slate-50 rounded">
                        Como funcionam os pagamentos via PIX?
                    </AccordionTrigger>
                    <AccordionContent className="px-4 text-gray-600">
                        O bot gera um código "Copia e Cola" automático usando a API do Mercado Pago. O status do pedido muda para "PAID" (Pago) automaticamente assim que o banco confirma a transação.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-slate-50 rounded">
                        Posso cadastrar produtos por foto?
                    </AccordionTrigger>
                    <AccordionContent className="px-4 text-gray-600">
                        Sim! Na tela de produtos, use o botão "Importar Cardápio". Você pode enviar um PDF ou uma foto do seu cardápio físico e nossa IA extrairá os itens.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>

        {/* COLUNA 2: FALE CONOSCO */}
        <div>
            <Card className="border-l-4 border-l-blue-500 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Abrir Chamado
                    </CardTitle>
                    <CardDescription>
                        Não achou a resposta? Mande uma mensagem para o suporte técnico.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assunto</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Erro ao cadastrar produto..." {...field} />
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
                                        <FormLabel>Mensagem</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Descreva o que aconteceu em detalhes..." 
                                                className="min-h-[120px]"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                                Enviar Mensagem
                            </Button>
                        </form>
                    </Form>
                    
                    <div className="mt-6 pt-6 border-t flex justify-center">
                         <a href="#" className="flex items-center gap-2 text-sm text-green-600 hover:underline font-semibold">
                            <MessageCircle className="w-4 h-4" />
                            Falar no WhatsApp Comercial
                         </a>
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}