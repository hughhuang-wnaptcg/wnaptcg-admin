import React, { useEffect, useState, useRef } from 'react'
import { supabase, RARITY_COLORS } from '../lib/supabase'

const RARITIES = ['UR', 'HR', 'SAR', 'CSR', 'SR', 'SSR', 'AR', 'CHR', 'PROMO', 'Other']


export default function AdminCards() {
  const [cards, setCards] = useState([])
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', rarity: 'UR', series: '', episode: '', image_url: '', snkr_price: '', ownerEntries: [] })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: cardsData }, { data: membersData }] = await Promise.all([
      supabase.from('cards').select('*, card_owners(member_id, created_at, members(display_name))').order('created_at', { ascending: false }),
      supabase.from('members').select('id, display_name').order('display_name'),
    ])
    setCards(cardsData || [])
    setMembers(membersData || [])
  }


  // 圖片壓縮：限制最長邊 1200px，品質 0.82，輸出 webp
  function compressImage(file) {
    return new Promise((resolve) => {
      const MAX = 1200
      const QUALITY = 0.82
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
          const w = Math.round(img.width * ratio)
          const h = Math.round(img.height * ratio)
          const canvas = document.createElement('canvas')
          canvas.width = w; canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
          }, 'image/webp', QUALITY)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleUpload(e) {
    const raw = e.target.files[0]
    if (!raw) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(raw)
    setUploading(true)
    try {
      const file = await compressImage(raw)
      const path = `cards/${Date.now()}.webp`
      const { error: uploadError } = await supabase.storage.from('card-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: 'image/webp' })
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
      const ownerRows = form.ownerEntries.map(e => ({
        card_id: null,
        member_id: e.member_id,
        created_at: e.created_at || new Date().toISOString(),
      }))
      const payload = {
        name: form.name,
        rarity: form.rarity,
        series: form.series,
        episode: form.episode,
        image_url: form.image_url,
        snkr_price: form.snkr_price !== '' ? parseInt(form.snkr_price) : null,
      }
      if (modal === 'new') {
        const { data: newCard } = await supabase.from('cards').insert(payload).select().single()
        if (newCard && ownerRows.length > 0) {
          await supabase.from('card_owners').insert(ownerRows.map(r => ({ ...r, card_id: newCard.id })))
        }
      } else {
        await supabase.from('cards').update(payload).eq('id', modal.id)
        await supabase.from('card_owners').delete().eq('card_id', modal.id)
        if (ownerRows.length > 0) {
          await supabase.from('card_owners').insert(ownerRows.map(r => ({ ...r, card_id: modal.id })))
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
    setForm({ name: '', rarity: 'UR', series: '', episode: '', image_url: '', snkr_price: '', ownerEntries: [] })
    setPreview(null)
    setModal('new')
  }

  function openEdit(card) {
    setForm({
      name: card.name,
      rarity: card.rarity,
      series: card.series,
      episode: card.episode || '',
      image_url: card.image_url || '',
      snkr_price: card.snkr_price != null ? String(card.snkr_price) : '',
      ownerEntries: card.card_owners?.map(o => ({
        member_id: o.member_id,
        created_at: o.created_at ? o.created_at.slice(0, 10) : '',
      })) || []
    })
    setPreview(card.image_url || null)
    setModal(card)
  }

  function addOwner(memberId) {
    if (!memberId || form.ownerEntries.find(e => e.member_id === memberId)) return
    setForm(f => ({ ...f, ownerEntries: [...f.ownerEntries, { member_id: memberId, created_at: '' }] }))
  }

  function removeOwner(memberId) {
    setForm(f => ({ ...f, ownerEntries: f.ownerEntries.filter(e => e.member_id !== memberId) }))
  }

  function updateOwnerDate(memberId, date) {
    setForm(f => ({
      ...f,
      ownerEntries: f.ownerEntries.map(e => e.member_id === memberId ? { ...e, created_at: date } : e)
    }))
  }

  const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box' }

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
              {['卡牌', '稀有度', '系列', '開卡會員', '直播場次', 'SNKR 成交價', '新增日期', '操作'].map(h => (
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
                        <div key={o.member_id} title={`${o.members?.display_name}${o.created_at ? ' · ' + new Date(o.created_at).toLocaleDateString('zh-TW') : ''}`}
                          style={{ width: 22, height: 22, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#633806', border: '1.5px solid #fff', marginLeft: i > 0 ? -6 : 0 }}>
                          {o.members?.display_name?.[0]}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#999' }}>{card.episode || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {card.snkr_price != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 26, height: 26, background: '#111', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, flexShrink: 0 }}>
                          <span style={{ fontSize: 7, fontWeight: 500, color: '#fff', letterSpacing: '0.08em' }}>SNKR</span>
                          <span style={{ fontSize: 7, fontWeight: 500, color: '#fff', letterSpacing: '0.08em' }}>DUNK</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>$ {card.snkr_price.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#ccc', fontSize: 12 }}>—</span>
                    )}
                  </td>
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
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, width: 380, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
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
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：Charizard ex" style={inp} />
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
                <input value={form.episode} onChange={e => setForm({ ...form, episode: e.target.value })} placeholder="EP.47" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>系列名稱</label>
              <input value={form.series} onChange={e => setForm({ ...form, series: e.target.value })} placeholder="例：Obsidian Flames" style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 28, height: 28, background: '#111', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, flexShrink: 0 }}>
                    <span style={{ fontSize: 7, fontWeight: 500, color: '#fff', letterSpacing: '0.08em' }}>SNKR</span>
                    <span style={{ fontSize: 7, fontWeight: 500, color: '#fff', letterSpacing: '0.08em' }}>DUNK</span>
                  </div>
                  <span>成交價（選填）</span>
                </div>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#999', pointerEvents: 'none' }}>$</span>
                <input type="number" value={form.snkr_price} onChange={e => setForm({ ...form, snkr_price: e.target.value })} placeholder="例：12000" style={{ ...inp, paddingLeft: 22 }} />
              </div>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>留空表示不顯示成交價</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 8 }}>開卡會員（可多選）</label>
              {form.ownerEntries.length > 0 && (
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {form.ownerEntries.map(entry => {
                    const m = members.find(x => x.id === entry.member_id)
                    return (
                      <div key={entry.member_id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f8f8', borderRadius: 8, padding: '6px 10px', border: '0.5px solid #eee' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#333', flex: 1 }}>{m?.display_name}</div>
                        <input type="date" value={entry.created_at} onChange={e => updateOwnerDate(entry.member_id, e.target.value)}
                          style={{ fontSize: 11, border: '0.5px solid #ddd', borderRadius: 6, padding: '3px 6px', color: '#666', background: '#fff' }} />
                        <span onClick={() => removeOwner(entry.member_id)} style={{ fontSize: 14, color: '#bbb', cursor: 'pointer', lineHeight: 1 }}>✕</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <select value="" onChange={e => addOwner(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, background: '#fff', color: '#111' }}>
                <option value="">＋ 新增會員...</option>
                {members.filter(m => !form.ownerEntries.find(e => e.member_id === m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>日期留空則自動填入今天</div>
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
