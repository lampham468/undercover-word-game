type Variant = 'primary' | 'ghost';

export default function Bottom({
  children, onClick, disabled, variant = 'primary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
}) {
  const base = "w-full max-w-[280px] rounded-2xl py-3 text-base font-medium transition disabled:opacity-50";
  const style = variant === 'primary'
    ? "border border-neutral-300 bg-white hover:shadow-sm active:translate-y-px"
    : "text-neutral-600 underline underline-offset-4 hover:text-neutral-800";
  return (
    <button className={`${base} ${style}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
