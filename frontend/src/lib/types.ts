export interface PlayerSummary {
  rank: number | null;
  name: string | null;
  total_points: number | null;
  pvp_points: number | null;
  finished_count: number;
  unfinished_count: number;
}

export interface PlayerMapRow {
  Map: string;
  Time?: number;
  Timestamp?: string;
}

export interface PlayerTeammate {
  Namee: string;
  finishesnumber: number;
}

export interface PlayerTimelinePoint {
  y: number;
  label: string;
}

export interface PlayerData {
  unfinishedMaps?: PlayerMapRow[];
  finishedMaps?: PlayerMapRow[];
  lastteammates?: PlayerTeammate[];
  points_over_time?: PlayerTimelinePoint[];
  [key: string]: unknown;
}

export interface PlayerResponse {
  status: "ok";
  player: string;
  source_status?: number;
  summary: PlayerSummary;
  data: PlayerData;
}

export interface TeamMapEntry {
  name: string;
  difficulty: string | null;
  stars: number | null;
  points: number | null;
  author: string | null;
  released_at: string | null;
  metadata_found: boolean;
}

export interface TeamCommonRequestPayload {
  players?: string[];
  players_text?: string;
  delimiter?: string;
  difficulty?: string | null;
  stars?: number | null;
  include_unknown_metadata?: boolean;
}

export interface TeamRandomRequestPayload extends TeamCommonRequestPayload {
  count?: number;
  seed?: number | null;
}

export interface TeamRandomBlock {
  seed: number | null;
  requested: number;
  returned: number;
  maps: TeamMapEntry[];
}

export interface TeamCommonResponse {
  status: "ok";
  players: string[];
  filters: {
    difficulty: string | null;
    stars: number | null;
    include_unknown_metadata: boolean;
  };
  player_summaries: Array<{
    name: string;
    rank: number | null;
    total_points: number | null;
    unfinished_count: number;
  }>;
  common_unfinished_total: number;
  common_unfinished_filtered: number;
  maps: TeamMapEntry[];
  random?: TeamRandomBlock;
}
