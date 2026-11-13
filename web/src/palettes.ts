import type { Palette } from './types';

// The colour schemes a visitor can choose instead of the one the server is
// configured with. Each is a pair, one palette for the light mode and one
// for the dark. In the order they are offered.
export const SCHEMES = ['ocean', 'forest', 'sunset', 'rose', 'slate', 'sand', 'lavender', 'mint', 'ember', 'mono'] as const;
export type Scheme = (typeof SCHEMES)[number];
// 'default' is the pair of palettes from the server.
export type ColorScheme = 'default' | Scheme;

const palette = (
  bodyBgColor: string,
  bodyColor: string,
  emphasisColor: string,
  textPrimaryColor: string,
  textAccentColor: string,
): Palette => ({ bodyBgColor, bodyColor, emphasisColor, textPrimaryColor, textAccentColor });

// Background, muted text, text, primary, accent. palettes.test.ts holds every
// one of them to a contrast against its background.
export const PALETTES: Record<Scheme, { light: Palette; dark: Palette }> = {
  ocean: {
    light: palette('#F2F7FB', '#52606D', '#0B1F33', '#0B5C8A', '#0A6E7C'),
    dark: palette('#0F1B2A', '#8FA3B8', '#E6F1FA', '#6CB8F0', '#4FD1C5'),
  },
  forest: {
    light: palette('#F3F7F1', '#55624F', '#14261A', '#2B6A3C', '#7A5A12'),
    dark: palette('#121C15', '#93A68F', '#E7F2E6', '#7CCF8C', '#E0B85A'),
  },
  sunset: {
    light: palette('#FFF6EE', '#6B5648', '#2B160C', '#B5431A', '#9A2D5E'),
    dark: palette('#21141A', '#B59C9C', '#FCEDE4', '#FF9E6B', '#F07AA8'),
  },
  rose: {
    light: palette('#FDF4F6', '#6A545B', '#2D1219', '#A8324F', '#7A4A8C'),
    dark: palette('#22141A', '#B397A1', '#FBE9EE', '#F58CA6', '#C9A0E8'),
  },
  slate: {
    light: palette('#F4F5F7', '#565D68', '#14181F', '#3A4D6B', '#2F6F8F'),
    dark: palette('#1A1D23', '#959DAA', '#ECEFF4', '#9DB4D6', '#7FC4DE'),
  },
  sand: {
    light: palette('#FAF6EC', '#655C48', '#2A2416', '#7A5A1E', '#A14A22'),
    dark: palette('#1F1B14', '#A89F8A', '#F3ECDC', '#E2C27A', '#E8956A'),
  },
  lavender: {
    light: palette('#F7F4FC', '#5D5670', '#1D1630', '#5B3FA8', '#8A3A8F'),
    dark: palette('#1A1626', '#A199B8', '#EFEAFA', '#B49CF5', '#E08FE0'),
  },
  mint: {
    light: palette('#F1FAF7', '#4F635D', '#0F2620', '#0F6B57', '#2B5F9A'),
    dark: palette('#0F1F1C', '#8FAAA2', '#E3F5F0', '#5EDDB8', '#7FB5F0'),
  },
  ember: {
    light: palette('#FBF4F1', '#6A5550', '#2A1310', '#A5301F', '#8A5A0C'),
    dark: palette('#1E1413', '#B09A95', '#FAEAE6', '#FF8A70', '#F0B455'),
  },
  mono: {
    light: palette('#FFFFFF', '#555555', '#111111', '#1A1A1A', '#5A5A5A'),
    dark: palette('#121212', '#A0A0A0', '#F2F2F2', '#FFFFFF', '#C8C8C8'),
  },
};
