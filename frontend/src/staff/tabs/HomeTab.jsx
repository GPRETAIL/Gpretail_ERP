import { Box, Typography } from "@mui/material";
import { CalendarDays, CalendarPlus, ChevronRight, ClipboardCheck, Clock, HandCoins, Landmark, Receipt, Users, Wallet } from "lucide-react";
import MyAttendanceCard from "@/mobile/components/MyAttendanceCard";
import { monthLabel } from "@/features/hr/payroll/payslipPrint";
import { STAFF_COLOR, STAFF_TEXT, TOUCH, card, rupee, sectionTitle } from "../staffUi";
import RevealToggle from "../RevealToggle";
import useReveal, { MASKED_AMOUNT } from "../useReveal";

const APPROVAL_LABEL = { leave: "Leave", attendance: "Attendance", shift: "Shift", overtime: "Overtime", loan: "Advance / loan", claim: "Expense", resignation: "Resignation" };

const niceDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

function Tile({ icon: Icon, label, onClick }) {
  return (
    <Box component="button" type="button" onClick={onClick}
      sx={{ minHeight: TOUCH + 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.75, borderRadius: "16px", border: `1px solid ${STAFF_COLOR.line}`,
        bgcolor: STAFF_COLOR.surface, color: STAFF_COLOR.text, fontSize: STAFF_TEXT.small, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", px: 0.5, textAlign: "center", "&:active": { bgcolor: STAFF_COLOR.primarySoft } }}>
      <Box sx={{ color: STAFF_COLOR.primary }}><Icon size={22} /></Box>
      {label}
    </Box>
  );
}

/** Home: check in, quick links, what waits for me (and my approval), leave left, pay and holidays. */
export default function HomeTab({ home, go }) {
  const reveal = useReveal();
  const pending = home?.my_pending || {};
  const myPending = (pending.leave || 0) + (pending.requests || 0) + (pending.loans || 0) + (pending.claims || 0);
  const approvals = Object.entries(home?.approvals || {});
  const approvalTotal = approvals.reduce((sum, [, n]) => sum + n, 0);
  const paidLeave = (home?.leave || []).filter((b) => b.is_paid);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <MyAttendanceCard />

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
        <Tile icon={CalendarPlus} label="Apply leave" onClick={() => go("leave")} />
        <Tile icon={Receipt} label="Claim expense" onClick={() => go("expenses")} />
        <Tile icon={HandCoins} label="Ask for advance" onClick={() => go("expenses")} />
        <Tile icon={Clock} label="Fix attendance" onClick={() => go("me")} />
        <Tile icon={CalendarDays} label="Change shift" onClick={() => go("me")} />
        <Tile icon={Landmark} label="My tax" onClick={() => go("salary", "tax")} />
      </Box>

      {home?.can_approve && (
        <Box component="button" type="button" onClick={() => go("approvals")}
          sx={{ ...card, textAlign: "left", width: "100%", fontFamily: "inherit", cursor: "pointer", borderColor: approvalTotal ? STAFF_COLOR.warnBorder : STAFF_COLOR.line, bgcolor: approvalTotal ? STAFF_COLOR.warnSoft : STAFF_COLOR.surface }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: approvalTotal ? 1 : 0 }}>
            <ClipboardCheck size={20} color={STAFF_COLOR.amber} />
            <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text, flex: 1 }}>Needs your approval</Typography>
            <Typography sx={{ fontSize: STAFF_TEXT.heading, fontWeight: 800, color: STAFF_COLOR.amber }}>{approvalTotal}</Typography>
          </Box>
          {approvalTotal === 0 ? <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, mt: 0.5 }}>Nothing waiting. Well done.</Typography> : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {approvals.map(([type, n]) => <Box key={type} sx={{ px: 1.25, py: 0.5, borderRadius: "999px", bgcolor: STAFF_COLOR.surface, border: `1px solid ${STAFF_COLOR.warnBorder}`, fontSize: STAFF_TEXT.small, fontWeight: 700, color: STAFF_COLOR.warnText }}>{APPROVAL_LABEL[type] || type} · {n}</Box>)}
            </Box>
          )}
          {home.team?.size > 0 && (
            <Typography sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, mt: 1 }}>
              <Users size={16} /> {home.team.checked_in} of {home.team.size} in your team checked in today
            </Typography>
          )}
        </Box>
      )}

      {myPending > 0 && (
        <Box sx={card}>
          <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>My requests waiting</Typography>
          <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, mt: 0.5 }}>
            {[pending.leave && `${pending.leave} leave`, pending.requests && `${pending.requests} attendance / shift`, pending.claims && `${pending.claims} expense`, pending.loans && `${pending.loans} advance / loan`].filter(Boolean).join(" · ")}
          </Typography>
        </Box>
      )}

      {paidLeave.length > 0 && (
        <Box>
          <Typography sx={sectionTitle}>Leave left this year</Typography>
          <Box component="button" type="button" onClick={() => go("leave")} sx={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(paidLeave.length, 3)}, 1fr)`, gap: 1, width: "100%", p: 0, border: 0, bgcolor: "transparent", fontFamily: "inherit", cursor: "pointer" }}>
            {paidLeave.slice(0, 3).map((b) => (
              <Box key={b.leave_type_id} sx={{ ...card, textAlign: "center", p: 1.25 }}>
                <Typography sx={{ fontSize: STAFF_TEXT.heading, fontWeight: 800, color: STAFF_COLOR.primaryDark }}>{Number(b.available ?? b.balance)}</Typography>
                <Typography sx={{ fontSize: STAFF_TEXT.small, fontWeight: 700, color: STAFF_COLOR.muted }}>{b.name}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={card}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: STAFF_TEXT.small, fontWeight: 700, color: STAFF_COLOR.muted }}>
            <Wallet size={15} /> Last salary{home?.pay?.latest ? ` · ${monthLabel(home.pay.latest.month)}` : ""}
          </Typography>
          {home?.pay?.latest && <RevealToggle reveal={reveal} />}
        </Box>
        <Typography aria-live="polite" sx={{ fontSize: STAFF_TEXT.big, fontWeight: 800, color: STAFF_COLOR.text, mt: 0.5, fontVariantNumeric: "tabular-nums", letterSpacing: reveal.shown ? 0 : "0.06em" }}>
          {home?.pay?.latest ? (reveal.shown ? rupee(home.pay.latest.net_pay) : MASKED_AMOUNT) : "-"}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mt: 0.5 }}>
          <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint }}>
            {home?.pay?.latest ? `Take-home this FY ${reveal.shown ? rupee(home.pay.year_net) : MASKED_AMOUNT}` : "No payslip yet"}
          </Typography>
          <Box component="button" type="button" onClick={() => go("salary")} sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, minHeight: 36, p: 0, border: 0, bgcolor: "transparent", color: STAFF_COLOR.primaryDark, fontSize: STAFF_TEXT.small, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
            Payslips <ChevronRight size={16} />
          </Box>
        </Box>
      </Box>

      <Box component="button" type="button" onClick={() => go("expenses")} sx={{ ...card, textAlign: "left", fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: STAFF_TEXT.small, fontWeight: 700, color: STAFF_COLOR.muted }}><HandCoins size={15} /> Advance to repay</Typography>
          <Typography sx={{ fontSize: STAFF_TEXT.heading, fontWeight: 800, color: STAFF_COLOR.text, mt: 0.5 }}>{rupee(home?.money?.loan_balance)}</Typography>
        </Box>
        <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint }}>{home?.money?.claims_waiting ? `${home.money.claims_waiting} claim(s) waiting` : "No claims waiting"}</Typography>
      </Box>

      {(home?.holidays || []).length > 0 && (
        <Box>
          <Typography sx={sectionTitle}>Coming holidays</Typography>
          <Box sx={{ ...card, p: 0 }}>
            {home.holidays.map((h, i) => (
              <Box key={h.date} sx={{ display: "flex", justifyContent: "space-between", gap: 1, px: 1.75, py: 1.25, borderTop: i ? `1px solid ${STAFF_COLOR.line}` : 0 }}>
                <Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.text, fontWeight: 600 }}>{h.name}</Typography>
                <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted }}>{niceDate(h.date)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
