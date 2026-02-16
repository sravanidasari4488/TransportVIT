export const colors = {
  light: {
    background: '#F5F3FF',
    surface: '#FFFFFF',
    text: '#050505',
    textSecondary: '#6B7280',
    primary: '#3A0CA3', // Obsidian Glow purple
    primaryDark: '#2A0A7A',
    secondary: '#7209B7', // Lighter purple accent
    accent: '#560BAD', // Darker purple
    gradientStart: '#3A0CA3',
    gradientMid: '#2A0A7A', // Intermediate purple
    gradientEnd: '#050505', // Dark grey/black
    gradientOmbre: ['#FFFFFF', '#F5F3FF', '#E9D5FF', '#DDC7FF', '#D1B9FF'], // White ombre
    gradientOmbreHeader: ['#3A0CA3', '#2A0A7A', '#1A0A4A'], // Purple ombre for headers (text visibility)
    gradientOmbreCard: ['#FFFFFF', '#F5F3FF', '#E9D5FF'], // White ombre for cards
    cardBackground: '#FFFFFF',
    cardShadow: 'rgba(58, 12, 163, 0.15)',
    border: '#E9D5FF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    switchTrack: '#E9D5FF',
    switchThumb: '#FFFFFF',
    switchTrackActive: '#3A0CA3',
    shadow: '#000',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    background: '#050505',
    surface: '#0F0F0F',
    text: '#F5F3FF',
    textSecondary: '#A78BFA',
    primary: '#3A0CA3',
    primaryDark: '#2A0A7A',
    secondary: '#7209B7',
    accent: '#560BAD',
    gradientStart: '#3A0CA3',
    gradientMid: '#1A0A4A', // Intermediate dark purple
    gradientEnd: '#050505',
    gradientOmbre: ['#3A0CA3', '#2A0A7A', '#1A0A4A', '#0A0A1A', '#050505'], // Purple to black ombre
    gradientOmbreHeader: ['#3A0CA3', '#2A0A7A', '#1A0A4A', '#0A0A1A', '#050505'], // Purple to black ombre for headers
    gradientOmbreCard: ['#3A0CA3', '#2A0A7A', '#1A0A4A'], // Purple ombre for cards
    cardBackground: '#0F0F0F',
    cardShadow: 'rgba(58, 12, 163, 0.3)',
    border: '#1A1A1A',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    switchTrack: '#1A1A1A',
    switchThumb: '#F5F3FF',
    switchTrackActive: '#3A0CA3',
    shadow: '#000',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
};

// Add this default export at the bottom to fix the warning:
export default function ColorsDummyComponent() {
  return null;
}
