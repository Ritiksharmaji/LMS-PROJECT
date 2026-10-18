import { Fragment, type ReactNode } from "react";

/** Inline **bold**, *italic* and `code`. Text only — never injects HTML. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={m.index}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={m.index} style={{ font: "500 13px var(--font-mono)", background: "var(--ink-50)", padding: "1px 5px", borderRadius: 5 }}>{t.slice(1, -1)}</code>);
    else out.push(<em key={m.index}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** A small, safe Markdown subset for lesson text: headings, lists, paragraphs and inline emphasis. */
export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="ob-prose">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (/^#{1,3} /.test(block)) {
          const level = block.match(/^#+/)![0].length;
          const content = inline(block.replace(/^#+ /, ""));
          return level === 1 ? <h2 key={i}>{content}</h2> : <h3 key={i} style={{ font: "600 18px/26px var(--font-display)" }}>{content}</h3>;
        }
        if (lines.every((l) => /^[-*] /.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return (
            <ol key={i} style={{ margin: "0 0 14px", paddingLeft: 20 }}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\. /, ""))}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
