// src/pages/Board.js
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const LEVEL_THEME = {
  '精靈球': { c: '#9A1F1F', bg: '#FFE3E3' },
  '超級球': { c: '#1A4A7A', bg: '#D6E6F8' },
  '高級球': { c: '#5A4A0A', bg: '#F5D04A' },
  '豪華球': { c: '#F5D060', bg: '#3A2A1A' },
  '貴重球': { c: '#F5C0C0', bg: '#3A1A1A' },
  '究極球': { c: '#A0C8F0', bg: '#152540' },
  '大師球': { c: '#F5D060', bg: '#1A1A1A' },
}

function levelTheme(level) {
  return LEVEL_THEME[level] || LEVEL_THEME['精靈球']
}

function toLocalDateStr(date) {
  const d = new Date(date)
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d - tzOffset).toISOString().split('T')[0]
}

export default function Board() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [filterDate, setFilterDate] = useState('')
  const [keyword, setKeyword] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('board_messages')
      .select('*').order('created_at', { ascending: false }).limit(500)
    setMessages(data || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('確定刪除這則留言？此動作無法復原。')) return
    setDeleting(id)
    const { data, error } = await supabase.from('board_messages').delete().eq('id', id).select('id')
    if (error) {
      alert('刪除失敗：' + error.message)
    } else if (!data || data.length === 0) {
      alert('刪除失敗：找不到留言或目前帳號沒有刪除權限')
    } else {
      setMessages(prev => prev.filter(m => m.id !== id))
    }
    setDeleting(null)
  }

  const allDates = [...new Set(messages.map(m => toLocalDateStr(m.created_at)))].sort((a, b) => b.localeCompare(a))

  const filtered = messages.filter(m => {
    const dateMatch = !filterDate || toLocalDateStr(m.created_at) === filterDate
    const kwMatch = !keyword || (m.message || '').includes(keyword) || (m.display_name || '').includes(keyword)
    return dateMatch && kwMatch
  })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>留言板管理</div>
        <button onClick={fetchAll} style={{ background: 'transparent', border: '0.5px solid #ddd', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="fa-solid fa-rotate" style={{ fontSize: 11 }}></i>重新整理
        </button>
      </div>

      {/* 篩選列 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-calendar-day" style={{ fontSize: 12, color: '#999' }}></i>
          <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 99, fontSize: 12, border: '0.5px solid #ddd', background: filterDate ? '#1a1a1a' : '#fff', color: filterDate ? '#fff' : '#666', cursor: 'pointer', outline: 'none' }}>
            <option value="">全部日期</option>
            {allDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 180 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 12, color: '#999' }}></i>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜尋留言內容或會員名稱"
            style={{ flex: 1, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#111', outline: 'none' }} />
        </div>
        <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>共 {filtered.length} 則</span>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
              {['會員', '等級', '留言內容', '時間', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
            ) : filtered.map(m => {
              const th = levelTheme(m.level)
              return (
                <tr key={m.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FAEEDA', color: '#633806', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{(m.display_name || '?').charAt(0)}</div>
                      }
                      <span style={{ fontWeight: 500, color: '#111' }}>{m.display_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: th.bg, color: th.c, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.level}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#333', maxWidth: 320, wordBreak: 'break-all' }}>{m.message}</td>
                  <td style={{ padding: '12px 14px', color: '#999', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {new Date(m.created_at).toLocaleDateString('zh-TW')}<br />
                    <span style={{ fontSize: 11 }}>{new Date(m.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id}
                      style={{ padding: '4px 10px', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, color: '#A32D2D', background: 'transparent', cursor: deleting === m.id ? 'not-allowed' : 'pointer' }}>
                      {deleting === m.id
                        ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 10 }}></i>
                        : <><i className="fa-solid fa-trash" style={{ fontSize: 10, marginRight: 3 }}></i>刪除</>
                      }
                    </button>
                  </td>
                </tr>
              )
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無留言</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
