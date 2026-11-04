import { Node, mergeAttributes } from '@tiptap/react';
import { assetUrl } from '@/lib/authoring/assets';

type ImageAlign = 'left' | 'center' | 'right';

function normalizeWidth(value: unknown): number {
  const width = Number(value);
  if (!Number.isFinite(width)) return 100;
  return Math.min(100, Math.max(10, width));
}

function normalizeAlign(value: unknown): ImageAlign {
  return value === 'left' || value === 'right' ? value : 'center';
}

function imageStyle(attrs: Record<string, unknown>): string {
  const width = normalizeWidth(attrs.width);
  const align = normalizeAlign(attrs.align);
  return `width:${width}%;max-width:100%;height:auto;display:block;margin-left:${
    align === 'left' ? '0' : 'auto'
  };margin-right:${align === 'right' ? '0' : 'auto'};`;
}

function applyImageStyles(img: HTMLImageElement, attrs: Record<string, unknown>) {
  const width = normalizeWidth(attrs.width);
  const align = normalizeAlign(attrs.align);
  img.style.width = `${width}%`;
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.display = 'block';
  img.style.marginLeft = align === 'left' ? '0' : 'auto';
  img.style.marginRight = align === 'right' ? '0' : 'auto';
}

export const TemplateImage = Node.create({
  name: 'templateImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      width: { default: 100 },
      align: { default: 'center' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const src = el.getAttribute('src') ?? '';
          if (!src.startsWith('/files/') && !src.startsWith('data:image/')) {
            return false;
          }
          const style = el.getAttribute('style') ?? '';
          const widthMatch = /width:\s*([\d.]+)%/.exec(style);
          const align: ImageAlign = /margin-left:\s*0/.test(style)
            ? 'left'
            : /margin-right:\s*0/.test(style)
              ? 'right'
              : 'center';
          return {
            src,
            alt: el.getAttribute('alt') ?? '',
            width: widthMatch ? Number(widthMatch[1]) : 100,
            align,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, unknown>;
    return [
      'img',
      mergeAttributes({
        src: attrs.src,
        alt: attrs.alt ?? '',
        style: imageStyle(attrs),
      }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img');
      img.src = assetUrl(String(node.attrs.src ?? ''));
      img.alt = String(node.attrs.alt ?? '');
      img.draggable = false;
      applyImageStyles(img, node.attrs);
      return {
        dom: img,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          img.src = assetUrl(String(updatedNode.attrs.src ?? ''));
          img.alt = String(updatedNode.attrs.alt ?? '');
          applyImageStyles(img, updatedNode.attrs);
          return true;
        },
      };
    };
  },
});
