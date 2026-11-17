import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Card, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { Mail, MessageCircle, Save, Send, Smartphone } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import { CHANNELS, messagingErrorMessage } from "./utils/messagingChannels";

const ICONS = { sms: Smartphone, whatsapp: MessageCircle, email: Mail };

/** One channel's card: switch, fields (keys shown masked; leave a masked key as it is to keep it), save and a test send. */
function ChannelCard({ channel, initial }) {
  const [form, setForm] = useState(initial);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const Icon = ICONS[channel.key];

  const save = async () => {
    setBusy(true);
    try {
      const res = await api.put(`/messaging-settings/${channel.key}`, form);
      setForm(res.data?.data || form);
      toast.success(res.data?.message || "Saved.");
    } catch (err) {
      toast.error(messagingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/messaging-settings/${channel.key}/test`, { to: testTo.trim() });
      toast.success(res.data?.message || "Test sent.");
      setForm((f) => ({ ...f, last_test: { ok: true, message: res.data?.message, at: new Date().toISOString() } }));
    } catch (err) {
      const message = messagingErrorMessage(err);
      toast.error(message);
      setForm((f) => ({ ...f, last_test: { ok: false, message, at: new Date().toISOString() } }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Box component="form" data-enter-ignore="true" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
          <Icon size={18} />
          <Typography sx={{ fontWeight: 700 }}>{channel.title}</Typography>
          <Box sx={{ flex: 1 }} />
          <FormControlLabel control={<Switch checked={Boolean(form.enabled)} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />} label={form.enabled ? "On" : "Off"} />
        </Stack>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 1.5 }}>{channel.help}</Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          {channel.fields.map((field) => (
            <TextField key={field.key} size="small" label={field.label} value={form[field.key] || ""} helperText={field.help || " "}
              type={field.secret ? "password" : "text"} autoComplete="off"
              onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))} />
          ))}
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1, alignItems: { sm: "center" } }}>
          <Button type="submit" variant="contained" startIcon={<Save size={15} />} disabled={busy}>Save</Button>
          <TextField size="small" label={channel.key === "email" ? "Test email address" : "Test mobile number"} value={testTo}
            onChange={(e) => setTestTo(e.target.value)} sx={{ minWidth: 220 }} />
          <Button variant="outlined" startIcon={<Send size={15} />} disabled={busy || !testTo.trim()} onClick={() => void test()}>Send test OTP</Button>
        </Stack>
        {form.last_test && (
          <Alert severity={form.last_test.ok ? "success" : "error"} sx={{ mt: 1, py: 0 }}>
            Last test {new Date(form.last_test.at).toLocaleString()}: {form.last_test.message}
          </Alert>
        )}
      </Box>
    </Card>
  );
}

/**
 * Settings > Messaging: how this store sends customers one-time passwords (redeeming loyalty points at POS) by SMS
 * (MSG91), WhatsApp (Meta Cloud API) or email. Admin only; keys are stored encrypted and shown masked.
 */
export default function MessagingSettings() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api.get("/messaging-settings").then((res) => alive && setData(res.data?.data || {}))
      .catch((err) => alive && setError(messagingErrorMessage(err)));
    return () => { alive = false; };
  }, []);

  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "background.default" }}>
      <PageHeader onBack={() => navigate("/settings")} backLabel="Back to settings"
        title={<Breadcrumbs items={[{ label: "Settings", onClick: () => navigate("/settings") }, { label: "Messaging" }]} />} />
      <Stack spacing={2} sx={{ p: { xs: 1, md: 2 }, maxWidth: 980 }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Customers get a one-time password to approve redeeming loyalty points at POS. Switch on the channels you have an account for; the
          first one that can reach the customer is used (SMS, then WhatsApp, then email). With none, a supervisor approves the redemption.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {data && CHANNELS.map((channel) => (
          <ChannelCard key={channel.key} channel={channel} initial={data[channel.key] || { enabled: false }} />
        ))}
      </Stack>
    </Box>
  );
}
