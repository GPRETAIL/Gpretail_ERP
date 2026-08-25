/**
 * Web Share API wrapper. Feature-detected so callers can hide the share
 * button entirely when unsupported (most desktop browsers) rather than
 * showing one that silently does nothing.
 */
export default function useNativeShare() {
  const isSupported = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const shareFile = async (file, { title, text } = {}) => {
    if (!isSupported) return false;
    const shareData = { title, text };
    if (file && navigator.canShare?.({ files: [file] })) {
      shareData.files = [file];
    }
    try {
      await navigator.share(shareData);
      return true;
    } catch (err) {
      // Cancelling the share sheet is a normal choice, not a failure worth
      // surfacing to the user.
      if (err?.name === "AbortError") return false;
      throw err;
    }
  };

  return { isSupported, shareFile };
}
