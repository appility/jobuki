import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'

type Props = {
  value: string
  onChange: (html: string) => void
  primaryColor: string
  accentColor: string
}

const PRESETS = [
  { label: 'Remove colour', color: null },
  { label: 'Dim/grey', color: '#A8A29E' },
]

export function HeroHeadlineEditor({ value, onChange, primaryColor, accentColor }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      TextStyle,
      Color,
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[60px] p-3 text-base font-bold leading-snug',
      },
    },
    onUpdate({ editor: e }) {
      onChange(e.getHTML())
    },
    onCreate({ editor: e }) {
      onChange(e.getHTML())
    },
  })

  if (!editor) return null

  const swatches = [
    { label: 'Primary', color: primaryColor },
    { label: 'Accent', color: accentColor },
    ...PRESETS,
  ]

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-[10px] font-semibold mr-1" style={{ color: 'var(--color-text-muted)' }}>Colour:</span>
        {swatches.map(({ label, color }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={() =>
              color
                ? editor.chain().focus().setColor(color).run()
                : editor.chain().focus().unsetMark('textStyle').run()
            }
            className="w-5 h-5 rounded-full border border-white shadow-sm flex-shrink-0"
            style={{
              backgroundColor: color ?? '#E7E5E4',
              outline: '1.5px solid rgba(0,0,0,0.12)',
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="ml-1 px-2 py-0.5 text-xs font-extrabold rounded border"
          style={{
            backgroundColor: editor.isActive('bold') ? 'var(--color-text-primary)' : 'var(--color-surface)',
            color: editor.isActive('bold') ? 'var(--color-surface)' : 'var(--color-text-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          B
        </button>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <EditorContent editor={editor} />
      </div>

      <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
        Select text then pick a colour. Use line breaks for multi-line headlines.
      </p>
    </div>
  )
}
