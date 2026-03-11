import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip as MuiTooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { TeamMapEntry } from "../lib/types";

interface MapResultsTableProps {
  maps: TeamMapEntry[];
  maxHeight?: number;
}

type SortDirection = "none" | "asc" | "desc";
type TeamMapSortColumn = "name" | "difficulty" | "stars" | "points" | "author" | "released_at";

const DIFFICULTY_SORT_ORDER = [
  "easy",
  "main",
  "hard",
  "insane",
  "extreme",
  "solo",
  "mod",
] as const;

const TEAM_MAP_COLUMNS: ReadonlyArray<{
  key: TeamMapSortColumn;
  label: string;
  width: string;
}> = [
  { key: "name", label: "Map", width: "30%" },
  { key: "difficulty", label: "Difficulty", width: "14%" },
  { key: "stars", label: "Stars", width: "9%" },
  { key: "points", label: "Points", width: "11%" },
  { key: "author", label: "Author", width: "18%" },
  { key: "released_at", label: "Released", width: "18%" },
];

type NormalizedTeamMap = TeamMapEntry & {
  releasedDisplay: string;
  releasedSortValue: number;
  originalIndex: number;
};

function normalizeReleasedAt(value: string | null | undefined): {
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
  if (trimmed.toLowerCase().includes("sunset")) {
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
  return (left ?? "").trim().toLowerCase().localeCompare((right ?? "").trim().toLowerCase());
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

function normalizeDifficulty(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const compact = normalized.replace(/[^a-z]/g, "");
  const match = DIFFICULTY_SORT_ORDER.find(
    (entry) => compact === entry || compact.startsWith(entry),
  );
  return match ?? null;
}

function maxStarsForDifficulty(difficulty: string | null): number {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  if (
    normalizedDifficulty === "easy"
    || normalizedDifficulty === "main"
    || normalizedDifficulty === "hard"
    || normalizedDifficulty === "insane"
    || normalizedDifficulty === "extreme"
  ) {
    return 3;
  }

  return 5;
}

function StarsDisplay({ stars, difficulty }: { stars: number | null; difficulty: string | null }) {
  if (stars === null) {
    return <Typography variant="body2" color="text.secondary">-</Typography>;
  }

  const maxStars = maxStarsForDifficulty(difficulty);
  const normalizedStars = Math.max(0, Math.min(maxStars, Math.round(stars)));
  const emptyCount = Math.max(0, maxStars - normalizedStars);

  return (
    <MuiTooltip title={`${normalizedStars}/${maxStars} stars`} arrow>
      <Box
        sx={{
          fontSize: 16,
          lineHeight: 1,
          letterSpacing: 0.5,
          fontWeight: 700,
          textShadow: "0 0 1px rgba(0,0,0,0.55)",
        }}
      >
        <Typography component="span" sx={{ color: "warning.main", font: "inherit" }}>
          {"★".repeat(normalizedStars)}
        </Typography>
        <Typography component="span" sx={{ color: "common.white", font: "inherit" }}>
          {"☆".repeat(emptyCount)}
        </Typography>
      </Box>
    </MuiTooltip>
  );
}

function MapResultsTableComponent({ maps, maxHeight = 440 }: MapResultsTableProps) {
  const [sortColumn, setSortColumn] = useState<TeamMapSortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");

  const normalizedMaps = useMemo<NormalizedTeamMap[]>(
    () =>
      maps.map((entry, index) => {
        const released = normalizeReleasedAt(entry.released_at);
        return {
          ...entry,
          releasedDisplay: released.display,
          releasedSortValue: released.sortValue,
          originalIndex: index,
        };
      }),
    [maps],
  );

  const sortedMaps = useMemo(() => {
    if (sortDirection === "none") {
      return normalizedMaps;
    }

    const sortFactor = sortDirection === "asc" ? 1 : -1;

    return [...normalizedMaps].sort((left, right) => {
      let compared = 0;

      switch (sortColumn) {
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
        case "released_at":
          compared = compareNullableNumber(left.releasedSortValue, right.releasedSortValue);
          break;
        default:
          compared = 0;
      }

      if (compared === 0) {
        compared = left.originalIndex - right.originalIndex;
      }

      return compared * sortFactor;
    });
  }, [normalizedMaps, sortColumn, sortDirection]);

  const handleSortToggle = (column: TeamMapSortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection("asc");
      return;
    }

    setSortDirection((current) => cycleSortDirection(current));
  };

  if (maps.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{ borderStyle: "dashed", px: 2, py: 3, textAlign: "center" }}
      >
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>No maps match this filter</Typography>
        <Typography variant="body2" color="text.secondary">
          Try setting Difficulty or Stars to Any, then search again.
        </Typography>
      </Paper>
    );
  }

  const bodyMaxHeight = Math.max(180, maxHeight - 42);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.6, overflow: "hidden" }}>
      <Box
        sx={{
          overflowX: "auto",
          scrollbarWidth: "auto",
          scrollbarGutter: "stable",
          scrollbarColor: (theme) =>
            `${alpha(theme.palette.primary.main, 0.64)} ${alpha(theme.palette.background.default, 0.74)}`,
          "&::-webkit-scrollbar": {
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
        }}
      >
        <Box sx={{ minWidth: 760 }}>
          <Table
            size="small"
            sx={{
              tableLayout: "fixed",
              "& .MuiTableCell-head": {
                bgcolor: "background.paper",
                color: "text.secondary",
                fontSize: { xs: 11, sm: 12 },
                letterSpacing: 0.2,
              },
            }}
          >
            <colgroup>
              {TEAM_MAP_COLUMNS.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <TableHead>
              <TableRow>
                {TEAM_MAP_COLUMNS.map((column) => (
                  <TableCell key={column.key}>
                    <TableSortLabel
                      active={sortColumn === column.key && sortDirection !== "none"}
                      direction={sortColumn === column.key && sortDirection === "desc" ? "desc" : "asc"}
                      hideSortIcon={false}
                      onClick={() => handleSortToggle(column.key)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
          </Table>

          <Box
            sx={{
              maxHeight: { xs: Math.min(bodyMaxHeight, 300), sm: Math.min(bodyMaxHeight, 360), md: bodyMaxHeight },
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
            <Table
              size="small"
              sx={{
                tableLayout: "fixed",
                "& .MuiTableCell-body": {
                  fontSize: { xs: 12, sm: 13 },
                },
              }}
            >
              <colgroup>
                {TEAM_MAP_COLUMNS.map((column) => (
                  <col key={column.key} style={{ width: column.width }} />
                ))}
              </colgroup>
              <TableBody>
                {sortedMaps.map((row) => (
                  <TableRow key={`${row.name}-${row.originalIndex}`} hover>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <EllipsisCell value={row.name} />
                    </TableCell>
                    <TableCell>
                      {row.difficulty ? (
                        <EllipsisCell value={row.difficulty} />
                      ) : (
                        <Typography color="text.secondary" noWrap>
                          Unknown
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StarsDisplay stars={row.stars} difficulty={row.difficulty} />
                    </TableCell>
                    <TableCell>
                      <Typography noWrap>{row.points ?? "-"}</Typography>
                    </TableCell>
                    <TableCell>
                      <EllipsisCell value={row.author ?? "-"} />
                    </TableCell>
                    <TableCell>
                      <EllipsisCell value={row.releasedDisplay} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 1.25, sm: 1.5 }, py: 1, borderTop: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Showing {maps.length} map{maps.length === 1 ? "" : "s"}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

export const MapResultsTable = memo(MapResultsTableComponent);
MapResultsTable.displayName = "MapResultsTable";
