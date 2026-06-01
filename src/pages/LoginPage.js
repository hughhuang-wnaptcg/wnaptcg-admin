import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: member } = await supabase
          .from('members')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()
        if (member?.is_admin) {
          navigate('/', { replace: true })
        } else {
          await supabase.auth.signOut()
          setError('你的帳號沒有管理員權限')
          setLoading(false)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://wnaptcg-admin.vercel.app',
      }
    })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 360, border: '0.5px solid #e5e5e5' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.06em', color: '#111' }}>W/NA PTCG</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '3px auto', width: 120 }}>
            <div style={{ flex: 1, height: 0.5, background: '#ccc' }} />
            <span style={{ fontSize: 9, color: '#999' }}>X</span>
            <div style={{ flex: 1, height: 0.5, background: '#ccc' }} />
          </div>
          <div style={{ fontSize: 8, color: '#999', letterSpacing: '0.1em' }}>HUGO COLLECTIONS</div>
          <div style={{ marginTop: 16, fontSize: 18, fontWeight: 500, color: '#111' }}>管理員後台</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>請使用管理員 Google 帳號登入</div>
        </div>

        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button onClick={handleGoogleLogin} disabled={loading}
          style={{ width: '100%', padding: '11px 12px', background: loading ? '#f5f5f5' : '#fff', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 14, fontWeight: 500, color: loading ? '#aaa' : '#111', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.705A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.705V4.963H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.037l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.963L3.964 7.295C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
          )}
          {loading ? '登入中...' : '使用 Google 帳號登入'}
        </button>

        <div style={{ marginTop: 16, fontSize: 11, color: '#ccc', textAlign: 'center' }}>僅限授權管理員帳號</div>
      </div>
    </div>
  )
}
