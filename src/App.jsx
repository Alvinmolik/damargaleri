import { useState, useRef, useEffect } from "react";
import { useProject } from "./hooks/useProject.js";

/* ── TOKENS ── */
const G900="#1B4332",G700="#2D6A4F",G500="#52B788",G200="#95D5B2",G100="#D8F3DC",G50="#F0FAF3";
const CREAM="#FAFAF8",DARK="#1C1C1E",MID="#3D3D3A",MUTED="#8A8A8E",BORDER="#E2EDE6",WHITE="#FFFFFF";
const RED="#C0392B",AMBER="#B7770D",AMBERBG="#FEF9E7";

const FAQS=[
  {section:"Dokumen pernikahan",items:[
    {q:"Dokumen apa saja yang dibutuhkan untuk menikah di KUA?",
     a:"N1 (surat nikah dari kelurahan), N2 (surat persetujuan mempelai), N4 (surat izin orang tua jika di bawah 21 tahun), fotokopi KTP, KK, akta lahir, dan pas foto 2×3 serta 3×4 masing-masing 5 lembar."},
    {q:"Berapa lama proses pendaftaran nikah?",
     a:"Untuk menikah di KUA, pendaftaran dilakukan minimal 10 hari kerja sebelum tanggal akad. Untuk gereja atau catatan sipil, biasanya 2–4 minggu sebelumnya."},
    {q:"Apakah foto prewed wajib dilakukan sebelum hari H?",
     a:"Tidak wajib, tapi sangat disarankan untuk keperluan dekorasi backdrop, undangan digital, dan dokumentasi kenangan. Idealnya dilakukan 3–6 bulan sebelum hari H."},
  ]},
  {section:"Persiapan hari H",items:[
    {q:"Jam berapa sebaiknya pasangan tiba di venue?",
     a:"Untuk akad pagi hari, pasangan sebaiknya sudah siap minimal 2 jam sebelumnya. Tim makeup biasanya mulai bekerja 3–4 jam sebelum akad."},
    {q:"Apa yang harus kami siapkan H-1?",
     a:"Pastikan seluruh pakaian, aksesori, dan dokumen sudah dikumpulkan. Lakukan briefing singkat dengan orang tua dan saksi. Tim Damargaleri akan menghubungi Anda untuk konfirmasi final."},
    {q:"Bagaimana jika ada vendor yang tiba-tiba membatalkan?",
     a:"Semua vendor rekanan sudah terikat kontrak dengan klausul pembatalan. Tim kami sudah memiliki daftar backup vendor yang bisa diaktifkan dalam 24 jam."},
  ]},
  {section:"Layanan Damargaleri",items:[
    {q:"Apa perbedaan paket Essential dan Full Service Premium?",
     a:"Paket Essential: koordinasi hari H 8 jam, 3 asisten, tanpa vendor hunting. Paket Full Service Premium: koordinasi H-12 bulan, vendor hunting, meeting tidak terbatas, dekorasi, MC, dokumentasi, dan 5 asisten hari H."},
    {q:"Apakah bisa request vendor di luar rekanan Damargaleri?",
     a:"Tentu bisa. Kami terbuka jika Anda sudah memiliki vendor pilihan sendiri. Tim kami akan tetap mengkoordinasikan semua vendor."},
    {q:"Bagaimana cara komunikasi dengan koordinator?",
     a:"Via WhatsApp setiap hari pukul 08.00–21.00 WIB. Target respons WA adalah 15 menit."},
  ]},
];

const STATUS_MAP={
  booking:{label:"Booking",bg:"#EAF3DE",color:"#27500A"},
  negosiasi:{label:"Negosiasi",bg:"#FEF9E7",color:"#633806"},
  prospek:{label:"Prospek",bg:"#F1EFE8",color:"#444441"},
};

/* ── HELPERS ── */
function fmt(n){return"Rp "+Number(n||0).toLocaleString("id-ID");}

function Leaf({size=16,color=G700}){
  return(<svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2C8 2 3 4.5 3 9C3 11.76 5.24 14 8 14C10.76 14 13 11.76 13 9C13 4.5 8 2 8 2Z"
      fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1" strokeLinejoin="round"/>
    <path d="M8 14V8M8 8C8 8 6 7 5 5.5M8 8C8 8 10 7 11 5.5"
      stroke={color} strokeWidth="1" strokeLinecap="round"/>
  </svg>);
}

function Ring({pct}){
  const r=34,c=2*Math.PI*r;
  return(<svg width="84" height="84" viewBox="0 0 84 84">
    <circle cx="42" cy="42" r={r} fill={G50} stroke={BORDER} strokeWidth="5"/>
    <circle cx="42" cy="42" r={r} fill="none" stroke={G900} strokeWidth="5"
      strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"
      transform="rotate(-90 42 42)" style={{transition:"stroke-dasharray .7s ease"}}/>
    <text x="42" y="38" textAnchor="middle" fontSize="17" fontWeight="700"
      fill={G900} fontFamily="Lora,serif">{pct}%</text>
    <text x="42" y="52" textAnchor="middle" fontSize="9"
      fill={MUTED} fontFamily="Inter,sans-serif">selesai</text>
  </svg>);
}

function StatusBadge({status}){
  const m={lunas:{bg:"#EAF6ED",color:G700,label:"Lunas"},
    menunggu:{bg:AMBERBG,color:AMBER,label:"Jatuh tempo"},
    belum:{bg:"#F5F5F5",color:MUTED,label:"Belum"}};
  const s=m[status]||m.belum;
  return(<span style={{fontSize:11,fontWeight:600,padding:"3px 9px",
    borderRadius:20,background:s.bg,color:s.color}}>{s.label}</span>);
}

function LoadingScreen(){
  return(
    <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",
      justifyContent:"center",background:G900,flexDirection:"column",gap:12}}>
      <span style={{fontFamily:"Dancing Script,cursive",fontSize:28,color:WHITE}}>Damargaleri</span>
      <span style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>Memuat data pernikahan...</span>
    </div>
  );
}

function ErrorScreen({message}){
  return(
    <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",
      justifyContent:"center",background:G900,flexDirection:"column",gap:12,padding:24}}>
      <span style={{fontFamily:"Dancing Script,cursive",fontSize:28,color:WHITE}}>Damargaleri</span>
      <span style={{fontSize:13,color:"rgba(255,255,255,.6)",textAlign:"center"}}>{message}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════
   APP — connected to Supabase
══════════════════════════════════════════════ */
export default function App({slug}){
  // Get slug from prop (Router) or URL
  const pageSlug = slug || window.location.pathname.replace(/^\//, '').split('/')[0];

  const {
    project, loading, error,
    toggleTask, addTask, deleteTask,
    updateBudgetCategory, addBudgetCategory, deleteBudgetCategory,
    addInvoice, deleteInvoice,
    addDocument, deleteDocument,
    addVendor, deleteVendor,
    updateCoverImage,
  } = useProject(pageSlug);

  // UI state
  const [tab,setTab]               = useState("home");
  const [coverPos,setCoverPos]     = useState(30);
  const [editingCover,setEditingCover] = useState(false);
  const [subPersiapan,setSubPersiapan] = useState("checklist");
  const [subPernikahan,setSubPernikahan] = useState("detail");
  const [expanded,setExp]          = useState(null);
  const [addingTo,setAddTo]        = useState(null);
  const [newTask,setNewTask]       = useState({text:"",pic:"",loc:"",due_date:""});
  const [taskErr,setTaskErr]       = useState("");
  const [faqOpen,setFaqOpen]       = useState(null);
  const [showAddDoc,setShowAddDoc] = useState(false);
  const [newDoc,setNewDoc]         = useState({label:"",url:"",tag:"Dokumen"});
  const [docErr,setDocErr]         = useState("");
  const [showAddInv,setShowAddInv] = useState(false);
  const [newInv,setNewInv]         = useState({label:"",amount:"",due_date:"",status:"belum",category:"WO",doc_url:""});
  const [invErr,setInvErr]         = useState("");
  const [editBudget,setEditBudget] = useState(null);
  const [budgetInput,setBudgetInput] = useState({cat:"",alloc:"",spent:""});
  const [budgetErr,setBudgetErr]   = useState("");
  const [vendorOpen,setVendorOpen] = useState(null);
  const [showAddVendor,setShowAddVendor] = useState(false);
  const [newVendor,setNewVendor]   = useState({category:"",name:"",contact:"",phone:"",instagram:"",price:"",status:"prospek",note:"",icon:"🏪"});
  const [vendorErr,setVendorErr]   = useState("");
  const [confirmDelete,setConfirmDelete] = useState(null); // {type, id, label}
  const [countdown,setCountdown]   = useState({d:0,h:0,m:0,s:0});
  const [copied,setCopied]         = useState(false);
  const coverRef = useRef();

  // Set meta tags untuk link preview
  useEffect(()=>{
    if(!project) return;
    const title = `${project.bride_name} & ${project.groom_name} — Damargaleri Wedding Planner`;
    const desc  = `Wedding planner digital untuk pernikahan ${project.bride_name} & ${project.groom_name} pada ${project.wedding_date ? new Date(project.wedding_date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}) : ""}. Dikelola oleh Damargaleri Organizer.`;
    const img   = project.cover_image_url || `${window.location.origin}/cover-default.jpg`;

    document.title = title;
    const setMeta = (prop, val, attr="name") => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`);
      if(!el){ el = document.createElement("meta"); el.setAttribute(attr, prop); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    setMeta("description", desc);
    setMeta("og:title", title, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:image", img, "property");
    setMeta("og:url", window.location.href, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:site_name", "Damargaleri Organizer", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", img);
  },[project]);

  // Countdown timer
  useEffect(()=>{
    if(!project?.wedding_date) return;
    const wDate = new Date(project.wedding_date+"T10:00:00");
    function tick(){
      const diff=wDate-new Date();
      if(diff<=0){setCountdown({d:0,h:0,m:0,s:0});return;}
      setCountdown({
        d:Math.floor(diff/86400000),
        h:Math.floor((diff%86400000)/3600000),
        m:Math.floor((diff%3600000)/60000),
        s:Math.floor((diff%60000)/1000),
      });
    }
    tick();
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[project?.wedding_date]);

  // Set first phase as expanded
  useEffect(()=>{
    if(project?.checklist_phases?.length && !expanded){
      setExp(project.checklist_phases[0].id);
    }
  },[project]);

  if(loading) return <LoadingScreen/>;
  if(error||!project) return <ErrorScreen message="Project tidak ditemukan atau kamu tidak punya akses."/>;

  // Derived data from Supabase
  const phases   = project.checklist_phases || [];
  const budget   = project.budget_categories || [];
  const vendors  = project.vendors || [];
  const invoices = project.invoices || [];
  const docs     = project.documents || [];
  const pkg      = project.packages;
  const coverImg = project.cover_image_url || "/cover-default.jpg";

  const coupleNames   = `${project.bride_name} & ${project.groom_name}`;
  const weddingDate   = project.wedding_date
    ? new Date(project.wedding_date).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})
    : "Tanggal belum diset";

  const allTasks  = phases.flatMap(p=>p.checklist_tasks||[]);
  const doneCount = allTasks.filter(t=>t.done).length;
  const pct       = allTasks.length ? Math.round((doneCount/allTasks.length)*100) : 0;

  const totalAlloc = budget.reduce((s,b)=>s+Number(b.allocated||0),0);
  const totalSpent = budget.reduce((s,b)=>s+Number(b.spent||0),0);
  const budgetTotal = Number(project.budget_total)||totalAlloc||1;
  const budgetPct  = Math.round((totalSpent/budgetTotal)*100);

  // Handlers
  async function handleToggleTask(phaseId,taskId,done){
    await toggleTask(taskId,!done);
  }

  async function handleAddTask(phaseId){
    if(!newTask.text.trim()){setTaskErr("Tulis nama tugas dulu.");return;}
    const{error}=await addTask(phaseId,newTask);
    if(!error){setNewTask({text:"",pic:"",loc:"",due_date:""});setTaskErr("");setAddTo(null);}
  }

  async function handleSaveBudget(id){
    const a=parseInt(budgetInput.alloc.replace(/\D/g,""))||0;
    const s=parseInt(budgetInput.spent.replace(/\D/g,""))||0;
    if(s>a){setBudgetErr("Pengeluaran tidak boleh melebihi anggaran.");return;}
    await updateBudgetCategory(id,{
      name:budgetInput.cat||undefined,
      allocated:a, spent:s
    });
    setEditBudget(null);setBudgetErr("");
  }

  async function handleAddBudget(){
    await addBudgetCategory("Kategori baru");
  }

  async function handleAddInvoice(){
    if(!newInv.label.trim()){setInvErr("Nama invoice tidak boleh kosong.");return;}
    if(!newInv.amount.trim()){setInvErr("Jumlah tidak boleh kosong.");return;}
    const{error}=await addInvoice(newInv);
    if(!error){setNewInv({label:"",amount:"",due_date:"",status:"belum",category:"WO",doc_url:""});setInvErr("");setShowAddInv(false);}
  }

  async function handleAddDoc(){
    if(!newDoc.label.trim()){setDocErr("Nama tidak boleh kosong.");return;}
    if(!newDoc.url.trim()){setDocErr("Link tidak boleh kosong.");return;}
    const icons={Foto:"📷",Dokumen:"📄",Referensi:"🎨",Lainnya:"🔗"};
    const{error}=await addDocument({...newDoc,icon:icons[newDoc.tag]||"🔗"});
    if(!error){setNewDoc({label:"",url:"",tag:"Dokumen"});setDocErr("");setShowAddDoc(false);}
  }

  async function handleAddVendor(){
    if(!newVendor.name.trim()){setVendorErr("Nama vendor tidak boleh kosong.");return;}
    if(!newVendor.category.trim()){setVendorErr("Kategori tidak boleh kosong.");return;}
    const{error}=await addVendor(newVendor);
    if(!error){
      setNewVendor({category:"",name:"",contact:"",phone:"",instagram:"",price:"",status:"prospek",note:"",icon:"🏪"});
      setVendorErr("");setShowAddVendor(false);
    }
  }

  async function handleDelete(){
    if(!confirmDelete) return;
    const {type, id} = confirmDelete;
    if(type==="task") await deleteTask(id);
    else if(type==="budget") await deleteBudgetCategory(id);
    else if(type==="invoice") await deleteInvoice(id);
    else if(type==="document") await deleteDocument(id);
    else if(type==="vendor") await deleteVendor(id);
    setConfirmDelete(null);
  }

  async function handleCover(e){
    const f=e.target.files[0];
    if(!f)return;
    await updateCoverImage(f);
  }

  const inp=(ex={})=>({width:"100%",padding:"9px 12px",fontSize:13,
    border:`1px solid ${BORDER}`,borderRadius:8,outline:"none",
    color:DARK,background:WHITE,fontFamily:"Inter,sans-serif",
    boxSizing:"border-box",...ex});

  const SH=({title,sub})=>(
    <div style={{padding:"22px 24px 16px",borderBottom:`0.5px solid ${BORDER}`}}>
      <h2 style={{fontFamily:"Lora,serif",fontSize:22,fontWeight:600,
        color:DARK,margin:"0 0 3px",fontStyle:"italic"}}>{title}</h2>
      {sub&&<p style={{fontSize:13,color:MUTED,margin:0}}>{sub}</p>}
    </div>
  );

  const TABS=[
    {id:"home",     label:"Beranda",   d:"M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5zM9 21V12h6v9"},
    {id:"persiapan",label:"Persiapan", d:"M9 12l2 2 4-4M5 5h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"},
    {id:"pernikahan",label:"Pernikahan",d:"M12 2C8.5 2 6 5 6 8c0 4 6 10 6 10s6-6 6-10c0-3-2.5-6-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z"},
    {id:"info",     label:"Info",      d:"M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"},
  ];

  return(
    <div style={{width:"100%",maxWidth:480,margin:"0 auto",minHeight:"100vh",
      background:CREAM,display:"flex",flexDirection:"column",fontFamily:"Inter,sans-serif"}}>

      {/* Top bar */}
      <div style={{position:"sticky",top:0,zIndex:50,background:G900,padding:"12px 20px 10px",
        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <Leaf size={18} color="rgba(255,255,255,.45)"/>
        <span style={{fontFamily:"Dancing Script,cursive",fontSize:20,color:WHITE}}>Damargaleri</span>
        <Leaf size={18} color="rgba(255,255,255,.0)"/>
      </div>

      <div style={{flex:1,paddingBottom:70}}>

        {/* ══ HOME ══ */}
        {tab==="home"&&(
          <div>
            {/* Cover hero — full with countdown inside */}
            <div style={{position:"relative",height:360,background:G900,overflow:"hidden"}}>
              <img src={coverImg} alt="Cover"
                style={{width:"100%",height:"100%",objectFit:"cover",
                  objectPosition:`center ${coverPos}%`,
                  transition:"object-position .2s"}}
                onError={e=>{e.target.src="/cover-default.jpg"}}/>
              <div style={{position:"absolute",inset:0,
                background:"linear-gradient(to bottom, rgba(0,0,0,.05) 0%, rgba(0,0,0,.15) 40%, rgba(27,67,50,.95) 100%)"}}/>

              {/* Edit mode */}
              {editingCover && (
                <div style={{position:"absolute",inset:0,
                  background:"rgba(0,0,0,.55)",
                  display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",gap:16,
                  padding:"0 24px"}}>
                  <p style={{fontSize:12,color:WHITE,margin:0,fontWeight:500}}>
                    ↕ Geser slider untuk atur posisi foto
                  </p>
                  <input type="range" min="0" max="100" value={coverPos}
                    onChange={e=>setCoverPos(Number(e.target.value))}
                    style={{width:"100%",accentColor:WHITE,cursor:"pointer",height:4}}/>
                  <div style={{display:"flex",gap:10,marginTop:4}}>
                    <button
                      onPointerDown={e=>{e.stopPropagation();setEditingCover(false);}}
                      style={{padding:"8px 20px",fontSize:13,fontWeight:600,
                        background:"rgba(255,255,255,.2)",color:WHITE,
                        border:"1px solid rgba(255,255,255,.5)",borderRadius:20,
                        cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                      Batal
                    </button>
                    <button
                      onPointerDown={e=>{e.stopPropagation();setEditingCover(false);}}
                      style={{padding:"8px 20px",fontSize:13,fontWeight:600,
                        background:WHITE,color:G900,border:"none",borderRadius:20,
                        cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                      ✓ Simpan
                    </button>
                  </div>
                </div>
              )}

              {/* Normal buttons */}
              {!editingCover && (
                <div style={{position:"absolute",top:12,right:12,display:"flex",gap:8}}>
                  <button onClick={()=>setEditingCover(true)}
                    style={{padding:"5px 10px",fontSize:11,fontWeight:600,
                      background:"rgba(255,255,255,.15)",color:WHITE,
                      border:"1px solid rgba(255,255,255,.3)",borderRadius:20,
                      cursor:"pointer",fontFamily:"Inter,sans-serif",backdropFilter:"blur(4px)"}}>
                    Atur posisi
                  </button>
                  <button onClick={()=>coverRef.current.click()}
                    style={{padding:"5px 10px",fontSize:11,fontWeight:600,
                      background:"rgba(255,255,255,.15)",color:WHITE,
                      border:"1px solid rgba(255,255,255,.3)",borderRadius:20,
                      cursor:"pointer",fontFamily:"Inter,sans-serif",backdropFilter:"blur(4px)"}}>
                    Ganti foto
                  </button>
                </div>
              )}

              <input ref={coverRef} type="file" accept="image/*"
                onChange={async(e)=>{
                  await handleCover(e);
                  setEditingCover(true);
                }}
                style={{display:"none"}}/>

              {/* Names + countdown overlay at bottom */}
              {!editingCover && (
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 24px 20px"}}>
                  <p style={{fontSize:11,color:"rgba(255,255,255,.7)",
                    margin:"0 0 3px",letterSpacing:".08em"}}>persiapan pernikahan</p>
                  <h1 style={{fontFamily:"Lora,serif",fontSize:28,fontWeight:600,
                    color:WHITE,margin:"0 0 2px",lineHeight:1.2}}>{coupleNames}</h1>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.7)",margin:"0 0 16px"}}>
                    {weddingDate}{project.location?` · ${project.location}`:""}
                  </p>
                  {/* Countdown inside cover */}
                  <div style={{background:"rgba(0,0,0,.3)",borderRadius:12,
                    padding:"12px 16px",display:"flex",justifyContent:"space-around",
                    border:"0.5px solid rgba(255,255,255,.15)",backdropFilter:"blur(8px)"}}>
                    {[["Hari",countdown.d],["Jam",countdown.h],["Menit",countdown.m],["Detik",countdown.s]].map(([l,v])=>(
                      <div key={l} style={{textAlign:"center"}}>
                        <p style={{fontFamily:"Lora,serif",fontSize:24,fontWeight:700,
                          color:WHITE,margin:"0 0 2px",lineHeight:1}}>{String(v).padStart(2,"0")}</p>
                        <p style={{fontSize:9,color:"rgba(255,255,255,.7)",margin:0,letterSpacing:".08em"}}>{l.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Progress + budget */}
            <div style={{padding:"16px 20px 0",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:WHITE,borderRadius:14,padding:"16px 18px",
                display:"flex",alignItems:"center",gap:16,border:`0.5px solid ${BORDER}`}}>
                <Ring pct={pct}/>
                <div>
                  <p style={{fontSize:14,fontWeight:600,color:DARK,margin:"0 0 2px"}}>
                    {doneCount} dari {allTasks.length} tugas</p>
                  <p style={{fontSize:12,color:MUTED,margin:"0 0 10px"}}>On track — terus semangat!</p>
                  <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,
                    background:G50,color:G700,border:`1px solid ${G100}`}}>
                    {countdown.d} hari lagi
                  </span>
                </div>
              </div>

              <div style={{background:WHITE,borderRadius:14,padding:"14px 18px",
                border:`0.5px solid ${BORDER}`}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"baseline",marginBottom:10}}>
                  <p style={{fontSize:13,fontWeight:600,color:DARK,margin:0}}>Budget terpakai</p>
                  <p style={{fontSize:12,color:MUTED,margin:0}}>{budgetPct}% dari total</p>
                </div>
                <div style={{height:6,borderRadius:3,background:BORDER,overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",width:`${Math.min(budgetPct,100)}%`,
                    background:budgetPct>90?RED:budgetPct>70?AMBER:G700,
                    borderRadius:3,transition:"width .6s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,color:MUTED}}>Terpakai: {fmt(totalSpent)}</span>
                  <span style={{fontSize:11,color:MUTED}}>Total: {fmt(budgetTotal)}</span>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div style={{padding:"14px 20px 0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {icon:"📅",label:"Tanggal",val:project.wedding_date
                  ? new Date(project.wedding_date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})
                  : "—"},
                {icon:"📍",label:"Venue",val:project.venue||"—"},
                {icon:"👥",label:"Tamu",val:project.guest_count||"—"},
                {icon:"💰",label:"Anggaran",val:project.budget_total?fmt(project.budget_total):"—"},
              ].map((c,i)=>(
                <div key={i} style={{background:WHITE,borderRadius:12,
                  border:`0.5px solid ${BORDER}`,padding:"12px 14px"}}>
                  <span style={{fontSize:18}}>{c.icon}</span>
                  <p style={{fontSize:10,color:MUTED,margin:"6px 0 2px"}}>{c.label}</p>
                  <p style={{fontSize:13,fontWeight:600,color:DARK,margin:0}}>{c.val}</p>
                </div>
              ))}
            </div>

            {/* Tugas berikutnya */}
            <div style={{padding:"16px 20px 32px"}}>
              <p style={{fontFamily:"Lora,serif",fontSize:15,fontWeight:600,
                color:DARK,margin:"0 0 12px",fontStyle:"italic"}}>Tugas berikutnya</p>
              {allTasks.filter(t=>!t.done).slice(0,4).map((t,i,arr)=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"11px 0",borderBottom:i<arr.length-1?`0.5px solid ${BORDER}`:"none"}}>
                  <div
                    onClick={()=>handleToggleTask(null,t.id,t.done)}
                    style={{width:20,height:20,borderRadius:"50%",flexShrink:0,
                      border:`1.5px solid ${G500}`,cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all .2s"}}
                  />
                  <span
                    onClick={()=>{setTab("persiapan");setSubPersiapan("checklist");}}
                    style={{fontSize:13,color:MID,cursor:"pointer",flex:1}}
                  >{t.text}</span>
                  {t.due_date&&(
                    <span style={{fontSize:10,color:MUTED,flexShrink:0}}>
                      {new Date(t.due_date).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}
                    </span>
                  )}
                </div>
              ))}
              {allTasks.filter(t=>!t.done).length===0&&(
                <p style={{fontSize:13,color:G700,textAlign:"center",padding:"20px 0"}}>
                  🎉 Semua tugas sudah selesai!
                </p>
              )}
            </div>
          </div>
        )}

        {/* ══ PERSIAPAN sub-tab header ══ */}
        {tab==="persiapan"&&(
          <div style={{position:"sticky",top:48,zIndex:40,background:WHITE,
            display:"flex",borderBottom:`0.5px solid ${BORDER}`}}>
            {[["checklist","✅","Checklist"],["budget","💰","Budget"]].map(([id,ico,label])=>(
              <button key={id} onClick={()=>setSubPersiapan(id)}
                style={{flex:1,padding:"11px 0",fontSize:13,fontWeight:500,
                  background:"none",border:"none",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                  color:subPersiapan===id?G900:MUTED,
                  borderBottom:subPersiapan===id?`2px solid ${G900}`:"2px solid transparent",
                  fontFamily:"Inter,sans-serif"}}>
                <span style={{fontSize:16}}>{ico}</span>{label}
              </button>
            ))}
          </div>
        )}

        {/* ══ CHECKLIST ══ */}
        {tab==="persiapan"&&subPersiapan==="checklist"&&(
          <div>
            <SH title="Checklist persiapan"
              sub={`${doneCount} dari ${allTasks.length} tugas selesai`}/>
            {phases.map(phase=>{
              const tasks=phase.checklist_tasks||[];
              const isOpen=expanded===phase.id;
              const done=tasks.filter(t=>t.done).length;
              const barW=tasks.length?Math.round((done/tasks.length)*100):0;
              const allDone=done===tasks.length&&tasks.length>0;
              return(
                <div key={phase.id} style={{borderBottom:`0.5px solid ${BORDER}`}}>
                  <button onClick={()=>setExp(isOpen?null:phase.id)}
                    style={{width:"100%",background:isOpen?G50:"none",border:"none",
                      cursor:"pointer",padding:"14px 20px",textAlign:"left"}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",marginBottom:7}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        {allDone?<span style={{color:G700,fontSize:13}}>✓</span>
                          :<Leaf size={14} color={isOpen?G700:MUTED}/>}
                        <span style={{fontSize:14,fontWeight:500,
                          color:allDone?MUTED:(isOpen?G900:DARK)}}>{phase.label}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:11,color:MUTED}}>{done}/{tasks.length}</span>
                        <span style={{fontSize:10,color:isOpen?G700:MUTED,display:"inline-block",
                          transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                      </div>
                    </div>
                    <div style={{height:3,borderRadius:2,background:BORDER,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${barW}%`,
                        background:allDone?G500:G700,borderRadius:2,transition:"width .4s"}}/>
                    </div>
                  </button>
                  {isOpen&&(
                    <div style={{background:WHITE,paddingBottom:4}}>
                      {tasks.map(task=>(
                        <div key={task.id} style={{borderBottom:`0.5px solid ${BORDER}`}}>
                          <div onClick={()=>handleToggleTask(phase.id,task.id,task.done)}
                            style={{display:"flex",alignItems:"flex-start",gap:12,
                              padding:"12px 20px",cursor:"pointer",
                              background:task.done?G50:WHITE,transition:"background .15s"}}>
                            <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,
                              marginTop:1,background:task.done?G700:"transparent",
                              border:task.done?"none":`1.5px solid ${BORDER}`,
                              display:"flex",alignItems:"center",justifyContent:"center",
                              transition:"all .2s"}}>
                              {task.done&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke={WHITE}
                                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>}
                            </div>
                            <div style={{flex:1}}>
                              <p style={{fontSize:13,color:task.done?MUTED:MID,margin:"0 0 5px",
                                textDecoration:task.done?"line-through":"none"}}>{task.text}</p>
                              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:10,color:G700,background:G50,
                                  padding:"2px 7px",borderRadius:20,border:`0.5px solid ${G100}`}}>
                                  👤 {task.pic||"Pasangan"}</span>
                                <span style={{fontSize:10,color:MUTED,background:"#F5F5F5",
                                  padding:"2px 7px",borderRadius:20}}>
                                  📍 {task.location||"—"}</span>
                                {task.due_date&&(
                                  <span style={{fontSize:10,color:AMBER,background:AMBERBG,
                                    padding:"2px 7px",borderRadius:20}}>
                                    📅 {new Date(task.due_date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={e=>{e.stopPropagation();setConfirmDelete({type:"task",id:task.id,label:task.text});}}
                              style={{padding:"4px 6px",background:"none",border:"none",
                                cursor:"pointer",color:MUTED,fontSize:14,flexShrink:0,
                                opacity:.5,lineHeight:1}}
                              title="Hapus tugas">×</button>
                          </div>
                        </div>
                      ))}
                      {addingTo===phase.id?(
                        <div style={{padding:"12px 20px 16px"}}>
                          <input value={newTask.text} placeholder="Nama tugas..." autoFocus
                            onChange={e=>{setNewTask(p=>({...p,text:e.target.value}));setTaskErr("");}}
                            onKeyDown={e=>e.key==="Enter"&&handleAddTask(phase.id)}
                            style={{...inp(),marginBottom:8,borderColor:taskErr?RED:BORDER}}/>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                            <input value={newTask.pic} placeholder="PIC (siapa?)"
                              onChange={e=>setNewTask(p=>({...p,pic:e.target.value}))}
                              style={inp()}/>
                            <input value={newTask.loc} placeholder="Lokasi"
                              onChange={e=>setNewTask(p=>({...p,loc:e.target.value}))}
                              style={inp()}/>
                          </div>
                          <div style={{marginBottom:8}}>
                            <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Tanggal target (opsional)</p>
                            <input type="date" value={newTask.due_date}
                              onChange={e=>setNewTask(p=>({...p,due_date:e.target.value}))}
                              style={inp()}/>
                          </div>
                          {taskErr&&<p style={{fontSize:11,color:RED,margin:"0 0 6px"}}>{taskErr}</p>}
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>handleAddTask(phase.id)}
                              style={{flex:1,padding:"8px 0",fontSize:13,fontWeight:500,
                                background:G900,color:WHITE,border:"none",borderRadius:8,
                                cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Tambah</button>
                            <button onClick={()=>{setAddTo(null);setNewTask({text:"",pic:"",loc:"",due_date:""});setTaskErr("");}}
                              style={{padding:"8px 16px",fontSize:13,background:"none",
                                border:`0.5px solid ${BORDER}`,borderRadius:8,
                                cursor:"pointer",color:MUTED,fontFamily:"Inter,sans-serif"}}>Batal</button>
                          </div>
                        </div>
                      ):(
                        <button onClick={()=>{setAddTo(phase.id);setNewTask({text:"",pic:"",loc:""});}}
                          style={{display:"flex",alignItems:"center",gap:6,padding:"10px 20px",
                            background:"none",border:"none",cursor:"pointer",
                            color:G700,fontSize:13,fontFamily:"Inter,sans-serif"}}>
                          <span style={{fontSize:16,lineHeight:1}}>+</span> Tambah tugas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ BUDGET ══ */}
        {tab==="persiapan"&&subPersiapan==="budget"&&(
          <div>
            <SH title="Budget pernikahan" sub="Kelola anggaran per kategori"/>
            <div style={{background:WHITE,padding:"16px 20px",borderBottom:`0.5px solid ${BORDER}`}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
                {[
                  {label:"Total anggaran",val:fmt(budgetTotal),dark:false},
                  {label:"Terpakai",val:fmt(totalSpent),dark:true},
                  {label:"Sisa",val:fmt(budgetTotal-totalSpent),dark:false,accent:(budgetTotal-totalSpent)<0},
                ].map((c,i)=>(
                  <div key={i} style={{background:c.dark?G900:G50,borderRadius:10,padding:"10px 12px",
                    border:`0.5px solid ${c.dark?G900:G100}`}}>
                    <p style={{fontSize:9,color:c.dark?"rgba(255,255,255,.55)":MUTED,
                      margin:"0 0 4px",letterSpacing:".03em"}}>{c.label.toUpperCase()}</p>
                    <p style={{fontSize:12,fontWeight:700,margin:0,lineHeight:1.2,
                      color:c.accent?RED:(c.dark?WHITE:G900)}}>{c.val}</p>
                  </div>
                ))}
              </div>
              <div style={{height:8,borderRadius:4,background:BORDER,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(budgetPct,100)}%`,
                  background:budgetPct>90?RED:budgetPct>70?AMBER:G700,
                  borderRadius:4,transition:"width .6s"}}/>
              </div>
              <p style={{fontSize:11,color:MUTED,margin:"6px 0 0",textAlign:"right"}}>
                {budgetPct}% dari total anggaran terpakai</p>
            </div>
            {budget.map(b=>{
              const overBudget=Number(b.spent)>Number(b.allocated);
              const catPct=Number(b.allocated)>0?Math.round((Number(b.spent)/Number(b.allocated))*100):0;
              const isEditing=editBudget===b.id;
              return(
                <div key={b.id} style={{background:WHITE,borderBottom:`0.5px solid ${BORDER}`}}>
                  {isEditing?(
                    <div style={{padding:"14px 20px"}}>
                      <div style={{marginBottom:8}}>
                        <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nama kategori</p>
                        <input value={budgetInput.cat||b.name}
                          onChange={e=>setBudgetInput(p=>({...p,cat:e.target.value}))}
                          style={inp()}/>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div>
                          <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Anggaran (Rp)</p>
                          <input value={budgetInput.alloc}
                            onChange={e=>{setBudgetInput(p=>({...p,alloc:e.target.value}));setBudgetErr("");}}
                            placeholder={String(b.allocated)} style={inp()}/>
                        </div>
                        <div>
                          <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Sudah dibayar (Rp)</p>
                          <input value={budgetInput.spent}
                            onChange={e=>{setBudgetInput(p=>({...p,spent:e.target.value}));setBudgetErr("");}}
                            placeholder={String(b.spent)} style={inp()}/>
                        </div>
                      </div>
                      {budgetErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{budgetErr}</p>}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>handleSaveBudget(b.id)}
                          style={{flex:1,padding:"8px 0",fontSize:13,fontWeight:500,
                            background:G900,color:WHITE,border:"none",borderRadius:8,
                            cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Simpan</button>
                        <button onClick={()=>{setEditBudget(null);setBudgetErr("");}}
                          style={{padding:"8px 16px",fontSize:13,background:"none",
                            border:`0.5px solid ${BORDER}`,borderRadius:8,
                            cursor:"pointer",color:MUTED,fontFamily:"Inter,sans-serif"}}>Batal</button>
                      </div>
                    </div>
                  ):(
                    <div style={{padding:"14px 20px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",
                        alignItems:"center",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:20}}>{b.icon||"💸"}</span>
                          <div>
                            <p style={{fontSize:13,fontWeight:500,color:DARK,margin:"0 0 1px"}}>{b.name}</p>
                            <p style={{fontSize:11,color:MUTED,margin:0}}>
                              {fmt(b.spent)} <span style={{color:overBudget?RED:MUTED}}>dari {fmt(b.allocated)}</span>
                            </p>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {overBudget&&<span style={{fontSize:10,fontWeight:600,color:RED}}>⚠</span>}
                          <button onClick={()=>{setEditBudget(b.id);
                            setBudgetInput({cat:b.name,alloc:String(b.allocated),spent:String(b.spent)});}}
                            style={{fontSize:11,padding:"4px 10px",borderRadius:20,
                              background:G50,color:G700,border:`0.5px solid ${G100}`,
                              cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Edit</button>
                          <button onClick={()=>setConfirmDelete({type:"budget",id:b.id,label:b.name})}
                            style={{fontSize:11,padding:"4px 10px",borderRadius:20,
                              background:"#FEF2F2",color:RED,border:`0.5px solid #FECACA`,
                              cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Hapus</button>
                        </div>
                      </div>
                      <div style={{height:4,borderRadius:2,background:BORDER,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${Math.min(catPct,100)}%`,
                          background:overBudget?RED:catPct>80?AMBER:G500,
                          borderRadius:2,transition:"width .5s"}}/>
                      </div>
                      <p style={{fontSize:10,color:overBudget?RED:MUTED,
                        margin:"4px 0 0",textAlign:"right"}}>{catPct}%</p>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{padding:"12px 20px 20px"}}>
              <button onClick={handleAddBudget}
                style={{width:"100%",padding:"11px 0",fontSize:13,fontWeight:500,
                  background:"none",border:`1px dashed ${BORDER}`,borderRadius:10,
                  cursor:"pointer",color:G700,fontFamily:"Inter,sans-serif",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <span style={{fontSize:16}}>+</span> Tambah kategori
              </button>
            </div>
          </div>
        )}

        {/* ══ PERNIKAHAN sub-tab header ══ */}
        {tab==="pernikahan"&&(
          <div style={{position:"sticky",top:48,zIndex:40,background:WHITE,
            display:"flex",borderBottom:`0.5px solid ${BORDER}`}}>
            {[["detail","💍","Detail"],["invoice","🧾","Invoice"],["dokumen","📁","Dokumen"],["vendor","🏪","Vendor"]].map(([id,ico,label])=>(
              <button key={id} onClick={()=>setSubPernikahan(id)}
                style={{flex:1,padding:"11px 0",fontSize:11,fontWeight:500,
                  background:"none",border:"none",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                  color:subPernikahan===id?G900:MUTED,
                  borderBottom:subPernikahan===id?`2px solid ${G900}`:"2px solid transparent",
                  fontFamily:"Inter,sans-serif"}}>
                <span style={{fontSize:14}}>{ico}</span>{label}
              </button>
            ))}
          </div>
        )}

        {/* ══ DETAIL ══ */}
        {tab==="pernikahan"&&subPernikahan==="detail"&&(
          <div style={{background:WHITE}}>
            <div style={{background:G900,padding:"20px 24px 24px",textAlign:"center"}}>
              <div style={{width:56,height:56,borderRadius:"50%",
                background:"rgba(255,255,255,.12)",border:"1.5px solid rgba(255,255,255,.25)",
                display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}>
                <span style={{fontFamily:"Lora,serif",fontSize:22,color:WHITE,fontStyle:"italic"}}>
                  {(project.bride_name||"")[0]}{(project.groom_name||"")[0]}
                </span>
              </div>
              <p style={{fontFamily:"Lora,serif",fontSize:20,fontWeight:600,
                color:WHITE,margin:"0 0 2px"}}>{coupleNames}</p>
              <p style={{fontSize:12,color:"rgba(255,255,255,.5)",margin:0}}>{weddingDate}</p>
            </div>
            <div style={{padding:"14px 20px 6px"}}>
              <p style={{fontSize:11,color:G700,fontWeight:600,letterSpacing:".04em",margin:"0 0 10px"}}>INFO PERNIKAHAN</p>
              {[
                {label:"Tanggal",val:weddingDate},
                {label:"Venue",val:project.venue||"—"},
                {label:"Alamat",val:project.venue_address||"—"},
                {label:"Estimasi tamu",val:project.guest_count||"—"},
              ].map((r,i,arr)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"flex-start",padding:"11px 0",
                  borderBottom:i<arr.length-1?`0.5px solid ${BORDER}`:"none"}}>
                  <span style={{fontSize:13,color:MUTED,flexShrink:0,marginRight:16}}>{r.label}</span>
                  <span style={{fontSize:13,fontWeight:500,color:DARK,textAlign:"right"}}>{r.val}</span>
                </div>
              ))}
            </div>
            {pkg&&(
              <>
                <div style={{height:8,background:CREAM}}/>
                <div style={{padding:"14px 20px"}}>
                  <p style={{fontSize:11,color:G700,fontWeight:600,letterSpacing:".04em",margin:"0 0 10px"}}>PAKET LAYANAN</p>
                  <div style={{background:G50,border:`0.5px solid ${G100}`,borderRadius:12,padding:"14px 16px",marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <p style={{fontSize:14,fontWeight:600,color:G900,margin:0}}>{pkg.name||project.package_name}</p>
                      <p style={{fontSize:13,fontWeight:600,color:G700,margin:0}}>{pkg.price||"—"}</p>
                    </div>
                    {(pkg.includes||[]).map((item,i)=>(
                      <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
                        <span style={{color:G500,fontSize:12,marginTop:1,flexShrink:0}}>✓</span>
                        <span style={{fontSize:12,color:MID,lineHeight:1.5}}>{item}</span>
                      </div>
                    ))}
                  </div>
                  {[
                    {label:"Koordinator",val:pkg.coordinator||"—"},
                    {label:"WhatsApp",val:pkg.wa_number||"—",accent:true},
                    {label:"Instagram",val:pkg.instagram||"—",accent:true},
                  ].map((r,i,arr)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",padding:"11px 0",
                      borderBottom:i<arr.length-1?`0.5px solid ${BORDER}`:"none"}}>
                      <span style={{fontSize:13,color:MUTED}}>{r.label}</span>
                      <span style={{fontSize:13,fontWeight:500,color:r.accent?G700:DARK}}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={{padding:"0 20px 24px"}}>
              <a href={`https://wa.me/${(project.profiles?.wa_number||pkg?.wa_number||"6288213767999").replace(/\D/g,"")}`}
                target="_blank" rel="noreferrer"
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  padding:"13px 0",fontSize:14,fontWeight:600,background:G900,
                  color:WHITE,borderRadius:12,textDecoration:"none"}}>
                Hubungi koordinator via WA
              </a>
            </div>
          </div>
        )}

        {/* ══ INVOICE ══ */}
        {tab==="pernikahan"&&subPernikahan==="invoice"&&(
          <div style={{background:WHITE,padding:"4px 0"}}>
            <div style={{padding:"14px 20px 6px",display:"flex",
              justifyContent:"space-between",alignItems:"center"}}>
              <p style={{fontSize:11,color:G700,fontWeight:600,letterSpacing:".04em",margin:0}}>
                SEMUA INVOICE</p>
              <button onClick={()=>setShowAddInv(p=>!p)}
                style={{fontSize:12,padding:"4px 12px",borderRadius:20,
                  background:showAddInv?BORDER:G900,color:showAddInv?DARK:WHITE,
                  border:"none",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                {showAddInv?"Batal":"+ Tambah"}
              </button>
            </div>
            {showAddInv&&(
              <div style={{padding:"0 20px 14px"}}>
                <div style={{background:G50,border:`0.5px solid ${G100}`,borderRadius:12,padding:"14px 16px"}}>
                  <input value={newInv.label} placeholder="Nama invoice..."
                    onChange={e=>{setNewInv(p=>({...p,label:e.target.value}));setInvErr("");}}
                    style={{...inp(),marginBottom:8}}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <input value={newInv.amount} placeholder="Jumlah (Rp)"
                      onChange={e=>{setNewInv(p=>({...p,amount:e.target.value}));setInvErr("");}}
                      style={inp()}/>
                    <input value={newInv.due_date} placeholder="Tgl jatuh tempo"
                      onChange={e=>setNewInv(p=>({...p,due_date:e.target.value}))}
                      style={inp()}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <select value={newInv.status} onChange={e=>setNewInv(p=>({...p,status:e.target.value}))}
                      style={{...inp(),appearance:"none"}}>
                      {["belum","menunggu","lunas"].map(s=>(
                        <option key={s}>{s}</option>))}
                    </select>
                    <select value={newInv.category} onChange={e=>setNewInv(p=>({...p,category:e.target.value}))}
                      style={{...inp(),appearance:"none"}}>
                      {["WO","Vendor","Venue","Lainnya"].map(c=>(
                        <option key={c}>{c}</option>))}
                    </select>
                  </div>
                  {invErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{invErr}</p>}
                  <input value={newInv.doc_url} placeholder="Link PDF / Google Drive (opsional)"
                    onChange={e=>setNewInv(p=>({...p,doc_url:e.target.value}))}
                    style={{...inp(),marginBottom:8}}/>
                  <button onClick={handleAddInvoice}
                    style={{width:"100%",padding:"9px 0",fontSize:13,fontWeight:500,
                      background:G900,color:WHITE,border:"none",borderRadius:8,
                      cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Simpan invoice</button>
                </div>
              </div>
            )}
            <div style={{padding:"4px 20px"}}>
              {["WO","Vendor","Venue","Lainnya"].map(cat=>{
                const filtered=invoices.filter(i=>i.category===cat);
                if(!filtered.length)return null;
                return(
                  <div key={cat} style={{marginBottom:8}}>
                    <p style={{fontSize:10,color:MUTED,letterSpacing:".04em",margin:"12px 0 6px"}}>{cat.toUpperCase()}</p>
                    {filtered.map((inv,i)=>(
                      <div key={inv.id} style={{padding:"11px 0",
                        borderBottom:i<filtered.length-1?`0.5px solid ${BORDER}`:"none"}}>
                        <div style={{display:"flex",justifyContent:"space-between",
                          alignItems:"flex-start",marginBottom:3}}>
                          <div style={{flex:1,marginRight:8}}>
                            <p style={{fontSize:13,fontWeight:500,color:DARK,margin:"0 0 2px"}}>{inv.label}</p>
                            <p style={{fontSize:11,color:MUTED,margin:0}}>{inv.due_date||""}</p>
                          </div>
                          <StatusBadge status={inv.status}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <p style={{fontSize:14,fontWeight:600,
                            color:inv.status==="lunas"?MUTED:DARK,margin:0}}>{inv.amount}</p>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            {inv.doc_url&&(
                              <a href={inv.doc_url} target="_blank" rel="noreferrer"
                                style={{fontSize:11,color:G700,fontWeight:500,
                                  textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                                📄 Lihat dokumen
                              </a>
                            )}
                            <button onClick={()=>setConfirmDelete({type:"invoice",id:inv.id,label:inv.label})}
                              style={{fontSize:11,padding:"3px 8px",borderRadius:20,
                                background:"#FEF2F2",color:RED,border:`0.5px solid #FECACA`,
                                cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Hapus</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {invoices.length===0&&(
                <p style={{fontSize:13,color:MUTED,textAlign:"center",padding:"24px 0"}}>
                  Belum ada invoice
                </p>
              )}
            </div>
            <div style={{height:24}}/>
          </div>
        )}

        {/* ══ DOKUMEN ══ */}
        {tab==="pernikahan"&&subPernikahan==="dokumen"&&(
          <div style={{background:WHITE,padding:"4px 0"}}>
            <div style={{padding:"14px 20px 10px",display:"flex",
              justifyContent:"space-between",alignItems:"center"}}>
              <p style={{fontSize:11,color:G700,fontWeight:600,letterSpacing:".04em",margin:0}}>
                DOKUMEN & LINK</p>
              <button onClick={()=>setShowAddDoc(p=>!p)}
                style={{fontSize:12,padding:"4px 12px",borderRadius:20,
                  background:showAddDoc?BORDER:G900,color:showAddDoc?DARK:WHITE,
                  border:"none",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                {showAddDoc?"Batal":"+ Tambah"}
              </button>
            </div>
            {showAddDoc&&(
              <div style={{padding:"0 20px 16px"}}>
                <div style={{background:G50,border:`0.5px solid ${G100}`,borderRadius:12,padding:"14px 16px"}}>
                  <input value={newDoc.label} placeholder="Nama dokumen / link..."
                    onChange={e=>{setNewDoc(p=>({...p,label:e.target.value}));setDocErr("");}}
                    style={{...inp(),marginBottom:8}}/>
                  <input value={newDoc.url} placeholder="https://drive.google.com/..."
                    onChange={e=>{setNewDoc(p=>({...p,url:e.target.value}));setDocErr("");}}
                    style={{...inp(),marginBottom:8}}/>
                  <select value={newDoc.tag} onChange={e=>setNewDoc(p=>({...p,tag:e.target.value}))}
                    style={{...inp(),marginBottom:8,appearance:"none"}}>
                    {["Foto","Dokumen","Referensi","Lainnya"].map(t=>(
                      <option key={t}>{t}</option>))}
                  </select>
                  {docErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{docErr}</p>}
                  <button onClick={handleAddDoc}
                    style={{width:"100%",padding:"9px 0",fontSize:13,fontWeight:500,
                      background:G900,color:WHITE,border:"none",borderRadius:8,
                      cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Simpan link</button>
                </div>
              </div>
            )}
            {["Foto","Dokumen","Referensi","Lainnya"].map(tag=>{
              const tagged=docs.filter(d=>d.tag===tag);
              if(!tagged.length)return null;
              return(
                <div key={tag}>
                  <p style={{fontSize:11,color:MUTED,padding:"10px 20px 6px",margin:0,
                    letterSpacing:".03em"}}>{tag.toUpperCase()}</p>
                  {tagged.map(doc=>(
                    <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer"
                      style={{display:"flex",alignItems:"center",gap:12,
                        padding:"12px 20px",borderTop:`0.5px solid ${BORDER}`,textDecoration:"none"}}>
                      <div style={{width:36,height:36,borderRadius:8,background:G50,
                        border:`0.5px solid ${G100}`,display:"flex",
                        alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                        {doc.icon||"📄"}
                      </div>
                      <div style={{flex:1}}>
                        <p style={{fontSize:13,fontWeight:500,color:DARK,margin:"0 0 2px"}}>{doc.label}</p>
                        <p style={{fontSize:11,color:G700,margin:0}}>Buka link →</p>
                      </div>
                      <button onClick={e=>{e.preventDefault();setConfirmDelete({type:"document",id:doc.id,label:doc.label});}}
                        style={{padding:"4px 8px",background:"#FEF2F2",color:RED,
                          border:`0.5px solid #FECACA`,borderRadius:20,fontSize:11,
                          cursor:"pointer",fontFamily:"Inter,sans-serif",flexShrink:0}}>
                        Hapus
                      </button>
                    </a>
                  ))}
                </div>
              );
            })}
            {docs.length===0&&!showAddDoc&&(
              <p style={{fontSize:13,color:MUTED,textAlign:"center",padding:"24px 0"}}>
                Belum ada dokumen
              </p>
            )}
            <div style={{height:24}}/>
          </div>
        )}

        {/* ══ VENDOR ══ */}
        {tab==="pernikahan"&&subPernikahan==="vendor"&&(
          <div>
            <div style={{padding:"16px 20px 12px",display:"flex",
              justifyContent:"space-between",alignItems:"center",
              borderBottom:`0.5px solid ${BORDER}`}}>
              <div>
                <h2 style={{fontFamily:"Lora,serif",fontSize:20,fontWeight:600,
                  color:DARK,margin:"0 0 2px",fontStyle:"italic"}}>Vendor kami</h2>
                <p style={{fontSize:13,color:MUTED,margin:0}}>
                  {vendors.filter(v=>v.status==="booking").length} vendor terkonfirmasi
                </p>
              </div>
              <button onClick={()=>setShowAddVendor(p=>!p)}
                style={{fontSize:12,padding:"6px 14px",borderRadius:20,
                  background:showAddVendor?BORDER:G900,color:showAddVendor?DARK:WHITE,
                  border:"none",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                {showAddVendor?"Batal":"+ Tambah"}
              </button>
            </div>

            {/* Add vendor form */}
            {showAddVendor&&(
              <div style={{padding:"12px 20px 16px",background:G50,
                borderBottom:`0.5px solid ${BORDER}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nama vendor</p>
                    <input value={newVendor.name} placeholder="mis. Rizkha Photography"
                      onChange={e=>setNewVendor(p=>({...p,name:e.target.value}))}
                      style={inp()}/>
                  </div>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Kategori</p>
                    <input value={newVendor.category} placeholder="mis. Fotografer"
                      onChange={e=>setNewVendor(p=>({...p,category:e.target.value}))}
                      style={inp()}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nomor WA</p>
                    <input value={newVendor.phone} placeholder="628xxxxxxxxx"
                      onChange={e=>setNewVendor(p=>({...p,phone:e.target.value}))}
                      style={inp()}/>
                  </div>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Harga</p>
                    <input value={newVendor.price} placeholder="mis. Rp 8.500.000"
                      onChange={e=>setNewVendor(p=>({...p,price:e.target.value}))}
                      style={inp()}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>PIC / Kontak</p>
                    <input value={newVendor.contact} placeholder="Nama PIC"
                      onChange={e=>setNewVendor(p=>({...p,contact:e.target.value}))}
                      style={inp()}/>
                  </div>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Status</p>
                    <select value={newVendor.status}
                      onChange={e=>setNewVendor(p=>({...p,status:e.target.value}))}
                      style={{...inp(),appearance:"none"}}>
                      {["prospek","negosiasi","booking"].map(s=>(
                        <option key={s}>{s}</option>))}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Catatan</p>
                  <input value={newVendor.note} placeholder="Detail kesepakatan, catatan penting..."
                    onChange={e=>setNewVendor(p=>({...p,note:e.target.value}))}
                    style={inp()}/>
                </div>
                {vendorErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{vendorErr}</p>}
                <button onClick={handleAddVendor}
                  style={{width:"100%",padding:"9px 0",fontSize:13,fontWeight:500,
                    background:G900,color:WHITE,border:"none",borderRadius:8,
                    cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Simpan vendor</button>
              </div>
            )}

            {/* Summary */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,
              padding:"14px 20px",borderBottom:`0.5px solid ${BORDER}`,background:WHITE}}>
              {[
                {label:"Booking",val:vendors.filter(v=>v.status==="booking").length,bg:"#EAF3DE",color:"#27500A"},
                {label:"Negosiasi",val:vendors.filter(v=>v.status==="negosiasi").length,bg:"#FEF9E7",color:"#633806"},
                {label:"Prospek",val:vendors.filter(v=>v.status==="prospek").length,bg:"#F1EFE8",color:"#444441"},
              ].map((s,i)=>(
                <div key={i} style={{background:s.bg,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                  <p style={{fontSize:20,fontWeight:600,color:s.color,margin:"0 0 2px",fontFamily:"Lora,serif"}}>{s.val}</p>
                  <p style={{fontSize:10,color:s.color,margin:0,fontWeight:600}}>{s.label}</p>
                </div>
              ))}
            </div>

            {vendors.length===0&&!showAddVendor&&(
              <p style={{fontSize:13,color:MUTED,textAlign:"center",padding:"32px 0"}}>
                Belum ada vendor. Klik "+ Tambah" untuk menambahkan.
              </p>
            )}
            {vendors.map(v=>{
              const st=STATUS_MAP[v.status]||STATUS_MAP.prospek;
              const isOpen=vendorOpen===v.id;
              return(
                <div key={v.id} style={{borderBottom:`0.5px solid ${BORDER}`}}>
                  <button onClick={()=>setVendorOpen(isOpen?null:v.id)}
                    style={{width:"100%",background:isOpen?G50:"none",border:"none",
                      cursor:"pointer",padding:"14px 20px",textAlign:"left",
                      display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:40,height:40,borderRadius:10,background:G50,
                      border:`0.5px solid ${G100}`,display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:20,flexShrink:0}}>
                      {v.icon||"🏪"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                        <p style={{fontSize:13,fontWeight:500,color:DARK,margin:0,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.name}</p>
                        <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,
                          background:st.bg,color:st.color,flexShrink:0}}>{st.label}</span>
                      </div>
                      <p style={{fontSize:11,color:MUTED,margin:0}}>{v.category}</p>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <p style={{fontSize:13,fontWeight:600,color:G900,margin:"0 0 1px"}}>{v.price||"—"}</p>
                      <span style={{fontSize:10,color:isOpen?G700:MUTED,display:"inline-block",
                        transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                    </div>
                  </button>
                  {isOpen&&(
                    <div style={{background:WHITE,padding:"0 20px 16px"}}>
                      {v.note&&(
                        <div style={{background:G50,border:`0.5px solid ${G100}`,
                          borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                          <p style={{fontSize:11,color:G700,fontWeight:600,margin:"0 0 4px"}}>CATATAN</p>
                          <p style={{fontSize:12,color:MID,margin:0,lineHeight:1.6}}>{v.note}</p>
                        </div>
                      )}
                      {[
                        {label:"PIC / Kontak",val:v.contact},
                        {label:"Nomor WA",val:v.phone,accent:true},
                        {label:"Instagram",val:v.instagram,accent:true},
                        ...(v.dp_amount?[{label:"DP dibayar",val:v.dp_amount},{label:"Tanggal DP",val:v.dp_date}]:[]),
                      ].filter(r=>r.val).map((r,i,arr)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",
                          alignItems:"center",padding:"9px 0",
                          borderBottom:i<arr.length-1?`0.5px solid ${BORDER}`:"none"}}>
                          <span style={{fontSize:12,color:MUTED}}>{r.label}</span>
                          <span style={{fontSize:12,fontWeight:500,color:r.accent?G700:DARK}}>{r.val}</span>
                        </div>
                      ))}
                      <div style={{display:"flex",gap:8,marginTop:12}}>
                        {v.phone&&(
                          <a href={`https://wa.me/${v.phone.replace(/\D/g,"")}`}
                            target="_blank" rel="noreferrer"
                            style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
                              gap:8,padding:"10px 0",fontSize:13,fontWeight:600,
                              background:G900,color:WHITE,borderRadius:10,textDecoration:"none"}}>
                            Hubungi {(v.contact||"vendor").split(" ")[0]}
                          </a>
                        )}
                        <button onClick={()=>setConfirmDelete({type:"vendor",id:v.id,label:v.name})}
                          style={{padding:"10px 14px",fontSize:12,fontWeight:600,
                            background:"#FEF2F2",color:RED,border:`1px solid #FECACA`,
                            borderRadius:10,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                          Hapus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ INFO ══ */}
        {tab==="info"&&(
          <div>
            <div style={{padding:"20px 20px 0"}}>
              <div style={{background:G900,borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <Leaf size={16} color={G200}/>
                  <p style={{fontSize:13,fontWeight:600,color:WHITE,margin:0}}>Hubungi koordinator</p>
                </div>
                <p style={{fontSize:12,color:"rgba(255,255,255,.6)",margin:"0 0 12px",lineHeight:1.6}}>
                  Tim Damargaleri siap membantu setiap hari 08.00–21.00 WIB</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <a href={`https://wa.me/${(pkg?.wa_number||"6288213767999").replace(/\D/g,"")}`}
                    target="_blank" rel="noreferrer"
                    style={{padding:"10px 0",fontSize:12,fontWeight:600,
                      background:WHITE,color:G900,borderRadius:8,
                      textDecoration:"none",textAlign:"center"}}>
                    Chat WhatsApp
                  </a>
                  <a href={`https://instagram.com/${(pkg?.instagram||"damargaleri.organizer").replace("@","")}`}
                    target="_blank" rel="noreferrer"
                    style={{padding:"10px 0",fontSize:12,fontWeight:600,
                      background:"rgba(255,255,255,.15)",color:WHITE,
                      border:"1px solid rgba(255,255,255,.3)",borderRadius:8,
                      textDecoration:"none",textAlign:"center"}}>
                    Instagram
                  </a>
                </div>
              </div>
            </div>
            <SH title="Pertanyaan umum"
              sub="Semua yang perlu kamu tahu tentang pernikahan & layanan Damargaleri"/>
            {FAQS.map((sec,si)=>(
              <div key={si}>
                <div style={{padding:"12px 20px 8px",background:G50,
                  borderBottom:`0.5px solid ${BORDER}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <Leaf size={13} color={G700}/>
                    <p style={{fontSize:11,color:G700,fontWeight:600,
                      letterSpacing:".04em",margin:0}}>{sec.section.toUpperCase()}</p>
                  </div>
                </div>
                {sec.items.map((item,qi)=>{
                  const key=`${si}-${qi}`;
                  const open=faqOpen===key;
                  return(
                    <div key={qi} style={{borderBottom:`0.5px solid ${BORDER}`}}>
                      <button onClick={()=>setFaqOpen(open?null:key)}
                        style={{width:"100%",background:open?G50:WHITE,border:"none",
                          cursor:"pointer",padding:"14px 20px",textAlign:"left",
                          display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                        <span style={{fontSize:13,fontWeight:500,color:DARK,lineHeight:1.4,textAlign:"left"}}>
                          {item.q}</span>
                        <span style={{fontSize:14,color:open?G700:MUTED,flexShrink:0,display:"inline-block",
                          transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                      </button>
                      {open&&(
                        <div style={{padding:"0 20px 16px",background:G50}}>
                          <p style={{fontSize:13,color:MID,margin:0,lineHeight:1.7}}>{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <div style={{height:32}}/>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",
          zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:WHITE,borderRadius:16,padding:24,width:"100%",maxWidth:320}}>
            <p style={{fontSize:15,fontWeight:600,color:DARK,margin:"0 0 8px"}}>Hapus item ini?</p>
            <p style={{fontSize:13,color:MUTED,margin:"0 0 20px",lineHeight:1.5}}>
              <strong>{confirmDelete.label}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
            </p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmDelete(null)}
                style={{flex:1,padding:"10px 0",fontSize:13,background:"none",
                  border:`1px solid ${BORDER}`,borderRadius:10,cursor:"pointer",
                  color:MUTED,fontFamily:"Inter,sans-serif"}}>Batal</button>
              <button onClick={handleDelete}
                style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:600,
                  background:RED,color:WHITE,border:"none",borderRadius:10,
                  cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,display:"flex",
        borderTop:`0.5px solid ${BORDER}`,background:WHITE,
        paddingBottom:"env(safe-area-inset-bottom,4px)",zIndex:50}}>
        {TABS.map(t=>{
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                gap:3,padding:"10px 0 6px",cursor:"pointer",background:"none",border:"none"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={active?G900:MUTED} strokeWidth={active?2:1.5}
                strokeLinecap="round" strokeLinejoin="round">
                <path d={t.d}/>
              </svg>
              <span style={{fontSize:9,fontFamily:"Inter,sans-serif",
                color:active?G900:MUTED,fontWeight:active?600:400}}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
