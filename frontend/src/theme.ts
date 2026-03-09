import { createTheme } from "@mui/material";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#006d77",
      light: "#3a8f97",
      dark: "#004f57",
    },
    secondary: {
      main: "#ef6c00",
      light: "#ff9d3f",
      dark: "#b53d00",
    },
    background: {
      default: "#f4f7f8",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: -0.3,
    },
    h6: {
      fontWeight: 700,
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
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});
