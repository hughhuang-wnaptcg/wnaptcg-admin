import { useState, useEffect, useRef } from 'react'
import { supabaseAdmin } from '../lib/supabase'

const STATUS_LABELS = {
  submitted: { label: '已送出', color: '#E07B00', bg: '#FFF3E0' },
  grading:   { label: '鑑定中', color: '#1976D2', bg: '#E3F2FD' },
  returned:  { label: '已取回', color: '#388E3C', bg: '#E8F5E9' },
  sold:      { label: '已售出', color: '#757575', bg: '#F5F5F5' },
}

const SUPABASE_URL = 'https://lgsrcxxrifhdsdvnaloh.supabase.co'

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
      supabaseAdmin.from('grading_submissions').select('*, members(display_name)').order('created_at', { ascending: false }),
      supabaseAdmin.from('members').select('id, display_name').order('display_name')
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
    const { error } = await supabaseAdmin.storage
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
        // 先上傳圖片（如果有新圖）
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
        await supabaseAdmin.from('grading_submissions').update(payload).eq('id', editing)
      } else {
        // 新增：先 insert 拿到 id，再上傳圖片
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
        const { data: inserted } = await supabaseAdmin
          .from('grading_submissions').insert(payload).select().single()

        if (imageFile && inserted) {
          image_url = await uploadImage(imageFile, inserted.id)
          await supabaseAdmin.from('grading_submissions')
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
    // 一併刪除 Storage 圖片
    await supabaseAdmin.storage.from('grading-images').remove([`${id}.jpg`, `${id}.jpeg`, `${id}.png`, `${id}.webp`])
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
                  <td style={{ padding: '12px 12px', fontWeight: 600, color: '#2D1A00', whiteSpace: 'nowrap' }}>{row.members?.di
