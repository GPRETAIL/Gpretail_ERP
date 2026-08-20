import React, { useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

// Reusable manual-notification modal. Pass a `target` object to open it:
//   { companyId, storeId?, warehouseId?, label, scope?, defaultSubject?, defaultMessage? }
// It emails the resolved contact (company/store/warehouse) + the platform inbox. `onClose` hides it.
const NotifyModal = ({ target, onClose }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (target) {
      setSubject(target.defaultSubject || "");
      setMessage(target.defaultMessage || "");
    }
  }, [target]);

  if (!target) return null;

  const send = async (event) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) return toast.error("Subject and message are required");
    try {
      setSending(true);
      const res = await api.post("/admin/notify", {
        companyId: target.companyId,
        storeId: target.storeId || null,
        warehouseId: target.warehouseId || null,
        subject: subject.trim(),
        message: message.trim(),
      });
      const d = res.data?.data || {};
      if (d.configured === false) {
        toast.info("Recorded, but email isn't configured yet (no send).");
      } else if (d.sent) {
        toast.success(`Notification sent to ${d.recipients?.length || 0} recipient(s)`);
      } else {
        toast.warn("Email send failed — check server logs / Brevo setup");
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={send} className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Notify — {target.label}</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <p className="text-xs text-slate-500">Emails the {target.scope || "company"}'s contact (and your admin inbox for a record).</p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
          <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="submit" disabled={sending} className="inline-flex items-center gap-1.5 rounded-lg bg-[#3a6ea5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <Send className="w-4 h-4" /> {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotifyModal;
