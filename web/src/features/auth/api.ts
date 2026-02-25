import { api } from "@/shared/api/client";

interface QrTokenResponse {
  pairingToken: string;
}

interface PairingStatusResponse {
  status: "pending" | "connected";
  accessToken?: string;
  refreshToken?: string;
  deviceName?: string;
}

/**
 * Fetch a new QR pairing token from the server.
 */
export async function fetchQrToken(): Promise<QrTokenResponse> {
  return api.get("auth/qr").json<QrTokenResponse>();
}

/**
 * Poll the pairing status for a given token.
 */
export async function checkPairingStatus(pairingToken: string): Promise<PairingStatusResponse> {
  return api.get(`auth/pairing-status/${pairingToken}`).json<PairingStatusResponse>();
}

/**
 * Refresh the access token using refresh token.
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return api
    .post("auth/refresh", { json: { refreshToken } })
    .json<{ accessToken: string; refreshToken: string }>();
}
