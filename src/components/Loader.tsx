interface LoaderProps {
  label?: string;
}

export default function Loader({label}: LoaderProps) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-canvas/95 backdrop-blur-sm" role="status" aria-live="polite" aria-label={label ?? 'Loading'}>
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-line-strong border-t-accent animate-spin"/>
        {label && <p className="text-[13px] font-medium text-ink-2">{label}</p>}
      </div>
    </div>
  );
}
