export const POKEBALL_SVG = {
  '精靈球': `<svg width="24" height="24" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="24" fill="#fff" stroke="#ccc" stroke-width="1"/>
    <path d="M2 26 A24 24 0 0 1 50 26 Z" fill="#E24B4A"/>
    <rect x="2" y="23" width="48" height="6" fill="#1a1a1a"/>
    <circle cx="26" cy="26" r="7" fill="#fff" stroke="#1a1a1a" stroke-width="2.5"/>
    <circle cx="26" cy="26" r="3.5" fill="#e8e8e8"/>
  </svg>`,

  '超級球': `<svg width="24" height="24" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="24" fill="#fff" stroke="#ccc" stroke-width="1"/>
    <path d="M2 26 A24 24 0 0 1 50 26 Z" fill="#378ADD"/>
    <polygon points="15,8 22,14 15,20 8,14" fill="#E24B4A"/>
    <polygon points="37,8 44,14 37,20 30,14" fill="#E24B4A"/>
    <rect x="2" y="23" width="48" height="6" fill="#1a1a1a"/>
    <circle cx="26" cy="26" r="7" fill="#fff" stroke="#1a1a1a" stroke-width="2.5"/>
    <circle cx="26" cy="26" r="3.5" fill="#e8e8e8"/>
  </svg>`,

  '高級球': `<svg width="24" height="24" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="gc"><circle cx="26" cy="26" r="23.5"/></clipPath></defs>
    <circle cx="26" cy="26" r="24" fill="#fff" stroke="#ccc" stroke-width="1"/>
    <path d="M2 26 A24 24 0 0 1 50 26 Z" fill="#3a3a3a" clip-path="url(#gc)"/>
    <rect x="17" y="2" width="6" height="22" fill="#EF9F27" clip-path="url(#gc)"/>
    <rect x="29" y="2" width="6" height="22" fill="#EF9F27" clip-path="url(#gc)"/>
    <rect x="2" y="23" width="48" height="6" fill="#1a1a1a" clip-path="url(#gc)"/>
    <circle cx="26" cy="26" r="7" fill="#fff" stroke="#1a1a1a" stroke-width="2.5"/>
    <circle cx="26" cy="26" r="3.5" fill="#e8e8e8"/>
  </svg>`,

  '豪華球': `<svg width="24" height="24" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="lc"><circle cx="26" cy="26" r="23.5"/></clipPath></defs>
    <circle cx="26" cy="26" r="24" fill="#111" stroke="#555" stroke-width="1"/>
    <rect x="2" y="9" width="48" height="2" fill="#BA7517" clip-path="url(#lc)"/>
    <rect x="2" y="11" width="48" height="6" fill="#E24B4A" clip-path="url(#lc)"/>
    <rect x="2" y="17" width="48" height="2" fill="#BA7517" clip-path="url(#lc)"/>
    <rect x="2" y="23" width="48" height="6" fill="#BA7517" clip-path="url(#lc)"/>
    <circle cx="26" cy="26" r="8" fill="#111" stroke="#BA7517" stroke-width="3"/>
    <circle cx="26" cy="26" r="4" fill="#BA7517"/>
    <circle cx="26" cy="26" r="2" fill="#EF9F27"/>
  </svg>`,

  '貴重球': `<svg width="24" height="24" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="24" fill="#111" stroke="#444" stroke-width="1"/>
    <path d="M2 26 A24 24 0 0 1 50 26 Z" fill="#A32D2D"/>
    <rect x="2" y="23" width="48" height="6" fill="#000"/>
    <circle cx="26" cy="26" r="7" fill="#111" stroke="#E24B4A" stroke-width="2.5"/>
    <circle cx="26" cy="26" r="3.5" fill="#E24B4A"/>
    <circle cx="26" cy="26" r="1.5" fill="#ff8888"/>
  </svg>`,

  '究極球': `<svg width="24" height="24" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="uc"><circle cx="26" cy="26" r="23.5"/></clipPath></defs>
    <circle cx="26" cy="26" r="24" fill="#2244bb" stroke="#4466dd" stroke-width="1.5"/>
    <line x1="26" y1="2" x2="26" y2="50" stroke="#66aaff" stroke-width="1" clip-path="url(#uc)"/>
    <line x1="2" y1="26" x2="50" y2="26" stroke="#66aaff" stroke-width="1" clip-path="url(#uc)"/>
    <circle cx="26" cy="26" r="18" fill="none" stroke="#66aaff" stroke-width="1"/>
    <circle cx="26" cy="26" r="10" fill="none" stroke="#66aaff" stroke-width="1"/>
    <ellipse cx="26" cy="8" rx="3" ry="7" fill="#EF9F27"/>
    <ellipse cx="26" cy="44" rx="3" ry="7" fill="#EF9F27"/>
    <ellipse cx="8" cy="26" rx="7" ry="3" fill="#EF9F27"/>
    <ellipse cx="44" cy="26" rx="7" ry="3" fill="#EF9F27"/>
    <circle cx="26" cy="26" r="6" fill="#2244bb" stroke="#88bbff" stroke-width="1.5"/>
    <circle cx="26" cy="26" r="3" fill="#aaccff"/>
  </svg>`,

  '大師球': `<svg width="24" height="24" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="mc"><circle cx="26" cy="26" r="23.5"/></clipPath></defs>
    <circle cx="26" cy="26" r="24" fill="#fff" stroke="#ccc" stroke-width="1"/>
    <path d="M2 26 A24 24 0 0 1 50 26 Z" fill="#7755cc" clip-path="url(#mc)"/>
    <ellipse cx="14" cy="13" rx="8" ry="5.5" fill="#E24B4A" clip-path="url(#mc)"/>
    <ellipse cx="38" cy="13" rx="8" ry="5.5" fill="#E24B4A" clip-path="url(#mc)"/>
    <text x="26" y="23" text-anchor="middle" font-size="13" font-weight="bold" fill="#fff" font-family="sans-serif">M</text>
    <rect x="2" y="23" width="48" height="6" fill="#1a1a1a"/>
    <circle cx="26" cy="26" r="7" fill="#fff" stroke="#1a1a1a" stroke-width="2.5"/>
    <circle cx="26" cy="26" r="3.5" fill="#e8e8e8"/>
  </svg>`,
}

export function PokeballIcon({ level, size = 24 }) {
  const svg = POKEBALL_SVG[level]
  if (!svg) return null
  const sized = svg.replace('width="24"', `width="${size}"`).replace('height="24"', `height="${size}"`)
  return <span dangerouslySetInnerHTML={{ __html: sized }} style={{ display: 'inline-flex', alignItems: 'center' }} />
}


export function LevelBadge({ level, size = 'md' }) {
  const sizes = {
    sm: { fontSize: 10, iconSize: 12, padding: '2px 6px' },
    md: { fontSize: 12, iconSize: 14, padding: '3px 8px' },
    lg: { fontSize: 13, iconSize: 16, padding: '4px 10px' },
  }
  const s = sizes[size] || sizes.md
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E6F1FB', color: '#0C447C', fontSize: s.fontSize, padding: s.padding, borderRadius: 20 }}>
      <PokeballIcon level={level} size={s.iconSize} />
      {level}
    </span>
  )
}
