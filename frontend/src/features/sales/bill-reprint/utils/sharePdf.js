import { downloadHtmlAsPdf, getHtmlAsPdfBlob } from "@/features/printing/utils/htmlToPdf";
import { whatsappLink } from "@/mobile/utils/dealerDocuments";

/**
 * Shares a document as a PDF with a message: the device's share sheet (pick WhatsApp and the chat) when it can share
 * files; otherwise the PDF downloads and WhatsApp opens on the customer's number with the message, to attach it.
 * @returns {Promise<"shared" | "cancelled" | "whatsapp">}
 */
export const sharePdf = async ({ html, filename, text, phone, paperSize = "A4" }) => {
  const file = await getHtmlAsPdfBlob(html, filename, { paperSize });
  if (typeof navigator !== "undefined" && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: filename.replace(/\.pdf$/, ""), text, files: [file] });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled";
      throw err;
    }
  }
  await downloadHtmlAsPdf(html, filename, { paperSize });
  window.open(whatsappLink(phone, text), "_blank", "noopener");
  return "whatsapp";
};
