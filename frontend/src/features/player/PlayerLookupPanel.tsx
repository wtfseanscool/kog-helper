import SearchRounded from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableSortLabel,
  TableRow,
  TextField,
  Tooltip as MuiTooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import { memo, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchMapCatalog, fetchPlayer } from "../../lib/api";
import type { MapCatalogEntry, PlayerMapRow } from "../../lib/types";

type ToastState = {
  severity: "success" | "error" | "info";
  message: string;
} | null;

type PlayerLookupPanelProps = {
  requestedPlayerName?: string | null;
  requestedPlayerVersion?: number;
};

type TimelinePoint = {
  y: number;
  label: string;
};

type SortDirection = "none" | "asc" | "desc";
type PlayerMapSortColumn = "name" | "difficulty" | "stars" | "points" | "author" | "releasedAt";
type MapStatusFilter = "unfinished" | "finished";

const DIFFICULTY_SORT_ORDER = [
  "easy",
  "main",
  "hard",
  "insane",
  "extreme",
  "solo",
  "mod",
] as const;

const PLAYER_MAP_COLUMNS: ReadonlyArray<{
  key: PlayerMapSortColumn;
  label: string;
  cellSx: object;
}> = [
  { key: "name", label: "Map", cellSx: { width: "34%" } },
  { key: "difficulty", label: "Difficulty", cellSx: { width: "14%" } },
  { key: "stars", label: "Stars", cellSx: { width: "10%" } },
  { key: "points", label: "Points", cellSx: { width: "10%", display: { xs: "none", sm: "table-cell" } } },
  { key: "author", label: "Author", cellSx: { width: "16%", display: { xs: "none", sm: "table-cell" } } },
  { key: "releasedAt", label: "Released", cellSx: { width: "16%", display: { xs: "none", md: "table-cell" } } },
];

function getPlayerMapColumnSx(columnKey: PlayerMapSortColumn): object {
  return PLAYER_MAP_COLUMNS.find((column) => column.key === columnKey)?.cellSx ?? {};
}

type EnrichedUnfinishedMap = {
  name: string;
  status: MapStatusFilter;
  difficulty: string | null;
  stars: number | null;
  points: number | null;
  author: string | null;
  releasedAt: string | null;
  releasedAtSortValue: number;
  finishedAt: string | null;
  finishedAtSortValue: number;
  originalIndex: number;
};

function MetricCard({ label, value }: { label: string; value: string | number | null }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.2, sm: 1.3, md: 1.4 }, borderRadius: 1.4 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {value ?? "-"}
      </Typography>
    </Paper>
  );
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatTimelineTick(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 11)}...`;
}

function formatTimelineTooltipValue(value: unknown): [string, string] {
  const points = toNullableNumber(value);
  if (points === null) {
    return [String(value ?? "-"), "Total points"];
  }

  return [`${points.toLocaleString()} points`, "Total points"];
}

function normalizeDateValue(
  value: string | null | undefined,
  options?: {
    treatSunsetAsNa?: boolean;
  },
): {
  display: string;
  sortValue: number;
} {
  const fallback = {
    display: "NA",
    sortValue: Date.parse("1900-01-01T00:00:00Z"),
  };

  if (!value || value.trim().length === 0) {
    return fallback;
  }

  const trimmed = value.trim();
  if (options?.treatSunsetAsNa && trimmed.toLowerCase().includes("sunset")) {
    return fallback;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return {
      display: trimmed,
      sortValue: fallback.sortValue,
    };
  }

  return {
    display: trimmed,
    sortValue: parsed,
  };
}

function compareNullableText(left: string | null, right: string | null): number {
  const normalizedLeft = (left ?? "").trim().toLowerCase();
  const normalizedRight = (right ?? "").trim().toLowerCase();
  return normalizedLeft.localeCompare(normalizedRight);
}

function compareNullableNumber(left: number | null, right: number | null): number {
  const normalizedLeft = left ?? Number.NEGATIVE_INFINITY;
  const normalizedRight = right ?? Number.NEGATIVE_INFINITY;
  return normalizedLeft - normalizedRight;
}

function difficultyRank(value: string | null): number {
  if (!value) {
    return DIFFICULTY_SORT_ORDER.length + 1;
  }

  const normalized = value.trim().toLowerCase();
  const compact = normalized.replace(/[^a-z]/g, "");
  const index = DIFFICULTY_SORT_ORDER.findIndex((entry) => compact === entry || compact.startsWith(entry));
  return index === -1 ? DIFFICULTY_SORT_ORDER.length : index;
}

function compareDifficulty(left: string | null, right: string | null): number {
  const rankDifference = difficultyRank(left) - difficultyRank(right);
  if (rankDifference !== 0) {
    return rankDifference;
  }

  return compareNullableText(left, right);
}

function cycleSortDirection(direction: SortDirection): SortDirection {
  if (direction === "none") {
    return "asc";
  }

  if (direction === "asc") {
    return "desc";
  }

  return "none";
}

function EllipsisCell({ value }: { value: string }) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) {
      return;
    }

    const updateOverflow = () => {
      setIsOverflowed(element.scrollWidth > element.clientWidth + 1);
    };

    updateOverflow();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateOverflow);
      return () => {
        window.removeEventListener("resize", updateOverflow);
      };
    }

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [value]);

  return (
    <MuiTooltip
      title={value}
      placement="top-start"
      disableHoverListener={!isOverflowed}
      disableFocusListener={!isOverflowed}
      disableTouchListener={!isOverflowed}
      disableInteractive
      PopperProps={{ disablePortal: true }}
      slotProps={{
        tooltip: {
          sx: {
            borderRadius: "10px",
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.98),
            color: "text.primary",
            px: 1.2,
            py: 0.85,
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "none",
          },
        },
      }}
    >
      <Typography ref={textRef} noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </Typography>
    </MuiTooltip>
  );
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function PlayerLookupPanelComponent({
  requestedPlayerName = null,
  requestedPlayerVersion = 0,
}: PlayerLookupPanelProps) {
  const muiTheme = useTheme();
  const playerInputRef = useRef<HTMLInputElement | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [submittedPlayer, setSubmittedPlayer] = useState("");
  const [playerValidationMessage, setPlayerValidationMessage] = useState<string | null>(null);
  const [mapStatusFilter, setMapStatusFilter] = useState<MapStatusFilter>("unfinished");
  const [mapSortColumn, setMapSortColumn] = useState<PlayerMapSortColumn>("name");
  const [mapSortDirection, setMapSortDirection] = useState<SortDirection>("none");
  const [mapPage, setMapPage] = useState(0);
  const [mapRowsPerPage, setMapRowsPerPage] = useState(50);
  const [toast, setToast] = useState<ToastState>(null);

  const hasSubmittedPlayer = submittedPlayer.trim().length > 0;

  const playerQuery = useQuery({
    queryKey: ["player", submittedPlayer],
    queryFn: () => fetchPlayer(submittedPlayer),
    enabled: hasSubmittedPlayer,
  });

  const mapCatalogQuery = useQuery({
    queryKey: ["map-catalog"],
    queryFn: fetchMapCatalog,
    enabled: hasSubmittedPlayer,
    staleTime: 10 * 60 * 1000,
  });

  const isFetchingPlayer = playerQuery.fetchStatus === "fetching";
  const isInitialPlayerLoad = isFetchingPlayer && !playerQuery.data;

  const catalogByName = useMemo(() => {
    const lookup = new Map<string, MapCatalogEntry>();
    for (const entry of mapCatalogQuery.data ?? []) {
      if (typeof entry.name !== "string" || entry.name.trim().length === 0) {
        continue;
      }

      lookup.set(entry.name.trim().toLowerCase(), entry);
    }
    return lookup;
  }, [mapCatalogQuery.data]);

  const unfinishedMaps = useMemo<EnrichedUnfinishedMap[]>(() => {
    const data = playerQuery.data?.data;
    if (!data || typeof data !== "object") {
      return [];
    }

    const unfinishedRows = Array.isArray(data.unfinishedMaps) ? data.unfinishedMaps : [];
    const finishedRows = Array.isArray(data.finishedMaps) ? data.finishedMaps : [];

    const buildRows = (
      rows: PlayerMapRow[],
      status: MapStatusFilter,
      startIndex: number,
    ): EnrichedUnfinishedMap[] =>
      rows.flatMap((rawRow, index) => {
        if (!rawRow || typeof rawRow !== "object") {
          return [];
        }

        const row = rawRow as PlayerMapRow;
        if (typeof row.Map !== "string" || row.Map.trim().length === 0) {
          return [];
        }

        const mapName = row.Map.trim();
        const metadata = catalogByName.get(mapName.toLowerCase());
        const releasedAt = normalizeDateValue(metadata?.released_at ?? null, {
          treatSunsetAsNa: true,
        });
        const finishedAt = normalizeDateValue(row.Timestamp ?? null);

        return [
          {
            name: mapName,
            status,
            difficulty: metadata?.difficulty ?? null,
            stars: metadata?.stars ?? null,
            points: metadata?.points ?? null,
            author: metadata?.author ?? null,
            releasedAt: releasedAt.display,
            releasedAtSortValue: releasedAt.sortValue,
            finishedAt: finishedAt.display,
            finishedAtSortValue: finishedAt.sortValue,
            originalIndex: startIndex + index,
          },
        ];
      });

    return [
      ...buildRows(unfinishedRows as PlayerMapRow[], "unfinished", 0),
      ...buildRows(finishedRows as PlayerMapRow[], "finished", unfinishedRows.length),
    ];
  }, [catalogByName, playerQuery.data]);

  const filteredUnfinishedMaps = useMemo(
    () => unfinishedMaps.filter((entry) => entry.status === mapStatusFilter),
    [mapStatusFilter, unfinishedMaps],
  );

  const sortedUnfinishedMaps = useMemo(() => {
    if (mapSortDirection === "none") {
      return filteredUnfinishedMaps;
    }

    const sortFactor = mapSortDirection === "asc" ? 1 : -1;

    return [...filteredUnfinishedMaps].sort((left, right) => {
      let compared = 0;

      switch (mapSortColumn) {
        case "name":
          compared = compareNullableText(left.name, right.name);
          break;
        case "difficulty":
          compared = compareDifficulty(left.difficulty, right.difficulty);
          break;
        case "stars":
          compared = compareNullableNumber(left.stars, right.stars);
          break;
        case "points":
          compared = compareNullableNumber(left.points, right.points);
          break;
        case "author":
          compared = compareNullableText(left.author, right.author);
          break;
        case "releasedAt":
          compared = compareNullableNumber(
            mapStatusFilter === "finished" ? left.finishedAtSortValue : left.releasedAtSortValue,
            mapStatusFilter === "finished" ? right.finishedAtSortValue : right.releasedAtSortValue,
          );
          break;
        default:
          compared = 0;
      }

      if (compared === 0) {
        compared = left.originalIndex - right.originalIndex;
      }

      return compared * sortFactor;
    });
  }, [filteredUnfinishedMaps, mapSortColumn, mapSortDirection, mapStatusFilter]);

  const paginatedMapRows = useMemo(() => {
    const start = mapPage * mapRowsPerPage;
    return sortedUnfinishedMaps.slice(start, start + mapRowsPerPage);
  }, [mapPage, mapRowsPerPage, sortedUnfinishedMaps]);

  const recentTeammates = useMemo(() => {
    const rows = playerQuery.data?.data.lastteammates;
    return Array.isArray(rows)
      ? rows.filter(
          (row): row is { Namee: string; finishesnumber: number } =>
            typeof row.Namee === "string" && typeof row.finishesnumber === "number",
        )
      : [];
  }, [playerQuery.data]);

  const timeline = useMemo<TimelinePoint[]>(() => {
    const rows = playerQuery.data?.data.points_over_time;
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.flatMap((row) => {
      if (
        !row ||
        typeof row !== "object" ||
        typeof row.y !== "number" ||
        typeof row.label !== "string"
      ) {
        return [];
      }

      return [
        {
          y: row.y,
          label: row.label,
        },
      ];
    });
  }, [playerQuery.data]);

  const showToast = (severity: "success" | "error" | "info", message: string) => {
    setToast({ severity, message });
  };

  const handleSortToggle = (column: PlayerMapSortColumn) => {
    if (mapSortColumn !== column) {
      setMapSortColumn(column);
      setMapSortDirection("asc");
      return;
    }

    setMapSortDirection((current) => cycleSortDirection(current));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = playerInput.trim();
    if (trimmed.length === 0) {
      setPlayerValidationMessage("Enter a player name before loading data.");
      playerInputRef.current?.focus();
      return;
    }

    setPlayerValidationMessage(null);
    setSubmittedPlayer(trimmed);
  };

  const handleCopyTeammate = async (name: string) => {
    try {
      await copyText(name);
      showToast("success", `Copied teammate name: ${name}`);
    } catch {
      showToast("error", "Could not copy teammate name.");
    }
  };

  useEffect(() => {
    if (playerValidationMessage && playerInput.trim().length > 0) {
      setPlayerValidationMessage(null);
    }
  }, [playerInput, playerValidationMessage]);

  useEffect(() => {
    const target = requestedPlayerName?.trim();
    if (!target) {
      return;
    }

    setPlayerInput(target);
    setSubmittedPlayer(target);
    setPlayerValidationMessage(null);
  }, [requestedPlayerName, requestedPlayerVersion]);

  useEffect(() => {
    setMapPage(0);
  }, [mapStatusFilter, mapSortColumn, mapSortDirection, submittedPlayer]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedUnfinishedMaps.length / mapRowsPerPage) - 1);
    if (mapPage > maxPage) {
      setMapPage(maxPage);
    }
  }, [mapPage, mapRowsPerPage, sortedUnfinishedMaps.length]);

  return (
    <Stack spacing={{ xs: 1.5, sm: 1.6, md: 1.75 }}>
      <Paper
        component="form"
        onSubmit={onSubmit}
        variant="outlined"
        sx={{ p: { xs: 1.25, sm: 1.4, md: 1.5 }, borderRadius: 1.6 }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 0.9, sm: 1 }}
          alignItems={{ xs: "stretch", sm: "flex-start" }}
        >
          <TextField
            inputRef={playerInputRef}
            value={playerInput}
            onChange={(event) => setPlayerInput(event.target.value)}
            label="Player name"
            placeholder="Enter player name"
            error={Boolean(playerValidationMessage)}
            helperText={playerValidationMessage ?? "Search one player to inspect timeline and map progress."}
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={isFetchingPlayer ? <CircularProgress color="inherit" size={14} /> : <SearchRounded />}
            disabled={isFetchingPlayer}
            sx={{
              width: { xs: "100%", sm: "auto" },
              minWidth: { sm: 118 },
              height: { sm: 40, md: 40 },
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Load Data
          </Button>
        </Stack>
      </Paper>

      {!hasSubmittedPlayer && !isFetchingPlayer && !playerQuery.isError && (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 1.25, sm: 1.4, md: 1.5 }, borderRadius: 1.6, borderStyle: "dashed" }}
        >
          <Typography sx={{ fontWeight: 700, mb: 0.4 }}>No player selected</Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a player name and load data to see points over time, unfinished maps, and teammate history.
          </Typography>
        </Paper>
      )}

      {isInitialPlayerLoad && (
        <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.4, md: 1.5 }, borderRadius: 1.6 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Loading player data...
            </Typography>
          </Stack>
        </Paper>
      )}

      {playerQuery.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => playerQuery.refetch()}>
              Retry
            </Button>
          }
        >
          {(playerQuery.error as Error).message}
        </Alert>
      )}

      {playerQuery.data && (
        <Stack spacing={{ xs: 1.5, sm: 1.6, md: 1.75 }}>
          <Grid container spacing={{ xs: 1, sm: 1.2, md: 1.3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard label="Player" value={playerQuery.data.summary.name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard label="Rank" value={playerQuery.data.summary.rank} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard label="Total points" value={playerQuery.data.summary.total_points} />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.4, md: 1.5 }, borderRadius: 1.6 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              Points Over Time
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Hover a point to inspect the exact timeline label and total points.
            </Typography>
            {timeline.length > 0 ? (
              <Box
                role="img"
                aria-label={`Line chart of ${submittedPlayer} points over time`}
                sx={{ width: "100%", height: { xs: 220, sm: 250, md: 280 } }}
              >
                <ResponsiveContainer>
                  <LineChart data={timeline} margin={{ top: 16, right: 22, left: 14, bottom: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.24} />
                    <XAxis
                      dataKey="label"
                      interval="preserveStartEnd"
                      minTickGap={16}
                      tickMargin={8}
                      height={38}
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatTimelineTick}
                    />
                    <YAxis allowDecimals={false} width={58} tickMargin={8} tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      cursor={{ stroke: muiTheme.palette.divider, strokeDasharray: "4 4" }}
                      contentStyle={{
                        borderRadius: 10,
                        border: `1px solid ${muiTheme.palette.divider}`,
                        backgroundColor: alpha(muiTheme.palette.background.paper, 0.98),
                        padding: "8px 10px",
                      }}
                      labelStyle={{ fontWeight: 700, color: muiTheme.palette.text.primary }}
                      formatter={formatTimelineTooltipValue}
                    />
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke={muiTheme.palette.primary.main}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 4,
                        strokeWidth: 1,
                        stroke: muiTheme.palette.background.paper,
                        fill: muiTheme.palette.primary.main,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography color="text.secondary">No timeline data found.</Typography>
            )}
          </Paper>

          <Grid container spacing={{ xs: 1.25, sm: 1.4, md: 1.5 }} alignItems="stretch">
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex" }}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.25, sm: 1.4, md: 1.5 },
                  borderRadius: 1.6,
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  height: "100%",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={{ xs: 0.5, sm: 1 }}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Map List
                  </Typography>
                  <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`Finished ${playerQuery.data.summary.finished_count}`}
                      onClick={() => setMapStatusFilter("finished")}
                      clickable
                      variant={mapStatusFilter === "finished" ? "filled" : "outlined"}
                      sx={{
                        borderColor: mapStatusFilter === "finished" ? "primary.main" : "divider",
                        bgcolor: (theme) =>
                          mapStatusFilter === "finished"
                            ? alpha(theme.palette.primary.main, 0.18)
                            : "transparent",
                        color: mapStatusFilter === "finished" ? "primary.main" : "text.secondary",
                      }}
                    />
                    <Chip
                      label={`Unfinished ${playerQuery.data.summary.unfinished_count}`}
                      onClick={() => setMapStatusFilter("unfinished")}
                      clickable
                      variant={mapStatusFilter === "unfinished" ? "filled" : "outlined"}
                      sx={{
                        borderColor: mapStatusFilter === "unfinished" ? "primary.main" : "divider",
                        bgcolor: (theme) =>
                          mapStatusFilter === "unfinished"
                            ? alpha(theme.palette.primary.main, 0.18)
                            : "transparent",
                        color: mapStatusFilter === "unfinished" ? "primary.main" : "text.secondary",
                      }}
                    />
                  </Stack>
                </Stack>

                {mapCatalogQuery.isError && (
                  <Alert severity="warning" sx={{ mb: 1.1 }}>
                    Map metadata could not be loaded. Showing player-side map data only.
                  </Alert>
                )}

                {sortedUnfinishedMaps.length > 0 ? (
                  <Paper variant="outlined" sx={{ borderRadius: 1.4, overflow: "hidden" }}>
                    <Table
                      size="small"
                      sx={{
                        tableLayout: "fixed",
                        width: "100%",
                        "& .MuiTableCell-head": {
                          bgcolor: "background.paper",
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          {PLAYER_MAP_COLUMNS.map((column) => (
                            <TableCell key={column.key} sx={column.cellSx}>
                              <TableSortLabel
                                active={mapSortColumn === column.key && mapSortDirection !== "none"}
                                direction={mapSortColumn === column.key && mapSortDirection === "desc" ? "desc" : "asc"}
                                hideSortIcon={false}
                                onClick={() => handleSortToggle(column.key)}
                              >
                                {column.key === "releasedAt"
                                  ? mapStatusFilter === "finished"
                                    ? "Date Finished"
                                    : "Released"
                                  : column.label}
                              </TableSortLabel>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                    </Table>

                    <Box
                      sx={{
                        maxHeight: { xs: 300, sm: 340, md: 360 },
                        overflowY: "scroll",
                        overflowX: "hidden",
                        borderTop: "1px solid",
                        borderColor: "divider",
                        scrollbarWidth: "auto",
                        scrollbarGutter: "stable",
                        scrollbarColor: (theme) =>
                          `${alpha(theme.palette.primary.main, 0.64)} ${alpha(theme.palette.background.default, 0.74)}`,
                        "&::-webkit-scrollbar": {
                          width: 12,
                          height: 12,
                        },
                        "&::-webkit-scrollbar-track": {
                          backgroundColor: (theme) => alpha(theme.palette.background.default, 0.74),
                        },
                        "&::-webkit-scrollbar-thumb": {
                          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.64),
                          borderRadius: 8,
                          border: "2px solid transparent",
                          backgroundClip: "content-box",
                        },
                        "&::-webkit-scrollbar-thumb:hover": {
                          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.8),
                        },
                        "&::-webkit-scrollbar-corner": {
                          backgroundColor: (theme) => alpha(theme.palette.background.default, 0.74),
                        },
                      }}
                    >
                      <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                        <TableBody>
                          {paginatedMapRows.map((entry) => (
                            <TableRow
                              key={`${entry.name}-${entry.originalIndex}`}
                              hover
                              sx={{
                                "&.MuiTableRow-hover:hover": {
                                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                },
                              }}
                            >
                              <TableCell sx={{ ...getPlayerMapColumnSx("name"), fontWeight: 600 }}>
                                <EllipsisCell value={entry.name} />
                              </TableCell>
                              <TableCell sx={getPlayerMapColumnSx("difficulty")}>
                                <EllipsisCell value={entry.difficulty ?? "-"} />
                              </TableCell>
                              <TableCell sx={getPlayerMapColumnSx("stars")}>
                                <Typography noWrap>{entry.stars ?? "-"}</Typography>
                              </TableCell>
                              <TableCell sx={getPlayerMapColumnSx("points")}>
                                <Typography noWrap>{entry.points ?? "-"}</Typography>
                              </TableCell>
                              <TableCell sx={getPlayerMapColumnSx("author")}>
                                <EllipsisCell value={entry.author ?? "-"} />
                              </TableCell>
                              <TableCell sx={getPlayerMapColumnSx("releasedAt")}>
                                <EllipsisCell
                                  value={
                                    mapStatusFilter === "finished"
                                      ? (entry.finishedAt ?? "NA")
                                      : (entry.releasedAt ?? "NA")
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>

                    <TablePagination
                      component="div"
                      count={sortedUnfinishedMaps.length}
                      page={mapPage}
                      onPageChange={(_, nextPage) => setMapPage(nextPage)}
                      rowsPerPage={mapRowsPerPage}
                      onRowsPerPageChange={(event) => {
                        const nextValue = Number(event.target.value);
                        setMapRowsPerPage(Number.isFinite(nextValue) ? nextValue : 50);
                        setMapPage(0);
                      }}
                      rowsPerPageOptions={[25, 50, 100, 250]}
                      labelRowsPerPage="Rows"
                      sx={{
                        borderTop: "1px solid",
                        borderColor: "divider",
                        "& .MuiTablePagination-toolbar": {
                          minHeight: 42,
                          px: 1.2,
                        },
                      }}
                    />
                  </Paper>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{ borderStyle: "dashed", p: { xs: 1.4, sm: 1.8, md: 2 }, textAlign: "center" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No {mapStatusFilter} maps were found for this player.
                    </Typography>
                  </Paper>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex" }}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.25, sm: 1.4, md: 1.5 },
                  borderRadius: 1.6,
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  height: "100%",
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                  Recent Teammates
                </Typography>
                {recentTeammates.length > 0 ? (
                  <Stack
                    spacing={1}
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: { xs: "visible", md: "auto" },
                      pr: { xs: 0, md: 0.25 },
                    }}
                  >
                    {recentTeammates.map((teammate) => (
                      <Stack
                        key={`${teammate.Namee}-${teammate.finishesnumber}`}
                        direction="row"
                        justifyContent="space-between"
                        onClick={() => handleCopyTeammate(teammate.Namee)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleCopyTeammate(teammate.Namee);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        sx={{
                          px: 1.2,
                          py: 0.7,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "background-color 140ms ease",
                          "&:hover": {
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                          },
                        }}
                      >
                        <Typography sx={{ fontWeight: 600 }}>{teammate.Namee}</Typography>
                        <Chip label={`${teammate.finishesnumber} runs`} variant="outlined" />
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">No teammate history found.</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? <Alert severity={toast.severity}>{toast.message}</Alert> : <span />}
      </Snackbar>
    </Stack>
  );
}

export const PlayerLookupPanel = memo(PlayerLookupPanelComponent);
PlayerLookupPanel.displayName = "PlayerLookupPanel";
