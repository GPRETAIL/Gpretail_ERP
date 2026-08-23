import React, { useState, useEffect, useCallback } from "react";
import { Settings2, LogIn, LogOut, CalendarOff } from "lucide-react";
import api from "../../api/axios";
import { SkeletonTransList } from "../components/SkeletonCards";

const STATUS_STYLES = {
  PRESENT:    { label: "Present",    dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  ABSENT:     { label: "Absent",     dot: "bg-rose-500",    text: "text-rose-700",    bg: "bg-rose-50 border-rose-100" },
  LEAVE:      { label: "On Leave",   dot: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50 border-violet-100" },
  HALF_DAY:   { label: "Half Day",   dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-100" },
  NOT_MARKED: { label: "Not marked", dot: "bg-slate-400",   text: "text-slate-500",   bg: "bg-slate-50 border-slate-200" },
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${suffix}`;
};

/**
 * Daily attendance roll-call: an admin/manager marks each employee's
 * check-in/check-out/leave for today (no self-service check-in yet -
 * there's no link between the logged-in user and an Employee record).
 */
export default function AttendanceScreen() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionEmployeeId, setActionEmployeeId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ shift_start: "09:30", late_cutoff: "10:00" });
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/attendance/today");
      const data = res.data?.data || {};
      setRows(data.rows || []);
      setSummary(data.summary || null);
      setSettingsForm({
        shift_start: data.settings?.shift_start || "09:30",
        late_cutoff: data.settings?.late_cutoff || "10:00",
      });
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (employeeId, action) => {
    setActionEmployeeId(employeeId);
    try {
      await api.post(`/attendance/${action}`, { employee_id: employeeId });
      await load();
    } catch {
      alert("Could not update attendance. Please try again.");
    } finally {
      setActionEmployeeId(null);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.post("/attendance/settings", settingsForm);
      setSettingsOpen(false);
      await load();
    } catch {
      alert("Could not save attendance settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div>
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { key: "total", label: "Total", color: "text-slate-800" },
          { key: "present", label: "Present", color: "text-emerald-600" },
          { key: "absent", label: "Absent", color: "text-rose-600" },
          { key: "leave", label: "Leave", color: "text-violet-600" },
        ].map((s) => (
          <div key={s.key} className="p-2.5 rounded-2xl bg-white border border-slate-200/80 text-center">
            <p className={`text-base font-black m-0 ${s.color}`}>{summary?.[s.key] ?? 0}</p>
            <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2 px-1">
        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider m-0">Today's Roll Call</h4>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1 text-[10.5px] font-bold text-indigo-600 px-2 py-1 rounded-lg active:bg-indigo-50"
        >
          <Settings2 size={13} /> Shift Timing
        </button>
      </div>

      {loading ? (
        <SkeletonTransList count={4} />
      ) : rows.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No active employees found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const style = STATUS_STYLES[row.status] || STATUS_STYLES.NOT_MARKED;
            const isBusy = actionEmployeeId === row.employee_id;
            return (
              <div key={row.employee_id} className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 m-0 truncate">{row.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{row.department || row.code}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${style.bg} ${style.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100">
                  {row.status === "PRESENT" && row.check_out ? (
                    <p className="text-[10.5px] font-semibold text-slate-500 m-0">
                      In {fmtTime(row.check_in)} &middot; Out {fmtTime(row.check_out)}
                    </p>
                  ) : row.status === "PRESENT" ? (
                    <p className="text-[10.5px] font-semibold text-slate-500 m-0">Checked in {fmtTime(row.check_in)}</p>
                  ) : row.status === "LEAVE" ? (
                    <p className="text-[10.5px] font-semibold text-slate-500 m-0">Marked on leave</p>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-1.5">
                    {row.status === "PRESENT" && !row.check_out && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => doAction(row.employee_id, "check-out")}
                        className="flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 text-white active:scale-95 disabled:opacity-50"
                      >
                        <LogOut size={12} /> Check Out
                      </button>
                    )}
                    {(row.status === "NOT_MARKED" || row.status === "ABSENT" || row.status === "LEAVE") && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => doAction(row.employee_id, "check-in")}
                        className="flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white active:scale-95 disabled:opacity-50"
                      >
                        <LogIn size={12} /> Check In
                      </button>
                    )}
                    {row.status !== "LEAVE" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => doAction(row.employee_id, "mark-leave")}
                        className="flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg border border-violet-200 text-violet-600 active:scale-95 disabled:opacity-50"
                      >
                        <CalendarOff size={12} /> Leave
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Shift Timing</h3>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-xs font-bold text-indigo-600 px-2 py-1 rounded-lg"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed -mt-1">
                Employees who haven't checked in by the late cutoff show as Absent automatically.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">Shift Start</label>
                <input
                  type="time"
                  value={settingsForm.shift_start}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, shift_start: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">Late Cutoff</label>
                <input
                  type="time"
                  value={settingsForm.late_cutoff}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, late_cutoff: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600"
                />
              </div>
              <button
                type="button"
                disabled={savingSettings}
                onClick={saveSettings}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold active:scale-[0.98] disabled:opacity-50"
              >
                {savingSettings ? "Saving..." : "Save Shift Timing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
