import React, { useEffect, useState } from 'react'
import { supabase, getLevel } from '../lib/supabase'
import { LevelBadge } from '../lib/pokeballs'

export default function Purchases() {
  const [logs, setLogs] = useState([])
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ member_id: '', amount: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [ratio, setRatio] = useState(1)
  const SHOP_POINTS_RATIO = 100 // 每消費 100 元得 1 點

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: logsData }, { data: membersData }, { data: settingData }] = await Promise.all([
      supabase.from('point_logs')
        .select('*, members(display_name, level, avatar_url, points, total_spent, shop_points)')
        .eq('type', 'purchase')
        .order('created_at', { ascending: false }),
      supabase.from('members').select('id, display_name, avatar_url, level, points, total_spent, shop_points').order('display_name'),
      supabase.from('settings').select('value').eq('key', 'points_purchase_ratio').single(),
    ])
    setLogs(logsData || [])
    setMembers(membersData || [])
    if (settingData) setRatio(JSON.parse(settingData.value) || 1)
    setLoading(false)
  }

  const filtered = logs.filter(l => {
    const name = l.members?.display_name || ''
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || (l.note||'').toLowerCase().includes(search.toLowerCase())
    const matchMember = !memberFilter || l.member_id === memberFilter
    return matchSearch && matchMember
  })

  const totalAmount = filtered.reduce((s, l) => {
    const m = l.note?.match(/消費 \$([0-9,.]+)/)
    return s + (m ? parseFloat(m[1].replace(',','')) : 0)
  }, 0)
  const totalPoints = filtered.reduce((s, l) => s + (l.points || 0), 0)

  function parseLog(log) {
    const amountMatch = log.note?.match(/消費 \$([0-9,.]+)/)
    const amount = amountMatch ? amountMatch[1] : null
    const remark = log.note?.replace(/消費 \$[0-9,.]+｜?/, '').trim()
    return { amount, remark }
  }

  function openAdd() {
    setForm({ member_id: '', amount: '', note: '' })
    setModal('add')
  }

  function openEdit(log) {
    const { amount, remark } = parseLog(log)
    setForm({ member_id: log.member_id, amount: amount || '', note: remark || '' })
    setModal({ mode: 'edit', log })
  }

  function openDelete(log) {
    setModal({ mode: 'delete', log })
  }

  // ── 新增 ─────────────────────────────────────────────
  async function handleAdd() {
    if (!form.member_id || !form.amount || parseFloat(form.amount) <= 0) return
    setSaving(true)
    const member = members.find(m => m.id === form.member_id)
    if (!member) { setSaving(false); return }
    const amount = parseFloat(form.amount)
    const earnedPoints = Math.floor(amount * ratio)
    const earnedShopPoints = Math.floor(amount / SHOP_POINTS_RATIO)

    // 更新 members：積分 + shop_points
    await supabase.from('members').update({
      total_spent: (member.total_spent || 0) + amount,
      points: member.points + earnedPoints,
      level: getLevel(member.points + earnedPoints),
      shop_points: (member.shop_points || 0) + earnedShopPoints,
    }).eq('id', form.member_id)

    // 積分紀錄
    await supabase.from('point_logs').insert({
      member_id: form.member_id,
      type: 'purchase',
      points: earnedPoints,
      note: form.note ? `消費 $${amount}｜${form.note}` : `消費 $${amount}`,
    })

    // 點數紀錄（shop points）
    if (earnedShopPoints > 0) {
      await supabase.from('points_logs').insert({
        member_id: form.member_id,
        type: 'purchase',
        points: earnedShopPoints,
        note: form.note ? `消費 $${amount} 獲得點數｜${form.note}` : `消費 $${amount} 獲得點數`,
      })
    }

    // Boss 挑戰
    const { data: bossData } = await supabase.from('boss_challenges').select('id, current_amount').eq('is_active', true).single()
    if (bossData) {
      await supabase.from('boss_purchases').insert({ boss_id: bossData.id, member_id: form.member_id, amount, note: form.note || '', purchase_date: new Date().toISOString().split('T')[0] })
      await supabase.from('boss_challenges').update({ current_amount: bossData.current_amount + amount }).eq('id', bossData.id)
    }

    await fetchAll()
    setModal(null)
    setSaving(false)
  }

  // ── 編輯 ─────────────────────────────────────────────
  async function handleEdit() {
    if (!form.amount || parseFloat(form.amount) <= 0) return
    setSaving(true)
    const log = modal.log
    const { amount: oldAmountStr } = parseLog(log)
    const oldAmount = oldAmountStr ? parseFloat(oldAmountStr.replace(',','')) : 0
    const oldPoints = log.points || 0
    const newAmount = parseFloat(form.amount)
    const newPoints = Math.floor(newAmount * ratio)
    const oldShopPoints = Math.floor(oldAmount / SHOP_POINTS_RATIO)
    const newShopPoints = Math.floor(newAmount / SHOP_POINTS_RATIO)
    const diffShopPoints = newShopPoints - oldShopPoints

    const member = members.find(m => m.id === log.member_id)
    if (member) {
      const diffAmount = newAmount - oldAmount
      const diffPoints = newPoints - oldPoints
      const newTotalSpent = Math.max(0, (member.total_spent || 0) + diffAmount)
      const newTotalPoints = Math.max(0, member.points + diffPoints)
      const newMemberShopPoints = Math.max(0, (member.shop_points || 0) + diffShopPoints)
      await supabase.from('members').update({
        total_spent: newTotalSpent,
        points: newTotalPoints,
        level: getLevel(newTotalPoints),
        shop_points: newMemberShopPoints,
      }).eq('id', log.member_id)

      // 點數差額紀錄
      if (diffShopPoints !== 0) {
        await supabase.from('points_logs').insert({
          member_id: log.member_id,
          type: 'manual',
          points: diffShopPoints,
          note: `消費記錄編輯：點數調整 ${diffShopPoints > 0 ? '+' : ''}${diffShopPoints}`,
        })
      }
    }

    await supabase.from('point_logs').update({
      points: newPoints,
      note: form.note ? `消費 $${newAmount}｜${form.note}` : `消費 $${newAmount}`,
    }).eq('id', log.id)

    await fetchAll()
    setModal(null)
    setSaving(false)
  }

  // ── 刪除 ─────────────────────────────────────────────
  async function handleDelete() {
    setSaving(true)
    const log = modal.log
    const member = members.find(m => m.id === log.member_id)
    if (member) {
      const { amount: amtStr } = parseLog(log)
      const amount = amtStr ? parseFloat(amtStr.replace(',','')) : 0
      const shopPointsToDeduct = Math.floor(amount / SHOP_POINTS_RATIO)
      const newTotalSpent = Math.max(0, (member.total_spent || 0) - amount)
      const newPoints = Math.max(0, member.points - log.points)
      const newShopPoints = Math.max(0, (member.shop_points || 0) - shopPointsToDeduct)

      await supabase.from('members').update({
        total_spent: newTotalSpent,
        points: newPoints,
        level: getLevel(newPoints),
        shop_points: newShopPoints,
      }).eq('id', log.member_id)

      await supabase.from('point_logs').insert({
        member_id: log.member_id,
        type: 'manual',
        points: -log.points,
        note: `消費記錄刪除｜${log.note || ''}`,
      })

      if (shopPointsToDeduct > 0) {
        await supabase.from('points_logs').insert({
          member_id: log.member_id,
          type: 'manual',
          points: -shopPointsToDeduct,
          note: `消費記錄刪除，扣回點數｜${log.note || ''}`,
        })
      }
    }
    await supabase.from('point_logs').delete().eq('id', log.id)
    await fetchAll()
    setModal(null)
    setSaving(false)
  }

  const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box', background: '#fff' }

  const previewPoints = form.amount ? Math.floor(parseFloat(form.amount || 0) * ratio) : 0
  const previewShopPoints = form.amount ? Math.floor(parseFloat(form.amount || 0) / SHOP_POINTS_RATIO) : 0
  const previewMember = members.find(m => m.id === form.member_id)
  const isEdit = modal != null && typeof modal === 'object' && modal.mode === 'edit'
  const editLog = isEdit ? modal.log : null
  const oldPoints = editLog ? (editLog.points || 0) : 0
  const oldAmount = editLog ? (() => { const { amount } = parseLog(editLog); return amount ? parseFloat(amount.replace(',','')) : 0 })() : 0

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>消費記錄</div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#06C755', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          <i className="fa-solid fa-plus"></i> 新增消費
        </button>
      </div>

      {/* 統計 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { icon: 'fa-bag-shopping', label: '消費筆數', value: `${filtered.length} 筆`, color: '#06C755' },
          { icon: 'fa-dollar-sign', label: '消費總額', value: `$${totalAmount.toLocaleString()}`, color: '#BA7517' },
          { icon: 'fa-star', label: '發出積分', value: `${totalPoints.toLocaleString()} 點`, color: '#E24B4A' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <i className={`fa-solid ${s.icon}`} style={{ fontSize: 12, color: s.color }}></i>
              <div style={{ fontSize: 11, color: '#999' }}>{s.label}</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 篩選 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#aaa' }}></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋會員或備註..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#111', outline: 'none' }} />
        </div>
        <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}
          style={{ padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: '#fff', minWidth: 130 }}>
          <option value="">全部會員</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </select>
      </div>

      {/* 表格 */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
              {['會員', '消費金額', '獲得積分', '獲得點數', '備註', '日期', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>尚無消費記錄</td></tr>
            ) : filtered.map(log => {
              const { amount, remark } = parseLog(log)
              const m = log.members
              const shopPts = amount ? Math.floor(parseFloat(amount.replace(',','')) / SHOP_POINTS_RATIO) : 0
              return (
                <tr key={log.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m?.avatar_url
                        ? <img src={m.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#633806', flexShrink: 0 }}>{m?.display_name?.[0]}</div>
                      }
                      <div>
                        <div style={{ fontWeight: 500, color: '#111', fontSize: 13 }}>{m?.display_name}</div>
                        <div style={{ fontSize: 10 }}><LevelBadge level={m?.level} size='sm' /></div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#166534' }}>{amount ? `$${amount}` : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 12, background: '#FAEEDA', color: '#8B5A00', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>+{log.points} 點</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {shopPts > 0
                      ? <span style={{ fontSize: 12, background: '#FFF3E0', color: '#E07B00', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>+{shopPts} 點</span>
                      : <span style={{ fontSize: 12, color: '#ccc' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '10px 14px', color: '#666', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{remark || '—'}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#999' }}>{new Date(log.created_at).toLocaleDateString('zh-TW')}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(log)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer' }}>
                        <i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> 編輯
                      </button>
                      <button onClick={() => openDelete(log)}
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
          共 {filtered.length} 筆記錄 · 積分比例 $1 = {ratio} 積分 · 點數比例 $100 = 1 點
        </div>
      </div>

      {/* 新增 / 編輯 彈窗 */}
      {(modal === 'add' || modal?.mode === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 380, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{isEdit ? '編輯消費記錄' : '新增消費記錄'}</div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => setModal(null)}>✕</span>
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>積分比例 $1 = {ratio} 積分 · 點數比例 $100 = 1 點</div>

            {isEdit ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f8f8f8', borderRadius: 8, marginBottom: 12 }}>
                {editLog?.members?.avatar_url
                  ? <img src={editLog?.members.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#633806' }}>{editLog?.members?.display_name?.[0]}</div>
                }
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{editLog?.members?.display_name}</div>
                <div style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>{editLog?.members?.level}</div>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>選擇會員</label>
                <select value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} style={inp}>
                  <option value="">請選擇會員...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.display_name}（{m.level}）</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>消費金額（$）</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="例：500" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>備註（選填）</label>
              <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="例：M5 深淵之鍾補充包 x3" style={inp} />
            </div>

            {/* 預覽 */}
            {form.amount && parseFloat(form.amount) > 0 && (isEdit || form.member_id) && (
              <div style={{ background: 'linear-gradient(135deg,#f8fff8,#f0fdf4)', border: '0.5px solid #86efac', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 500, marginBottom: 8 }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: 5 }}></i>
                  {isEdit ? '編輯預覽（差額）' : '消費預覽'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {(isEdit ? [
                    { label: '消費金額', value: `$${parseFloat(form.amount).toLocaleString()}` },
                    { label: '積分變化', value: `${previewPoints >= oldPoints ? '+' : ''}${previewPoints - oldPoints} 積分` },
                    { label: '新獲得積分', value: `${previewPoints} 積分` },
                    { label: '商城點數變化', value: `${Math.floor(parseFloat(form.amount)/SHOP_POINTS_RATIO) - Math.floor(oldAmount/SHOP_POINTS_RATIO) >= 0 ? '+' : ''}${Math.floor(parseFloat(form.amount)/SHOP_POINTS_RATIO) - Math.floor(oldAmount/SHOP_POINTS_RATIO)} 點` },
                  ] : [
                    { label: '消費金額', value: `$${parseFloat(form.amount).toLocaleString()}` },
                    { label: '獲得積分', value: `+${previewPoints} 積分` },
                    { label: '獲得商城點數', value: `+${previewShopPoints} 點` },
                    { label: '新積分總計', value: `${((previewMember?.points||0)+previewPoints).toLocaleString()} 積分` },
                  ]).map(r => (
                    <div key={r.label} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
              <button onClick={isEdit ? handleEdit : handleAdd}
                disabled={saving || (!isEdit && !form.member_id) || !form.amount || parseFloat(form.amount) <= 0}
                style={{ flex: 1, padding: 9, background: saving || (!isEdit && !form.member_id) || !form.amount ? '#ccc' : '#06C755', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
                {saving ? '處理中...' : isEdit ? '儲存變更' : '確認新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認彈窗 */}
      {modal?.mode === 'delete' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 340, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#111', marginBottom: 6 }}>確認刪除消費記錄？</div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>此操作不可復原，同時會扣回積分與商城點數</div>
            <div style={{ background: '#f8f8f8', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
              {(() => {
                const { amount, remark } = parseLog(modal.log)
                const shopPts = amount ? Math.floor(parseFloat(amount.replace(',','')) / SHOP_POINTS_RATIO) : 0
                return [
                  { label: '會員', value: modal.log.members?.display_name },
                  { label: '消費金額', value: amount ? `$${amount}` : '—' },
                  { label: '備註', value: remark || '—' },
                  { label: '扣回積分', value: `${modal.log.points} 積分` },
                  { label: '扣回點數', value: shopPts > 0 ? `${shopPts} 點` : '—' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: 12, color: '#888' }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{r.value}</span>
                  </div>
                ))
              })()}
            </div>
            <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '8px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 13, color: '#A32D2D' }}></i>
              <div style={{ fontSize: 12, color: '#A32D2D' }}>積分與商城點數將同步扣回，此操作不可復原</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
              <button onClick={handleDelete} disabled={saving}
                style={{ flex: 1, padding: 9, background: saving ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
                {saving ? '處理中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
