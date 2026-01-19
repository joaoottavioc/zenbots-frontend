"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { Plus, Trash2, Pencil, Check, X, Package } from 'lucide-react'; 
import * as z from 'zod'; 

// --- Imports de Componentes Locais ---
import { ProductForm } from './product-form';
import { MenuImportDialog } from './menu-import-dialog';
import { BotSelector } from '@/components/ui/bot-selector'; 

// --- Imports Shadcn ---
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch"; 
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// --- Tipos e Interfaces ---
interface Product {
  id: number;
  name: string;
  price: number;
  description: string | null;
  is_available: boolean;
  category: string; 
}

interface EditData { name: string; description: string; price: number; }

const formSchema = z.object({
  name: z.string().min(2), 
  description: z.string().optional(), 
  price: z.coerce.number().positive(), 
  category: z.string().min(1),
});

type ProductFormValues = z.infer<typeof formSchema>;

// Palavras-chave para identificar categorias que devem ir para o final
const BOTTOM_KEYWORDS = ["bebida", "cerveja", "drink", "refrigerante", "suco", "água", "agua", "vinho", "dose", "adicionais"];

export default function ProdutosPage() {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); 
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditData>({ name: "", description: "", price: 0 });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- Queries ---
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', selectedBotId],
    queryFn: async () => (await api.get(`${API_BASE}/bots/${selectedBotId}/products`)).data,
    enabled: !!selectedBotId, 
  });

  // --- Computed & Sorting ---
  const groupedProducts = useMemo(() => {
    if (!products) return {};
    return products.reduce((acc, product) => {
      const cat = product.category || "Sem Categoria";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [products]);

  const sortedCategories = useMemo(() => {
    return Object.keys(groupedProducts).sort((a, b) => {
        // Lógica de ordenação: Bebidas por último
        const isABeverage = BOTTOM_KEYWORDS.some(k => a.toLowerCase().includes(k));
        const isBBeverage = BOTTOM_KEYWORDS.some(k => b.toLowerCase().includes(k));

        if (isABeverage && !isBBeverage) return 1; // A vai para o final
        if (!isABeverage && isBBeverage) return -1; // B vai para o final
        
        // Se ambos forem do mesmo "tipo", ordena alfabeticamente
        return a.localeCompare(b);
    });
  }, [groupedProducts]);

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`${API_BASE}/bots/${selectedBotId}/products/${id}`),
    onSuccess: () => { 
      toast({ title: "Deletado" }); 
      queryClient.invalidateQueries({queryKey:['products', selectedBotId]}); 
      setProductToDelete(null); 
    }
  });
  
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.post(`${API_BASE}/bots/${selectedBotId}/products/bulk-delete`, { product_ids: ids }),
    onSuccess: (d) => { 
      toast({ title: d.data.message }); 
      queryClient.invalidateQueries({queryKey:['products', selectedBotId]}); 
      setSelectedProductIds([]); 
      setIsBulkDeleteAlertOpen(false); 
    }
  });

  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) => api.post(`${API_BASE}/bots/${selectedBotId}/products`, values),
    onSuccess: () => { 
      toast({ title: "Criado!" }); 
      queryClient.invalidateQueries({queryKey:['products', selectedBotId]}); 
      setIsCreateModalOpen(false); 
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: boolean }) => api.put(`${API_BASE}/bots/${selectedBotId}/products/${id}`, { is_available: !status }),
    onSuccess: () => queryClient.invalidateQueries({queryKey:['products', selectedBotId]}),
  });

  const inlineUpdateMutation = useMutation({
    mutationFn: () => api.put(`${API_BASE}/bots/${selectedBotId}/products/${editingId}`, editData),
    onSuccess: () => { 
      toast({ title: "Atualizado" }); 
      queryClient.invalidateQueries({queryKey:['products', selectedBotId]}); 
      setEditingId(null); 
    }
  });

  // --- Handlers ---
  const startEditing = (p: Product) => { setEditingId(p.id); setEditData({ name: p.name, description: p.description || "", price: p.price }); };
  const handleBotChange = (id: string) => { setSelectedBotId(id); setSelectedProductIds([]); };

  // Lógica para selecionar todos da categoria
  const handleSelectCategory = (category: string) => {
    const categoryProducts = groupedProducts[category];
    const categoryIds = categoryProducts.map(p => p.id);
    
    // Verifica se TODOS dessa categoria já estão selecionados
    const allSelected = categoryIds.every(id => selectedProductIds.includes(id));

    if (allSelected) {
        // Desmarcar todos dessa categoria
        setSelectedProductIds(prev => prev.filter(id => !categoryIds.includes(id)));
    } else {
        // Adicionar os que faltam (Isso habilita a barra de exclusão lá embaixo)
        const missingIds = categoryIds.filter(id => !selectedProductIds.includes(id));
        setSelectedProductIds(prev => [...prev, ...missingIds]);
    }
  };

  const isCategoryFullySelected = (category: string) => {
     if (!groupedProducts[category]) return false;
     return groupedProducts[category].every(p => selectedProductIds.includes(p.id));
  };

  const isEmpty = !isLoading && (!products || products.length === 0);

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-8 min-h-screen bg-slate-50/50">
      
      {/* HEADER SAAS STYLE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Catálogo Digital</h1>
          <p className="text-slate-500 mt-1">Gerencie produtos, preços e disponibilidade do cardápio.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <BotSelector selectedBotId={selectedBotId} onBotChange={handleBotChange} />
             
             {selectedBotId && (
                <>
                    <MenuImportDialog botId={selectedBotId} />
                    
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10">
                                <Plus className="mr-2 h-4 w-4" /> Novo Produto
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Adicionar Produto</DialogTitle></DialogHeader>
                            <ProductForm 
                                onSubmit={(v) => createMutation.mutate(v)} 
                                isPending={createMutation.isPending} 
                                categories={sortedCategories} 
                            />
                        </DialogContent>
                    </Dialog>
                </>
             )}
        </div>
      </div>

      {/* BARRA FLUTUANTE DE AÇÕES EM MASSA (APARECE QUANDO SELECIONA ITENS) */}
      {selectedProductIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 z-50">
             <span className="font-medium text-sm">{selectedProductIds.length} itens selecionados</span>
             <div className="h-4 w-px bg-slate-700"></div>
             
             {/* BOTÃO QUE DELETA TUDO QUE FOI SELECIONADO (INCLUINDO CATEGORIAS INTEIRAS) */}
             <button 
                onClick={() => setIsBulkDeleteAlertOpen(true)} 
                className="text-red-400 hover:text-red-300 font-bold text-sm flex items-center gap-2 transition-colors"
             >
                <Trash2 className="h-4 w-4" /> Excluir
             </button>
             
             <button onClick={() => setSelectedProductIds([])} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-4 w-4" />
             </button>
          </div>
      )}

      {/* CONTENT */}
      {isLoading ? (
        <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : isEmpty && selectedBotId ? (
         <div className="flex flex-col items-center justify-center p-16 bg-white border border-dashed border-slate-200 rounded-2xl text-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4"><Package className="h-12 w-12 text-slate-300" /></div>
            <h3 className="text-lg font-semibold text-slate-900">Cardápio Vazio</h3>
            <p className="text-slate-500 mb-6 max-w-sm">Este bot ainda não tem produtos. Adicione manualmente ou use a IA para importar.</p>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>Criar Primeiro Produto</Button>
         </div>
      ) : !selectedBotId ? (
          <div className="text-center py-20 opacity-50"><p>Selecione um bot acima para começar.</p></div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map((category) => (
            <Card key={category} className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3 px-5 flex flex-row items-center justify-between">
                 <div className="flex items-center gap-3">
                    <h2 className="font-bold text-slate-800 text-lg">{category}</h2>
                    <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-500 shadow-sm">
                        {groupedProducts[category].length}
                    </Badge>
                 </div>
              </CardHeader>
              
              <div className="overflow-x-auto">
                {/* CORREÇÃO DO ERRO DE HIDRATAÇÃO: Removemos comentários de dentro da tag Table */}
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-100">
                      {/* CHECKBOX DA CATEGORIA: Seleciona/Desmarca todos desta lista */}
                      <TableHead className="w-[50px] pl-5 align-middle">
                          <Checkbox 
                            checked={isCategoryFullySelected(category)}
                            onCheckedChange={() => handleSelectCategory(category)}
                          />
                      </TableHead>
                      
                      <TableHead className="w-[30%] align-middle">Produto</TableHead>
                      <TableHead className="hidden md:table-cell align-middle">Descrição</TableHead>
                      <TableHead className="w-[120px] text-right align-middle">Preço</TableHead>
                      <TableHead className="w-[100px] text-center align-middle">Disponível</TableHead>
                      <TableHead className="w-[100px] text-right pr-5 align-middle">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedProducts[category].map((product) => {
                      const isEditing = editingId === product.id;
                      return (
                        <TableRow key={product.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                          
                          <TableCell className="w-[50px] pl-5 align-middle">
                            <Checkbox 
                                checked={selectedProductIds.includes(product.id)} 
                                onCheckedChange={(c) => {
                                    if(c) setSelectedProductIds(p => [...p, product.id]);
                                    else setSelectedProductIds(p => p.filter(id => id !== product.id));
                                }}
                            />
                          </TableCell>
                          
                          <TableCell className="w-[30%] align-middle">
                            {isEditing ? (
                                <Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="h-8 font-medium" />
                            ) : (
                                <span className="font-semibold text-slate-700 block truncate" title={product.name}>{product.name}</span>
                            )}
                          </TableCell>

                          <TableCell className="hidden md:table-cell align-middle">
                            {isEditing ? (
                                <Input value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} className="h-8 text-xs" />
                            ) : (
                                <span className="text-slate-500 text-sm truncate block" title={product.description || ""}>{product.description || "-"}</span>
                            )}
                          </TableCell>

                          <TableCell className="w-[120px] text-right font-mono text-slate-600 align-middle">
                             {isEditing ? (
                                <Input type="number" step="0.01" value={editData.price} onChange={e => setEditData({...editData, price: Number(e.target.value)})} className="h-8 w-full text-right" />
                             ) : `R$ ${product.price.toFixed(2)}`}
                          </TableCell>

                          <TableCell className="w-[100px] text-center align-middle">
                             <Switch 
                                checked={product.is_available} 
                                onCheckedChange={() => toggleStatusMutation.mutate({id: product.id, status: product.is_available})}
                                className="data-[state=checked]:bg-emerald-500 scale-90"
                             />
                          </TableCell>

                          <TableCell className="w-[100px] text-right pr-5 align-middle">
                            {isEditing ? (
                                <div className="flex justify-end gap-2">
                                    <Button size="icon" className="h-7 w-7 bg-emerald-500 hover:bg-emerald-600" onClick={() => inlineUpdateMutation.mutate()}><Check className="h-3 w-3" /></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                                </div>
                            ) : (
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => startEditing(product)}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => setProductToDelete(product)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* DIALOG DE CONFIRMAÇÃO DE DELEÇÃO UNITÁRIA */}
      <AlertDialog open={!!productToDelete} onOpenChange={(o) => !o && setProductToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir produto?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => productToDelete && deleteMutation.mutate(productToDelete.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG DE CONFIRMAÇÃO DE DELEÇÃO EM MASSA */}
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir {selectedProductIds.length} itens?</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => bulkDeleteMutation.mutate(selectedProductIds)}>Confirmar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}