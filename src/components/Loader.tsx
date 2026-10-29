export default function Loader() {
  return (
    <div className="fixed inset-0 z-[49] grid place-items-center bg-canvas/70 backdrop-blur-sm" role="status" aria-label="Loading">
      <div className="size-8 rounded-full border-2 border-line-strong border-t-accent animate-spin"/>
    </div>
  );
}
