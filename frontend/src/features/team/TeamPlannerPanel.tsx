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
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MapResultsTable } from "../../components/MapResultsTable";
import { fetchTeamCommon, fetchTeamRandom } from "../../lib/api";
import type {
  TeamCommonRequestPayload,
  TeamCommonResponse,
  TeamRandomRequestPayload,
} from "../../lib/types";

const DIFFICULTIES = ["", "Easy", "Main", "Hard", "Insane", "Extreme"];
const DEFAULT_DELIMITER = ",";

type ToastState = {
  severity: "success" | "error" | "info";
  message: string;
} | null;

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get(name);
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseStars(value: string | null): string {
  if (!value) {
    return "";
  }
  return ["1", "2", "3", "4", "5"].includes(value) ? value : "";
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) {
    return fallback;
  }
  return value === "1" || value.toLowerCase() === "true";
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

export function TeamPlannerPanel() {
  const [playersText, setPlayersText] = useState(() => getQueryParam("players") ?? "");
  const [delimiter, setDelimiter] = useState(
    () => getQueryParam("delimiter") ?? DEFAULT_DELIMITER,
  );
  const [difficulty, setDifficulty] = useState(() => {
    const value = getQueryParam("difficulty") ?? "";
    return DIFFICULTIES.includes(value) ? value : "";
  });
  const [stars, setStars] = useState(() => parseStars(getQueryParam("stars")));
  const [includeUnknownMetadata, setIncludeUnknownMetadata] = useState(() =>
    parseBoolean(getQueryParam("includeUnknown"), true),
  );
  const [randomCount, setRandomCount] = useState(() =>
    parsePositiveInt(getQueryParam("count"), 1),
  );
  const [seed, setSeed] = useState(() => getQueryParam("seed") ?? "");
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

    const splitDelimiter = delimiter || DEFAULT_DELIMITER;
    const chunks =
      splitDelimiter === "\\n" || splitDelimiter === "newline"
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

  useEffect(() => {
    if (typeof window === "undefined") {
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

    params.set("includeUnknown", includeUnknownMetadata ? "1" : "0");
    params.set("count", String(Math.max(1, randomCount)));

    if (seed.trim()) {
      params.set("seed", seed.trim());
    } else {
      params.delete("seed");
    }

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [
    delimiter,
    difficulty,
    includeUnknownMetadata,
    playersText,
    randomCount,
    seed,
    stars,
  ]);

  const activeResult: TeamCommonResponse | undefined =
    randomMutation.data ?? commonMutation.data;

  const activeError = randomMutation.error ?? commonMutation.error;
  const activeErrorMessage = activeError instanceof Error ? activeError.message : null;

  const isBusy = commonMutation.isPending || randomMutation.isPending;

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
    randomMutation.reset();
    commonMutation.mutate(buildPayload());
  };

  const runRandom = () => {
    commonMutation.reset();
    const parsedSeed = seed.trim() ? Number(seed) : null;
    const payload: TeamRandomRequestPayload = {
      ...buildPayload(),
      count: Math.max(1, randomCount),
      seed: parsedSeed !== null && Number.isFinite(parsedSeed) ? parsedSeed : null,
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

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            multiline
            minRows={4}
            value={playersText}
            onChange={(event) => setPlayersText(event.target.value)}
            label="Team players"
            placeholder="player1, player2, player3"
            helperText="Use your delimiter to separate player names."
          />

          <Grid container spacing={1.4}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                value={delimiter}
                onChange={(event) => setDelimiter(event.target.value)}
                label="Delimiter"
                helperText="Default: comma (,)"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
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
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
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
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                type="number"
                inputProps={{ min: 1, max: 100 }}
                value={randomCount}
                onChange={(event) => setRandomCount(parsePositiveInt(event.target.value, 1))}
                label="Random count"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                label="Seed (optional)"
                placeholder="2026"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeUnknownMetadata}
                    onChange={(event) => setIncludeUnknownMetadata(event.target.checked)}
                  />
                }
                label="Include maps with missing metadata"
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
            <Button
              variant="contained"
              startIcon={<FilterAltRounded />}
              disabled={isBusy || playerPreview.length === 0}
              onClick={runCommon}
            >
              Find Common Unfinished
            </Button>
            <Button
              variant="outlined"
              startIcon={<CasinoRounded />}
              disabled={isBusy || playerPreview.length === 0}
              onClick={runRandom}
            >
              Random Pick
            </Button>
            <Button variant="text" startIcon={<LinkRounded />} onClick={handleCopyShareLink}>
              Copy Share Link
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <GroupAddRounded fontSize="small" color="primary" />
          <Typography variant="body2" color="text.secondary">
            Parsed players ({playerPreview.length}):
          </Typography>
          {playerPreview.map((name) => (
            <Box
              key={name}
              sx={{
                px: 1,
                py: 0.4,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: "rgba(0,109,119,0.1)",
              }}
            >
              {name}
            </Box>
          ))}
        </Stack>
      </Paper>

      {activeErrorMessage && <Alert severity="error">{activeErrorMessage}</Alert>}

      {activeResult && (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.4}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.4}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  Common unfinished maps
                </Typography>
                <Typography color="text.secondary">
                  {activeResult.common_unfinished_total} total, {activeResult.common_unfinished_filtered} after filters
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyRounded />}
                  onClick={handleCopyMapNames}
                >
                  Copy Map Names
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadRounded />}
                  onClick={handleExportCsv}
                >
                  Export CSV
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {activeResult.random && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 1.1 }}>
                Random Picks ({activeResult.random.returned})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {activeResult.random.maps.map((entry) => (
                  <Box
                    key={`rand-${entry.name}`}
                    sx={{
                      px: 1.2,
                      py: 0.5,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "rgba(239,108,0,0.08)",
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
