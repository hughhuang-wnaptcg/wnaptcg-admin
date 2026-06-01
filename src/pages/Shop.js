import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const TIER_OPTIONS = [
  { value: 'general', label: '一般商城', icon: 'fa-store', color: '#E07B00', bg: '#FFF3E0' },
  { value: 'premium', label: '高級商城', icon: 'fa-gem',   color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'vip',     label: 'VIP 商城',  icon: 'fa-crown', color: '#B8860B', bg: '#2A2200' },
]

export default function Shop() {
  const [products, setProducts] = useState([])
  const [members, setMembers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('products') // products | orders | points
  const [modal, setModal] = useState(null) // null | 'new' | product
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', tier: 'general', is_active: true, image_url: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [filterTier, setFilterTier] = useState('')
  const [pointsForm, setPointsForm] = useState({ member_id: '', amount: '', note: '' })
  const [pointsSaving, setPointsSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: prods }, { data: mems }, { data: ords }] = await Promise.all([
      supabase.from('shop_products').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('id, display_name, shop_points, level').order('display_name'),
      supabase.from('shop_orders').select('*, members(display_name)').order('created_at', { ascending: false }).limit(100),
    ])
    setProducts(prods || [])
    setMembers(mems || [])
    setOrders(ords || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `shop/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('shop-images').upload(path, file, { upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('shop-images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: data.publicUrl }))
    } catch (err) { alert('圖片上傳失敗：' + err.message); setPreview(null) }
    setUploading(false)
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.stock) return
    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseInt(form.price),
      stock: parseInt(form.stock),
      tier: form.tier,
      is_active: form.is_active,
      image_url: form.image_url || null,
    }
    if (modal === 'new') {
      await supabase.from('shop_products').insert(payload)
    } else {
      await supabase.from('shop_products').update(payload).eq('id', modal.id)
    }
    await fetchAll()
    setModal(null)
    setPreview(null)
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('確定刪除此商品？')) return
    await supabase.from('shop_products').delete().eq('id', id)
    fetchAll()
  }

  async function handleToggleActive(prod) {
    await supabase.from('shop_products').update({ is_active: !prod.is_active }).eq('id', prod.id)
    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, is_active: !p.is_active } : p))
  }

  async function handleAddPoints() {
    if (!pointsForm.member_id || !pointsForm.amount) return
    setPointsSaving(true)
    const delta = parseInt(pointsForm.amount)
    const member = members.find(m => m.id === pointsForm.member_id)
    if (!member) { setPointsSaving(false); return }
    const newPoints = Math.max(0, (member.shop_points || 0) + delta)
    await supabase.from('members').update({ shop_points: newPoints }).eq('id', member.id)
    await supabase.from('points_logs').insert({
      member_id: member.id,
      points: delta,
      type: 'manual',
      note: pointsForm.note || '管理員手動調整點數',
    })
    await fetchAll()
    setPointsForm({ member_id: '', amount: '', note: '' })
    setPointsSaving(false)
  }

  function openNew() {
    setForm({ name: '', description: '', price: '', stock: '', tier: 'general', is_active: true, image_url: '' })
    setPreview(null)
    setModal('new')
  }

  function openEdit(prod) {
    setForm({
      name: prod.name,
      description: prod.description || '',
      price: prod.price,
      stock: prod.stock,
      tier: prod.tier,
      is_active: prod.is_active,
      image_url: prod.image_url || '',
    })
    setPreview(prod.image_url || null)
    setModal(prod)
  }

  const filtered = products.filter(p => !filterTier || p.tier === filterTier)

  const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box', background: '#fff' }

  const tierLabel = (tier) => TIER_OPTIONS.find(t => t.value === tier)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>商城管理</div>
        {tab === 'products' && (
          <button onClick={openNew} style={{ background: '#E07B00', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="fa-solid fa-plus"></i> 新增商品
          </button>
        )}
        {tab === 'points' && (
          <div style={{ fontSize: 12, color: '#bbb' }}>手動發放點數給會員</div>
        )}
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#f8f8f8', borderRadius: 10, padding: 3 }}>
        {[
          { key: 'products', label: '商品管理', icon: 'fa-box' },
          { key: 'orders',   label: '消費紀錄', icon: 'fa-receipt' },
          { key: 'points',   label: '點數管理', icon: 'fa-coins' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#111' : '#999', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <i className={`fa-solid ${t.icon}`} style={{ fontSize: 11 }}></i>{t.label}
          </button>
        ))}
      </div>

      {/* 商品管理 */}
      {tab === 'products' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[{ value: '', label: '全部商城' }, ...TIER_OPTIONS.map(t => ({ value: t.value, label: t.label }))].map(opt => (
              <button key={opt.value} onClick={() => setFilterTier(opt.value)}
                style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, border: `0.5px solid ${filterTier === opt.value ? '#E07B00' : '#ddd'}`, background: filterTier === opt.value ? '#FFF3E0' : '#fff', color: filterTier === opt.value ? '#E07B00' : '#666', cursor: 'pointer', fontWeight: filterTier === opt.value ? 600 : 400 }}>
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
                  {['商品', '商城', '點數', '庫存', '狀態', '操作'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
                ) : filtered.map(prod => {
                  const tc = tierLabel(prod.tier)
                  return (
                    <tr key={prod.id} style={{ borderBottom: '0.5px solid #f0f0f0', opacity: prod.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f8f8f8', border: '0.5px solid #eee', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {prod.image_url ? <img src={prod.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fa-solid fa-gift" style={{ fontSize: 15, color: '#ddd' }}></i>}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: '#111' }}>{prod.name}</div>
                            {prod.description && <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{prod.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {tc && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: tc.bg, color: tc.color, fontWeight: 600 }}>
                          <i className={`fa-solid ${tc.icon}`} style={{ fontSize: 9, marginRight: 3 }}></i>{tc.label}
                        </span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#E07B00' }}>{prod.price} 點</td>
                      <td style={{ padding: '10px 14px', color: prod.stock === 0 ? '#E24B4A' : '#111' }}>{prod.stock}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div onClick={() => handleToggleActive(prod)}
                          title={prod.is_active ? '點擊下架' : '點擊上架'}
                          style={{ width: 36, height: 20, borderRadius: 99, cursor: 'pointer', background: prod.is_active ? '#06C755' : '#e5e5e5', position: 'relative', transition: 'background 0.2s', display: 'inline-block' }}>
                          <div style={{ position: 'absolute', top: 2, left: prod.is_active ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left 0.2s' }} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => openEdit(prod)} style={{ padding: '4px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer', marginRight: 5 }}>
                          <i className="fa-solid fa-pen" style={{ fontSize: 10, marginRight: 3 }}></i>編輯
                        </button>
                        <button onClick={() => handleDelete(prod.id)} style={{ padding: '4px 10px', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, color: '#A32D2D', background: 'transparent', cursor: 'pointer' }}>
                          <i className="fa-solid fa-trash" style={{ fontSize: 10, marginRight: 3 }}></i>刪除
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無商品</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 消費紀錄 */}
      {tab === 'orders' && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
                {['會員', '商品', '扣除點數', '時間'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111' }}>{order.members?.display_name || '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{order.product_name}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#E24B4A' }}>-{order.points_spent} 點</td>
                  <td style={{ padding: '10px 14px', color: '#999' }}>{new Date(order.created_at).toLocaleDateString('zh-TW')}</td>
                </tr>
              ))}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無消費紀錄</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 點數管理 */}
      {tab === 'points' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* 手動發點 */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 16 }}>
              <i className="fa-solid fa-coins" style={{ color: '#E07B00', marginRight: 6 }}></i>手動調整點數
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>選擇會員</label>
              <select value={pointsForm.member_id} onChange={e => setPointsForm(f => ({ ...f, member_id: e.target.value }))} style={inp}>
                <option value=''>選擇會員...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.display_name}（{m.shop_points || 0} 點）</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>點數（正數增加，負數扣除）</label>
              <input type="number" value={pointsForm.amount} onChange={e => setPointsForm(f => ({ ...f, amount: e.target.value }))} placeholder="例：100 或 -50" style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>備註</label>
              <input value={pointsForm.note} onChange={e => setPointsForm(f => ({ ...f, note: e.target.value }))} placeholder="例：活動獎勵、消費補點..." style={inp} />
            </div>
            <button onClick={handleAddPoints} disabled={pointsSaving || !pointsForm.member_id || !pointsForm.amount}
              style={{ width: '100%', padding: 10, background: pointsSaving || !pointsForm.member_id || !pointsForm.amount ? '#ccc' : '#E07B00', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              {pointsSaving ? '處理中...' : '確認調整'}
            </button>
          </div>

          {/* 會員點數一覽 */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #eee', fontSize: 14, fontWeight: 600, color: '#111' }}>
              <i className="fa-solid fa-list" style={{ color: '#E07B00', marginRight: 6 }}></i>會員點數一覽
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '0.5px solid #f5f5f5' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#633806', flexShrink: 0 }}>
                    {m.display_name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{m.display_name}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>{m.level}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#E07B00' }}>{(m.shop_points || 0).toLocaleString()} 點</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 商品編輯 Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{modal === 'new' ? '新增商品' : '編輯商品'}</div>
              <span onClick={() => { setModal(null); setPreview(null) }} style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }}>✕</span>
            </div>

            {/* 圖片 */}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            <div onClick={() => !uploading && fileRef.current?.click()}
              style={{ border: '0.5px dashed #ddd', borderRadius: 8, marginBottom: 14, minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer', background: '#f8f8f8', overflow: 'hidden' }}>
              {preview
                ? <img src={preview} alt="" style={{ maxHeight: 120, objectFit: 'contain', borderRadius: 6 }} />
                : <div style={{ textAlign: 'center', color: '#aaa' }}>
                    <i className="fa-solid fa-image" style={{ fontSize: 24, display: 'block', marginBottom: 6 }}></i>
                    <div style={{ fontSize: 12 }}>{uploading ? '上傳中...' : '點擊上傳商品圖片'}</div>
                  </div>
              }
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>商品名稱 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：限定卡套" style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>商品描述</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="簡短描述..." style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>點數價格 *</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="50" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>庫存數量 *</label>
                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="10" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>所屬商城</label>
              <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))} style={inp}>
                {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                style={{ width: 36, height: 20, borderRadius: 99, cursor: 'pointer', background: form.is_active ? '#06C755' : '#e5e5e5', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: form.is_active ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: '#666' }}>{form.is_active ? '上架中' : '已下架'}</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setModal(null); setPreview(null) }} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
              <button onClick={handleSave} disabled={saving || uploading || !form.name || !form.price || !form.stock}
                style={{ flex: 1, padding: 9, background: saving || uploading || !form.name || !form.price || !form.stock ? '#ccc' : '#E07B00', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                {saving ? '儲存中...' : '儲存商品'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
