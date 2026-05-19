/**
 * Minimal layout for the iframe-served chat widget.
 *
 * Lives under the (widget) route group so it does NOT inherit the
 * dashboard's (portal) / (auth) chrome (nav bar, sidebar, header).
 * The widget renders inside an iframe — the host page's layout is
 * irrelevant; this layout owns the iframe's full viewport.
 *
 * Note: this layout still nests under app/layout.tsx (Next.js' app
 * router always wraps with the root layout), so the React Query and
 * Toaster providers from there are available. We just don't add any
 * widget-specific chrome on top.
 */

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-transparent">
      {children}
    </div>
  );
}
