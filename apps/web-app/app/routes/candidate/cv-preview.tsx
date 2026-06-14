import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import type { LoaderFunctionArgs } from 'react-router'

export async function loader(args: LoaderFunctionArgs) {
  await requireUser(args, { type: 'candidate' })
  return {}
}

export default function CvPreview() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const cvUrl = searchParams.get('url') || ''
  const [content, setContent] = useState<React.ReactNode>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inject CSS styles for Word preview
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .word-preview {
        font-family: Arial, Helvetica, sans-serif !important;
      }
      .word-preview p { margin: 0.5rem 0; }
      .word-preview h1, .word-preview h2, .word-preview h3, .word-preview h4, .word-preview h5, .word-preview h6 {
        margin: 1rem 0 0.5rem 0;
        font-weight: 600;
      }
      .word-preview h1 { font-size: 1.875rem; }
      .word-preview h2 { font-size: 1.5rem; }
      .word-preview h3 { font-size: 1.25rem; }
      .word-preview ul, .word-preview ol { margin: 0.5rem 0; padding-left: 2rem; }
      .word-preview li { margin: 0.25rem 0; }
      .word-preview img { max-width: 100%; height: auto; margin: 1rem 0; border-radius: 0.375rem; }
      .word-preview table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
      .word-preview th, .word-preview td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
      .word-preview th { background-color: #f5f5f5; font-weight: 600; }
      .word-preview strong, .word-preview b { font-weight: 600; }
      .word-preview em, .word-preview i { font-style: italic; }
      .word-preview u { text-decoration: underline; }
      .word-preview blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 3px solid #ccc; }
    `
    document.head.appendChild(style)
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  useEffect(() => {
    const loadPreview = async () => {
      try {
        // Fetch file through our proxy endpoint
        const fileResponse = await fetch(`/api/cv-download?url=${encodeURIComponent(cvUrl)}`)
        if (!fileResponse.ok) throw new Error('Failed to fetch file')

        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream'
        const buffer = await fileResponse.arrayBuffer()
        const isPdf = contentType.includes('pdf')
        const isWord = contentType.includes('word') || contentType.includes('officedocument')
        const isText = contentType.includes('text') || contentType === 'application/octet-stream'

        if (isPdf) {
          const blob = new Blob([buffer], { type: 'application/pdf' })
          const blobUrl = URL.createObjectURL(blob)
          setContent(
            <embed
              src={blobUrl}
              type="application/pdf"
              width="100%"
              height="800"
              style={{ minHeight: '600px' }}
            />
          )
        } else if (isWord) {
          const mammoth = await import('mammoth')
          const convertOptions: any = {
            arrayBuffer: buffer,
            convertImage: mammoth.images.imgElement((image: any) => {
              return image.read('base64').then((imageBuffer: string) => {
                return {
                  src: `data:${image.contentType};base64,${imageBuffer}`,
                }
              })
            }),
          }
          const result = await mammoth.convertToHtml(convertOptions)
          setContent(
            <div
              style={{
                color: 'var(--color-text-primary)',
                lineHeight: '1.6',
                maxWidth: '8.5in',
                margin: '2rem auto',
                padding: '2rem',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                borderRadius: '0.5rem',
              }}
              className="word-preview"
              dangerouslySetInnerHTML={{ __html: result.value }}
            />
          )
        } else if (isText) {
          const text = new TextDecoder().decode(new Uint8Array(buffer))
          setContent(
            <pre
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                overflow: 'auto',
                padding: '1rem',
                backgroundColor: 'var(--color-surface-subtle)',
                borderRadius: '0.5rem',
              }}
            >
              {text}
            </pre>
          )
        } else {
          setError('Preview not available for this file type')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preview')
      } finally {
        setLoading(false)
      }
    }

    loadPreview()
  }, [cvUrl])

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--color-text-primary)' }}>
          CV Preview
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
        >
          ← Back
        </button>
      </div>

      <div className="card p-6">
        {loading && <div style={{ color: 'var(--color-text-muted)' }}>Loading preview…</div>}
        {error && <div style={{ color: 'var(--color-danger)' }}>Error: {error}</div>}
        {content}
      </div>

      {cvUrl && (
        <div className="text-center">
          <a
            href={cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            Download CV ↗
          </a>
        </div>
      )}
    </div>
  )
}
