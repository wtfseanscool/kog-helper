import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import {
  DEFAULT_APP_THEME_ID,
  getAppThemePreset,
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

function RootApp() {
  const themePreset = useMemo(() => getAppThemePreset(DEFAULT_APP_THEME_ID), []);

  return (
    <ThemeProvider theme={themePreset.theme}>
      <CssBaseline />
      <App themePreset={themePreset} />
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
