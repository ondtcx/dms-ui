'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Placeholder from '@tiptap/extension-placeholder';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssetUploadButton } from './AssetUploadButton';
import { TemplateImage } from './TemplateImage.node';

export interface RichTextInsertButton {
  label: string;
  title?: string;
  onClick: (editor: Editor) => void;
}

type RichTextValue = string | JSONContent | null | undefined;

interface RichTextEditorProps {
  value: RichTextValue;
  onChange: (value: RichTextValue) => void;
  onHtmlChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  format?: 'json' | 'html';
  insertButtons?: RichTextInsertButton[];
  allowImages?: boolean;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon"
      className="h-8 w-8"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  onHtmlChange,
  placeholder = 'Escribe el contenido del documento...',
  disabled = false,
  format = 'json',
  insertButtons = [],
  allowImages = false,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onHtmlChangeRef = useRef(onHtmlChange);
  onHtmlChangeRef.current = onHtmlChange;
  const formatRef = useRef<'json' | 'html'>(format);
  formatRef.current = format;
  const lastEmitted = useRef<string>('');

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        code: false,
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
      ...(allowImages ? [TemplateImage] : []),
    ],
    content: value ?? (format === 'html' ? '' : { type: 'doc', content: [] }),
    onCreate: ({ editor: current }) => {
      onHtmlChangeRef.current?.(current.getHTML());
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      const json = current.getJSON();
      const output = formatRef.current === 'html' ? html : json;
      lastEmitted.current =
        formatRef.current === 'html' ? html : JSON.stringify(json);
      onChangeRef.current(output);
      onHtmlChangeRef.current?.(html);
    },
  });

  useEffect(() => {
    if (!editor || value === undefined || value === null) return;
    const serialized =
      formatRef.current === 'html' ? String(value) : JSON.stringify(value);
    if (serialized === lastEmitted.current) return;
    editor.commands.setContent(value, { emitUpdate: false });
    lastEmitted.current = serialized;
    onHtmlChangeRef.current?.(editor.getHTML());
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div className="min-h-[320px] rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Cargando editor...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
        <ToolbarButton
          label="Negrita"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Subrayado"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label="Encabezado 1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Encabezado 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Encabezado 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label="Lista con viñetas"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label="Alinear a la izquierda"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Centrar"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Alinear a la derecha"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label="Insertar tabla"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
              .run()
          }
        >
          <Table2 className="h-4 w-4" />
        </ToolbarButton>
        {allowImages && (
          <AssetUploadButton
            label="Imagen"
            testId="rich-text-add-image"
            onUploaded={(asset) =>
              editor
                .chain()
                .focus()
                .insertContent({
                  type: 'templateImage',
                  attrs: { src: asset.url, alt: '' },
                })
                .run()
            }
            disabled={disabled}
            size="sm"
            variant="outline"
          />
        )}
        {allowImages &&
          editor.isActive('templateImage') &&
          (() => {
            const attributes = editor.getAttributes('templateImage');
            const width = Number(attributes.width ?? 100);
            const align = String(attributes.align ?? 'center');
            return (
              <div className="flex items-center gap-1">
                <span className="mx-1 h-5 w-px bg-border" />
                <span className="text-xs text-muted-foreground">Imagen:</span>
                {(['left', 'center', 'right'] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={align === value ? 'secondary' : 'ghost'}
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      editor
                        .chain()
                        .focus()
                        .updateAttributes('templateImage', { align: value })
                        .run()
                    }
                  >
                    {value === 'left'
                      ? 'Izq'
                      : value === 'center'
                        ? 'Centro'
                        : 'Der'}
                  </Button>
                ))}
                <select
                  aria-label="Ancho de imagen"
                  className="h-7 rounded-md border border-input bg-background px-1 text-xs"
                  value={width}
                  onChange={(event) =>
                    editor
                      .chain()
                      .focus()
                      .updateAttributes('templateImage', {
                        width: Number(event.target.value),
                      })
                      .run()
                  }
                >
                  <option value={25}>25%</option>
                  <option value={50}>50%</option>
                  <option value={75}>75%</option>
                  <option value={100}>100%</option>
                </select>
              </div>
            );
          })()}
        <ToolbarButton
          label="Deshacer"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Rehacer"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      {insertButtons.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/20 px-2 py-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Insertar:</span>
          {insertButtons.map((button) => (
            <Button
              key={button.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              title={button.title}
              disabled={disabled}
              onClick={() => button.onClick(editor)}
            >
              {button.label}
            </Button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  );
}
