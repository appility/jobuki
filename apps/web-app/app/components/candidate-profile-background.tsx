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

const palettes = [
  ['#EEF2FF', '#E0E7FF', '#F5D0FE'],
  ['#ECFEFF', '#DBEAFE', '#EDE9FE'],
  ['#FFF7ED', '#FFE4E6', '#F3E8FF'],
  ['#F0FDF4', '#DCFCE7', '#E0F2FE'],
  ['#FAFAF9', '#E7E5E4', '#DDD6FE'],
]

interface CandidateProfileBackgroundProps {
  artSeed: number
}

export function CandidateProfileBackground({ artSeed }: CandidateProfileBackgroundProps) {
  const seed = artSeed
  const random = seededRandom(seed)

  const palette = palettes[seed % palettes.length]

  const blobs = Array.from({ length: 4 }).map((_, index) => ({
    id: index,
    x: random() * 100,
    y: random() * 100,
    size: 160 + random() * 240,
    colour: palette[index % palette.length],
    opacity: 0.45 + random() * 0.25,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${palette[0]}, white 60%, ${palette[1]})`,
        }}
      />

      {blobs.map((blob) => (
        <div
          key={blob.id}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${blob.x}%`,
            top: `${blob.y}%`,
            width: blob.size,
            height: blob.size,
            backgroundColor: blob.colour,
            opacity: blob.opacity,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.16]"
        viewBox="0 0 800 260"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 16 }).map((_, index) => {
          const y = 20 + index * 16
          const offset = (seed % 80) + index * 7

          return (
            <path
              key={index}
              d={`M -100 ${y} C ${150 + offset} ${y - 40}, ${300 - offset} ${y + 40}, 900 ${y}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          )
        })}
      </svg>
    </div>
  )
}
