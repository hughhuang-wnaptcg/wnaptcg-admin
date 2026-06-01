import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = {
  submitted: { label: '已送出', color: '#E07B00', bg: '#FFF3E0' },
  grading:   { label: '鑑定中', color: '#1976D2', bg: '#E3F2FD' },
  returned:  { label: '已取回', color: '#388E3C', bg: '#E8F5E9' },
  sold:      { label: '已售出', color: '#757575', bg: '#F5F5F5' },
}

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL

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
    submitted_at: '', status: 'submitted', grade: '', notes: '', image_url: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: subs }, { data: mems }] = await Promise.all([
      supabase.from('grading_submissions').select('*, members(display_name)').order('created_at', { ascending: false }),
      supabase.from('members').select('id, display_name').order('display_name')
    ])
    setSubmissions(subs || [])
    setMembers(mems || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ member_id: '', card_name: '', card_set: '', grading_company: '', submitted_at: '', status: 'submitted', grade: '', notes: '', image_url: '' })
    setImageFile(null)
    setImagePreview(null)
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
      notes: row.notes || '',
      image_url: row.image_url || ''
    })
    setImageFile(null)
    setImagePreview(row.image_url || null)
    setModalOpen(true)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(file, submissionId) {
    const ext = file.name.split('.').pop()
    const path = `${submissionId}.${ext}`
    const { error } = await supabase.storage
      .from('grading-images')
      .upload(path, file, { upsert: true })
    if (error) throw error
    return `${SUPABASE_URL}/storage/v1/object/public/grading-images/${path}`
  }

  async function handleSave() {
    setUploading(true)
    try {
      let image_url = form.image_url

      if (editing) {
        if (imageFile) {
          image_url = await uploadImage(imageFile, editing)
        }
        const payload = {
          member_id: form.member_id,
          card_name: form.card_name,
          card_set: form.card_set || null,
          grading_company: form.grading_company || null,
          submitted_at: form.submitted_at || null,
          status: form.status,
          grade: form.grade === '' ? null : parseFloat(form.grade),
          notes: form.notes || null,
          image_url: image_url || null,
        }
        await supabase.from('grading_submissions').update(payload).eq('id', editing)
      } else {
        const payload = {
          member_id: form.member_id,
          card_name: form.card_name,
          card_set: form.card_set || null,
          grading_company: form.grading_company || null,
          submitted_at: form.submitted_at || null,
          status: form.status,
          grade: form.grade === '' ? null : parseFloat(form.grade),
          notes: form.notes || null,
          image_url: null,
        }
        const { data: inserted, error: insertError } = await supabase
          .from('grading_submissions').insert(payload).select().single()

        if (insertError) throw insertError

        if (imageFile && inserted) {
          image_url = await uploadImage(imageFile, inserted.id)
          await supabase.from('grading_submissions')
            .update({ image_url }).eq('id', inserted.id)
        }
      }

      setModalOpen(false)
      fetchAll()
    } catch (err) {
      alert('儲存失敗：' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('確定刪除？')) return
    await supabase.storage.from('grading-images').remove([`${id}.jpg`, `${id}.jpeg`, `${id}.png`, `${id}.webp`])
    await supabase.from('grading_submissions').delete().eq('id', id)
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
                {['', '會員', '卡片名稱', '系列', '鑑定公司', '送件日', '狀態', '分數', '備註', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '4px 12px', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(186,117,23,.07)' }}>
                  <td style={{ padding: '8px 8px 8px 12px', borderRadius: '14px 0 0 14px', width: 52 }}>
                    {row.image_url
                      ? <img src={row.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1.5px solid #F5E8C8' }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#F5E8C8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 20 }}>🃏</span>
                        </div>
                    }
                  </td>
                  <td style={{ padding: '12px 12px', fontWeight: 600, color: '#2D1A00', whiteSpace: 'nowrap' }}>{row.members?.display_name || '-'}</td>
                  <td style={{ padding: '12px 12px', fontWeight: 600, color: '#2D1A00' }}>{row.card_name}</td>
                  <td style={{ padding: '12px 12px', color: '#7a5c2e', fontSize: 13 }}>{row.card_set || '-'}</td>
                  <td style={{ padding: '12px 12px', color: '#7a5c2e', fontSize: 13 }}>{row.grading_company || '-'}</td>
                  <td style={{ padding: '12px 12px', color: '#7a5c2e', fontSize: 13, whiteSpace: 'nowrap' }}>{row.submitted_at || '-'}</td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{
                      background: STATUS_LABELS[row.status]?.bg,
                      color: STATUS_LABELS[row.status]?.color,
                      borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700
                    }}>
                      {STATUS_LABELS[row.status]?.label || row.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', color: '#2D1A00', fontWeight: 700 }}>{row.grade ?? '-'}</td>
                  <td style={{ padding: '12px 12px', color: '#7a5c2e', fontSize: 13, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.notes || '-'}</td>
                  <td style={{ padding: '12px 12px', borderRadius: '0 14px 14px 0', whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(row)}
                      style={{ background: '#FFF3E0', color: '#E07B00', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 13, marginRight: 6 }}>
                      編輯
                    </button>
                    <button onClick={() => handleDelete(row.id)}
                      style={{ background: '#FFF0F0', color: '#E53935', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>尚無紀錄</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFFBF2', borderRadius: 18, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(186,117,23,.18)' }}>
            <h3 style={{ fontWeight: 800, color: '#2D1A00', marginBottom: 20, fontSize: 18 }}>
              {editing ? '編輯鑑定紀錄' : '新增鑑定紀錄'}
            </h3>

            {/* 圖片上傳 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', display: 'block', marginBottom: 8 }}>卡片圖片</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', height: 160, borderRadius: 12,
                  border: '2px dashed #F5E8C8', background: '#FFF8EE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden'
                }}>
                {imagePreview
                  ? <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <div style={{ textAlign: 'center', color: '#BA7517' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>點擊上傳圖片</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>JPG / PNG / WEBP</div>
                    </div>
                }
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
              {imagePreview && (
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); setForm(f => ({ ...f, image_url: '' })) }}
                  style={{ marginTop: 6, fontSize: 12, color: '#E07B00', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  ✕ 移除圖片
                </button>
              )}
            </div>

            {/* 會員 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', display: 'block', marginBottom: 6 }}>會員 *</label>
              <select value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}
                style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', background: '#fff', color: '#2D1A00', fontSize: 14 }}>
                <option value=''>選擇會員</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </div>

            {/* 卡片名稱 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', display: 'block', marginBottom: 6 }}>卡片名稱 *</label>
              <input
                value={form.card_name}
                onChange={e => setForm(f => ({ ...f, card_name: e.target.value }))}
                placeholder="例：Charizard ex SAR"
                style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            {/* 系列 & 鑑定公司 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', display: 'block', marginBottom: 6 }}>系列</label>
                <input
                  value={form.card_set}
                  onChange={e => setForm(f => ({ ...f, card_set: e.target.value }))}
                  placeholder="例：sv8a"
                  style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', display: 'block', marginBottom: 6 }}>鑑定公司</label>
                <input
                  value={form.grading_company}
                  onChange={e => setForm(f => ({ ...f, grading_company: e.target.value }))}
                  placeholder="例：PSA"
                  style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* 送件日 & 狀態 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', display: 'block', marginBottom: 6 }}>送件日</label>
                <input
                  type="date"
                  value={form.submitted_at}
                  onChange={e => setForm(f => ({ ...f, submitted_at: e.target.value }))}
                  style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', display: 'block', marginBottom: 6 }}>狀態</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', background: '#fff', color: '#2D1A00', fontSize: 14 }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* 分數 & 備註 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 100 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', display: 'block', marginBottom: 6 }}>分數</label>
                <input
                  type="number"
                  value={form.grade}
                  onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                  placeholder="10"
                  style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#BA7517', display: 'block', marginBottom: 6 }}>備註</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="備註..."
                  style={{ width: '100%', borderRadius: 10, border: '1.5px solid #F5E8C8', padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* 按鈕 */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ borderRadius: 10, border: '1.5px solid #F5E8C8', background: '#fff', color: '#2D1A00', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={uploading || !form.member_id || !form.card_name}
                style={{
                  borderRadius: 10, border: 'none',
                  background: (uploading || !form.member_id || !form.card_name) ? '#ccc' : 'linear-gradient(135deg,#BA7517,#D4A94A)',
                  color: '#fff', padding: '10px 24px', fontWeight: 700,
                  cursor: (uploading || !form.member_id || !form.card_name) ? 'not-allowed' : 'pointer',
                  fontSize: 14
                }}>
                {uploading ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
