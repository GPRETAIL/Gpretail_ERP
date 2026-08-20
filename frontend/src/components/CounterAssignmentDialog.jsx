import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../api/axios";
import { loginSuccess } from "../features/authSlice";

/**
 * Shared "Assign a Counter" dialog -- the same modal Navbar's profile menu opens, extracted so POS
 * pages (POS Sale, POS Old, Touch Sales) can also pop it automatically when a user without a
 * counter assigned opens them, instead of only failing later when they try to save a sale.
 */
export default function CounterAssignmentDialog({ open, onClose, onAssigned }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const [counterOptions, setCounterOptions] = useState([]);
  const [selectedCounterId, setSelectedCounterId] = useState("");
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [savingCounterAssignment, setSavingCounterAssignment] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedCounterId(user?.counter_id ? String(user.counter_id) : "");
    let cancelled = false;
    const loadCounters = async () => {
      setLoadingCounters(true);
      try {
        const role = String(user?.role || "").trim().toLowerCase();
        const isRestrictedRole = role === "admin" || role === "user";
        const companyId = user?.company_id || user?.companyId;
        const res = await api.get("/configurations/counter", {
          params: isRestrictedRole && companyId ? { company_id: companyId } : undefined,
        });
        if (cancelled) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setCounterOptions(
          rows.map((row) => ({
            value: String(row.id),
            label: String(row.name || "").trim() || `Counter ${row.id}`,
          }))
        );
      } catch {
        if (!cancelled) toast.error("Failed to load counters");
      } finally {
        if (!cancelled) setLoadingCounters(false);
      }
    };
    loadCounters();
    return () => {
      cancelled = true;
    };
  }, [open, user?.counter_id, user?.role, user?.company_id, user?.companyId]);

  if (!open) return null;

  const handleSave = async () => {
    if (!selectedCounterId) {
      toast.error("Counter is required");
      return;
    }
    setSavingCounterAssignment(true);
    try {
      const res = await api.post("/auth/counter", { counterId: selectedCounterId });
      const payload = res.data?.data;
      const updatedUser = payload?.user || payload;
      const refreshedToken = payload?.token || token;
      if (!updatedUser) {
        throw new Error("Invalid counter assignment response");
      }
      dispatch(loginSuccess({ token: refreshedToken, user: updatedUser }));
      toast.success("Counter assigned");
      onAssigned?.(updatedUser);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to assign counter");
    } finally {
      setSavingCounterAssignment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700 overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Assign a Counter
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select the counter you're working from before ringing up sales.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Close counter dialog"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          {loadingCounters ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
              Loading counters...
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Counter
              </label>
              <select
                value={selectedCounterId}
                onChange={(event) => setSelectedCounterId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Select counter</option>
                {counterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loadingCounters || savingCounterAssignment}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingCounterAssignment ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
