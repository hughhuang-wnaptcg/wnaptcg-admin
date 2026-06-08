        </select>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
              {['會員', '等級', '累積積分', '累積消費', '加入日期', '最後登入', '排行榜', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>載入中...</td></tr>
            ) : filtered.map(m => (
              <tr key={m.id} style={{ borderBottom: '0.5px solid #f0f0f0', opacity: m.is_hidden ? 0.5 : 1 }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#633806', flexShrink: 0 }}>{m.display_name?.[0]}</div>
                    }
                    <div>
                      <div style={{ fontWeight: 500, color: '#111', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {m.display_name}
                        {m.is_hidden && <span style={{ fontSize: 9, background: '#f5f5f5', color: '#999', padding: '1px 5px', borderRadius: 4, border: '0.5px solid #ddd' }}>隱藏</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>#{String(m.member_no||'0').padStart(4,'0')}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}><LevelBadge level={m.level} size='sm' /></td>
                <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111' }}>{m.points?.toLocaleString()}</td>
                <td style={{ padding: '10px 14px', color: '#666' }}>${(m.total_spent||0).toLocaleString()}</td>
                <td style={{ padding: '10px 14px', color: '#999' }}>{new Date(m.created_at).toLocaleDateString('zh-TW')}</td>
                <td style={{ padding: '10px 14px', color: '#999' }}>{m.last_login_date || '-'}</td>
                <td style={{ padding: '10px 14px' }}>
                  {/* is_hidden toggle */}
                  <div
                    onClick={() => handleToggleHidden(m)}
                    title={m.is_hidden ? '點擊顯示於排行榜' : '點擊從排行榜隱藏'}
                    style={{
                      width: 36, height: 20, borderRadius: 99, cursor: 'pointer',
                      background: m.is_hidden ? '#e5e5e5' : '#06C755',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      display: 'inline-block',
                    }}>
                    <div style={{
                      position: 'absolute', top: 2,
                      left: m.is_hidden ? 2 : 18,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => { setModal({ type: 'adjust', member: m }); setAdjustPoints({ type:'add', amount:'', note:'' }) }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer' }}>
                      <i className="fa-solid fa-coins" style={{ fontSize: 10 }}></i> 調整積分
                    </button>
                    <button onClick={() => { setModal({ type: 'delete', member: m }); setDeleteConfirmName('') }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, color: '#A32D2D', background: 'transparent', cursor: 'pointer' }}>
                      <i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i> 刪除
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

      {/* 調整積分 Modal */}
      {modal?.type === 'adjust' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 340, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modal.member.avatar_url
                  ? <img src={modal.member.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#633806' }}>{modal.member.display_name?.[0]}</div>
                }
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{modal.member.display_name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{modal.member.level} · {modal.member.points?.toLocaleString()} 點</div>
                </div>
              </div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => setModal(null)}>✕</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>調整類型</label>
              <select value={adjustPoints.type} onChange={e => setAdjustPoints({ ...adjustPoints, type: e.target.value })} style={inp}>
                <option value="add">增加積分</option>
                <option value="subtract">扣除積分</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>積分數量</label>
              <input type="number" value={adjustPoints.amount} onChange={e => setAdjustPoints({ ...adjustPoints, amount: e.target.value })} placeholder="輸入數量..." style={inp} />
              {adjustPoints.amount && (
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  調整後：{Math.max(0, modal.member.points + (adjustPoints.type==='add'?1:-1)*parseInt(adjustPoints.amount||0)).toLocaleString()} 點
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>備註（選填）</label>
              <input value={adjustPoints.note} onChange={e => setAdjustPoints({ ...adjustPoints, note: e.target.value })} placeholder="例：活動獎勵、手動補正..." style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
              <button onClick={handleAdjustPoints} disabled={saving || !adjustPoints.amount}
                style={{ flex: 1, padding: 9, background: saving||!adjustPoints.amount ? '#ccc' : '#06C755', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
                {saving ? '處理中...' : '確認調整'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除會員 Modal */}
      {modal?.type === 'delete' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 360, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-trash" style={{ fontSize: 14, color: '#A32D2D' }}></i>
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>刪除會員</div>
              </div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => setModal(null)}>✕</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f8f8f8', borderRadius: 8, marginBottom: 12 }}>
              {modal.member.avatar_url
                ? <img src={modal.member.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#633806', flexShrink: 0 }}>{modal.member.display_name?.[0]}</div>
              }
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{modal.member.display_name}</div>
                <div style={{ fontSize: 11, color: '#999' }}>#{String(modal.member.member_no||'0').padStart(4,'0')} · {modal.member.level} · {modal.member.points?.toLocaleString()} 點</div>
              </div>
            </div>
            <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#A32D2D', fontWeight: 500, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="fa-solid fa-triangle-exclamation"></i> 此操作不可復原，將同時刪除：
              </div>
              {['會員帳號（無法再登入）', '所有積分紀錄', '所有消費記錄', '所有登入紀錄', 'BOSS 挑戰紀錄'].map(item => (
                <div key={item} style={{ fontSize: 12, color: '#A32D2D', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <i className="fa-solid fa-xmark" style={{ fontSize: 10 }}></i> {item}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>
                請輸入 <strong style={{ color: '#111' }}>{modal.member.display_name}</strong> 以確認刪除
              </label>
              <input
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                placeholder={`輸入「${modal.member.display_name}」`}
                style={{ ...inp, border: `0.5px solid ${isDeleteConfirmed ? '#86efac' : '#ddd'}`, background: isDeleteConfirmed ? '#f0fdf4' : '#fff' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setModal(null); setDeleteConfirmName('') }}
                style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>
                取消
              </button>
              <button onClick={handleDeleteMember} disabled={saving || !isDeleteConfirmed}
                style={{ flex: 1, padding: 9, background: saving || !isDeleteConfirmed ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
                {saving ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
