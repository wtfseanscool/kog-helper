import axios from "axios";
import type {
  PlayerResponse,
  TeamCommonRequestPayload,
  TeamCommonResponse,
  TeamRandomRequestPayload,
} from "./types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

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
