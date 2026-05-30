import React, { useEffect, useState, useRef } from 'react'
import { supabase, RARITY_COLORS } from '../lib/supabase'

const RARITIES = ['UR', 'HR', 'SAR', 'CSR', 'SR', 'SSR', 'AR', 'CHR', 'PROMO', 'Other']

export default function AdminCards() {
  const [cards, setCards] = useState([])
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', rarity: 'UR', series: '', episode: '', image_url: '', ownerIds: [] })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: cardsData }, { data: membersData }] = await Promise.all([
      supabase.from('cards').select('*, card_owners(member_id, members(display_name))').order('created_at', { ascending: false }),
      supabase.from('members').select('id, display_name').order('display_name'),
    ])
    setCards(cardsData || [])
    setMembers(membersData || [])
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    // 先顯示預覽
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `cards/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('card-images').upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('card-images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: data.publicUrl }))
    } catch (err) {
      alert('圖片上傳失敗：' + err.message)
      setPreview(null)
    }
    setUploading(false)
  }

  async function handleSave() {
    if (!form.name || !form.series) return
    setSaving(true)
    try {
      if (modal === 'new') {
        const { data: newCard } = await supabase.from('cards').insert({ name: form.name, rarity: form.rarity, series: form.series, episode: form.episode, image_url: form.image_url }).select().single()
        if (newCard && form.ownerIds.length > 0) {
          await supabase.from('card_owners').insert(form.ownerIds.map(id => ({ card_id: newCard.id, member_id: id })))
        }
      } else {
        await supabase.from('cards').update({ name: form.name, rarity: form.rarity, series: form.series, episode: form.episode, image_url: form.image_url }).eq('id', modal.id)
        await supabase.from('card_owners').delete().eq('card_id', modal.id)
        if (form.ownerIds.length > 0) {
          await supabase.from('card_owners').insert(form.ownerIds.map(id => ({ card_id: modal.id, member_id: id })))
        }
      }
      await fetchData()
      setModal(null)
      setPreview(null)
    } catch (err) {
      alert('儲存失敗：' + err.message)
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('確定刪除這張卡牌？')) return
    await supabase.from('cards').delete().eq('id', id)
    await fetchData()
  }

  function openNew() {
    setForm({ name: '', rarity: 'UR', series: '', episode: '', image_url: '', ownerIds: [] })
    setPreview(null)
    setModal('new')
  }

  function openEdit(card) {
    setForm({ name: card.name, rarity: card.rarity, series: card.series, episode: card.episode || '', image_url: card.image_url || '', ownerIds: card.card_owners?.map(o => o.member_id) || [] })
    setPreview(card.image_url || null)
    setModal(card)
  }

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>戰績牆管理</div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E24B4A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          ＋ 新增卡牌
        </button>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
              {['卡牌', '稀有度', '系列', '開卡會員', '直播場次', '新增日期', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.map(card => {
              const rc = RARITY_COLORS[card.rarity] || RARITY_COLORS.Other
              return (
                <tr key={card.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 38, borderRadius: 4, background: '#f5f5f5', border: '0.5px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {card.image_url ? <img src={card.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14, color: '#ddd' }}>🎴</span>}
                      </div>
                      <span style={{ fontWeight: 500, color: '#111' }}>{card.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 500, background: rc.bg, color: rc.color }}>{card.rarity}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{card.series}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex' }}>
                      {card.card_owners?.map((o, i) => (
                        <div key={o.member_id} style={{ width: 22, height: 22, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#633806', border: '1.5px solid #fff', marginLeft: i > 0 ? -6 : 0 }} title={o.members?.display_name}>
                          {o.members?.display_name?.[0]}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#999' }}>{card.episode || '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#999' }}>{new Date(card.created_at).toLocaleDateString('zh-TW')}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => openEdit(card)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer', marginRight: 4 }}>✏️ 編輯</button>
                    <button onClick={() => handleDelete(card.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, color: '#A32D2D', background: 'transparent', cursor: 'pointer' }}>🗑️ 刪除</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, width: 360, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{modal === 'new' ? '新增卡牌' : '編輯卡牌'}</div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => { setModal(null); setPreview(null) }}>✕</span>
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>填寫資訊後儲存</div>

            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />

            <div onClick={() => !uploading && fileRef.current?.click()}
              style={{ border: '0.5px dashed #ddd', borderRadius: 8, padding: 16, textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer', background: '#f8f8f8', marginBottom: 14, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              {preview ? (
                <img src={preview} alt="" style={{ maxHeight: 120, objectFit: 'contain', borderRadius: 6 }} />
              ) : (
                <>
                  <div style={{ fontSize: 24, color: '#aaa', marginBottom: 4 }}>📷</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{uploading ? '上傳中...' : '點擊上傳卡牌圖片'}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>JPG / PNG · 建議 3:4</div>
                </>
              )}
            </div>
            {preview && !uploading && (
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <span onClick={() => fileRef.current?.click()} style={{ fontSize: 12, color: '#E24B4A', cursor: 'pointer' }}>重新上傳</span>
              </div>
            )}
            {uploading && <div style={{ textAlign: 'center', fontSize: 12, color: '#999', marginBottom: 10 }}>上傳中，請稍候...</div>}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>卡牌名稱</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：Charizard ex"
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>稀有度</label>
                <select value={form.rarity} onChange={e => setForm({ ...form, rarity: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, background: '#fff', color: '#111' }}>
                  {RARITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>直播場次</label>
                <input value={form.episode} onChange={e => setForm({ ...form, episode: e.target.value })} placeholder="EP.47"
                  style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>系列名稱</label>
              <input value={form.series} onChange={e => setForm({ ...form, series: e.target.value })} placeholder="例：Obsidian Flames"
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>開卡會員（可多選）</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                {form.ownerIds.map(id => {
                  const m = members.find(x => x.id === id)
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#E6F1FB', color: '#0C447C', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>
                      {m?.display_name}
                      <span style={{ cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, ownerIds: f.ownerIds.filter(x => x !== id) }))}>✕</span>
                    </div>
                  )
                })}
              </div>
              <select
                value=""
                onChange={e => {
                  const val = e.target.value
                  if (val && !form.ownerIds.includes(val)) {
                    setForm(f => ({ ...f, ownerIds: [...f.ownerIds, val] }))
                  }
                }}
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, background: '#fff', color: '#111' }}>
                <option value="">＋ 新增會員...</option>
                {members.filter(m => !form.ownerIds.includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setModal(null); setPreview(null) }} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
              <button onClick={handleSave} disabled={saving || uploading}
                style={{ flex: 1, padding: 9, background: saving || uploading ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: saving || uploading ? 'not-allowed' : 'pointer' }}>
                {saving ? '儲存中...' : uploading ? '上傳中...' : '儲存卡牌'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
