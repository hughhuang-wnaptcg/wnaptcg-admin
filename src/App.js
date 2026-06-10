import React, { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import Layout from './pages/Layout'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Purchases from './pages/Purchases'
import Shipping from './pages/Shipping'
import Cards from './pages/Cards'
import Boss from './pages/Boss'
import Settings from './pages/Settings'
import Grading from './pages/Grading'
import Shop from './pages/Shop'
import TodayMenu from './pages/TodayMenu'
import Board from './pages/Board'

// ── 音效（Web Audio API，不需要音效檔）────────────────
function playNotificationSound(type = 'menu') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (type === 'menu') {
      // 直播下單：兩聲短促高音
      [0, 0.15].forEach((startTime) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(880, ctx.currentTime + startTime)
        osc.frequency.setValueAtTime(1100, ctx.currentTime + startTime + 0.05)
        gain.gain.setValueAtTime(0.3, ctx.currentTime + startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.2)
        osc.start(ctx.currentTime + startTime)
        osc.stop(ctx.currentTime + startTime + 0.2)
      })
    } else {
      // 商城兌換：單聲較低音
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(660, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    }
  } catch (e) {
    // 部分瀏覽器限制，靜默失敗
  }
}

// ── 瀏覽器通知 ────────────────────────────────────────
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function sendBrowserNotification(title, body, type) {
  if (Notification.permission !== 'granted') return
  const icon = type === 'menu' ? '🛒' : '🎁'
  new Notification(`${icon} ${title}`, {
    body,
    icon: '/logo192.png',
    tag: `order-${Date.now()}`,
    requireInteraction: false,
  })
}

function PrivateRoute({ children, admin, loading }) {
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 14, color: '#888' }}>
      載入中...
    </div>
  )
  return admin ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const channelsRef = useRef([])
  const adminRef = useRef(null)

  // adminRef 同步，讓 Realtime callback 能讀到最新值
  useEffect(() => { adminRef.current = admin }, [admin])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchAdmin(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) fetchAdmin(session.user.id)
      else { setAdmin(null); setLoading(false); cleanupChannels() }
    })
    return () => { subscription.unsubscribe(); cleanupChannels() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cleanupChannels() {
    channelsRef.current.forEach(ch => supabase.removeChannel(ch))
    channelsRef.current = []
  }

  async function fetchAdmin(userId) {
    const { data } = await supabase.from('members').select('*').eq('id', userId).eq('is_admin', true).single()
    setAdmin(data || null)
    setLoading(false)
    if (data) {
      await requestNotificationPermission()
      setupRealtimeListeners()
    }
  }

  function setupRealtimeListeners() {
    cleanupChannels()

    // 監聽直播訂單
    const menuChannel = supabase
      .channel('admin-menu-orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'menu_orders',
      }, (payload) => {
        const order = payload.new
        const orderNo = order.order_no ? `#${String(order.order_no).padStart(4, '0')}` : ''
        const amount = order.total_amount ? `$${order.total_amount.toLocaleString()}` : ''
        playNotificationSound('menu')
        sendBrowserNotification(
          '新直播訂單',
          `訂單 ${orderNo} ${amount}`,
          'menu'
        )
      })
      .subscribe()

    // 監聽商城訂單
    const shopChannel = supabase
      .channel('admin-shop-orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'shop_orders',
      }, (payload) => {
        const order = payload.new
        const productName = order.product_name || '商品'
        const points = order.points_spent ? `${order.points_spent.toLocaleString()} 點` : ''
        playNotificationSound('shop')
        sendBrowserNotification(
          '新商城兌換',
          `${productName} ${points}`,
          'shop'
        )
      })
      .subscribe()

    channelsRef.current = [menuChannel, shopChannel]
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <PrivateRoute admin={admin} loading={loading}>
            <Layout admin={admin} setAdmin={setAdmin} />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="shipping" element={<Shipping />} />
          <Route path="cards" element={<Cards />} />
          <Route path="boss" element={<Boss />} />
          <Route path="grading" element={<Grading />} />
          <Route path="shop" element={<Shop />} />
          <Route path="today-menu" element={<TodayMenu />} />
          <Route path="board" element={<Board />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
