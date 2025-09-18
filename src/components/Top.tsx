export default function Top({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[280px] text-center text-base font-semibold tracking-[0.35em]">
      {children}
    </div>
  );
}
