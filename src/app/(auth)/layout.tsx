export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="text-sm font-semibold tracking-tight">Home Digital Twin</div>
      {children}
    </main>
  );
}
