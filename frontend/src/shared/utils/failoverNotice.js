/** What an on-prem counter shows while it works on the cloud, or null when it is on its own server. */
export const failoverNotice = (routing = {}) => {
  if (!routing.runningOnLocalConnector || !routing.enabled || routing.currentTarget !== "cloud") return null;
  if (routing.localReachable && routing.handshakeState === "catching_up") {
    return {
      title: "Cloud (on-prem server catching up)",
      text: "The on-prem server is back and syncing. Counters return to it by themselves once both sides are up to date.",
    };
  }
  if (routing.localReachable) return null;
  return {
    title: "Cloud (on-prem server down)",
    text: "Billing continues on the cloud. Bills get C numbers and sync back when the on-prem server returns.",
  };
};
