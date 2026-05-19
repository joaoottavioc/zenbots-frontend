/**
 * "Atendimento Web" dialog for the bot card (plan/in_browser_bots.md §4).
 *
 * Opened from the bot card's dropdown menu. Lets the restaurant owner:
 *   1. Enable / disable the widget (Bot.web_widget_enabled).
 *   2. Rename the customer-facing slug.
 *   3. Manage the allowed-origins CORS list (chip editor).
 *   4. Copy the paste-able <script> snippet.
 *   5. Open a preview of /<slug> in a new tab.
 *
 * The dialog mounts only when open=true; closing resets all dirty state
 * via the controlled form values.
 */

"use client";

import { useState } from "react";
import { Copy, ExternalLink, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Bot } from "@/lib/types";
import type { AxiosError } from "axios";

interface WebWidgetDialogProps {
  bot: Bot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UpdatePayload {
  web_widget_enabled?: boolean;
  slug?: string;
  web_widget_allowed_origins?: string[];
}

/**
 * Outer dialog component — handles open/close + receives the bot prop.
 * The inner form lives in WebWidgetDialogContent below so we can re-mount
 * it (via a `key`) whenever the bot or open state changes. Re-mount
 * resets the form state without needing setState-in-effect (forbidden
 * in React 19 strict mode).
 */
export function WebWidgetDialog({ bot, open, onOpenChange }: WebWidgetDialogProps) {
  if (!bot) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <WebWidgetDialogContent
        key={`${bot.id}:${open}`}
        bot={bot}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function WebWidgetDialogContent({
  bot,
  onClose,
}: {
  bot: Bot;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initial state derives from props — no useEffect needed because the
  // parent remounts this component on bot/open changes via the `key`
  // prop. React 19 strict mode forbids setState-in-effect; this pattern
  // is the recommended alternative for "reset form on prop change".
  const [enabled, setEnabled] = useState(!!bot.web_widget_enabled);
  const [slug, setSlug] = useState(bot.slug ?? "");
  const [originsInput, setOriginsInput] = useState("");
  const [origins, setOrigins] = useState<string[]>(
    bot.web_widget_allowed_origins ?? [],
  );
  const [slugError, setSlugError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdatePayload) => {
      if (!bot) throw new Error("No bot selected");
      const res = await api.put(`/bots/${bot.id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myBots"] });
      toast({ description: "Configurações salvas." });
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<{
        detail?: { error?: string; message?: string };
      }>;
      const detail = axiosErr.response?.data?.detail;
      if (detail?.error === "slug_taken") {
        setSlugError(detail.message ?? "Este URL já está em uso.");
        return;
      }
      toast({
        description:
          detail?.message ?? "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  // Origin chip add — accepts paste of multiple origins separated by
  // whitespace/commas so the owner can paste from a doc.
  const addOrigin = () => {
    const candidates = originsInput
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (candidates.length === 0) return;
    const next = [...new Set([...origins, ...candidates])];
    setOrigins(next);
    setOriginsInput("");
  };

  const removeOrigin = (toRemove: string) => {
    setOrigins(origins.filter((o) => o !== toRemove));
  };

  const handleToggleEnabled = (next: boolean) => {
    setEnabled(next);
    updateMutation.mutate({ web_widget_enabled: next });
  };

  const handleSaveSlug = () => {
    setSlugError(null);
    if (!slug || slug === bot?.slug) return;
    updateMutation.mutate({ slug });
  };

  const handleSaveOrigins = () => {
    updateMutation.mutate({ web_widget_allowed_origins: origins });
  };

  // Snippet shown to the restaurant. Hardcodes window.location.origin so
  // the dev box pastes a localhost URL and production pastes the real one.
  const widgetHost =
    typeof window !== "undefined" ? window.location.origin : "https://zenbotz.com.br";
  const snippet = bot?.slug
    ? `<script src="${widgetHost}/widget-loader.js"
        data-slug="${bot.slug}"
        defer></script>`
    : "";

  // Static export means we can't have a /[slug] route — the preview
  // link points at /widget?slug=... until a CloudFront rewrite is set
  // up to translate /sabor-da-serra-zenbot/ → /widget?slug=...
  const previewUrl = bot?.slug
    ? `${widgetHost}/widget?slug=${encodeURIComponent(bot.slug)}`
    : null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${label} copiado!` });
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
          <DialogTitle>Atendimento pelo site</DialogTitle>
          <DialogDescription>
            Configure o widget de chat que o {bot.restaurant_name} pode
            incorporar no próprio site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Widget ativo</p>
              <p className="text-xs text-muted-foreground">
                Quando desativado, o site mostra &quot;atendimento
                indisponível&quot;.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Slug editor */}
          <div className="space-y-1.5">
            <Label htmlFor="widget-slug">URL personalizada</Label>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center rounded-md border bg-muted/40 pl-2 text-sm">
                <span className="text-muted-foreground">{widgetHost}/</span>
                <Input
                  id="widget-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugError(null);
                  }}
                  placeholder="sabor-da-serra-zenbot"
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveSlug}
                disabled={
                  updateMutation.isPending || !slug || slug === bot.slug
                }
              >
                Salvar
              </Button>
            </div>
            {slugError && (
              <p className="text-xs text-destructive">{slugError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Apenas letras minúsculas, dígitos e hífens. Ex:
              &quot;sabor-da-serra-zenbot&quot;.
            </p>
          </div>

          {/* Embed snippet */}
          <div className="space-y-1.5">
            <Label>Código para colar no site</Label>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                <code>{snippet}</code>
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => copyToClipboard(snippet, "Snippet")}
                aria-label="Copiar snippet"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole esse trecho no HTML do site, antes de
              &lt;/body&gt;.
            </p>
          </div>

          {/* Allowed origins */}
          <div className="space-y-1.5">
            <Label htmlFor="origins-input">Domínios autorizados</Label>
            <div className="flex flex-wrap gap-1.5">
              {origins.map((o) => (
                <span
                  key={o}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"
                >
                  {o}
                  <button
                    type="button"
                    onClick={() => removeOrigin(o)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/10"
                    aria-label={`Remover ${o}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {origins.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum domínio cadastrado — em produção isso bloqueia o
                  widget. Adicione, por exemplo, https://meurestaurante.com.br
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="origins-input"
                value={originsInput}
                onChange={(e) => setOriginsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOrigin();
                  }
                }}
                placeholder="https://meurestaurante.com.br"
              />
              <Button size="sm" variant="outline" onClick={addOrigin}>
                Adicionar
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveOrigins}
                disabled={updateMutation.isPending}
              >
                Salvar domínios
              </Button>
            </div>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Pré-visualizar</p>
                <p className="text-xs text-muted-foreground">
                  Abrir o widget em uma aba nova para testar.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(previewUrl, "_blank")}
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Abrir
              </Button>
            </div>
          )}
        </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
