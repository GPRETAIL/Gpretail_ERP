import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Bell, CalendarDays, ClipboardCheck, Home, Receipt, UserRound, Wallet, X } from "lucide-react";
import api from "@/shared/api/apiClient";
import { clearStaffSession, readStaffSession, updateStaffSession } from "@/shared/api/staffSession";
import LeaveScreen from "@/mobile/screens/LeaveScreen";
import ClaimsScreen from "@/mobile/screens/ClaimsScreen";
import StaffSignIn from "./StaffSignIn";
import ChangePin from "./ChangePin";
import HomeTab from "./tabs/HomeTab";
import ApprovalsTab from "./tabs/ApprovalsTab";
import SalaryTab from "./tabs/SalaryTab";
import MeTab from "./tabs/MeTab";
import { STAFF_COLOR, STAFF_TEXT, STAFF_THEMES, TOUCH, card, staffThemeVars } from "./staffUi";
import useStaffTheme from "./useStaffTheme";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";

const TABS = [
  { key: "home", label: "Home", icon: Home },
  { key: "leave", label: "Leave", icon: CalendarDays },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "salary", label: "Salary", icon: Wallet },
  { key: "approvals", label: "Approvals", icon: ClipboardCheck, approver: true },
  { key: "me", label: "Me", icon: UserRound },
];
const TITLES = { home: "Home", leave: "Leave", expenses: "Expenses and advances", salary: "Salary", approvals: "Approvals", me: "Me" };

/** While on /hr the browser offers to install "Vynerix HRMS", not the business app. */
function useStaffManifest() {
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    const before = { href: link?.getAttribute("href"), title: document.title };
    link?.setAttribute("href", "/manifest-staff.webmanifest");
    document.title = "Vynerix HRMS";
    return () => {
      if (link && before.href) link.setAttribute("href", before.href);
      document.title = before.title;
    };
  }, []);
}

/** The phone's status bar and the page behind overscroll follow the staff app's light or dark theme. */
function useStaffChrome(mode) {
  useEffect(() => {
    const colors = STAFF_THEMES[mode];
    const meta = document.querySelector('meta[name="theme-color"]');
    const before = { theme: meta?.getAttribute("content"), background: document.body.style.backgroundColor, scheme: document.documentElement.style.colorScheme };
    meta?.setAttribute("content", colors.surface);
    document.body.style.backgroundColor = colors.page;
    document.documentElement.style.colorScheme = mode;
    return () => {
      if (meta && before.theme) meta.setAttribute("content", before.theme);
      document.body.style.backgroundColor = before.background;
      document.documentElement.style.colorScheme = before.scheme;
    };
  }, [mode]);
}

function NotificationsSheet({ onClose }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let active = true;
    api.get("/notifications", { params: { per_page: 30 } })
      .then((res) => { if (active) setRows(res.data?.data || []); })
      .catch(() => { if (active) setRows([]); });
    void api.post("/notifications/read-all").catch(() => {});
    return () => { active = false; };
  }, []);
  return (
    <Box role="dialog" aria-modal="true" aria-label="Notifications" sx={{ position: "fixed", inset: 0, zIndex: 1300, bgcolor: STAFF_COLOR.scrim, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <Box onClick={(e) => e.stopPropagation()} sx={{ width: "100%", maxHeight: "80dvh", overflowY: "auto", bgcolor: STAFF_COLOR.page, borderRadius: "20px 20px 0 0", p: 2, pb: "max(16px, env(safe-area-inset-bottom))" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <Typography sx={{ flex: 1, fontSize: STAFF_TEXT.heading, fontWeight: 800, color: STAFF_COLOR.text }}>Notifications</Typography>
          <Box component="button" type="button" onClick={onClose} aria-label="Close" sx={{ width: TOUCH, height: TOUCH, border: 0, bgcolor: "transparent", color: STAFF_COLOR.muted, cursor: "pointer" }}><X size={22} /></Box>
        </Box>
        {rows === null && <LoadingSkeleton variant="list" rows={4} label="Loading notifications" />}
        {rows?.length === 0 && <Box sx={card}><Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>No notifications yet.</Typography></Box>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {(rows || []).map((n) => (
            <Box key={n.id} sx={{ ...card, borderColor: n.read_at ? STAFF_COLOR.line : STAFF_COLOR.primaryBorder }}>
              <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>{n.title}</Typography>
              <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted }}>{n.message}</Typography>
              {n.created_at && <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint, mt: 0.5 }}>{new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Typography>}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function Shell({ session, onSignOut, theme }) {
  const [tab, setTab] = useState("home");
  const [salaryView, setSalaryView] = useState("slips");
  const [home, setHome] = useState(null);
  const [unread, setUnread] = useState(0);
  const [bell, setBell] = useState(false);
  const [error, setError] = useState("");
  const [exitHint, setExitHint] = useState(false);

  const loadHome = useCallback(async () => {
    try {
      const [h, n] = await Promise.all([api.get("/staff-app/home"), api.get("/notifications/unread-count").catch(() => null)]);
      setHome(h.data?.data || null);
      setUnread(n?.data?.data?.count || 0);
      setError("");
    } catch (err) {
      const code = err?.response?.data?.code;
      setError(code === "MOBILE_SUBSCRIPTION_REQUIRED" ? "The HRMS app is not part of your store's subscription right now. Ask HR."
        : code === "STAFF_APP_DISABLED" ? "HR has switched the HRMS app off for you." : "Could not load. Pull down or tap Home to try again.");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(loadHome, 0);
    return () => clearTimeout(timer);
  }, [loadHome]);

  // Back (Android back button, swipe-back) steps through the screens the employee opened instead of leaving
  // the app. Each screen is a history entry over one "root" entry; reaching the root shows "Swipe back again
  // to exit" for a moment, and only a second back leaves the app.
  useEffect(() => {
    if (window.history.state?.vxhr !== "screen") {
      window.history.replaceState({ vxhr: "root" }, "");
      window.history.pushState({ vxhr: "screen", tab: "home", view: "slips", bell: false }, "");
    }
    const onPop = (event) => {
      const state = event.state;
      if (state?.vxhr === "screen") {
        setTab(state.tab);
        setSalaryView(state.view || "slips");
        setBell(Boolean(state.bell));
        setExitHint(false);
      } else if (state?.vxhr === "root") {
        setTab("home");
        setBell(false);
        setExitHint(true);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!exitHint) return undefined;
    // No second back in time: stay in the app, and the next back asks again.
    const timer = setTimeout(() => {
      setExitHint(false);
      if (window.history.state?.vxhr === "root") window.history.pushState({ vxhr: "screen", tab: "home", view: "slips", bell: false }, "");
    }, 2500);
    return () => clearTimeout(timer);
  }, [exitHint]);

  const go = (key, view) => {
    const nextView = key === "salary" && view ? view : salaryView;
    if (key === "home") void loadHome();
    if (key !== tab || nextView !== salaryView) {
      window.history.pushState({ vxhr: "screen", tab: key, view: nextView, bell: false }, "");
      setExitHint(false);
    }
    setSalaryView(nextView);
    setTab(key);
    window.scrollTo({ top: 0 });
  };
  const openBell = () => {
    window.history.pushState({ vxhr: "screen", tab, view: salaryView, bell: true }, "");
    setBell(true);
  };
  const closeBell = () => {
    setUnread(0);
    if (window.history.state?.bell) window.history.back();
    else setBell(false);
  };
  const tabs = TABS.filter((t) => !t.approver || home?.can_approve);
  const approvalCount = Object.values(home?.approvals || {}).reduce((sum, n) => sum + n, 0);
  const firstName = (home?.employee?.name || session.employee?.name || "").split(" ")[0];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: STAFF_COLOR.page, color: STAFF_COLOR.text, fontSize: STAFF_TEXT.body }}>
      <Box component="header" sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: STAFF_COLOR.surface, borderBottom: `1px solid ${STAFF_COLOR.line}`, px: 2, pt: "max(10px, env(safe-area-inset-top))", pb: 1.25, display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: STAFF_TEXT.heading, fontWeight: 800, color: STAFF_COLOR.text, lineHeight: 1.2 }}>
            {tab === "home" ? `Hello, ${firstName}` : TITLES[tab]}
          </Typography>
          <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {session.store?.name}{home?.employee?.designation ? ` · ${home.employee.designation}` : ""}
          </Typography>
        </Box>
        <Box component="button" type="button" onClick={openBell} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          sx={{ position: "relative", width: TOUCH, height: TOUCH, borderRadius: "12px", border: `1px solid ${STAFF_COLOR.line}`, bgcolor: STAFF_COLOR.surface, color: STAFF_COLOR.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Bell size={20} />
          {unread > 0 && <Box sx={{ position: "absolute", top: 4, right: 4, minWidth: 18, height: 18, px: 0.5, borderRadius: "999px", bgcolor: "#e11d48", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread > 9 ? "9+" : unread}</Box>}
        </Box>
      </Box>

      <Box component="main" sx={{ px: 2, pt: 2, pb: "calc(88px + env(safe-area-inset-bottom))", maxWidth: 640, mx: "auto" }}>
        {error && <Box role="alert" sx={{ ...card, mb: 2, bgcolor: STAFF_COLOR.dangerSoft, borderColor: STAFF_COLOR.dangerBorder, color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.body, fontWeight: 600 }}>{error}</Box>}
        {tab === "home" && <HomeTab home={home} go={go} />}
        {tab === "leave" && <LeaveScreen showApprovals={false} />}
        {tab === "expenses" && <ClaimsScreen />}
        {tab === "salary" && <SalaryTab home={home} view={salaryView} setView={(view) => go("salary", view)} />}
        {tab === "approvals" && <ApprovalsTab onChanged={loadHome} />}
        {tab === "me" && <MeTab onSignOut={onSignOut} theme={theme} />}
      </Box>

      <Box component="nav" aria-label="HRMS app" sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 10, bgcolor: STAFF_COLOR.surface, borderTop: `1px solid ${STAFF_COLOR.line}`, display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, pb: "env(safe-area-inset-bottom)" }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <Box key={key} component="button" type="button" onClick={() => go(key)} aria-current={tab === key ? "page" : undefined}
            sx={{ position: "relative", minHeight: TOUCH + 18, border: 0, bgcolor: "transparent", color: tab === key ? STAFF_COLOR.primary : STAFF_COLOR.faint, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.25,
              fontSize: 11.5, fontWeight: tab === key ? 800 : 600, fontFamily: "inherit", cursor: "pointer", px: 0 }}>
            <Icon size={22} strokeWidth={tab === key ? 2.4 : 2} />
            {label}
            {key === "approvals" && approvalCount > 0 && <Box sx={{ position: "absolute", top: 6, left: "calc(50% + 6px)", minWidth: 18, height: 18, px: 0.5, borderRadius: "999px", bgcolor: "#d97706", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{approvalCount > 99 ? "99+" : approvalCount}</Box>}
          </Box>
        ))}
      </Box>
      {bell && <NotificationsSheet onClose={closeBell} />}
      {exitHint && (
        <Box role="status" sx={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 1400,
          px: 2, py: 1, borderRadius: "999px", bgcolor: "rgba(17,24,39,0.92)", color: "#fff", fontSize: STAFF_TEXT.label, fontWeight: 600, whiteSpace: "nowrap", boxShadow: 3 }}>
          Swipe back again to exit
        </Box>
      )}
    </Box>
  );
}

/** The staff app at /hr: a separate employee app (own sign-in with mobile number + PIN, own install). */
export default function StaffApp() {
  useStaffManifest();
  const theme = useStaffTheme();
  useStaffChrome(theme.mode);
  const [session, setSession] = useState(() => readStaffSession());
  const [signInPin, setSignInPin] = useState("");

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Signed out on this phone either way.
    }
    clearStaffSession();
    setSignInPin("");
    setSession(null);
  }, []);

  useEffect(() => {
    const expired = () => { clearStaffSession(); setSession(null); };
    window.addEventListener("vx-staff-auth-expired", expired);
    return () => window.removeEventListener("vx-staff-auth-expired", expired);
  }, []);

  let screen;
  if (!session) screen = <StaffSignIn onSignedIn={(s, pin) => { setSignInPin(pin); setSession(s); }} />;
  else if (session.must_change_pin) {
    screen = <ChangePin forced currentPin={signInPin} onDone={() => { setSignInPin(""); setSession(updateStaffSession({ must_change_pin: false })); }} onCancel={signOut} />;
  } else screen = <Shell session={session} onSignOut={signOut} theme={theme} />;
  // Every colour in the app (and in the reused phone HR screens) reads these --hr-* variables.
  return (
    <Box data-staff-theme={theme.mode} sx={{ ...staffThemeVars(theme.mode), colorScheme: theme.mode, minHeight: "100dvh", bgcolor: STAFF_COLOR.page, color: STAFF_COLOR.text }}>
      {screen}
    </Box>
  );
}
