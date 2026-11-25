import { SlidersHorizontal } from 'lucide-react';
import { densities, ratios, themes } from '../settings';
import type { Language, Ratio, Settings } from '../settings';
import { copy, themeNames } from './copy';

interface Props {
  settings: Settings;
  language: Language;
  splitH2: boolean;
  onSplit: (checked: boolean) => void;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export function Switch({ name, value, onChange }: { name: string; value: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="switch-row">
      <span>{name}</span>
      <span className="switch">
        <input type="checkbox" role="switch" checked={value} onChange={event => onChange(event.target.checked)} />
        <span className="switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}

export function DesignPanel({ settings, language, onChange, splitH2, onSplit }: Props) {
  const t = copy[language];
  return (
    <aside className="studio-panel design-panel" aria-labelledby="design-title">
      <div className="panel-heading">
        <h2 id="design-title"><SlidersHorizontal size={17} /> {t.design}</h2>
      </div>
      <div className="design-controls">
        <fieldset className="design-section">
          <legend>{t.theme}</legend>
          <div className="theme-grid">
            {themes.map(theme => (
              <button className="theme-option" key={theme} type="button" aria-pressed={settings.theme === theme}
                onClick={() => onChange('theme', theme)}>
                <span className={`theme-sample sample-${theme}`} aria-hidden="true"><i /><b /><b /><em /></span>
                <span>{themeNames[language][theme]}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="design-section">
          <legend>{t.layout}</legend>
          <div className="field-label" id="ratio-label">{t.ratio}</div>
          <div className="segments ratio-control" role="group" aria-labelledby="ratio-label">
            {(Object.keys(ratios) as Ratio[]).map(ratio => (
              <button key={ratio} type="button" aria-pressed={settings.ratio === ratio} onClick={() => onChange('ratio', ratio)}>
                <span className={`ratio-icon ratio-${ratio.replace(':', '-')}`} aria-hidden="true" />
                {ratio === 'auto' ? t.auto : ratio}
              </button>
            ))}
          </div>
          <label className="size-control">
            <span className="field-label">{t.fontSize} <output>{settings.scale}%</output></span>
            <input aria-label={t.scale} type="range" min="85" max="120" value={settings.scale}
              style={{ backgroundSize: `${(settings.scale - 85) / 35 * 100}% 100%` }}
              onChange={event => onChange('scale', Number(event.target.value))} />
          </label>
          <div className="field-label" id="padding-label">{t.padding}</div>
          <div className="segments" role="group" aria-labelledby="padding-label">
            {densities.map(density => (
              <button type="button" key={density} aria-pressed={settings.density === density}
                onClick={() => onChange('density', density)}>{t[density]}</button>
            ))}
          </div>
        </fieldset>
        <fieldset className="design-section details-section">
          <legend>{t.cardDetails}</legend>
          <label className="text-setting">
            <span className="field-label">{t.author}</span>
            <input type="text" value={settings.author} placeholder={t.authorPlaceholder}
              onChange={event => onChange('author', event.target.value)} />
          </label>
          <label className="text-setting">
            <span className="field-label">{t.tag}</span>
            <input type="text" value={settings.tag} placeholder={t.tagPlaceholder}
              onChange={event => onChange('tag', event.target.value)} />
          </label>
          <Switch name={t.counter} value={settings.counter} onChange={value => onChange('counter', value)} />
          <Switch name={t.watermark} value={settings.watermark} onChange={value => onChange('watermark', value)} />
        </fieldset>
        <div className="design-section split-section">
          <Switch name={t.split} value={splitH2} onChange={onSplit} />
          <p>{t.splitHint}</p>
        </div>
      </div>
    </aside>
  );
}
