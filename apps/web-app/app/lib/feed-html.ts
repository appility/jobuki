import sanitizeHtml from 'sanitize-html'

export function repairMojibake(value: string): string {
  if (!/[ÃÂâ€]/.test(value)) return value

  try {
    const repaired = Buffer.from(value, 'latin1').toString('utf8')
    if (repaired.includes('\uFFFD')) return value
    return repaired
  } catch {
    return value
  }
}

export function sanitizeFeedHtml(html: string): string {
  return sanitizeHtml(html, {
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
      'img',
      'figure',
      'figcaption',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'pre',
      'code',
      'div',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      div: ['class'],
      span: ['class'],
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
      img: (tagName, attribs) => ({
        tagName: 'img',
        attribs: {
          src: attribs.src,
          alt: attribs.alt || '',
          title: attribs.title || '',
          loading: 'lazy',
        },
      }),
    },
    disallowedTagsMode: 'discard',
  })
}
