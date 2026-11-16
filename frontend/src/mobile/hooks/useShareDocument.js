import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "@/shared/api/apiClient";
import useNativeShare from "@/mobile/hooks/useNativeShare";
import { downloadHtmlAsPdf, getHtmlAsPdfBlob } from "@/features/printing/utils/htmlToPdf";
import { whatsappLink } from "@/mobile/utils/dealerDocuments";

/**
 * Share a document as a PDF with a message: the phone's share sheet (pick WhatsApp and the chat) when it can share
 * files; otherwise WhatsApp opens on the number with the message and the PDF is downloaded to attach.
 * Also gives the store details printed on the documents (name, UPI ID from Sales Customisation).
 */
export default function useShareDocument() {
  const authUser = useSelector((state) => state.auth.user);
  const { isSupported, shareFile } = useNativeShare();
  const [upiId, setUpiId] = useState("");

  useEffect(() => {
    let alive = true;
    api.get("/sales-customization", { params: { company_id: authUser?.company_id || authUser?.store_id } })
      .then((res) => alive && setUpiId(String(res.data?.data?.paymentUpiId || "").trim()))
      .catch(() => {});
    return () => { alive = false; };
  }, [authUser?.company_id, authUser?.store_id]);

  const store = { name: String(authUser?.company_name || authUser?.store_name || "").trim() || "Store", upiId };

  /** @returns {"shared" | "cancelled" | "whatsapp"} */
  const share = async ({ html, filename, text, phone }) => {
    const file = await getHtmlAsPdfBlob(html, filename, { paperSize: "A4" });
    if (isSupported && navigator.canShare?.({ files: [file] })) {
      return (await shareFile(file, { title: filename.replace(/\.pdf$/, ""), text })) ? "shared" : "cancelled";
    }
    await downloadHtmlAsPdf(html, filename, { paperSize: "A4" });
    window.open(whatsappLink(phone, text), "_blank", "noopener");
    return "whatsapp";
  };

  return { store, share };
}
