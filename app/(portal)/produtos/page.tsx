// app/(portal)/produtos/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, UploadCloud, FileText } from 'lucide-react';
import * as z from 'zod'; 

// --- Imports de Componentes Locais ---
import { ProductForm } from './product-form';
import { MenuImportDialog } from './menu-import-dialog';

// --- Imports Shadcn ---
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch"; // Importante para o controle de estoque
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
interface Bot {
  id: number;
  restaurant_name: string;
}
interface Product {
  id: number;
  name: string;
  price: number;
  description: string | null;
  is_available: boolean; // Campo de controle de estoque
}

// Schema do Formulário (para tipagem)
const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
});
type ProductFormValues = z.infer<typeof formSchema>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProdutosPage() {
  // --- Estados ---
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Modal de criar produto

  // --- Hooks ---
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- Queries ---
  const { data: bots, isLoading: isLoadingBots } = useQuery<Bot[]>({
    queryKey: ['myBots'],
    queryFn: async () => (await api.get(`${API_BASE}/bots`)).data,
  });

  // Auto-select se tiver apenas 1 bot
  useEffect(() => {
    if (bots && bots.length === 1) {
      setSelectedBotId(String(bots[0].id));
    }
  }, [bots]);

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products', selectedBotId],
    queryFn: async () => (await api.get(`${API_BASE}/bots/${selectedBotId}/products`)).data,
    enabled: !!selectedBotId, 
  });

  // --- Mutações ---

  // 1. DELETE Individual
  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      return api.delete(`${API_BASE}/bots/${selectedBotId}/products/${productId}`);
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Produto deletado." });
      queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
      setProductToDelete(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao deletar.", variant: "destructive" });
      setProductToDelete(null);
    }
  });
  
  // 2. BULK DELETE (Vários)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      return api.post(`${API_BASE}/bots/${selectedBotId}/products/bulk-delete`, {
        product_ids: productIds
      });
    },
    onSuccess: (data) => {
      toast({ title: "Sucesso", description: data.data.message });
      queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
      setSelectedProductIds([]);
      setIsBulkDeleteAlertOpen(false);
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha na exclusão em massa.", variant: "destructive" });
      setIsBulkDeleteAlertOpen(false);
    }
  });

  // 3. CREATE (Novo Produto)
  const createMutation = useMutation({
    mutationFn: async (newProduct: ProductFormValues) => {
      return api.post(`${API_BASE}/bots/${selectedBotId}/products`, newProduct);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Produto adicionado." });
      queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
      setIsCreateModalOpen(false);
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar produto.", variant: "destructive" });
    }
  });

  // 4. TOGGLE AVAILABILITY (Estoque)
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: boolean }) => {
      return api.put(`${API_BASE}/bots/${selectedBotId}/products/${id}`, {
        is_available: !currentStatus
      });
    },
    onSuccess: () => {
      // Feedback visual sutil (opcional, o switch já anima)
      queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao atualizar status.", variant: "destructive" });
    }
  });


  // --- Handlers ---
  const handleBotChange = (botId: string) => {
    setSelectedBotId(botId);
    setSelectedProductIds([]);
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked && products) {
      setSelectedProductIds(products.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSelectRow = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProductIds((prev) => [...prev, productId]);
    } else {
      setSelectedProductIds((prev) => prev.filter(id => id !== productId));
    }
  };

  const handleCreateProduct = (values: ProductFormValues) => {
    createMutation.mutate(values);
  };

  const renderLoadingSkeleton = () => (
    <Card>
      <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* --- CABEÇALHO E AÇÕES --- */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
        
        {selectedBotId && (
          <div className="flex gap-2">
            {/* Excluir Selecionados */}
            {selectedProductIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setIsBulkDeleteAlertOpen(true)}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir ({selectedProductIds.length})
              </Button>
            )}
            
            {/* Importar Cardápio (Botão Mágico) */}
            <MenuImportDialog botId={selectedBotId} />

            {/* Adicionar Manualmente */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Produto</DialogTitle>
                </DialogHeader>
                <ProductForm
                  onSubmit={handleCreateProduct}
                  isPending={createMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* --- SELETOR DE BOT --- */}
      {isLoadingBots && <Skeleton className="h-10 w-60" />}
      {bots && bots.length > 1 && (
         <div>
          <label className="text-sm font-medium">Selecione um bot</label>
          <Select onValueChange={handleBotChange} value={selectedBotId ?? undefined}>
            <SelectTrigger className="w-60 mt-1">
              <SelectValue placeholder="Selecione um bot..." />
            </SelectTrigger>
            <SelectContent>
              {bots.map(bot => (
                <SelectItem key={bot.id} value={String(bot.id)}>
                  {bot.restaurant_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* --- TABELA DE PRODUTOS --- */}
      {isLoadingProducts && renderLoadingSkeleton()}
      
      {!isLoadingProducts && products && products.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedProductIds.length === products.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-center">Disponível</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectRow(product.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="max-w-xs truncate" title={product.description || ""}>
                    {product.description || "N/A"}
                  </TableCell>
                  <TableCell className="text-right">R$ {product.price.toFixed(2)}</TableCell>
                  
                  {/* Switch de Disponibilidade */}
                  <TableCell className="text-center">
                    <Switch
                      checked={product.is_available}
                      onCheckedChange={() => 
                        toggleAvailabilityMutation.mutate({ 
                          id: product.id, 
                          currentStatus: product.is_available 
                        })
                      }
                      disabled={toggleAvailabilityMutation.isPending}
                    />
                  </TableCell>

                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm">Editar</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setProductToDelete(product)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* --- ESTADOS DE AJUDA (EMPTY STATES) --- */}
      {!selectedBotId && !isLoadingBots && bots && bots.length > 1 && (
        <p className="text-center text-gray-500 pt-10">Selecione um bot para ver seus produtos.</p>
      )}
      
      {/* Empty State Inteligente (com Botão de Importar) */}
      {!isLoadingProducts && products && products.length === 0 && selectedBotId && (
         <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-gray-50 text-center mt-6">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Seu cardápio está vazio</h3>
            <p className="text-gray-500 max-w-md mb-8">
              Você pode adicionar produtos manualmente um por um, ou usar nossa IA para importar seu cardápio inteiro (texto ou imagem) em segundos.
            </p>
            
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>
                Adicionar Manualmente
              </Button>
              
              <MenuImportDialog 
                botId={selectedBotId} 
                trigger={
                  <Button>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Importar Cardápio com IA
                  </Button>
                }
              />
            </div>
         </div>
      )}

      {/* --- DIALOGS DE CONFIRMAÇÃO --- */}
      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(isOpen) => { if (!isOpen) setProductToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá deletar permanentemente o produto 
              <strong className="px-1">{productToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToDelete) deleteMutation.mutate(productToDelete.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deletando..." : "Confirmar e Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog
        open={isBulkDeleteAlertOpen}
        onOpenChange={setIsBulkDeleteAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedProductIds.length} produtos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente
              os {selectedProductIds.length} produtos selecionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedProductIds)}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deletando..." : "Confirmar e Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}