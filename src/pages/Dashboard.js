import React, { useEffect, useState } from 'react'
import { LevelBadge } from '../lib/pokeballs'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ members: 0, thisMonthSpent: 0, todayLogins: 0, cards: 0 })
  const [boss, setBoss] = useState(null)
  const [levelDist, setLevelDist] = useState([])
  const [topMembers, setTopMembers] = useState([])
  const [activities, setActivities] = useState([])

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().slice(0, 7)

    const [{ count: memberCount }, { count: cardCount }, { count: todayCount }, { data: bossData }, { data: membersData }, { data: logsData }] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }),
      supabase.from('cards').select('*', { count: 'exact', head: true }),
      supabase.from('daily_logins').select('*', { count: 'exact', head: true }).eq('login_date', today),
      supabase.from('boss_challenges').select('*').eq('is_active', true).single(),
      supabase.from('members').select('display_name, level, points').order('points', { ascending: false }).limit(5),
      supabase.from('point_logs').select('*, members(display_name)').order('created_at', { ascending: false }).limit(5),
    ])

    const { data: purchaseData } = await supabase.from('boss_purchases')
      .select('amount').gte('created_at', `${thisMonth}-01`)
    const thisMonthSpent = (purchaseData || []).reduce((s, p) => s + p.amount, 0)

    setStats({ members: memberCount || 0, thisMonthSpent, todayLogins: todayCount || 0, cards: cardCount || 0 })
    setBoss(bossData)
    setTopMembers(membersData || [])
    setActivities(logsData || [])

    // 等級分佈
    const { data: allMembers } = await supabase.from('members').select('level')
    const dist = {}
    ;['精靈球', '超級球', '高級球', '豪華球', '貴重球', '究極球', '大師球'].forEach(l => dist[l] = 0)
    ;(allMembers || []).forEach(m => { if (dist[m.level] !== undefined) dist[m.level]++ })
    setLevelDist(Object.entries(dist).map(([name, count]) => ({ name, count })))
  }

  const bossProgress = boss ? Math.round((boss.current_amount / boss.target_amount) * 100) : 0
  const maxCount = Math.max(...levelDist.map(d => d.count), 1)
  const distColors = ['#888780', '#378ADD', '#E24B4A', '#BA7517', '#854F0B', '#534AB7', '#26215C']
  const logIcons = { login: '👤', streak_bonus: '🎯', purchase: '🛍️', manual: '✏️', level_up: '⬆️' }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>總覽儀表板</div>
        <div style={{ fontSize: 13, color: '#999' }}>{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* 統計卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { icon: '👥', label: '總會員數', num: stats.members },
          { icon: '💰', label: '本月消費', num: `$${stats.thisMonthSpent.toLocaleString()}` },
          { icon: '📅', label: '今日登入', num: stats.todayLogins },
          { icon: '🎴', label: '戰績牆卡牌', num: stats.cards },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>{s.icon}</span>{s.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 500, color: '#111' }}>{s.num}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Boss狀態 */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>⚔️ 本月 Boss 狀態</div>
          {boss ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '0.5px solid #F09595' }}>⚔️</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{boss.name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>重置日：每月 {boss.reset_day} 號</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999', marginBottom: 4 }}>
                <span>進度</span><span style={{ color: '#A32D2D', fontWeight: 500 }}>{bossProgress}%</span>
              </div>
              <div style={{ height: 8, background: '#f5f5f5', borderRadius: 99, overflow: 'hidden', border: '0.5px solid #e5e5e5', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${bossProgress}%`, background: '#E24B4A', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {[{ num: `$${boss.current_amount?.toLocaleString()}`, label: '累積消費' }, { num: `$${boss.target_amount?.toLocaleString()}`, label: '目標' }, { num: `$${(boss.target_amount - boss.current_amount)?.toLocaleString()}`, label: '距目標' }].map((s, i) => (
                  <div key={i} style={{ background: '#f8f8f8', borderRadius: 7, padding: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{s.num}</div>
                    <div style={{ fontSize: 10, color: '#999', marginTop: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: 20 }}>尚未設定本月 Boss</div>}
        </div>

        {/* 等級分佈 */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>👥 等級分佈</div>
          {levelDist.map((d, i) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: '#999', width: 52, flexShrink: 0 }}>{d.name}</div>
              <div style={{ flex: 1, height: 7, background: '#f5f5f5', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(d.count / maxCount) * 100}%`, background: distColors[i], borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 11, color: '#999', width: 24, textAlign: 'right' }}>{d.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* 最新動態 */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 12 }}>🕐 最新動態</div>
          {activities.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #f0f0f0' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                {logIcons[a.type] || '✏️'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#111' }}>{a.members?.display_name} · {a.note || a.type}</div>
                <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{new Date(a.created_at).toLocaleString('zh-TW')}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 積分排行 */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 12 }}>⭐ 積分排行 Top 5</div>
          {topMembers.map((m, i) => (
            <div key={m.display_name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #f0f0f0' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: i < 3 ? '#BA7517' : '#aaa', width: 16 }}>{i + 1}</div>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#633806' }}>{m.display_name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{m.display_name}</div>
                <LevelBadge level={m.level} size='sm' />
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#3B6D11' }}>{m.points?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
