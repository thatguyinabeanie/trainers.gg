import Constants from "expo-constants";
import type { ActionResult } from "@trainers/validators";
import { getSupabase } from "../supabase";

/**
 * Edge Functions base URL
 */
const EDGE_FUNCTIONS_URL =
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined) +
  "/functions/v1";

if (!Constants.expoConfig?.extra?.supabaseUrl) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL in app config");
}

/**
 * Get current session access token for API authentication
 */
async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Call a Supabase Edge Function with authentication
 *
 * @param endpoint - Edge function endpoint (e.g., "api-tournaments/123")
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns ActionResult with typed data or error
 *
 * @example
 * ```ts
 * const result = await apiCall<Tournament>('api-tournaments/123');
 * if (result.success) {
 *   console.log(result.data); // Tournament
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ActionResult<T>> {
  const token = await getAccessToken();

  if (!token) {
    return {
      success: false,
      error: "Authentication required",
      code: "UNAUTHORIZED",
    };
  }

  try {
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    const result: ActionResult<T> = await response.json();
    return result;
  } catch (error) {
    console.error("API call error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
      code: "NETWORK_ERROR",
    };
  }
}
