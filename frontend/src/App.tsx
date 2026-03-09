import { useEffect, useMemo, useState } from "react";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import GroupRounded from "@mui/icons-material/GroupRounded";
import PersonSearchRounded from "@mui/icons-material/PersonSearchRounded";
import {
  AppBar,
  Box,
  Chip,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import { PlayerLookupPanel } from "./features/player/PlayerLookupPanel";
import { TeamPlannerPanel } from "./features/team/TeamPlannerPanel";

type AppTab = "player" | "team";

function readTabFromUrl(): AppTab {
  if (typeof window === "undefined") {
    return "player";
  }
  const value = new URLSearchParams(window.location.search).get("tab");
  return value === "team" ? "team" : "player";
}

function App() {
  const [tab, setTab] = useState<AppTab>(() => readTabFromUrl());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onPopState = () => {
      setTab(readTabFromUrl());
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === tab) {
      return;
    }

    params.set("tab", tab);
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [tab]);

  const subtitle = useMemo(() => {
    if (tab === "player") {
      return "Inspect one player in detail with timeline and unfinished maps.";
    }
    return "Find shared unfinished maps for a full team and generate random picks.";
  }, [tab]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 10%, rgba(0, 131, 143, 0.14), transparent 35%), radial-gradient(circle at 85% 0%, rgba(251, 140, 0, 0.12), transparent 30%), linear-gradient(180deg, #f7faf9 0%, #f2f4f8 100%)",
      }}
    >
      <AppBar position="sticky" color="transparent" elevation={0}>
        <Toolbar
          sx={{
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <AutoAwesomeRounded sx={{ color: "primary.main", mr: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
            KoG Team Planner
          </Typography>
          <Chip
            size="small"
            label="GitHub Pages + API"
            sx={{ ml: 2, display: { xs: "none", md: "inline-flex" } }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.8 }}>
              KoG Progress Explorer
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, value: AppTab) => setTab(value)}
              sx={{
                px: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Tab
                value="player"
                icon={<PersonSearchRounded fontSize="small" />}
                iconPosition="start"
                label="Player Lookup"
              />
              <Tab
                value="team"
                icon={<GroupRounded fontSize="small" />}
                iconPosition="start"
                label="Team Planner"
              />
            </Tabs>

            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {tab === "player" ? <PlayerLookupPanel /> : <TeamPlannerPanel />}
            </Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
