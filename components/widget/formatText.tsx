/**
 * formatWhatsAppText — render WhatsApp inline markers as React nodes.
 *
 * Bot replies are emitted by the shared LLM pipeline (which targets the
 * WhatsApp channel as well), so they arrive with WhatsApp's syntax:
 *   *bold*       → <strong>
 *   _italic_     → <em>
 *   ~strike~     → <s>
 *   `mono`       → <code>
 *
 * WhatsApp's matching rules (the parts that matter for chat UX):
 *   - The opening marker must be at start-of-string OR preceded by a
 *     whitespace / punctuation flanking character. Prevents mid-word
 *     matches like "2*3=6" rendering "*3=6*" as bold.
 *   - Likewise for the closing marker on the right side.
 *   - Inner content must not start or end with whitespace.
 *   - Markers do not nest (mirroring WhatsApp's behavior).
 *
 * Implementation: a single regex with lookbehind/lookahead for flanks +
 * lazy match for the inner content. Process iteratively, emitting plain
 * text segments and styled React elements as siblings. No
 * `dangerouslySetInnerHTML` anywhere — the LLM output already passes
 * through `sanitize.py` server-side, and we avoid the XSS surface here
 * regardless.
 *
 * Newlines are preserved by the bubble's `whitespace-pre-wrap` style.
 * Lists (LLM frequently outputs "1. item") render fine as plain text,
 * so no special list grouping in v1.
 */

import type { ReactNode } from "react";

// Flank characters that may precede an opening marker or follow a closing
// marker. Whitespace + common punctuation. Includes the em/en dashes the
// LLM occasionally emits in Portuguese list intros ("— Pizza Margherita").
const FLANK = String.raw`[\s.,;:!?()\[\]{}'"—–\-]`;

// The combined matcher. The outer non-capturing group `(?:^|(?<=${FLANK}))`
// allows either start-of-string OR a preceding flank char. Lazy `[^\n]+?`
// keeps matches as small as possible and prevents bold spanning two
// paragraphs. The trailing lookahead mirrors the leading flank rule.
//
// We use backtick via `\x60` inside the character class because the
// string itself is a raw string for clarity, and `\`` would terminate the
// template literal interpretation if we ever switched to one.
const MARKUP_PATTERN = new RegExp(
  String.raw`(?:^|(?<=${FLANK}))([*_~\x60])(?=\S)([^\n]+?)(?<=\S)\1(?=$|${FLANK})`,
  "g",
);

function wrapMarker(marker: string, inner: string, key: string): ReactNode {
  switch (marker) {
    case "*":
      return <strong key={key}>{inner}</strong>;
    case "_":
      return <em key={key}>{inner}</em>;
    case "~":
      return <s key={key}>{inner}</s>;
    case "`":
      return (
        <code
          key={key}
          className="rounded bg-gray-100 px-1 font-mono text-[0.9em]"
        >
          {inner}
        </code>
      );
    default:
      return inner;
  }
}

export function formatWhatsAppText(text: string): ReactNode[] {
  if (!text) return [];

  const out: ReactNode[] = [];
  let lastIndex = 0;
  let matchIdx = 0;

  // `matchAll` would be simpler, but `exec` with a stateful regex lets
  // us advance past matches we reject (when the lazy match swallowed an
  // identical marker, which would imply nesting we don't support).
  const re = new RegExp(MARKUP_PATTERN.source, MARKUP_PATTERN.flags);

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const [full, marker, inner] = m;

    // Defensive: lazy matching shouldn't produce inner containing the
    // same marker, but JS regex lazy semantics can surprise. Skip
    // ambiguous matches so we don't render half-broken markup.
    if (inner.includes(marker)) {
      // Advance past this candidate's opening marker so we don't loop
      // forever on the same position.
      re.lastIndex = m.index + 1;
      continue;
    }

    if (m.index > lastIndex) {
      out.push(text.slice(lastIndex, m.index));
    }
    out.push(wrapMarker(marker, inner, `fmt-${matchIdx++}`));
    lastIndex = m.index + full.length;
  }

  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex));
  }

  // Empty input handled above; non-empty input always yields at least
  // one segment. Returning the bare text avoids a useless wrapper array
  // for the common "no formatting" case.
  return out.length > 0 ? out : [text];
}
