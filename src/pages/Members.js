import React, { useEffect, useState } from 'react'
import { LevelBadge } from '../lib/pokeballs'
import { supabase, getLevel } from '../lib/supabase'

export default function AdminMembers() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [adjustPoints, setAdjustPoints] = useState({ type: 'add', amount: '', note: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

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

  async function handleToggleHidden(member) {
    const newVal = !member.is_hidden
    await supabase.from('members').update({ is_hidden: newVal }).eq('id', member.id)
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_hidden: newVal } : m))
  }

  async function handleAdjustPoints() {
    if (!adjustPoints.amount || !modal) return
    setSaving(true)
    const delta = adjustPoints.type === 'add' ? parseInt(adjustPoints.amount) : -parseInt(adjustPoints.amount)
    const newPoints = Math.max(0, modal.member.points + delta)
    const newLevel = getLevel(newPoints)
    await supabase.from('members').update({ points: newPoints, level: newLevel }).eq('id', modal.member.id)
    await supabase.from('point_logs').insert({ member_id: modal.member.id, type: 'manual', points: delta, note: adjustPoints.note || '管理員手動調整' })
    await fetchMembers()
    setModal(null)
    setAdjustPoints({ type: 'add', amount: '', note: '' })
    setSaving(false)
  }

  async function handleDeleteMember() {
    if (!modal?.member) return
    if (modal.member.is_admin) {
      alert('管理員帳號不能從會員列表刪除')
      return
    }
    setSaving(true)
    const uid = modal.member.id
    try {
      const { data, error } = await supabase.functions.invoke('delete-member', { body: { userId: uid } })
      if (error) throw new Error(await getFunctionErrorMessage(error))
      if (data?.error) throw new Error(data.error)
      await fetchMembers()
      setModal(null)
      setDeleteConfirmName('')
    } catch (err) {
      console.error('刪除失敗', err)
      alert('刪除失敗：' + err.message)
    }
    setSaving(false)
  }

  async function getFunctionErrorMessage(error) {
    const fallback = error.message || '未知錯誤'
    const response = error.context
    if (!response?.json) return fallback

    try {
      const body = await response.json()
      return body?.error || fallback
    } catch {
      return fallback
    }
  }

  const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box', background: '#fff' }
  const isDeleteConfirmed = deleteConfirmName === modal?.member?.display_name

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      <div style={{ fontSize: 20, fontWeight: 500, color: '#111', marginBottom: 16 }}>會員管理</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#aaa' }}></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋會員名稱或 Email..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#111', outline: 'none' }} />
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
          style={{ padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: '#fff' }}>
          <option value="">全部等級</option>
          {['精靈球','超級球','高級球','豪華球','貴重球','究極球','大師球'].map(l => <option key={l}>{l}</option>)}
