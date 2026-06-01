import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const NAV = [
  { path: '/',          label: '總覽',    icon: 'fa-chart-bar' },
  { path: '/members',   label: '會員管理', icon: 'fa-users' },
  { path: '/purchases', label: '消費記錄', icon: 'fa-bag-shopping' },
  { path: '/shipping',  label: '出貨管理', icon: 'fa-truck' },
  { path: '/cards',     label: '戰績牆',  icon: 'fa-trophy' },
  { path: '/boss',      label: 'Boss 管理', icon: 'fa-shield' },
  { path: '/grading',   label: '鑑定管理', icon: 'fa-medal' },
  { path: '/shop',      label: '商城管理', icon: 'fa-store' },
  { path: '/settings',  label: '系統設定', icon: 'fa-gear' },
]

export default function Layout({ admin, setAdmin }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  async function handleSignOut() {
    await supabase.auth.signOut()
    setAdmin(null)
    navigate('/login')
  }

  const isActive = (path) => path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 側邊欄 */}
      <div style={{ width: 200, background: '#fff', borderRight: '0.5px solid #e5e5e5', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '16px 14px 12px', borderBottom: '0.5px solid #e5e5e5' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: '#111' }}>W/NA PTCG</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, margin: '2px 0' }}>
            <div style={{ flex: 1, height: 0.5, background: '#ccc' }} />
            <span style={{ fontSize: 9, color: '#999' }}>X</span>
            <div style={{ flex: 1, height: 0.5, background: '#ccc' }} />
          </div>
          <div style={{ fontSize: 8, color: '#999', letterSpacing: '0.1em' }}>HUGO COLLECTIONS</div>
          <div style={{ marginTop: 6, display: 'inline-block', fontSize: 10, background: '#FCEBEB', color: '#791F1F', padding: '2px 7px', borderRadius: 20 }}>管理員</div>
        </div>

        <div style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: '#aaa', padding: '0 8px', marginBottom: 4 }}>主選單</div>
          {NAV.map(n => (
            <div key={n.path} onClick={() => navigate(n.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, marginBottom: 2,
                background: isActive(n.path) ? '#FCEBEB' : 'transparent',
                color: isActive(n.path) ? '#A32D2D' : '#666',
              }}>
              <i className={`fa-solid ${n.icon}`} style={{ fontSize: 14, width: 16, textAlign: 'center' }}></i>
              {n.label}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 14px', borderTop: '0.5px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 8 }}>
          {admin?.avatar_url
            ? <img src={admin.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#633806', flexShrink: 0 }}>
                {admin?.display_name?.[0]?.toUpperCase()}
              </div>
          }
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{admin?.display_name}</div>
            <div style={{ fontSize: 10, color: '#999' }}>超級管理員</div>
          </div>
          <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 13, cursor: 'pointer', color: '#aaa' }} onClick={handleSignOut} title="登出"></i>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  )
}
