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
import { Plus, X, Tag, DollarSign, Package } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: "Mínimo 2 caracteres." }),
  description: z.string().optional(),
  price: z.coerce.number().positive({ message: "Valor inválido." }),
  category: z.string().min(1, { message: "Categoria obrigatória." }),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  onSubmit: (values: ProductFormValues) => void;
  isPending: boolean;
  categories: string[];
}

export function ProductForm({ onSubmit, isPending, categories }: ProductFormProps) {
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(categories.length === 0);

  // CORREÇÃO 1: Removemos <ProductFormValues> para deixar o Zod inferir a tipagem correta do coerce
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      name: "", 
      description: "", 
      price: 0, 
      category: "" 
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        
        {/* NOME */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Item</FormLabel>
              <FormControl>
                <div className="relative">
                  <Package className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input placeholder="Ex: X-Bacon Artesanal" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* GRID: PREÇO E CATEGORIA */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (R$)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    {/* CORREÇÃO 2: Passagem manual de props para evitar conflito de tipagem no {...field} */}
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      className="pl-9" 
                      name={field.name}
                      onBlur={field.onBlur}
                      disabled={field.disabled}
                      ref={field.ref}
                      value={field.value as number}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center h-6 mb-2">
                  <FormLabel className="m-0">Categoria</FormLabel>
                  {!isCreatingNewCategory && categories.length > 0 ? (
                    <button type="button" onClick={() => { setIsCreatingNewCategory(true); field.onChange(""); }} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center uppercase tracking-wide">
                      <Plus className="w-3 h-3 mr-1" /> Nova
                    </button>
                  ) : (
                     categories.length > 0 && (
                      <button type="button" onClick={() => { setIsCreatingNewCategory(false); field.onChange(""); }} className="text-[10px] text-slate-500 font-bold hover:underline flex items-center uppercase tracking-wide">
                        <X className="w-3 h-3 mr-1" /> Cancelar
                      </button>
                     )
                  )}
                </div>
                <FormControl>
                  {isCreatingNewCategory ? (
                    <div className="relative animate-in fade-in zoom-in-95 duration-200">
                        <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Nova categoria..." className="pl-9" {...field} autoFocus />
                    </div>
                  ) : (
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* DESCRIÇÃO */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição <span className="text-slate-400 font-normal ml-1">(Ingredientes)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Ex: Pão brioche, blend 180g, queijo cheddar..." className="resize-none h-20" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold">
          {isPending ? "Salvando..." : "Salvar Produto"}
        </Button>
      </form>
    </Form>
  );
}