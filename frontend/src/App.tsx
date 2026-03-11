import { Suspense, lazy, useEffect, useMemo, useState, type MouseEvent } from "react";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import GroupRounded from "@mui/icons-material/GroupRounded";
import PersonSearchRounded from "@mui/icons-material/PersonSearchRounded";
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountCircleRounded from "@mui/icons-material/AccountCircleRounded";
import LoginRounded from "@mui/icons-material/LoginRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayerLookupPanel } from "./features/player/PlayerLookupPanel";
import { TeamPlannerPanel } from "./features/team/TeamPlannerPanel";
import {
  buildAuthStartUrl,
  fetchAuthMe,
  fetchAuthProviders,
  getAuthToken,
  logoutAuthSession,
  setAuthToken,
  updateAuthProfile,
} from "./lib/api";
import type { AuthUser } from "./lib/types";
import {
  type AppThemePreset,
} from "./theme";

const ModernUIPrototype = lazy(() => import("./prototype/ModernUIPrototype"));
const ShadcnPrototype = lazy(() => import("./prototype/ShadcnPrototype"));

type AppTab = "player" | "team";
type PrototypeType = "modern" | "shadcn" | null;

type AuthToastState = {
  severity: "success" | "error" | "info";
  message: string;
} | null;

const TEAM_TAB_QUERY_KEYS = [
  "players",
  "delimiter",
  "difficulty",
  "stars",
  "includeUnknown",
  "count",
  "seed",
] as const;

type AppProps = {
  themePreset: AppThemePreset;
};

function readPrototypeFromUrl(): PrototypeType {
  if (typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const prototypeParam = params.get("prototype")?.toLowerCase();

  if (prototypeParam === "shadcn") {
    return "shadcn";
  }
  if (prototypeParam && ["modern", "1", "true", "yes"].includes(prototypeParam)) {
    return "modern";
  }

  const path = window.location.pathname.toLowerCase();
  if (path.endsWith("/shadcn")) return "shadcn";
  if (path.endsWith("/prototype")) return "modern";

  return null;
}

function readTabFromUrl(): AppTab {
  if (typeof window === "undefined") {
    return "player";
  }
  const value = new URLSearchParams(window.location.search).get("tab");
  return value === "team" ? "team" : "player";
}

function readAuthReasonFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const authState = params.get("auth");
  if (authState !== "error") {
    return null;
  }

  const reason = params.get("reason")?.trim();
  if (!reason) {
    return "Authentication failed. Please try again.";
  }
  return reason;
}

function readAuthTokenPayloadFromHash(): { token: string | null; provider: string | null } {
  if (typeof window === "undefined") {
    return { token: null, provider: null };
  }

  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!raw) {
    return { token: null, provider: null };
  }

  const params = new URLSearchParams(raw);
  const token = params.get("auth_token")?.trim() ?? null;
  const provider = params.get("auth_provider")?.trim() ?? null;
  return {
    token: token && token.length > 0 ? token : null,
    provider: provider && provider.length > 0 ? provider : null,
  };
}

function App({ themePreset }: AppProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AppTab>(() => readTabFromUrl());
  const [prototypeMode, setPrototypeMode] = useState<PrototypeType>(() =>
    readPrototypeFromUrl(),
  );
  const [authMenuAnchorEl, setAuthMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [kogNameDraft, setKogNameDraft] = useState("");
  const [profileLookupName, setProfileLookupName] = useState<string | null>(null);
  const [profileLookupVersion, setProfileLookupVersion] = useState(0);
  const [authToast, setAuthToast] = useState<AuthToastState>(() => {
    const reason = readAuthReasonFromUrl();
    return reason ? { severity: "error", message: reason } : null;
  });

  const authMeQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchAuthMe,
    staleTime: 30_000,
  });

  const authProvidersQuery = useQuery({
    queryKey: ["auth", "providers"],
    queryFn: fetchAuthProviders,
    staleTime: 5 * 60_000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateAuthProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setProfileDialogOpen(false);
      setAuthToast({ severity: "success", message: "Profile updated." });
    },
    onError: (error) => {
      setAuthToast({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not update profile.",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutAuthSession,
    onSuccess: () => {
      setAuthToken(null);
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setAuthMenuAnchorEl(null);
      setAuthToast({ severity: "success", message: "Signed out." });
    },
    onError: (error) => {
      setAuthToast({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not sign out.",
      });
    },
  });

  const currentUser: AuthUser | null =
    authMeQuery.data?.authenticated && authMeQuery.data.user
      ? authMeQuery.data.user
      : null;
  const authMenuOpen = Boolean(authMenuAnchorEl);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onPopState = () => {
      setTab(readTabFromUrl());
      setPrototypeMode(readPrototypeFromUrl());
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

    const currentQuery = window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : "";

    const params = new URLSearchParams(currentQuery);
    const currentTab = params.get("tab");

    params.set("tab", tab);

    if (tab === "player") {
      TEAM_TAB_QUERY_KEYS.forEach((key) => params.delete(key));
    }

    const query = params.toString();
    if (query === currentQuery) {
      return;
    }

    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    if (currentTab === null || currentTab === tab) {
      window.history.replaceState({}, "", nextUrl);
      return;
    }

    window.history.pushState({}, "", nextUrl);
  }, [tab]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const { token, provider } = readAuthTokenPayloadFromHash();
    if (!token) {
      return;
    }

    setAuthToken(token);
    void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

    const hashParams = new URLSearchParams(
      window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash,
    );
    hashParams.delete("auth_token");
    hashParams.delete("auth_provider");

    const nextHash = hashParams.toString();
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ""}`;
    window.history.replaceState({}, "", nextUrl);

    const providerLabel = provider
      ? provider[0].toUpperCase() + provider.slice(1).toLowerCase()
      : null;
    setAuthToast({
      severity: "success",
      message: providerLabel ? `Signed in with ${providerLabel}.` : "Signed in successfully.",
    });
  }, [queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (!params.has("auth") && !params.has("reason")) {
      return;
    }

    params.delete("auth");
    params.delete("reason");
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    if (authMeQuery.data?.authenticated === false && getAuthToken()) {
      setAuthToken(null);
    }
  }, [authMeQuery.data]);

  useEffect(() => {
    if (!profileDialogOpen) {
      return;
    }

    setKogNameDraft(currentUser?.kog_name ?? "");
  }, [currentUser?.kog_name, profileDialogOpen]);

  const handleAuthMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAuthMenuAnchorEl(event.currentTarget);
  };

  const handleAuthMenuClose = () => {
    setAuthMenuAnchorEl(null);
  };

  const handleOAuthStart = (provider: "google" | "discord") => {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    window.location.href = buildAuthStartUrl(provider, nextUrl);
  };

  const handleOpenProfileDialog = () => {
    setProfileDialogOpen(true);
    setAuthMenuAnchorEl(null);
  };

  const handleViewProfile = () => {
    if (!currentUser?.kog_name) {
      setAuthToast({
        severity: "info",
        message: "Set your KoG name first, then try View Profile.",
      });
      setAuthMenuAnchorEl(null);
      return;
    }

    setTab("player");
    setProfileLookupName(currentUser.kog_name);
    setProfileLookupVersion((value) => value + 1);
    setAuthMenuAnchorEl(null);
  };

  const handleSaveProfile = () => {
    const normalized = kogNameDraft.trim();
    if (normalized.length < 2) {
      setAuthToast({
        severity: "error",
        message: "KoG name must be at least 2 characters.",
      });
      return;
    }

    updateProfileMutation.mutate({ kog_name: normalized });
  };

  const subtitle = useMemo(() => {
    if (tab === "player") {
      return "Inspect one player in detail with timeline and unfinished maps.";
    }
    return "Find shared unfinished maps for a full team and generate a random pick.";
  }, [tab]);

  if (prototypeMode) {
    return (
      <Suspense
        fallback={
          <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
            <Typography color="text.secondary">Loading prototype...</Typography>
          </Box>
        }
      >
        {prototypeMode === "shadcn" ? <ShadcnPrototype /> : <ModernUIPrototype />}
      </Suspense>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: themePreset.gradient,
        transition: "background 260ms ease",
      }}
    >
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backgroundColor: (theme) =>
            alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.8 : 0.68),
        }}
      >
        <Toolbar
          sx={{
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid",
            borderColor: "divider",
            minHeight: { xs: 54, sm: 56, md: 58 },
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
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1.2 }}>
            {currentUser ? (
              <Tooltip title={currentUser.kog_name || currentUser.display_name || "Signed in"}>
                <IconButton
                  size="small"
                  onClick={handleAuthMenuOpen}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.78),
                  }}
                >
                  <Avatar
                    src={currentUser.avatar_url ?? undefined}
                    sx={{ width: 26, height: 26, fontSize: 13 }}
                  >
                    {(currentUser.display_name || currentUser.email || "U").slice(0, 1).toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                variant="outlined"
                startIcon={<LoginRounded fontSize="small" />}
                onClick={handleAuthMenuOpen}
                sx={{
                  borderColor: "divider",
                }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={authMenuAnchorEl}
        open={authMenuOpen}
        onClose={handleAuthMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {currentUser ? (
          <Box sx={{ minWidth: 240 }}>
            <Box sx={{ px: 1.5, py: 1.1, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography sx={{ fontWeight: 700 }}>
                {currentUser.display_name || currentUser.email || "Signed in user"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentUser.kog_name ? `KoG: ${currentUser.kog_name}` : "KoG name not set"}
              </Typography>
            </Box>

            <MenuItem onClick={handleViewProfile}>
              <ListItemIcon>
                <PersonRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>View Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleOpenProfileDialog}>
              <ListItemIcon>
                <SettingsRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Configure KoG Name</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <ListItemIcon>
                <LogoutRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>{logoutMutation.isPending ? "Signing out..." : "Sign Out"}</ListItemText>
            </MenuItem>
          </Box>
        ) : (
          <Box sx={{ minWidth: 220 }}>
            <Box sx={{ px: 1.5, py: 1.1, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography sx={{ fontWeight: 700 }}>Sign in</Typography>
              <Typography variant="caption" color="text.secondary">
                Create an account and save your KoG profile.
              </Typography>
            </Box>

            <MenuItem
              onClick={() => handleOAuthStart("google")}
              disabled={authProvidersQuery.isLoading || !authProvidersQuery.data?.includes("google")}
            >
              <ListItemIcon>
                <AccountCircleRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Continue with Google</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => handleOAuthStart("discord")}
              disabled={authProvidersQuery.isLoading || !authProvidersQuery.data?.includes("discord")}
            >
              <ListItemIcon>
                <AccountCircleRounded fontSize="small" />
              </ListItemIcon>
              <ListItemText>Continue with Discord</ListItemText>
            </MenuItem>
            {authProvidersQuery.data && authProvidersQuery.data.length === 0 && (
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  OAuth providers are not configured on this deployment.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Menu>

      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Configure Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="KoG name"
            fullWidth
            value={kogNameDraft}
            onChange={(event) => setKogNameDraft(event.target.value)}
            helperText="This name is used by View Profile in Player Lookup."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSaveProfile}
            variant="contained"
            startIcon={<SaveRounded fontSize="small" />}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2, md: 2.75 } }}>
        <Stack spacing={{ xs: 1.4, sm: 1.55, md: 1.75 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                mb: 0.5,
                fontSize: { xs: "1.45rem", sm: "1.7rem", md: "2rem" },
              }}
            >
              KoG Progress Explorer
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: "0.9rem", sm: "0.95rem", md: "1rem" } }}>
              {subtitle}
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: { xs: 1.4, sm: 1.6, md: 1.8 },
              overflow: "hidden",
              backgroundColor: (theme) =>
                alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.86 : 0.78),
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

            <Box sx={{ p: { xs: 1, sm: 1.25, md: 1.75 } }}>
              <Box sx={{ display: tab === "player" ? "block" : "none" }}>
                <PlayerLookupPanel
                  requestedPlayerName={profileLookupName}
                  requestedPlayerVersion={profileLookupVersion}
                />
              </Box>
              <Box sx={{ display: tab === "team" ? "block" : "none" }}>
                <TeamPlannerPanel isActive={tab === "team"} />
              </Box>
            </Box>
          </Paper>
        </Stack>
      </Container>

      <Snackbar
        open={authToast !== null}
        autoHideDuration={3000}
        onClose={() => setAuthToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {authToast ? <Alert severity={authToast.severity}>{authToast.message}</Alert> : <span />}
      </Snackbar>
    </Box>
  );
}

export default App;
