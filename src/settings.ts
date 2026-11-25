export const themes = ['editorial', 'swiss', 'cyber', 'brutal', 'aurora', 'craft'] as const;
export const ratios = {
  '3:4': { width: 540, height: 720 },
  '1:1': { width: 540, height: 540 },
  '16:9': { width: 800, height: 450 },
  auto: { width: 540, height: null },
} as const;
export const densities = ['compact', 'balanced', 'airy'] as const;
export const languages = ['en', 'zh'] as const;

export type Theme = (typeof themes)[number];
export type Ratio = keyof typeof ratios;
export type Density = (typeof densities)[number];
export type Language = (typeof languages)[number];

export interface Metadata {
  title?: string;
  author?: string;
  tag?: string;
  theme?: Theme;
}

export interface Settings {
  theme: Theme;
  ratio: Ratio;
  density: Density;
  scale: number;
  author: string;
  tag: string;
  counter: boolean;
  watermark: boolean;
}

export const defaultSettings: Settings = {
  theme: 'editorial',
  ratio: '3:4',
  density: 'balanced',
  scale: 100,
  author: '',
  tag: '',
  counter: true,
  watermark: true,
};

export function isTheme(value: unknown): value is Theme {
  return themes.some(theme => theme === value);
}

export function resolveSettings(metadata: Metadata, overrides: Partial<Settings>): Settings {
  return {
    ...defaultSettings,
    theme: overrides.theme ?? metadata.theme ?? defaultSettings.theme,
    ratio: overrides.ratio ?? defaultSettings.ratio,
    density: overrides.density ?? defaultSettings.density,
    scale: overrides.scale ?? defaultSettings.scale,
    author: overrides.author ?? metadata.author ?? defaultSettings.author,
    tag: overrides.tag ?? metadata.tag ?? defaultSettings.tag,
    counter: overrides.counter ?? defaultSettings.counter,
    watermark: overrides.watermark ?? defaultSettings.watermark,
  };
}

export function readOverrides(value: unknown): Partial<Settings> {
  if (typeof value !== 'object' || value === null) return {};
  const fields = value as Record<string, unknown>;
  const valid: Partial<Settings> = {};
  if (isTheme(fields.theme)) valid.theme = fields.theme;
  if (fields.ratio === '3:4' || fields.ratio === '1:1' || fields.ratio === '16:9' || fields.ratio === 'auto') valid.ratio = fields.ratio;
  if (fields.density === 'compact' || fields.density === 'balanced' || fields.density === 'airy') valid.density = fields.density;
  if (typeof fields.scale === 'number' && fields.scale >= 85 && fields.scale <= 120) valid.scale = fields.scale;
  if (typeof fields.author === 'string') valid.author = fields.author;
  if (typeof fields.tag === 'string') valid.tag = fields.tag;
  if (typeof fields.counter === 'boolean') valid.counter = fields.counter;
  if (typeof fields.watermark === 'boolean') valid.watermark = fields.watermark;
  return valid;
}
