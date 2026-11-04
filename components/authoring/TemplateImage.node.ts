import { Node, mergeAttributes } from '@tiptap/react';
import { assetUrl } from '@/lib/authoring/assets';

export const TemplateImage = Node.create({
  name: 'templateImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
    };
  },

  parseHTML() {
    return [
      { tag: 'img[src^="/files/"]' },
      { tag: 'img[src^="data:image/"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes({ style: 'max-width:100%;height:auto;' }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img');
      img.src = assetUrl(String(node.attrs.src ?? ''));
      img.alt = String(node.attrs.alt ?? '');
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.draggable = false;
      return { dom: img };
    };
  },
});
