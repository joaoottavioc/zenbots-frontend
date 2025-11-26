// app/(portal)/produtos/product-form.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// 1. Definição do Schema
const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  description: z.string().optional(),
  price: z.coerce.number().positive({
    message: "O preço deve ser um número positivo.",
  }),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  onSubmit: (values: ProductFormValues) => void;
  isPending: boolean;
}

export function ProductForm({ onSubmit, isPending }: ProductFormProps) {
  // 2. useForm sem tipagem genérica estrita (para evitar o conflito do zodResolver)
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Campo: Nome */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Produto</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Pizza Calabresa" 
                  {...field} 
                  // ▼▼▼ CORREÇÃO: Garantimos que é string ▼▼▼
                  value={(field.value as string) ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo: Descrição */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Molho de tomate, queijo mussarela, calabresa..."
                  {...field}
                  // ▼▼▼ CORREÇÃO: Garantimos que é string ▼▼▼
                  value={(field.value as string) ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo: Preço */}
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preço</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Ex: 45.50" 
                  {...field}
                  // ▼▼▼ CORREÇÃO: Garantimos que é number ou string vazia ▼▼▼
                  value={(field.value as number) ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Salvando..." : "Salvar Produto"}
        </Button>
      </form>
    </Form>
  );
}