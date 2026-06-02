import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ORDER_STATUS_OPTIONS = [
  { value: 'pending',    label: '未出貨',  color: '#E07B00', bg: '#FFF3E0' },
  { value: 'processing', label: '處理中',  color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'shipped',    label: '已出貨',  color: '#7C3AED', bg: '#F5F3FF' },
  { value: 'completed',  label: '已完成',  color: '#16A34A', bg: '#F0FFF4' },
  { value: 'cancelled',  label: '已取消',  color: '#999',    bg: '#F5F5F5' },
]

export default function TodayMenu() {
  const [tab, setTab] = useState('items') // 'items' | 'orders'
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | item object
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', dine_in: true, takeout: true, is_active: true, image_url: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [updatingOrder, setUpdatingOrder] = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: itemsData }, { data: ordersData }] = await Promise.all([
      supabase.from('menu_items').select('*').order('created_at', { ascending: false }),
      supabase.from('menu_orders')
        .select('*, members(display_name), menu_order_items(*)')
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    setItems(itemsData || [])
    setOrders(ordersData || [])
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
      const path = `menu/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('card-images').upload(path, file, { upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('card-images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: data.publicUrl }))
    } catch (err) { alert('圖片上傳失敗：' + err.message); setPreview(null) }
    setUploading(false)
  }

  async function handleSave() {
    if (!form.name || form.price === '' || form.stock === '') return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseInt(form.price),
      stock: parseInt(form.stock),
      dine_in: form.dine_in,
      takeout: form.takeout,
      is_active: form.is_active,
      image_url: form.image_url || null,
    }
    if (modal === 'new') {
      await supabase.from('menu_items').insert(payload)
    } else {
      await supabase.from('menu_items').update(payload).eq('id', modal.id)
    }
    await fetchAll(); setModal(null); setPreview(null); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('確定刪除此品項？')) return
    await supabase.from('menu_items').delete().eq('id', id)
    await fetchAll()
  }

  async function handleToggleActive(item) {
    await supabase.from('menu_items').update({ is_active: !item.is_active }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
  }

  async function handleUpdateOrderStatus(orderId, newStatus) {
    setUpdatingOrder(orderId)
    await supabase.from('menu_orders').update({ status: newStatus }).eq('id', orderId)
    await fetchAll()
    setUpdatingOrder(null)
  }

  function openNew() {
    setForm({ name: '', description: '', price: '', stock: '', dine_in: true, takeout: true, is_active: true, image_url: '' })
    setPreview(null); setModal('new')
  }

  function openEdit(item) {
    setForm({ name: item.name, description: item.description || '', price: item.price, stock: item.stock, dine_in: item.dine_in, takeout: item.takeout, is_active: item.is_active, image_url: item.image_url || '' })
    setPreview(item.image_url || null); setModal(item)
  }

  const filteredOrders = orders.filter(o => !filterStatus || o.status === filterStatus)
  const pendingCount = orders.filter(o => o.status === 'pending').length

  const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box', background: '#fff' }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>本日菜單管理</div>
        {tab === 'items' && (
          <button onClick={openNew} style={{ background: '#388E3C', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="fa-solid fa-plus"></i> 新增品項
          </button>
        )}
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#f8f8f8', borderRadius: 10, padding: 3 }}>
        {[
          { key: 'items',  label: '菜單品項', icon: 'fa-bowl-food' },
          { key: 'orders', label: '訂單管理', icon: 'fa-receipt', badge: pendingCount },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#111' : '#999', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, position: 'relative' }}>
            <i className={`fa-solid ${t.icon}`} style={{ fontSize: 11 }}></i>{t.label}
            {t.badge > 0 && <span style={{ position: 'absolute', top: 4, right: 8, background: '#E24B4A', color: '#fff', borderRadius: 99, fontSize: 9, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── 菜單品項 ── */}
      {tab === 'items' && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
                {['品項', '價格', '庫存', '用餐方式', '狀態', '操作'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
              ) : items.map(item => (
                <tr key={item.id} style={{ borderBottom: '0.5px solid #f0f0f0', opacity: item.is_active ? 1 : 0.5 }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F1F8E9', border: '0.5px solid #C8E6C9', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fa-solid fa-bowl-food" style={{ fontSize: 15, color: '#81C784' }}></i>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#111' }}>{item.name}</div>
                        {item.description && <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{item.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#388E3C' }}>$ {item.price}</td>
                  <td style={{ padding: '10px 14px', color: item.stock === 0 ? '#E24B4A' : '#111' }}>{item.stock}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {item.dine_in && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#E8F5E9', color: '#388E3C', fontWeight: 600 }}>內用</span>}
                      {item.takeout && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#E3F2FD', color: '#1976D2', fontWeight: 600 }}>外帶</span>}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div onClick={() => handleToggleActive(item)}
                      style={{ width: 36, height: 20, borderRadius: 99, cursor: 'pointer', background: item.is_active ? '#06C755' : '#e5e5e5', position: 'relative', transition: 'background 0.2s', display: 'inline-block' }}>
                      <div style={{ position: 'absolute', top: 2, left: item.is_active ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left 0.2s' }} />
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => openEdit(item)} style={{ padding: '4px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer', marginRight: 5 }}>
                      <i className="fa-solid fa-pen" style={{ fontSize: 10, marginRight: 3 }}></i>編輯
                    </button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: '4px 10px', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, color: '#A32D2D', background: 'transparent', cursor: 'pointer' }}>
                      <i className="fa-solid fa-trash" style={{ fontSize: 10, marginRight: 3 }}></i>刪除
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無品項，點右上角新增</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 訂單管理 ── */}
      {tab === 'orders' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[{ value: '', label: '全部' }, ...ORDER_STATUS_OPTIONS].map(opt => (
              <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
                style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, border: `0.5px solid ${filterStatus === opt.value ? '#388E3C' : '#ddd'}`, background: filterStatus === opt.value ? '#F0FFF4' : '#fff', color: filterStatus === opt.value ? '#388E3C' : '#666', cursor: 'pointer', fontWeight: filterStatus === opt.value ? 600 : 400 }}>
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
                  {['訂單', '用戶', '品項明細', '金額', '方式', '狀態', '時間', '操作'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
                ) : filteredOrders.map(order => {
                  const sc = ORDER_STATUS_OPTIONS.find(s => s.value === order.status) || ORDER_STATUS_OPTIONS[0]
                  const isUpdating = updatingOrder === order.id
                  return (
                    <tr key={order.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#388E3C', whiteSpace: 'nowrap' }}>
                        #{String(order.order_no).padStart(4, '0')}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#111', fontWeight: 500 }}>
                        {order.members?.display_name || '-'}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                        {(order.menu_order_items || []).map((item, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 1 }}>
                            {item.item_name} × {item.quantity}
                            <span style={{ color: '#999', marginLeft: 4 }}>$ {item.subtotal}</span>
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#388E3C' }}>$ {order.total_amount}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: order.dine_type === 'dine_in' ? '#E8F5E9' : '#E3F2FD', color: order.dine_type === 'dine_in' ? '#388E3C' : '#1976D2' }}>
                          {order.dine_type === 'dine_in' ? '內用' : '外帶'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#999', whiteSpace: 'nowrap' }}>
                        {new Date(order.created_at).toLocaleDateString('zh-TW')}<br />
                        <span style={{ fontSize: 10 }}>{new Date(order.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <select
                          value={order.status}
                          disabled={isUpdating}
                          onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                          style={{ padding: '4px 8px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#333', background: '#fff', cursor: 'pointer', outline: 'none' }}>
                          {ORDER_STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        {isUpdating && <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 11, color: '#888', marginLeft: 6 }}></i>}
                      </td>
                    </tr>
                  )
                })}
                {!loading && filteredOrders.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無訂單</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 品項編輯 Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{modal === 'new' ? '新增品項' : '編輯品項'}</div>
              <span onClick={() => { setModal(null); setPreview(null) }} style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }}>✕</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            <div onClick={() => !uploading && fileRef.current?.click()}
              style={{ border: '0.5px dashed #C8E6C9', borderRadius: 8, marginBottom: 14, minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer', background: '#F1F8E9', overflow: 'hidden' }}>
              {preview ? <img src={preview} alt="" style={{ maxHeight: 120, objectFit: 'contain', borderRadius: 6 }} />
                : <div style={{ textAlign: 'center', color: '#81C784' }}>
                    <i className="fa-solid fa-image" style={{ fontSize: 24, display: 'block', marginBottom: 6 }}></i>
                    <div style={{ fontSize: 12 }}>{uploading ? '上傳中...' : '點擊上傳商品圖片'}</div>
                  </div>
              }
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>品項名稱 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：雞腿便當" style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>品項描述</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="簡短描述..." style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>價格（元）*</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="80" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>庫存數量 *</label>
                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="20" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 8 }}>用餐方式</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ key: 'dine_in', label: '內用' }, { key: 'takeout', label: '外帶' }].map(d => (
                  <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#333' }}>
                    <input type="checkbox" checked={form[d.key]} onChange={e => setForm(f => ({ ...f, [d.key]: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#388E3C', cursor: 'pointer' }} />
                    {d.label}
                  </label>
                ))}
              </div>
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
              <button onClick={handleSave} disabled={saving || uploading || !form.name || form.price === '' || form.stock === ''}
                style={{ flex: 1, padding: 9, background: saving || uploading || !form.name || form.price === '' || form.stock === '' ? '#ccc' : '#388E3C', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                {saving ? '儲存中...' : '儲存品項'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
