import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../lib/supabase'

const STATUS_LABELS = {
  submitted: { label: '已送出', color: '#E07B00', bg: '#FFF3E0' },
  grading:   { label: '鑑定中', color: '#1976D2', bg: '#E3F2FD' },
  returned:  { label: '已取回', color: '#388E3C', bg: '#E8F5E9' },
  sold:      { label: '已售出', color: '#757575', bg: '#F5F5F5' },
}

export default function Grading() {
  const [submissions, setSubmissions] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterMember, setFilterMember] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState({
    member_id: '', card_name: '', card_set: '', grading_company: '',
    submitted_at: '', status: 'submitted', grade: '', notes: ''
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: subs }, { data: mems }] = await Promise.all([
      supabaseAdmin.from('grading_submissions').select('*, members(display_name)').order('created_at', { ascending: false }),
      supabaseAdmin.from('members').select('id, display_name').order('display_name')
    ])
    setSubmissions(subs || [])
    setMembers(mems || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ member_id: '', card_name: '', card_set: '', grading_company: '', submitted_at: '', status: 'submitted', grade: '', notes: '' })
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row.id)
    setForm({
      member_id: row.member_id,
      card_name: row.card_name,
      card_set: row.card_set || '',
      grading_company: row.grading_company || '',
      submitted_at: row.submitted_at || '',
      status: row.status,
      grade: row.grade ?? '',
      notes: row.notes || ''
    })
    setModalOpen(true)
  }

  async function handleSave() {
    const payload = {
      ...form,
      grade: form.grade === '' ? null : parseFloat(form.grade),
      submitted_at: form.submitted_at || null,
    }
    if (editing) {
      await supabaseAdmin.from('grading_submissions').update(payload).eq('id', editing)
    } else {
      await supabaseAdmin.from('grading_submissions').insert(payload)
    }
    setModalOpen(false)
    fetchAll()
  }

  async function handleDelete(id) {
    if (!window.confirm('確定刪除？')) return
    await supabaseAdmin.from('grading_submissions').delete().eq('id', id)
    fetchAll()
  }

  const filtered = submissions.filter(s => {
    const matchMember = filterMember ? s.member_id === filterMember : true
    const matchStatus = filterStatus ? s.status === filterStatus : true
    return matchMember && matchStatus
  })

  return (
    <div style={{ padding: '24px', background: '#FFFBF2', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, color: '#2D1A00', fontSize: 22, margin: 0 }}>鑑定管理</h2>
        <button onClick={openCreate} style={{ background: 'linear-gradient(135deg,#BA7517,#D4A94A)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
          + 新增紀錄
        </button>
      </div>

      {/* 篩選列 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
          style={{ borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '8px 12px', background: '#fff', color: '#2D1A00', fontSize: 14 }}>
          <option value=''>所有會員</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '8px 12px', background: '#fff', color: '#2D1A00', fontSize: 14 }}>
          <option value=''>所有狀態</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* 表格 */}
      {loading ? (
        <p style={{ color: '#aaa' }}>載入中…</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: '#BA7517', fontSize: 13 }}>
                {['會員', '卡片名稱', '系列', '鑑定公司', '送件日', '狀態', '分數', '備註', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 12px', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(186,117,23,.07)' }}>
                  <td style={{ padding: '12px 12px', borderRadius: '14px 0 0 14px', fontWeight: 600, color: '#2D1A00', whiteSpace: 'nowrap' }}>{row.members?.display_name}</td>
                  <td style={{ padding: '12px 12px', color: '#2D1A00' }}>{row.card_name}</td>
                  <td style={{ padding: '12px 12px', color: '#888' }}>{row.card_set || '-'}</td>
                  <td style={{ padding: '12px 12px', color: '#888' }}>{row.grading_company || '-'}</td>
                  <td style={{ padding: '12px 12px', color: '#888', whiteSpace: 'nowrap' }}>{row.submitted_at || '-'}</td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ background: STATUS_LABELS[row.status]?.bg, color: STATUS_LABELS[row.status]?.color, borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 700 }}>
                      {STATUS_LABELS[row.status]?.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', color: '#2D1A00', fontWeight: 700 }}>{row.grade ?? '-'}</td>
                  <td style={{ padding: '12px 12px', color: '#888', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.notes || '-'}</td>
                  <td style={{ padding: '12px 12px', borderRadius: '0 14px 14px 0', whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(row)} style={{ background: '#FFF3E0', color: '#E07B00', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', marginRight: 6 }}>編輯</button>
                    <button onClick={() => handleDelete(row.id)} style={{ background: '#FFF0F0', color: '#E53935', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, cursor: 'pointer' }}>刪除</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#aaa', padding: 32 }}>尚無資料</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFBF2', borderRadius: 20, padding: 32, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(186,117,23,.18)' }}>
            <h3 style={{ fontWeight: 800, color: '#2D1A00', marginBottom: 20, fontSize: 18 }}>{editing ? '編輯紀錄' : '新增鑑定紀錄'}</h3>
            {[
              { label: '會員', key: 'member_id', type: 'select' },
              { label: '卡片名稱 *', key: 'card_name', type: 'text' },
              { label: '系列 / 卡包', key: 'card_set', type: 'text' },
              { label: '鑑定公司', key: 'grading_company', type: 'text' },
              { label: '送件日期', key: 'submitted_at', type: 'date' },
              { label: '狀態', key: 'status', type: 'status' },
              { label: '鑑定分數', key: 'grade', type: 'number' },
              { label: '備註', key: 'notes', type: 'textarea' },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#BA7517', fontWeight: 700, display: 'block', marginBottom: 4 }}>{label}</label>
                {type === 'select' ? (
                  <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', background: '#fff', color: '#2D1A00', fontSize: 15 }}>
                    <option value=''>選擇會員</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                  </select>
                ) : type === 'status' ? (
                  <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', background: '#fff', color: '#2D1A00', fontSize: 15 }}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                ) : type === 'textarea' ? (
                  <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    rows={3} style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', background: '#fff', color: '#2D1A00', fontSize: 15, resize: 'vertical', boxSizing: 'border-box' }} />
                ) : (
                  <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', background: '#fff', color: '#2D1A00', fontSize: 15, boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={handleSave} style={{ flex: 1, background: 'linear-gradient(135deg,#BA7517,#D4A94A)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                {editing ? '儲存' : '新增'}
              </button>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, background: '#F5E8C8', color: '#2D1A00', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
