import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import api from "../api/axios";
import useSubscriptionStatus from "../hooks/useSubscriptionStatus";

// Plan selection lives entirely on VX-Admin's Company Portal, a separate app/session from this one --
// there is no in-tenant plan picker to route to locally.
const COMPANY_PORTAL_LOGIN_URL = "https://company.gpretail.uk/login";

/**
 * Bottom-right reminder for a subscription that is close to lapsing, and the activation prompt for a
 * store still on the Free trial.
 *
 * <p>Shows for ONE MINUTE every HOUR rather than permanently. A banner that never leaves stops being
 * read within a day -- this stays absent almost all the time, which is what makes it noticeable when
 * it does appear. The cycle is anchored to a timestamp in sessionStorage so switching pages does not
 * restart it and re-show the popup on every navigation.
 *
 * <p>Dismissing hides it for the current hour only, not forever: the point is to keep reminding
 * while the due date approaches.
 */
const HOUR_MS = 60 * 60 * 1000;
const VISIBLE_MS = 60 * 1000;
const LAST_SHOWN_KEY = "vx.subscriptionDue.lastShownAt";
// Dismissed ids are remembered for the tab as well as on the server. The server call is what makes a
// dismissal stick across devices, but it can take until the next poll (10 minutes) to be reflected --
// without this, navigating between pages in that window brought the banner straight back.
const DISMISSED_KEY = "vx.subscriptionDue.dismissedIds";

const readDismissedIds = () => {
  try {
    const raw = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
};

export default function SubscriptionDuePopup() {
  const status = useSubscriptionStatus();
  const [visible, setVisible] = useState(false);

  // A reminder pushed by hand from VX-Admin outranks the automatic due/trial nudge: someone chose to
  // send it, so it should not be hidden behind a generic message.
  const [dismissedIds, setDismissedIds] = useState(readDismissedIds);
  const notices = useMemo(() => {
    if (!Array.isArray(status?.notices)) return [];
    return status.notices.filter((notice) => notice && (notice.subject || notice.message));
  }, [status?.notices]);
  const pushedNotice = notices.find((notice) => !dismissedIds.has(notice.id)) || null;
  const shouldWarn = Boolean(pushedNotice || (status && (status.dueSoon || status.onTrial)));
  // The id, not the object. Status is refetched on a timer, so `pushedNotice` is a new object on
  // every poll; keying the effect on the object would restart the cycle -- and re-show the banner --
  // every ten minutes. The id changes only when the notice genuinely does.
  const pushedNoticeId = pushedNotice ? pushedNotice.id : null;

  const dismissPushed = async (noticeId) => {
    // Optimistic: the banner closes immediately, and the server call only has to make it stick
    // across devices. A failed dismiss re-appears on the next poll, which is the safe direction.
    setDismissedIds((prev) => {
      const next = new Set(prev).add(noticeId);
      try {
        sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      } catch {
        // Storage blocked or full: the in-memory set still covers this mount.
      }
      return next;
    });
    setVisible(false);
    try {
      await api.post(`/companies/subscription/notices/${noticeId}/dismiss`);
    } catch {
      // Ignored on purpose: see above.
    }
  };

  useEffect(() => {
    if (!shouldWarn) {
      setVisible(false);
      return undefined;
    }

    let hideTimer = null;
    let cycleTimer = null;

    const show = () => {
      setVisible(true);
      sessionStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS);
      // Re-armed from the moment it was shown. A setInterval anchored to mount fired an hour after
      // MOUNT, not an hour after the banner appeared -- so a delayed first show (say 50 minutes in)
      // was followed by another 10 minutes later, twice in quick succession, and never on the hour
      // after that.
      clearTimeout(cycleTimer);
      cycleTimer = setTimeout(show, HOUR_MS);
    };

    // A reminder pushed by hand from VX-Admin shows AT ONCE. The hourly gate exists to stop the
    // automatic due/trial nudge turning into wallpaper; applying it to a hand-sent notice meant
    // someone could click Notify and the tenant would see nothing for up to 59 minutes, which makes
    // the button look broken. "Outranks the automatic nudge" has to mean sooner, not just louder.
    if (pushedNoticeId !== null) {
      // Deferred by a tick rather than called inline: a synchronous setState in an effect body
      // triggers a cascading render (react-hooks/set-state-in-effect). One tick is imperceptible and
      // still counts as "at once" next to the hour it used to wait.
      cycleTimer = setTimeout(show, 0);
      return () => {
        clearTimeout(hideTimer);
        clearTimeout(cycleTimer);
      };
    }

    // Respect where we are in the hour rather than showing on every mount -- otherwise navigating
    // between pages would pop it up continuously.
    const lastShown = Number(sessionStorage.getItem(LAST_SHOWN_KEY) || 0);
    const sinceLast = Date.now() - lastShown;
    const firstDelay = lastShown && sinceLast < HOUR_MS ? HOUR_MS - sinceLast : 0;
    cycleTimer = setTimeout(show, firstDelay);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(cycleTimer);
    };
  }, [shouldWarn, pushedNoticeId]);

  const message = useMemo(() => {
    if (pushedNotice) return pushedNotice.message || pushedNotice.subject || "You have an important update from your administrator.";
    if (!status) return null;
    const days = status.soonestDaysLeft;
    if (status.onTrial) {
      return days === null || days === undefined
        ? "Your free trial is active. Activate a plan to keep your store running."
        : `Free trial — ${days} day${days === 1 ? "" : "s"} remaining. Activate a plan to keep your store running.`;
    }
    if (days === 0) return "Your subscription expires today. Renew now to avoid interruption.";
    if (days === null || days === undefined) return "Your subscription is due soon. Renew to avoid interruption.";
    return `Your subscription is due in ${days} day${days === 1 ? "" : "s"}. Renew to avoid interruption.`;
  }, [status, pushedNotice]);

  if (!visible || !message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 right-4 z-50 w-80 rounded-lg border border-amber-300 bg-amber-50 p-3 shadow-lg dark:border-amber-800/60 dark:bg-amber-900/30"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {pushedNotice ? pushedNotice.subject : status?.onTrial ? "Trial" : "Subscription due"}
          </div>
          <p className="mt-0.5 text-xs leading-5 text-amber-800 dark:text-amber-300">{message}</p>
          <button
            type="button"
            onClick={() => window.open(COMPANY_PORTAL_LOGIN_URL, "_blank", "noopener,noreferrer")}
            className="mt-2 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            View plans
          </button>
        </div>
        <button
          type="button"
          onClick={() => (pushedNotice ? dismissPushed(pushedNotice.id) : setVisible(false))}
          aria-label="Dismiss"
          className="rounded p-0.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
