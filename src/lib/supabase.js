import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: 'wnaptcg-admin-auth',
    autoRefreshToken: true,
    persistSession: true,
  }
})

export const LEVELS = [
  { name: '精靈球', min: 0 },
  { name: '超級球', min: 1000 },
  { name: '高級球', min: 10000 },
  { name: '豪華球', min: 20000 },
  { name: '貴重球', min: 50000 },
  { name: '究極球', min: 100000 },
  { name: '大師球', min: 300000 },
]

export const getLevel = (points) => {
  let level = '精靈球'
  for (const l of LEVELS) {
    if (points >= l.min) level = l.name
  }
  return level
}

export const RARITY_COLORS = {
  UR: { bg: '#FCEBEB', color: '#791F1F' },
  HR: { bg: '#FAEEDA', color: '#633806' },
  SAR: { bg: '#EEEDFE', color: '#26215C' },
  CSR: { bg: '#E1F5EE', color: '#04342C' },
  SR: { bg: '#E6F1FB', color: '#0C447C' },
  SSR: { bg: '#FBEAF0', color: '#4B1528' },
  AR: { bg: '#EAF3DE', color: '#173404' },
  CHR: { bg: '#F1EFE8', color: '#2C2C2A' },
  PROMO: { bg: '#FAEEDA', color: '#412402' },
  Other: { bg: '#F1EFE8', color: '#444441' },
}
