import { useState, useEffect, useCallback } from "react";

const CREDENTIAL_KEY = "vx_biometric_credential_id";

const bufToBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const base64ToBuf = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

const readStoredCredentialId = () => localStorage.getItem(CREDENTIAL_KEY);

/**
 * Fingerprint/Face unlock, layered on top of the PIN (never a replacement -
 * a sensor can always fail to read or not be enrolled, so the PIN stays the
 * required fallback). Uses WebAuthn's platform authenticator, which is the
 * only way a web page can hand off to the OS's own biometric prompt - there
 * is no direct "read the fingerprint sensor" API for web content.
 *
 * Deliberately skips the server round-trip a *real* WebAuthn login needs
 * (server-issued challenge, server-verified signature): this isn't proving
 * identity to a remote server, just re-confirming "the device owner is
 * present" for a local screen gate, the same threat model the PIN itself
 * covers. A locally-generated challenge and "did the ceremony resolve"
 * check is proportionate to that, not a full authentication protocol.
 */
export default function useBiometrics() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => Boolean(readStoredCredentialId()));
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const available =
          typeof window !== "undefined" &&
          window.PublicKeyCredential &&
          (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
        if (!cancelled) setIsSupported(Boolean(available));
      } catch {
        if (!cancelled) setIsSupported(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async () => {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Vynerix ERP" },
        user: { id: userId, name: "device-lock", displayName: "Device Lock" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    });
    if (!credential) throw new Error("No credential returned");
    localStorage.setItem(CREDENTIAL_KEY, bufToBase64(credential.rawId));
    setIsEnabled(true);
  }, []);

  const verify = useCallback(async () => {
    const storedId = readStoredCredentialId();
    if (!storedId) return false;
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ id: base64ToBuf(storedId), type: "public-key" }],
          userVerification: "required",
          timeout: 60000,
        },
      });
      return Boolean(assertion);
    } catch {
      // User cancelled, sensor failed to read, or credential no longer
      // valid on this device - all just mean "fall back to the PIN",
      // not an error worth surfacing.
      return false;
    }
  }, []);

  const disable = useCallback(() => {
    localStorage.removeItem(CREDENTIAL_KEY);
    setIsEnabled(false);
  }, []);

  return { isSupported, isEnabled, checking, register, verify, disable };
}
