/**
 * A deliberately small Markdown renderer for journal bodies.
 *
 * Why not a library: every general Markdown renderer passes raw HTML through by
 * default, so rendering a stored body with one means anything typed into the
 * CMS becomes markup on the public site. The authors are trusted staff, but
 * "trusted" is not a security model — it is one compromised login away from
 * being wrong, and the fix would be a sanitiser and a DOM implementation on the
 * server.
 *
 * This escapes everything first and then re-introduces a fixed set of
 * constructs, so there is no path from stored text to executable markup. The
 * subset is what the four real posts actually use, plus the obvious neighbours:
 * headings, paragraphs, bold, italic, inline code, links, bullet and numbered
 * lists, blockquotes and rules.
 *
 * If the journal ever needs tables or embeds, replace this with a real parser
 * *and* a sanitiser. Do not quietly widen the regexes.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline constructs, applied to already-escaped text. */
function inline(s: string): string {
  return (
    s
      // `code`
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // **bold** before *italic*, so ** is not eaten as two emphases
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // [text](href) — http(s) and root-relative only. Anything else, including
      // javascript: and data:, is left as literal text rather than linked.
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]*)\)/g, (_m, text, href) => {
        const external = String(href).startsWith('http');
        const rel = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${href}"${rel}>${text}</a>`;
      })
  );
}

export function renderMarkdown(src: string): string {
  const lines = escapeHtml((src ?? '').replace(/\r\n/g, '\n')).split('\n');
  const out: string[] = [];

  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((i) => `<li>${inline(i)}</li>`).join('');
      out.push(`<${list.type}>${items}</${list.type}>`);
    }
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = Math.min(heading[1].length + 1, 5); // h1 belongs to the page
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      flushAll();
      out.push('<hr />');
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      flushQuote();
      if (list?.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushPara();
      flushQuote();
      if (list?.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    const quoted = trimmed.match(/^&gt;\s?(.*)$/); // '>' is already escaped
    if (quoted) {
      flushPara();
      flushList();
      quote.push(quoted[1]);
      continue;
    }

    flushList();
    flushQuote();
    para.push(trimmed);
  }

  flushAll();
  return out.join('\n');
}
