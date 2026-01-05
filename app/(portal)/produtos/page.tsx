// app/(portal)/produtos/page.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { Plus, Trash2, UploadCloud, FileText, Pencil, Check, X, Package } from 'lucide-react'; 
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
import { Card, CardContent } from '@/components/ui/card';
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

// --- Interfaces ---
interface Product {
  id: number;
  name: string;
  price: number;
  description: string | null;
  is_available: boolean;
  category: string; 
}

// Interface para os dados temporários da edição
interface EditData {
  name: string;
  description: string;
  price: number;
}

// Schema do Formulário de Criação
const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  category: z.string().min(2),
});
type ProductFormValues = z.infer<typeof formSchema>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProdutosPage() {
  // --- Estados Principais ---
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  // --- Estados de Modais ---
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); 
  
  // --- Estados para Edição Inline ---
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditData>({ name: "", description: "", price: 0 });

  // --- Hooks ---
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products', selectedBotId],
    queryFn: async () => (await api.get(`${API_BASE}/bots/${selectedBotId}/products`)).data,
    enabled: !!selectedBotId, 
  });

  // --- Agrupamento ---
  const groupedProducts = useMemo(() => {
    if (!products) return {};
    return products.reduce((acc, product) => {
      const cat = product.category || "Outros";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [products]);

  const CATEGORIES_AT_END = ["Sobremesas", "Bebidas", "Outros"];
  const categories = Object.keys(groupedProducts).sort((a, b) => {
    const indexA = CATEGORIES_AT_END.indexOf(a);
    const indexB = CATEGORIES_AT_END.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    return indexA !== -1 ? 1 : -1;
  });

  // --- Mutações ---

  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      return api.delete(`${API_BASE}/bots/${selectedBotId}/products/${productId}`);
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Produto deletado." });
      queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
      setProductToDelete(null);
    },
    onError: () => toast({ title: "Erro", description: "Falha ao deletar.", variant: "destructive" })
  });
  
  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      return api.post(`${API_BASE}/bots/${selectedBotId}/products/bulk-delete`, { product_ids: productIds });
    },
    onSuccess: (data) => {
      toast({ title: "Sucesso", description: data.data.message });
      queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
      setSelectedProductIds([]);
      setIsBulkDeleteAlertOpen(false);
    },
    onError: () => toast({ title: "Erro", description: "Falha na exclusão em massa.", variant: "destructive" })
  });

  const createMutation = useMutation({
    mutationFn: async (newProduct: ProductFormValues) => {
      return api.post(`${API_BASE}/bots/${selectedBotId}/products`, newProduct);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Produto adicionado." });
      queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
      setIsCreateModalOpen(false);
    },
    onError: () => toast({ title: "Erro", description: "Falha ao criar produto.", variant: "destructive" })
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: boolean }) => {
      return api.put(`${API_BASE}/bots/${selectedBotId}/products/${id}`, {
        is_available: !currentStatus,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] }),
    onError: () => toast({ title: "Erro", description: "Falha ao atualizar status.", variant: "destructive" })
  });

  const inlineUpdateMutation = useMutation({
    mutationFn: async () => {
        if (!editingId) return;
        return api.put(`${API_BASE}/bots/${selectedBotId}/products/${editingId}`, {
            name: editData.name,
            description: editData.description,
            price: editData.price,
        });
    },
    onSuccess: () => {
        toast({ title: "Salvo!", description: "Produto atualizado." });
        queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
        setEditingId(null); 
    },
    onError: () => toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" })
  });

  // --- Handlers de Edição Inline ---
  
  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditData({
        name: product.name,
        description: product.description || "",
        price: product.price
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({ name: "", description: "", price: 0 });
  };

  // --- Outros Handlers ---
  const handleBotChange = (botId: string) => {
    setSelectedBotId(botId);
    setSelectedProductIds([]);
  };
  
  const handleSelectRow = (productId: number, checked: boolean) => {
    if (checked) setSelectedProductIds((prev) => [...prev, productId]);
    else setSelectedProductIds((prev) => prev.filter(id => id !== productId));
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" /><Card><CardContent className="p-4 space-y-2"><Skeleton className="h-10 w-full" /></CardContent></Card>
    </div>
  );

  const isEmpty = !isLoadingProducts && (!products || products.length === 0);

  return (
    <div className="space-y-6 pb-10">
      
      {/* --- HEADER CORRIGIDO --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        
        {/* 1. Lado Esquerdo: Título */}
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          Gerenciar Produtos
        </h1>
        
        {/* 2. Lado Direito: Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
             
             {/* A. Botões de Ação (Vem ANTES do Seletor para ficarem à esquerda dele) */}
             {selectedBotId && (
                <>
                    {/* Botão de Excluir */}
                    {selectedProductIds.length > 0 && (
                    <Button variant="destructive" size="icon" onClick={() => setIsBulkDeleteAlertOpen(true)} disabled={bulkDeleteMutation.isPending} title="Excluir selecionados">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    )}
                    
                    {/* Importar com IA */}
                    {!isEmpty && <MenuImportDialog botId={selectedBotId} />}

                    {/* Novo Produto */}
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="whitespace-nowrap bg-gray-900 text-white hover:bg-gray-800">
                                <Plus className="mr-2 h-4 w-4" /> Novo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader><DialogTitle>Adicionar Novo Produto</DialogTitle></DialogHeader>
                            <ProductForm
                                onSubmit={(values) => createMutation.mutate(values)}
                                isPending={createMutation.isPending}
                                categories={categories} 
                            />
                        </DialogContent>
                    </Dialog>
                </>
             )}

             {/* B. Bot Selector (Agora é o ÚLTIMO, ficando na extrema direita) */}
             <BotSelector 
                selectedBotId={selectedBotId} 
                onBotChange={handleBotChange} 
             />
        </div>
      </div>
      
      <hr />

      {/* --- CONTEÚDO DA PÁGINA --- */}

      {/* Loading State */}
      {isLoadingProducts && renderLoadingSkeleton()}

      {/* Empty State (Bot selecionado mas sem produtos) */}
      {isEmpty && selectedBotId && (
         <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-gray-50 text-center mt-6">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4"><FileText className="h-10 w-10 text-primary" /></div>
            <h3 className="text-lg font-semibold mb-2">Seu cardápio está vazio</h3>
            <p className="text-sm text-gray-500 mb-6">Comece adicionando itens manualmente ou use nossa IA para importar.</p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>Adicionar Manualmente</Button>
              <MenuImportDialog botId={selectedBotId} trigger={<Button><UploadCloud className="mr-2 h-4 w-4" /> Importar Cardápio com IA</Button>} />
            </div>
         </div>
      )}
      
      {/* Empty State (Nenhum bot selecionado) */}
      {!selectedBotId && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
             <BotSelector selectedBotId={selectedBotId} onBotChange={handleBotChange} className="opacity-0 h-0 w-0 overflow-hidden" />
             <p>Selecione uma loja para gerenciar o cardápio.</p>
          </div>
      )}

      {/* Tabela de Produtos (Agrupada por Categoria) */}
      {!isLoadingProducts && products && !isEmpty && (
        <div className="space-y-10">
          {categories.map((category) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 ml-1">
                <h2 className="text-xl font-semibold text-gray-800 capitalize">{category}</h2>
                <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700 hover:bg-gray-300">{groupedProducts[category].length} itens</Badge>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={groupedProducts[category].length > 0 && groupedProducts[category].every(p => selectedProductIds.includes(p.id))}
                          onCheckedChange={(checked) => {
                             const idsInCategory = groupedProducts[category].map(p => p.id);
                             if (checked) setSelectedProductIds(prev => [...new Set([...prev, ...idsInCategory])]);
                             else setSelectedProductIds(prev => prev.filter(id => !idsInCategory.includes(id)));
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-[200px]">Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right w-[120px]">Preço</TableHead>
                      <TableHead className="text-center w-[100px]">Disponível</TableHead>
                      <TableHead className="text-right w-[140px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedProducts[category].map((product) => {
                      const isEditing = editingId === product.id;

                      return (
                        <TableRow key={product.id}>
                          {/* Checkbox */}
                          <TableCell>
                            <Checkbox 
                                checked={selectedProductIds.includes(product.id)} 
                                onCheckedChange={(checked) => handleSelectRow(product.id, !!checked)} 
                                disabled={isEditing} 
                            />
                          </TableCell>

                          {/* Nome */}
                          <TableCell className="font-medium">
                            {isEditing ? (
                                <Input 
                                    value={editData.name}
                                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                                    className="h-8"
                                />
                            ) : (
                                product.name
                            )}
                          </TableCell>

                          {/* Descrição */}
                          <TableCell className="text-gray-500 text-sm">
                            {isEditing ? (
                                <Input 
                                    value={editData.description}
                                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                                    className="h-8"
                                />
                            ) : (
                                <span className="max-w-xs truncate block" title={product.description || ""}>
                                    {product.description || "-"}
                                </span>
                            )}
                          </TableCell>

                          {/* Preço */}
                          <TableCell className="text-right font-medium">
                            {isEditing ? (
                                <Input 
                                    type="number"
                                    step="0.01"
                                    value={editData.price}
                                    onChange={(e) => setEditData({...editData, price: Number(e.target.value)})}
                                    className="h-8 text-right w-24 ml-auto"
                                />
                            ) : (
                                `R$ ${product.price.toFixed(2)}`
                            )}
                          </TableCell>
                          
                          {/* Switch */}
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                                <Switch
                                  checked={product.is_available}
                                  onCheckedChange={() => toggleAvailabilityMutation.mutate({ id: product.id, currentStatus: product.is_available })}
                                  disabled={toggleAvailabilityMutation.isPending || isEditing}
                                />
                            </div>
                          </TableCell>

                          {/* Ações */}
                          <TableCell className="text-right">
                            {isEditing ? (
                                <div className="flex justify-end gap-1">
                                    <Button 
                                        variant="default" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                        onClick={() => inlineUpdateMutation.mutate()}
                                        disabled={inlineUpdateMutation.isPending}
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0"
                                        onClick={cancelEditing}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex justify-end gap-1">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-8"
                                        onClick={() => startEditing(product)}
                                    >
                                        <Pencil className="h-3 w-3 mr-1.5" /> Editar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => setProductToDelete(product)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* --- DIALOGS DE CONFIRMAÇÃO --- */}
      <AlertDialog open={!!productToDelete} onOpenChange={(isOpen) => { if (!isOpen) setProductToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Isso irá deletar permanentemente <strong className="px-1">{productToDelete?.name}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (productToDelete) deleteMutation.mutate(productToDelete.id); }} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deletando..." : "Confirmar e Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir {selectedProductIds.length} produtos?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkDeleteMutation.mutate(selectedProductIds)} disabled={bulkDeleteMutation.isPending}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}