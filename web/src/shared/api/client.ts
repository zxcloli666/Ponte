import ky from "ky";
import type { KyInstance } from "ky";

/**
 * Configured ky HTTP client with auth interceptor.
 * Automatically attaches access token and handles 401 refresh.
 */

function getAccessToken(): string | null {
  try {
    const stored = sessionStorage.getItem("ponte-auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { state?: { accessToken?: string } };
    return parsed.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

export const api: KyInstance = ky.create({
  prefixUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  timeout: 15_000,
  parseJson: (text) => {
    const json = JSON.parse(text);
    // Unwrap { data, meta } envelope from TransformInterceptor
    return json.data !== undefined && json.meta ? json.data : json;
  },
  retry: {
    limit: 2,
    statusCodes: [408, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getAccessToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401) {
          // Attempt token refresh
          const { useAuthStore } = await import("@/features/auth/store");
          const store = useAuthStore.getState();

          if (store.refreshToken) {
            try {
              await store.refresh();
              // Retry the original request with new token
              const token = useAuthStore.getState().accessToken;
              if (token) {
                // Update WebSocket auth so it reconnects with the new token
                const { updateSocketAuth } = await import("@/shared/api/ws");
                updateSocketAuth(token);

                const retryRequest = new Request(_request, {
                  headers: new Headers(_request.headers),
                });
                retryRequest.headers.set("Authorization", `Bearer ${token}`);
                return ky(retryRequest);
              }
            } catch {
              store.logout();
            }
          }
        }
        return response;
      },
    ],
  },
});

export type { KyInstance };
