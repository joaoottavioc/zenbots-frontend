"use client";

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/error-messages";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, MapPin, Copy, Clock, Bell, Timer, Phone, ImagePlus, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const dayScheduleSchema = z.object({
  active: z.boolean(),
  start: z.string(),
  end: z.string(),
});

// --- SCHEMA ATUALIZADO ---
export const formSchema = z.object({
  restaurant_name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }).max(100, { message: "Máximo de 100 caracteres." }),

  delivery_fee: z.coerce.number().min(0).max(500, { message: "Taxa máxima de R$ 500." }).optional(),
  min_order_value: z.coerce.number().min(0).max(10000, { message: "Valor máximo de R$ 10.000." }).optional(),

  // Campos de Localização
  cep: z.string().transform((val) => val.replace(/\D/g, "")).pipe(z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos.")),
  address: z.string().min(5, "Endereço obrigatório").max(200, { message: "Máximo de 200 caracteres." }),
  max_delivery_radius: z.coerce.number().min(1, "Mínimo 1km").max(100, { message: "Máximo de 100km." }).default(10),

  // Coordenadas (Opcionais pois são preenchidas pelo sistema)
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),

  is_open: z.boolean().default(false),
  closing_message: z.string().optional(),
  schedule: z.record(z.string(), dayScheduleSchema).optional(),

  // F-07: ETA
  default_delivery_time_minutes: z.coerce.number().min(1).max(180).optional().nullable(),
  default_pickup_time_minutes: z.coerce.number().min(1).max(180).optional().nullable(),

  // F-09: Owner notifications
  owner_notification_phone: z.string().max(20).optional().nullable(),

  // F-17: Cancellation window
  cancellation_window_minutes: z.coerce.number().min(0).max(30).default(5),
});

type BotFormValues = z.infer<typeof formSchema>;

interface BotFormProps {
  initialData?: Partial<BotFormValues> & { restaurant_image_url?: string | null };
  onSubmit: (values: BotFormValues, restaurantImage?: File) => void;
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
  const [bulkStart, setBulkStart] = useState("18:00");
  const [bulkEnd, setBulkEnd] = useState("23:00");
  const [restaurantImage, setRestaurantImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.restaurant_image_url ?? null
  );

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem (JPG, PNG, WebP).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo de 5MB.", variant: "destructive" });
      return;
    }

    setRestaurantImage(file);
    setImagePreview(URL.createObjectURL(file));
  }, [toast]);

  const handleRemoveImage = useCallback(() => {
    setRestaurantImage(null);
    setImagePreview(null);
  }, []);
  
  const getMergedSchedule = (savedSchedule: Record<string, { active: boolean; start: string; end: string }> | null | undefined) => {
    if (!savedSchedule || Object.keys(savedSchedule).length === 0) {
      return DEFAULT_SCHEDULE;
    }
    const merged: Record<string, { active: boolean; start: string; end: string }> = {};
    WEEKDAYS.forEach((day) => {
      merged[day.key] = savedSchedule[day.key] || { active: true, start: "18:00", end: "23:00" };
    });
    return merged;
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurant_name: initialData?.restaurant_name || "",
      delivery_fee: initialData?.delivery_fee ?? 0,
      min_order_value: initialData?.min_order_value ?? 0,
      cep: initialData?.cep || "",
      address: initialData?.address || "",
      max_delivery_radius: initialData?.max_delivery_radius || 10,
      latitude: initialData?.latitude || 0,
      longitude: initialData?.longitude || 0,
      is_open: initialData?.is_open ?? false,
      closing_message: initialData?.closing_message || "Olá! No momento estamos fechados. Nosso horário é das 18h às 23h. 🕒",
      schedule: getMergedSchedule(initialData?.schedule),
      default_delivery_time_minutes: initialData?.default_delivery_time_minutes ?? null,
      default_pickup_time_minutes: initialData?.default_pickup_time_minutes ?? null,
      owner_notification_phone: initialData?.owner_notification_phone ?? null,
      cancellation_window_minutes: initialData?.cancellation_window_minutes ?? 5,
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
      const response = await api.get(`/utils/lookup-cep/${cep}`);
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

    } catch (error: unknown) {
      // Tratamento para quando o CEP não existe na API
      const isNotFound = error instanceof Error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 404;
      const msg = isNotFound
        ? "CEP não encontrado na base de dados."
        : getSafeErrorMessage(error, "Falha ao buscar CEP.");

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
      <form onSubmit={form.handleSubmit((values) => onSubmit(values, restaurantImage ?? undefined))} className="space-y-8 w-full max-w-full">
        
        {/* GRUPO 1: DADOS BÁSICOS */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Dados Básicos</CardTitle>
            <CardDescription>Nome e configurações de entrega do seu bot.</CardDescription>
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

            {/* Foto do Restaurante */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Foto do Restaurante
              </label>
              <p className="text-xs text-muted-foreground">
                Aparece no cartão do bot e pode ser usada como foto do WhatsApp. JPG, PNG ou WebP, até 5MB.
              </p>
              {imagePreview ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200">
                  <Image
                    src={imagePreview}
                    alt="Preview da foto do restaurante"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-36 rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                  <ImagePlus className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-500">Clique para selecionar uma foto</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              )}
            </div>

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
                    <FormDescription className="text-xs">
                      Valor cobrado por entrega.
                    </FormDescription>
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
                <div className="flex gap-2 items-end">
                    <FormField
                        control={form.control}
                        name="cep"
                        render={({ field }) => (
                            <FormItem className="w-44">
                                <FormLabel>CEP da Loja</FormLabel>
                                <FormControl>
                                    <Input placeholder="00000-000" {...field} className="bg-white" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCepSearch}
                        disabled={isLoadingCep}
                        className="shrink-0"
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
                                        value={(field.value as number) ?? 10}
                                        className="bg-white max-w-[200px]"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">km</span>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Separator />

                {/* Coordenadas GPS */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Coordenadas GPS</span>
                        {form.watch("latitude") !== 0 ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
                                Ativo
                            </Badge>
                        ) : form.watch("address") !== "" ? (
                            <Badge variant="destructive" className="text-[10px]">
                                Pendente
                            </Badge>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            disabled
                            value={String(form.watch("latitude") || "")}
                            placeholder="Latitude"
                            className="bg-slate-100 text-xs font-mono"
                        />
                        <Input
                            disabled
                            value={String(form.watch("longitude") || "")}
                            placeholder="Longitude"
                            className="bg-slate-100 text-xs font-mono"
                        />
                    </div>
                    {form.watch("latitude") === 0 && form.watch("address") !== "" && (
                        <p className="text-xs text-destructive">
                            Busque o CEP novamente para obter as coordenadas.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* GRUPO 2: HORÁRIOS */}
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

            {/* Aplicar horário em massa */}
            <div className={`border rounded-lg p-3 bg-slate-50 space-y-3 ${!isOpen ? "opacity-60 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Clock className="h-4 w-4" />
                Aplicar horário a todos os dias
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="time"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                  className="w-[110px] text-center text-sm bg-white"
                />
                <span className="text-xs text-slate-400">até</span>
                <Input
                  type="time"
                  value={bulkEnd}
                  onChange={(e) => setBulkEnd(e.target.value)}
                  className="w-[110px] text-center text-sm bg-white"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    WEEKDAYS.forEach((day) => {
                      form.setValue(`schedule.${day.key}.active`, true);
                      form.setValue(`schedule.${day.key}.start`, bulkStart);
                      form.setValue(`schedule.${day.key}.end`, bulkEnd);
                    });
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Aplicar
                </Button>
              </div>
            </div>

            {/* Lista de horários por dia */}
            <div className={`border rounded-lg divide-y w-full overflow-hidden ${!isOpen ? "opacity-60 pointer-events-none" : ""}`}>
              {WEEKDAYS.map((day) => {
                const dayActive = form.watch(`schedule.${day.key}.active`);
                return (
                  <div
                    key={day.key}
                    className={`flex flex-wrap items-center justify-between p-3 gap-y-2 transition-colors ${dayActive ? "hover:bg-slate-50" : "bg-slate-50/50"}`}
                  >
                    <FormField
                      control={form.control}
                      name={`schedule.${day.key}.active`}
                      render={({ field }) => (
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!isOpen}
                              className="data-[state=checked]:bg-emerald-500 shrink-0"
                            />
                          </FormControl>
                          <span className={`font-medium text-sm ${field.value ? "text-slate-900" : "text-slate-400 line-through"}`}>
                            {day.label}
                          </span>
                        </div>
                      )}
                    />

                    <div className={`flex items-center gap-3 ml-auto transition-opacity ${dayActive ? "" : "opacity-40 pointer-events-none"}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 hidden sm:inline">Abre</span>
                        <FormField
                          control={form.control}
                          name={`schedule.${day.key}.start`}
                          render={({ field }) => (
                            <Input
                              type="time"
                              {...field}
                              className="w-[100px] text-center text-sm"
                              disabled={!isOpen || !dayActive}
                            />
                          )}
                        />
                      </div>
                      <span className="text-xs text-slate-400">-</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 hidden sm:inline">Fecha</span>
                        <FormField
                          control={form.control}
                          name={`schedule.${day.key}.end`}
                          render={({ field }) => (
                            <Input
                              type="time"
                              {...field}
                              className="w-[100px] text-center text-sm"
                              disabled={!isOpen || !dayActive}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* GRUPO 3: TEMPO DE PREPARO E ENTREGA */}
        <Card className="overflow-hidden border-amber-100 bg-amber-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-600" />
              Tempo Estimado (ETA)
            </CardTitle>
            <CardDescription>
              Previsão de tempo enviada ao cliente após confirmar o pedido.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_delivery_time_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo de Entrega (min)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Ex: 45"
                          {...field}
                          value={field.value != null ? String(field.value) : ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          className="bg-white max-w-[200px]"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">min</span>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Deixe vazio para não informar.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_pickup_time_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo de Retirada (min)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Ex: 20"
                          {...field}
                          value={field.value != null ? String(field.value) : ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          className="bg-white max-w-[200px]"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">min</span>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Deixe vazio para não informar.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* GRUPO 4: NOTIFICAÇÕES E CANCELAMENTO */}
        <Card className="overflow-hidden border-emerald-100 bg-emerald-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-600" />
              Notificações e Pedidos
            </CardTitle>
            <CardDescription>
              Receba alertas de novos pedidos e configure o cancelamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="owner_notification_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    WhatsApp para Notificações
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="5511999999999"
                      {...field}
                      value={field.value != null ? String(field.value) : ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                      className="bg-white max-w-[280px]"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Número com DDD para receber aviso de cada novo pedido. Deixe vazio para desativar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="cancellation_window_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Janela de Cancelamento (min)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        {...field}
                        value={field.value != null ? String(field.value) : "5"}
                        className="bg-white max-w-[200px]"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400">min</span>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Tempo que o cliente pode cancelar pelo WhatsApp após fazer o pedido. 0 = sem cancelamento.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-4">
          <Button
            type="submit"
            size="lg"
            variant="brand"
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