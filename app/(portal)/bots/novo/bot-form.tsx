"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api'; // Necessário para buscar o CEP
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from "@/components/ui/switch"; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, MapPin } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const dayScheduleSchema = z.object({
  active: z.boolean(),
  start: z.string(),
  end: z.string(),
});

// --- SCHEMA ATUALIZADO ---
const formSchema = z.object({
  restaurant_name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  whatsapp_number: z.string().min(10, { message: "Digite o número completo com DDD." }),
  pix_key: z.string().min(5, { message: "A chave PIX é necessária para receber pagamentos." }),
  
  delivery_fee: z.coerce.number().min(0).optional(),
  min_order_value: z.coerce.number().min(0).optional(),

  // Novos Campos de Localização
  cep: z.string().min(8, "CEP inválido"),
  address: z.string().min(5, "Endereço obrigatório"),
  max_delivery_radius: z.coerce.number().min(1, "Mínimo 1km").default(10),
  
  // Coordenadas (Opcionais pois são preenchidas pelo sistema)
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),

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

const DEFAULT_SCHEDULE = WEEKDAYS.reduce(
  (acc, day) => ({
    ...acc,
    [day.key]: { active: true, start: "18:00", end: "23:00" },
  }),
  {} as Record<string, z.infer<typeof dayScheduleSchema>>
);

export function BotForm({ initialData, onSubmit, isPending }: BotFormProps) {
  const { toast } = useToast();
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  const getMergedSchedule = (savedSchedule: any) => {
    if (!savedSchedule || Object.keys(savedSchedule).length === 0) {
      return DEFAULT_SCHEDULE;
    }
    const merged: any = {};
    WEEKDAYS.forEach((day) => {
      merged[day.key] = savedSchedule[day.key] || { active: true, start: "18:00", end: "23:00" };
    });
    return merged;
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurant_name: initialData?.restaurant_name || "",
      whatsapp_number: initialData?.whatsapp_number || "",
      pix_key: initialData?.pix_key || "",
      delivery_fee: initialData?.delivery_fee ?? 0,
      min_order_value: initialData?.min_order_value ?? 0,
      
      // Defaults novos
      cep: initialData?.cep || "",
      address: initialData?.address || "",
      max_delivery_radius: initialData?.max_delivery_radius || 10,
      latitude: initialData?.latitude || 0,
      longitude: initialData?.longitude || 0,

      whatsapp_token: initialData?.whatsapp_token || "",
      phone_number_id: initialData?.phone_number_id || "",
      is_open: initialData?.is_open ?? true,
      closing_message: initialData?.closing_message || "Olá! No momento estamos fechados. Nosso horário é das 18h às 23h. 🕒",
      schedule: getMergedSchedule(initialData?.schedule),
    },
  });

  const isOpen = form.watch("is_open");

  // --- BUSCA DE CEP ---
  const handleCepSearch = async () => {
    const cep = form.getValues("cep")?.replace(/\D/g, "");
    
    if (!cep || cep.length !== 8) {
      toast({ title: "CEP inválido", description: "Digite os 8 números.", variant: "destructive" });
      return;
    }

    setIsLoadingCep(true);
    try {
      const response = await api.get(`${API_BASE}/utils/lookup-cep/${cep}`);
      const data = response.data;

      // 1. Montagem Inteligente do Endereço
      // O backend retorna partes separadas, aqui juntamos para facilitar para o usuário
      const parts = [
        data.street,
        data.neighborhood,
        data.city && data.state ? `${data.city} - ${data.state}` : ""
      ].filter(Boolean); // Remove campos vazios/null

      const formattedAddress = parts.join(", ");
      
      // Se a string montada for muito curta, algo deu errado, mas salvamos o que veio
      form.setValue("address", formattedAddress || "");

      // 2. Mapeamento de Coordenadas (lat/lng do backend -> latitude/longitude do form)
      // O utils.py retorna chaves curtas: 'lat' e 'lng'
      if (data.lat && data.lng) {
        form.setValue("latitude", data.lat);
        form.setValue("longitude", data.lng);
        toast({ 
            title: "Localização Exata Encontrada! 🎯", 
            description: "Coordenadas GPS atualizadas com sucesso." 
        });
      } else {
        // Fallback: Zera coordenadas se não achou, mas mantém o endereço textual
        form.setValue("latitude", 0);
        form.setValue("longitude", 0);
        
        toast({ 
            title: "Endereço encontrado (Sem GPS)", 
            description: "Achamos a rua, mas não a latitude exata. O cálculo de raio pode falhar.", 
            className: "bg-yellow-50 border-yellow-200 text-yellow-800" 
        });
      }

    } catch (error: any) {
      console.error("Erro CEP:", error);
      // Tratamento para quando o CEP não existe na API
      const msg = error.response?.status === 404 
        ? "CEP não encontrado na base de dados." 
        : (error.response?.data?.detail || "Falha ao buscar CEP.");
        
      toast({ title: "Erro na busca", description: msg, variant: "destructive" });
      
      // Opcional: Limpar campos se der erro
      // form.setValue("address", "");
      // form.setValue("latitude", 0);
      // form.setValue("longitude", 0);

    } finally {
      setIsLoadingCep(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-full">
        
        {/* GRUPO 1: DADOS BÁSICOS */}
        <Card className="overflow-hidden">
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
                    <Input placeholder="Ex: Pizzaria do João" {...field} className="w-full" />
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
                    <Input placeholder="Ex: 11999998888" type="tel" {...field} className="w-full" />
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
                    <Input placeholder="CPF/Email..." {...field} className="w-full" />
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
                        value={typeof field.value === "string" || typeof field.value === "number" ? field.value : ''} // Fix para evitar erro de uncontrolled input
                        className="w-full"
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
                        value={typeof field.value === "string" || typeof field.value === "number" ? field.value : ''} // Fix para evitar erro de uncontrolled input
                        className="w-full"
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

        {/* --- NOVO GRUPO: LOCALIZAÇÃO --- */}
        <Card className="overflow-hidden border-blue-100 bg-blue-50/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Localização e Entrega
                </CardTitle>
                <CardDescription>
                    Usado para calcular a distância do cliente até você.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                
                {/* Busca de CEP */}
                <div className="flex gap-4 items-end">
                    <FormField
                        control={form.control}
                        name="cep"
                        render={({ field }) => (
                            <FormItem className="w-[180px]">
                                <FormLabel>CEP Loja</FormLabel>
                                <FormControl>
                                    <Input placeholder="00000-000" {...field} className="bg-white" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleCepSearch} 
                        disabled={isLoadingCep}
                        className="mb-2 bg-white border border-slate-200 hover:bg-slate-50"
                    >
                        {isLoadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>

                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Endereço Completo</FormLabel>
                            <FormControl>
                                <Input placeholder="Rua, Bairro, Cidade..." {...field} className="bg-white" />
                            </FormControl>
                            <FormDescription>Preenchido automaticamente pelo CEP.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="max_delivery_radius"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Raio de Entrega (KM)</FormLabel>
                            <FormControl>
                                 <div className="relative">
                                    <Input 
                                        type="number" 
                                        step="0.5" 
                                        {...field}
                                        value={(field.value as number) ?? 10} // Valor padrão visual
                                        className="pl-3 bg-white" 
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">km</span>
                                 </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Visualização de Coordenadas */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium leading-none">
                                      Coordenadas GPS
                        </span>
                    {/* Indicador visual se tem lat/long válida */}
                    {form.watch("latitude") !== 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                          ATIVO
                      </span>
                      )}
                    </div>
                      <div className="flex gap-2 mt-2">
                        <Input 
                          disabled 
                          value={String(form.watch("latitude") || "")} 
                          placeholder="Latitude" 
                          className="bg-slate-100 text-xs h-9 font-mono" 
                        />
                        <Input 
                          disabled 
                          value={String(form.watch("longitude") || "")} 
                          placeholder="Longitude" 
                          className="bg-slate-100 text-xs h-9 font-mono" 
                         />
                      </div>
                        {form.watch("latitude") === 0 && form.watch("address") !== "" && (
                        <span className="text-[10px] text-red-500 font-medium">
                        ⚠️ Necessário para cálculo de raio
                        </span>
                         )}
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* GRUPO 2: INTEGRAÇÃO WHATSAPP */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Integração WhatsApp</CardTitle>
            <CardDescription>
              Dados da Meta (Facebook Developers).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="whatsapp_token"
              render={({ field }) => (
                <FormItem className="w-full min-w-0">
                  <FormLabel>WhatsApp Token</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Token..."
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number_id"
              render={({ field }) => (
                <FormItem className="w-full min-w-0">
                  <FormLabel>Phone Number ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 123456789..."
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* GRUPO 3: HORÁRIOS */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Horários Automáticos</CardTitle>
            <CardDescription>
              Defina quando o bot deve atender.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="is_open"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between border rounded-lg px-4 py-3">
                  <div className="space-y-0.5">
                    <FormLabel className="font-medium">Bot Ativo</FormLabel>
                    <FormDescription className="text-xs">
                      Desligar = Mensagem de Fechado.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closing_message"
              render={({ field }) => (
                <FormItem className="w-full min-w-0">
                  <FormLabel>Mensagem de Fechamento</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Estamos fechados..."
                      {...field}
                      disabled={!isOpen}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* LISTA DE HORÁRIOS COM WRAP AUTOMÁTICO */}
            <div className={`border rounded-lg divide-y w-full overflow-hidden ${!isOpen ? "opacity-60 pointer-events-none" : ""}`}>
              {WEEKDAYS.map((day) => (
                <div
                  key={day.key}
                  className="flex flex-wrap items-center justify-between p-3 sm:p-4 hover:bg-slate-50 gap-y-3 w-full"
                >
                  <FormField
                    control={form.control}
                    name={`schedule.${day.key}.active`}
                    render={({ field }) => (
                      <div className="flex items-center gap-3 mr-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isOpen}
                            className="data-[state=checked]:bg-emerald-500 shrink-0"
                          />
                        </FormControl>
                        <span className={`font-medium text-sm ${field.value ? "text-slate-900" : "text-slate-400"}`}>
                          {day.label}
                        </span>
                      </div>
                    )}
                  />

                  <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                    <FormField
                      control={form.control}
                      name={`schedule.${day.key}.start`}
                      render={({ field }) => (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase text-slate-500 font-bold">Abre</span>
                          <Input
                            type="time"
                            {...field}
                            className="w-20 text-center h-9 text-sm px-1"
                            disabled={!isOpen || !form.watch(`schedule.${day.key}.active`)}
                          />
                        </div>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`schedule.${day.key}.end`}
                      render={({ field }) => (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase text-slate-500 font-bold">Fecha</span>
                          <Input
                            type="time"
                            {...field}
                            className="w-20 text-center h-9 text-sm px-1"
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

        <div className="flex justify-end gap-4 pb-4">
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