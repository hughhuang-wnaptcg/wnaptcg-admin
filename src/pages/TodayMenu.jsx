import React, { useState } from 'react'

// ─── 假資料（實際請串接 API） ────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  { id: 1, name: 'SV 黑焰支配者 補充包', price: 150, stock: 12, active: true, createdAt: '2024/01/15' },
  { id: 2, name: 'ex 特選系列 卡盒', price: 1800, stock: 3, active: true, createdAt: '2024/01/15' },
  { id: 3, name: '閃光寶可夢 單卡包', price: 300, stock: 0, active: false, createdAt: '2024/01/14' },
]

const INITIAL_ORDERS = [
  { id: 101, product: 'SV 黑焰支配者 補充包', customer: '王小明', qty: 2, price: 300, method: 'live', status: '待確認', createdAt: '2024/01/15 14:32' },
  { id: 102, product: 'ex 特選系列 卡盒', customer: '林小華', qty: 1, price: 1800, method: 'direct', status: '已出貨', createdAt: '2024/01/15 13:10' },
  { id: 103, product: 'SV 黑焰支配者 補充包', customer: '陳小美', qty: 3, price: 450, method: 'live', status: '備貨中', createdAt: '2024/01/15 12:05' },
]

const METHOD_LABEL = { live: '直播拆', direct: '寄出' }
const STATUS_OPTIONS = ['待確認', '備貨中', '直播排程中', '已出貨', '已完成', '已取消']

// ─── 主元件 ─────────────────────────────────────────────────────────────────
export default function TodayMenu() {
  const [activeTab, setActiveTab] = useState('products') // products | orders
  const [products, setProducts] = useState(INITIAL_PRODUCTS)
  const [orders, setOrders] = useState(INITIAL_ORDERS)

  // 商品表單
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', stock: '', active: true })

  // 訂單篩選
  const [filterStatus, setFilterStatus] = useState('全部')
  const [filterMethod, setFilterMethod] = useState('全部')

  // ── 商品操作 ──
  const openAddForm = () => {
    setEditProduct(null)
    setForm({ name: '', price: '', stock: '', active: true })
    setShowForm(true)
  }

  const openEditForm = (p) => {
    setEditProduct(p)
    setForm({ name: p.name, price: p.price, stock: p.stock, active: p.active })
    setShowForm(true)
  }

  const handleFormSave = () => {
    if (!form.name || form.price === '' || form.stock === '') {
      alert('請填寫完整商品資料')
      return
    }
    if (editProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editProduct.id
            ? { ...p, name: form.name, price: Number(form.price), stock: Number(form.stock), active: form.active }
            : p
        )
      )
    } else {
      setProducts((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: form.name,
          price: Number(form.price),
          stock: Number(form.stock),
          active: form.active,
          createdAt: new Date().toLocaleDateString('zh-TW'),
        },
      ])
    }
    setShowForm(false)
  }

  const toggleActive = (id) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, active: !p.active } : p))
  }

  const deleteProduct = (id) => {
    if (!window.confirm('確定要刪除此商品？')) return
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  // ── 訂單操作 ──
  const updateOrderStatus = (id, status) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
  }

  const filteredOrders = orders.filter((o) => {
    const matchStatus = filterStatus === '全部' || o.status === filterStatus
    const matchMethod = filterMethod === '全部' || o.method === filterMethod
    return matchStatus && matchMethod
  })

  // ── 統計 ──
  const todayOrderCount = orders.length
  const pendingCount = orders.filter((o) => o.status === '待確認').length
  const totalRevenue = orders.filter((o) => o.status !== '已取消').reduce((s, o) => s + o.price, 0)

  return (
    <div className="today-admin">
      <style>{adminCSS}</style>

      {/* 頁面標題 */}
      <div className="page-header">
        <h1 className="page-title">今日商品管理</h1>
        <p className="page-desc">管理今日上架商品與訂單</p>
      </div>

      {/* 統計卡片 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-num">{products.filter((p) => p.active).length}</div>
          <div className="stat-label">上架中商品</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{todayOrderCount}</div>
          <div className="stat-label">今日訂單</div>
        </div>
        <div className="stat-card warn">
          <div className="stat-num">{pendingCount}</div>
          <div className="stat-label">待確認</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-num">NT$ {totalRevenue.toLocaleString()}</div>
          <div className="stat-label">今日營收</div>
        </div>
      </div>

      {/* 主 Tab */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          商品管理
        </button>
        <button
          className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          訂單管理
          {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
        </button>
      </div>

      {/* ── 商品管理 ── */}
      {activeTab === 'products' && (
        <div className="section">
          <div className="section-toolbar">
            <span className="toolbar-label">今日商品列表</span>
            <button className="btn-primary" onClick={openAddForm}>+ 新增商品</button>
          </div>

          <div className="product-table">
            <div className="table-header">
              <span>商品名稱</span>
              <span>售價</span>
              <span>庫存</span>
              <span>狀態</span>
              <span>操作</span>
            </div>
            {products.map((p) => (
              <div key={p.id} className={`table-row ${!p.active ? 'inactive' : ''}`}>
                <span className="col-name">{p.name}</span>
                <span className="col-price">NT$ {p.price.toLocaleString()}</span>
                <span className={`col-stock ${p.stock === 0 ? 'zero' : p.stock <= 3 ? 'low' : ''}`}>
                  {p.stock === 0 ? '已售完' : p.stock}
                </span>
                <span>
                  <button
                    className={`status-toggle ${p.active ? 'on' : 'off'}`}
                    onClick={() => toggleActive(p.id)}
                  >
                    {p.active ? '上架中' : '已下架'}
                  </button>
                </span>
                <span className="col-actions">
                  <button className="btn-edit" onClick={() => openEditForm(p)}>編輯</button>
                  <button className="btn-delete" onClick={() => deleteProduct(p.id)}>刪除</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 訂單管理 ── */}
      {activeTab === 'orders' && (
        <div className="section">
          <div className="section-toolbar">
            <span className="toolbar-label">今日訂單列表</span>
            <div className="filter-group">
              <select
                className="filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option>全部</option>
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select
                className="filter-select"
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
              >
                <option>全部</option>
                <option value="live">直播拆</option>
                <option value="direct">寄出</option>
              </select>
            </div>
          </div>

          <div className="order-table">
            <div className="table-header orders-header">
              <span>訂單編號</span>
              <span>商品</span>
              <span>客戶</span>
              <span>數量</span>
              <span>金額</span>
              <span>拆卡方式</span>
              <span>狀態</span>
            </div>
            {filteredOrders.map((o) => (
              <div key={o.id} className="table-row order-row">
                <span className="col-id">#{o.id}</span>
                <span className="col-product">{o.product}</span>
                <span>{o.customer}</span>
                <span>x{o.qty}</span>
                <span className="col-price">NT$ {o.price.toLocaleString()}</span>
                <span>
                  <span className={`method-tag ${o.method}`}>
                    {METHOD_LABEL[o.method]}
                  </span>
                </span>
                <span>
                  <select
                    className="status-select"
                    value={o.status}
                    onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </span>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="empty-row">目前沒有符合條件的訂單</div>
            )}
          </div>
        </div>
      )}

      {/* ── 商品新增 / 編輯 Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editProduct ? '編輯商品' : '新增今日商品'}</div>

            <div className="form-group">
              <label className="form-label">商品名稱</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例：SV 補充包"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">售價（NT$）</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">庫存數量</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                <span>立即上架</span>
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn-confirm" onClick={handleFormSave}>
                {editProduct ? '儲存變更' : '新增商品'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const adminCSS = `
.today-admin {
  padding: 24px 20px;
  max-width: 1000px;
  margin: 0 auto;
  color: var(--text, #f0f0f0);
}

/* ── 頁面標題 ── */
.page-header { margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
.page-desc { font-size: 13px; color: var(--text-muted, #888); margin: 0; }

/* ── 統計卡片 ── */
.stat-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
@media (min-width: 640px) { .stat-row { grid-template-columns: repeat(4, 1fr); } }
.stat-card {
  background: var(--card, #1e1e1e);
  border: 1px solid var(--border, #2a2a2a);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}
.stat-card.warn { border-color: #ff6b6b44; }
.stat-card.accent { border-color: #f5c51844; }
.stat-num { font-size: 20px; font-weight: 800; color: var(--text, #f0f0f0); margin-bottom: 4px; }
.stat-card.warn .stat-num { color: #ff6b6b; }
.stat-card.accent .stat-num { color: var(--accent, #f5c518); }
.stat-label { font-size: 12px; color: var(--text-muted, #888); }

/* ── 主 Tab ── */
.admin-tabs {
  display: flex;
  border-bottom: 2px solid var(--border, #2a2a2a);
  margin-bottom: 20px;
}
.admin-tab {
  padding: 10px 20px;
  background: none;
  border: none;
  color: var(--text-muted, #888);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  transition: all 0.18s;
  position: relative;
}
.admin-tab.active { color: var(--accent, #f5c518); border-bottom-color: var(--accent, #f5c518); }
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ff4444;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  padding: 0 4px;
  margin-left: 6px;
}

/* ── Section ── */
.section { }
.section-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 10px;
}
.toolbar-label { font-size: 15px; font-weight: 700; }

.btn-primary {
  background: var(--accent, #f5c518);
  color: #111;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.18s;
}
.btn-primary:hover { opacity: 0.85; }

.filter-group { display: flex; gap: 8px; }
.filter-select {
  background: var(--card, #1e1e1e);
  border: 1px solid var(--border, #2a2a2a);
  color: var(--text, #f0f0f0);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
}

/* ── 商品表格 ── */
.product-table, .order-table { display: flex; flex-direction: column; gap: 6px; }
.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr;
  gap: 10px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.orders-header {
  grid-template-columns: 0.7fr 1.5fr 1fr 0.6fr 1fr 0.8fr 1.2fr;
}
.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr;
  gap: 10px;
  padding: 12px 14px;
  background: var(--card, #1e1e1e);
  border-radius: 10px;
  border: 1px solid var(--border, #2a2a2a);
  align-items: center;
  font-size: 13px;
  transition: border-color 0.15s;
}
.table-row:hover { border-color: #3a3a3a; }
.table-row.inactive { opacity: 0.5; }
.order-row { grid-template-columns: 0.7fr 1.5fr 1fr 0.6fr 1fr 0.8fr 1.2fr; }

.col-name { font-weight: 600; }
.col-price { color: var(--accent, #f5c518); font-weight: 700; }
.col-stock { font-weight: 600; }
.col-stock.zero { color: #888; }
.col-stock.low { color: #ff6b6b; }
.col-id { color: var(--text-muted, #888); font-size: 12px; }
.col-product { font-weight: 600; }
.col-actions { display: flex; gap: 6px; }

.status-toggle {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.status-toggle.on { background: #1a3a1a; color: #6fcf97; }
.status-toggle.off { background: #2a2a2a; color: #888; }

.btn-edit {
  background: var(--surface, #141414);
  border: 1px solid var(--border, #333);
  color: var(--text, #f0f0f0);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.btn-edit:hover { border-color: var(--accent, #f5c518); }
.btn-delete {
  background: none;
  border: 1px solid #3a1a1a;
  color: #ff6b6b;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-delete:hover { background: #3a1a1a; }

.method-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
}
.method-tag.live { background: #1a2a1a; color: #6fcf97; border: 1px solid #6fcf9755; }
.method-tag.direct { background: #1a1a2a; color: #a78bfa; border: 1px solid #a78bfa55; }

.status-select {
  background: var(--surface, #141414);
  border: 1px solid var(--border, #2a2a2a);
  color: var(--text, #f0f0f0);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  width: 100%;
}

.empty-row {
  text-align: center;
  padding: 32px;
  color: var(--text-muted, #666);
  font-size: 14px;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-box {
  background: var(--surface, #1a1a1a);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  border: 1px solid var(--border, #2a2a2a);
}
.modal-title { font-size: 17px; font-weight: 700; margin-bottom: 20px; }

.form-group { margin-bottom: 14px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted, #aaa); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.form-input {
  width: 100%;
  background: var(--card, #1e1e1e);
  border: 1px solid var(--border, #2a2a2a);
  color: var(--text, #f0f0f0);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: var(--accent, #f5c518); }
.form-check { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.form-check input { width: 16px; height: 16px; accent-color: var(--accent, #f5c518); }

.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-cancel {
  flex: 1;
  padding: 12px;
  background: var(--card, #1e1e1e);
  border: 1px solid var(--border, #2a2a2a);
  color: var(--text-muted, #aaa);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-cancel:hover { background: var(--border, #2a2a2a); }
.btn-confirm {
  flex: 2;
  padding: 12px;
  background: var(--accent, #f5c518);
  border: none;
  color: #111;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.18s;
}
.btn-confirm:hover { opacity: 0.88; }
`
