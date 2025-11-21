// app/(portal)/produtos/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

// --- 1. IMPORTS ATUALIZADOS ---
import { Checkbox } from "@/components/ui/checkbox"; // Novo
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// --- (Interfaces e API_BASE continuam iguais) ---
interface Bot {
  id: number;
  restaurant_name: string;
}
interface Product {
  id: number;
  name: string;
  price: number;
  description: string | null;
}
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";


export default function ProdutosPage() {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // --- 2. NOVOS ESTADOS PARA BULK DELETE ---
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: bots, isLoading: isLoadingBots } = useQuery<Bot[]>({
    queryKey: ['myBots'],
    queryFn: async () => (await api.get(`${API_BASE}/bots`)).data,
  });

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

  // --- (Mutação de delete individual continua igual) ---
  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      return api.delete(`${API_BASE}/bots/${selectedBotId}/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
      setProductToDelete(null);
    },
    onError: (error) => {
      alert("Houve um erro ao deletar o produto.");
      setProductToDelete(null);
    }
  });
  
  // --- 3. NOVA MUTAÇÃO (BULK DELETE) ---
  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      // Chama o endpoint de bulk delete
      return api.post(`${API_BASE}/bots/${selectedBotId}/products/bulk-delete`, {
        product_ids: productIds //
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', selectedBotId] });
      setSelectedProductIds([]); // Limpa a seleção
      setIsBulkDeleteAlertOpen(false); // Fecha o pop-up
    },
    onError: (error) => {
      console.error("Falha ao deletar em massa:", error);
      alert("Houve um erro ao deletar os produtos selecionados.");
      setIsBulkDeleteAlertOpen(false);
    }
  });


  const handleBotChange = (botId: string) => {
    setSelectedBotId(botId);
    setSelectedProductIds([]); // Limpa a seleção ao trocar de bot
  };
  
  // --- 4. NOVAS FUNÇÕES (Lógica dos Checkboxes) ---
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

  const renderLoadingSkeleton = () => (
    // ... (seu código de skeleton continua o mesmo)
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
        
        {/* --- 5. BOTÕES DE AÇÃO ATUALIZADOS --- */}
        {/* Mostra os botões de ação apenas se um bot estiver selecionado */}
        {selectedBotId && (
          <div className="flex gap-2">
            {/* Botão de Excluir Selecionados */}
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
            
            {/* Botão Adicionar Produto */}
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Produto
            </Button>
          </div>
        )}
      </div>

      {/* --- (Seletor de Bot continua o mesmo) --- */}
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

      {/* --- 6. TABELA ATUALIZADA (com Checkboxes) --- */}
      {isLoadingProducts && renderLoadingSkeleton()}
      
      {!isLoadingProducts && products && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {/* Checkbox "Selecionar Todos" */}
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedProductIds.length === products.length && products.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  {/* Checkbox da Linha */}
                  <TableCell>
                    <Checkbox
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectRow(product.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.description || "N/A"}</TableCell>
                  <TableCell className="text-right">R$ {product.price.toFixed(2)}</TableCell>
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

      {/* --- (Estados de ajuda continuam iguais) --- */}
      {!selectedBotId && !isLoadingBots && bots && bots.length > 1 && (
        <p className="text-center text-gray-500 pt-10">Selecione um bot para ver seus produtos.</p>
      )}
      {!isLoadingProducts && products && products.length === 0 && (
         <p className="text-center text-gray-500 pt-10">Este bot ainda não tem produtos cadastrados.</p>
      )}

      {/* --- 7. POP-UP DE DELETE INDIVIDUAL (sem mudanças) --- */}
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
      
      {/* --- 8. NOVO POP-UP (BULK DELETE) --- */}
      <AlertDialog
        open={isBulkDeleteAlertOpen}
        onOpenChange={setIsBulkDeleteAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedProductIds.length} produtos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente
              os {selectedProductIds.length} produtos selecionados do seu cardápio.
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