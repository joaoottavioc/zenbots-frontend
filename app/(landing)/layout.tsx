export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased [&_::selection]:bg-cyan-200/60 [&_::selection]:text-slate-900">
      {children}
    </div>
  );
}
