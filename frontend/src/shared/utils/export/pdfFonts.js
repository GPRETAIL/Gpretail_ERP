import regularUrl from "@/shared/assets/fonts/NotoSans-Regular.ttf?url";
import boldUrl from "@/shared/assets/fonts/NotoSans-Bold.ttf?url";

export const PDF_FONT = "NotoSans";

/** Characters the bundled Noto Sans subset has: Latin, Latin-1/Extended-A, general punctuation, currency signs (₹), arrows, minus. */
const UNSUPPORTED = /[^\u0020-\u007E\u00A0-\u017F\u2010-\u2027\u2030-\u203A\u20A0-\u20CF\u2190-\u2193\u2212]/g;

/** Text the PDF font can draw. Anything it cannot (Tamil, emoji) becomes "?" rather than broken glyphs. */
export const pdfSafeText = (value) => String(value ?? "").replace(/\s+/g, " ").trim().replace(UNSUPPORTED, "?");

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

let cache = null;

/** Fetches the two font files once (they are small and only fetched when a PDF is exported). */
const loadFontData = () => {
  if (!cache) {
    cache = Promise.all([regularUrl, boldUrl].map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Font ${url} could not be loaded`);
      return toBase64(await response.arrayBuffer());
    })).catch((error) => { cache = null; throw error; });
  }
  return cache;
};

/** Registers Noto Sans (regular and bold) on a jsPDF document so ₹ and accented letters print. */
export default async function registerPdfFonts(doc) {
  const [regular, bold] = await loadFontData();
  doc.addFileToVFS("NotoSans-Regular.ttf", regular);
  doc.addFont("NotoSans-Regular.ttf", PDF_FONT, "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", bold);
  doc.addFont("NotoSans-Bold.ttf", PDF_FONT, "bold");
}
