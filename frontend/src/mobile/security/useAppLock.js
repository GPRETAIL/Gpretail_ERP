import { useState, useCallback } from "react";

const STORAGE_KEY = "vx_pin_lock";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30000;

const bufToHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

const hashPin = async (pin, salt) => {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufToHex(digest);
};

const randomSalt = () => bufToHex(crypto.getRandomValues(new Uint8Array(16)));

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Local device PIN lock for the mobile app - gates access to an already
 * authenticated session on this device. It is NOT a server auth mechanism
 * (the real session/token is untouched); it just stops someone with the
 * unlocked phone in hand from opening the already-logged-in PWA. The PIN
 * itself is never stored - only a salted SHA-256 hash via the browser's
 * native Web Crypto API, so no extra crypto dependency is needed.
 *
 * The PIN is device-level, not per-account: it survives a normal logout so
 * re-logging in on the same device doesn't ask the user to set it up again.
 * Only "Turn Off PIN Lock" or the forgot-PIN reset actually clears it.
 */
export default function useAppLock() {
  const [record, setRecord] = useState(() => readStored());
  const [isLocked, setIsLocked] = useState(() => Boolean(readStored()));
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);

  const isPinSet = Boolean(record);

  const setupPin = useCallback(async (pin) => {
    const salt = randomSalt();
    const hash = await hashPin(pin, salt);
    const next = { salt, hash };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setRecord(next);
    setIsLocked(false);
    setFailedAttempts(0);
    setLockoutUntil(0);
  }, []);

  const verifyPin = useCallback(
    async (pin) => {
      if (!record) return true;
      if (Date.now() < lockoutUntil) return false;

      const hash = await hashPin(pin, record.salt);
      if (hash === record.hash) {
        setFailedAttempts(0);
        setLockoutUntil(0);
        setIsLocked(false);
        return true;
      }

      const nextAttempts = failedAttempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        setFailedAttempts(0);
        setLockoutUntil(Date.now() + LOCKOUT_MS);
      } else {
        setFailedAttempts(nextAttempts);
      }
      return false;
    },
    [record, failedAttempts, lockoutUntil]
  );

  const changePin = useCallback(
    async (currentPin, newPin) => {
      if (!(await verifyPin(currentPin))) return false;
      await setupPin(newPin);
      return true;
    },
    [verifyPin, setupPin]
  );

  const removePin = useCallback(
    async (currentPin) => {
      if (record && !(await verifyPin(currentPin))) return false;
      localStorage.removeItem(STORAGE_KEY);
      setRecord(null);
      setIsLocked(false);
      return true;
    },
    [record, verifyPin]
  );

  // Forgot-PIN recovery: no way to verify a PIN the user has forgotten, so
  // this clears it unconditionally. Only meant to be called right before
  // forcing a real re-login (server auth), which is the actual security
  // boundary being fallen back on here.
  const resetPinUnconditionally = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecord(null);
    setIsLocked(false);
    setFailedAttempts(0);
    setLockoutUntil(0);
  }, []);

  return {
    isPinSet,
    isLocked,
    failedAttempts,
    lockoutUntil,
    setupPin,
    verifyPin,
    changePin,
    removePin,
    resetPinUnconditionally,
  };
}
