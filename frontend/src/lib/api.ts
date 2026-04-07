import axios from "axios";
import type {
  AuthMeResponse,
  AuthProfileUpdatePayload,
  AuthProvidersResponse,
  AuthUser,
  MapCatalogEntry,
  MapCatalogResponse,
  PlayerResponse,
  TeamCommonRequestPayload,
  TeamCommonResponse,
  TeamRandomRequestPayload,
} from "./types";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8000";

const AUTH_TOKEN_STORAGE_KEY = "kog-auth-token";

let authToken: string | null = null;

if (typeof window !== "undefined") {
  const stored = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  authToken = stored && stored.trim().length > 0 ? stored.trim() : null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${authToken}`;
  }


  return config;
});

export function getAuthToken(): string | null {
  return authToken;
}

export function setAuthToken(token: string | null): void {
  const normalized = token?.trim() ?? "";
  authToken = normalized.length > 0 ? normalized : null;

  if (typeof window === "undefined") {
    return;
  }

  if (authToken) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}



function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim().length > 0) {
      return detail;
    }
    if (typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected API error";
}

export async function fetchPlayer(playerName: string): Promise<PlayerResponse> {
  try {
    const response = await api.get<PlayerResponse>(
      `/api/player/${encodeURIComponent(playerName.trim())}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function fetchTeamCommon(
  payload: TeamCommonRequestPayload,
): Promise<TeamCommonResponse> {
  try {
    const response = await api.post<TeamCommonResponse>("/api/team/common", payload);
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function fetchTeamRandom(
  payload: TeamRandomRequestPayload,
): Promise<TeamCommonResponse> {
  try {
    const response = await api.post<TeamCommonResponse>("/api/team/random", payload);
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function fetchMapCatalog(): Promise<MapCatalogEntry[]> {
  try {
    const response = await api.get<MapCatalogResponse>("/api/maps/catalog");
    return Array.isArray(response.data.maps) ? response.data.maps : [];
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function fetchAuthProviders(): Promise<string[]> {
  try {
    const response = await api.get<AuthProvidersResponse>("/api/auth/providers");
    return Array.isArray(response.data.providers) ? response.data.providers : [];
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  try {
    const response = await api.get<AuthMeResponse>("/api/auth/me");
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function updateAuthProfile(payload: AuthProfileUpdatePayload): Promise<AuthUser> {
  try {
    const response = await api.post<{ status: "ok"; user: AuthUser }>("/api/auth/profile", payload);
    return response.data.user;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function logoutAuthSession(): Promise<void> {
  try {
    await api.post("/api/auth/logout");
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export function buildAuthStartUrl(provider: "google" | "discord", nextUrl?: string): string {
  const url = new URL(`${API_BASE_URL}/api/auth/${provider}/start`);
  const target = nextUrl || (typeof window !== "undefined" ? window.location.href : undefined);
  if (target) {
    url.searchParams.set("next", target);
  }
  return url.toString();
}
