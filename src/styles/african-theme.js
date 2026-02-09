// African-inspired color theme
export const africanTheme = {
  colors: {
    // Pan-African colors
    red: '#E74C3C',
    green: '#27AE60',
    yellow: '#F39C12',
    black: '#2C3E50',
    
    // Gradients
    primary: 'linear-gradient(135deg, #E74C3C, #F39C12)',
    secondary: 'linear-gradient(135deg, #27AE60, #F39C12)',
    accent: 'linear-gradient(135deg, #F39C12, #E74C3C)',
    
    // Backgrounds
    mesh: 'radial-gradient(circle at top, rgba(231, 76, 60, 0.08), transparent 55%), radial-gradient(circle at 20% 20%, rgba(243, 156, 18, 0.08), transparent 50%), radial-gradient(circle at 80% 30%, rgba(39, 174, 96, 0.08), transparent 55%), linear-gradient(135deg, #FFF9F5, #F5FFF9)',
  },
  
  // Consistent button styles
  button: {
    primary: 'bg-gradient-to-r from-[#E74C3C] to-[#F39C12] text-white rounded-full font-semibold shadow-lg hover:scale-105 transition-transform',
    secondary: 'bg-white/95 backdrop-blur text-gray-700 rounded-full font-semibold border border-gray-200 shadow-md hover:scale-105 transition-transform',
    icon: 'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all',
  },
  
  // Card styles
  card: 'bg-white/95 backdrop-blur-lg border border-gray-200 rounded-3xl shadow-xl',
  
  // Text sizes (matching LiveRooms)
  text: {
    title: 'text-xl font-bold',
    subtitle: 'text-xs text-gray-500',
    body: 'text-sm',
  },
  
  // Sticky menu height
  menuHeight: '64px',
};
