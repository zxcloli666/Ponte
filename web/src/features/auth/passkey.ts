import { api } from "@/shared/api/client";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

/**
 * Register a new passkey for the current authenticated user.
 * Returns true on success, false if cancelled/failed.
 */
export async function registerPasskey(): Promise<boolean> {
  try {
    // 1. Get registration options from server
    const { options } = await api
      .post("auth/passkey/register/options")
      .json<{ options: Parameters<typeof startRegistration>[0]["optionsJSON"] }>();

    // 2. Create credential via browser WebAuthn API
    const registration = await startRegistration({ optionsJSON: options });

    // 3. Send response to server for verification
    const result = await api
      .post("auth/passkey/register/verify", {
        json: { response: registration },
      })
      .json<{ verified: boolean }>();

    return result.verified;
  } catch (e) {
    console.error("Passkey registration failed:", e);
    return false;
  }
}

/**
 * Authenticate using a passkey. Returns tokens on success, null on failure.
 */
export async function authenticateWithPasskey(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    // 1. Get authentication options from server
    const { options, challengeId } = await api.post("auth/passkey/authenticate/options").json<{
      options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
      challengeId: string;
    }>();

    // 2. Get assertion via browser WebAuthn API
    const authentication = await startAuthentication({ optionsJSON: options });

    // 3. Verify with server, get tokens
    const result = await api
      .post("auth/passkey/authenticate/verify", {
        json: { challengeId, response: authentication },
      })
      .json<{ accessToken: string; refreshToken: string }>();

    return result;
  } catch (e) {
    console.error("Passkey authentication failed:", e);
    return null;
  }
}

/**
 * Check if WebAuthn is supported by this browser.
 */
export function isPasskeySupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}
