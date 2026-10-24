import React, { useState, useEffect, useCallback } from "react";
import useAsyncQuery from "../../hooks/useAsyncQuery";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import {
  Monitor,
  Download,
  Key,
  Printer,
  Cpu,
  Laptop,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  AlertTriangle,
  LifeBuoy,
  Timer,
  FileText,
  Radio,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  requestRemoteSupport,
  getActiveRemoteSupportSession,
  cancelRemoteSupportSession,
  getRemoteSupportSessions,
  endRemoteSupportSession,
} from "../../api/remoteSupportApi";

const cardSx = {
  borderRadius: "10px",
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const CATEGORIES = [
  { value: "printing", label: "Thermal Printer / Receipt Printing", icon: <Printer size={16} color="#3b82f6" /> },
  { value: "hardware", label: "Hardware / POS Device / Scanner", icon: <Cpu size={16} color="#8b5cf6" /> },
  { value: "software", label: "Software / Billing / ERP Issue", icon: <Laptop size={16} color="#10b981" /> },
  { value: "sync", label: "Sync / Database / Cloud Issue", icon: <RefreshCw size={16} color="#f59e0b" /> },
  { value: "general", label: "General Support & Training", icon: <LifeBuoy size={16} color="#6b7280" /> },
];

// Public OCI server verification key, not a password or a private signing key.
const SUPPORT_PUBLIC_KEY = "z75SamE4hzzLG447isRu3UqnK7GKFBaKFXcb9fK37Es=";

export default function RemoteSupport() {
  // Form State
  const [clientId, setClientId] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [category, setCategory] = useState("printing");
  const [priority, setPriority] = useState("normal");
  const [issueDescription, setIssueDescription] = useState("");
  const [supportDevice, setSupportDevice] = useState(() => /Android/i.test(navigator.userAgent) ? "android" : "windows");
  const [requestLoading, setRequestLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Active Session State
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // History & Consumption State
  const [historySessions, setHistorySessions] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    total_sessions: 0,
    total_minutes_consumed: 0,
    total_hours_formatted: "0 mins",
  });
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");

  const fetchActive = useCallback(() => getActiveRemoteSupportSession(), []);
  const { error: activeError, reload: loadActiveSession } = useAsyncQuery(fetchActive, {
    onSuccess: session => setActiveSession(session),
  });
  const fetchHistory = useCallback(() => getRemoteSupportSessions({
    page: historyPage + 1, per_page: historyRowsPerPage,
    ...(historyCategoryFilter !== "all" ? { category: historyCategoryFilter } : {}),
    ...(historySearch.trim() ? { search: historySearch.trim() } : {}),
  }), [historyPage, historyRowsPerPage, historyCategoryFilter, historySearch]);
  const { loading: historyLoading, error: historyError, reload: loadHistory } = useAsyncQuery(fetchHistory, {
    onSuccess: res => {
      setHistorySessions(res?.data?.data || []);
      setHistoryTotal(res?.data?.total || 0);
      if (res?.summary) setSummaryStats(res.summary);
    },
  });

  // Live timer for connected sessions
  useEffect(() => {
    if (!activeSession || activeSession.status !== "connected" || !activeSession.started_at) {
      return;
    }
    const started = new Date(activeSession.started_at).getTime();
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - started) / 1000));
      setElapsedSeconds(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Periodic poll for active session status updates while waiting/connected
  useEffect(() => {
    if (!activeSession || activeSession.status === "ended") return;
    const interval = setInterval(() => {
      loadActiveSession();
    }, 8000);
    return () => clearInterval(interval);
  }, [activeSession, loadActiveSession]);

  // Direct download handler for the lightweight tool
  const handleDownloadAgent = () => {
    const link = document.createElement("a");
    link.href = "/downloads/Vynerix%20Remote%20Tool.exe";
    link.setAttribute("download", "Vynerix Remote Tool.exe");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Smart Clipboard Parsing (Auto-splits "Your ID: ... Password: ...")
  const parseAndApplyIdPassword = (raw) => {
    if (!raw || !raw.trim()) return;
    const text = raw.trim();

    const idMatch = text.match(/(?:ID[:\s=]*)?(\d{3}[-\s]?\d{3}[-\s]?\d{3,4})/i);
    const pwMatch = text.match(/(?:password|pw|pass|one[-\s]?time[-\s]?password)[:\s=]*([a-zA-Z0-9]{4,16})/i);

    if (idMatch) {
      setClientId(idMatch[1].replace(/\s+/g, " "));
      if (pwMatch) {
        setClientPassword(pwMatch[1]);
        toast.success("Client ID & Password populated!");
        return;
      }
      const remaining = text.replace(idMatch[0], "").trim().split(/[\s,;|]+/)[0];
      if (remaining && /^[a-zA-Z0-9]{4,16}$/.test(remaining)) {
        setClientPassword(remaining);
        toast.success("Client ID & Password populated!");
        return;
      }
      toast.success("Client ID populated!");
    } else if (/^[a-zA-Z0-9]{4,16}$/.test(text)) {
      setClientPassword(text);
      toast.success("Password populated!");
    } else {
      setClientId(text);
    }
  };

  const handleSmartPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.info("Clipboard is empty. Copy your ID or password first.");
        return;
      }
      parseAndApplyIdPassword(text);
    } catch {
      toast.info("Press Ctrl+V in the Client ID field to paste.");
    }
  };

  // Submit Support Request
  const handleRequestSupport = async (e) => {
    e.preventDefault();
    if (!clientId.trim()) {
      toast.error("Please enter your Vynerix Client ID");
      return;
    }
    try {
      setRequestLoading(true);
      await requestRemoteSupport({
        client_id: clientId.trim(),
        client_password: clientPassword.trim() || null,
        customer_name: customerName.trim() || undefined,
        contact_number: contactNumber.trim() || undefined,
        category,
        priority,
        issue_description: issueDescription.trim() || undefined,
        system_os: supportDevice === "android" ? "Android" : "Windows",
      });
      setClientPassword("");
      toast.success("Remote support request submitted! An engineer will connect shortly.");
      loadActiveSession();
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit support request");
    } finally {
      setRequestLoading(false);
    }
  };

  // Cancel Request
  const handleCancelRequest = async () => {
    if (!activeSession) return;
    try {
      setCancelLoading(true);
      await cancelRemoteSupportSession(activeSession.id);
      setActiveSession(null);
      toast.info("Support request cancelled");
      loadActiveSession();
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel request");
    } finally {
      setCancelLoading(false);
    }
  };

  // End Active Session
  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await endRemoteSupportSession(activeSession.id, "Customer closed session");
      setActiveSession(null);
      toast.info("Support request closed. Close the remote client to stop screen sharing.");
      loadActiveSession();
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to end session");
    }
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5, color: "text.primary" }}>
            <Monitor size={28} color="#2563eb" />
            Vynerix Remote Support & Desktop Assistance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Request instant remote desktop assistance from Vynerix technical support engineers for your POS, thermal printers, and software issues.
          </Typography>
        </Box>
        <Chip
          icon={<Radio size={14} className="animate-pulse" />}
          label="Support on request"
          color="success"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {(activeError || historyError) && <Alert severity="error" action={<Button color="inherit" onClick={() => { loadActiveSession(); loadHistory(); }}>Retry</Button>} sx={{ mb: 2 }}>
        {activeError?.response?.data?.message || historyError?.response?.data?.message || "Unable to load remote support. Please retry."}
      </Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>Submit a request only while you are present. Share a temporary password and approve the technician in the remote client. Close the client to stop screen access.</Alert>
      {/* Top Stat Cards: Usage & Consumption */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: "8px", bgcolor: "primary.lighter", color: "primary.main" }}>
                <Clock size={24} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Time Consumed
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {summaryStats.total_hours_formatted || "0 mins"}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: "8px", bgcolor: "info.lighter", color: "info.main" }}>
                <FileText size={24} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total Sessions
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {summaryStats.total_sessions || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: "8px", bgcolor: activeSession ? "warning.lighter" : "success.lighter", color: activeSession ? "warning.main" : "success.main" }}>
                <Timer size={24} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Active Support Status
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {activeSession ? (activeSession.status === "connected" ? "Request accepted" : "Waiting in Queue") : "Ready to Request"}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: "8px", bgcolor: "secondary.lighter", color: "secondary.main" }}>
                <ShieldCheck size={24} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Security & Encryption
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "success.main" }}>
                  End-to-End Encrypted
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Support Workspace */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Left: 3-Step Guide & Tool Download */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <ShieldCheck size={20} color="#10b981" />
                How to Get Remote Assistance
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <TextField select label="Device needing support" value={supportDevice} onChange={event => setSupportDevice(event.target.value)} size="small" fullWidth>
                  <MenuItem value="windows">Windows computer</MenuItem>
                  <MenuItem value="android">Android phone / tablet</MenuItem>
                </TextField>
                {/* Step 1 */}
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    1
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Download Remote Support Client
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {supportDevice === "android" ? "Get the Android APK from the official RustDesk releases. Choose the build for your device." : "Open-source portable client. Keep it running only when you need support; installation is optional. The technician can connect from their browser."}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                      {supportDevice === "android" ? <Button component="a" href="https://github.com/rustdesk/rustdesk/releases/latest" target="_blank" rel="noopener noreferrer" variant="contained" size="small" startIcon={<Download size={16} />}>Get Android app (official)</Button> : <Button
                        variant="contained"
                        size="small"
                        startIcon={<Download size={16} />}
                        onClick={handleDownloadAgent}
                        sx={{ textTransform: "none", borderRadius: "6px", fontWeight: 700 }}
                      >
                        Download (.exe)
                      </Button>}

                    </Box>
                  </Box>
                </Box>

                <Alert severity="info" sx={{ "& code": { overflowWrap: "anywhere" } }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Use the Vynerix support server</Typography>
                  <Typography variant="body2">In the client, open Settings → Network → ID / Relay server and apply these public settings before sharing your ID. The customer app and technician browser must use the same server.</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>ID server: <code>remote.gpsoftware.in</code><br />Relay server: <code>remote.gpsoftware.in:21117</code><br />Key: <code>{SUPPORT_PUBLIC_KEY}</code><br />API server: leave empty.</Typography>
                  <Button size="small" startIcon={<Copy size={14} />} onClick={async () => {
                    try { await navigator.clipboard.writeText(SUPPORT_PUBLIC_KEY); toast.success("Public server key copied"); }
                    catch { toast.error("Clipboard unavailable. Select and copy the public key above."); }
                  }}>Copy public server key</Button>
                  <Typography variant="caption" display="block">Already configured? Keep the app open and use its current ID. The browser alone can share a screen, but full desktop control requires the customer app.</Typography>
                </Alert>

                {/* Step 2 */}
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    2
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Open the Tool & Note Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {supportDevice === "android" ? <>Open RustDesk, choose <strong>Share Screen</strong>, allow <strong>Screen Capture</strong> and start the service. Enable <strong>Input Control</strong> yourself in Android Accessibility settings only if you want the technician to control the device. Then copy the phone&apos;s <strong>Client ID</strong> and temporary <strong>Password</strong>.</> : <>Open the downloaded file. It displays your <strong>Client ID</strong> (e.g. <code>123 456 789</code>) and temporary <strong>Password</strong>.</>}
                    </Typography>
                    {supportDevice === "android" && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Android may ask for screen-sharing approval again after restarting the app. Protected screens may appear blank. Stop sharing in RustDesk or Android to end access; closing this ERP page does not stop it.</Typography>}
                    <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600, display: "block", mt: 0.5 }}>
                      💡 Tip: Click the three dots [ ⋮ ] next to ID to copy your ID.
                    </Typography>
                  </Box>
                </Box>

                {/* Step 3 */}
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    3
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Submit Your Request
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Select your issue type (Printing, Hardware, Software), paste your ID, and click <strong>Request Remote Assistance</strong>.
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 3, borderRadius: "8px" }}>
                <strong>Customer Privacy:</strong> You maintain full control over your computer. You can disconnect the support engineer at any time by closing the tool.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Request Form or Active Session Banner */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3 }}>
              {activeSession && (activeSession.status === "waiting" || activeSession.status === "connected") ? (
                // Active / Waiting Session Banner
                <Box>
                  <Alert
                    severity={activeSession.status === "connected" ? "success" : "warning"}
                    icon={activeSession.status === "connected" ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                    sx={{ mb: 3, borderRadius: "8px" }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {activeSession.status === "connected"
                        ? "Support Engineer Accepted Your Request"
                        : "Support Request Sent — Waiting in Support Queue"}
                    </Typography>
                    <Typography variant="body2">
                      {activeSession.status === "connected"
                        ? `${activeSession.technician?.name || "Vynerix Support Engineer"} is handling your request. Keep the remote app open; it will show the actual screen-sharing connection.`
                        : "Your request has been dispatched to Vynerix technical support. Please keep the Vynerix Remote Tool open."}
                    </Typography>
                  </Alert>

                  <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: "8px", bgcolor: "action.hover" }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          Vynerix Client ID
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                          {activeSession.client_id}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          Category
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, textTransform: "capitalize" }}>
                          {activeSession.category || "General"}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          Session Timer
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                          {activeSession.status === "connected" ? formatTimer(elapsedSeconds) : "00:00"}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          Status
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={activeSession.status === "connected" ? "ACCEPTED" : activeSession.status.toUpperCase()}
                            color={activeSession.status === "connected" ? "success" : "warning"}
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>
                      </Grid>

                      {activeSession.issue_description && (
                        <Grid size={12}>
                          <Typography variant="caption" color="text.secondary">
                            Issue Description
                          </Typography>
                          <Typography variant="body2">{activeSession.issue_description}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>

                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    {activeSession.status === "waiting" ? (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<XCircle size={18} />}
                        onClick={handleCancelRequest}
                        disabled={cancelLoading}
                        sx={{ borderRadius: "8px", textTransform: "none" }}
                      >
                        {cancelLoading ? "Cancelling..." : "Cancel Support Request"}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<XCircle size={18} />}
                        onClick={handleEndSession}
                        sx={{ borderRadius: "8px", textTransform: "none" }}
                      >
                        Close support request
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<RefreshCw size={16} />}
                      onClick={loadActiveSession}
                      sx={{ borderRadius: "8px", textTransform: "none" }}
                    >
                      Refresh Status
                    </Button>
                  </Box>
                </Box>
              ) : (
                // Support Request Form
                <form onSubmit={handleRequestSupport}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Request Technical Assistance
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<Copy size={15} />}
                      onClick={handleSmartPaste}
                      sx={{ textTransform: "none", borderRadius: "6px", fontWeight: 700, fontSize: "0.82rem" }}
                    >
                      Paste Both (ID & Password)
                    </Button>
                  </Box>

                  <Grid container spacing={2}>
                    {/* Category Selection */}
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <FormControl fullWidth required>
                        <InputLabel id="category-select-label">Issue Category</InputLabel>
                        <Select
                          labelId="category-select-label"
                          label="Issue Category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          {CATEGORIES.map((cat) => (
                            <MenuItem key={cat.value} value={cat.value}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                {cat.icon}
                                <span>{cat.label}</span>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Priority Selection */}
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FormControl fullWidth>
                        <InputLabel id="priority-select-label">Priority</InputLabel>
                        <Select
                          labelId="priority-select-label"
                          label="Priority"
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                        >
                          <MenuItem value="normal">Normal</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                          <MenuItem value="urgent">Urgent (Billing Down)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Client ID */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        required
                        label="Vynerix Client ID"
                        placeholder="e.g. 413 593 273"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        onPaste={(e) => {
                          const pasted = e.clipboardData?.getData("text");
                          if (pasted && (pasted.includes(" ") || pasted.includes("\n") || pasted.toLowerCase().includes("password") || pasted.toLowerCase().includes("pw"))) {
                            e.preventDefault();
                            parseAndApplyIdPassword(pasted);
                          }
                        }}
                        InputProps={{
                          startAdornment: <Monitor size={18} style={{ marginRight: 8, opacity: 0.6 }} />,
                        }}
                      />
                    </Grid>

                    {/* Temporary Password */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Temporary Password"
                        placeholder="e.g. eysmhf"
                        value={clientPassword}
                        onChange={(e) => setClientPassword(e.target.value)}
                        InputProps={{
                          startAdornment: <Key size={18} style={{ marginRight: 8, opacity: 0.6 }} />,
                        }}
                      />
                    </Grid>

                    {/* Contact Person Name */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Store / Contact Person Name"
                        placeholder="e.g. Store name - Contact person"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </Grid>

                    {/* Contact Phone */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Contact Number (Mobile / WhatsApp)"
                        placeholder="e.g. 9876543210"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                      />
                    </Grid>

                    {/* Issue Description */}
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Issue Description (What is happening?)"
                        placeholder="Describe the issue (e.g. Thermal printer paper cut error, barcode scanner not reading QR, or billing tax calculation error)..."
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                      />
                    </Grid>

                    {/* Submit Button */}
                    <Grid size={12}>
                      <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={requestLoading}
                        startIcon={requestLoading ? <CircularProgress size={20} color="inherit" /> : <Monitor size={20} />}
                        sx={{ borderRadius: "8px", py: 1.5, fontWeight: 700, textTransform: "none", fontSize: "1rem" }}
                      >
                        {requestLoading ? "Submitting Request..." : "Request Remote Assistance"}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Support History & Time Consumed Table */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                <Clock size={20} color="#2563eb" />
                Remote Support History & Time Consumed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Log of all remote desktop sessions requested by this store, showing duration consumed and resolution notes.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="history-category-filter">Category</InputLabel>
                <Select
                  labelId="history-category-filter"
                  label="Category"
                  value={historyCategoryFilter}
                  onChange={(e) => {
                    setHistoryCategoryFilter(e.target.value);
                    setHistoryPage(0);
                  }}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(0);
                }}
                sx={{ width: 180 }}
              />

              <IconButton size="small" onClick={loadHistory} disabled={historyLoading}>
                <RefreshCw size={18} className={historyLoading ? "animate-spin" : ""} />
              </IconButton>
            </Box>
          </Box>

          {historyLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress size={32} />
            </Box>
          ) : historySessions.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
              <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 8 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>No Support Sessions Logged Yet</Typography>
              <Typography variant="body2">When a technician connects to assist your store, session details and time consumed will appear here.</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Issue & Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Assisting Engineer</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Time Consumed</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Resolution Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historySessions.map((sess) => {
                    const isConnected = sess.status === "connected";
                    const isEnded = sess.status === "ended";
                    const isWaiting = sess.status === "waiting";
                    return (
                      <TableRow key={sess.id} hover>
                        {/* Date & Time */}
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {sess.created_at ? new Date(sess.created_at).toLocaleDateString() : "-"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {sess.created_at ? new Date(sess.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </Typography>
                        </TableCell>

                        {/* Issue & Category */}
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Chip
                              size="small"
                              label={sess.category ? sess.category.toUpperCase() : "GENERAL"}
                              sx={{ fontSize: "0.7rem", height: 20, fontWeight: 700 }}
                            />
                            {sess.priority === "urgent" && (
                              <Chip
                                size="small"
                                icon={<AlertTriangle size={12} />}
                                label="URGENT"
                                color="error"
                                sx={{ fontSize: "0.7rem", height: 20, fontWeight: 700 }}
                              />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ maxWidth: 280, wordBreak: "break-word" }}>
                            {sess.issue_description || "Remote assistance session"}
                          </Typography>
                        </TableCell>

                        {/* Technician */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {sess.technician?.name || (isConnected ? "Assigned Engineer" : "-")}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {sess.client_id}
                          </Typography>
                        </TableCell>

                        {/* Time Consumed */}
                        <TableCell>
                          <Chip
                            size="small"
                            icon={<Clock size={12} />}
                            label={sess.duration_formatted || (isConnected ? "In progress" : "-")}
                            color={isEnded ? "primary" : isConnected ? "success" : "default"}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Chip
                            size="small"
                            label={isConnected ? "ACCEPTED" : sess.status.toUpperCase()}
                            color={isConnected ? "success" : isWaiting ? "warning" : isEnded ? "default" : "error"}
                            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                          />
                        </TableCell>

                        {/* Resolution Notes */}
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220, wordBreak: "break-word" }}>
                            {sess.notes || (isEnded ? "Completed" : "-")}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={historyTotal}
                rowsPerPage={historyRowsPerPage}
                page={historyPage}
                onPageChange={(_, newPage) => setHistoryPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setHistoryRowsPerPage(parseInt(e.target.value, 10));
                  setHistoryPage(0);
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
