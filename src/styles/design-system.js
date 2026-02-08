const designSystem = {
  colors: {
    primary: '#C55A4B',
    primaryDark: '#A7473B',
    success: '#1F8A70',
    successDark: '#156D58',
    caution: '#E6A04E',
    neutral: {
      light: '#F8F4F0',
      muted: '#E9DED3',
      mid: '#5B5B5B',
      dark: '#1F1F1F',
    },
    text: {
      primary: '#1F1F1F',
      secondary: '#5B5B5B',
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
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
  },
  shadow: {
    sm: '0 2px 6px rgba(31, 31, 31, 0.08)',
    md: '0 12px 28px rgba(31, 31, 31, 0.12)',
    lg: '0 22px 46px rgba(31, 31, 31, 0.14)',
    xl: '0 28px 60px rgba(31, 31, 31, 0.16)',
  },
  transitions: {
    fast: '150ms ease',
    normal: '300ms ease',
    slow: '500ms ease',
  },
};

export default designSystem;
