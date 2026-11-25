/** What can be typed in the barcode box, besides a barcode. Keep in step with quantityShortcut.js and handleBarcodeKeyDown. */
export const BILLING_SHORTCUTS = [
  { keys: ["10*", "then scan"], does: "The next item is added 10 pieces at once." },
  { keys: ["10*SC00001"], does: "Adds 10 pieces of that barcode in one go." },
  { keys: ["*10", "Enter"], does: "Changes the last item scanned to 10 pieces." },
  { keys: ["*10+2", "*10,2", "*10=2"], does: "Makes the item on S.No 2 ten pieces (S.No is the number in the first column)." },
  { keys: ["C", "Enter"], does: "Opens the customer box." },
  { keys: ["D", "Enter"], does: "Opens the discount box." },
  { keys: ["H", "Enter"], does: "Holds this bill so the next customer can be served." },
  { keys: ["R", "Enter"], does: "Shows the bills on hold." },
  { keys: ["0", "Enter"], does: "Saves the bill and prints it." },
];
