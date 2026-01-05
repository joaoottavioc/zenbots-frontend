"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from "@/components/ui/switch"; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// define o schema de um dia:
const dayScheduleSchema = z.object({
  active: z.boolean(),
  start: z.string(),
  end: z.string(),
});

// agora o schema completo:
const formSchema = z.object({
  restaurant_name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  whatsapp_number: z.string().min(10, { message: "Digite o número completo com DDD." }),
  pix_key: z.string().min(5, { message: "A chave PIX é necessária para receber pagamentos." }),
  
  delivery_fee: z.coerce.number().min(0).optional(),
  min_order_value: z.coerce.number().min(0).optional(),

  whatsapp_token: z.string().min(10, { message: "Informe o token de acesso da API do WhatsApp." }),
  phone_number_id: z.string().min(5, { message: "Informe o phone_number_id da API do WhatsApp." }),

  is_open: z.boolean().default(true),
  closing_message: z.string().optional(),
  schedule: z.record(z.string(), dayScheduleSchema).optional(),
});

type BotFormValues = z.infer<typeof formSchema>;

interface BotFormProps {
  initialData?: Partial<BotFormValues>; 
  onSubmit: (values: BotFormValues) => void;
  isPending: boolean;
}

const WEEKDAYS = [
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terça" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

// ▼▼▼ CORREÇÃO 1: Constante de horário padrão definida fora para reuso ▼▼▼
const DEFAULT_SCHEDULE = WEEKDAYS.reduce(
  (acc, day) => ({
    ...acc,
    [day.key]: { active: true, start: "18:00", end: "23:00" },
  }),
  {} as Record<string, z.infer<typeof dayScheduleSchema>>
);

export function BotForm({ initialData, onSubmit, isPending }: BotFormProps) {
  
  // ▼▼▼ CORREÇÃO 2: Função auxiliar para mesclar dados salvos com o padrão ▼▼▼
  // Isso impede que dias faltantes no banco quebrem o formulário (undefined)
  const getMergedSchedule = (savedSchedule: any) => {
    if (!savedSchedule || Object.keys(savedSchedule).length === 0) {
      return DEFAULT_SCHEDULE;
    }
    const merged: any = {};
    WEEKDAYS.forEach((day) => {
      // Se o dia existir no salvo, usa ele. Se não, usa o padrão.
      merged[day.key] = savedSchedule[day.key] || { active: true, start: "18:00", end: "23:00" };
    });
    return merged;
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    // ▼▼▼ CORREÇÃO 3: Valores padrão blindados contra undefined/null ▼▼▼
    defaultValues: {
      restaurant_name: initialData?.restaurant_name || "",
      whatsapp_number: initialData?.whatsapp_number || "",
      pix_key: initialData?.pix_key || "",
      
      // Use ?? 0 para números, pois 0 é um valor falso em JS (|| 0 falharia se o valor fosse 0 real)
      delivery_fee: initialData?.delivery_fee ?? 0,
      min_order_value: initialData?.min_order_value ?? 0,

      whatsapp_token: initialData?.whatsapp_token || "",
      phone_number_id: initialData?.phone_number_id || "",

      is_open: initialData?.is_open ?? true,
      
      // Garante uma string vazia ou padrão se vier null
      closing_message: initialData?.closing_message || "Olá! No momento estamos fechados. Nosso horário é das 18h às 23h. 🕒",

      // Usa a função de merge para garantir a estrutura completa
      schedule: getMergedSchedule(initialData?.schedule),
    },
  });

  const isOpen = form.watch("is_open");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Grupo 1: Identidade e Financeiro */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Básicos</CardTitle>
            <CardDescription>Informações essenciais e financeiras do seu bot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="restaurant_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Restaurante</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pizzaria do João" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 11999998888" type="tel" {...field} />
                  </FormControl>
                  <FormDescription>Apenas números com DDD.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pix_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave PIX</FormLabel>
                  <FormControl>
                    <Input placeholder="CPF/Email..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="delivery_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Entrega (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={(field.value ?? 0) as number | string}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="min_order_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pedido Mínimo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={(field.value ?? 0) as number | string}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Deixe 0 para não ter mínimo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          </CardContent>
        </Card>

        {/* Grupo 2: Integração WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle>Integração WhatsApp</CardTitle>
            <CardDescription>
              Configure o token e o phone_number_id fornecidos pelo painel da Meta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="whatsapp_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Token</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Token de acesso da API do WhatsApp"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Copie o token de acesso do painel do WhatsApp Cloud API.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 123456789012345"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    ID do número de telefone configurado na Meta (phone_number_id).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Grupo 3: Horário de Funcionamento */}
        <Card>
          <CardHeader>
            <CardTitle>Horários Automáticos</CardTitle>
            <CardDescription>
              Defina quando o bot deve atender. Fora desse horário, ele enviará a mensagem de fechado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="is_open"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between border rounded-lg px-4 py-3">
                  <div>
                    <FormLabel className="font-medium">Bot Ativo</FormLabel>
                    <FormDescription>
                      Se desativado, o bot responderá sempre com a mensagem de fechamento.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closing_message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem de Fechamento</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Estamos fechados..."
                      {...field}
                      disabled={!isOpen}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={`border rounded-lg divide-y ${!isOpen ? "opacity-60 pointer-events-none" : ""}`}>
              {WEEKDAYS.map((day) => (
                <div
                  key={day.key}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <FormField
                    control={form.control}
                    name={`schedule.${day.key}.active`}
                    render={({ field }) => (
                      <div className="flex items-center gap-4 w-32">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isOpen}
                          />
                        </FormControl>
                        <span className={`font-medium ${field.value ? "text-gray-900" : "text-gray-400"}`}>
                          {day.label}
                        </span>
                      </div>
                    )}
                  />

                  <div className="flex items-center gap-4">
                    <FormField
                      control={form.control}
                      name={`schedule.${day.key}.start`}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Abre</span>
                          <Input
                            type="time"
                            {...field}
                            className="w-28"
                            disabled={!isOpen || !form.watch(`schedule.${day.key}.active`)}
                          />
                        </div>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`schedule.${day.key}.end`}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Fecha</span>
                          <Input
                            type="time"
                            {...field}
                            className="w-28"
                            disabled={!isOpen || !form.watch(`schedule.${day.key}.active`)}
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="w-full md:w-auto"
          >
            {isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}