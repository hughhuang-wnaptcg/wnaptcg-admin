import React, { useEffect, useState } from 'react'
import { LevelBadge } from '../lib/pokeballs'
import { supabase, getLevel } from '../lib/supabase'

const LEVEL_COLORS = { '精靈球': '#888780', '超級球': '#378ADD', '高級球': '#E24B4A', '豪華球': '#BA7517', '貴重球': '#854F0B', '究極球': '#534AB7', '大師球': '#26215C' }
const LEVEL_BG = { '精靈球': '#F1EFE8', '超級球': '#E6F1FB', '高級球': '#FCEBEB', '豪華球': '#FAEEDA', '貴重球': '#EAF3DE', '究極球': '#EEEDFE', '大師球': '#2C2C2A' }
const LEVEL_TEXT = { '精靈球': '#444441', '超級球': '#0C447C', '高級球': '#791F1F', '豪華球': '#633806', '貴重球': '#27500A', '究極球': '#26215C', '大師球': '#D3D1C7' }

export default function AdminMembers() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [adjustPoints, setAdjustPoints] = useState({ type: 'add', amount: '', note: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    const { data } = await supabase.from('members').select('*').order('points', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  const filtered = members.filter(m => {
    const matchSearch = !search || m.display_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
    const matchLevel = !levelFilter || m.level === levelFilter
    return matchSearch && matchLevel
  })

  async function handleAdjustPoints() {
    if (!adjustPoints.amount || !modal) return
    setSaving(true)
    const delta = adjustPoints.type === 'add' ? parseInt(adjustPoints.amount) : -parseInt(adjustPoints.amount)
    const newPoints = Math.max(0, modal.points + delta)
    const newLevel = getLevel(newPoints)
    await supabase.from('members').update({ points: newPoints, level: newLevel }).eq('id', modal.id)
    await supabase.from('point_logs').insert({ member_id: modal.id, type: 'manual', points: delta, note: adjustPoints.note || '管理員手動調整' })
    await fetchMembers()
    setModal(null)
    setAdjustPoints({ type: 'add', amount: '', note: '' })
    setSaving(false)
  }

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>會員管理</div>
      </div>

      {/* 工具列 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#aaa' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜尋會員名稱或 Email..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#111', outline: 'none' }} />
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
          style={{ padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: '#fff' }}>
          <option value="">全部等級</option>
          {['精靈球', '超級球', '高級球', '豪華球', '貴重球', '究極球', '大師球'].map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* 表格 */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
              {['會員', '等級', '累積積分', '累積消費', '加入日期', '最後登入', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
            ) : filtered.map(m => (
              <tr key={m.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#633806', flexShrink: 0 }}>{m.display_name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 500, color: '#111' }}>{m.display_name}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{m.email || 'LINE會員'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <LevelBadge level={m.level} size='sm' />
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111' }}>{m.points?.toLocaleString()}</td>
                <td style={{ padding: '10px 14px', color: '#666' }}>${m.total_spent?.toLocaleString()}</td>
                <td style={{ padding: '10px 14px', color: '#999' }}>{new Date(m.created_at).toLocaleDateString('zh-TW')}</td>
                <td style={{ padding: '10px 14px', color: '#999' }}>{m.last_login_date || '-'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button onClick={() => setModal(m)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer' }}>
                    💰 調整積分
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', fontSize: 12, color: '#999', borderTop: '0.5px solid #f0f0f0' }}>
          共 {filtered.length} 位會員
        </div>
      </div>

      {/* 調整積分彈出視窗 */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, width: 340, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>調整積分</div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => setModal(null)}>✕</span>
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>手動增加或扣除會員積分</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f8f8f8', borderRadius: 8, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#633806' }}>{modal.display_name[0]}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{modal.display_name}</div>
                <div style={{ fontSize: 11, color: '#999' }}>目前積分：{modal.points?.toLocaleString()} · {modal.level}</div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>調整類型</label>
              <select value={adjustPoints.type} onChange={e => setAdjustPoints({ ...adjustPoints, type: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', background: '#fff' }}>
                <option value="add">增加積分</option>
                <option value="subtract">扣除積分</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>積分數量</label>
              <input type="number" value={adjustPoints.amount} onChange={e => setAdjustPoints({ ...adjustPoints, amount: e.target.value })}
                placeholder="輸入數量..."
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
              {adjustPoints.amount && (
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  調整後：{Math.max(0, modal.points + (adjustPoints.type === 'add' ? 1 : -1) * parseInt(adjustPoints.amount || 0)).toLocaleString()} 點
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>備註（選填）</label>
              <input value={adjustPoints.note} onChange={e => setAdjustPoints({ ...adjustPoints, note: e.target.value })}
                placeholder="例：活動獎勵、手動補正..."
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
              <button onClick={handleAdjustPoints} disabled={saving || !adjustPoints.amount}
                style={{ flex: 1, padding: 9, background: saving ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '處理中...' : '確認調整'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
