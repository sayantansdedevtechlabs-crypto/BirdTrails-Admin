import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#1B4332', // Conservation Green
      light: '#2D6A4F',
      dark: '#081C15',
    },
    background: {
      default: '#F4F7F6', // Soft gray for the whole app
      paper: '#FFFFFF',   // White for cards
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none', // Stops MUI from making buttons ALL CAPS
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
});