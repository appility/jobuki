import { useFetcher, useNavigate } from 'react-router'
import { useState } from 'react'

interface CvUploadCardProps {
  cvUrl?: string | null
  cvExtractedText?: string | null
  lastUpdated?: Date | null
}

export function CvUploadCard({ cvUrl, cvExtractedText, lastUpdated }: CvUploadCardProps) {
  const fetcher = useFetcher()
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)

  const isStale = lastUpdated
    ? new Date().getTime() - new Date(lastUpdated).getTime() > 90 * 24 * 60 * 60 * 1000
    : !cvUrl

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('cv', file)

    try {
      const response = await fetch('/api/upload-cv', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Upload failed')
        return
      }

      const result = await response.json()
      if (result.ok) {
        // File uploaded successfully, extracted text is stored
        // Reload the page to show updated CV info
        window.location.reload()
      }
    } catch (error) {
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${Math.floor(days / 365)} years ago`
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            CV / Resume
          </h3>
          {isStale && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
              {cvUrl ? 'Update recommended' : 'Add your CV'}
            </p>
          )}
        </div>
      </div>

      {cvUrl ? (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-subtle)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                CV uploaded
              </p>
              {lastUpdated && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Updated {formatDate(lastUpdated)}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate(`/candidate/cv-preview?url=${encodeURIComponent(cvUrl || '')}`)}
              className="text-xs no-underline font-medium px-3 py-1.5 rounded-lg"
              style={{ color: 'var(--color-primary)', border: '1px solid var(--color-primary)', backgroundColor: 'transparent', cursor: 'pointer' }}
            >
              Preview
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Upload CV"
        />
        <button
          type="button"
          disabled={uploading}
          className="w-full px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          style={{
            backgroundColor: isStale ? 'var(--color-primary)' : 'var(--color-surface-subtle)',
            color: isStale ? 'white' : 'var(--color-text-secondary)',
            cursor: uploading ? 'wait' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'Uploading...' : cvUrl ? 'Update CV' : 'Upload CV'}
        </button>
      </div>

      <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
        Supports PDF, Word, and text files (max 10MB). Text is extracted for matching and search.
      </p>
    </div>
  )
}
