import { createElement, Fragment } from 'react';
import type { ReactNode } from 'react';
import type Token from 'markdown-it/lib/token.mjs';
import { highlight } from './highlight';

interface Node {
  token: Token;
  children: Node[];
}

function toTree(tokens: Token[]): Node[] {
  const root: Node[] = [];
  const stack = [root];
  for (const token of tokens) {
    if (token.nesting === -1) {
      stack.pop();
      continue;
    }
    const children = token.children ? toTree(token.children) : [];
    stack.at(-1)!.push({ token, children });
    if (token.nesting === 1) stack.push(children);
  }
  return root;
}

const elements = {
  paragraph_open: 'p',
  blockquote_open: 'blockquote',
  bullet_list_open: 'ul',
  ordered_list_open: 'ol',
  table_open: 'table',
  thead_open: 'thead',
  tbody_open: 'tbody',
  tr_open: 'tr',
  th_open: 'th',
  td_open: 'td',
  strong_open: 'strong',
  em_open: 'em',
  s_open: 's',
  mark_open: 'mark',
} as const;

const taskPrefix = /^\[([xX ])\][ \t]+/;

function renderListItem(children: Node[], key: number) {
  const paragraph = children[0];
  const inline = paragraph?.children[0];
  const first = inline?.children[0];
  const task = first?.token.type === 'text' && first.token.content.match(taskPrefix);
  if (!task) return <li key={key}>{renderNodes(children)}</li>;

  const checked = task[1] !== ' ';
  return (
    <li key={key} className="md-task">
      <span className="md-task-check" data-checked={checked} role="checkbox" aria-checked={checked} aria-disabled="true">
        {checked ? '✓' : ''}
      </span>
      <div>
        <p>{first.token.content.slice(task[0].length)}{renderNodes(inline.children.slice(1))}</p>
        {renderNodes(children.slice(1))}
      </div>
    </li>
  );
}

function renderNodes(nodes: Node[]): ReactNode {
  return nodes.map(({ token, children }, key) => {
    switch (token.type) {
      case 'inline':
        return <Fragment key={key}>{renderNodes(children)}</Fragment>;
      case 'text':
        return token.content;
      case 'softbreak':
        return ' ';
      case 'hardbreak':
        return <br key={key} />;
      case 'hr':
        return <hr key={key} />;
      case 'heading_open': {
        const level = Number(token.tag.slice(1));
        return createElement(`h${level >= 1 && level <= 6 ? level : 3}`, { key }, renderNodes(children));
      }
      case 'list_item_open':
        return renderListItem(children, key);
      case 'link_open':
        return <span key={key} className="md-link">{renderNodes(children)}</span>;
      case 'image':
        return <span key={key} className="md-image-label">{renderNodes(children)}</span>;
      case 'code_inline':
        return <code key={key}>{token.content}</code>;
      case 'code_block':
      case 'fence': {
        const language = token.info.trim().split(/\s+/)[0].toLowerCase();
        return (
          <figure key={key} className="md-code">
            <figcaption>
              <span className="code-chrome" aria-hidden="true"><i /><i /><i /></span>
              <span>{language || 'text'}</span>
            </figcaption>
            <pre><code>{highlight(token.content.replace(/\n$/, ''), language)}</code></pre>
          </figure>
        );
      }
      default:
        if (!Object.hasOwn(elements, token.type)) return token.content;
        break;
    }

    const element = elements[token.type as keyof typeof elements];
    const props = { key, start: undefined as number | undefined, style: undefined as { textAlign: 'left' | 'right' | 'center' } | undefined };
    if (element === 'ol') props.start = Number(token.attrGet('start') ?? '1');
    if (element === 'th' || element === 'td') {
      const align = token.attrGet('style')?.split(':')[1];
      if (align === 'left' || align === 'right' || align === 'center') props.style = { textAlign: align };
    }
    if (element === 'p' && token.hidden) return <Fragment key={key}>{renderNodes(children)}</Fragment>;
    return createElement(element, props, renderNodes(children));
  });
}

export function MarkdownContent({ tokens }: { tokens: Token[] }) {
  return <>{renderNodes(toTree(tokens))}</>;
}
