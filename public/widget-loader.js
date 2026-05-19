/*
 * ZenBotZ widget loader (plan/in_browser_bots.md §3.3).
 *
 * Paste this snippet on your restaurant's website:
 *
 *   <script src="https://widget.zenbotz.com.br/widget-loader.js"
 *           data-slug="sabor-da-serra-zenbot"
 *           data-position="br"
 *           data-primary-color="#00B14F"
 *           defer></script>
 *
 * The slug form is preferred — the iframe lands at /sabor-da-serra-zenbot
 * which the customer can also share directly. The older data-bot-id form
 * (e.g. data-bot-id="123") keeps working for embeds already pasted on
 * customer sites — the iframe falls back to /widget?bot_id=...
 *
 * Reads its config from data-* attributes on the <script> tag itself —
 * the recommended pattern from Intercom/Crisp/HelpScout. Creates:
 *
 *   1. A floating launcher button (bottom-right by default) that toggles
 *      the chat panel open/closed.
 *   2. An iframe pointing at /widget?bot_id=... which renders the actual
 *      chat UI (the Next.js page in app/(widget)/widget/page.tsx).
 *
 * Deliberately hand-rolled vanilla JS — no React, no bundler. The whole
 * file is loaded on every restaurant's site so it MUST stay small. The
 * heavy lifting (chat UI, SSE subscription) happens inside the iframe.
 *
 * Style isolation: the launcher button uses inline styles + a globally
 * unique class prefix `zb-` to minimize collision risk with the host
 * page's CSS. The iframe itself is style-isolated by the browser.
 */
(function () {
  "use strict";

  // Idempotency: if a page accidentally embeds the loader twice
  // (which happens on hot-reload or buggy CMS setups), short-circuit
  // the second invocation so we don't end up with two launchers.
  if (window.__ZENBOTZ_WIDGET_LOADED__) {
    return;
  }
  window.__ZENBOTZ_WIDGET_LOADED__ = true;

  // ── Config from <script data-*> ────────────────────────────────────

  function findOwnScript() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s.src && s.src.indexOf("widget-loader.js") !== -1) {
        return s;
      }
    }
    return document.currentScript || null;
  }

  var script = findOwnScript();
  if (!script) {
    console.warn("[ZenBotZ] loader script not found in DOM");
    return;
  }

  // Prefer data-slug (pretty URL); fall back to data-bot-id for older
  // embeds that predate the slug rollout.
  var SLUG = script.getAttribute("data-slug");
  var BOT_ID = script.getAttribute("data-bot-id");
  if (!SLUG && !BOT_ID) {
    console.warn("[ZenBotZ] data-slug or data-bot-id required on script tag");
    return;
  }

  var POSITION = script.getAttribute("data-position") || "br"; // br|bl|tr|tl
  var PRIMARY_COLOR = script.getAttribute("data-primary-color") || "#00B14F";
  // Origin of the widget host. Derive from the script's own URL so a
  // self-hosted instance (dev: localhost:3000) just works.
  var origin = (function () {
    try {
      return new URL(script.src).origin;
    } catch (_) {
      return "";
    }
  })();

  if (!origin) {
    console.warn("[ZenBotZ] could not derive widget origin from script src");
    return;
  }

  // ── DOM ────────────────────────────────────────────────────────────

  function applyPosition(el, pos) {
    el.style.position = "fixed";
    el.style.bottom = pos.indexOf("b") !== -1 ? "24px" : "auto";
    el.style.top = pos.indexOf("t") !== -1 ? "24px" : "auto";
    el.style.right = pos.indexOf("r") !== -1 ? "24px" : "auto";
    el.style.left = pos.indexOf("l") !== -1 ? "24px" : "auto";
  }

  function createLauncher() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "zb-launcher";
    btn.setAttribute("aria-label", "Abrir atendimento");
    btn.style.cssText = [
      "width:56px",
      "height:56px",
      "border-radius:50%",
      "border:none",
      "background:" + PRIMARY_COLOR,
      "color:#fff",
      "cursor:pointer",
      "box-shadow:0 4px 12px rgba(0,0,0,0.18)",
      "z-index:2147483646",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-size:24px",
      "padding:0",
    ].join(";");
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
      "</svg>";
    applyPosition(btn, POSITION);
    return btn;
  }

  function createPanel() {
    var panel = document.createElement("div");
    panel.className = "zb-panel";
    panel.style.cssText = [
      "width:380px",
      "height:600px",
      "max-height:calc(100vh - 96px)",
      "max-width:calc(100vw - 48px)",
      "border-radius:16px",
      "overflow:hidden",
      "box-shadow:0 12px 32px rgba(0,0,0,0.18)",
      "z-index:2147483647",
      "display:none",
      "background:#fff",
    ].join(";");
    // Position the panel above the launcher (24px gap + 56px launcher).
    panel.style.position = "fixed";
    panel.style.bottom = POSITION.indexOf("b") !== -1 ? "96px" : "auto";
    panel.style.top = POSITION.indexOf("t") !== -1 ? "96px" : "auto";
    panel.style.right = POSITION.indexOf("r") !== -1 ? "24px" : "auto";
    panel.style.left = POSITION.indexOf("l") !== -1 ? "24px" : "auto";
    return panel;
  }

  function createIframe() {
    var iframe = document.createElement("iframe");
    // Build the iframe URL. Both forms point at /widget; the slug case
    // uses ?slug= because the frontend is statically exported (no
    // dynamic Next.js routes). A future CloudFront rewrite can map
    // /<slug> → /widget?slug=<slug> for prettier customer URLs.
    var path = SLUG
      ? "/widget?slug=" + encodeURIComponent(SLUG)
      : "/widget?bot_id=" + encodeURIComponent(BOT_ID);
    iframe.src =
      origin +
      path +
      "&primary_color=" +
      encodeURIComponent(PRIMARY_COLOR);
    iframe.style.cssText =
      "width:100%;height:100%;border:none;display:block;background:#fff";
    iframe.setAttribute("title", "ZenBotZ chat");
    // Sandbox attributes — restrict the iframe's capabilities to just
    // what the widget needs (forms, scripts, same-origin for our own
    // domain, popups for the "Open in Mercado Pago" button).
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-popups",
    );
    return iframe;
  }

  function mount() {
    var launcher = createLauncher();
    var panel = createPanel();
    var iframe = createIframe();
    var iframeMounted = false;
    var open = false;

    function setOpen(next) {
      open = next;
      panel.style.display = open ? "block" : "none";
      // Lazy-mount the iframe on first open so a page with the widget
      // installed but never clicked doesn't pay the SSE-connection cost.
      if (open && !iframeMounted) {
        panel.appendChild(iframe);
        iframeMounted = true;
      }
      launcher.setAttribute(
        "aria-label",
        open ? "Fechar atendimento" : "Abrir atendimento",
      );
    }

    launcher.addEventListener("click", function () {
      setOpen(!open);
    });

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    // Public API on window for advanced integrations (open from a
    // "Order Now" button on the host site, etc.).
    window.ZenBotz = {
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      },
      toggle: function () {
        setOpen(!open);
      },
    };
  }

  // Mount when DOM is ready.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
