"use client";

import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/error-messages";
import {
  UploadCloud,
  X,
  FileType2,
  Image as ImageIcon,
  Cpu,
  Info,
  Link,
  FileText,
  Type,
} from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// CONFIGURAÇÃO: 10MB per file, up to 10 images
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_FILES = 10;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DOC_TYPES = new Set(["application/pdf", "text/plain"]);

const IFOOD_URL_PREFIX = "https://www.ifood.com.br/delivery/";

function isImageFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type);
}

interface MenuImportDialogProps {
  botId: string;
  trigger?: React.ReactNode;
}

type ActiveTab = "arquivo" | "ifood" | "texto";

export function MenuImportDialog({ botId, trigger }: MenuImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("arquivo");
  const [text, setText] = useState("");
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [ifoodUrl, setIfoodUrl] = useState("");
  const [ifoodUrlError, setIfoodUrlError] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearAllState = () => {
    setText("");
    setFilesToUpload([]);
    setIfoodUrl("");
    setIfoodUrlError(null);
  };

  const handleTabChange = (value: string) => {
    clearAllState();
    setActiveTab(value as ActiveTab);
  };

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const error = rejection.errors[0];

      if (error.code === "file-too-large") {
          toast({
            title: "Arquivo muito grande",
            description: `O limite é de ${MAX_SIZE_MB}MB.`,
            variant: "destructive"
          });
      } else if (error.code === "file-invalid-type") {
          toast({
            title: "Formato inválido",
            description: "Use PDF, JPG, PNG ou WebP.",
            variant: "destructive"
          });
      } else if (error.code === "too-many-files") {
          toast({
            title: "Muitos arquivos",
            description: `Máximo de ${MAX_IMAGE_FILES} imagens por envio.`,
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

    if (acceptedFiles.length === 0) return;

    const incomingDoc = acceptedFiles.some((f) => DOC_TYPES.has(f.type));
    const incomingImages = acceptedFiles.every(isImageFile);

    // If incoming has a document, replace everything (single file only)
    if (incomingDoc) {
      if (acceptedFiles.length > 1) {
        toast({
          title: "PDFs individuais",
          description: "PDFs devem ser enviados individualmente. Para múltiplas páginas, use imagens.",
          variant: "destructive",
        });
        return;
      }
      setFilesToUpload([acceptedFiles[0]]);
      // If it's a text file, read contents into textarea
      if (acceptedFiles[0].type === "text/plain") {
        const reader = new FileReader();
        reader.onload = () => {
          setText(reader.result as string);
          toast({ title: "Texto carregado!", description: "Você pode editar abaixo." });
        };
        reader.readAsText(acceptedFiles[0]);
      } else {
        setText("");
      }
      return;
    }

    // Images: accumulate up to MAX_IMAGE_FILES
    if (incomingImages) {
      setFilesToUpload((prev) => {
        // If previous selection was a document, replace entirely
        if (prev.some((f) => DOC_TYPES.has(f.type))) {
          return acceptedFiles.slice(0, MAX_IMAGE_FILES);
        }
        const merged = [...prev, ...acceptedFiles];
        if (merged.length > MAX_IMAGE_FILES) {
          toast({
            title: "Limite atingido",
            description: `Máximo de ${MAX_IMAGE_FILES} imagens. ${merged.length - MAX_IMAGE_FILES} ignorada(s).`,
            variant: "destructive",
          });
        }
        return merged.slice(0, MAX_IMAGE_FILES);
      });
      setText("");
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
        'text/plain': ['.txt'],
        'image/png': ['.png'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/webp': ['.webp'],
        'application/pdf': ['.pdf']
    },
    maxFiles: MAX_IMAGE_FILES,
    maxSize: MAX_SIZE_BYTES,
    multiple: true,
  });

  const validateIfoodUrl = (url: string): boolean => {
    if (!url.trim()) {
      setIfoodUrlError(null);
      return false;
    }
    if (!url.startsWith(IFOOD_URL_PREFIX)) {
      setIfoodUrlError("O link deve começar com https://www.ifood.com.br/delivery/");
      return false;
    }
    setIfoodUrlError(null);
    return true;
  };

  const handleIfoodUrlChange = (value: string) => {
    setIfoodUrl(value);
    if (ifoodUrlError) {
      validateIfoodUrl(value);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (activeTab === "ifood") {
        if (!validateIfoodUrl(ifoodUrl)) {
          throw new Error("URL inválida");
        }
        return api.post(`/bots/${botId}/catalog/upload-from-url`, { url: ifoodUrl.trim() }, {
          timeout: 30000,
        });
      }

      if (activeTab === "arquivo" && filesToUpload.length > 0) {
        const formData = new FormData();
        for (const f of filesToUpload) {
          formData.append("files", f);
        }
        const timeoutMs = Math.max(120000, filesToUpload.length * 20000 + 30000);
        return api.post(`/bots/${botId}/catalog/upload-from-file`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: timeoutMs,
        });
      }

      if (activeTab === "texto" && text) {
        return api.post(`/bots/${botId}/catalog/upload`, { catalog_text: text });
      }

      throw new Error("Nada para enviar");
    },
    onSuccess: (response) => {
      const msg = response.data?.message || "Processado com sucesso!";

      toast({
        title: "Sucesso!",
        description: msg,
        className: "bg-green-50 border-green-200"
      });

      queryClient.invalidateQueries({ queryKey: ['products', botId] });
      queryClient.invalidateQueries({ queryKey: ['bot-details', botId] });
      setIsOpen(false);
      clearAllState();
    },
    onError: (error: unknown) => {
        const msg = getSafeErrorMessage(error, "Erro ao processar.");
        toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  });

  const clearFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
    if (filesToUpload.length <= 1) setText("");
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFilesToUpload([]);
    setText("");
  };

  const isSubmitDisabled = () => {
    if (importMutation.isPending) return true;
    if (activeTab === "arquivo") return filesToUpload.length === 0;
    if (activeTab === "ifood") return !ifoodUrl.trim() || !!ifoodUrlError;
    if (activeTab === "texto") return !text.trim();
    return true;
  };

  const getSubmitLabel = () => {
    if (!importMutation.isPending) return "Processar";
    if (activeTab === "ifood") return "Importando...";
    if (activeTab === "arquivo" && filesToUpload.length > 1) {
      return `Lendo ${filesToUpload.length} páginas...`;
    }
    return "Lendo...";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 border-0 shadow-sm">
            <Cpu className="mr-2 h-4 w-4" /> Cadastro Mágico
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <div className="p-2 bg-cyan-100 rounded-lg"><Cpu className="h-5 w-5 text-cyan-600" /></div>
             Cadastro Mágico
          </DialogTitle>
          <DialogDescription>
            Envie arquivos, cole um link do iFood, ou digite o texto do cardápio.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="arquivo" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Arquivo
            </TabsTrigger>
            <TabsTrigger value="ifood" className="gap-1.5">
              <Link className="h-3.5 w-3.5" />
              Link do iFood
            </TabsTrigger>
            <TabsTrigger value="texto" className="gap-1.5">
              <Type className="h-3.5 w-3.5" />
              Texto
            </TabsTrigger>
          </TabsList>

          {/* TAB: Arquivo */}
          <TabsContent value="arquivo" className="space-y-4 mt-4">
            <div
              {...getRootProps()}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                ${isDragActive ? "border-cyan-500 bg-cyan-50" : "border-slate-200 hover:border-cyan-300 hover:bg-slate-50"}
              `}
            >
              <input {...getInputProps()} />

              {filesToUpload.length > 0 ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in-95">
                  {/* Single file preview */}
                  {filesToUpload.length === 1 && (
                    <>
                      <div className="h-14 w-14 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-3">
                        {filesToUpload[0].type.includes('pdf')
                          ? <FileType2 className="h-7 w-7 text-red-500" />
                          : <ImageIcon className="h-7 w-7 text-blue-500" />}
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                          {filesToUpload[0].name}
                        </span>
                        <button onClick={(e) => clearFile(e, 0)} className="hover:bg-slate-200 rounded-full p-0.5">
                          <X className="h-3 w-3 text-slate-500" />
                        </button>
                      </div>
                    </>
                  )}

                  {/* Multi-file grid preview */}
                  {filesToUpload.length > 1 && (
                    <>
                      <div className="grid grid-cols-5 gap-2 mb-3 w-full max-w-[400px]">
                        {filesToUpload.map((f, i) => (
                          <div
                            key={`${f.name}-${i}`}
                            className="relative group aspect-square bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden"
                          >
                            <ImageIcon className="h-5 w-5 text-blue-400" />
                            <button
                              onClick={(e) => clearFile(e, i)}
                              className="absolute top-0.5 right-0.5 bg-white/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-2.5 w-2.5 text-slate-500" />
                            </button>
                            <span className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[8px] truncate px-1">
                              {f.name}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">
                          {filesToUpload.length} imagem{filesToUpload.length > 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={clearAll}
                          className="text-xs text-red-500 hover:text-red-600 underline"
                        >
                          Limpar tudo
                        </button>
                      </div>
                    </>
                  )}

                  <p className="text-xs text-slate-400 mt-2">
                    {filesToUpload.length === 1
                      ? "Pronto para processar"
                      : `${filesToUpload.length}/${MAX_IMAGE_FILES} — arraste mais ou clique para adicionar`}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <UploadCloud className="h-12 w-12 mb-3 text-slate-300" />
                  <p className="font-semibold text-slate-900">Clique para enviar ou arraste aqui</p>
                  <p className="text-xs mt-1 text-slate-400">
                    Imagens: até {MAX_IMAGE_FILES} arquivos (JPG, PNG, WebP) — PDF: 1 arquivo — Max {MAX_SIZE_MB}MB cada
                  </p>
                </div>
              )}
            </div>

            <Alert className="bg-blue-50 border-blue-100 text-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700 font-semibold mb-1">Dica para melhorar o fluxo de vendas</AlertTitle>
              <AlertDescription className="text-blue-700/80 text-xs leading-relaxed">
                Prefira enviar o cardápio como <strong>Imagem (JPG/PNG)</strong>. Elas abrem automaticamente no WhatsApp, evitando que o cliente precise baixar um PDF.
                {" "}Para cardápios com múltiplas páginas, envie até <strong>{MAX_IMAGE_FILES} imagens</strong> de uma vez.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* TAB: Link do iFood */}
          <TabsContent value="ifood" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="url"
                  placeholder="https://www.ifood.com.br/delivery/..."
                  value={ifoodUrl}
                  onChange={(e) => handleIfoodUrlChange(e.target.value)}
                  onBlur={() => validateIfoodUrl(ifoodUrl)}
                  className={`pl-9 ${ifoodUrlError ? "border-red-300 focus-visible:ring-red-400" : ""}`}
                />
              </div>
              {ifoodUrlError && (
                <p className="text-xs text-red-500">{ifoodUrlError}</p>
              )}
              <p className="text-xs text-slate-500">
                Cole o link do restaurante no iFood. Os produtos serão importados automaticamente.
              </p>
            </div>
          </TabsContent>

          {/* TAB: Texto */}
          <TabsContent value="texto" className="space-y-4 mt-4">
            <Textarea
              placeholder="Hamburguer Clássico - R$ 25,00..."
              className="h-[150px] font-mono text-sm border-slate-200 focus:border-cyan-500 transition-colors"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={isSubmitDisabled()}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white min-w-[140px] border-0"
          >
            {importMutation.isPending ? <Cpu className="mr-2 h-4 w-4 animate-spin" /> : <Cpu className="mr-2 h-4 w-4" />}
            {getSubmitLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
