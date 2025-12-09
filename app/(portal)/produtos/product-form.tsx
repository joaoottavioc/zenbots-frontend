// app/(portal)/produtos/product-form.tsx
"use client";

import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, X } from 'lucide-react';

// 1. Schema
const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  description: z.string().optional(),
  price: z.coerce.number().positive({
    message: "O preço deve ser um número positivo.",
  }),
  category: z.string().min(1, { message: "A categoria é obrigatória." }),
});

type ProductFormValues = z.infer<typeof formSchema>;

// 2. Atualizamos a interface para receber as categorias
interface ProductFormProps {
  onSubmit: (values: ProductFormValues) => void;
  isPending: boolean;
  categories: string[]; // <-- Nova prop
}

export function ProductForm({ onSubmit, isPending, categories }: ProductFormProps) {
  // Estado para controlar se o usuário está criando uma nova categoria manualmente
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(categories.length === 0);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Campo: Categoria (Lógica Híbrida Select/Input) */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex justify-between items-center">
                Categoria
                {/* Botãozinho para alternar entre Select e Input */}
                {!isCreatingNewCategory && categories.length > 0 && (
                   <span 
                     className="text-xs text-blue-600 cursor-pointer hover:underline flex items-center gap-1"
                     onClick={() => {
                        setIsCreatingNewCategory(true);
                        field.onChange(""); // Limpa o valor ao trocar
                     }}
                   >
                     <PlusCircle className="w-3 h-3" /> Nova
                   </span>
                )}
                {isCreatingNewCategory && categories.length > 0 && (
                   <span 
                     className="text-xs text-gray-500 cursor-pointer hover:underline flex items-center gap-1"
                     onClick={() => {
                        setIsCreatingNewCategory(false);
                        field.onChange("");
                     }}
                   >
                     <X className="w-3 h-3" /> Cancelar
                   </span>
                )}
              </FormLabel>
              <FormControl>
                {isCreatingNewCategory ? (
                    // Modo INPUT (Criar Nova)
                    <Input 
                      placeholder="Ex: Sobremesas, Bebidas..." 
                      {...field} 
                      value={(field.value as string) ?? ''}
                      autoFocus // Foca automaticamente ao clicar em "Nova"
                    />
                ) : (
                    // Modo SELECT (Escolher Existente)
                    <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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