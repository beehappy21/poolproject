import getTabs from './getTabs';
import {getPlatform} from './getPlatform';
import {isMobileDevice} from './isMobileDevice';

const ALLOWED_PRODUCT_RICH_TEXT_TAGS = new Set([
  'P',
  'BR',
  'DIV',
  'SPAN',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'FIGURE',
  'FIGCAPTION',
  'IMG',
  'HR',
]);

const PRODUCT_RICH_TEXT_BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'FIGURE',
  'FIGCAPTION',
]);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const looksLikeHtml = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);

const plainTextToHtml = (value: string): string => {
  const normalized = value.replace(/\r\n?/g, '\n').trim();

  if (!normalized) {
    return '';
  }

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
};

const isSafeUrl = (value: string): boolean => {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();

  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/')
  );
};

const sanitizeCssValue = (property: string, value: string): string | null => {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (property === 'text-align') {
    return ['left', 'center', 'right', 'justify'].includes(normalized)
      ? normalized
      : null;
  }

  if (property === 'font-size') {
    return /^([0-9]{1,3})(px|rem|em|%)$/.test(normalized) ? normalized : null;
  }

  if (property === 'color') {
    return /^#[0-9a-f]{3,8}$/.test(normalized) ? normalized : null;
  }

  if (property === 'font-weight') {
    return /^(normal|bold|[1-9]00)$/.test(normalized) ? normalized : null;
  }

  if (property === 'font-style') {
    return ['normal', 'italic'].includes(normalized) ? normalized : null;
  }

  if (property === 'text-decoration') {
    return ['none', 'underline'].includes(normalized) ? normalized : null;
  }

  if (
    property === 'width' ||
    property === 'max-width' ||
    property === 'height' ||
    property === 'max-height'
  ) {
    return normalized === 'auto' || /^([0-9]{1,4})(px|%)$/.test(normalized)
      ? normalized
      : null;
  }

  if (property === 'object-fit') {
    return ['contain', 'cover', 'fill', 'scale-down'].includes(normalized)
      ? normalized
      : null;
  }

  if (property === 'display') {
    return ['block', 'inline-block', 'inline'].includes(normalized)
      ? normalized
      : null;
  }

  if (property === 'margin') {
    return /^(0|auto|0 auto|[0-9.]+(px|rem)\s+auto)$/.test(normalized)
      ? normalized
      : null;
  }

  if (property === 'border-radius') {
    return /^([0-9]{1,3})(px|%)$/.test(normalized) ? normalized : null;
  }

  return null;
};

const sanitizeStyle = (tagName: string, styleValue: string): string => {
  const tagSpecificAllowed = new Set<string>();

  if (
    ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'FIGURE', 'FIGCAPTION'].includes(
      tagName,
    )
  ) {
    tagSpecificAllowed.add('text-align');
    tagSpecificAllowed.add('font-size');
    tagSpecificAllowed.add('color');
  }

  if (tagName === 'SPAN') {
    tagSpecificAllowed.add('font-size');
    tagSpecificAllowed.add('font-weight');
    tagSpecificAllowed.add('font-style');
    tagSpecificAllowed.add('text-decoration');
    tagSpecificAllowed.add('color');
  }

  if (tagName === 'IMG') {
    tagSpecificAllowed.add('width');
    tagSpecificAllowed.add('max-width');
    tagSpecificAllowed.add('height');
    tagSpecificAllowed.add('max-height');
    tagSpecificAllowed.add('display');
    tagSpecificAllowed.add('margin');
    tagSpecificAllowed.add('border-radius');
    tagSpecificAllowed.add('object-fit');
  }

  return styleValue
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separatorIndex = declaration.indexOf(':');

      if (separatorIndex <= 0) {
        return null;
      }

      const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
      const rawValue = declaration.slice(separatorIndex + 1);

      if (!tagSpecificAllowed.has(property)) {
        return null;
      }

      const sanitizedValue = sanitizeCssValue(property, rawValue);
      return sanitizedValue ? `${property}:${sanitizedValue}` : null;
    })
    .filter((value): value is string => Boolean(value))
    .join('; ');
};

const sanitizeNode = (node: Node, doc: Document): Node | null => {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toUpperCase();

  if (!ALLOWED_PRODUCT_RICH_TEXT_TAGS.has(tagName)) {
    const fragment = doc.createDocumentFragment();
    Array.from(element.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeNode(child, doc);
      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild);
      }
    });
    return fragment;
  }

  const cleanElement = doc.createElement(tagName.toLowerCase());

  if (element.hasAttribute('style')) {
    const styleValue = sanitizeStyle(tagName, element.getAttribute('style') || '');
    if (styleValue) {
      cleanElement.setAttribute('style', styleValue);
    }
  }

  if (tagName === 'IMG') {
    const src = (element.getAttribute('src') || '').trim();
    if (!isSafeUrl(src)) {
      return null;
    }

    cleanElement.setAttribute('src', src);
    cleanElement.setAttribute(
      'style',
      [
        'display:block',
        'margin:0 auto',
        'width:auto',
        'max-width:100%',
        'height:auto',
        'max-height:42vh',
        'object-fit:contain',
        'border-radius:12px',
      ].join('; '),
    );

    const alt = (element.getAttribute('alt') || '').trim();
    if (alt) {
      cleanElement.setAttribute('alt', alt.slice(0, 160));
    }
  }

  Array.from(element.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(child, doc);
    if (sanitizedChild) {
      cleanElement.appendChild(sanitizedChild);
    }
  });

  if (
    PRODUCT_RICH_TEXT_BLOCK_TAGS.has(tagName) &&
    cleanElement.childNodes.length === 0 &&
    tagName !== 'HR' &&
    tagName !== 'IMG'
  ) {
    cleanElement.appendChild(doc.createElement('br'));
  }

  return cleanElement;
};

export const toRenderableProductRichTextHtml = (value?: string | null): string => {
  const source = typeof value === 'string' ? value.trim() : '';

  if (!source) {
    return '';
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return looksLikeHtml(source) ? source : plainTextToHtml(source);
  }

  const html = looksLikeHtml(source) ? source : plainTextToHtml(source);
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = parsed.body.firstElementChild;

  if (!container) {
    return '';
  }

  const cleanDocument = document.implementation.createHTMLDocument('');
  const wrapper = cleanDocument.createElement('div');

  Array.from(container.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(child, cleanDocument);
    if (sanitizedChild) {
      wrapper.appendChild(sanitizedChild);
    }
  });

  return wrapper.innerHTML.trim();
};

export const toPlainTextProductDescription = (value?: string | null): string => {
  const source = typeof value === 'string' ? value.trim() : '';

  if (!source) {
    return '';
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return source.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (!looksLikeHtml(source)) {
    return source;
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(source, 'text/html');

  return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
};

export const utils = {
  getTabs,
  getPlatform,
  isMobileDevice,
};
