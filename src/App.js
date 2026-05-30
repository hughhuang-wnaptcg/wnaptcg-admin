import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import Layout from './pages/Layout'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Cards from './pages/Cards'
import Boss from './pages/Boss'
import Settings from './pages/Settings'

function PrivateRoute({ children, admin, loading }) {
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 14, color: '#888' }}>載入中...</div>
  return admin ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchAdmin(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) fetchAdmin(session.user.id)
      else { setAdmin(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchAdmin(userId) {
    const { data } = await supabase.from('members').select('*').eq('id', userId).eq('is_admin', true).single()
    setAdmin(data || null)
    setLoading(false)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute admin={admin} loading={loading}><Layout admin={admin} setAdmin={setAdmin} /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="cards" element={<Cards />} />
          <Route path="boss" element={<Boss />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
