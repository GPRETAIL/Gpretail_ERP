import { useCallback, useMemo } from "react";
import QRCode from "qrcode";
import useAsyncQuery from "./useAsyncQuery";
import { EMPTY_OBJECT } from "../utils/emptyValues";

export default function useQrSources(labels, { enabled = true, width = 180, onlyQr = true } = {}) {
  const selected = useMemo(() => onlyQr ? labels.filter(label => label.codeType === "code") : labels, [labels, onlyQr]);
  const generate = useCallback(async () => Object.fromEntries(await Promise.all(selected.map(async label => [
    label.key, await QRCode.toDataURL(label.codeValue, { margin: 1, width, errorCorrectionLevel: "M" }),
  ]))), [selected, width]);
  const result = useAsyncQuery(generate, { enabled: enabled && selected.length > 0 });
  return { sources: enabled ? result.data || EMPTY_OBJECT : EMPTY_OBJECT, loading: result.loading };
}
