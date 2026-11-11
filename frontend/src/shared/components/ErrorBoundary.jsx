import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { reportClientError } from "@/shared/utils/clientErrors";

// After a deploy, an open tab can ask for a code file that no longer exists. One reload picks up the new
// build; the sessionStorage guard stops a genuinely broken file from reload-looping.
const RELOAD_GUARD_KEY = "vx_chunk_reload_attempted";

const isChunkLoadError = (error) => {
  const message = String(error?.message || "");
  return error?.name === "ChunkLoadError" || /dynamically imported module/i.test(message) || /Loading chunk [\w-]+ failed/i.test(message)
    || /Importing a module script failed/i.test(message);
};

const sameKeys = (a = [], b = []) => a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

function Fallback({ variant, chunk, reference, onRetry, onHome }) {
  if (variant === "widget") {
    return (
      <Box role="alert" sx={{ height: "100%", minHeight: 96, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, p: 2, textAlign: "center",
        border: "1px dashed", borderColor: "divider", borderRadius: "10.5px", bgcolor: "background.paper" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>This section could not be shown.</Typography>
        <Button size="small" variant="outlined" startIcon={<RotateCcw size={14} />} onClick={onRetry}>Retry</Button>
        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Reference {reference}</Typography>
      </Box>
    );
  }
  const title = chunk ? "A new version of Vynerix is available." : variant === "app" ? "Vynerix stopped working." : "Something went wrong on this page.";
  const text = chunk ? "Refresh to load it." : "Your saved data is safe. Try again, and if it keeps happening tell your administrator the reference below.";
  return (
    <Box role="alert" sx={{ display: "flex", minHeight: variant === "app" ? "100vh" : "50vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, textAlign: "center", p: 3,
      bgcolor: variant === "app" ? "background.default" : "transparent" }}>
      <Box sx={{ color: chunk ? "primary.main" : "warning.main", display: "inline-flex" }}><AlertTriangle size={32} /></Box>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: "text.primary" }}>{title}</Typography>
      <Typography sx={{ fontSize: 14, color: "text.secondary", maxWidth: 460 }}>{text}</Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", mt: 0.5 }}>
        {chunk || variant === "app" ? (
          <Button variant="contained" onClick={() => window.location.reload()} sx={{ textTransform: "none", fontWeight: 600 }}>Refresh</Button>
        ) : (
          <Button variant="contained" startIcon={<RotateCcw size={16} />} onClick={onRetry} sx={{ textTransform: "none", fontWeight: 600 }}>Try again</Button>
        )}
        {!chunk && onHome && <Button variant="outlined" onClick={onHome} sx={{ textTransform: "none", fontWeight: 600 }}>{variant === "app" ? "Go to the start page" : "Go to Dashboard"}</Button>}
      </Box>
      {!chunk && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Reference {reference}</Typography>}
    </Box>
  );
}

/**
 * Contains a crash to the part it happened in, says so honestly, and reports it (shared/utils/clientErrors).
 *
 * variant    "page" (default) | "widget" | "app"
 * where      what to call this place in the report, e.g. "dashboard:hrms:today"
 * resetKeys  values that clear the error when they change (the page path, a tab)
 * homePath   where "Go to Dashboard" leads (page/app variants); omitted hides the button
 */
export default class ErrorBoundary extends React.Component {
  state = { error: null, chunk: false, reference: null };

  static getDerivedStateFromError(error) {
    return { error, chunk: isChunkLoadError(error) };
  }

  componentDidCatch(error, info) {
    if (isChunkLoadError(error)) {
      let alreadyTried = false;
      try {
        alreadyTried = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
        if (!alreadyTried) sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      } catch {
        // sessionStorage unavailable: fall through to the fallback.
      }
      if (!alreadyTried) window.location.reload();
      return;
    }
    const reference = reportClientError({ error, componentStack: info?.componentStack, where: this.props.where || this.props.variant || "page" });
    this.setState({ reference });
  }

  componentDidUpdate(previous) {
    if (this.state.error && !sameKeys(previous.resetKeys, this.props.resetKeys)) this.reset();
  }

  reset = () => this.setState({ error: null, chunk: false, reference: null });

  goHome = () => {
    this.reset();
    window.location.assign(this.props.homePath || "/");
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <Fallback variant={this.props.variant || "page"} chunk={this.state.chunk} reference={this.state.reference || "…"}
      onRetry={this.reset} onHome={this.props.homePath ? this.goHome : null} />;
  }
}
