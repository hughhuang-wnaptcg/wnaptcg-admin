import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: '未出貨', color: '#E07B00', bg: '#FFF3E0' },
  { value: 'processing', label: '處理中', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'shipped', label: '已出貨', color: '#7C3AED', bg: '#F5F3FF' },
  { value: 'completed', label: '已完成', color: '#16A34A', bg: '#F0FFF4' },
  { value: 'cancelled', label: '已取消', color: '#999', bg: '#F5F5F5' },
]

// 內用/外帶 標籤樣式
const DINE_BADGE = {
  dine_in: { label: '內用', color: '#A32D2D', bg: '#FCEBEB' },
  takeout: { label: '外帶', color: '#1a1a1a', bg: '#F0F0F0' },
}

const PRODUCT_TAG_OPTIONS = [
  { value: '擴充盒', label: '擴充盒', icon: 'fa-box', color: '#E24B4A', bg: '#FCEBEB' },
  { value: '散包', label: '散包', icon: 'fa-layer-group', color: '#E07B00', bg: '#FFF3E0' },
  { value: '其他', label: '其他', icon: 'fa-tag', color: '#666', bg: '#F5F5F5' },
]

function productTagLabel(tag) {
  return PRODUCT_TAG_OPTIONS.find(t => t.value === tag) || PRODUCT_TAG_OPTIONS.find(t => t.value === '其他')
}

// 格式化日期為 YYYY-MM-DD（台灣時間）
function toLocalDateStr(date) {
  const d = new Date(date)
  const tzOffset = d.getTimezoneOffset() * 60000
  const local = new Date(d - tzOffset)
  return local.toISOString().split('T')[0]
}

function todayStr() {
  return toLocalDateStr(new Date())
}

export default function TodayMenu() {
  const [tab, setTab] = useState('items')
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', product_tag: '其他', dine_in: true, takeout: true, is_active: true, image_url: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  // 日期篩選：預設今日，'' 表示全部
  const [filterDate, setFilterDate] = useState(todayStr())
  const [updatingOrder, setUpdatingOrder] = useState(null)
  // 展開訂單明細
  const [expandedOrder, setExpandedOrder] = useState(null)
  // 匯款證明放大檢視
  const [proofView, setProofView] = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchAll() }, [])

  // 即時更新 + 新訂單提示音：訂閱 menu_orders INSERT
  useEffect(() => {
    const channel = supabase
      .channel('admin_menu_orders_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'menu_orders' }, () => {
        playNewOrderChime()   // 真正有新訂單才響
        fetchAll()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'menu_orders' }, () => { fetchAll() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_order_items' }, () => { fetchAll() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 明顯的新訂單提示音（Web Audio 合成，連響三聲上升「叮咚」，不需外部音檔）
  function playNewOrderChime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const notes = [
        { f: 784, t: 0.00 },  // G5
        { f: 988, t: 0.18 },  // B5
        { f: 1175, t: 0.36 }, // D6
      ]
      notes.forEach(({ f, t }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = f
        osc.connect(gain); gain.connect(ctx.destination)
        const start = ctx.currentTime + t
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.35, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55)
        osc.start(start)
        osc.stop(start + 0.6)
      })
      // 收尾關閉
      setTimeout(() => { ctx.close().catch(() => {}) }, 1300)
    } catch (e) { /* 靜默失敗，不影響功能 */ }
  }

  async function fetchAll() {
    setLoading(true)
    const [{ data: itemsData }, { data: ordersData }] = await Promise.all([
      supabase.from('menu_items').select('*').order('created_at', { ascending: false }),
      supabase.from('menu_orders')
        .select('*, members(display_name), menu_order_items(*)')
        .order('created_at', { ascending: false })
        .limit(500),
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
      product_tag: form.product_tag || '其他',
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
    if (!window.confirm('確定刪除此品項？\n注意：相關訂單的品項明細也會一併清除。')) return
    try {
      // 1. 找出所有包含此品項的訂單 id
      const { data: relatedItems } = await supabase
        .from('menu_order_items')
        .select('order_id')
        .eq('item_id', id)

      if (relatedItems?.length > 0) {
        const orderIds = [...new Set(relatedItems.map(i => i.order_id))]
        // 2. 刪除相關的 menu_order_items
        await supabase.from('menu_order_items').delete().eq('item_id', id)
        // 3. 刪除已沒有品項的 menu_orders（避免空訂單殘留）
        for (const oid of orderIds) {
          const { data: remaining } = await supabase
            .from('menu_order_items')
            .select('id')
            .eq('order_id', oid)
          if (!remaining || remaining.length === 0) {
            await supabase.from('menu_orders').delete().eq('id', oid)
          }
        }
      }
      // 4. 刪除商品本體
      const { error } = await supabase.from('menu_items').delete().eq('id', id)
      if (error) throw error
      await fetchAll()
    } catch (err) {
      alert('刪除失敗：' + err.message)
    }
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
    setForm({ name: '', description: '', price: '', stock: '', product_tag: '其他', dine_in: true, takeout: true, is_active: true, image_url: '' })
    setPreview(null); setModal('new')
  }

  function openEdit(item) {
    setForm({ name: item.name, description: item.description || '', price: item.price, stock: item.stock, product_tag: item.product_tag || '其他', dine_in: item.dine_in, takeout: item.takeout, is_active: item.is_active, image_url: item.image_url || '' })
    setPreview(item.image_url || null); setModal(item)
  }

  // 統計一筆訂單內，內用幾項、外帶幾項
  function getDineTypeSummary(orderItems) {
    const dineIn = orderItems.filter(i => i.dine_type === 'dine_in')
    const takeout = orderItems.filter(i => i.dine_type === 'takeout')
    return { dineIn, takeout }
  }

  // 取得所有有訂單的日期（唯一值，降序）
  const allOrderDates = [...new Set(
    orders.map(o => toLocalDateStr(o.created_at))
  )].sort((a, b) => b.localeCompare(a))

  // 雙重篩選：日期 + 狀態
  const filteredOrders = orders.filter(o => {
    const dateMatch = !filterDate || toLocalDateStr(o.created_at) === filterDate
    const statusMatch = !filterStatus || o.status === filterStatus
    return dateMatch && statusMatch
  })

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
          { key: 'items', label: '上架商品', icon: 'fa-box-open' },
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
                {['商品', '標籤', '價格', '庫存', '支援方式', '狀態', '操作'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
              ) : items.map(item => {
                const tag = productTagLabel(item.product_tag)
                return (
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
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: tag.bg, color: tag.color, fontWeight: 600 }}>
                        <i className={`fa-solid ${tag.icon}`} style={{ fontSize: 9, marginRight: 3 }}></i>{tag.label}
                      </span>
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
                )
              })}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無商品，點右上角新增</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 訂單管理 ── */}
      {tab === 'orders' && (
        <>
          {/* 篩選列：日期 + 狀態 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* 日期篩選 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-calendar-day" style={{ fontSize: 12, color: '#999' }}></i>
              <select
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 99, fontSize: 12, border: '0.5px solid #ddd', background: filterDate ? '#1a1a1a' : '#fff', color: filterDate ? '#fff' : '#666', cursor: 'pointer', outline: 'none' }}>
                <option value="">全部日期</option>
                {allOrderDates.map(d => (
                  <option key={d} value={d}>
                    {d === todayStr() ? `今日 (${d})` : d}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: 1, height: 20, background: '#e5e5e5' }} />

            {/* 狀態篩選 */}
            {[{ value: '', label: '全部狀態' }, ...ORDER_STATUS_OPTIONS].map(opt => (
              <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
                style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, border: `0.5px solid ${filterStatus === opt.value ? '#1a1a1a' : '#ddd'}`, background: filterStatus === opt.value ? '#1a1a1a' : '#fff', color: filterStatus === opt.value ? '#fff' : '#666', cursor: 'pointer', fontWeight: filterStatus === opt.value ? 600 : 400 }}>
                {opt.label}
              </button>
            ))}

            {/* 結果統計 */}
            <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
              共 {filteredOrders.length} 筆
              {filteredOrders.length > 0 && (
                <span style={{ marginLeft: 8, color: '#E24B4A', fontWeight: 600 }}>
                  $ {filteredOrders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}
                </span>
              )}
            </span>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
                  {['訂單', '用戶', '品項明細（含內用/外帶）', '金額', '匯款證明', '狀態', '時間', '操作'].map(h => (
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

                      {/* 品項明細 */}
                      <td style={{ padding: '12px 14px', maxWidth: 260 }}>
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

                      {/* 匯款證明 */}
                      <td style={{ padding: '12px 14px' }}>
                        {order.payment_proof_url ? (
                          <div onClick={() => setProofView({ url: order.payment_proof_url, orderNo: order.order_no })}
                            style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', border: '0.5px solid #E8E8E8', cursor: 'pointer', position: 'relative', background: '#F5F5F5' }}>
                            <img src={order.payment_proof_url} alt="匯款證明" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.18)', opacity: 0, transition: 'opacity 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 1}
                              onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                              <i className="fa-solid fa-magnifying-glass-plus" style={{ fontSize: 14, color: '#fff' }}></i>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#bbb', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <i className="fa-solid fa-circle-minus" style={{ fontSize: 10 }}></i>未上傳
                          </span>
                        )}
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
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                    {filterDate === todayStr() ? '今日尚無訂單' : '此條件無訂單'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 匯款證明放大檢視 */}
      {proofView && (
        <div onClick={() => setProofView(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                <i className="fa-solid fa-receipt" style={{ marginRight: 8 }}></i>匯款證明 · 訂單 #{String(proofView.orderNo).padStart(4, '0')}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={proofView.url} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="fa-solid fa-up-right-from-square" style={{ fontSize: 11 }}></i>原圖
                </a>
                <span onClick={() => setProofView(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>✕</span>
              </div>
            </div>
            <img src={proofView.url} alt="匯款證明" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 10, background: '#fff' }} />
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
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>商品標籤</label>
              <select value={form.product_tag} onChange={e => setForm(f => ({ ...f, product_tag: e.target.value }))} style={inp}>
                {PRODUCT_TAG_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
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
