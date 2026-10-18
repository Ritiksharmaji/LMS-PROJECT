import React from 'react';
import { Text, View } from 'react-native';

import { fonts } from '../theme/palette';
import { usePalette } from '../theme/ThemeProvider';
import { T } from './ui';

/** Renders the small Markdown subset lessons use: headings, paragraphs, bullet/numbered lists, **bold**, `code`. */
export function Markdown({ source }: { source: string }) {
  const p = usePalette();
  const inline = (s: string, key: string) =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
      part.startsWith('**') ? (
        <Text key={key + i} style={{ fontFamily: fonts.bold, color: p.text }}>
          {part.slice(2, -2)}
        </Text>
      ) : part.startsWith('`') ? (
        <Text
          key={key + i}
          style={{
            fontFamily: 'Menlo',
            fontSize: 13,
            color: p.accentText,
            backgroundColor: p.sunken,
          }}
        >
          {part.slice(1, -1)}
        </Text>
      ) : (
        part
      ),
    );
  const blocks = source.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <View style={{ gap: 12 }}>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        const h = /^(#{1,3})\s+(.*)/.exec(lines[0]);
        if (h && lines.length === 1)
          return (
            <T
              key={i}
              v={h[1].length === 1 ? 'h1' : h[1].length === 2 ? 'h2' : 'h3'}
              style={{ marginTop: 6 }}
            >
              {h[2]}
            </T>
          );
        if (lines.every(l => /^\s*([-*]|\d+\.)\s+/.test(l)))
          return (
            <View key={i} style={{ gap: 6 }}>
              {lines.map((l, j) => {
                const m = /^\s*([-*]|\d+\.)\s+(.*)/.exec(l)!;
                return (
                  <View key={j} style={{ flexDirection: 'row', gap: 8 }}>
                    <T color={p.accent} style={{ width: 18 }}>
                      {/\d/.test(m[1]) ? m[1] : '•'}
                    </T>
                    <T style={{ flex: 1 }}>{inline(m[2], `${i}-${j}-`)}</T>
                  </View>
                );
              })}
            </View>
          );
        return (
          <T key={i} style={{ lineHeight: 24 }}>
            {inline(lines.join(' '), `${i}-`)}
          </T>
        );
      })}
    </View>
  );
}
