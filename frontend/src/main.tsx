import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import {
  APP_THEME_STORAGE_KEY,
  APP_THEME_PRESETS,
  DEFAULT_APP_THEME_ID,
  getAppThemePreset,
  isAppThemeId,
  type AppThemeId,
} from "./theme";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

function readStoredThemeId(): AppThemeId {
  if (typeof window === "undefined") {
    return DEFAULT_APP_THEME_ID;
  }

  const savedThemeId = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
  if (savedThemeId && isAppThemeId(savedThemeId)) {
    return savedThemeId;
  }

  return DEFAULT_APP_THEME_ID;
}

function RootApp() {
  const [themeId, setThemeId] = useState<AppThemeId>(() => readStoredThemeId());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(APP_THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  const themePreset = useMemo(() => getAppThemePreset(themeId), [themeId]);

  return (
    <ThemeProvider theme={themePreset.theme}>
      <CssBaseline />
      <App
        themeId={themeId}
        themePreset={themePreset}
        themeOptions={APP_THEME_PRESETS}
        onThemeChange={setThemeId}
      />
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RootApp />
    </QueryClientProvider>
  </StrictMode>,
);
