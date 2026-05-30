import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      const { data: member } = await supabase.from('members').select('is_admin').eq('id', data.user.id).single()
      if (!member?.is_admin) {
        await supabase.auth.signOut()
        throw new Error('你沒有管理員權限')
      }
      navigate('/')
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? '帳號或密碼錯誤' : err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 360, border: '0.5px solid #e5e5e5' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.06em', color: '#111' }}>W/NA PTCG</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '3px auto', width: 120 }}>
            <div style={{ flex: 1, height: 0.5, background: '#ccc' }} />
            <span style={{ fontSize: 9, color: '#999' }}>X</span>
            <div style={{ flex: 1, height: 0.5, background: '#ccc' }} />
          </div>
          <div style={{ fontSize: 8, color: '#999', letterSpacing: '0.1em' }}>HUGO COLLECTIONS</div>
          <div style={{ marginTop: 16, fontSize: 18, fontWeight: 500, color: '#111' }}>管理員後台</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>請使用管理員帳號登入</div>
        </div>

        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@email.com" required
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 14, color: '#111', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>密碼</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 14, color: '#111', outline: 'none' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: loading ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '登入中...' : '登入後台'}
          </button>
        </form>
      </div>
    </div>
  )
}
