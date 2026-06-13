import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useUser } from '@clerk/react-router'

export default function SSOCallback() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn, user } = useUser()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const accountType = user?.unsafeMetadata?.accountType as string | undefined
    if (accountType === 'candidate') {
      navigate('/candidate/start')
    } else if (accountType === 'publisher') {
      navigate('/hiring/start')
    } else {
      navigate('/dashboard')
    }
  }, [isLoaded, isSignedIn, user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="text-center">
        <div className="inline-block w-12 h-12 rounded-full border-4 border-transparent border-t-current animate-spin mb-4"
          style={{ borderTopColor: 'var(--color-primary)' }} />
        <p style={{ color: 'var(--color-text-primary)' }}>Signing you in…</p>
      </div>
    </div>
  )
}
