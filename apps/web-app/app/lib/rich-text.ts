export type TiptapNode = {
  type?: string
  text?: string
  content?: TiptapNode[]
}

function decodeCommonHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function htmlToPlainText(input: string): string {
  return decodeCommonHtmlEntities(input)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const EMPTY_TIPTAP_DOC: TiptapNode = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '' }],
    },
  ],
}

export function isTiptapDoc(value: unknown): value is TiptapNode {
  return Boolean(value && typeof value === 'object' && (value as TiptapNode).type === 'doc')
}

export function parseTiptapJson(value: FormDataEntryValue | null): TiptapNode | null {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const parsed = JSON.parse(value) as unknown
    return isTiptapDoc(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function plainTextToTiptapDoc(input: string): TiptapNode {
  const lines = input
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return EMPTY_TIPTAP_DOC

  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  }
}

export function coerceTiptapDoc(value: unknown, fallbackText = ''): TiptapNode {
  if (isTiptapDoc(value)) return value
  return plainTextToTiptapDoc(fallbackText)
}

export function tiptapDocToPlainText(node: TiptapNode | string | null | undefined): string {
  if (!node) return ''

  if (typeof node === 'string') return htmlToPlainText(node)

  if (node.type === 'text') return node.text ?? ''

  const pieces = (node.content ?? []).map((child) => tiptapDocToPlainText(child))

  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote' || node.type === 'listItem') {
    return pieces.join('').trim() + '\n'
  }

  return pieces.join('')
}
