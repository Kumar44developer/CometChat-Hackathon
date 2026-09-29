// Loading indicator — flat ring spinner on the current text color.
// Pair it with aria-busy="true" on the host button and an sr-only label
// so the loading state is both visible and announced.
export default function Spinner({ size = 16, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
