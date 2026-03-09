import StarOutlineRounded from "@mui/icons-material/StarOutlineRounded";
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { TeamMapEntry } from "../lib/types";

interface MapResultsTableProps {
  maps: TeamMapEntry[];
  maxHeight?: number;
}

function StarsChip({ stars }: { stars: number | null }) {
  if (stars === null) {
    return <Typography color="text.secondary">-</Typography>;
  }

  return (
    <Chip
      size="small"
      icon={<StarOutlineRounded sx={{ fontSize: 16 }} />}
      label={`${stars}/5`}
      sx={{ bgcolor: "rgba(239,108,0,0.12)" }}
    />
  );
}

export function MapResultsTable({ maps, maxHeight = 440 }: MapResultsTableProps) {
  if (maps.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{ borderStyle: "dashed", px: 2, py: 3, textAlign: "center" }}
      >
        <Typography color="text.secondary">No maps found for the current filter.</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{ maxHeight, borderRadius: 2.5 }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>Map</TableCell>
            <TableCell>Difficulty</TableCell>
            <TableCell>Stars</TableCell>
            <TableCell>Points</TableCell>
            <TableCell>Author</TableCell>
            <TableCell>Released</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {maps.map((row) => (
            <TableRow key={row.name} hover>
              <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
              <TableCell>
                {row.difficulty ? (
                  <Chip
                    size="small"
                    label={row.difficulty}
                    sx={{ bgcolor: "rgba(0,109,119,0.1)" }}
                  />
                ) : (
                  <Typography color="text.secondary">Unknown</Typography>
                )}
              </TableCell>
              <TableCell>
                <StarsChip stars={row.stars} />
              </TableCell>
              <TableCell>{row.points ?? "-"}</TableCell>
              <TableCell>{row.author ?? "-"}</TableCell>
              <TableCell>{row.released_at ?? "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ px: 1.5, py: 1, borderTop: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Showing {maps.length} map{maps.length === 1 ? "" : "s"}
          </Typography>
        </Stack>
      </Box>
    </TableContainer>
  );
}
