import { demos } from '../demo';
import { readOverrides } from '../settings';
import type { Language, Settings } from '../settings';

export interface Draft {
  markdown: string;
  language: Language;
  splitH2: boolean;
  overrides: Partial<Settings>;
}

const storageKey = 'prismcard.studio.v1';

export function demoDraft(language: Language): Draft {
  return { markdown: demos[language], language, splitH2: false, overrides: {} };
}

export function readDraft(): Draft {
  const browserLanguage = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const fields: unknown = JSON.parse(saved);
      if (typeof fields === 'object' && fields !== null) {
        const data = fields as Record<string, unknown>;
        const language = data.language === 'en' || data.language === 'zh' ? data.language : browserLanguage;
        return {
          language,
          markdown: typeof data.markdown === 'string' ? data.markdown : demos[language],
          splitH2: data.splitH2 === true,
          overrides: readOverrides(data.overrides),
        };
      }
    }
  } catch {
    return demoDraft(browserLanguage);
  }
  return demoDraft(browserLanguage);
}

export function saveDraft(draft: Draft): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
