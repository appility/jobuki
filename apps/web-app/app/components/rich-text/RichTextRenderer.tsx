import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import sanitizeHtml from 'sanitize-html'
import type { TiptapNode } from '../../lib/rich-text'

type RichTextRendererProps = {
  content: TiptapNode
  className?: string
}

export function RichTextRenderer({ content, className = 'prose prose-slate max-w-none' }: RichTextRendererProps) {
  const rawHtml = generateHTML(content, [StarterKit])

  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'pre',
      'code',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      code: ['class'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        'a',
        {
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
        true
      ),
    },
    disallowedTagsMode: 'discard',
  })

  return <article className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
}
