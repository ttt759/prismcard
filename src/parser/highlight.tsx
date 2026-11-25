import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import type { ReactNode } from 'react';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);

const entities: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};

export function highlight(source: string, language: string): ReactNode {
  if (!language || !hljs.getLanguage(language)) return source;
  const output = hljs.highlight(source, { language, ignoreIllegals: true }).value;
  const root: ReactNode[] = [];
  const stack: { className: string; children: ReactNode[] }[] = [];
  const current = () => stack.at(-1)?.children ?? root;

  // Read only the span markers produced by Highlight.js. Everything else becomes text.
  for (const match of output.matchAll(/<span class="([a-zA-Z0-9_ -]+)">|<\/span>|[^<]+|</g)) {
    if (match[1]) {
      stack.push({ className: match[1], children: [] });
    } else if (match[0] === '</span>' && stack.length) {
      const span = stack.pop()!;
      current().push(<span key={match.index} className={span.className}>{span.children}</span>);
    } else {
      current().push(match[0].replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, entity => entities[entity]));
    }
  }
  return stack.length ? source : root;
}
