const designSystem = {
  colors: {
    primary: '#f43f5e',
    primaryDark: '#be123c',
    success: '#10b981',
    successDark: '#047857',
    caution: '#f59e0b',
    neutral: {
      light: '#f8fafc',
      muted: '#cbd5f5',
      mid: '#64748b',
      dark: '#0f172a',
    },
    text: {
      primary: '#1e293b',
      secondary: '#475569',
      inverse: '#ffffff',
    },
  },
  typography: {
    display: {
      xl: '30px',
      lg: '24px',
    },
    heading: {
      lg: '20px',
      md: '18px',
    },
    body: {
      base: '16px',
      sm: '14px',
    },
    caption: '12px',
    fontFamily: {
      primary: '"Inter", "Plus Jakarta Sans", system-ui, sans-serif',
      display: '"Fraunces", "Inter", serif',
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
