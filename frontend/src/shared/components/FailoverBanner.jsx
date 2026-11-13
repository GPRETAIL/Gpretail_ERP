import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Alert, Button } from "@mui/material";
import { CloudOff } from "lucide-react";
import { logoutUser } from "@/features/auth/authSlice";
import { FAILOVER_SESSION_EXPIRED_EVENT, getRuntimeRoutingSnapshot, RUNTIME_ROUTING_CHANGED_EVENT } from "@/shared/api/runtimeRouting";
import { failoverNotice } from "@/shared/utils/failoverNotice";

/** The strip on every page while an on-prem counter has failed over to the cloud. */
export default function FailoverBanner() {
  const dispatch = useDispatch();
  const [routing, setRouting] = useState(() => getRuntimeRoutingSnapshot());
  const [signInNeeded, setSignInNeeded] = useState(false);

  useEffect(() => {
    const onRouting = () => setRouting(getRuntimeRoutingSnapshot());
    const onExpired = () => setSignInNeeded(true);
    window.addEventListener(RUNTIME_ROUTING_CHANGED_EVENT, onRouting);
    window.addEventListener(FAILOVER_SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener(RUNTIME_ROUTING_CHANGED_EVENT, onRouting);
      window.removeEventListener(FAILOVER_SESSION_EXPIRED_EVENT, onExpired);
    };
  }, []);

  const notice = failoverNotice(routing);
  if (!notice) return null;

  return (
    <Alert
      severity="warning"
      icon={<CloudOff size={18} />}
      role="status"
      sx={{ borderRadius: 0, py: 0.25, alignItems: "center" }}
      action={signInNeeded ? (
        <Button color="inherit" size="small" onClick={() => dispatch(logoutUser())}>Sign in again</Button>
      ) : null}
    >
      <strong>{notice.title}</strong>
      {" · "}
      {signInNeeded ? "This counter's cloud sign-in has expired. Sign in again to keep billing on the cloud." : notice.text}
    </Alert>
  );
}
