export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-200 antialiased [&_::selection]:bg-cyan-500/30 [&_::selection]:text-white">
      {children}
    </div>
  );
}
