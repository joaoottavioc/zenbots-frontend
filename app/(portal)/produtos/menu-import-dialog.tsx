"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
  FileText,
  Type,
} from 'lucide-react';
import { BotReadingAnimation } from '@/components/ui/bot-reading-animation';
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
const MAX_SIZE_MB = 35;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_FILES = 10;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DOC_TYPES = new Set(["application/pdf", "text/plain"]);

function isImageFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type);
}

function getApiBase() {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  return url;
}

// PDFs run asynchronously on the worker (endpoint returns 202). We open an
// EventSource to the dashboard stream and resolve when a `menu_extraction`
// event for this bot reports completion. Image uploads still return inline.
function waitForMenuExtraction(
  botId: string | number,
  signal: AbortSignal,
): Promise<{ data: { message: string } }> {
  const botIdStr = String(botId);
  return new Promise((resolve, reject) => {
    const es = new EventSource(`${getApiBase()}/stream`, { withCredentials: true });
    const cleanup = () => {
      es.close();
      signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      const err: Error & { code?: string } = new Error("aborted");
      err.code = "ERR_CANCELED";
      reject(err);
    };
    signal.addEventListener("abort", onAbort);

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== "menu_extraction") return;
        const data = payload.payload ?? payload.data ?? payload;
        if (String(data.bot_id) !== botIdStr) return;
        if (data.status === "completed") {
          cleanup();
          resolve({
            data: {
              message: data.message || `Sucesso! ${data.product_count ?? 0} produtos cadastrados.`,
            },
          });
        } else if (data.status === "error") {
          cleanup();
          reject(new Error(data.message || "Erro ao processar cardápio."));
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource will auto-reconnect; don't reject on transient errors.
      // The abort signal + a safety timeout below handle real failures.
    };

    // Safety net: worker job timeout is 5 min; give it 6 before giving up.
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite ao processar cardápio. Tente novamente."));
    }, 360_000);
    signal.addEventListener("abort", () => clearTimeout(timeoutId));
  });
}

// ====== Simulated Progress for AI extraction ======

type ProgressStatus = 'idle' | 'active' | 'success' | 'error';

const PROGRESS_STAGES = [
  { at: 0,     pct: 0 },
  { at: 2000,  pct: 30, label: "Processando cardápio..." },
  { at: 5000,  pct: 50, label: "Extraindo produtos com IA..." },
  { at: 10000, pct: 65, label: "Analisando itens e preços..." },
  { at: 18000, pct: 78, label: "Quase lá..." },
  { at: 25000, pct: 85, label: "Finalizando..." },
];
const MAX_SIMULATED_PCT = 92;

function useSimulatedProgress() {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<ProgressStatus>('idle');

  const startTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialLabelRef = useRef("");
  const uploadFractionRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((initialLabel: string) => {
    stopTimer();
    startTimeRef.current = Date.now();
    uploadFractionRef.current = 0;
    initialLabelRef.current = initialLabel;
    setProgress(0);
    setLabel(initialLabel);
    setStatus('active');
  }, [stopTimer]);

  const setUploadProgress = useCallback((fraction: number) => {
    uploadFractionRef.current = Math.min(fraction, 1);
  }, []);

  const complete = useCallback(() => {
    stopTimer();
    setStatus('success');
    setProgress(100);
    setLabel("Concluído!");
  }, [stopTimer]);

  const fail = useCallback((errorMsg: string) => {
    stopTimer();
    setStatus('error');
    setLabel(errorMsg);
  }, [stopTimer]);

  const reset = useCallback(() => {
    stopTimer();
    setStatus('idle');
    setProgress(0);
    setLabel("");
    uploadFractionRef.current = 0;
  }, [stopTimer]);

  useEffect(() => {
    if (status !== 'active') return;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;

      let idx = 0;
      for (let i = PROGRESS_STAGES.length - 1; i >= 0; i--) {
        if (elapsed >= PROGRESS_STAGES[i].at) { idx = i; break; }
      }

      const current = PROGRESS_STAGES[idx];
      const next = PROGRESS_STAGES[idx + 1];

      let pct: number;
      if (next) {
        const t = Math.min((elapsed - current.at) / (next.at - current.at), 1);
        const eased = 1 - (1 - t) * (1 - t); // ease-out quadratic
        pct = current.pct + (next.pct - current.pct) * eased;
      } else {
        // Asymptotically approach MAX_SIMULATED_PCT
        const overtime = elapsed - current.at;
        const remaining = MAX_SIMULATED_PCT - current.pct;
        pct = current.pct + remaining * (1 - Math.exp(-overtime / 15000));
      }

      // Blend real upload progress into the 0→15% range
      const uploadPct = uploadFractionRef.current * 15;
      if (pct < 15 && uploadPct > pct) pct = uploadPct;

      setProgress(pct);
      setLabel(current.label || initialLabelRef.current);
    };

    tick();
    intervalRef.current = setInterval(tick, 80);
    return stopTimer;
  }, [status, stopTimer]);

  return { progress, label, status, start, setUploadProgress, complete, fail, reset };
}

interface MenuImportDialogProps {
  botId: string;
  trigger?: React.ReactNode;
}

type ActiveTab = "arquivo" | "texto";

export function MenuImportDialog({ botId, trigger }: MenuImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("arquivo");
  const [text, setText] = useState("");
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [fileInfoText, setFileInfoText] = useState("");

  const simProgress = useSimulatedProgress();
  const abortRef = useRef<AbortController | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearAllState = () => {
    setText("");
    setFilesToUpload([]);
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

  const importMutation = useMutation({
    mutationFn: async () => {
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      if (activeTab === "arquivo" && filesToUpload.length > 0) {
        const formData = new FormData();
        for (const f of filesToUpload) {
          formData.append("files", f);
        }
        const timeoutMs = Math.max(120000, filesToUpload.length * 20000 + 30000);
        const response = await api.post(
          `/bots/${botId}/catalog/upload-from-file`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: timeoutMs,
            signal,
            onUploadProgress: (e) => {
              if (e.total) simProgress.setUploadProgress(e.loaded / e.total);
            },
          },
        );
        // PDFs return 202 and finish asynchronously via SSE.
        if (response.status === 202) {
          return waitForMenuExtraction(botId, signal);
        }
        return response;
      }

      if (activeTab === "texto" && text) {
        return api.post(`/bots/${botId}/catalog/upload`, { catalog_text: text }, { signal });
      }

      throw new Error("Nada para enviar");
    },
    onSuccess: (response) => {
      simProgress.complete();
      queryClient.invalidateQueries({ queryKey: ['products', botId] });
      queryClient.invalidateQueries({ queryKey: ['bot-details', botId] });

      const msg = response.data?.message || "Processado com sucesso!";
      autoCloseRef.current = setTimeout(() => {
        toast({ title: "Sucesso!", description: msg, className: "bg-green-50 border-green-200" });
        setIsOpen(false);
        clearAllState();
        simProgress.reset();
      }, 1500);
    },
    onError: (error: unknown) => {
      // Ignore abort errors (user closed dialog)
      if ((error as { code?: string })?.code === 'ERR_CANCELED') {
        simProgress.reset();
        return;
      }
      const msg = getSafeErrorMessage(error, "Erro ao processar.");
      simProgress.fail(msg);
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
    if (activeTab === "texto") return !text.trim();
    return true;
  };

  const handleProcess = () => {
    let initialLabel = "Enviando arquivo...";
    let info = "";

    if (activeTab === "arquivo") {
      const totalSize = filesToUpload.reduce((sum, f) => sum + f.size, 0);
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      if (filesToUpload.length > 1) {
        initialLabel = `Enviando ${filesToUpload.length} imagens...`;
        info = `${filesToUpload.length} imagens \u2022 ${sizeMB} MB`;
      } else {
        info = `1 arquivo \u2022 ${sizeMB} MB`;
      }
    } else if (activeTab === "texto") {
      initialLabel = "Enviando texto...";
      info = `${text.length.toLocaleString()} caracteres`;
    }

    setFileInfoText(info);
    simProgress.start(initialLabel);
    importMutation.mutate();
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (autoCloseRef.current) {
        clearTimeout(autoCloseRef.current);
        autoCloseRef.current = null;
      }
      simProgress.reset();
      clearAllState();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
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
            Envie arquivos ou digite o texto do cardápio.
          </DialogDescription>
        </DialogHeader>

        {simProgress.status === 'idle' ? (
        <>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="arquivo" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Arquivo
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
          <Button variant="outline" onClick={() => handleDialogChange(false)}>Cancelar</Button>
          <Button
            onClick={handleProcess}
            disabled={isSubmitDisabled()}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white min-w-[140px] border-0"
          >
            <Cpu className="mr-2 h-4 w-4" />
            Processar
          </Button>
        </DialogFooter>
        </>
        ) : (
          <div className="flex flex-col items-center py-6 space-y-6">
            <BotReadingAnimation
              progress={simProgress.progress}
              status={simProgress.status}
            />

            {/* Progress bar */}
            <div className="w-full space-y-3">
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    simProgress.status === 'success'
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                      : simProgress.status === 'error'
                        ? 'bg-red-400'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                  style={{
                    width: `${simProgress.progress}%`,
                    transition: `width ${simProgress.status === 'success' ? '500ms ease-out' : '150ms linear'}`,
                  }}
                />
              </div>

              {simProgress.status === 'error' ? (
                <p className="text-sm text-red-600 text-center">{simProgress.label}</p>
              ) : (
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${
                    simProgress.status === 'success' ? 'text-emerald-700' : 'text-slate-600'
                  }`}>
                    {simProgress.label}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {Math.round(simProgress.progress)}%
                  </span>
                </div>
              )}
            </div>

            {/* File info */}
            {fileInfoText && simProgress.status === 'active' && (
              <p className="text-xs text-slate-400">{fileInfoText}</p>
            )}

            {/* Error actions */}
            {simProgress.status === 'error' && (
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => simProgress.reset()}>
                  Tentar novamente
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDialogChange(false)}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
