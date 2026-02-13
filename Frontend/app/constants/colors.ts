export const colors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    primary: '#3366FF',
    border: '#E2E8F0',
    switchTrack: '#D1D5DB',
    switchThumb: '#F3F4F6',
    switchTrackActive: '#93C5FD',
    shadow: '#000',
  },
  dark: {
    background: '#00050d',
    surface: '#00050d',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    primary: '#60A5FA',
    border: '#475569',
    switchTrack: '#475569',
    switchThumb: '#CBD5E1',
    switchTrackActive: '#2563EB',
    shadow: '#000',
  },
};

// Add this default export at the bottom to fix the warning:
export default function ColorsDummyComponent() {
  return null;
}
