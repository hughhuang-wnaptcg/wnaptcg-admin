import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ORDER_STATUS_OPTIONS = [
  { value: 'pending',    label: '未出貨', color: '#E07B00', bg: '#FFF3E0' },
  { value: 'processing', label: '處理中', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'shipped',    label: '已出貨', color: '#7C3AED', bg: '#F5F3FF' },
  { value: 'completed',  label: '已完成', color: '#16A34A', bg: '#F0FFF4' },
  { value: 'cancelled',  label: '已取消', color: '#999',    bg: '#F5F5F5' },
]

// 內用/外帶 標籤樣式
const DINE_BADGE = {
  dine_in: { label: '內用', color: '#A32D2D', bg: '#FCEBEB' },
  takeout: { label: '外帶', color: '#1a1a1a', bg: '#F0F0F0' },
}

export default function TodayMenu() {
  const [tab, setTab] = useState('items')
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', dine_in: true, takeout: true, is_active: true, image_url: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [updatingOrder, setUpdatingOrder] = useState(null)
  // 展開訂單明細
  const [expandedOrder, setExpandedOrder] = useState(null)
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
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(raw)
    setUploading(true)
    try {
      const file = await compressImage(raw)
      const path = `menu/${Date.now()}.webp`
      const { error } = await supabase.storage.from('card-images').upload(path, file, { upsert: false, contentType: 'image/webp' })
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

  // 統計一筆訂單內，內用幾項、外帶幾項
  function getDineTypeSummary(orderItems) {
    const dineIn = orderItems.filter(i => i.dine_type === 'dine_in')
    const takeout = orderItems.filter(i => i.dine_type === 'takeout')
    return { dineIn, takeout }
  }

  const filteredOrders = orders.filter(o => !filterStatus || o.status === filterStatus)
  const pendingCount = orders.filter(o => o.status === 'pending').length

  const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box', background: '#fff' }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>直播下單管理</div>
        {tab === 'items' && (
          <button onClick={openNew} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="fa-solid fa-plus"></i> 新增商品
          </button>
        )}
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#f8f8f8', borderRadius: 10, padding: 3 }}>
        {[
          { key: 'items',  label: '上架商品', icon: 'fa-box-open' },
          { key: 'orders', label: '訂單管理', icon: 'fa-receipt', badge: pendingCount },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#111' : '#999', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, position: 'relative' }}>
            <i className={`fa-solid ${t.icon}`} style={{ fontSize: 11 }}></i>{t.label}
            {t.badge > 0 && <span style={{ position: 'absolute', top: 4, right: 8, background: '#E24B4A', color: '#fff', borderRadius: 99, fontSize: 9, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── 上架商品 ── */}
      {tab === 'items' && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
                {['商品', '價格', '庫存', '支援方式', '狀態', '操作'].map(h => (
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
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F5F5F5', border: '0.5px solid #E8E8E8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fa-solid fa-box-open" style={{ fontSize: 15, color: '#BDBDBD' }}></i>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#111' }}>{item.name}</div>
                        {item.description && <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{item.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#E24B4A' }}>$ {item.price}</td>
                  <td style={{ padding: '10px 14px', color: item.stock === 0 ? '#E24B4A' : '#111', fontWeight: item.stock === 0 ? 600 : 400 }}>{item.stock}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {item.dine_in && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#FCEBEB', color: '#A32D2D', fontWeight: 600 }}>內用</span>}
                      {item.takeout && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#F0F0F0', color: '#1a1a1a', fontWeight: 600 }}>外帶</span>}
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
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無商品，點右上角新增</td></tr>
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
                style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, border: `0.5px solid ${filterStatus === opt.value ? '#1a1a1a' : '#ddd'}`, background: filterStatus === opt.value ? '#1a1a1a' : '#fff', color: filterStatus === opt.value ? '#fff' : '#666', cursor: 'pointer', fontWeight: filterStatus === opt.value ? 600 : 400 }}>
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
                  {['訂單', '用戶', '品項明細（含內用/外帶）', '金額', '狀態', '時間', '操作'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
                ) : filteredOrders.map(order => {
                  const sc = ORDER_STATUS_OPTIONS.find(s => s.value === order.status) || ORDER_STATUS_OPTIONS[0]
                  const isUpdating = updatingOrder === order.id
                  const orderItems = order.menu_order_items || []
                  const { dineIn, takeout } = getDineTypeSummary(orderItems)
                  const isExpanded = expandedOrder === order.id

                  return (
                    <tr key={order.id} style={{ borderBottom: '0.5px solid #f0f0f0', verticalAlign: 'top' }}>
                      {/* 訂單號 */}
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                        #{String(order.order_no).padStart(4, '0')}
                      </td>

                      {/* 用戶 */}
                      <td style={{ padding: '12px 14px', color: '#111', fontWeight: 500 }}>
                        {order.members?.display_name || '-'}
                      </td>

                      {/* 品項明細：每項顯示內用/外帶標籤 */}
                      <td style={{ padding: '12px 14px', maxWidth: 260 }}>
                        {/* 摘要行：內用 N 件 / 外帶 N 件 */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: orderItems.length > 0 ? 6 : 0, flexWrap: 'wrap' }}>
                          {dineIn.length > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#FCEBEB', color: '#A32D2D' }}>
                              內用 {dineIn.reduce((s, i) => s + i.quantity, 0)} 件
                            </span>
                          )}
                          {takeout.length > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#F0F0F0', color: '#1a1a1a' }}>
                              外帶 {takeout.reduce((s, i) => s + i.quantity, 0)} 件
                            </span>
                          )}
                          {orderItems.length > 0 && (
                            <span onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                              style={{ fontSize: 11, color: '#1a1a1a', cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 3 }}>
                              {isExpanded ? '收起' : '展開明細'}
                              <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 9 }}></i>
                            </span>
                          )}
                        </div>

                        {/* 展開後逐項顯示 */}
                        {isExpanded && orderItems.map((item, i) => {
                          const badge = DINE_BADGE[item.dine_type] || DINE_BADGE.takeout
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', marginBottom: i < orderItems.length - 1 ? 5 : 0, paddingLeft: 2 }}>
                              <span style={{ flex: 1 }}>{item.item_name} × {item.quantity}</span>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: badge.bg, color: badge.color, flexShrink: 0 }}>
                                {badge.label}
                              </span>
                              <span style={{ color: '#999', flexShrink: 0 }}>$ {item.subtotal}</span>
                            </div>
                          )
                        })}
                      </td>

                      {/* 金額 */}
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#E24B4A', whiteSpace: 'nowrap' }}>
                        $ {order.total_amount}
                      </td>

                      {/* 狀態 */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
                      </td>

                      {/* 時間 */}
                      <td style={{ padding: '12px 14px', color: '#999', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(order.created_at).toLocaleDateString('zh-TW')}<br />
                        <span style={{ fontSize: 11 }}>{new Date(order.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>

                      {/* 操作 */}
                      <td style={{ padding: '12px 14px' }}>
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
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無訂單</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 商品編輯 Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{modal === 'new' ? '新增商品' : '編輯商品'}</div>
              <span onClick={() => { setModal(null); setPreview(null) }} style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }}>✕</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            <div onClick={() => !uploading && fileRef.current?.click()}
              style={{ border: '0.5px dashed #E0E0E0', borderRadius: 8, marginBottom: 14, minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer', background: '#FAFAFA', overflow: 'hidden' }}>
              {preview
                ? <img src={preview} alt="" style={{ maxHeight: 120, objectFit: 'contain', borderRadius: 6 }} />
                : <div style={{ textAlign: 'center', color: '#BDBDBD' }}>
                    <i className="fa-solid fa-image" style={{ fontSize: 24, display: 'block', marginBottom: 6 }}></i>
                    <div style={{ fontSize: 12 }}>{uploading ? '上傳中...' : '點擊上傳商品圖片'}</div>
                  </div>
              }
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>商品名稱 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：寶可夢卡包" style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>商品描述</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="簡短描述..." style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>價格（元）*</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="350" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>庫存數量 *</label>
                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="20" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 8 }}>支援取貨方式</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ key: 'dine_in', label: '內用（直播現場拆）' }, { key: 'takeout', label: '外帶（未拆封寄出）' }].map(d => (
                  <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#333' }}>
                    <input type="checkbox" checked={form[d.key]} onChange={e => setForm(f => ({ ...f, [d.key]: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#1a1a1a', cursor: 'pointer' }} />
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
                style={{ flex: 1, padding: 9, background: saving || uploading || !form.name || form.price === '' || form.stock === '' ? '#ccc' : '#1a1a1a', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                {saving ? '儲存中...' : '儲存商品'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
