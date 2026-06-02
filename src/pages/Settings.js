import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const LEVELS = [
  { name: '精靈球', min: 0 }, { name: '超級球', min: 1000 }, { name: '高級球', min: 10000 },
  { name: '豪華球', min: 20000 }, { name: '貴重球', min: 50000 }, { name: '究極球', min: 100000 }, { name: '大師球', min: 300000 },
]
const LEVEL_COLORS = ['#888780','#378ADD','#E24B4A','#BA7517','#854F0B','#534AB7','#26215C']

export default function AdminSettings() {
  const [settings, setSettings] = useState({ points_login: 5, points_streak_bonus: 15, points_purchase_ratio: 1 })
  const [announcement, setAnnouncement] = useState('')
  const [news, setNews] = useState({ title: '', date: '', image_url: '', body: '' })
  const [defaultAvatars, setDefaultAvatars] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()
  const avatarFileRef = useRef()

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*')
    if (data) {
      const s = {}
      data.forEach(d => { try { s[d.key] = JSON.parse(d.value) } catch(e) { s[d.key] = d.value } })
      if (s.announcement) setAnnouncement(s.announcement)
      if (s.news) setNews(s.news)
      if (s.default_avatars) setDefaultAvatars(s.default_avatars)
      setSettings(s)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (modal === 'announcement') {
        await supabase.from('settings').upsert({ key: 'announcement', value: JSON.stringify(form.announcement || '') })
        setAnnouncement(form.announcement || '')
      } else if (modal === 'news') {
        const newsData = { title: form.title||'', date: form.date||'', image_url: form.image_url||'', body: form.body||'' }
        await supabase.from('settings').upsert({ key: 'news', value: JSON.stringify(newsData) })
        setNews(newsData)
      } else if (modal === 'points') {
        for (const [key, value] of Object.entries(form)) {
          await supabase.from('settings').upsert({ key, value: JSON.stringify(value) })
        }
      } else if (modal === 'avatars') {
        await supabase.from('settings').upsert({ key: 'default_avatars', value: JSON.stringify(defaultAvatars) })
      }
      await fetchSettings()
      setModal(null)
      setPreview(null)
    } catch(e) { console.error(e) }
    setSaving(false)
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
      const path = `news/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('card-images').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('card-images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: data.publicUrl }))
    } catch(err) { alert('圖片上傳失敗：' + err.message); setPreview(null) }
    setUploading(false)
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `default-avatars/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('card-images').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('card-images').getPublicUrl(path)
      setDefaultAvatars(prev => [...prev, data.publicUrl])
    } catch(err) {
      alert('基本頭貼上傳失敗：' + err.message)
    }
    if (avatarFileRef.current) avatarFileRef.current.value = ''
    setUploading(false)
  }

  function openModal(type) {
    if (type === 'points') setForm({ points_login: settings.points_login||5, points_streak_bonus: settings.points_streak_bonus||15, points_purchase_ratio: settings.points_purchase_ratio||1 })
    if (type === 'announcement') setForm({ announcement })
    if (type === 'news') { setForm({ title: news.title||'', date: news.date||'', image_url: news.image_url||'', body: news.body||'' }); setPreview(news.image_url||null) }
    setModal(type)
  }

  const btnStyle = { display:'flex', alignItems:'center', gap:4, padding:'4px 10px', border:'0.5px solid #ddd', borderRadius:6, fontSize:11, color:'#666', background:'transparent', cursor:'pointer' }
  const inputStyle = { width:'100%', padding:'8px 10px', border:'0.5px solid #ddd', borderRadius:7, fontSize:13, color:'#111', outline:'none', boxSizing:'border-box' }
  const cardStyle = { background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:10, padding:16 }

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      <div style={{ fontSize: 20, fontWeight: 500, color: '#111', marginBottom: 20 }}>系統設定</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* 積分規則 */}
        <div style={cardStyle}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#111', display:'flex', alignItems:'center', gap:6 }}>
              <i className="fa-solid fa-coins" style={{ color:'#E24B4A' }}></i> 積分規則
            </div>
            <button onClick={() => openModal('points')} style={btnStyle}><i className="fa-solid fa-pen" style={{ marginRight:3 }}></i> 編輯</button>
          </div>
          {[
            { label:'每日登入', value:`+${settings.points_login||5} 點` },
            { label:'全勤獎勵', value:`額外 +${settings.points_streak_bonus||15} 點` },
            { label:'消費積分比例', value:`$1 = ${settings.points_purchase_ratio||1} 點` },
            { label:'積分有效期限', value:'永久有效' },
          ].map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'0.5px solid #f0f0f0' }}>
              <div style={{ fontSize:12, color:'#888' }}>{r.label}</div>
              <div style={{ fontSize:12, fontWeight:500, color:'#111' }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* 會員等級 */}
        <div style={cardStyle}>
          <div style={{ fontSize:13, fontWeight:500, color:'#111', display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
            <i className="fa-solid fa-medal" style={{ color:'#E24B4A' }}></i> 會員等級
          </div>
          {LEVELS.map((l, i) => (
            <div key={l.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'#f8f8f8', borderRadius:8, marginBottom:5 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:LEVEL_COLORS[i] }} />
              <div style={{ flex:1, fontSize:12, fontWeight:500, color:'#111' }}>{l.name}</div>
              <div style={{ fontSize:11, color:'#999' }}>{i===0 ? '初始會員' : `${l.min.toLocaleString()} 點`}</div>
            </div>
          ))}
        </div>

        {/* 首頁公告 */}
        <div style={cardStyle}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#111', display:'flex', alignItems:'center', gap:6 }}>
              <i className="fa-solid fa-bullhorn" style={{ color:'#E24B4A' }}></i> 首頁公告
            </div>
            <button onClick={() => openModal('announcement')} style={btnStyle}><i className="fa-solid fa-pen" style={{ marginRight:3 }}></i> 編輯</button>
          </div>
          <div style={{ fontSize:13, color:'#111', padding:'10px 12px', background:'#f8f8f8', borderRadius:8, fontStyle:'italic' }}>
            {announcement || '（尚未設定公告）'}
          </div>
        </div>

        {/* 每日新聞 */}
        <div style={cardStyle}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#111', display:'flex', alignItems:'center', gap:6 }}>
              <i className="fa-solid fa-newspaper" style={{ color:'#E24B4A' }}></i> 每日新聞
            </div>
            <button onClick={() => openModal('news')} style={btnStyle}><i className="fa-solid fa-pen" style={{ marginRight:3 }}></i> 編輯</button>
          </div>
          {news.image_url || news.title ? (
            <div style={{ display:'flex', gap:10, padding:10, background:'#f8f8f8', borderRadius:8 }}>
              {news.image_url
                ? <img src={news.image_url} alt="" style={{ width:56, height:48, objectFit:'cover', borderRadius:6, flexShrink:0 }} />
                : <div style={{ width:56, height:48, background:'#eee', borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}><i className="fa-solid fa-image" style={{ color:'#ccc' }}></i></div>
              }
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:'#111', marginBottom:3 }}>{news.title||'（無標題）'}</div>
                <div style={{ fontSize:11, color:'#999' }}>{news.date||'-'}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize:13, color:'#aaa', padding:'10px 12px', background:'#f8f8f8', borderRadius:8 }}>（尚未設定新聞）</div>
          )}
        </div>

        {/* 帳號安全 */}
        <div style={cardStyle}>
          <div style={{ fontSize:13, fontWeight:500, color:'#111', display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
            <i className="fa-solid fa-lock" style={{ color:'#E24B4A' }}></i> 帳號與安全
          </div>
          {[
            { label:'後台登入方式', value:'Email + 密碼' },
            { label:'會員登入方式', value:'LINE LIFF' },
            { label:'資料庫', value:'Supabase (Singapore)' },
            { label:'部署平台', value:'Vercel' },
          ].map(r => (
            <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'0.5px solid #f0f0f0' }}>
              <div style={{ fontSize:12, color:'#888' }}>{r.label}</div>
              <div style={{ fontSize:12, fontWeight:500, color:'#111' }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* 基本頭貼 */}
        <div style={cardStyle}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#111', display:'flex', alignItems:'center', gap:6 }}>
              <i className="fa-solid fa-user-circle" style={{ color:'#E24B4A' }}></i> 會員基本頭貼
            </div>
            <button onClick={() => openModal('avatars')} style={btnStyle}><i className="fa-solid fa-pen" style={{ marginRight:3 }}></i> 管理</button>
          </div>
          {defaultAvatars.length === 0
            ? <div style={{ fontSize:13, color:'#aaa', padding:'10px 12px', background:'#f8f8f8', borderRadius:8 }}>（尚未設定基本頭貼）</div>
            : <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {defaultAvatars.map(url => <img key={url} src={url} alt="" style={{ width:42, height:42, borderRadius:'50%', objectFit:'cover', border:'1.5px solid #eee' }} />)}
              </div>
          }
        </div>

      </div>

      {/* ── 彈窗：積分規則 ── */}
      {modal === 'points' && (
        <Overlay onClose={() => setModal(null)}>
          <ModalHead title="編輯積分規則" sub="修改後立即生效" onClose={() => setModal(null)} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            <Field label="每日登入積分"><input type="number" value={form.points_login} onChange={e => setForm({...form,points_login:parseInt(e.target.value)})} style={inputStyle}/></Field>
            <Field label="全勤額外獎勵"><input type="number" value={form.points_streak_bonus} onChange={e => setForm({...form,points_streak_bonus:parseInt(e.target.value)})} style={inputStyle}/></Field>
          </div>
          <Field label="消費積分比例（$1 = ? 點）"><input type="number" value={form.points_purchase_ratio} onChange={e => setForm({...form,points_purchase_ratio:parseInt(e.target.value)})} style={inputStyle}/></Field>
          <ModalFooter onClose={() => setModal(null)} onSave={handleSave} saving={saving} />
        </Overlay>
      )}

      {/* ── 彈窗：公告 ── */}
      {modal === 'announcement' && (
        <Overlay onClose={() => setModal(null)}>
          <ModalHead title="編輯首頁公告" sub="顯示在首頁頂部的跑馬燈文字" onClose={() => setModal(null)} />
          <Field label="公告內容"><input value={form.announcement||''} onChange={e => setForm({...form,announcement:e.target.value})} placeholder="例：🔥 M5 現正熱賣中！" style={inputStyle}/></Field>
          <ModalFooter onClose={() => setModal(null)} onSave={handleSave} saving={saving} />
        </Overlay>
      )}

      {/* ── 彈窗：每日新聞 ── */}
      {modal === 'news' && (
        <Overlay onClose={() => { setModal(null); setPreview(null) }} width={360}>
          <ModalHead title="編輯每日新聞" sub="設定顯示在首頁的每日新聞" onClose={() => { setModal(null); setPreview(null) }} />
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display:'none' }} />
          <div onClick={() => !uploading && fileRef.current?.click()}
            style={{ border:'0.5px dashed #ddd', borderRadius:8, padding:16, textAlign:'center', cursor:uploading?'not-allowed':'pointer', background:'#f8f8f8', marginBottom:14, minHeight:80, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
            {preview ? <img src={preview} alt="" style={{ maxHeight:100, objectFit:'contain', borderRadius:6 }} />
              : <><i className="fa-solid fa-image" style={{ fontSize:24, color:'#ccc', marginBottom:6 }}></i><div style={{ fontSize:12, color:'#999' }}>{uploading?'上傳中...':'點擊上傳新聞圖片'}</div></>}
          </div>
          {preview && !uploading && <div style={{ textAlign:'center', marginBottom:10 }}><span onClick={() => fileRef.current?.click()} style={{ fontSize:12, color:'#E24B4A', cursor:'pointer' }}>重新上傳</span></div>}
          <Field label="新聞標題"><input value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} placeholder="例：新系列即將發售！" style={inputStyle}/></Field>
          <Field label="日期"><input type="date" value={form.date||''} onChange={e => setForm({...form,date:e.target.value})} style={inputStyle}/></Field>
          <Field label="內文"><textarea value={form.body||''} onChange={e => setForm({...form,body:e.target.value})} placeholder="輸入新聞內文..." rows={5} style={{...inputStyle,resize:'vertical',lineHeight:1.6}}/></Field>
          <ModalFooter onClose={() => { setModal(null); setPreview(null) }} onSave={handleSave} saving={saving || uploading} label={uploading?'上傳中...':undefined} />
        </Overlay>
      )}

      {/* ── 彈窗：基本頭貼 ── */}
      {modal === 'avatars' && (
        <Overlay onClose={() => setModal(null)} width={420}>
          <ModalHead title="管理會員基本頭貼" sub="上傳後，會員可以在個人設定中選擇使用" onClose={() => setModal(null)} />
          <input ref={avatarFileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display:'none' }} />
          <button onClick={() => !uploading && avatarFileRef.current?.click()} disabled={uploading}
            style={{ width:'100%', padding:10, background:uploading?'#ccc':'#111', border:'none', borderRadius:8, fontSize:13, color:'#fff', cursor:uploading?'not-allowed':'pointer', marginBottom:14 }}>
            {uploading ? '上傳中...' : '＋ 上傳基本頭貼'}
          </button>
          {defaultAvatars.length === 0
            ? <div style={{ textAlign:'center', padding:'18px 0', fontSize:13, color:'#ccc' }}>尚未上傳基本頭貼</div>
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
                {defaultAvatars.map(url => (
                  <div key={url} style={{ textAlign:'center' }}>
                    <img src={url} alt="" style={{ width:54, height:54, borderRadius:'50%', objectFit:'cover', border:'1.5px solid #eee', marginBottom:4 }} />
                    <button onClick={() => setDefaultAvatars(prev => prev.filter(item => item !== url))}
                      style={{ border:'none', background:'transparent', fontSize:11, color:'#A32D2D', cursor:'pointer' }}>移除</button>
                  </div>
                ))}
              </div>
          }
          <ModalFooter onClose={() => setModal(null)} onSave={handleSave} saving={saving || uploading} label="儲存基本頭貼" />
        </Overlay>
      )}
    </div>
  )
}

function Overlay({ children, onClose, width = 340 }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'#fff', borderRadius:12, width, padding:20, maxHeight:'90vh', overflowY:'auto' }}>{children}</div>
    </div>
  )
}
function ModalHead({ title, sub, onClose }) {
  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <div style={{ fontSize:15, fontWeight:500 }}>{title}</div>
        <span style={{ cursor:'pointer', color:'#aaa', fontSize:18 }} onClick={onClose}>✕</span>
      </div>
      {sub && <div style={{ fontSize:12, color:'#999', marginBottom:16 }}>{sub}</div>}
    </>
  )
}
function ModalFooter({ onClose, onSave, saving, label }) {
  return (
    <div style={{ display:'flex', gap:8, marginTop:16 }}>
      <button onClick={onClose} style={{ flex:1, padding:9, border:'0.5px solid #ddd', borderRadius:8, fontSize:13, color:'#666', background:'transparent', cursor:'pointer' }}>取消</button>
      <button onClick={onSave} disabled={saving} style={{ flex:1, padding:9, background:saving?'#ccc':'#E24B4A', border:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'white', cursor:saving?'not-allowed':'pointer' }}>
        {saving ? '儲存中...' : (label || '儲存')}
      </button>
    </div>
  )
}
function Field({ label, children }) {
  return <div style={{ marginBottom:12 }}><label style={{ fontSize:11, color:'#999', display:'block', marginBottom:4 }}>{label}</label>{children}</div>
}
