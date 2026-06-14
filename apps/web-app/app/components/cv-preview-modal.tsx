import { useState, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

interface CvPreviewModalProps {
  isOpen: boolean
  cvUrl: string
  candidateName: string
  onClose: () => void
}

export function CvPreviewModal({ isOpen, cvUrl, candidateName, onClose }: CvPreviewModalProps) {
  const [content, setContent] = useState<React.ReactNode>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setContent(null)
      setLoading(true)
      setError(null)
      return
    }

    const loadCvContent = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/cv-preview?url=${encodeURIComponent(cvUrl)}`)
        if (!response.ok) throw new Error('Failed to fetch CV')

        const data = await response.json()
        if (data.html) {
          setContent(
            <div className="word-preview" dangerouslySetInnerHTML={{ __html: data.html }} />
          )
        } else if (data.text) {
          setContent(
            <pre className="text-sm whitespace-pre-wrap font-sans" style={{ color: 'var(--color-text-secondary)' }}>
              {data.text}
            </pre>
          )
        } else {
          setContent(
            <embed
              src={data.pdfUrl}
              type="application/pdf"
              className="w-full h-full"
            />
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CV')
      } finally {
        setLoading(false)
      }
    }

    loadCvContent()
  }, [isOpen, cvUrl])

  useEffect(() => {
    if (!isOpen) return

    const style = document.createElement('style')
    style.textContent = `
      .word-preview, .word-preview * {
        font-family: Arial, Helvetica, sans-serif !important;
      }
      .word-preview { all: initial; }
      .word-preview {
        display: block;
        font-family: Arial, Helvetica, sans-serif;
        color: inherit;
        line-height: 1.6;
      }
      .word-preview p {
        margin: 0.5rem 0;
        font-size: 1rem;
      }
      .word-preview h1, .word-preview h2, .word-preview h3, .word-preview h4, .word-preview h5, .word-preview h6 {
        margin: 1rem 0 0.5rem 0;
        font-weight: 600;
        font-family: Arial, Helvetica, sans-serif !important;
      }
      .word-preview h1 { font-size: 1.875rem; }
      .word-preview h2 { font-size: 1.5rem; }
      .word-preview h3 { font-size: 1.25rem; }
      .word-preview h4 { font-size: 1.125rem; }
      .word-preview h5 { font-size: 1rem; }
      .word-preview h6 { font-size: 0.875rem; }
      .word-preview ul, .word-preview ol {
        margin: 0.5rem 0;
        padding-left: 2rem;
        list-style-position: outside;
      }
      .word-preview li {
        margin: 0.25rem 0;
        font-size: 1rem;
      }
      .word-preview table {
        border-collapse: collapse;
        margin: 1rem 0;
        width: 100%;
      }
      .word-preview td, .word-preview th {
        border: 1px solid #ddd;
        padding: 0.5rem;
      }
      .word-preview strong { font-weight: 600; }
      .word-preview em { font-style: italic; }
      .word-preview u { text-decoration: underline; }
      .word-preview a { color: #0066cc; text-decoration: underline; }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              CV Preview
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {candidateName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'var(--color-surface-subtle)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p style={{ color: 'var(--color-text-secondary)' }}>Loading CV...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p style={{ color: 'var(--color-danger)' }} className="font-medium">
                  {error}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="bg-white rounded p-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {content}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
