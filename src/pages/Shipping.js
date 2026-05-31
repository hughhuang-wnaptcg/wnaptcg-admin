import React, { useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabase'

const STATUS_LABEL = { pending: '待出貨', completed: '已完成', cancelled: '已取消' }
const STATUS_COLOR = {
  pending:   { bg: '#FAEEDA', color: '#8B5A00' },
  completed: { bg: '#EAF3DE', color: '#173404' },
  cancelled: { bg: '#f5f5f5', color: '#999' },
}

export default function Shipping() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [editForm, setEditForm] = useState({ store_name: '', recipient_name: '', phone: '', note: '', status: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    const { data } = await supabaseAdmin
      .from('shipping_orders')
      .select('*, members(display_name, avatar_url, level, member_no)')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const filtered = orders.filter(o => {
    const name = o.members?.display_name || ''
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) ||
      o.store_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.includes(search)
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }

  async function quickUpdateStatus(orderId, newStatus) {
    await supabaseAdmin.from('shipping_orders').update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...(newStatus === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
    }).eq('id', orderId)
    await fetchOrders()
  }

  function openEdit(order) {
    setEditForm({
      store_name: order.store_name,
      recipient_name: order.recipient_name,
      phone: order.phone,
      note: order.note || '',
      status: order.status,
    })
    setModal({ type: 'edit', order })
  }

  async function handleEdit() {
    setSaving(true)
    const { error } = await supabaseAdmin.from('shipping_orders').update({
      store_name: editForm.store_name,
      recipient_name: editForm.recipient_name,
      phone: editForm.phone,
      note: editForm.note,
      status: editForm.status,
      updated_at: new Date().toISOString(),
      ...(editForm.status === 'cancelled' && modal.order.status !== 'cancelled'
        ? { cancelled_at: new Date().toISOString() } : {}),
    }).eq('id', modal.order.id)
    if (!error) {
      await fetchOrders()
      setModal(null)
    }
    setSaving(false)
  }

  async function handleDelete() {
    setSaving(true)
    await supabaseAdmin.from('shipping_orders').delete().eq('id', modal.order.id)
    await fetchOrders()
    setModal(null)
    setSaving(false)
  }

  const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box', background: '#fff' }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 500, color: '#111', marginBottom: 16 }}>出貨管理</div>

      {/* 統計卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: '待出貨', value: stats.pending, icon: 'fa-clock', color: '#BA7517', bg: '#FAEEDA' },
          { label: '已完成', value: stats.completed, icon: 'fa-check-circle', color: '#173404', bg: '#EAF3DE' },
          { label: '已取消', value: stats.cancelled, icon: 'fa-xmark-circle', color: '#999', bg: '#f5f5f5' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <i className={`fa-solid ${s.icon}`} style={{ fontSize: 12, color: s.color }}></i>
              <div style={{ fontSize: 11, color: '#999' }}>{s.label}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#111' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 篩選 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#aaa' }}></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋會員、門市、收件人..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#111', outline: 'none' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: '#fff' }}>
          <option value="">全部狀態</option>
          <option value="pending">待出貨</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      {/* 表格 */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
              {['會員', '711門市', '收件人', '手機', '備註', '狀態', '申請時間', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無出貨記錄</td></tr>
            ) : filtered.map(order => {
              const m = order.members
              const sc = STATUS_COLOR[order.status] || STATUS_COLOR.cancelled
              return (
                <tr key={order.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m?.avatar_url
                        ? <img src={m.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#633806', flexShrink: 0 }}>{m?.display_name?.[0]}</div>
                      }
                      <div>
                        <div style={{ fontWeight: 500, color: '#111', fontSize: 13 }}>{m?.display_name}</div>
                        <div style={{ fontSize: 10, color: '#bbb' }}>#{String(m?.member_no||'0').padStart(4,'0')}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#111', maxWidth: 140 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.store_name}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#111' }}>{order.recipient_name}</td>
                  <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{order.phone}</td>
                  <td style={{ padding: '10px 14px', color: '#999', maxWidth: 120 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.note || '—'}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#999', whiteSpace: 'nowrap' }}>
                    {new Date(order.created_at).toLocaleDateString('zh-TW')}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {/* 待出貨才顯示「標記已完成」 */}
                      {order.status === 'pending' && (
                        <button onClick={() => quickUpdateStatus(order.id, 'completed')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '0.5px solid #86C566', borderRadius: 6, fontSize: 11, color: '#173404', background: '#EAF3DE', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <i className="fa-solid fa-check" style={{ fontSize: 10 }}></i> 標記已完成
                        </button>
                      )}
                      <button onClick={() => openEdit(order)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer' }}>
                        <i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> 編輯
                      </button>
                      <button onClick={() => setModal({ type: 'delete', order })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, color: '#A32D2D', background: 'transparent', cursor: 'pointer' }}>
                        <i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i> 刪除
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', fontSize: 12, color: '#999', borderTop: '0.5px solid #f0f0f0' }}>
          共 {filtered.length} 筆出貨記錄
        </div>
      </div>

      {/* ── 編輯 Modal ── */}
      {modal?.type === 'edit' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 380, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>編輯出貨資料</div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => setModal(null)}>✕</span>
            </div>
            {[
              { label: '711門市名稱', key: 'store_name', placeholder: '例：台北忠孝門市' },
              { label: '收貨姓名', key: 'recipient_name', placeholder: '例：王小明' },
              { label: '手機號碼', key: 'phone', placeholder: '例：0912345678' },
              { label: '備註', key: 'note', placeholder: '選填' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input value={editForm[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                  placeholder={f.placeholder} style={inp} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>狀態</label>
              <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={inp}>
                <option value="pending">待出貨</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>
                取消
              </button>
              <button onClick={handleEdit} disabled={saving}
                style={{ flex: 1, padding: 9, background: saving ? '#ccc' : '#06C755', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
                {saving ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 刪除 Modal ── */}
      {modal?.type === 'delete' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 340, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#111', marginBottom: 6 }}>確認刪除出貨記錄？</div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>此操作不可復原</div>
            <div style={{ background: '#f8f8f8', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
              {[
                { label: '會員', value: modal.order.members?.display_name },
                { label: '711門市', value: modal.order.store_name },
                { label: '收件人', value: modal.order.recipient_name },
                { label: '手機', value: modal.order.phone },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span style={{ fontSize: 12, color: '#888' }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>
                取消
              </button>
              <button onClick={handleDelete} disabled={saving}
                style={{ flex: 1, padding: 9, background: saving ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
                {saving ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
