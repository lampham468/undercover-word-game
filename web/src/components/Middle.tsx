export default function Middle({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[280px] aspect-[3/4] rounded-3xl border border-neutral-300 bg-white px-6 flex items-center justify-center text-neutral-600 shadow-sm">
      {children}
    </div>
  );
}
