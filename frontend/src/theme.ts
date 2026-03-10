import {
  createTheme,
  type PaletteMode,
  type Theme,
  type ThemeOptions,
} from "@mui/material/styles";

export type AppThemeId =
  | "lagoon-light"
  | "github-light"
  | "slack-light"
  | "kog-dark"
  | "github-dark"
  | "dracula-dark"
  | "nord-dark"
  | "midnight-dark";

export type AppThemePreset = {
  id: AppThemeId;
  name: string;
  inspiration: string;
  mode: PaletteMode;
  gradient: string;
  theme: Theme;
};

type ThemePresetConfig = Omit<AppThemePreset, "theme"> & {
  palette: NonNullable<ThemeOptions["palette"]>;
};

const SHARED_THEME_OPTIONS: ThemeOptions = {
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: -0.3,
      lineHeight: 1.2,
    },
    h6: {
      fontWeight: 700,
      lineHeight: 1.3,
    },
    body1: {
      lineHeight: 1.45,
    },
    body2: {
      lineHeight: 1.45,
    },
    caption: {
      lineHeight: 1.35,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        size: "small",
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 9,
          lineHeight: 1.25,
        },
        sizeSmall: {
          minHeight: 32,
          padding: "6px 12px",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          padding: "6px 12px",
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.3,
          textTransform: "none",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
        },
        indicator: {
          height: 2,
        },
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: "small",
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiChip: {
      defaultProps: {
        size: "small",
      },
      styleOverrides: {
        root: {
          fontWeight: 600,
          lineHeight: 1.2,
          borderRadius: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: 12,
          lineHeight: 1.35,
          paddingTop: 8,
          paddingBottom: 8,
        },
        body: {
          lineHeight: 1.4,
          paddingTop: 7,
          paddingBottom: 7,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        message: {
          lineHeight: 1.4,
          paddingTop: 6,
          paddingBottom: 6,
        },
      },
    },
  },
};

const THEME_PRESET_CONFIGS: readonly ThemePresetConfig[] = [
  {
    id: "lagoon-light",
    name: "Lagoon Light",
    inspiration: "Airtable + Stripe",
    mode: "light",
    gradient:
      "linear-gradient(124deg, rgba(0, 109, 119, 0.12) 0%, rgba(0, 109, 119, 0) 42%), linear-gradient(304deg, rgba(239, 108, 0, 0.12) 0%, rgba(239, 108, 0, 0) 38%), repeating-linear-gradient(-24deg, rgba(255, 255, 255, 0.5) 0 13px, rgba(255, 255, 255, 0) 13px 30px), linear-gradient(180deg, #f7faf9 0%, #f2f4f8 100%)",
    palette: {
      mode: "light",
      primary: {
        main: "#006d77",
      },
      secondary: {
        main: "#ef6c00",
      },
      background: {
        default: "#f4f7f8",
        paper: "#ffffff",
      },
      text: {
        primary: "#122b31",
        secondary: "#49616b",
      },
      divider: "#d4dde2",
    },
  },
  {
    id: "github-light",
    name: "GitHub Light",
    inspiration: "GitHub",
    mode: "light",
    gradient:
      "repeating-linear-gradient(0deg, rgba(208, 215, 222, 0.36) 0 1px, rgba(0, 0, 0, 0) 1px 38px), repeating-linear-gradient(90deg, rgba(208, 215, 222, 0.36) 0 1px, rgba(0, 0, 0, 0) 1px 38px), radial-gradient(circle at 88% -2%, rgba(9, 105, 218, 0.14), rgba(9, 105, 218, 0) 38%), linear-gradient(180deg, #f8faff 0%, #f3f5f8 100%)",
    palette: {
      mode: "light",
      primary: {
        main: "#0969da",
      },
      secondary: {
        main: "#8250df",
      },
      background: {
        default: "#f6f8fa",
        paper: "#ffffff",
      },
      text: {
        primary: "#1f2328",
        secondary: "#59636e",
      },
      divider: "#d0d7de",
    },
  },
  {
    id: "slack-light",
    name: "Slack Light",
    inspiration: "Slack",
    mode: "light",
    gradient:
      "radial-gradient(120% 95% at 0% -5%, rgba(97, 31, 105, 0.18) 0%, rgba(97, 31, 105, 0) 55%), radial-gradient(95% 90% at 100% 8%, rgba(46, 182, 125, 0.17) 0%, rgba(46, 182, 125, 0) 52%), radial-gradient(75% 75% at 50% 105%, rgba(54, 197, 240, 0.13) 0%, rgba(54, 197, 240, 0) 56%), linear-gradient(180deg, #fbf8ff 0%, #f7f5fb 100%)",
    palette: {
      mode: "light",
      primary: {
        main: "#611f69",
      },
      secondary: {
        main: "#2eb67d",
      },
      background: {
        default: "#f8f6fb",
        paper: "#ffffff",
      },
      text: {
        primary: "#2b1b32",
        secondary: "#5f4b67",
      },
      divider: "#e4dced",
    },
  },
  {
    id: "kog-dark",
    name: "KoG Dark",
    inspiration: "web.dev.kog.tw",
    mode: "dark",
    gradient:
      "linear-gradient(180deg, #111827 0%, #0f172a 100%)",
    palette: {
      mode: "dark",
      primary: {
        main: "#ff5a1f",
      },
      secondary: {
        main: "#ed784f",
      },
      background: {
        default: "#111827",
        paper: "#0e1420",
      },
      text: {
        primary: "#f8fafc",
        secondary: "#94a3b8",
      },
      divider: "#1e293b",
    },
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    inspiration: "GitHub",
    mode: "dark",
    gradient:
      "radial-gradient(130% 90% at 0% -8%, rgba(56, 139, 253, 0.24) 0%, rgba(56, 139, 253, 0) 52%), radial-gradient(95% 80% at 100% -6%, rgba(163, 113, 247, 0.2) 0%, rgba(163, 113, 247, 0) 48%), repeating-radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.06) 0 1px, rgba(0, 0, 0, 0) 1px 26px), linear-gradient(180deg, #0b1017 0%, #0d1117 100%)",
    palette: {
      mode: "dark",
      primary: {
        main: "#58a6ff",
      },
      secondary: {
        main: "#a371f7",
      },
      background: {
        default: "#0d1117",
        paper: "#161b22",
      },
      text: {
        primary: "#c9d1d9",
        secondary: "#8b949e",
      },
      divider: "#30363d",
    },
  },
  {
    id: "dracula-dark",
    name: "Dracula Dark",
    inspiration: "Dracula",
    mode: "dark",
    gradient:
      "radial-gradient(92% 84% at 0% -2%, rgba(189, 147, 249, 0.3) 0%, rgba(189, 147, 249, 0) 56%), radial-gradient(82% 74% at 100% 0%, rgba(255, 121, 198, 0.24) 0%, rgba(255, 121, 198, 0) 52%), linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 44%), linear-gradient(180deg, #242632 0%, #282a36 100%)",
    palette: {
      mode: "dark",
      primary: {
        main: "#bd93f9",
      },
      secondary: {
        main: "#ff79c6",
      },
      background: {
        default: "#282a36",
        paper: "#343746",
      },
      text: {
        primary: "#f8f8f2",
        secondary: "#b8bfd8",
      },
      divider: "#44475a",
    },
  },
  {
    id: "nord-dark",
    name: "Nord Dark",
    inspiration: "Nord / JetBrains",
    mode: "dark",
    gradient:
      "repeating-linear-gradient(0deg, rgba(216, 222, 233, 0.06) 0 1px, rgba(0, 0, 0, 0) 1px 32px), repeating-linear-gradient(90deg, rgba(216, 222, 233, 0.05) 0 1px, rgba(0, 0, 0, 0) 1px 32px), radial-gradient(120% 90% at 0% -5%, rgba(136, 192, 208, 0.24) 0%, rgba(136, 192, 208, 0) 46%), linear-gradient(180deg, #28303d 0%, #2e3440 100%)",
    palette: {
      mode: "dark",
      primary: {
        main: "#88c0d0",
      },
      secondary: {
        main: "#a3be8c",
      },
      background: {
        default: "#2e3440",
        paper: "#3b4252",
      },
      text: {
        primary: "#eceff4",
        secondary: "#d8dee9",
      },
      divider: "#4c566a",
    },
  },
  {
    id: "midnight-dark",
    name: "Midnight Dark",
    inspiration: "Linear + Vercel",
    mode: "dark",
    gradient:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 42%), radial-gradient(130% 80% at 50% -20%, rgba(124, 141, 255, 0.25) 0%, rgba(124, 141, 255, 0) 48%), radial-gradient(75% 68% at 100% 0%, rgba(44, 212, 191, 0.18) 0%, rgba(44, 212, 191, 0) 46%), linear-gradient(180deg, #0b0d16 0%, #111320 100%)",
    palette: {
      mode: "dark",
      primary: {
        main: "#7c8dff",
      },
      secondary: {
        main: "#2cd4bf",
      },
      background: {
        default: "#111320",
        paper: "#181c2d",
      },
      text: {
        primary: "#e7ecff",
        secondary: "#a9b3d9",
      },
      divider: "#2b3555",
    },
  },
];

export const APP_THEME_PRESETS: readonly AppThemePreset[] = THEME_PRESET_CONFIGS.map(
  ({ palette, ...preset }) => ({
    ...preset,
    theme: createTheme({
      ...SHARED_THEME_OPTIONS,
      palette,
    }),
  }),
);

const APP_THEME_BY_ID = new Map(APP_THEME_PRESETS.map((preset) => [preset.id, preset]));

export const APP_THEME_STORAGE_KEY = "kog-app-theme";
export const DEFAULT_APP_THEME_ID: AppThemeId = "lagoon-light";

export function isAppThemeId(value: string): value is AppThemeId {
  return APP_THEME_BY_ID.has(value as AppThemeId);
}

export function getAppThemePreset(themeId?: string | null): AppThemePreset {
  const fallback = APP_THEME_BY_ID.get(DEFAULT_APP_THEME_ID);
  if (!fallback) {
    throw new Error("Default app theme preset is not configured");
  }

  if (!themeId || !isAppThemeId(themeId)) {
    return fallback;
  }

  return APP_THEME_BY_ID.get(themeId) ?? fallback;
}
