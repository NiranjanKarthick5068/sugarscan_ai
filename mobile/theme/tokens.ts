/**
 * SugarScan AI — Design Tokens (Light Lime/Black)
 * Colors sampled directly from the reference UI screenshot.
 * REPLACES the previous dark navy/neon theme entirely.
 */

export const COLORS = {
  // ---- Backgrounds ----
  bgPage:         '#DFFB84', // lime-yellow page bg behind every card
  bgPagePressed:  '#D4F268',
  bgCard:         '#FFFFFF', // primary white content cards
  bgCardAlt:      '#F7F9EE', // faint lime-white card variant
  bgDark:         '#1A1A1A', // black cards (analysis panel, bottom nav)
  bgDarkElevated: '#232323',

  // ---- Lime accent system ----
  lime:         '#A4E903', // primary CTA / accent
  limeHover:    '#B8FF1A',
  limePressed:  '#8FCB02',
  limeSoft:     'rgba(164,233,3,0.15)',
  limeDim:      'rgba(164,233,3,0.08)',
  limeOnDark:   '#C3F53D', // lime on black cards (brighter for contrast)
  neon:         '#A4E903', // alias kept for backward compat during migration

  // ---- Supporting greens ----
  greenApple:   '#7CB342',
  greenLeaf:    '#8BC34A',
  greenDeep:    '#4E7A25',

  // ---- Text ----
  textOnLight:      '#1A1A1A',
  textOnLightSoft:  'rgba(26,26,26,0.65)',
  textOnLightFaint: 'rgba(26,26,26,0.40)',
  textOnDark:       '#FFFFFF',
  textOnDarkSoft:   'rgba(255,255,255,0.70)',
  textOnDarkFaint:  'rgba(255,255,255,0.45)',
  textOnLime:       '#1A1A1A',

  // Aliases for backward compat (screens still using old names)
  textPrimary:   '#1A1A1A',
  textSecondary: 'rgba(26,26,26,0.65)',
  textTertiary:  'rgba(26,26,26,0.40)',
  textLabel:     'rgba(26,26,26,0.35)',
  textGhost:     'rgba(26,26,26,0.20)',

  // ---- Borders / dividers ----
  borderLight:  '#1A1A1A',
  borderDark:   '#1A1A1A',
  divider:      '#1A1A1A',

  // Card glass aliases (kept for components not yet migrated)
  cardGlass:        '#FFFFFF',
  cardGlassHover:   '#F7F9EE',
  cardBorder:       '#1A1A1A',
  cardBorderHover:  '#1A1A1A',
  glassFrost:       'rgba(255,255,255,0.90)',

  // ---- Status ----
  success:    '#A4E903',
  warning:    '#F5A623',
  warningDim: 'rgba(245,166,35,0.12)',
  danger:     '#FF4D4D',
  dangerDim:  'rgba(255,77,77,0.12)',
  info:       '#4E8CFF',
  infoDim:    'rgba(78,140,255,0.12)',
  online:     '#A4E903',

  skeleton: 'rgba(26,26,26,0.06)',
  overlay:  'rgba(26,26,26,0.55)',

  // ---- Legacy dark bg aliases (used in a few screens) ----
  bgDeep:      '#DFFB84', // remapped to page bg so screens don't go dark
  bgPrimary:   '#FFFFFF',
  bgElevated:  '#F7F9EE',
  dark:        '#1A1A1A',
  devicePage:  '#DFFB84',

  // Neon soft for icon bg circles
  neonSoft:   'rgba(164,233,3,0.15)',
  neonDim:    'rgba(164,233,3,0.08)',
  neonMid:    'rgba(164,233,3,0.25)',
  neonStrong: 'rgba(164,233,3,0.40)',
} as const;

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const RADII = {
  sm: 8,
  md: 12,
  card: 22,     // reference cards use large, soft radius
  cardLg: 28,
  button: 9999, // pill buttons
  chip: 14,
  avatar: 9999,
  sheetTop: 28,
} as const;

// React Native shadows tuned for LIGHT backgrounds
export const SHADOWS = {
  cardOnLight: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardOnLightRaised: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  limeButtonGlow: {
    shadowColor: COLORS.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  // Legacy aliases
  elevation1: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  elevation2: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  neonGlow: {
    shadowColor: COLORS.lime,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 6,
  },
  neonGlowStrong: {
    shadowColor: COLORS.lime,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 24,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
} as const;

// LinearGradient props
export const GRADIENTS = {
  screenBg: { colors: [COLORS.bgPage, COLORS.bgPage], locations: [0, 1] as [number, number] },
  limeBadge: { colors: ['#B8FF1A', '#8FCB02'], locations: [0, 1] as [number, number] },
  darkCardTopFade: { colors: ['#232323', '#1A1A1A'], locations: [0, 1] as [number, number] },
  // Legacy aliases
  cardBorder: { colors: ['rgba(164,233,3,0.20)', 'rgba(164,233,3,0.05)', 'rgba(164,233,3,0.10)'], start: {x:0, y:0}, end: {x:1, y:1} },
  neonCta: { colors: ['#B8FF1A', '#8FCB02', '#B8FF1A'], start: {x:0, y:0}, end: {x:1, y:1} },
  dangerBg: { colors: ['rgba(255,77,77,0.15)', 'rgba(255,77,77,0.05)'], start: {x:0, y:0}, end: {x:1, y:1} },
  warningBg: { colors: ['rgba(245,166,35,0.15)', 'rgba(245,166,35,0.05)'], start: {x:0, y:0}, end: {x:1, y:1} },
} as const;

export const TYPE = {
  display:    { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, color: COLORS.textOnLight },
  h1:         { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, color: COLORS.textOnLight },
  h2:         { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, color: COLORS.textOnLight },
  body:       { fontSize: 15, fontWeight: '400' as const, lineHeight: 21, color: COLORS.textOnLightSoft },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, lineHeight: 21, color: COLORS.textOnLight },
  caption:    { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, color: COLORS.textOnLightFaint },
  button:     { fontSize: 15, fontWeight: '700' as const, lineHeight: 20 },
} as const;

export const DURATIONS = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const EASINGS = {
  standard:   [0.4, 0.0, 0.2, 1] as const,
  emphasized: [0.2, 0.0, 0.0, 1] as const,
} as const;

// Legacy timing aliases
export const TIMING = {
  micro:     DURATIONS.fast,
  fast:      DURATIONS.fast,
  standard:  DURATIONS.base,
  smooth:    DURATIONS.slow,
  dramatic:  800,
  breathing: 3000,
  slow:      4000,
} as const;

export function getGlucoseStatusColor(mg: number | null | undefined): string {
  if (mg == null) return COLORS.textOnLightFaint;
  if (mg < 70) return COLORS.danger;
  if (mg > 180) return COLORS.danger;
  if (mg > 140) return COLORS.warning;
  return COLORS.lime;
}
