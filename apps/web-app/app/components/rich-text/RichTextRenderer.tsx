import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'isomorphic-dompurify'
import type { TiptapNode } from '../../lib/rich-text'

type RichTextRendererProps = {
  content: TiptapNode
  className?: string
}

export function RichTextRenderer({ content, className = 'prose prose-slate max-w-none' }: RichTextRendererProps) {
  const rawHtml = generateHTML(content, [StarterKit])

  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
  })

  return <article className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
}
