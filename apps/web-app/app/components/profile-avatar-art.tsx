import { useMemo } from 'react'

function hashString(input: string) {
  let hash = 2166136261

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  return Math.abs(hash >>> 0)
}

function seededRandom(seed: number) {
  let value = seed

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function getProfileArtSeed(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  return hashString(normalizedEmail)
}

type ArtStyle = 'waves' | 'geometric' | 'organic' | 'dots' | 'gradient'

interface ProfileAvatarArtProps {
  email: string
  name?: string
  size?: number
}

export function ProfileAvatarArt({ email, name, size = 120 }: ProfileAvatarArtProps) {
  const svgContent = useMemo(() => {
    const seed = getProfileArtSeed(email)
    const rng = seededRandom(seed)

    // Select art style based on seed
    const styles: ArtStyle[] = ['waves', 'geometric', 'organic', 'dots', 'gradient']
    const style = styles[Math.floor(rng() * styles.length)] as ArtStyle

    // Generate base colors
    const hue1 = Math.floor(rng() * 360)
    const hue2 = (hue1 + 60 + Math.floor(rng() * 120)) % 360
    const saturation = 60 + Math.floor(rng() * 40)
    const lightness = 50 + Math.floor(rng() * 20)

    const color1 = `hsl(${hue1}, ${saturation}%, ${lightness}%)`
    const color2 = `hsl(${hue2}, ${saturation}%, ${lightness}%)`
    const bgColor = `hsl(${hue1}, ${saturation - 30}%, ${lightness + 30}%)`

    // Generate SVG based on style
    let paths = ''

    if (style === 'waves') {
      const waves = 3 + Math.floor(rng() * 3)
      for (let w = 0; w < waves; w++) {
        const amplitude = 20 + rng() * 20
        const frequency = 0.02 + rng() * 0.04
        const phase = rng() * Math.PI * 2
        const yOffset = (w * 100) / waves

        let pathData = `M 0 ${yOffset + amplitude}`
        for (let x = 0; x <= 200; x += 10) {
          const y = yOffset + amplitude * Math.sin(x * frequency + phase)
          pathData += ` L ${x} ${y}`
        }

        const opacity = 0.3 + rng() * 0.5
        const strokeColor = rng() > 0.5 ? color1 : color2
        paths += `<path d="${pathData}" stroke="${strokeColor}" stroke-width="3" fill="none" opacity="${opacity}" />`
      }
    } else if (style === 'geometric') {
      const shapes = 5 + Math.floor(rng() * 5)
      for (let i = 0; i < shapes; i++) {
        const x = rng() * 200
        const y = rng() * 200
        const size = 20 + rng() * 40
        const rotation = rng() * 360
        const shapeType = rng() > 0.5 ? 'rect' : 'circle'
        const fillColor = rng() > 0.5 ? color1 : color2
        const opacity = 0.4 + rng() * 0.5

        if (shapeType === 'circle') {
          paths += `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${fillColor}" opacity="${opacity}" />`
        } else {
          paths += `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="${fillColor}" opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})" />`
        }
      }
    } else if (style === 'organic') {
      const blobs = 2 + Math.floor(rng() * 2)
      for (let b = 0; b < blobs; b++) {
        const cx = 50 + rng() * 100
        const cy = 50 + rng() * 100
        const baseRadius = 30 + rng() * 50

        let pathData = 'M'
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const radius = baseRadius * (0.7 + rng() * 0.6)
          const x = cx + radius * Math.cos(angle)
          const y = cy + radius * Math.sin(angle)
          pathData += ` ${x} ${y}`
        }
        pathData += ' Z'

        const fillColor = rng() > 0.5 ? color1 : color2
        const opacity = 0.5 + rng() * 0.4
        paths += `<path d="${pathData}" fill="${fillColor}" opacity="${opacity}" />`
      }
    } else if (style === 'dots') {
      const dotCount = 30 + Math.floor(rng() * 40)
      for (let d = 0; d < dotCount; d++) {
        const x = rng() * 200
        const y = rng() * 200
        const radius = 2 + rng() * 8
        const fillColor = rng() > 0.5 ? color1 : color2
        const opacity = 0.3 + rng() * 0.7
        paths += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fillColor}" opacity="${opacity}" />`
      }
    } else if (style === 'gradient') {
      const gradientId = `grad-${Math.random().toString(36).substr(2, 9)}`
      paths += `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${color1};stop-opacity:1" /><stop offset="100%" style="stop-color:${color2};stop-opacity:1" /></linearGradient></defs>`

      const stripes = 5 + Math.floor(rng() * 8)
      const stripeWidth = 200 / stripes
      for (let s = 0; s < stripes; s++) {
        const rotation = rng() * 45 - 22.5
        paths += `<rect x="${s * stripeWidth}" y="0" width="${stripeWidth}" height="200" fill="url(#${gradientId})" opacity="${0.3 + rng() * 0.4}" transform="rotate(${rotation} ${s * stripeWidth + stripeWidth / 2} 100)" />`
      }
    }

    return `
      <svg viewBox="0 0 200 200" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="${bgColor}" />
        ${paths}
      </svg>
    `
  }, [email])

  return (
    <div
      className="rounded-full overflow-hidden"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
