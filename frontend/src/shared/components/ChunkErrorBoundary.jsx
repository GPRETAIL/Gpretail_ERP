import ErrorBoundary from "./ErrorBoundary";

/**
 * Kept for existing imports: the shared ErrorBoundary (reloads once after a deploy, otherwise contains and
 * reports the crash). New code should use ErrorBoundary directly with a variant and resetKeys.
 */
export default function ChunkErrorBoundary({ children, ...props }) {
  return <ErrorBoundary variant="app" homePath="/" {...props}>{children}</ErrorBoundary>;
}
