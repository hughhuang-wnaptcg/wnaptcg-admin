import React, { useEffect, useState, useRef } from 'react'
import { supabase, RARITY_COLORS } from '../lib/supabase'

const RARITIES = ['UR', 'HR', 'SAR', 'CSR', 'SR', 'SSR', 'AR', 'CHR', 'PROMO', 'Other']

const SNKR_LOGO = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAGNbWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAsaWxvYwAAAABEAAACAAEAAAABAAACJwAAFh8AAgAAAAEAAAG1AAAAcgAAAEJpaW5mAAAAAAACAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAAAaaW5mZQIAAAAAAgAAYXYwMUFscGhhAAAAABppcmVmAAAAAAAAAA5hdXhsAAIAAQABAAAAw2lwcnAAAACdaXBjbwAAABRpc3BlAAAAAAAAAjgAAAFyAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQEMAAAAABNjb2xybmNseAACAAIAAoAAAAAOcGl4aQAAAAABCAAAAAxhdjFDgQEcAAAAADhhdXhDAAAAAHVybjptcGVnOm1wZWdCOmNpY3A6c3lzdGVtczphdXhpbGlhcnk6YWxwaGEAAAAAHmlwbWEAAAAAAAAAAgABBAECgwQAAgQBBYYHAAAWmW1kYXQSAAoLAAAADMRvcTa+SoAyYRAAjYA44lEAALvJ5SU/dhUj5Z33aySNpMfcUpSnSdHQlXgGTZVFCukV+bb+i2dxc4bWjKQUU7JJL2Kf3ggX9KRwdQO7fqey6Bmah42LW14tV8IeUC0In6arxh/yg7sivqgSAAoLAAAADMRvcTa+QhAyjSwQAIgABhhhiUQQAAC7BV+sOK15hVSx+nePRh5rcInVv901XVM+F7bPqqxO7n0nkbeJSI6GW3juy6OHRXlE1keNaIPvOcfVzA62UnRe/R/lM6Iu3CFT3aYaXy7RnzQsRZ8zZOZkBsK6C5Wyh0/rppN5MtHDqvj9jSp/CPUfMhEyQY8Rbi2I1waUB8+/ekijTmHF3Tfvn33YhYVN7viCtLO73Fh8ehfNHIi1njEW3Q+f9K6LE6ccwgURJO/7LFgpfUE13r0e8gr5zZ7H5U535RnRtaav48REyxB/8ocJ+mz6+LwSYoPm5GzSgccI2u07AB/vXKqWbj0psI8rH9SqMMT5MAAEObOGAgwEaBb3EHN3gKAdBvmaHU3ylFL75iUhJuM4czv7hKd4/6w5k5ltZTcE34RuiDVUEQPF6EKEOHz1JHXhOy8IoxJ2NAj245S2IQAAGxId/+c86MTVWBTs8GD1+YTIMujRZecf9PMhzdO3LICFSwXjY/o3pRpf54vfAmnL80FtcrTrlM0HUV2PAG5ec30TCFBRvWkD12VShvWqkmyoZWddf+q04KHezRcJNFM4iDgN4HVReTvQ56jQzYZu0/QIxdUOMhFRw+uib6uEGotF9sjQisBMlOPfre0HkCC7uCPd0iPnnh5jQxUHh3LpHdSIVbBkYjp9evBktreKubNsSl5IoTMU1njVrQuYa5XyilXBJM2Xp48AfO1MZAg+Xc85Rk3wfs//mnyRmyXLPK6J3yyiHcu8+DyF1FS1DWmPgJgR0/nozJAgI6qMrY1VBEWMgwxgAEdctJGzg17TcyjgwwjAb1INYImppI7r6uEVHALSHnOx8BAatq9nLcRrpg1rh9Yb4Sr3VWGeOL3irMKKTJ2tzbX5VHefKl+QWT0ry+pLzz5R13NWIeQVaS/LwhAKSOkVKCAmHRQICsF88kjSnlJyk1iYhrX2hPkSw9OXt+7ksvahO+lE+gbfEy94WCJZi5SfoSo61rRmqlzjEhwPChVAqds9UIYVET5s39hywLonCz8PvvEcYXxhP3lepdRLddfD17RTpXyW4k5/ay9bESq6xBfDX2BmMTAm8PV1JaPHwh4wSIackSDP4xTtDyE5DgaDxnpSpg0PDqS+4mPjuCXAAhLl/TA6fkM0agBhDiqM+u3whcGNQhOjI6UjBsdYdqm8tKovPGkrlz0RDKzoCrMf9+hSwOvFoVYlFdsIuIGw9dzUgoeHXFiEAhwo+er2m6rBYmRxUQq44kN03c1E1FfJBNcSERcwL2fFg6qMs4yUvXS94NvkpA0kvkf1uqTtQtYOdwUjuEn2RNmgmCp+HjELtpZl9pKxEwoP2/nL/G9ks6JE+hnqMTSJO2+vU3VgpGwhZv31JKnKcqNWf1/a0i38oFYnVIIFCcrmY+X+yb9DX3PdchxmR1Qteev5Ig0QhjkFJMRRO5AEk/+vsF8JLuMeYQehhSCWYaPO/BM5C0uDUPpuAPoIiXA7rfo7zgLdTSuJkGCjbUm9NDsd8+RV5wgq2B8hzXPhECvRbjycCMECgU8uMdlrSCArJXI+59qaKIxz/QdaE6i8wLpfpZnfchJ1O8wQ5S6aCPEyGoa8CWgfec83S3MXJelqAsn9eGmOO9UTss/77RTpoBTxSI2HWIxvl5Vxyt+qmXFjQICnHBYg2diEXrPrjoCKyAK2ocn6+8Qmd+nlNlRSWtPXWQQqvDN2VD+L8jGuWxvK2MiOVZ+k+DR6A2ItDzuYBXRD5h+p453ztVhEVYYlQ7c1NNGkp/lA0hCSva7gQVpj2lwMh39395/qDLJb98vsECvySVESGfsUcHDTSceZrLdOK43/3/C68SbMq8DrTC7E/4WHYiRUd0eo0T+Tf/kNXAwmjDgRUn/L9JpVP36ycY275bOAgYR++hB244gRRMHONhKuyuzxJcUAEiQ4etU8kCyAI3ozvQW6QicwYIc683NCodRuWYEd7pGbiQYYDKtMB9wpPZmLjyc0Eua4GT3LJv8FCB0S681AYjyZ9IenNclvxPIFqONRRms7o1oeZyu5fZJnb38U6M8J+rCLY4mhh3OepTLuC47WnLldJmeo9QWR5MN0xNyjUoWuo/wWBolHi9tpiAzXht6ExQcQLk8ibEYMQVNdlIBHG5c524HBKiciwjkU8OXp82iWPgQ6X8y3XF5aF4DHZ4no+Oz3iRuJ6lwxKeWp1uKJ9uWlev4KZHkRn3+HqjPe4cnWC61WPTWu44+uXIZzMWvWuUw5ObwHBPbNOAycdgrfR4AWdL3uzHeIoOh5VzS9DnBcAAAAAAZIDZhgm+zC4SjGdTwMvC6AvYN5gqSLSeh9YU/Sqg63pLcO4AN1h4Gf92GL+XsPJo2hLMTNXjz0QqQODNcVsNS49my+zpwi5udMawKJCsNSzR/kqpRu3Jw5zKhOrBUiQ0vSq3DG9mbiXniuayUGScRVXjc0hVvcT7TiAraQ3+iN3anddIYA4eN4MnABXAieUZ+V8FRgSltPdTLvHHZgBnLXl+Xd1ldHjkprbFEVy869yDpwQrrA+GUDmiu4ZYQG6Kkm6HDmDRjAP1z7yKpQ401zmrIeh+6DjACycr4n+6Bz4MjdUc6M98mOz1GPqjG65rlGQfWVyl9R8RJlXEP2zTylBRdnYy/nGlwXqnjB7rpFM1HaDytuJybii2kwq7lctPBSTFcd5Quo9aA8tCBkveYtm9FpzWCUJCAI1zvRYFgNYH6MX2W26IGFXAbhR4pJMwyL7LUUX9b6UMfmB/iPst1tJpQHUht0H3UgwRpaemcKi169FT5QEssZzYeJkEtbztaQohR65qgauvXT/8/y6hFI5oVJhcoHuLOICbA4GfuCIAkRoYEyK6Yr2s2qtSitzU5DsUVV5ZX67VnzDVQALVfdJLbI5OLtMiTMmNi+l1AN4XwpM9szgV+THwI4RRtV444101HlAZU9ZOA+V3Z0X0LM8OmuF+cw3nYPGr/nIANZYprbTB974bfrnqq9aESGPvPXgPVLstmEOJG9h04clg5etAPeLdzwphT5555dxR6aeJ/nlj5+XQZB++MIiVA1Jz4f1H2vqLxRjd24Sf93taFQzgQqvXZkx3vAtUskbbXaurfHkyJhmz59Qh8aoNG3QJ29llb0bfSGbJBcm1bAL9s2HMrkOJe7JDcw+UU6uwFkTEKG2GSMdWHLwFStyZcgaS7orSIYRaS5rnMdEK5nN/V24qhUbwPCI2EbOYjazd64WN7sJeAYdTWsM3UzPx98UGe1ZEzBwXiK5exhMUTszMlalExqzDkQ62WCunSYpepYHmiN2yzL6xO7Whv/ldERQcKSAwXI68rfENKZvbV45HOjzfGBgmnFyyq8eICx8bbO0wOPI7C9ofUS6YDTo0/HKSukZX2zZNEU0eSV9G6hDHXWQN8jEFCPKTlUzVUE3VG/P2qIiJXLcHC5BAUEIU+bT9cyQFGzrmrTu2x+cm7oxefjlq7/Z8qGLby9P1FwAPBB/alUmQga0B0X7ZDYeh/PpFnPCDOICB56h9tNYXjBFUu363xhkeqdG7iHDKqtc1CqRPUT7aBqF6lagmTGPQX6SJ2ESlKtRuqx5Wp+sbO9fF3yvWWQisiDj7w1msBXmfCRpxg74iPW8EzVZ0g4ADvlcVEnWiOjctD4YqWrRfzUC/KfXaSmDZlVizaYYo5QGt2HpKw3sYFKKPi09gGvmsxMXv11kImRytOtw/u4nbzLYvsUPyW0nn4a0nWYhRcvM4iu0sd6eDojsPTk5X5PIKmmJEz2IfgRjtnvYimQKhfNS1nJCD77oSYHGU/tMxJVylfIbWofLmupPjlwrOgh2tCN11lseRrXwTleZI0M69PzwNF+HqHFsYTiYi2xYZZ1axhDe+PZxbWXJiJSpSGOsDOJQ8zcHaBXY4Vimu00NSwHz1Fz0b4dMy9ciKF2toEYF4P43yzRov2Jmjctikfcd1cn9P20dWTrUKvNxABGsUs8poFxDHogRScrUYoxFLr3uZrmsX3TCPGYO7M+ww2+8NqiGasaBJiOITc1B8SBUSRkOI1KBETHwycVbQtShriLtj/K2g/a81yWFi4NK/AxexeAGNNzjsQiifhDj4gqtZ1RWfu95N5M0wXhkyyzbG58B5OGtMR+whJ5MJWFTbmM7kIr/s9OrkBheH4o5STeTiCb67OfLsLKQ+GfPFkMyPu1Mz9YxZVX6I7BRf1PpdLoBWCbm+fdyXT+vS7rIHt0GM+fJWO4FWFztGTvpwCdjlsgQoK/g00ga3VAgDG0fBSbHTjxCqGRhimfuGCu2c125DVg2LTctZKzGFGAtvT3bL2aVZNFL5Ol7IJuLyVGVzztMjgPbHhu9GgUSfkwH0wjs7QhBEGlhgC8U4gKVHwJGk+3tPFNaS/Q8JNDmH/+wjLvJ5TF/+BdVNeaaDM4jS1H/V1DNqEcHkFDOzdjzBfbGvsL0y5wvCk7djLzuxpeDNFxWmRUQREwP1PFTbzkJVHBCefWaQmSIaUBGHm1XvYhYfZQnv4vv4PH+WhbCws8/YqjLPR1BbffzFachXEGIbRNILaLlwwYxK0GQQXRW2pjgJTYwPn232CPaEI5GHf2lrMgd0zpgEVD/EBHNx5mqO4GCZMxAWm0GFvl0DPBwe6nhWrqcigRkkQ9n1vAIqNFV8MojpGmfyFzD+1H7M6KxexWOKZXdraQbPNpR+3o5lnyI/em//lIsth6t2w+1nBwNkEO+wVF/ycOZoXYxwXErmKINwkCXfoNSxY8AAAkdVAU0j781CkuivfgqLe8qFeDnNi4RgA7V1mxrFw0OJu4L0SJ+oqL+Xmb1d59ctrw+a5lF79KqPwv4OF3HaeN9JX4WL+76X4cpr9mwm/MSq6X9JGYQJRubXgUl5TqCXxqK6sY7wEa5spV48oWSIrDmUXWQenPUc6rXRYhUF0wSZ3sPRR2fK+D2Rcal9+wAbUd7i7wiOP2mrL4MsC3v81eXOFrNWF31BFQ0SRfgt95Hq9fanpaVHf2q2FABknV6AlLAnnB0Ihz3v+iZgrXhVn5N7sFrf+1spXR/z6hGcrdBMQS8RU9rPs9OFwF+4SF1yQN4lkyRL18rjGh1F5IxGVLAAe1C3mMZ6ZiPyURNB+ICR0BQSUOVK7M2GHy2sEHPLSA8gHpwRm0rpyeC3Ii4vIMesbYfaPTW+ZSvYjKr0EHLTimegzB4HzvEeKiKt2Bcqv/0vgHSp2hVV70aHRJhlRoio5mtL5vCPkMONnajgxYgJbUqev9uhrVjYDqR//0ZzTOc5znOc6ZqdPdeXEGa94+fy68sZSZGxpEYeYJ4f/bSb+plieT2BygzqXwnsZA+ryITOh77zk0CQeSi3dgK8eTUxfPgXQn4jML16S5SZCfLed0xVu0MomFEgyGemldvsfOWCvlxHwRpTuL4r70xpodbw60d0gMtyqqsK0dbwGte3WENfSdT3Ngi2yPrq1X2ge73BGJGJhCFq+CBViUhh+HyOvM6vu2j4T3MnvBeqWBDPYqPrFzNXf/UKg27RYrNmlLdKNkYRmtYvVoD7RdT3tGCVMKZT+l4/KkBbDJOfJFcXTheP0w0rZ3X9G8q5TN5K/OUqxB2SLIsdEXYh3cQJq89W78c6sXjK4NBDFY65BZbGTu72fsLkBygRzrQt8tzcyXwckN0e7565lh77SIL9K9bEnTpssNSBW2gk0e5mcmwoJyeEb/FvK6pBT5Dqc9wp+UHoUpzhrIyxBJ0c0KjO2/hd5mr0ub2jeSHBcdASC2RhVgqKv36Mp7nozcM0+Rh3z6CQBVwmfuS+sVFM7m84YAsOwrAZ+pbukH9EFSSaIN2g963pnercODRmALSL8CoiHEmV+UM9Tcu2cpPOS/0SaIcfvUyZCaJoPwkTtKMiBNeBe4a3K+MEtTpopDjiehsmfWVB3hYOYCe319Vs5ihPGc6/DzPNbC5NDwnp2fWZh4vbTeuy07sxFDrJCERQZ64JdOJVANdbLRjnqTgaWza/GsjDNeCbGvJ7na66VaYoTwYhx4gWy7G5jCS8btLf7oHfmb+rbZrWczEDfffWhi/8yifbW8526ogHXKU17HJa0eVCdcOCGykH7lGK8koXBlk7Oj+3YKTc9J5YurVTDrZzxOoc4ou4RMNu/lE1S7gOGgzFC8amcoe/9Aa+U/pltMaM4forj4dJeH32Jnrtt8RJJTe2Xa5V6XQggeruJtgmrBF8GjB8AZavuUANREPkRWFQ799dtAT2KffszzraInA5J39whN4fVfn4agskxJjassEzJm1syg3zBfQvmxrPtLJqxmifLMEBU01BiGN8mLb5DnlHSM8bd+HZUa56spdr3uwZKnfS3azEAAABll9HKFZZZs9jE81GlvMDROPoIALH7jKvgpNa+hlyG1/+xUzT5hcTiPAdKv6t43vt0Q0N7ag11LswkJIdLseq0si1TIwAADXJP3W1qwwUsMkLB5A9Wsokzwq+DSgnEdbL71X5bDgCJW7X83jv6D8pGIsTl2r2OT2vtAyri311h4K4wDXlmeuuj1hh9sHs/t8lNnPFOnC+9fGWWpSJhVBHw9Vn0qNPyhy2ZyFFr67AT5t7drxJlAR/Xj9mweItJCWg9Q6Ca+YBV1uM0zLMkNJ22mpjo7yHiwP2E8Hm9hlcFnzKwFAMFHLwsdgUPizuwhpcUtY61Ddwib8zagehbe1wLaNrJ6f1zHe0BgxsgdbENbkTwHXsi3XXbBXhpqoBN0eLIjtOVkhvtXbwSE0uC/ZwlvE7YCVwLwGAAgEj51eNUfRfeNVQVayhpXNWA4b5LYI9MCquZwTqxevHZwgJK9Zf8vQxYqe2cvP3Tn12l16sPCIE05FlcrK1PRNw2uGfqUtRKpds+qsbueLmCxNk1yfBbrlNpH6EsNeuK7Tt6ydOugZskb8vInhSTtE0r8C0t8og38OXxYAabdhK/3wFUpfXolm3KpOXafnW5fa9gfmbkFLyYbdglNKq0IHXt6YM2W3g0Kl8sy328zNkT/yL/60tJos1t1SWaIikn7Ptpy+SsAta4+CO0ohvsFDtlZeTq7aYv4yx62p5xaC04T720tVyllr9oOBitWR3u39JRP9jaJoaxoyIOwCHIeYQyySP58P6rR/rgtVCO6KUq9s82F5N8XkB9ciRwS0cmTppR0UF8Uc6QZe6TspHJIbHmURC3L+/9ieKnIwWxpRbttjIVGr8rTZjXDXpnZsTcyxzt69cANhqk7pNaAtrNZxEQixmI576odImzzWg2tuq8j8mjwN7O/CVH5mdhgaZxkoW2o+SPGpL9bPbFTg7SeyWTCT8MbNm5L2d6nEMHVc5rgPjCq6by6Ob0/BGboFq7nMxPRo3BZteOvrRV+ezNBPKySGN9DKY15WkpLiBQO9u9HfWIt+RrB4t5fCOPQO2joidfA0hWNKK/0MtD23XMmEH/KkfM6kr0zlh99FofF0q5NQ0XlV0w7Ei0/pwMlvrskOKs9DlzkxHsmsXGM7gvBpH4rXQCuSAgzPMG6qAcOHVr7U5dpdsjrQA=='

export default function AdminCards() {
  const [cards, setCards] = useState([])
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', rarity: 'UR', series: '', episode: '', image_url: '', snkr_price: '', ownerEntries: [] })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: cardsData }, { data: membersData }] = await Promise.all([
      supabase.from('cards').select('*, card_owners(member_id, created_at, members(display_name))').order('created_at', { ascending: false }),
      supabase.from('members').select('id, display_name').order('display_name'),
    ])
    setCards(cardsData || [])
    setMembers(membersData || [])
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `cards/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('card-images').upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('card-images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: data.publicUrl }))
    } catch (err) {
      alert('圖片上傳失敗：' + err.message)
      setPreview(null)
    }
    setUploading(false)
  }

  async function handleSave() {
    if (!form.name || !form.series) return
    setSaving(true)
    try {
      const ownerRows = form.ownerEntries.map(e => ({
        card_id: null,
        member_id: e.member_id,
        created_at: e.created_at || new Date().toISOString(),
      }))
      const payload = {
        name: form.name,
        rarity: form.rarity,
        series: form.series,
        episode: form.episode,
        image_url: form.image_url,
        snkr_price: form.snkr_price !== '' ? parseInt(form.snkr_price) : null,
      }
      if (modal === 'new') {
        const { data: newCard } = await supabase.from('cards').insert(payload).select().single()
        if (newCard && ownerRows.length > 0) {
          await supabase.from('card_owners').insert(ownerRows.map(r => ({ ...r, card_id: newCard.id })))
        }
      } else {
        await supabase.from('cards').update(payload).eq('id', modal.id)
        await supabase.from('card_owners').delete().eq('card_id', modal.id)
        if (ownerRows.length > 0) {
          await supabase.from('card_owners').insert(ownerRows.map(r => ({ ...r, card_id: modal.id })))
        }
      }
      await fetchData()
      setModal(null)
      setPreview(null)
    } catch (err) {
      alert('儲存失敗：' + err.message)
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('確定刪除這張卡牌？')) return
    await supabase.from('cards').delete().eq('id', id)
    await fetchData()
  }

  function openNew() {
    setForm({ name: '', rarity: 'UR', series: '', episode: '', image_url: '', snkr_price: '', ownerEntries: [] })
    setPreview(null)
    setModal('new')
  }

  function openEdit(card) {
    setForm({
      name: card.name,
      rarity: card.rarity,
      series: card.series,
      episode: card.episode || '',
      image_url: card.image_url || '',
      snkr_price: card.snkr_price != null ? String(card.snkr_price) : '',
      ownerEntries: card.card_owners?.map(o => ({
        member_id: o.member_id,
        created_at: o.created_at ? o.created_at.slice(0, 10) : '',
      })) || []
    })
    setPreview(card.image_url || null)
    setModal(card)
  }

  function addOwner(memberId) {
    if (!memberId || form.ownerEntries.find(e => e.member_id === memberId)) return
    setForm(f => ({ ...f, ownerEntries: [...f.ownerEntries, { member_id: memberId, created_at: '' }] }))
  }

  function removeOwner(memberId) {
    setForm(f => ({ ...f, ownerEntries: f.ownerEntries.filter(e => e.member_id !== memberId) }))
  }

  function updateOwnerDate(memberId, date) {
    setForm(f => ({
      ...f,
      ownerEntries: f.ownerEntries.map(e => e.member_id === memberId ? { ...e, created_at: date } : e)
    }))
  }

  const inp = { width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>戰績牆管理</div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E24B4A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          ＋ 新增卡牌
        </button>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #e5e5e5', background: '#f8f8f8' }}>
              {['卡牌', '稀有度', '系列', '開卡會員', '直播場次', 'SNKR 成交價', '新增日期', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#999' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.map(card => {
              const rc = RARITY_COLORS[card.rarity] || RARITY_COLORS.Other
              return (
                <tr key={card.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 38, borderRadius: 4, background: '#f5f5f5', border: '0.5px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {card.image_url ? <img src={card.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14, color: '#ddd' }}>🎴</span>}
                      </div>
                      <span style={{ fontWeight: 500, color: '#111' }}>{card.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 500, background: rc.bg, color: rc.color }}>{card.rarity}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{card.series}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex' }}>
                      {card.card_owners?.map((o, i) => (
                        <div key={o.member_id} title={`${o.members?.display_name}${o.created_at ? ' · ' + new Date(o.created_at).toLocaleDateString('zh-TW') : ''}`}
                          style={{ width: 22, height: 22, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#633806', border: '1.5px solid #fff', marginLeft: i > 0 ? -6 : 0 }}>
                          {o.members?.display_name?.[0]}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#999' }}>{card.episode || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {card.snkr_price != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <img src={SNKR_LOGO} alt="SNKR" style={{ width: 32, height: 16, objectFit: 'contain', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>$ {card.snkr_price.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#ccc', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#999' }}>{new Date(card.created_at).toLocaleDateString('zh-TW')}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => openEdit(card)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px', border: '0.5px solid #ddd', borderRadius: 6, fontSize: 11, color: '#666', background: 'transparent', cursor: 'pointer', marginRight: 4 }}>✏️ 編輯</button>
                    <button onClick={() => handleDelete(card.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, color: '#A32D2D', background: 'transparent', cursor: 'pointer' }}>🗑️ 刪除</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, width: 380, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{modal === 'new' ? '新增卡牌' : '編輯卡牌'}</div>
              <span style={{ fontSize: 18, cursor: 'pointer', color: '#aaa' }} onClick={() => { setModal(null); setPreview(null) }}>✕</span>
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>填寫資訊後儲存</div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            <div onClick={() => !uploading && fileRef.current?.click()}
              style={{ border: '0.5px dashed #ddd', borderRadius: 8, padding: 16, textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer', background: '#f8f8f8', marginBottom: 14, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              {preview ? (
                <img src={preview} alt="" style={{ maxHeight: 120, objectFit: 'contain', borderRadius: 6 }} />
              ) : (
                <>
                  <div style={{ fontSize: 24, color: '#aaa', marginBottom: 4 }}>📷</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{uploading ? '上傳中...' : '點擊上傳卡牌圖片'}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>JPG / PNG · 建議 3:4</div>
                </>
              )}
            </div>
            {preview && !uploading && (
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <span onClick={() => fileRef.current?.click()} style={{ fontSize: 12, color: '#E24B4A', cursor: 'pointer' }}>重新上傳</span>
              </div>
            )}
            {uploading && <div style={{ textAlign: 'center', fontSize: 12, color: '#999', marginBottom: 10 }}>上傳中，請稍候...</div>}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>卡牌名稱</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：Charizard ex" style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>稀有度</label>
                <select value={form.rarity} onChange={e => setForm({ ...form, rarity: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, background: '#fff', color: '#111' }}>
                  {RARITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>直播場次</label>
                <input value={form.episode} onChange={e => setForm({ ...form, episode: e.target.value })} placeholder="EP.47" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4 }}>系列名稱</label>
              <input value={form.series} onChange={e => setForm({ ...form, series: e.target.value })} placeholder="例：Obsidian Flames" style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src={SNKR_LOGO} alt="SNKR" style={{ width: 36, height: 18, objectFit: 'contain' }} />
                  <span>成交價（選填）</span>
                </div>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#999', pointerEvents: 'none' }}>$</span>
                <input type="number" value={form.snkr_price} onChange={e => setForm({ ...form, snkr_price: e.target.value })} placeholder="例：12000" style={{ ...inp, paddingLeft: 22 }} />
              </div>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>留空表示不顯示成交價</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 8 }}>開卡會員（可多選）</label>
              {form.ownerEntries.length > 0 && (
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {form.ownerEntries.map(entry => {
                    const m = members.find(x => x.id === entry.member_id)
                    return (
                      <div key={entry.member_id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f8f8', borderRadius: 8, padding: '6px 10px', border: '0.5px solid #eee' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#333', flex: 1 }}>{m?.display_name}</div>
                        <input type="date" value={entry.created_at} onChange={e => updateOwnerDate(entry.member_id, e.target.value)}
                          style={{ fontSize: 11, border: '0.5px solid #ddd', borderRadius: 6, padding: '3px 6px', color: '#666', background: '#fff' }} />
                        <span onClick={() => removeOwner(entry.member_id)} style={{ fontSize: 14, color: '#bbb', cursor: 'pointer', lineHeight: 1 }}>✕</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <select value="" onChange={e => addOwner(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #ddd', borderRadius: 7, fontSize: 13, background: '#fff', color: '#111' }}>
                <option value="">＋ 新增會員...</option>
                {members.filter(m => !form.ownerEntries.find(e => e.member_id === m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>日期留空則自動填入今天</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setModal(null); setPreview(null) }} style={{ flex: 1, padding: 9, border: '0.5px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', background: 'transparent', cursor: 'pointer' }}>取消</button>
              <button onClick={handleSave} disabled={saving || uploading}
                style={{ flex: 1, padding: 9, background: saving || uploading ? '#ccc' : '#E24B4A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'white', cursor: saving || uploading ? 'not-allowed' : 'pointer' }}>
                {saving ? '儲存中...' : uploading ? '上傳中...' : '儲存卡牌'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
