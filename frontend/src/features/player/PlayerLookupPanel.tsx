import SearchRounded from "@mui/icons-material/SearchRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchPlayer } from "../../lib/api";

function MetricCard({ label, value }: { label: string; value: string | number | null }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.7, borderRadius: 2.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {value ?? "-"}
      </Typography>
    </Paper>
  );
}

export function PlayerLookupPanel() {
  const [playerInput, setPlayerInput] = useState("White-King");
  const [submittedPlayer, setSubmittedPlayer] = useState("White-King");

  const playerQuery = useQuery({
    queryKey: ["player", submittedPlayer],
    queryFn: () => fetchPlayer(submittedPlayer),
    enabled: submittedPlayer.trim().length > 0,
  });

  const unfinishedMaps = useMemo(() => {
    const rows = playerQuery.data?.data.unfinishedMaps;
    return Array.isArray(rows)
      ? rows
          .map((row) => row.Map)
          .filter((mapName): mapName is string => typeof mapName === "string")
      : [];
  }, [playerQuery.data]);

  const recentTeammates = useMemo(() => {
    const rows = playerQuery.data?.data.lastteammates;
    return Array.isArray(rows)
      ? rows.filter(
          (row): row is { Namee: string; finishesnumber: number } =>
            typeof row.Namee === "string" && typeof row.finishesnumber === "number",
        )
      : [];
  }, [playerQuery.data]);

  const timeline = useMemo(() => {
    const rows = playerQuery.data?.data.points_over_time;
    return Array.isArray(rows)
      ? rows.filter(
          (row): row is { y: number; label: string } =>
            typeof row.y === "number" && typeof row.label === "string",
        )
      : [];
  }, [playerQuery.data]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = playerInput.trim();
    if (trimmed.length > 0) {
      setSubmittedPlayer(trimmed);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Paper component="form" onSubmit={onSubmit} variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            value={playerInput}
            onChange={(event) => setPlayerInput(event.target.value)}
            label="Player name"
            placeholder="White-King"
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<SearchRounded />}
            sx={{ minWidth: { sm: 172 } }}
          >
            Load Data
          </Button>
        </Stack>
      </Paper>

      {playerQuery.isError && (
        <Alert severity="error">{(playerQuery.error as Error).message}</Alert>
      )}

      {playerQuery.data && (
        <Stack spacing={2.2}>
          <Grid container spacing={1.3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Player" value={playerQuery.data.summary.name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Rank" value={playerQuery.data.summary.rank} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total points" value={playerQuery.data.summary.total_points} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="PvP points" value={playerQuery.data.summary.pvp_points} />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Finished: ${playerQuery.data.summary.finished_count}`} color="primary" />
            <Chip label={`Unfinished: ${playerQuery.data.summary.unfinished_count}`} color="secondary" />
            <Chip label={`Timeline points: ${timeline.length}`} variant="outlined" />
          </Stack>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 1.2 }}>
              Points Over Time
            </Typography>
            {timeline.length > 0 ? (
              <Box sx={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={timeline} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" minTickGap={20} />
                    <YAxis allowDecimals={false} width={48} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke="#006d77"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography color="text.secondary">No timeline data found.</Typography>
            )}
          </Paper>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="h6" sx={{ mb: 1.2 }}>
                  Unfinished Maps
                </Typography>
                <TableContainer variant="outlined" component={Paper} sx={{ maxHeight: 360 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Map</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {unfinishedMaps.map((mapName, index) => (
                        <TableRow key={`${mapName}-${index}`} hover>
                          <TableCell width={56}>{index + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{mapName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="h6" sx={{ mb: 1.2 }}>
                  Recent Teammates
                </Typography>
                {recentTeammates.length > 0 ? (
                  <Stack spacing={1}>
                    {recentTeammates.map((teammate) => (
                      <Stack
                        key={`${teammate.Namee}-${teammate.finishesnumber}`}
                        direction="row"
                        justifyContent="space-between"
                        sx={{
                          px: 1.2,
                          py: 0.9,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                        }}
                      >
                        <Typography sx={{ fontWeight: 600 }}>{teammate.Namee}</Typography>
                        <Chip
                          size="small"
                          label={`${teammate.finishesnumber} runs`}
                          variant="outlined"
                        />
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">No teammate history found.</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          <Accordion disableGutters variant="outlined" sx={{ borderRadius: 2.5 }}>
            <AccordionSummary expandIcon={<ExpandMoreRounded />}>
              <Typography sx={{ fontWeight: 700 }}>Raw Player JSON</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  maxHeight: 360,
                  overflow: "auto",
                  p: 1.4,
                  borderRadius: 2,
                  bgcolor: "rgba(15,23,42,0.05)",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(playerQuery.data.data, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Stack>
      )}
    </Stack>
  );
}
