import React, { useEffect, useRef, useState } from 'react'
import { LevelBadge } from '../lib/pokeballs'
import { supabase } from '../lib/supabase'

export default function AdminBoss() {
  const [boss, setBoss] = useState(null)
  const [allBosses, setAllBosses] = useState([])
  const [purchases, setPurchases] = useState([])
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(null)
  const [bossForm, setBossForm] = useState({ name: '', description: '', image_url: '', target_amount: '', reset_day: 25, rewards: [] })
  const [purchaseForm, setPurchaseForm] = useState({ member_id: '', amount: '', note: '', purchase_date: new Date().toISOString().split('T')[0] })
  const [newReward, setNewReward] = useState({ name: '', desc: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: bossData }, { data: allData }, { data: membersData }] = await Promise.all([
      supabase.from('boss_challenges').select('*').eq('is_active', true).single(),
      supabase.from('boss_challenges').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('id, display_name').order('display_name'),
    ])
    setBoss(bossData)
    setAllBosses(allData || [])
    setMembers(membersData || [])
    if (bossData) {
      const { data: pData } = await supabase.from('boss_purchases')
        .select('*, members(display_name, level)')
        .eq('boss_id', bossData.id)
        .order('created_at', { ascending: false })
      setPurchases(pData || [])
      setBossForm({ name: bossData.name, description: bossData.description || '', image_url: bossData.image_url || '', target_amount: bossData.target_amount, reset_day: bossData.reset_day, rewards: bossData.rewards || [] })
      setPreview(bossData.image_url || null)
    }
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
      const path = `boss/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('card-images').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('card-images').getPublicUrl(path)
      setBossForm(f => ({ ...f, image_url: data.publicUrl }))
    } catch (err) {
      alert('Boss 圖片上傳失敗：' + err.message)
      setPreview(bossForm.image_url || null)
    }
    setUploading(false)
  }

  async function handleSaveBoss() {
    setSaving(true)
    const thisMonth = new Date().toISOString().slice(0, 7)
    const payload = { name: bossForm.name, description: bossForm.description, image_url: bossForm.image_url || null, target_amount: parseInt(bossForm.target_amount), reset_day: parseInt(bossForm.reset_day), rewards: bossForm.rewards }
    if (boss) {
      await supabase.from('boss_challenges').update(payload).eq('id', boss.id)
    } else {
      await supabase.from('boss_challenges').insert({ ...payload, month: thisMonth })
    }
    await fetchData()
    setModal(null)
    setSaving(false)
  }

  async function handleAddPurchase() {
    if (!purchaseForm.member_id || !purchaseForm.amount || !boss) return
    setSaving(true)
    const amount = parseInt(purchaseForm.amount)
    await supabase.from('boss_purchases').insert({ boss_id: boss.id, member_id: purchaseForm.member_id, amount, note: purchaseForm.note, purchase_date: purchaseForm.purchase_date })
    await supabase.from('boss_challenges').update({ current_amount: (boss.current_amount || 0) + amount }).eq('id', boss.id)
    const { data: m } = await supabase.from('members').select('total_spent, points').eq('id', purchaseForm.member_id).single()
    if (m) {
      const { getLevel } = await import('../lib/supabase')
      const newPoints = m.points + amount
      await supabase.from('members').update({ total_spent: (m.total_spent || 0) + amount, points: newPoints, level: getLevel(newPoints) }).eq('id', purchaseForm.member_id)
      await supabase.from('point_logs').insert({ member_id: purchaseForm.member_id, type: 'purchase', points: amount, note: purchaseForm.note || '消費積分' })
    }
    await fetchData()
    setModal(null)
    setPurchaseForm({ member_id: '', amount: '', note: '', purchase_date: new Date().toISOString().split('T')[0] })
    setSaving(false)
  }

  async function handleDeletePurchase(p) {
    if (!window.confirm('確定刪除這筆消費紀錄？')) return
    await supabase.from('boss_purchases').delete().eq('id', p.id)
    await supabase.from('boss_challenges').update({ current_amount: Math.max(0, (boss.current_amount || 0) - p.amount) }).eq('id', boss.id)
    await fetchData()
  }

  async function handleDeleteBoss(b) {
    if (!window.confirm(`確定刪除「${b.name}」？此操作無法復原，所有相關消費紀錄也會一併刪除。`)) return
    await supabase.from('boss_purchases').delete().eq('boss_id', b.id)
    await supabase.from('boss_challenges').delete().eq('id', b.id)
    await fetchData()
  }

  async function handleSetActive(b) {
    await supabase.from('boss_challenges').update({ is_active: false }).neq('id', b.id)
    await supabase.from('boss_challenges').update({ is_active: true }).eq('id', b.id)
    await fetchData()
  }

  const progress = boss ? Math.round((boss.current_amount / boss.target_amount) * 100) : 0

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>Boss 管理</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setModal('boss')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#666', border: '0.5px solid #ddd', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
            ⚙️ {boss ? '編輯 Boss 設定' : '建立 Boss 挑戰'}
          </button>
          {boss && (
            <button onClick={() => setModal('purchase')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E24B4A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              ＋ 新增消費紀錄
            </button>
          )}
        </div>
      </div>

      {boss ? (
        <>
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>⚔️ 本月 Boss</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '0.5px solid #F09595', overflow: 'hidden', flexShrink: 0 }}>
                {boss.image_url
                  ? <img src={boss.image_url} alt={boss.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block' }} />
                  : null}
                <span style={{ display: boss.image_url ? 'none' : 'block' }}>⚔️</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{boss.name}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{boss.description || '本月挑戰'} · 重置日每月 {boss.reset_day} 號</div>
              </div>
              <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#EAF3DE', color: '#27500A' }}>✓ 進行中</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999', marginBottom: 4 }}>
              <span>進度</span><span style={{ color: '#A32D2D', fontWeight: 500 }}>${boss.current_amount?.toLocaleString()} / ${boss.target_amount?.toLocaleString()} · {progress}%</span>
            </div>
            <div style={{ height: 10, background: '#f5f5f5', borderRadius: 99, overflow: 'hidden', border: '0.5px solid #e5e5e5' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#E24B4A', borderRadius: 99 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
              {[{ num: purchases.length, label: '筆紀錄' }, { num: `$${boss.current_amount?.toLocaleString()}`, label: '累積消費' }, { num: `$${boss.target_amount?.toLocaleString()}`, label: '目標' }, { num: `$${(boss.target_amount - boss.current_amount)?.toLocaleString()}`, label: '距目標' }].map((s, i) => (
                <div key={i} style={{ background: '#f8f8f8', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{s.num}</div>
                  <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
                  {['會員', '消費金額', '日期', '備註', '操作'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#633806' }}>{p.members?.display_name?.[0]}</div>
                        {p.members?.display_name}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111' }}>${p.amount?.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', color: '#999' }}>{p.purchase_date}</td>
                    <td style={{ padding: '10px 14px', color: '#999' }}>{p.note || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => handleDeletePurchase(p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, color: '#A32D2D', background: 'transparent', cursor: 'pointer' }}>🗑️ 刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: 40, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚔️</div>
          <div style={{ fontSize: 14, color: '#aaa', marginBottom: 16 }}>尚未設定本月 Boss</div>
          <button onClick={() => setModal('boss')} style={{ background: '#E24B4A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>建立 Boss 挑戰</button>
        </div>
      )}

      {/* 歷史紀錄 */}
      {allBosses.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#111', borderBottom: '0.5px solid #e5e5e5' }}>📋 所有挑戰紀錄</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f8f8', borderBottom: '0.5px solid #e5e5e5' }}>
                {['名稱', '目標', '累積', '月份', '狀態', '操作'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allBosses.map(b => (
                <tr key={b.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111' }}>{b.name}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>${b.target_amount?.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>${b.current_amount?.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#999' }}>{b.month}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {b.is_active
                      ? <span style={{ fontSize: 11, background: '#EAF3DE', color: '#27500A', padding: '2px 8px', borderRadius: 20 }}>進行中</span>
                      : <span style={{ fontSize: 11, background: '#f5f5f5', color: '#999', padding: '2px 8px', borderRadius: 20 }}>已結束</span>}
                  </td>
                  <td style={{ padding: '10px 14px', display: 'flex', gap: 6 }}>
                    {!b.is_active && (
                      <button onClick={() => handleSetActive(b)} style={{ padding: '4px 8px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer' }}>設為進行中</button>
                    )}
                    <button onClick={() => handleDeleteBoss(b)} style={{ padding: '4px 8px', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, color: '#A32D2D', background: 'transparent', cursor: 'pointer' }}>🗑️ 刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增消費彈出視窗 */}
      {modal === 'purchase' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 340, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>新增消費紀錄</div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => setModal(null)}>✕</span>
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>手動輸入會員本月消費</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>會員</label>
              <select value={purchaseForm.member_id} onChange={e => setPurchaseForm({ ...purchaseForm, member_id: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, background: '#fff', color: '#111' }}>
                <option value="">選擇會員...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>消費金額（元）</label>
                <input type="number" value={purchaseForm.amount} onChange={e => setPurchaseForm({ ...purchaseForm, amount: e.target.value })} placeholder="3,200"
                  style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>消費日期</label>
                <input type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>備註（選填）</label>
              <input value={purchaseForm.note} onChange={e => setPurchaseForm({ ...purchaseForm, note: e.target.value })} placeholder="例：購買補充包 × 8"
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
              <button onClick={handleAddPurchase} disabled={saving}
                style={{ flex: 1, padding: 9, background: saving ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '處理中...' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boss設定彈出視窗 */}
      {modal === 'boss' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 380, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>Boss 設定</div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => setModal(null)}>✕</span>
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>設定本月挑戰內容</div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            <div onClick={() => !uploading && fileRef.current?.click()}
              style={{ border: '0.5px dashed #ddd', borderRadius: 8, padding: 14, textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer', background: '#f8f8f8', marginBottom: 14, minHeight: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {preview
                ? <img src={preview} alt="" style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain', borderRadius: 8 }} />
                : <div style={{ color: '#aaa' }}>
                    <i className="fa-solid fa-image" style={{ fontSize: 24, display: 'block', marginBottom: 6 }}></i>
                    <div style={{ fontSize: 12 }}>{uploading ? '上傳中...' : '點擊上傳 Boss 圖片'}</div>
                  </div>
              }
            </div>
            {preview && !uploading && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 14 }}>
                <span onClick={() => fileRef.current?.click()} style={{ fontSize: 12, color: '#E24B4A', cursor: 'pointer' }}>重新上傳</span>
                <span onClick={() => { setPreview(null); setBossForm(f => ({ ...f, image_url: '' })) }} style={{ fontSize: 12, color: '#999', cursor: 'pointer' }}>移除圖片</span>
              </div>
            )}
            {[
              { label: 'Boss 名稱', key: 'name', placeholder: '例：訓練家 Giovanni' },
              { label: '描述（選填）', key: 'description', placeholder: '例：火焰道館最終Boss' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input value={bossForm[f.key]} onChange={e => setBossForm({ ...bossForm, [f.key]: e.target.value })} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>消費目標（元）</label>
                <input type="number" value={bossForm.target_amount} onChange={e => setBossForm({ ...bossForm, target_amount: e.target.value })} placeholder="100000"
                  style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>重置日（幾號）</label>
                <input type="number" min="1" max="31" value={bossForm.reset_day} onChange={e => setBossForm({ ...bossForm, reset_day: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 8 }}>擊敗獎勵</label>
              {bossForm.rewards.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: '#f8f8f8', borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎁</div>
                  <div style={{ flex: 1, fontSize: 12, color: '#111' }}>{r.name}{r.desc ? ` · ${r.desc}` : ''}</div>
                  <span style={{ cursor: 'pointer', color: '#A32D2D', fontSize: 14 }} onClick={() => setBossForm(f => ({ ...f, rewards: f.rewards.filter((_, j) => j !== i) }))}>✕</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newReward.name} onChange={e => setNewReward({ ...newReward, name: e.target.value })} placeholder="獎勵名稱"
                  style={{ flex: 1, padding: '7px 9px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 12, color: '#111', outline: 'none' }} />
                <input value={newReward.desc} onChange={e => setNewReward({ ...newReward, desc: e.target.value })} placeholder="說明（選填）"
                  style={{ flex: 1, padding: '7px 9px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 12, color: '#111', outline: 'none' }} />
                <button onClick={() => { if (newReward.name) { setBossForm(f => ({ ...f, rewards: [...f.rewards, newReward] })); setNewReward({ name: '', desc: '' }) } }}
                  style={{ padding: '7px 12px', background: '#E24B4A', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>＋</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
              <button onClick={handleSaveBoss} disabled={saving || uploading}
                style={{ flex: 1, padding: 9, background: saving || uploading ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: saving || uploading ? 'not-allowed' : 'pointer' }}>
                {saving ? '儲存中...' : uploading ? '上傳中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
