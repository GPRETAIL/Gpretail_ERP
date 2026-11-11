export const staffAppUrl = () => `${window.location.origin}/hr`;

/** A random 6-digit PIN that is not a repeated digit or a simple run (the server checks the same). */
export function suggestPin() {
  for (;;) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const d = pin.split("").map(Number);
    const run = (step) => d.every((x, i) => i === 0 || x === (d[i - 1] + step + 10) % 10);
    if (new Set(d).size > 1 && !run(1) && !run(-1)) return pin;
  }
}
