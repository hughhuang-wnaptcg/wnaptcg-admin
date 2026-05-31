import React, { useEffect, useState } from 'react'
import { LevelBadge } from '../lib/pokeballs'
import { supabase, getLevel } from '../lib/supabase'

const LEVEL_COLORS = { '精靈球': '#888780', '超級球': '#378ADD', '高級球': '#E24B4A', '豪華球': '#BA7517', '貴重球': '#854F0B', '究極球': '#534AB7', '大師球': '#26215C' }

export default function AdminMembers() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [modal, setModal] = useState(null)        // 會員物件
  const [modalTab, setModalTab] = useState('points') // 'points' | 'purchase'
  const [adjustPoints, setAdjustPoints] = useState({ type: 'add', amount: '', note: '' })
  const [purchase, setPurchase] = useState({ amount: '', note: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  function openModal(m) {
    setModal(m)
    setModalTab('points')
    setAdjustPoints({ type: 'add', amount: '', note: '' })
    setPurchase({ amount: '', note: '' })
  }

  // ── 調整積分 ─────────────────────────────────────────
  async function handleAdjustPoints() {
    if (!adjustPoints.amount || !modal) return
    setSaving(true)
    const delta = adjustPoints.type === 'add' ? parseInt(adjustPoints.amount) : -parseInt(adjustPoints.amount)
    const newPoints = Math.max(0, modal.points + delta)
    const newLevel = getLevel(newPoints)
    await supabase.from('members').update({ points: newPoints, level: newLevel }).eq('id', modal.id)
    await supabase.from('point_logs').insert({ member_id: modal.id, type: 'manual', points: delta, note: adjustPoints.note || '管理員手動調整' })
    await fetchMembers()
    setModal(null)
    setSaving(false)
  }

  // ── 新增消費記錄 ─────────────────────────────────────
  async function handleAddPurchase() {
    if (!purchase.amount || !modal) return
    setSaving(true)
    const amount = parseFloat(purchase.amount)

    // 取得積分比例
    const { data: settingData } = await supabase.from('settings').select('value').eq('key', 'points_purchase_ratio').single()
    const ratio = settingData ? JSON.parse(settingData.value) : 1
    const earnedPoints = Math.floor(amount * ratio)

    const newTotalSpent = (modal.total_spent || 0) + amount
    const newPoints = modal.points + earnedPoints
    const newLevel = getLevel(newPoints)

    // 更新 members
    await supabase.from('members').update({
      total_spent: newTotalSpent,
      points: newPoints,
      level: newLevel,
    }).eq('id', modal.id)

    // 寫 point_logs
    if (earnedPoints > 0) {
      await supabase.from('point_logs').insert({
        member_id: modal.id,
        type: 'purchase',
        points: earnedPoints,
        note: purchase.note ? `消費 $${amount}｜${purchase.note}` : `消費 $${amount}`,
      })
    }

    // 寫 boss_purchases（若有進行中的 Boss）
    const { data: bossData } = await supabase.from('boss_challenges').select('id, current_amount').eq('is_active', true).single()
    if (bossData) {
      await supabase.from('boss_purchases').insert({
        boss_id: bossData.id,
        member_id: modal.id,
        amount,
        note: purchase.note || '',
        purchase_date: new Date().toISOString().split('T')[0],
      })
      await supabase.from('boss_challenges').update({
        current_amount: bossData.current_amount + amount,
      }).eq('id', bossData.id)
    }

    await fetchMembers()
    setModal(null)
    setSaving(false)
  }

  // ── 計算預覽 ─────────────────────────────────────────
  const purchasePoints = purchase.amount ? Math.floor(parseFloat(purchase.amount || 0)) : 0
  const previewPoints = modal ? modal.points + purchasePoints : 0
  const previewSpent = modal ? (modal.total_spent || 0) + parseFloat(purchase.amount || 0) : 0

  const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      <div style={{ fontSize: 20, fontWeight: 500, color: '#111', marginBottom: 16 }}>會員管理</div>

      {/* 工具列 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#aaa' }}></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋會員名稱或 Email..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#111', outline: 'none' }} />
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
          style={{ padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: '#fff' }}>
          <option value="">全部等級</option>
          {['精靈球','超級球','高級球','豪華球','貴重球','究極球','大師球'].map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* 表格 */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
              {['會員', '等級', '累積積分', '累積消費', '加入日期', '最後登入', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
            ) : filtered.map(m => (
              <tr key={m.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#633806', flexShrink: 0 }}>{m.display_name?.[0]}</div>
                    }
                    <div>
                      <div style={{ fontWeight: 500, color: '#111' }}>{m.display_name}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>#{String(m.member_no || '0').padStart(4, '0')}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}><LevelBadge level={m.level} size='sm' /></td>
                <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111' }}>{m.points?.toLocaleString()}</td>
                <td style={{ padding: '10px 14px', color: '#666' }}>${(m.total_spent || 0).toLocaleString()}</td>
                <td style={{ padding: '10px 14px', color: '#999' }}>{new Date(m.created_at).toLocaleDateString('zh-TW')}</td>
                <td style={{ padding: '10px 14px', color: '#999' }}>{m.last_login_date || '-'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => { openModal(m); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer' }}>
                      <i className="fa-solid fa-coins" style={{ fontSize: 10 }}></i> 積分
                    </button>
                    <button onClick={() => { openModal(m); setModalTab('purchase') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '0.5px solid #06C755', borderRadius: 6, fontSize: 11, color: '#06C755', background: 'transparent', cursor: 'pointer' }}>
                      <i className="fa-solid fa-bag-shopping" style={{ fontSize: 10 }}></i> 消費
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', fontSize: 12, color: '#999', borderTop: '0.5px solid #f0f0f0' }}>
          共 {filtered.length} 位會員
        </div>
      </div>

      {/* ── 彈窗 ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 360, padding: 20 }}>

            {/* 會員資訊 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modal.avatar_url
                  ? <img src={modal.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#633806' }}>{modal.display_name?.[0]}</div>
                }
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{modal.display_name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{modal.level} · {modal.points?.toLocaleString()} 點 · ${(modal.total_spent||0).toLocaleString()}</div>
                </div>
              </div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => setModal(null)}>✕</span>
            </div>

            {/* Tab 切換 */}
            <div style={{ display: 'flex', border: '0.5px solid #e5e5e5', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              {[{ key:'points', icon:'fa-coins', label:'調整積分' }, { key:'purchase', icon:'fa-bag-shopping', label:'新增消費' }].map(t => (
                <button key={t.key} onClick={() => setModalTab(t.key)}
                  style={{ flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: modalTab === t.key ? '#111' : '#f8f8f8', color: modalTab === t.key ? '#fff' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}>
                  <i className={`fa-solid ${t.icon}`} style={{ fontSize: 11 }}></i>{t.label}
                </button>
              ))}
            </div>

            {/* Tab：調整積分 */}
            {modalTab === 'points' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>調整類型</label>
                  <select value={adjustPoints.type} onChange={e => setAdjustPoints({ ...adjustPoints, type: e.target.value })}
                    style={{ ...inp, background: '#fff' }}>
                    <option value="add">增加積分</option>
                    <option value="subtract">扣除積分</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>積分數量</label>
                  <input type="number" value={adjustPoints.amount} onChange={e => setAdjustPoints({ ...adjustPoints, amount: e.target.value })}
                    placeholder="輸入數量..." style={inp} />
                  {adjustPoints.amount && (
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                      調整後：{Math.max(0, modal.points + (adjustPoints.type==='add'?1:-1) * parseInt(adjustPoints.amount||0)).toLocaleString()} 點
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>備註（選填）</label>
                  <input value={adjustPoints.note} onChange={e => setAdjustPoints({ ...adjustPoints, note: e.target.value })}
                    placeholder="例：活動獎勵、手動補正..." style={inp} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
                  <button onClick={handleAdjustPoints} disabled={saving || !adjustPoints.amount}
                    style={{ flex: 1, padding: 9, background: saving||!adjustPoints.amount ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: saving||!adjustPoints.amount ? 'not-allowed' : 'pointer' }}>
                    {saving ? '處理中...' : '確認調整'}
                  </button>
                </div>
              </>
            )}

            {/* Tab：新增消費 */}
            {modalTab === 'purchase' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>消費金額（$）</label>
                  <input type="number" value={purchase.amount} onChange={e => setPurchase({ ...purchase, amount: e.target.value })}
                    placeholder="例：500" style={inp} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>備註（選填）</label>
                  <input value={purchase.note} onChange={e => setPurchase({ ...purchase, note: e.target.value })}
                    placeholder="例：M5 深淵之鍾補充包 x3" style={inp} />
                </div>

                {/* 預覽 */}
                {purchase.amount && parseFloat(purchase.amount) > 0 && (
                  <div style={{ background: 'linear-gradient(135deg,#f8fff8,#f0fdf4)', border: '0.5px solid #86efac', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: '#166534', fontWeight: 500, marginBottom: 6 }}>
                      <i className="fa-solid fa-circle-check" style={{ marginRight: 5 }}></i>消費預覽
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { label: '消費金額', value: `$${parseFloat(purchase.amount).toLocaleString()}` },
                        { label: '獲得積分', value: `+${Math.floor(parseFloat(purchase.amount))} 點` },
                        { label: '累積消費', value: `$${previewSpent.toLocaleString()}` },
                        { label: '新積分總計', value: `${previewPoints.toLocaleString()} 點` },
                      ].map(r => (
                        <div key={r.label} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '6px 8px' }}>
                          <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>{r.label}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>{r.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: '#999', marginTop: 6 }}>※ 積分比例 $1 = 1 點</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
                  <button onClick={handleAddPurchase} disabled={saving || !purchase.amount || parseFloat(purchase.amount) <= 0}
                    style={{ flex: 1, padding: 9, background: saving||!purchase.amount||parseFloat(purchase.amount)<=0 ? '#ccc' : '#06C755', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: saving||!purchase.amount ? 'not-allowed' : 'pointer' }}>
                    {saving ? '處理中...' : '確認消費'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
