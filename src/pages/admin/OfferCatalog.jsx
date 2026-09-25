import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const emptyPackage = { name:'', description:'', base_price:'', sort_order:0, is_active:true }
const emptyPromotion = { name:'', description:'', code:'', package_id:'', discount_type:'percent', discount_value:'', valid_from:'', valid_until:'', is_active:true }
const price = value => value == null ? 'Harga belum ditetapkan' : `Rp ${Number(value).toLocaleString('id-ID')}`

export default function OfferCatalog() {
  const [packages, setPackages] = useState([])
  const [promotions, setPromotions] = useState([])
  const [newPackage, setNewPackage] = useState(emptyPackage)
  const [newPromotion, setNewPromotion] = useState(emptyPromotion)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  async function refresh() {
    const [p, promo] = await Promise.all([
      supabase.from('service_packages').select('*').order('sort_order').order('name'),
      supabase.from('promotions').select('*').order('created_at', {ascending:false}),
    ])
    if (p.error || promo.error) return setMessage(`Gagal memuat katalog: ${p.error?.message || promo.error?.message}`)
    setPackages(p.data || []); setPromotions(promo.data || [])
  }
  useEffect(() => { refresh() }, [])

  const editPackage = (id, patch) => setPackages(current => current.map(p => p.id === id ? {...p,...patch} : p))
  const editPromotion = (id, patch) => setPromotions(current => current.map(p => p.id === id ? {...p,...patch} : p))

  async function savePackage(p, isNew=false) {
    const name = p.name.trim()
    const basePrice = p.base_price === '' || p.base_price == null ? null : Number(p.base_price)
    if (name.length < 2 || !Number.isSafeInteger(Number(p.sort_order)) ||
      (basePrice !== null && (!Number.isSafeInteger(basePrice) || basePrice < 0))) {
      return setMessage('Periksa nama, urutan, dan harga paket. Kosongkan harga jika belum ditetapkan.')
    }
    setBusy(p.id || 'new-package'); setMessage('')
    const payload = { name, description:p.description.trim(), base_price:basePrice,
      sort_order:Number(p.sort_order), is_active:p.is_active, updated_at:new Date().toISOString() }
    const { error } = isNew ? await supabase.from('service_packages').insert(payload)
      : await supabase.from('service_packages').update(payload).eq('id', p.id)
    setBusy('')
    if (error) return setMessage('Gagal menyimpan paket: ' + error.message)
    if (isNew) setNewPackage(emptyPackage)
    setMessage('Paket tersimpan. Perubahan pilihan form berlaku setelah halaman dimuat ulang.')
    refresh()
  }

  async function savePromotion(p, isNew=false) {
    const value = Number(p.discount_value)
    if (p.name.trim().length < 2 || !Number.isSafeInteger(value) || value <= 0 ||
      (p.discount_type === 'percent' && value > 100) ||
      (p.valid_from && p.valid_until && p.valid_until < p.valid_from)) {
      return setMessage('Periksa nama, besar diskon, dan periode promo.')
    }
    setBusy(p.id || 'new-promotion'); setMessage('')
    const payload = { name:p.name.trim(), description:p.description.trim(), code:p.code.trim() || null,
      package_id:p.package_id || null, discount_type:p.discount_type, discount_value:value,
      valid_from:p.valid_from || null, valid_until:p.valid_until || null,
      is_active:p.is_active, updated_at:new Date().toISOString() }
    const { error } = isNew ? await supabase.from('promotions').insert(payload)
      : await supabase.from('promotions').update(payload).eq('id',p.id)
    setBusy('')
    if (error) return setMessage('Gagal menyimpan promo: ' + error.message)
    if (isNew) setNewPromotion(emptyPromotion)
    setMessage('Promo tersimpan. Hanya promo aktif pada periode berlaku yang tampil di form.')
    refresh()
  }

  const packageFields = (p, set) => <div className="offer-fields">
    <label>Nama paket<input maxLength="100" value={p.name} onChange={e=>set({name:e.target.value})}/></label>
    <label>Harga dasar (Rp, boleh kosong)<input type="number" min="0" value={p.base_price ?? ''} onChange={e=>set({base_price:e.target.value})}/></label>
    <label>Urutan<input type="number" value={p.sort_order} onChange={e=>set({sort_order:e.target.value})}/></label>
    <label className="offer-wide">Deskripsi<textarea maxLength="500" rows="2" value={p.description} onChange={e=>set({description:e.target.value})}/></label>
    <label className="offer-toggle"><input type="checkbox" checked={p.is_active} onChange={e=>set({is_active:e.target.checked})}/> Aktif (tampil di form)</label>
  </div>

  const promotionFields = (p, set) => <div className="offer-fields">
    <label>Nama promo<input maxLength="100" value={p.name} onChange={e=>set({name:e.target.value})}/></label>
    <label>Kode (opsional)<input maxLength="50" value={p.code || ''} onChange={e=>set({code:e.target.value})}/></label>
    <label>Berlaku untuk<select value={p.package_id || ''} onChange={e=>set({package_id:e.target.value})}>
      <option value="">Semua paket</option>{packages.filter(pkg => pkg.is_active || pkg.id === p.package_id).map(pkg=><option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}
    </select></label>
    <label>Jenis diskon<select value={p.discount_type} onChange={e=>set({discount_type:e.target.value})}><option value="percent">Persen (%)</option><option value="fixed">Potongan Rp</option></select></label>
    <label>Besar diskon<input type="number" min="1" max={p.discount_type === 'percent' ? '100' : undefined} value={p.discount_value} onChange={e=>set({discount_value:e.target.value})}/></label>
    <label>Mulai (opsional)<input type="date" value={p.valid_from || ''} onChange={e=>set({valid_from:e.target.value})}/></label>
    <label>Berakhir (opsional)<input type="date" value={p.valid_until || ''} onChange={e=>set({valid_until:e.target.value})}/></label>
    <label className="offer-wide">Keterangan<textarea maxLength="500" rows="2" value={p.description} onChange={e=>set({description:e.target.value})}/></label>
    <label className="offer-toggle"><input type="checkbox" checked={p.is_active} onChange={e=>set({is_active:e.target.checked})}/> Aktif (tampil di form saat berlaku)</label>
  </div>

  return <section className="offer-catalog">
    <header><h2>Paket & promo</h2><p>Superadmin mengatur penawaran yang tampil pada form pendaftaran. Mengurangi paket atau promo dilakukan dengan menonaktifkannya agar data lama tetap tersimpan.</p></header>
    {message && <p role="status" className="offer-message">{message}</p>}
    <h3>Paket layanan</h3>
    {packages.map(p=><article className="offer-card" key={p.id}>
      <div className="offer-card-heading"><strong>{p.name}</strong><span>{p.is_active ? price(p.base_price) : 'Diarsipkan'}</span></div>
      {packageFields(p,patch=>editPackage(p.id,patch))}
      <button disabled={!!busy} onClick={()=>savePackage(p)}>Simpan paket</button>
    </article>)}
    <article className="offer-card"><h4>+ Paket baru</h4>{packageFields(newPackage,patch=>setNewPackage(current=>({...current,...patch})))}
      <button disabled={!!busy} onClick={()=>savePackage(newPackage,true)}>Tambah paket</button></article>
    <h3>Promo</h3>
    {promotions.map(p=><article className="offer-card" key={p.id}>
      <div className="offer-card-heading"><strong>{p.name}</strong><span>{p.is_active ? 'Aktif / sesuai periode' : 'Diarsipkan'}</span></div>
      {promotionFields(p,patch=>editPromotion(p.id,patch))}
      <button disabled={!!busy} onClick={()=>savePromotion(p)}>Simpan promo</button>
    </article>)}
    <article className="offer-card"><h4>+ Promo baru</h4>{promotionFields(newPromotion,patch=>setNewPromotion(current=>({...current,...patch})))}
      <button disabled={!!busy} onClick={()=>savePromotion(newPromotion,true)}>Tambah promo</button></article>
  </section>
}
