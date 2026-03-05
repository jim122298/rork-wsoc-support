import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Linking,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface HtmlNode {
  type: 'text' | 'element';
  tag?: string;
  text?: string;
  attrs?: Record<string, string>;
  children?: HtmlNode[];
}

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w[\w-]*)=["']([^"']*?)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function parseHtml(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  let pos = 0;

  while (pos < html.length) {
    const tagStart = html.indexOf('<', pos);
    if (tagStart === -1) {
      const text = html.slice(pos).trim();
      if (text) nodes.push({ type: 'text', text: decodeEntities(text) });
      break;
    }

    if (tagStart > pos) {
      const text = html.slice(pos, tagStart).trim();
      if (text) nodes.push({ type: 'text', text: decodeEntities(text) });
    }

    const tagEnd = html.indexOf('>', tagStart);
    if (tagEnd === -1) break;

    const tagContent = html.slice(tagStart + 1, tagEnd);

    if (tagContent.startsWith('/')) {
      pos = tagEnd + 1;
      continue;
    }

    const selfClosing = tagContent.endsWith('/') || /^(img|br|hr|input)\b/i.test(tagContent);
    const spaceIdx = tagContent.indexOf(' ');
    const tagName = (spaceIdx === -1
      ? tagContent.replace('/', '')
      : tagContent.slice(0, spaceIdx)
    ).toLowerCase();
    const attrStr = spaceIdx === -1 ? '' : tagContent.slice(spaceIdx);
    const attrs = parseAttrs(attrStr);

    if (selfClosing) {
      nodes.push({ type: 'element', tag: tagName, attrs, children: [] });
      pos = tagEnd + 1;
      continue;
    }

    const closeTag = `</${tagName}>`;
    const closeIdx = html.toLowerCase().indexOf(closeTag, tagEnd + 1);
    if (closeIdx === -1) {
      nodes.push({ type: 'element', tag: tagName, attrs, children: [] });
      pos = tagEnd + 1;
      continue;
    }

    const innerHtml = html.slice(tagEnd + 1, closeIdx);
    const children = parseHtml(innerHtml);
    nodes.push({ type: 'element', tag: tagName, attrs, children });
    pos = closeIdx + closeTag.length;
  }

  return nodes;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function RemoteImage({ src, alt, maxWidth }: { src: string; alt?: string; maxWidth: number }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const onLoad = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.source || {};
    if (width && height) {
      const ratio = Math.min(maxWidth / width, 1);
      setDimensions({ width: width * ratio, height: height * ratio });
    } else {
      setDimensions({ width: maxWidth, height: maxWidth * 0.6 });
    }
    setLoading(false);
  }, [maxWidth]);

  if (error) return null;

  return (
    <View style={imgStyles.container}>
      {loading && (
        <View style={imgStyles.placeholder}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}
      <Image
        source={{ uri: src }}
        style={dimensions ? { width: dimensions.width, height: dimensions.height, borderRadius: 8 } : imgStyles.defaultImage}
        resizeMode="contain"
        onLoad={onLoad}
        onError={() => { setError(true); setLoading(false); }}
        accessibilityLabel={alt || 'Article image'}
      />
    </View>
  );
}

const imgStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
    alignItems: 'center',
  },
  placeholder: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
});

function RenderNode({
  node,
  maxWidth,
  isInline = false,
}: {
  node: HtmlNode;
  maxWidth: number;
  isInline?: boolean;
}) {
  if (node.type === 'text') {
    const text = node.text || '';
    if (!text.trim()) return null;
    return <Text style={htmlStyles.paragraph}>{text}</Text>;
  }

  const tag = node.tag || '';
  const children = node.children || [];

  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = parseInt(tag[1], 10);
      const fontSize = Math.max(24 - (level - 1) * 2, 15);
      return (
        <Text style={[htmlStyles.heading, { fontSize }]}>
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} isInline />
          ))}
        </Text>
      );
    }

    case 'p':
      return (
        <Text style={htmlStyles.paragraph}>
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} isInline />
          ))}
        </Text>
      );

    case 'strong':
    case 'b':
      return (
        <Text style={htmlStyles.bold}>
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} isInline />
          ))}
        </Text>
      );

    case 'em':
    case 'i':
      return (
        <Text style={htmlStyles.italic}>
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} isInline />
          ))}
        </Text>
      );

    case 'code':
      return (
        <Text style={htmlStyles.code}>
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} isInline />
          ))}
        </Text>
      );

    case 'a': {
      const href = node.attrs?.href;
      return (
        <Text
          style={htmlStyles.link}
          onPress={() => href && Linking.openURL(href)}
        >
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} isInline />
          ))}
        </Text>
      );
    }

    case 'img': {
      const src = node.attrs?.src;
      if (!src) return null;
      return <RemoteImage src={src} alt={node.attrs?.alt} maxWidth={maxWidth} />;
    }

    case 'figure':
      return (
        <View style={htmlStyles.figure}>
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} />
          ))}
        </View>
      );

    case 'ul':
      return (
        <View style={htmlStyles.list}>
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} />
          ))}
        </View>
      );

    case 'ol':
      return (
        <View style={htmlStyles.list}>
          {children.map((c, i) => (
            <RenderNode key={i} node={{ ...c, attrs: { ...c.attrs, _index: String(i + 1) } }} maxWidth={maxWidth} />
          ))}
        </View>
      );

    case 'li': {
      const idx = node.attrs?._index;
      const bullet = idx ? `${idx}.` : '\u2022';
      return (
        <View style={htmlStyles.listItem}>
          <Text style={htmlStyles.bullet}>{bullet}</Text>
          <View style={htmlStyles.listItemContent}>
            {children.map((c, i) => (
              <RenderNode key={i} node={c} maxWidth={maxWidth - 24} isInline />
            ))}
          </View>
        </View>
      );
    }

    case 'br':
      return <Text>{'\n'}</Text>;

    case 'hr':
      return <View style={htmlStyles.hr} />;

    case 'div':
    case 'section':
    case 'article':
    case 'figcaption':
    case 'span':
      if (isInline || tag === 'span') {
        return (
          <Text>
            {children.map((c, i) => (
              <RenderNode key={i} node={c} maxWidth={maxWidth} isInline />
            ))}
          </Text>
        );
      }
      return (
        <View>
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} />
          ))}
        </View>
      );

    default:
      return (
        <View>
          {children.map((c, i) => (
            <RenderNode key={i} node={c} maxWidth={maxWidth} />
          ))}
        </View>
      );
  }
}

interface HtmlArticleRendererProps {
  html: string;
}

export default function HtmlArticleRenderer({ html }: HtmlArticleRendererProps) {
  const { width } = useWindowDimensions();
  const maxWidth = width - 40;

  const nodes = useMemo(() => parseHtml(html), [html]);

  return (
    <View style={htmlStyles.container}>
      {nodes.map((node, i) => (
        <RenderNode key={i} node={node} maxWidth={maxWidth} />
      ))}
    </View>
  );
}

const htmlStyles = StyleSheet.create({
  container: {
    gap: 4,
  },
  heading: {
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 30,
  },
  paragraph: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '700' as const,
  },
  italic: {
    fontStyle: 'italic' as const,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 4,
    fontSize: 13,
    borderRadius: 4,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline' as const,
  },
  figure: {
    marginVertical: 8,
    alignItems: 'center',
  },
  list: {
    marginBottom: 8,
    paddingLeft: 4,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingRight: 8,
  },
  bullet: {
    fontSize: 15,
    color: Colors.textSecondary,
    width: 20,
    lineHeight: 24,
  },
  listItemContent: {
    flex: 1,
  },
  hr: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
});
