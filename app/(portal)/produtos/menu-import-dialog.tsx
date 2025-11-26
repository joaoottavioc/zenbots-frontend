// app/(portal)/produtos/menu-import-dialog.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Wand2, UploadCloud, FileText, X, FileType2 } from 'lucide-react';
import { useDropzone, FileRejection } from 'react-dropzone';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// 1. CONFIGURAÇÃO CENTRALIZADA DO TAMANHO
const MAX_SIZE = 3 * 1024 * 1024; // 30MB em bytes
const MAX_MB = MAX_SIZE / (1024 * 1024); // Valor em MB para exibição (30)

interface MenuImportDialogProps {
  botId: string;
  trigger?: React.ReactNode;
}

export function MenuImportDialog({ botId, trigger }: MenuImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  
  const [fileToUpload, setFileToUpload] = useState<File | null>(null); 
  const [fileName, setFileName] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    
    // Tratamento de Erros
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const errorCode = rejection.errors[0].code;
      
      if (errorCode === "file-too-large") {
        toast({ 
          title: "Arquivo muito grande 🐘", 
          // 2. USO DINÂMICO NA MENSAGEM DE ERRO
          description: `O limite é de ${MAX_MB}MB. Seu arquivo tem ${(rejection.file.size / 1024 / 1024).toFixed(1)}MB.`, 
          variant: "destructive",
          duration: 5000,
        });
      } else if (errorCode === "file-invalid-type") {
        toast({ 
          title: "Tipo inválido", 
          description: "Apenas PDF, JPG ou PNG são aceitos.", 
          variant: "destructive" 
        });
      }
      return; 
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setFileToUpload(file);

    if (file.type === "text/plain" || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = () => {
            setText(reader.result as string);
            toast({ title: "Texto carregado!", description: "Você pode editar abaixo antes de enviar." });
        };
        reader.readAsText(file);
    } else if (file.type === "application/pdf") {
        setText(""); 
        toast({ title: "PDF carregado!", description: "O sistema lerá todas as páginas." });
    } else {
        setText(""); 
        toast({ title: "Imagem carregada!", description: "Clique em 'Processar' para a IA analisar." });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/plain': ['.txt', '.md', '.csv'],
      'application/json': ['.json'],
      'image/*': ['.png', '.jpeg', '.jpg', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: MAX_SIZE
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (fileToUpload) {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        return api.post(`${API_BASE}/bots/${botId}/catalog/upload-from-file`, formData, {
            timeout: 60000 
        });
      } else if (text) {
        return api.post(`${API_BASE}/bots/${botId}/catalog/upload`, {
          catalog_text: text
        });
      } else {
        throw new Error("Nada para enviar");
      }
    },
    onSuccess: (data) => {
      toast({ 
        title: "Mágica realizada! ✨", 
        description: data.data.message 
      });
      queryClient.invalidateQueries({ queryKey: ['products', botId] });
      setIsOpen(false);
      setText("");
      setFileName(null);
      setFileToUpload(null);
    },
    onError: (error: any) => {
      if (error.code === 'ECONNABORTED') {
         toast({ title: "Demorou muito", description: "O processamento demorou. Tente um arquivo menor.", variant: "destructive" });
      } else {
         toast({ title: "Erro", description: "Falha na importação.", variant: "destructive" });
      }
    }
  });

  const handleImport = () => {
    if (!text && !fileToUpload) {
      toast({ title: "Vazio", description: "Cole um texto ou arraste um arquivo.", variant: "destructive" });
      return;
    }
    importMutation.mutate();
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    setFileToUpload(null);
    setText("");
  }

  const getFileIcon = () => {
    if (!fileToUpload) return FileText;
    if (fileToUpload.type === "application/pdf") return FileType2;
    if (fileToUpload.type.startsWith("image/")) return UploadCloud;
    return FileText;
  };
  
  const FileIconComponent = getFileIcon();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="secondary">
            <Wand2 className="mr-2 h-4 w-4" />
            Importar com IA
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importação Mágica de Cardápio ✨</DialogTitle>
          <DialogDescription>
            {/* 3. USO DINÂMICO NA DESCRIÇÃO DO MODAL */}
            Carregue seu cardápio em <strong>PDF</strong> (até {MAX_MB}MB), Imagem ou Texto.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none
              ${isDragActive ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"}
            `}
          >
            <input {...getInputProps()} />
            
            {fileName ? (
              <div className="flex flex-col items-center justify-center text-primary animate-in fade-in zoom-in duration-300">
                <FileIconComponent className="h-10 w-10 mb-2" />
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                  <p className="font-medium text-sm truncate max-w-[200px]">{fileName}</p>
                  <button onClick={clearFile} className="hover:bg-primary/20 rounded-full p-1 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {(fileToUpload?.size! / 1024 / 1024).toFixed(1)} MB • Pronto para envio
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500">
                <UploadCloud className="h-10 w-10 mb-2 text-gray-300" />
                <p className="font-medium text-sm text-gray-700">
                  {isDragActive ? "Solte o arquivo agora!" : "Clique para carregar ou arraste aqui"}
                </p>
                {/* 4. USO DINÂMICO NO TEXTO DE AJUDA */}
                <p className="text-xs mt-1 text-gray-400">PDF, JPG ou PNG (Máx {MAX_MB}MB)</p>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute top-[-10px] left-3 bg-white px-2 text-xs text-gray-400 font-medium">
              Ou cole o texto manualmente
            </div>
            <Textarea 
              placeholder="Ex: Hamburguer Clássico - R$ 25,00..." 
              className="h-[150px] font-mono text-sm pt-4 resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!!fileToUpload && !text} 
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={importMutation.isPending}>
            {importMutation.isPending ? (
              <>
                <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Processar Cardápio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}