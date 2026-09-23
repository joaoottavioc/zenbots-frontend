"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { setAuthPresence, setCsrfToken } from '@/lib/auth';
import { getSafeErrorMessage } from '@/lib/error-messages';
import { useToast } from '@/hooks/use-toast';

// Google Identity Services (GIS). Loaded on demand — no SDK request is made
// when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset, same posture as the FB SDK in
// connect-whatsapp-button.tsx.
const GSI_SRC = "https://accounts.google.com/gsi/client";

// GIS refuses widths outside this range and falls back to its default.
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

const SDK_POLL_INTERVAL_MS = 50;
const SDK_LOAD_TIMEOUT_MS = 10_000;

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

interface GoogleSignInButtonProps {
  /** Text on the divider above the button. */
  dividerLabel: string;
  /** Google's own button copy: "signin_with" on /login, "signup_with" on /cadastro. */
  buttonText?: 'signin_with' | 'signup_with';
}

/**
 * Google Sign-In, rendered by Google's own widget.
 *
 * Both paths land on the same backend endpoint (`POST /auth/google`), which
 * logs in an existing account or creates one on first sign-in — so the only
 * difference between /login and /cadastro is the wording.
 *
 * Renders nothing at all (divider included) when the client ID is missing or
 * the GIS script fails to load, so a broken or blocked SDK never leaves a
 * dangling separator above empty space.
 */
export default function GoogleSignInButton({
  dividerLabel,
  buttonText = 'signin_with',
}: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  return (
    <GoogleSignInButtonLive
      clientId={clientId}
      dividerLabel={dividerLabel}
      buttonText={buttonText}
    />
  );
}

function GoogleSignInButtonLive({
  clientId,
  dividerLabel,
  buttonText,
}: GoogleSignInButtonProps & { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  // Computed lazily rather than set from an effect: when a second instance
  // mounts (e.g. /login -> /cadastro) GIS is already on the page, so it starts
  // ready instead of flashing a spinner for one render.
  const [isSdkLoaded, setIsSdkLoaded] = useState(
    () => typeof window !== 'undefined' && !!window.google?.accounts?.id
  );
  const [isSdkBlocked, setIsSdkBlocked] = useState(false);

  const googleMutation = useMutation({
    mutationFn: (credential: string) => api.post('/auth/google', { credential }),
    onSuccess: (response) => {
      if (response.data?.csrf_token) {
        setCsrfToken(response.data.csrf_token);
      }
      setAuthPresence();

      toast({
        title: "Login realizado!",
        description: "Redirecionando para o painel...",
        className: "bg-emerald-50 border-emerald-200",
      });

      router.push('/meus-bots');
    },
    onError: (error: unknown) => {
      const message = getSafeErrorMessage(
        error,
        "Nao foi possivel entrar com o Google. Tente novamente."
      );
      toast({
        title: "Falha ao entrar",
        description: message,
        variant: "destructive",
      });
    },
  });

  const { mutate } = googleMutation;

  const handleCredential = useCallback(
    (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        toast({
          title: "Falha ao entrar",
          description: "O Google nao retornou uma credencial valida.",
          variant: "destructive",
        });
        return;
      }
      mutate(response.credential);
    },
    [mutate, toast]
  );

  // Kept in a ref so the GIS callback — registered once, at initialize() time —
  // always reaches the current handler instead of closing over a stale one.
  const onCredentialRef = useRef(handleCredential);
  useEffect(() => {
    onCredentialRef.current = handleCredential;
  }, [handleCredential]);

  // Load the GIS script once per page, reusing the tag if another mount added it.
  useEffect(() => {
    if (isSdkLoaded) return;

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    const script = existing ?? document.createElement('script');

    const handleError = () => setIsSdkBlocked(true);
    script.addEventListener('error', handleError);

    if (!existing) {
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Readiness is polled rather than taken from the script's "load" event:
    // if the tag is already on the page and finished loading (a remount, or
    // React StrictMode's double-invoke in dev), "load" never fires again and
    // a listener-only approach waits forever on an SDK that is right there.
    const poll = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(poll);
        setIsSdkLoaded(true);
      }
    }, SDK_POLL_INTERVAL_MS);

    // Give up rather than spin forever when the script is blocked by an
    // extension or CSP without ever firing an error event.
    const timeout = setTimeout(() => {
      clearInterval(poll);
      setIsSdkBlocked(true);
    }, SDK_LOAD_TIMEOUT_MS);

    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
      script.removeEventListener('error', handleError);
    };
  }, [isSdkLoaded]);

  // Render (and re-render on resize) Google's widget at the container's width.
  const renderGoogleButton = useCallback(() => {
    const container = containerRef.current;
    const gis = window.google?.accounts?.id;
    if (!container || !gis) return;

    const width = Math.round(
      Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_BUTTON_WIDTH, container.offsetWidth))
    );

    // renderButton appends; clear first so a resize replaces rather than stacks.
    container.innerHTML = '';
    gis.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large', // 40px tall — matches the h-10 submit button below it
      shape: 'rectangular',
      text: buttonText,
      logo_alignment: 'center',
      locale: 'pt-BR',
      width,
    });
  }, [buttonText]);

  useEffect(() => {
    if (!isSdkLoaded) return;
    const gis = window.google?.accounts?.id;
    const container = containerRef.current;
    if (!gis || !container) return;

    // initialize() is global to the page and warns when called repeatedly, so
    // it runs once per mount while renderButton below re-runs freely on resize.
    if (!isInitializedRef.current) {
      gis.initialize({
        client_id: clientId,
        callback: (response) => onCredentialRef.current(response),
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      });
      isInitializedRef.current = true;
    }

    renderGoogleButton();

    const observer = new ResizeObserver(renderGoogleButton);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isSdkLoaded, clientId, renderGoogleButton]);

  if (isSdkBlocked) return null;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {dividerLabel}
          </span>
        </div>
      </div>

      <div className="relative min-h-10">
        <div
          ref={containerRef}
          data-testid="google-signin-container"
          className={
            googleMutation.isPending
              ? "flex justify-center opacity-0"
              : "flex justify-center"
          }
        />

        {!isSdkLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {googleMutation.isPending && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando com o Google...
          </div>
        )}
      </div>
    </div>
  );
}
