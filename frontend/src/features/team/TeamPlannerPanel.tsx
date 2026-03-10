import CasinoRounded from "@mui/icons-material/CasinoRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import FilterAltRounded from "@mui/icons-material/FilterAltRounded";
import GroupAddRounded from "@mui/icons-material/GroupAddRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useMutation } from "@tanstack/react-query";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { MapResultsTable } from "../../components/MapResultsTable";
import { fetchTeamCommon, fetchTeamRandom } from "../../lib/api";
import type {
  TeamCommonRequestPayload,
  TeamCommonResponse,
  TeamRandomRequestPayload,
} from "../../lib/types";

const DIFFICULTIES = ["", "Easy", "Main", "Hard", "Insane", "Extreme", "Mod"];
const DEFAULT_DELIMITER = ",";

type ToastState = {
  severity: "success" | "error" | "info";
  message: string;
} | null;

type TeamPlannerPanelProps = {
  isActive?: boolean;
};

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get(name);
}

function parseStars(value: string | null): string {
  if (!value) {
    return "";
  }
  return ["1", "2", "3", "4", "5"].includes(value) ? value : "";
}

function getEffectiveDelimiter(value: string): string {
  return value || DEFAULT_DELIMITER;
}

function isNewlineDelimiter(value: string): boolean {
  return value === "\\n" || value.toLowerCase() === "newline" || value === "\n";
}

function toCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildMapsCsv(result: TeamCommonResponse): string {
  const header = [
    "name",
    "difficulty",
    "stars",
    "points",
    "author",
    "released_at",
    "metadata_found",
  ];

  const rows = result.maps.map((entry) => [
    entry.name,
    entry.difficulty,
    entry.stars,
    entry.points,
    entry.author,
    entry.released_at,
    entry.metadata_found,
  ]);

  return [
    header.map((col) => toCsvCell(col)).join(","),
    ...rows.map((row) => row.map((col) => toCsvCell(col)).join(",")),
  ].join("\n");
}

function triggerDownload(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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

function TeamPlannerPanelComponent({ isActive = true }: TeamPlannerPanelProps) {
  const playersInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [playersText, setPlayersText] = useState(() => getQueryParam("players") ?? "");
  const [delimiter, setDelimiter] = useState(
    () => getQueryParam("delimiter") ?? DEFAULT_DELIMITER,
  );
  const [difficulty, setDifficulty] = useState(() => {
    const value = getQueryParam("difficulty") ?? "";
    return DIFFICULTIES.includes(value) ? value : "";
  });
  const [stars, setStars] = useState(() => parseStars(getQueryParam("stars")));
  const includeUnknownMetadata = true;
  const [playersValidationMessage, setPlayersValidationMessage] = useState<string | null>(null);
  const [lastRequestedAction, setLastRequestedAction] = useState<"common" | "random" | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const commonMutation = useMutation({
    mutationFn: (payload: TeamCommonRequestPayload) => fetchTeamCommon(payload),
  });

  const randomMutation = useMutation({
    mutationFn: (payload: TeamRandomRequestPayload) => fetchTeamRandom(payload),
  });

  const playerPreview = useMemo(() => {
    if (!playersText.trim()) {
      return [];
    }

    const splitDelimiter = getEffectiveDelimiter(delimiter);
    const chunks =
      isNewlineDelimiter(splitDelimiter)
        ? playersText.split(/\r?\n/)
        : playersText.split(splitDelimiter);

    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const chunk of chunks) {
      const name = chunk.trim();
      if (!name) {
        continue;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      cleaned.push(name);
    }
    return cleaned;
  }, [playersText, delimiter]);

  const playersPlaceholder = useMemo(() => {
    const sampleNames = ["player1", "player2", "player3"];
    const effectiveDelimiter = getEffectiveDelimiter(delimiter);

    if (isNewlineDelimiter(effectiveDelimiter)) {
      return sampleNames.join("\n");
    }

    return sampleNames.join(effectiveDelimiter);
  }, [delimiter]);

  useEffect(() => {
    if (typeof window === "undefined" || !isActive) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("tab", "team");

    if (playersText.trim()) {
      params.set("players", playersText);
    } else {
      params.delete("players");
    }

    if (delimiter && delimiter !== DEFAULT_DELIMITER) {
      params.set("delimiter", delimiter);
    } else {
      params.delete("delimiter");
    }

    if (difficulty) {
      params.set("difficulty", difficulty);
    } else {
      params.delete("difficulty");
    }

    if (stars) {
      params.set("stars", stars);
    } else {
      params.delete("stars");
    }

    params.delete("includeUnknown");
    params.delete("count");
    params.delete("seed");

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [
    isActive,
    delimiter,
    difficulty,
    playersText,
    stars,
  ]);

  const activeResult: TeamCommonResponse | undefined =
    randomMutation.data ?? commonMutation.data;

  const activeError = randomMutation.error ?? commonMutation.error;
  const activeErrorMessage = activeError instanceof Error ? activeError.message : null;

  const isBusy = commonMutation.isPending || randomMutation.isPending;
  const isFindingCommon = commonMutation.isPending;
  const isFindingRandom = randomMutation.isPending;

  useEffect(() => {
    if (playerPreview.length > 0 && playersValidationMessage) {
      setPlayersValidationMessage(null);
    }
  }, [playerPreview, playersValidationMessage]);

  const buildPayload = (): TeamCommonRequestPayload => {
    const starsValue = stars.trim() === "" ? null : Number(stars);
    return {
      players_text: playersText,
      delimiter,
      difficulty: difficulty || null,
      stars: Number.isFinite(starsValue) ? starsValue : null,
      include_unknown_metadata: includeUnknownMetadata,
    };
  };

  const runCommon = () => {
    if (playerPreview.length === 0) {
      setPlayersValidationMessage("Add at least one player name before searching.");
      playersInputRef.current?.focus();
      return;
    }

    setLastRequestedAction("common");
    randomMutation.reset();
    commonMutation.mutate(buildPayload());
  };

  const runRandom = () => {
    if (playerPreview.length === 0) {
      setPlayersValidationMessage("Add at least one player name before selecting a random map.");
      playersInputRef.current?.focus();
      return;
    }

    setLastRequestedAction("random");
    commonMutation.reset();
    const payload: TeamRandomRequestPayload = {
      ...buildPayload(),
      count: 1,
    };
    randomMutation.mutate(payload);
  };

  const showToast = (severity: "success" | "error" | "info", message: string) => {
    setToast({ severity, message });
  };

  const handleExportCsv = () => {
    if (!activeResult || activeResult.maps.length === 0) {
      showToast("info", "No maps available to export.");
      return;
    }

    const csv = buildMapsCsv(activeResult);
    const fileName = `kog-common-maps-${new Date().toISOString().slice(0, 10)}.csv`;
    triggerDownload(fileName, csv);
    showToast("success", "CSV export started.");
  };

  const handleCopyMapNames = async () => {
    if (!activeResult || activeResult.maps.length === 0) {
      showToast("info", "No maps available to copy.");
      return;
    }

    const names = activeResult.maps.map((map) => map.name).join("\n");
    try {
      await copyText(names);
      showToast("success", `Copied ${activeResult.maps.length} map names.`);
    } catch {
      showToast("error", "Could not copy map names.");
    }
  };

  const handleCopyShareLink = async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await copyText(window.location.href);
      showToast("success", "Share link copied.");
    } catch {
      showToast("error", "Could not copy share link.");
    }
  };

  const handleRetryLastRequest = () => {
    if (lastRequestedAction === "random") {
      runRandom();
      return;
    }

    runCommon();
  };

  return (
    <Stack spacing={{ xs: 1.5, sm: 1.6, md: 1.75 }}>
      <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.4, md: 1.5 }, borderRadius: 1.6 }}>
        <Stack spacing={{ xs: 1.1, sm: 1.2, md: 1.25 }}>
          <TextField
            multiline
            minRows={3}
            inputRef={playersInputRef}
            value={playersText}
            onChange={(event) => setPlayersText(event.target.value)}
            label="Team players"
            placeholder={playersPlaceholder}
            error={Boolean(playersValidationMessage)}
            helperText={playersValidationMessage ?? "Use your delimiter to separate player names."}
          />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 0.8, sm: 0.9 }}
            useFlexGap
            flexWrap="wrap"
          >
            <TextField
              size="small"
              value={delimiter}
              onChange={(event) => setDelimiter(event.target.value)}
              label="Delimiter"
              helperText="Default: comma (,)"
              sx={{ width: { xs: "100%", sm: 150 } }}
            />

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 170 } }}>
              <InputLabel id="difficulty-label">Difficulty</InputLabel>
              <Select
                labelId="difficulty-label"
                value={difficulty}
                label="Difficulty"
                onChange={(event) => setDifficulty(event.target.value)}
              >
                {DIFFICULTIES.map((entry) => (
                  <MenuItem key={entry || "any"} value={entry}>
                    {entry || "Any"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 120 } }}>
              <InputLabel id="stars-label">Stars</InputLabel>
              <Select
                labelId="stars-label"
                value={stars}
                label="Stars"
                onChange={(event) => setStars(event.target.value)}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="1">1</MenuItem>
                <MenuItem value="2">2</MenuItem>
                <MenuItem value="3">3</MenuItem>
                <MenuItem value="4">4</MenuItem>
                <MenuItem value="5">5</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.8, sm: 0.9 }}>
            <Button
              variant="contained"
              startIcon={isFindingCommon ? <CircularProgress color="inherit" size={14} /> : <FilterAltRounded />}
              disabled={isBusy}
              onClick={runCommon}
              size="small"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              Find Common Unfinished
            </Button>
            <Button
              variant="outlined"
              startIcon={isFindingRandom ? <CircularProgress color="inherit" size={14} /> : <CasinoRounded />}
              disabled={isBusy}
              onClick={runRandom}
              size="small"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              Random Pick
            </Button>
            <Button
              variant="text"
              startIcon={<LinkRounded />}
              onClick={handleCopyShareLink}
              size="small"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              Copy Share Link
            </Button>
          </Stack>

          {isBusy && (
            <Alert
              severity="info"
              icon={<CircularProgress size={16} color="inherit" />}
            >
              {isFindingRandom
                ? "Selecting one random map from the shared unfinished list..."
                : "Finding shared unfinished maps for your team..."}
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.1, sm: 1.2, md: 1.25 }, borderRadius: 1.4 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <GroupAddRounded fontSize="small" color="primary" />
          <Typography variant="body2" color="text.secondary">
            Parsed players ({playerPreview.length}):
          </Typography>
          {playerPreview.map((name) => (
            <Box
              key={name}
              sx={{
                px: 0.9,
                py: 0.35,
                borderRadius: "10px",
                fontSize: 12,
                fontWeight: 700,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              }}
            >
              {name}
            </Box>
          ))}
        </Stack>
      </Paper>

      {!activeResult && !activeErrorMessage && !isBusy && (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 1.25, sm: 1.4, md: 1.5 }, borderRadius: 1.6, borderStyle: "dashed" }}
        >
          <Typography sx={{ fontWeight: 700, mb: 0.4 }}>No results yet</Typography>
          <Typography variant="body2" color="text.secondary">
            Enter at least one player, then run a search to view shared unfinished maps.
          </Typography>
        </Paper>
      )}

      {activeErrorMessage && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleRetryLastRequest}>
              Retry
            </Button>
          }
        >
          {activeErrorMessage}
        </Alert>
      )}

      {activeResult && (
        <Stack spacing={{ xs: 1.25, sm: 1.4, md: 1.5 }}>
          <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.4, md: 1.5 }, borderRadius: 1.6 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Common unfinished maps
                </Typography>
                <Typography color="text.secondary">
                  {activeResult.common_unfinished_total} total, {activeResult.common_unfinished_filtered} after filters
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.8, sm: 0.9 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyRounded />}
                  onClick={handleCopyMapNames}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  Copy Map Names
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadRounded />}
                  onClick={handleExportCsv}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  Export CSV
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {activeResult.random && (
            <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.4, md: 1.5 }, borderRadius: 1.6 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                Random Picks ({activeResult.random.returned})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {activeResult.random.maps.map((entry) => (
                  <Box
                    key={`rand-${entry.name}`}
                    sx={{
                      px: 1.2,
                      py: 0.5,
                      borderRadius: "10px",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.12),
                      fontWeight: 700,
                    }}
                  >
                    {entry.name}
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}

          <MapResultsTable maps={activeResult.maps} />
        </Stack>
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={2800}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? <Alert severity={toast.severity}>{toast.message}</Alert> : <span />}
      </Snackbar>
    </Stack>
  );
}

export const TeamPlannerPanel = memo(TeamPlannerPanelComponent);
TeamPlannerPanel.displayName = "TeamPlannerPanel";
