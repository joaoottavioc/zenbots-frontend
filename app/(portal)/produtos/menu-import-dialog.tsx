// app/(portal)/produtos/menu-import-dialog.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Wand2, UploadCloud, FileText, X, FileType2, Image as ImageIcon, Sparkles } from 'lucide-react';
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

// CONFIGURAÇÃO: 10MB
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

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
    
    // Tratamento de Erros Detalhado
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const error = rejection.errors[0];
      
      console.error("❌ Arquivo rejeitado:", rejection); 

      if (error.code === "file-too-large") {
          toast({ 
            title: "Arquivo muito grande", 
            description: `O limite é de ${MAX_SIZE_MB}MB. Seu arquivo tem ${(rejection.file.size / 1024 / 1024).toFixed(1)}MB.`, 
            variant: "destructive" 
          });
      } else if (error.code === "file-invalid-type") {
          // Mostra o tipo que o navegador detectou para ajudar no debug
          toast({ 
            title: "Formato inválido", 
            description: `O tipo detectado '${rejection.file.type}' não é aceito. Use PDF, JPG ou PNG.`, 
            variant: "destructive" 
          });
      } else {
          toast({ 
            title: "Erro no upload", 
            description: error.message, 
            variant: "destructive" 
          });
      }
      return; 
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setFileToUpload(file);

    if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = () => {
            setText(reader.result as string);
            toast({ title: "Texto carregado!", description: "Você pode editar abaixo." });
        };
        reader.readAsText(file);
    } else {
        setText(""); 
    }
  }, [toast]);

  // --- CORREÇÃO AQUI: TIPOS MIME EXPLÍCITOS ---
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 
        'text/plain': ['.txt'], 
        'image/png': ['.png'],       // <--- Explícito para PNG
        'image/jpeg': ['.jpg', '.jpeg'], // <--- Explícito para JPG
        'image/webp': ['.webp'],
        'application/pdf': ['.pdf'] 
    },
    maxFiles: 1, 
    maxSize: MAX_SIZE_BYTES
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (fileToUpload) {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        // Timeout de 2 minutos para IA
        return api.post(`${API_BASE}/bots/${botId}/catalog/upload-from-file`, formData, { timeout: 120000 });
      } else if (text) {
        return api.post(`${API_BASE}/bots/${botId}/catalog/upload`, { catalog_text: text });
      }
      throw new Error("Nada para enviar");
    },
    onSuccess: (data) => {
      toast({ title: "Sucesso! ✨", description: data.data.message });
      queryClient.invalidateQueries({ queryKey: ['products', botId] });
      setIsOpen(false);
      setText(""); setFileName(null); setFileToUpload(null);
    },
    onError: (error: any) => {
        console.error("Erro importação:", error);
        const msg = error.response?.data?.detail || "Erro ao processar. Tente novamente.";
        toast({ title: "Erro na IA", description: msg, variant: "destructive" });
    }
  });

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null); setFileToUpload(null); setText("");
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 border-0 shadow-sm">
            <Sparkles className="mr-2 h-4 w-4" /> Cadastro Mágico
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <div className="p-2 bg-purple-100 rounded-lg"><Wand2 className="h-5 w-5 text-purple-600" /></div>
             Cadastro Mágico
          </DialogTitle>
          <DialogDescription>
            Envie uma foto do cardápio (PNG/JPG) ou um PDF e nossa IA cadastra tudo pra você! Máximo {MAX_SIZE_MB}MB.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div 
            {...getRootProps()} 
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
              ${isDragActive ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"}
            `}
          >
            <input {...getInputProps()} />
            
            {fileName ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in-95">
                <div className="h-14 w-14 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-3">
                    {fileToUpload?.type.includes('pdf') ? <FileType2 className="h-7 w-7 text-red-500" /> : <ImageIcon className="h-7 w-7 text-blue-500" />}
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{fileName}</span>
                  <button onClick={clearFile} className="hover:bg-slate-200 rounded-full p-0.5"><X className="h-3 w-3 text-slate-500" /></button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Pronto para processar</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <UploadCloud className="h-12 w-12 mb-3 text-slate-300" />
                <p className="font-semibold text-slate-900">Clique para enviar ou arraste aqui</p>
                <p className="text-xs mt-1 text-slate-400">PNG, JPG ou PDF (Max {MAX_SIZE_MB}MB)</p>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ou cole o texto
            </div>
            <Textarea 
              placeholder="Hamburguer Clássico - R$ 25,00..." 
              className="h-[120px] font-mono text-sm pt-4 border-slate-200 focus:border-purple-500 transition-colors"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!!fileToUpload && !text} 
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button 
            onClick={() => importMutation.mutate()} 
            disabled={importMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px]"
          >
            {importMutation.isPending ? <Wand2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {importMutation.isPending ? "Lendo..." : "Processar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}