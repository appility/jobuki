import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

type Props = {
  value: string
  onChange: (html: string) => void
}

export function PageContentEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[120px] p-3 text-sm leading-relaxed prose prose-sm max-w-none',
      },
    },
    onUpdate({ editor: e }) {
      onChange(e.getHTML())
    },
  })

  if (!editor) return null

  const btn = (active: boolean) => ({
    backgroundColor: active ? 'var(--color-text-primary)' : 'var(--color-surface)',
    color: active ? 'var(--color-surface)' : 'var(--color-text-secondary)',
    borderColor: 'var(--color-border)',
  })

  return (
    <div>
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {([1, 2, 3] as const).map(level => (
          <button key={level} type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            className="px-2 py-0.5 text-xs font-bold rounded border"
            style={btn(editor.isActive('heading', { level }))}>
            H{level}
          </button>
        ))}
        <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className="px-2 py-0.5 text-xs font-extrabold rounded border" style={btn(editor.isActive('bold'))}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className="px-2 py-0.5 text-xs italic rounded border" style={btn(editor.isActive('italic'))}>I</button>
        <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="px-2 py-0.5 text-xs rounded border" style={btn(editor.isActive('bulletList'))}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="px-2 py-0.5 text-xs rounded border" style={btn(editor.isActive('orderedList'))}>1. List</button>
        <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />
        <button type="button"
          onClick={() => {
            const url = window.prompt('URL')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
          className="px-2 py-0.5 text-xs rounded border" style={btn(editor.isActive('link'))}>Link</button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()}
          className="px-2 py-0.5 text-xs rounded border" style={btn(false)}>Unlink</button>
      </div>

      <div className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
