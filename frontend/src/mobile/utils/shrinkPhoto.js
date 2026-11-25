const MAX_SIDE = 640;
const QUALITY = 0.7;

/**
 * A photo straight from a phone camera is several megabytes. For a check-in selfie a 640 pixel picture is plenty, so it
 * is drawn smaller on a canvas and saved as a JPEG (about 50 to 100 KB) before it is sent.
 */
export default function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("no canvas"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no photo"))), "image/jpeg", QUALITY);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable photo"));
    };
    image.src = url;
  });
}
