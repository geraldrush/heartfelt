const designSystem = {
  colors: {
    primary: '#ff6b6b',
    primaryDark: '#e54949',
    success: '#1fbf8f',
    successDark: '#12956c',
    caution: '#ffb347',
    neutral: {
      light: '#f6f4f2',
      muted: '#d4dde9',
      mid: '#4b5563',
      dark: '#121826',
    },
    text: {
      primary: '#121826',
      secondary: '#4b5563',
      inverse: '#ffffff',
    },
  },
  typography: {
    display: {
      xl: '32px',
      lg: '26px',
    },
    heading: {
      lg: '22px',
      md: '18px',
    },
    body: {
      base: '16px',
      sm: '15px',
    },
    caption: '12px',
    fontFamily: {
      primary: '"Manrope", system-ui, sans-serif',
      display: '"Outfit", "Manrope", sans-serif',
    },
  },
  spacing: {
    xxs: '4px',
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  shadow: {
    sm: '0 1px 3px rgba(15, 23, 42, 0.08)',
    md: '0 10px 25px rgba(15, 23, 42, 0.1)',
    lg: '0 20px 45px rgba(15, 23, 42, 0.12)',
    xl: '0 25px 55px rgba(15, 23, 42, 0.14)',
  },
  transitions: {
    fast: '150ms ease',
    normal: '300ms ease',
    slow: '500ms ease',
  },
};

export default designSystem;
