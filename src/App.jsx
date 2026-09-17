import { useState, useRef, useEffect } from "react";
import { useProject } from "./hooks/useProject.js";

/* ── DARK MODE TOKENS ── */
const BG0="#0D1210",BG1="#111714",BG2="#182018",BG3="#1E2A22";
const G900="#52B788",G700="#3D8A5E",G500="#2D6A4F",G300="#95D5B2",G100="#D8F3DC";
const GOLD="#C9A84C",GOLDBG="#2A2318";
const DARK="#FFFFFF",MID="#C8D5C0",MUTED="#6B7D65",BORDER="#1E2A22",BORDER2="#243020";
const WHITE="#FFFFFF",RED="#E05A5A",AMBER="#D4A843",AMBERBG="#2A2418";
const CHIP_GREEN="#1A2E1E",CHIP_AMBER="#2A2318",CHIP_RED="#2A1818";

const FAQS=[
  {section:"Dokumen pernikahan",items:[
    {q:"Dokumen apa saja yang dibutuhkan untuk menikah di KUA?",
     a:"N1 (surat nikah dari kelurahan), N2 (surat persetujuan mempelai), N4 (surat izin orang tua jika di bawah 21 tahun), fotokopi KTP, KK, akta lahir, dan pas foto 2×3 serta 3×4 masing-masing 5 lembar."},
    {q:"Berapa lama proses pendaftaran nikah?",
     a:"Untuk menikah di KUA, pendaftaran dilakukan minimal 10 hari kerja sebelum tanggal akad. Untuk gereja atau catatan sipil, biasanya 2–4 minggu sebelumnya."},
    {q:"Apakah foto prewed wajib dilakukan sebelum hari H?",
     a:"Tidak wajib, tapi sangat disarankan untuk keperluan dekorasi backdrop, undangan digital, dan dokumentasi kenangan. Idealnya 3–6 bulan sebelum hari H."},
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
     a:"Paket Essential: koordinasi hari H 8 jam, 3 asisten, tanpa vendor hunting. Full Service Premium: koordinasi H-12 bulan, vendor hunting, meeting tidak terbatas, dekorasi, MC, dokumentasi, 5 asisten hari H."},
    {q:"Apakah bisa request vendor di luar rekanan Damargaleri?",
     a:"Tentu bisa. Tim kami akan tetap mengkoordinasikan semua vendor pilihan Anda."},
    {q:"Bagaimana cara komunikasi dengan koordinator?",
     a:"Via WhatsApp setiap hari pukul 08.00–21.00 WIB. Target respons WA adalah 15 menit."},
  ]},
];

const STATUS_VENDOR={
  booking:{label:"Booking",bg:"#1A2E1E",color:"#52B788"},
  negosiasi:{label:"Negosiasi",bg:CHIP_AMBER,color:AMBER},
  prospek:{label:"Prospek",bg:"#1E1E1E",color:MUTED},
};
const STATUS_INV={
  lunas:{label:"Lunas",bg:"#1A2E1E",color:"#52B788"},
  menunggu:{label:"Jatuh tempo",bg:CHIP_AMBER,color:AMBER},
  belum:{label:"Belum",bg:"#1E1E1E",color:MUTED},
};
const CHART_COLORS=["#52B788","#C9A84C","#E05A5A","#6B9BCC","#B88852","#9B6BC9","#52B8A4","#C95252","#B8C952","#6BC96B"];

/* ── HELPERS ── */
const fmt=n=>"Rp "+Number(n||0).toLocaleString("id-ID");
const inp=(ex={})=>({
  width:"100%",padding:"10px 14px",fontSize:13,
  border:`1px solid ${BORDER2}`,borderRadius:10,outline:"none",
  color:WHITE,background:BG2,fontFamily:"Inter,sans-serif",
  boxSizing:"border-box",...ex
});

function Leaf({size=16,color=G900}){
  return(<svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2C8 2 3 4.5 3 9C3 11.76 5.24 14 8 14C10.76 14 13 11.76 13 9C13 4.5 8 2 8 2Z"
      fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" strokeLinejoin="round"/>
    <path d="M8 14V8M8 8C8 8 6 7 5 5.5M8 8C8 8 10 7 11 5.5"
      stroke={color} strokeWidth="1" strokeLinecap="round"/>
  </svg>);
}

function Ring({pct}){
  const r=36,c=2*Math.PI*r;
  return(<svg width="88" height="88" viewBox="0 0 88 88">
    <circle cx="44" cy="44" r={r} fill="none" stroke={BORDER2} strokeWidth="6"/>
    <circle cx="44" cy="44" r={r} fill="none" stroke={G900} strokeWidth="6"
      strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"
      transform="rotate(-90 44 44)" style={{transition:"stroke-dasharray .8s ease"}}/>
    <text x="44" y="40" textAnchor="middle" fontSize="18" fontWeight="700"
      fill={WHITE} fontFamily="Lora,serif">{pct}%</text>
    <text x="44" y="55" textAnchor="middle" fontSize="9"
      fill={MUTED} fontFamily="Inter,sans-serif">selesai</text>
  </svg>);
}

function DonutChart({data}){
  const total=data.reduce((s,d)=>s+d.value,0);
  if(!total) return(
    <p style={{fontSize:12,color:MUTED,textAlign:"center",padding:"16px 0"}}>
      Isi anggaran per kategori untuk melihat grafik
    </p>
  );
  const r=52,cx=70,cy=70;
  let ang=-Math.PI/2;
  const segs=data.filter(d=>d.value>0).map((d,i)=>{
    const a=(d.value/total)*2*Math.PI;
    const x1=cx+r*Math.cos(ang),y1=cy+r*Math.sin(ang);
    ang+=a;
    const x2=cx+r*Math.cos(ang),y2=cy+r*Math.sin(ang);
    return{...d,x1,y1,x2,y2,large:a>Math.PI?1:0,pct:Math.round((d.value/total)*100),
      color:CHART_COLORS[i%CHART_COLORS.length]};
  });
  return(
    <div style={{display:"flex",gap:20,alignItems:"center"}}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{flexShrink:0}}>
        {segs.map((s,i)=>(
          <path key={i} d={`M${cx},${cy} L${s.x1},${s.y1} A${r},${r} 0 ${s.large},1 ${s.x2},${s.y2}Z`}
            fill={s.color} opacity=".85"/>
        ))}
        <circle cx={cx} cy={cy} r={r-20} fill={BG2}/>
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="Inter,sans-serif">Total</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="9" fontWeight="600" fill={WHITE} fontFamily="Inter,sans-serif">
          {fmt(total)}
        </text>
      </svg>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
        {segs.slice(0,7).map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
            <span style={{fontSize:10,color:MUTED,flex:1,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</span>
            <span style={{fontSize:10,fontWeight:600,color:WHITE}}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({label,bg,color}){
  return <span style={{fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:20,background:bg,color}}>{label}</span>;
}

function LoadingScreen(){
  return(
    <div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",background:BG0,gap:12}}>
      <div style={{width:48,height:48,borderRadius:"50%",background:BG2,
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Leaf size={24} color={G900}/>
      </div>
      <span style={{fontFamily:"Dancing Script,cursive",fontSize:24,color:WHITE}}>Damargaleri</span>
      <span style={{fontSize:11,color:MUTED}}>Memuat pernikahan Anda...</span>
    </div>
  );
}

function ErrorScreen({message}){
  return(
    <div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",background:BG0,gap:12,padding:24,textAlign:"center"}}>
      <Leaf size={32} color={MUTED}/>
      <span style={{fontFamily:"Dancing Script,cursive",fontSize:24,color:WHITE}}>Damargaleri</span>
      <span style={{fontSize:13,color:MUTED,lineHeight:1.6}}>{message}</span>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN APP
══════════════════════════════════ */
export default function App({slug}){
  const pageSlug=slug||window.location.pathname.replace(/^\//,"").split("/")[0];
  const {
    project,loading,error,
    updateProject,
    toggleTask,addTask,deleteTask,
    updateBudgetCategory,addBudgetCategory,deleteBudgetCategory,
    addInvoice,updateInvoice,deleteInvoice,
    addDocument,updateDocument,deleteDocument,
    addVendor,updateVendor,deleteVendor,
    updateCoverImage,
  }=useProject(pageSlug);

  /* UI state */
  const [tab,setTab]=useState("home");
  const [subP,setSubP]=useState("checklist");
  const [subW,setSubW]=useState("detail");
  const [expanded,setExp]=useState(null);
  const [addingTo,setAddTo]=useState(null);
  const [newTask,setNewTask]=useState({text:"",pic:"",loc:"",due_date:""});
  const [taskErr,setTaskErr]=useState("");
  const [faqOpen,setFaqOpen]=useState(null);
  const [showAddDoc,setShowAddDoc]=useState(false);
  const [newDoc,setNewDoc]=useState({label:"",url:"",tag:"Dokumen"});
  const [docErr,setDocErr]=useState("");
  const [editDocId,setEditDocId]=useState(null);
  const [showAddInv,setShowAddInv]=useState(false);
  const [newInv,setNewInv]=useState({label:"",amount:"",due_date:"",status:"belum",category:"WO",doc_url:""});
  const [invErr,setInvErr]=useState("");
  const [editInvId,setEditInvId]=useState(null);
  const [editBudget,setEditBudget]=useState(null);
  const [budgetInput,setBudgetInput]=useState({cat:"",alloc:"",spent:""});
  const [budgetErr,setBudgetErr]=useState("");
  const [vendorOpen,setVendorOpen]=useState(null);
  const [showAddVendor,setShowAddVendor]=useState(false);
  const [newVendor,setNewVendor]=useState({category:"",name:"",contact:"",phone:"",instagram:"",price:"",status:"prospek",note:"",icon:"🏪"});
  const [vendorErr,setVendorErr]=useState("");
  const [editVendorId,setEditVendorId]=useState(null);
  const [editingDetail,setEditingDetail]=useState(false);
  const [detailForm,setDetailForm]=useState({});
  const [coverPos,setCoverPos]=useState(30);
  const [editingCover,setEditingCover]=useState(false);
  const [countdown,setCountdown]=useState({d:0,h:0,m:0,s:0});
  const [confirmDelete,setConfirmDelete]=useState(null);
  const coverRef=useRef();

  /* Meta tags */
  useEffect(()=>{
    if(!project)return;
    const title=`${project.bride_name} & ${project.groom_name} — Damargaleri`;
    const desc=`Wedding planner digital untuk pernikahan ${project.bride_name} & ${project.groom_name}. Dikelola oleh Damargaleri Organizer.`;
    document.title=title;
    const m=(p,v,a="name")=>{
      let el=document.querySelector(`meta[${a}="${p}"]`);
      if(!el){el=document.createElement("meta");el.setAttribute(a,p);document.head.appendChild(el);}
      el.setAttribute("content",v);
    };
    m("description",desc);
    m("og:title",title,"property");m("og:description",desc,"property");
    m("og:image",project.cover_image_url||`${window.location.origin}/cover-default.jpg`,"property");
    m("og:url",window.location.href,"property");
  },[project]);

  /* Countdown */
  useEffect(()=>{
    if(!project?.wedding_date)return;
    const d=new Date(project.wedding_date+"T10:00:00");
    const tick=()=>{
      const diff=d-new Date();
      if(diff<=0){setCountdown({d:0,h:0,m:0,s:0});return;}
      setCountdown({d:Math.floor(diff/86400000),h:Math.floor((diff%86400000)/3600000),
        m:Math.floor((diff%3600000)/60000),s:Math.floor((diff%60000)/1000)});
    };
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[project?.wedding_date]);

  useEffect(()=>{
    if(project?.checklist_phases?.length&&!expanded)setExp(project.checklist_phases[0].id);
  },[project]);

  if(loading)return <LoadingScreen/>;
  if(error||!project)return <ErrorScreen message="Project tidak ditemukan atau kamu tidak punya akses."/>;

  /* Derived */
  const phases=project.checklist_phases||[];
  const budget=project.budget_categories||[];
  const vendors=project.vendors||[];
  const invoices=project.invoices||[];
  const docs=project.documents||[];
  const pkg=project.packages;
  const coverImg=project.cover_image_url||"/cover-default.jpg";
  const coupleNames=`${project.bride_name} & ${project.groom_name}`;
  const weddingDate=project.wedding_date
    ?new Date(project.wedding_date).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})
    :"Tanggal belum diset";
  const allTasks=phases.flatMap(p=>p.checklist_tasks||[]);
  const doneCount=allTasks.filter(t=>t.done).length;
  const pct=allTasks.length?Math.round((doneCount/allTasks.length)*100):0;
  const totalSpent=budget.reduce((s,b)=>s+Number(b.spent||0),0);
  const budgetTotal=Number(project.budget_total)||budget.reduce((s,b)=>s+Number(b.allocated||0),0)||1;
  const budgetPct=Math.round((totalSpent/budgetTotal)*100);
  const pmWA=project.profiles?.wa_number||pkg?.wa_number||"6288213767999";

  /* Handlers */
  async function handleToggleTask(tid,done){await toggleTask(tid,!done);}
  async function handleAddTask(pid){
    if(!newTask.text.trim()){setTaskErr("Tulis nama tugas dulu.");return;}
    const{error}=await addTask(pid,newTask);
    if(!error){setNewTask({text:"",pic:"",loc:"",due_date:""});setTaskErr("");setAddTo(null);}
  }
  async function handleSaveBudget(id){
    const a=parseInt(budgetInput.alloc.replace(/\D/g,""))||0;
    const s=parseInt(budgetInput.spent.replace(/\D/g,""))||0;
    if(s>a){setBudgetErr("Pengeluaran tidak boleh melebihi anggaran.");return;}
    await updateBudgetCategory(id,{name:budgetInput.cat||undefined,allocated:a,spent:s});
    setEditBudget(null);setBudgetErr("");
  }
  async function handleAddInvoice(){
    if(!newInv.label.trim()){setInvErr("Nama invoice wajib diisi.");return;}
    if(!newInv.amount.trim()){setInvErr("Jumlah wajib diisi.");return;}
    await addInvoice(newInv);
    setNewInv({label:"",amount:"",due_date:"",status:"belum",category:"WO",doc_url:""});
    setInvErr("");setShowAddInv(false);
  }
  async function handleAddDoc(){
    if(!newDoc.label.trim()){setDocErr("Nama wajib diisi.");return;}
    if(!newDoc.url.trim()){setDocErr("Link wajib diisi.");return;}
    const icons={Foto:"📷",Dokumen:"📄",Referensi:"🎨",Lainnya:"🔗"};
    await addDocument({...newDoc,icon:icons[newDoc.tag]||"🔗"});
    setNewDoc({label:"",url:"",tag:"Dokumen"});setDocErr("");setShowAddDoc(false);
  }
  async function handleAddVendor(){
    if(!newVendor.name.trim()){setVendorErr("Nama vendor wajib diisi.");return;}
    if(!newVendor.category.trim()){setVendorErr("Kategori wajib diisi.");return;}
    await addVendor(newVendor);
    setNewVendor({category:"",name:"",contact:"",phone:"",instagram:"",price:"",status:"prospek",note:"",icon:"🏪"});
    setVendorErr("");setShowAddVendor(false);
  }
  async function handleDelete(){
    if(!confirmDelete)return;
    const{type,id}=confirmDelete;
    if(type==="task")await deleteTask(id);
    else if(type==="budget")await deleteBudgetCategory(id);
    else if(type==="invoice")await deleteInvoice(id);
    else if(type==="document")await deleteDocument(id);
    else if(type==="vendor")await deleteVendor(id);
    setConfirmDelete(null);
  }
  async function handleSaveDetail(){
    await updateProject({...detailForm,budget_total:parseInt(String(detailForm.budget_total).replace(/\D/g,""))||0});
    setEditingDetail(false);
  }
  async function handleCover(e){
    const f=e.target.files[0];if(!f)return;
    await updateCoverImage(f);setEditingCover(true);
  }

  /* Shared styles */
  const card=(ex={})=>({background:BG2,borderRadius:14,border:`1px solid ${BORDER2}`,padding:"16px",...ex});
  const secLabel=(txt)=>(
    <p style={{fontSize:10,fontWeight:700,color:MUTED,letterSpacing:".1em",
      textTransform:"uppercase",margin:"0 0 10px"}}>{txt}</p>
  );
  const divider=<div style={{height:1,background:BORDER,margin:"0 0 0 0"}}/>;

  const TABS=[
    {id:"home",label:"Beranda",d:"M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5zM9 21V12h6v9"},
    {id:"persiapan",label:"Persiapan",d:"M9 12l2 2 4-4M5 5h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"},
    {id:"pernikahan",label:"Pernikahan",d:"M12 21.7C5.8 21.7 1 17 1 12s4.8-9.7 11-9.7 11 4.3 11 9.7-4.8 9.7-11 9.7zM12 6v6l4 2"},
    {id:"info",label:"Info",d:"M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"},
  ];

  return(
    <div style={{width:"100%",maxWidth:430,margin:"0 auto",minHeight:"100vh",
      background:BG1,display:"flex",flexDirection:"column",fontFamily:"Inter,sans-serif",
      color:WHITE}}>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* TOP BAR */}
      <div style={{position:"sticky",top:0,zIndex:50,
        background:"rgba(17,23,20,.85)",backdropFilter:"blur(12px)",
        padding:"12px 20px 10px",display:"flex",alignItems:"center",
        justifyContent:"space-between",borderBottom:`1px solid ${BORDER}`}}>
        <Leaf size={18} color={G900}/>
        <span style={{fontFamily:"Dancing Script,cursive",fontSize:20,color:WHITE,letterSpacing:".02em"}}>
          Damargaleri
        </span>
        <div style={{width:18}}/>
      </div>

      <div style={{flex:1,paddingBottom:72}}>

        {/* ══════════ HOME ══════════ */}
        {tab==="home"&&(
          <div>
            {/* Cover hero */}
            <div style={{position:"relative",height:380,overflow:"hidden",background:BG0}}>
              <img src={coverImg} alt="Cover"
                style={{width:"100%",height:"100%",objectFit:"cover",
                  objectPosition:`center ${coverPos}%`,transition:"object-position .2s"}}
                onError={e=>{e.target.src="/cover-default.jpg"}}/>
              <div style={{position:"absolute",inset:0,
                background:"linear-gradient(to bottom,rgba(0,0,0,.1) 0%,rgba(0,0,0,.2) 40%,rgba(13,18,16,.98) 100%)"}}/>

              {/* Edit mode */}
              {editingCover&&(
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",
                  display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:16,padding:"0 28px"}}>
                  <p style={{fontSize:12,color:WHITE,fontWeight:500}}>↕ Geser untuk atur posisi foto</p>
                  <input type="range" min="0" max="100" value={coverPos}
                    onChange={e=>setCoverPos(Number(e.target.value))}
                    style={{width:"100%",accentColor:G900}}/>
                  <div style={{display:"flex",gap:10}}>
                    <button onPointerDown={e=>{e.stopPropagation();setEditingCover(false);}}
                      style={{padding:"8px 20px",fontSize:12,fontWeight:600,
                        background:"rgba(255,255,255,.1)",color:WHITE,
                        border:"1px solid rgba(255,255,255,.3)",borderRadius:20,cursor:"pointer"}}>
                      Batal
                    </button>
                    <button onPointerDown={e=>{e.stopPropagation();setEditingCover(false);}}
                      style={{padding:"8px 20px",fontSize:12,fontWeight:600,
                        background:G900,color:WHITE,border:"none",borderRadius:20,cursor:"pointer"}}>
                      ✓ Simpan
                    </button>
                  </div>
                </div>
              )}

              {/* Photo buttons */}
              {!editingCover&&(
                <div style={{position:"absolute",top:12,right:12,display:"flex",gap:6}}>
                  <button onClick={()=>setEditingCover(true)}
                    style={{padding:"5px 10px",fontSize:10,fontWeight:600,
                      background:"rgba(0,0,0,.4)",color:WHITE,backdropFilter:"blur(8px)",
                      border:"1px solid rgba(255,255,255,.2)",borderRadius:20,cursor:"pointer"}}>
                    Atur posisi
                  </button>
                  <button onClick={()=>coverRef.current.click()}
                    style={{padding:"5px 10px",fontSize:10,fontWeight:600,
                      background:"rgba(0,0,0,.4)",color:WHITE,backdropFilter:"blur(8px)",
                      border:"1px solid rgba(255,255,255,.2)",borderRadius:20,cursor:"pointer"}}>
                    Ganti foto
                  </button>
                </div>
              )}
              <input ref={coverRef} type="file" accept="image/*"
                onChange={handleCover} style={{display:"none"}}/>

              {/* Names + countdown overlay */}
              {!editingCover&&(
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 24px 24px"}}>
                  <p style={{fontSize:10,color:"rgba(255,255,255,.5)",letterSpacing:".14em",
                    textTransform:"uppercase",margin:"0 0 4px"}}>The Wedding Celebration Of</p>
                  <h1 style={{fontFamily:"Lora,serif",fontSize:32,fontWeight:600,fontStyle:"italic",
                    color:WHITE,margin:"0 0 3px",lineHeight:1.15}}>{coupleNames}</h1>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.6)",margin:"0 0 16px"}}>
                    📅 {weddingDate}{project.location?` · ${project.location}`:""}
                  </p>
                  {/* Countdown */}
                  <div style={{background:"rgba(0,0,0,.45)",backdropFilter:"blur(12px)",
                    borderRadius:14,padding:"12px 16px",border:"1px solid rgba(255,255,255,.08)",
                    display:"flex",justifyContent:"space-around"}}>
                    <p style={{fontSize:9,color:"rgba(255,255,255,.5)",margin:"0 0 2px",
                      letterSpacing:".1em",textTransform:"uppercase",textAlign:"center",
                      gridColumn:"1/-1",position:"absolute",top:4,left:0,right:0}}>
                    </p>
                    {[["Hari",countdown.d],["Jam",countdown.h],["Menit",countdown.m],["Detik",countdown.s]].map(([l,v])=>(
                      <div key={l} style={{textAlign:"center"}}>
                        <p style={{fontFamily:"Lora,serif",fontSize:26,fontWeight:700,
                          color:WHITE,margin:"0 0 1px",lineHeight:1}}>{String(v).padStart(2,"0")}</p>
                        <p style={{fontSize:9,color:"rgba(255,255,255,.45)",margin:0,
                          letterSpacing:".08em",textTransform:"uppercase"}}>{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Progress section */}
            <div style={{padding:"20px 20px 0"}}>
              <div style={{...card(),display:"flex",gap:16,alignItems:"center",marginBottom:12}}>
                <Ring pct={pct}/>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,color:MUTED,margin:"0 0 2px"}}>Tugas Terselesaikan</p>
                  <p style={{fontSize:22,fontWeight:700,color:WHITE,margin:"0 0 4px",
                    fontFamily:"Lora,serif"}}>{doneCount} <span style={{fontSize:14,color:MUTED}}>/ {allTasks.length}</span></p>
                  <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,
                    background:CHIP_GREEN,color:G900}}>{countdown.d} hari lagi</span>
                </div>
              </div>

              {/* Budget bar */}
              <div style={{...card(),marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <p style={{fontSize:13,fontWeight:500,color:WHITE,margin:0}}>Realisasi Anggaran</p>
                  <span style={{fontSize:12,fontWeight:600,color:budgetPct>90?RED:budgetPct>70?AMBER:G900}}>
                    {budgetPct}% Terpakai
                  </span>
                </div>
                <div style={{height:6,borderRadius:3,background:BG3,overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",width:`${Math.min(budgetPct,100)}%`,
                    background:budgetPct>90?RED:budgetPct>70?AMBER:G900,
                    borderRadius:3,transition:"width .8s ease"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div>
                    <p style={{fontSize:10,color:MUTED,margin:"0 0 1px"}}>Terpakai</p>
                    <p style={{fontSize:12,fontWeight:600,color:WHITE,margin:0}}>{fmt(totalSpent)}</p>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{fontSize:10,color:MUTED,margin:"0 0 1px"}}>Sisa Cadangan</p>
                    <p style={{fontSize:12,fontWeight:600,
                      color:budgetTotal-totalSpent<0?RED:G900,margin:0}}>{fmt(budgetTotal-totalSpent)}</p>
                  </div>
                </div>
              </div>

              {/* Quick info */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                {[
                  {icon:"📅",label:"Tanggal Acara",val:project.wedding_date
                    ?new Date(project.wedding_date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})
                    :"—"},
                  {icon:"📍",label:"Lokasi Venue",val:project.venue||"—"},
                  {icon:"👥",label:"Target Undangan",val:project.guest_count||"—"},
                  {icon:"💰",label:"Total Anggaran",val:project.budget_total?fmt(project.budget_total):"—"},
                ].map((c,i)=>(
                  <div key={i} style={{...card({padding:"12px 14px"})}}>
                    <p style={{fontSize:18,margin:"0 0 6px"}}>{c.icon}</p>
                    <p style={{fontSize:10,color:MUTED,margin:"0 0 2px"}}>{c.label}</p>
                    <p style={{fontSize:12,fontWeight:600,color:WHITE,margin:0,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.val}</p>
                  </div>
                ))}
              </div>

              {/* Next tasks */}
              <div style={{...card(),marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:12}}>
                  <p style={{fontSize:14,fontWeight:600,color:WHITE,margin:0,
                    fontFamily:"Lora,serif",fontStyle:"italic"}}>Tugas Selanjutnya</p>
                  <button onClick={()=>{setTab("persiapan");setSubP("checklist");}}
                    style={{fontSize:11,color:G900,background:"none",border:"none",
                      cursor:"pointer",fontWeight:600}}>Lihat Semua →</button>
                </div>
                {allTasks.filter(t=>!t.done).slice(0,5).map((t,i,arr)=>(
                  <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:12,
                    padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${BORDER}`:"none"}}>
                    <div onClick={()=>handleToggleTask(t.id,t.done)}
                      style={{width:20,height:20,borderRadius:"50%",flexShrink:0,marginTop:1,
                        border:`1.5px solid ${BORDER2}`,cursor:"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        transition:"all .2s"}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:13,color:WHITE,margin:"0 0 4px",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text}</p>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,color:MUTED}}>👤 {t.pic||"Pasangan"}</span>
                        {t.due_date&&(
                          <span style={{fontSize:10,color:AMBER}}>
                            📅 {new Date(t.due_date).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {allTasks.filter(t=>!t.done).length===0&&(
                  <p style={{fontSize:13,color:G900,textAlign:"center",padding:"16px 0"}}>
                    🎉 Semua tugas sudah selesai!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ PERSIAPAN sub-tabs ══════════ */}
        {tab==="persiapan"&&(
          <div style={{position:"sticky",top:48,zIndex:40,
            background:"rgba(17,23,20,.9)",backdropFilter:"blur(8px)",
            display:"flex",borderBottom:`1px solid ${BORDER}`}}>
            {[["checklist","✅","Checklist"],["budget","💰","Budget"]].map(([id,ico,lbl])=>(
              <button key={id} onClick={()=>setSubP(id)}
                style={{flex:1,padding:"12px 0",fontSize:13,fontWeight:500,
                  background:"none",border:"none",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                  color:subP===id?WHITE:MUTED,
                  borderBottom:subP===id?`2px solid ${G900}`:"2px solid transparent",
                  fontFamily:"Inter,sans-serif",transition:"color .15s"}}>
                <span style={{fontSize:15}}>{ico}</span>{lbl}
              </button>
            ))}
          </div>
        )}

        {/* ══════════ CHECKLIST ══════════ */}
        {tab==="persiapan"&&subP==="checklist"&&(
          <div>
            <div style={{padding:"20px 20px 14px"}}>
              <p style={{fontSize:10,fontWeight:700,color:MUTED,letterSpacing:".1em",margin:"0 0 4px"}}>
                STATUS KEMAJUAN
              </p>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <h2 style={{fontFamily:"Lora,serif",fontSize:24,fontWeight:600,color:WHITE,margin:0,fontStyle:"italic"}}>
                  Persiapan Pernikahan
                </h2>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center",marginTop:8}}>
                <span style={{fontSize:22,fontWeight:700,color:WHITE,fontFamily:"Lora,serif"}}>{doneCount}</span>
                <span style={{fontSize:13,color:MUTED}}>/ {allTasks.length} Tugas</span>
                <span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,
                  background:CHIP_GREEN,color:G900,marginLeft:"auto"}}>{pct}%</span>
              </div>
              <div style={{height:4,borderRadius:2,background:BG3,overflow:"hidden",marginTop:8}}>
                <div style={{height:"100%",width:`${pct}%`,background:G900,
                  borderRadius:2,transition:"width .6s ease"}}/>
              </div>
            </div>

            {phases.map((phase,phaseIdx)=>{
              const tasks=phase.checklist_tasks||[];
              const isOpen=expanded===phase.id;
              const done=tasks.filter(t=>t.done).length;
              const allDone=done===tasks.length&&tasks.length>0;
              return(
                <div key={phase.id} style={{marginBottom:8,padding:"0 20px"}}>
                  <button onClick={()=>setExp(isOpen?null:phase.id)}
                    style={{width:"100%",background:isOpen?BG2:BG2,border:`1px solid ${isOpen?BORDER2:BORDER}`,
                      borderRadius:12,cursor:"pointer",padding:"14px 16px",textAlign:"left",
                      transition:"all .2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:24,height:24,borderRadius:"50%",
                          background:allDone?G900:BG3,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:11,fontWeight:700,color:allDone?WHITE:MUTED}}>
                          {allDone?"✓":(phaseIdx+1)}
                        </div>
                        <span style={{fontSize:14,fontWeight:600,color:allDone?MUTED:WHITE}}>
                          {phase.label}
                        </span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,
                          background:allDone?CHIP_GREEN:BG3,
                          color:allDone?G900:MUTED}}>
                          {done}/{tasks.length} {allDone?"Selesai":""}
                        </span>
                        <span style={{fontSize:10,color:MUTED,display:"inline-block",
                          transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                      </div>
                    </div>
                    <div style={{height:3,borderRadius:2,background:BG3,overflow:"hidden"}}>
                      <div style={{height:"100%",
                        width:`${tasks.length?Math.round((done/tasks.length)*100):0}%`,
                        background:allDone?G700:G900,borderRadius:2,transition:"width .4s"}}/>
                    </div>
                  </button>

                  {isOpen&&(
                    <div style={{background:BG2,borderRadius:"0 0 12px 12px",
                      border:`1px solid ${BORDER2}`,borderTop:"none",
                      paddingBottom:4,marginTop:-4}} className="fade-up">
                      {tasks.map(task=>(
                        <div key={task.id}
                          style={{display:"flex",alignItems:"flex-start",gap:12,
                            padding:"12px 16px",
                            borderBottom:`1px solid ${BORDER}`,
                            background:task.done?"rgba(82,183,136,.04)":"transparent",
                            transition:"background .3s"}}>
                          <div onClick={()=>handleToggleTask(task.id,task.done)}
                            className={task.done?"check-ring":""}
                            style={{width:20,height:20,borderRadius:"50%",flexShrink:0,marginTop:2,
                              background:task.done?G900:"transparent",
                              border:task.done?"none":`1.5px solid ${BORDER2}`,
                              display:"flex",alignItems:"center",justifyContent:"center",
                              cursor:"pointer",transition:"background .25s, border .25s",
                              boxShadow:task.done?`0 0 0 3px rgba(82,183,136,.15)`:"none"}}>
                            {task.done&&(
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="check-icon">
                                <path d="M1 4L3.5 6.5L9 1" stroke={WHITE}
                                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div style={{flex:1}}>
                            <p className={task.done?"task-done-text":""}
                              style={{fontSize:13,color:task.done?MUTED:WHITE,
                                margin:"0 0 5px",transition:"color .3s"}}>{task.text}</p>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                              <span style={{fontSize:10,color:G900,background:CHIP_GREEN,
                                padding:"2px 7px",borderRadius:20}}>
                                👤 {task.pic||"Pasangan"}</span>
                              <span style={{fontSize:10,color:MUTED,background:BG3,
                                padding:"2px 7px",borderRadius:20}}>
                                📍 {task.location||"—"}</span>
                              {task.due_date&&(
                                <span style={{fontSize:10,color:AMBER,background:CHIP_AMBER,
                                  padding:"2px 7px",borderRadius:20}}>
                                  📅 {new Date(task.due_date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={e=>{e.stopPropagation();setConfirmDelete({type:"task",id:task.id,label:task.text});}}
                            style={{padding:"2px 6px",background:"none",border:"none",
                              cursor:"pointer",color:MUTED,fontSize:16,opacity:.5,flexShrink:0}}>×</button>
                        </div>
                      ))}

                      {addingTo===phase.id?(
                        <div style={{padding:"12px 16px"}}>
                          <input value={newTask.text} placeholder="Nama tugas..." autoFocus
                            onChange={e=>{setNewTask(p=>({...p,text:e.target.value}));setTaskErr("");}}
                            onKeyDown={e=>e.key==="Enter"&&handleAddTask(phase.id)}
                            style={{...inp(),marginBottom:8,borderColor:taskErr?RED:BORDER2}}/>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                            <input value={newTask.pic} placeholder="PIC (siapa?)"
                              onChange={e=>setNewTask(p=>({...p,pic:e.target.value}))} style={inp()}/>
                            <input value={newTask.loc} placeholder="Lokasi"
                              onChange={e=>setNewTask(p=>({...p,loc:e.target.value}))} style={inp()}/>
                          </div>
                          <div style={{marginBottom:8}}>
                            <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Tanggal target (opsional)</p>
                            <input type="date" value={newTask.due_date}
                              onChange={e=>setNewTask(p=>({...p,due_date:e.target.value}))}
                              style={inp({colorScheme:"dark"})}/>
                          </div>
                          {taskErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{taskErr}</p>}
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>handleAddTask(phase.id)}
                              style={{flex:1,padding:"9px 0",fontSize:13,fontWeight:600,
                                background:G900,color:WHITE,border:"none",borderRadius:10,cursor:"pointer"}}>
                              Tambah
                            </button>
                            <button onClick={()=>{setAddTo(null);setNewTask({text:"",pic:"",loc:"",due_date:""});}}
                              style={{padding:"9px 16px",fontSize:13,background:"none",
                                border:`1px solid ${BORDER2}`,borderRadius:10,cursor:"pointer",color:MUTED}}>
                              Batal
                            </button>
                          </div>
                        </div>
                      ):(
                        <button onClick={()=>{setAddTo(phase.id);setNewTask({text:"",pic:"",loc:"",due_date:""}); }}
                          style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",
                            background:"none",border:"none",cursor:"pointer",color:G900,fontSize:13}}>
                          <span style={{fontSize:18,lineHeight:1}}>+</span> Tambah Sub-tugas di {phase.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{height:16}}/>
          </div>
        )}

        {/* ══════════ BUDGET ══════════ */}
        {tab==="persiapan"&&subP==="budget"&&(
          <div>
            <div style={{padding:"20px 20px 14px"}}>
              <p style={{fontSize:10,fontWeight:700,color:MUTED,letterSpacing:".1em",margin:"0 0 4px"}}>ANGGARAN PERNIKAHAN</p>
              <h2 style={{fontFamily:"Lora,serif",fontSize:24,fontWeight:600,color:WHITE,margin:0,fontStyle:"italic"}}>
                Budget Tracker
              </h2>
            </div>

            {/* Summary */}
            <div style={{padding:"0 20px 12px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {[
                {label:"Total Anggaran",val:fmt(budgetTotal),accent:false},
                {label:"Terpakai",val:fmt(totalSpent),accent:true},
                {label:"Sisa",val:fmt(budgetTotal-totalSpent),accent:false,neg:budgetTotal-totalSpent<0},
              ].map((c,i)=>(
                <div key={i} style={{...card({padding:"10px 12px"})}}>
                  <p style={{fontSize:9,color:MUTED,margin:"0 0 3px",letterSpacing:".05em",textTransform:"uppercase"}}>{c.label}</p>
                  <p style={{fontSize:11,fontWeight:700,color:c.neg?RED:c.accent?G900:WHITE,margin:0,lineHeight:1.2}}>{c.val}</p>
                </div>
              ))}
            </div>
            <div style={{padding:"0 20px 4px"}}>
              <div style={{height:6,borderRadius:3,background:BG3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(budgetPct,100)}%`,
                  background:budgetPct>90?RED:budgetPct>70?AMBER:G900,
                  borderRadius:3,transition:"width .8s"}}/>
              </div>
              <p style={{fontSize:10,color:MUTED,textAlign:"right",margin:"4px 0 12px"}}>{budgetPct}% terpakai</p>
            </div>

            {/* Donut chart */}
            {budget.filter(b=>Number(b.allocated)>0).length>0&&(
              <div style={{...card(),margin:"0 20px 12px"}}>
                {secLabel("Distribusi Anggaran")}
                <DonutChart data={budget.map(b=>({label:b.name,value:Number(b.allocated)||0}))}/>
              </div>
            )}

            {/* Category list */}
            <div style={{padding:"0 20px"}}>
              {budget.map(b=>{
                const over=Number(b.spent)>Number(b.allocated);
                const catPct=Number(b.allocated)>0?Math.round((Number(b.spent)/Number(b.allocated))*100):0;
                const isEdit=editBudget===b.id;
                return(
                  <div key={b.id} style={{...card(),marginBottom:10}}>
                    {isEdit?(
                      <div>
                        <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nama kategori</p>
                        <input value={budgetInput.cat||b.name}
                          onChange={e=>setBudgetInput(p=>({...p,cat:e.target.value}))}
                          style={{...inp(),marginBottom:8}}/>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                          <div>
                            <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Anggaran (Rp)</p>
                            <input value={budgetInput.alloc}
                              onChange={e=>{setBudgetInput(p=>({...p,alloc:e.target.value}));setBudgetErr("");}}
                              style={inp()}/>
                          </div>
                          <div>
                            <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Sudah dibayar (Rp)</p>
                            <input value={budgetInput.spent}
                              onChange={e=>{setBudgetInput(p=>({...p,spent:e.target.value}));setBudgetErr("");}}
                              style={inp()}/>
                          </div>
                        </div>
                        {budgetErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{budgetErr}</p>}
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>handleSaveBudget(b.id)}
                            style={{flex:1,padding:"8px 0",fontSize:12,fontWeight:600,
                              background:G900,color:WHITE,border:"none",borderRadius:8,cursor:"pointer"}}>
                            Simpan
                          </button>
                          <button onClick={()=>{setEditBudget(null);setBudgetErr("");}}
                            style={{padding:"8px 14px",fontSize:12,background:"none",
                              border:`1px solid ${BORDER2}`,borderRadius:8,cursor:"pointer",color:MUTED}}>
                            Batal
                          </button>
                        </div>
                      </div>
                    ):(
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:18}}>{b.icon||"💸"}</span>
                            <div>
                              <p style={{fontSize:13,fontWeight:500,color:WHITE,margin:"0 0 1px"}}>{b.name}</p>
                              <p style={{fontSize:11,color:MUTED,margin:0}}>{fmt(b.spent)} dari {fmt(b.allocated)}</p>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            {over&&<span style={{fontSize:10,fontWeight:600,color:RED}}>⚠</span>}
                            <button onClick={()=>{setEditBudget(b.id);setBudgetInput({cat:b.name,alloc:String(b.allocated),spent:String(b.spent)});}}
                              style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:BG3,
                                color:G900,border:`1px solid ${BORDER2}`,cursor:"pointer"}}>Edit</button>
                            <button onClick={()=>setConfirmDelete({type:"budget",id:b.id,label:b.name})}
                              style={{fontSize:11,padding:"3px 9px",borderRadius:20,
                                background:CHIP_RED,color:RED,border:`1px solid #3A1818`,cursor:"pointer"}}>Hapus</button>
                          </div>
                        </div>
                        <div style={{height:4,borderRadius:2,background:BG3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${Math.min(catPct,100)}%`,
                            background:over?RED:catPct>80?AMBER:G900,borderRadius:2,transition:"width .5s"}}/>
                        </div>
                        <p style={{fontSize:10,color:over?RED:MUTED,textAlign:"right",margin:"3px 0 0"}}>{catPct}%</p>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>addBudgetCategory("Kategori baru")}
                style={{width:"100%",padding:"12px",fontSize:13,fontWeight:500,
                  background:"none",border:`1px dashed ${BORDER2}`,borderRadius:12,
                  cursor:"pointer",color:G900,marginBottom:20,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <span style={{fontSize:18}}>+</span> Tambah kategori
              </button>
            </div>
          </div>
        )}

        {/* ══════════ PERNIKAHAN sub-tabs ══════════ */}
        {tab==="pernikahan"&&(
          <div style={{position:"sticky",top:48,zIndex:40,
            background:"rgba(17,23,20,.9)",backdropFilter:"blur(8px)",
            display:"flex",borderBottom:`1px solid ${BORDER}`}}>
            {[["detail","💍","Detail"],["invoice","🧾","Invoice"],["dokumen","📁","Dokumen"],["vendor","🏪","Vendor"]].map(([id,ico,lbl])=>(
              <button key={id} onClick={()=>setSubW(id)}
                style={{flex:1,padding:"12px 0",fontSize:11,fontWeight:500,
                  background:"none",border:"none",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                  color:subW===id?WHITE:MUTED,
                  borderBottom:subW===id?`2px solid ${G900}`:"2px solid transparent",
                  fontFamily:"Inter,sans-serif"}}>
                <span style={{fontSize:13}}>{ico}</span>{lbl}
              </button>
            ))}
          </div>
        )}

        {/* ══════════ DETAIL ══════════ */}
        {tab==="pernikahan"&&subW==="detail"&&(
          <div>
            {/* Cover banner */}
            <div style={{position:"relative",height:200,overflow:"hidden",background:BG0}}>
              <img src={coverImg} alt="Cover"
                style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`center ${coverPos}%`}}
                onError={e=>{e.target.src="/cover-default.jpg"}}/>
              <div style={{position:"absolute",inset:0,
                background:"linear-gradient(to bottom,rgba(0,0,0,.2) 0%,rgba(13,18,16,.95) 100%)"}}/>
              <div style={{position:"absolute",bottom:20,left:24,right:24}}>
                <p style={{fontSize:10,color:"rgba(255,255,255,.5)",letterSpacing:".12em",
                  textTransform:"uppercase",margin:"0 0 3px"}}>Pernikahan</p>
                <h2 style={{fontFamily:"Lora,serif",fontSize:22,fontWeight:600,fontStyle:"italic",
                  color:WHITE,margin:"0 0 1px"}}>{coupleNames}</h2>
                <p style={{fontSize:11,color:"rgba(255,255,255,.5)",margin:0}}>{weddingDate}</p>
              </div>
            </div>

            <div style={{padding:"20px"}}>
              {/* Info pernikahan */}
              <div style={{...card(),marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  {secLabel("Info Pernikahan")}
                  <button onClick={editingDetail?handleSaveDetail:()=>{
                    setDetailForm({
                      wedding_date:project.wedding_date||"",
                      venue:project.venue||"",venue_address:project.venue_address||"",
                      guest_count:project.guest_count||"",
                      budget_total:project.budget_total||"",location:project.location||"",
                    });setEditingDetail(true);}}
                    style={{fontSize:11,padding:"4px 12px",borderRadius:20,
                      background:editingDetail?G900:BG3,color:editingDetail?WHITE:G900,
                      border:`1px solid ${editingDetail?G900:BORDER2}`,cursor:"pointer",marginBottom:10}}>
                    {editingDetail?"✓ Simpan":"Edit"}
                  </button>
                </div>
                {editingDetail?(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {[
                      {key:"wedding_date",label:"Tanggal",type:"date"},
                      {key:"venue",label:"Venue"},
                      {key:"venue_address",label:"Alamat venue"},
                      {key:"guest_count",label:"Estimasi tamu"},
                      {key:"budget_total",label:"Total anggaran (Rp)"},
                      {key:"location",label:"Kota"},
                    ].map(f=>(
                      <div key={f.key}>
                        <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>{f.label}</p>
                        <input type={f.type||"text"} value={detailForm[f.key]||""}
                          onChange={e=>setDetailForm(p=>({...p,[f.key]:e.target.value}))}
                          style={inp({colorScheme:f.type==="date"?"dark":undefined})}/>
                      </div>
                    ))}
                    <button onClick={()=>setEditingDetail(false)}
                      style={{padding:"9px",fontSize:12,background:"none",
                        border:`1px solid ${BORDER2}`,borderRadius:10,cursor:"pointer",color:MUTED}}>
                      Batal
                    </button>
                  </div>
                ):(
                  <div>
                    {[
                      {label:"Tanggal",val:weddingDate},
                      {label:"Venue",val:project.venue||"—"},
                      {label:"Alamat",val:project.venue_address||"—"},
                      {label:"Estimasi tamu",val:project.guest_count||"—"},
                      {label:"Total anggaran",val:project.budget_total?fmt(project.budget_total):"—"},
                    ].map((r,i,arr)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",
                        alignItems:"flex-start",padding:"10px 0",
                        borderBottom:i<arr.length-1?`1px solid ${BORDER}`:"none"}}>
                        <span style={{fontSize:13,color:MUTED,flexShrink:0,marginRight:16}}>{r.label}</span>
                        <span style={{fontSize:13,fontWeight:500,color:WHITE,textAlign:"right"}}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Package */}
              {pkg&&(
                <div style={{...card(),marginBottom:12}}>
                  {secLabel("Paket Layanan")}
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <p style={{fontSize:14,fontWeight:600,color:WHITE,margin:0}}>{pkg.name||project.package_name}</p>
                    <p style={{fontSize:13,fontWeight:600,color:G900,margin:0}}>{pkg.price||"—"}</p>
                  </div>
                  {(pkg.includes||[]).map((item,i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:5}}>
                      <span style={{color:G900,fontSize:11,flexShrink:0}}>✓</span>
                      <span style={{fontSize:12,color:MID,lineHeight:1.5}}>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Coordinator CTA */}
              <div style={{...card({background:G500}),marginBottom:12}}>
                <p style={{fontSize:11,color:"rgba(255,255,255,.7)",margin:"0 0 4px",
                  fontWeight:600,letterSpacing:".04em"}}>WEDDING CONCIERGE</p>
                <p style={{fontSize:13,fontWeight:600,color:WHITE,margin:"0 0 2px"}}>
                  Konsultasi dengan Damargaleri
                </p>
                <p style={{fontSize:12,color:"rgba(255,255,255,.7)",margin:"0 0 12px"}}>
                  {pkg?.coordinator||"Tim"} siap mendampingi setiap langkah.
                </p>
                <a href={`https://wa.me/${pmWA.replace(/\D/g,"")}`}
                  target="_blank" rel="noreferrer"
                  style={{display:"block",padding:"11px",fontSize:13,fontWeight:600,
                    background:"rgba(255,255,255,.15)",color:WHITE,
                    borderRadius:10,textDecoration:"none",textAlign:"center",
                    border:"1px solid rgba(255,255,255,.2)"}}>
                  Chat via WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ INVOICE ══════════ */}
        {tab==="pernikahan"&&subW==="invoice"&&(
          <div style={{padding:"20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontFamily:"Lora,serif",fontSize:22,fontWeight:600,color:WHITE,
                margin:0,fontStyle:"italic"}}>Semua Invoice</h2>
              <button onClick={()=>setShowAddInv(p=>!p)}
                style={{fontSize:12,padding:"6px 14px",borderRadius:20,
                  background:showAddInv?BG3:G900,color:showAddInv?MUTED:WHITE,
                  border:"none",cursor:"pointer",fontWeight:600}}>
                {showAddInv?"Batal":"+ Tambah"}
              </button>
            </div>

            {showAddInv&&(
              <div style={{...card(),marginBottom:12}} className="fade-up">
                <p style={{fontSize:12,fontWeight:600,color:WHITE,margin:"0 0 10px"}}>Invoice Baru</p>
                <input value={newInv.label} placeholder="Nama invoice..."
                  onChange={e=>{setNewInv(p=>({...p,label:e.target.value}));setInvErr("");}}
                  style={{...inp(),marginBottom:8}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <input value={newInv.amount} placeholder="Jumlah (Rp)"
                    onChange={e=>{setNewInv(p=>({...p,amount:e.target.value}));setInvErr("");}}
                    style={inp()}/>
                  <input value={newInv.due_date} placeholder="Tgl jatuh tempo"
                    onChange={e=>setNewInv(p=>({...p,due_date:e.target.value}))} style={inp()}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <select value={newInv.status} onChange={e=>setNewInv(p=>({...p,status:e.target.value}))}
                    style={{...inp(),appearance:"none",colorScheme:"dark"}}>
                    {["belum","menunggu","lunas"].map(s=><option key={s}>{s}</option>)}
                  </select>
                  <select value={newInv.category} onChange={e=>setNewInv(p=>({...p,category:e.target.value}))}
                    style={{...inp(),appearance:"none",colorScheme:"dark"}}>
                    {["WO","Vendor","Venue","Lainnya"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <input value={newInv.doc_url} placeholder="Link PDF / Drive (opsional)"
                  onChange={e=>setNewInv(p=>({...p,doc_url:e.target.value}))}
                  style={{...inp(),marginBottom:8}}/>
                {invErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{invErr}</p>}
                <button onClick={handleAddInvoice}
                  style={{width:"100%",padding:"10px",fontSize:13,fontWeight:600,
                    background:G900,color:WHITE,border:"none",borderRadius:10,cursor:"pointer"}}>
                  Simpan invoice
                </button>
              </div>
            )}

            {["WO","Vendor","Venue","Lainnya"].map(cat=>{
              const filtered=invoices.filter(i=>i.category===cat);
              if(!filtered.length)return null;
              return(
                <div key={cat} style={{marginBottom:12}}>
                  <p style={{fontSize:10,fontWeight:700,color:MUTED,letterSpacing:".1em",
                    margin:"0 0 8px",textTransform:"uppercase"}}>{cat}</p>
                  {filtered.map(inv=>{
                    const st=STATUS_INV[inv.status]||STATUS_INV.belum;
                    const isEdit=editInvId===inv.id;
                    return(
                      <div key={inv.id} style={{...card(),marginBottom:8}}>
                        {isEdit?(
                          <div>
                            <input defaultValue={inv.label}
                              onChange={e=>setNewInv(p=>({...p,label:e.target.value}))}
                              style={{...inp(),marginBottom:8}}/>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                              <input defaultValue={inv.amount}
                                onChange={e=>setNewInv(p=>({...p,amount:e.target.value}))} style={inp()}/>
                              <input defaultValue={inv.due_date||""}
                                onChange={e=>setNewInv(p=>({...p,due_date:e.target.value}))} style={inp()}/>
                            </div>
                            <select defaultValue={inv.status}
                              onChange={e=>setNewInv(p=>({...p,status:e.target.value}))}
                              style={{...inp(),appearance:"none",colorScheme:"dark",marginBottom:8}}>
                              {["belum","menunggu","lunas"].map(s=><option key={s}>{s}</option>)}
                            </select>
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={async()=>{
                                await updateInvoice(inv.id,{
                                  label:newInv.label||inv.label,
                                  amount:newInv.amount||inv.amount,
                                  due_date:newInv.due_date||inv.due_date,
                                  status:newInv.status||inv.status,
                                });setEditInvId(null);setNewInv({label:"",amount:"",due_date:"",status:"belum",category:"WO",doc_url:""}); }}
                                style={{flex:1,padding:"8px",fontSize:12,fontWeight:600,
                                  background:G900,color:WHITE,border:"none",borderRadius:8,cursor:"pointer"}}>
                                Simpan
                              </button>
                              <button onClick={()=>setEditInvId(null)}
                                style={{padding:"8px 14px",fontSize:12,background:"none",
                                  border:`1px solid ${BORDER2}`,borderRadius:8,cursor:"pointer",color:MUTED}}>
                                Batal
                              </button>
                            </div>
                          </div>
                        ):(
                          <div>
                            <div style={{display:"flex",justifyContent:"space-between",
                              alignItems:"flex-start",marginBottom:4}}>
                              <div style={{flex:1,marginRight:8}}>
                                <p style={{fontSize:13,fontWeight:500,color:WHITE,margin:"0 0 2px"}}>{inv.label}</p>
                                <p style={{fontSize:11,color:MUTED,margin:0}}>{inv.due_date||""}</p>
                              </div>
                              <Chip label={st.label} bg={st.bg} color={st.color}/>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                              <p style={{fontSize:15,fontWeight:700,
                                color:inv.status==="lunas"?MUTED:WHITE,margin:0}}>{inv.amount}</p>
                              <div style={{display:"flex",gap:6}}>
                                {inv.doc_url&&(
                                  <a href={inv.doc_url} target="_blank" rel="noreferrer"
                                    style={{fontSize:11,color:G900,textDecoration:"none",
                                      fontWeight:500}}>📄 Dok</a>
                                )}
                                <button onClick={()=>{setEditInvId(inv.id);
                                  setNewInv({label:inv.label,amount:inv.amount,due_date:inv.due_date||"",status:inv.status,category:inv.category,doc_url:inv.doc_url||""});}}
                                  style={{fontSize:11,padding:"3px 8px",borderRadius:20,background:BG3,
                                    color:G900,border:`1px solid ${BORDER2}`,cursor:"pointer"}}>Edit</button>
                                <button onClick={()=>setConfirmDelete({type:"invoice",id:inv.id,label:inv.label})}
                                  style={{fontSize:11,padding:"3px 8px",borderRadius:20,
                                    background:CHIP_RED,color:RED,border:`1px solid #3A1818`,cursor:"pointer"}}>Hapus</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {invoices.length===0&&(
              <div style={{textAlign:"center",padding:"40px 0",color:MUTED}}>
                <p style={{fontSize:32,margin:"0 0 8px"}}>🧾</p>
                <p style={{fontSize:13}}>Belum ada invoice</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ DOKUMEN ══════════ */}
        {tab==="pernikahan"&&subW==="dokumen"&&(
          <div style={{padding:"20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontFamily:"Lora,serif",fontSize:22,fontWeight:600,color:WHITE,
                margin:0,fontStyle:"italic"}}>Dokumen & Link</h2>
              <button onClick={()=>setShowAddDoc(p=>!p)}
                style={{fontSize:12,padding:"6px 14px",borderRadius:20,
                  background:showAddDoc?BG3:G900,color:showAddDoc?MUTED:WHITE,
                  border:"none",cursor:"pointer",fontWeight:600}}>
                {showAddDoc?"Batal":"+ Tambah"}
              </button>
            </div>

            {showAddDoc&&(
              <div style={{...card(),marginBottom:12}} className="fade-up">
                <input value={newDoc.label} placeholder="Nama dokumen / link..."
                  onChange={e=>{setNewDoc(p=>({...p,label:e.target.value}));setDocErr("");}}
                  style={{...inp(),marginBottom:8}}/>
                <input value={newDoc.url} placeholder="https://drive.google.com/..."
                  onChange={e=>{setNewDoc(p=>({...p,url:e.target.value}));setDocErr("");}}
                  style={{...inp(),marginBottom:8}}/>
                <select value={newDoc.tag} onChange={e=>setNewDoc(p=>({...p,tag:e.target.value}))}
                  style={{...inp(),appearance:"none",colorScheme:"dark",marginBottom:8}}>
                  {["Foto","Dokumen","Referensi","Lainnya"].map(t=><option key={t}>{t}</option>)}
                </select>
                {docErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{docErr}</p>}
                <button onClick={handleAddDoc}
                  style={{width:"100%",padding:"10px",fontSize:13,fontWeight:600,
                    background:G900,color:WHITE,border:"none",borderRadius:10,cursor:"pointer"}}>
                  Simpan
                </button>
              </div>
            )}

            {["Foto","Dokumen","Referensi","Lainnya"].map(tag=>{
              const tagged=docs.filter(d=>d.tag===tag);
              if(!tagged.length)return null;
              return(
                <div key={tag} style={{marginBottom:16}}>
                  <p style={{fontSize:10,fontWeight:700,color:MUTED,letterSpacing:".1em",
                    margin:"0 0 8px",textTransform:"uppercase"}}>{tag}</p>
                  {tagged.map(doc=>{
                    const isEdit=editDocId===doc.id;
                    return(
                      <div key={doc.id} style={{...card(),marginBottom:8}}>
                        {isEdit?(
                          <div>
                            <input defaultValue={doc.label}
                              onChange={e=>setNewDoc(p=>({...p,label:e.target.value}))}
                              style={{...inp(),marginBottom:8}}/>
                            <input defaultValue={doc.url}
                              onChange={e=>setNewDoc(p=>({...p,url:e.target.value}))}
                              style={{...inp(),marginBottom:8}}/>
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={async()=>{
                                await updateDocument(doc.id,{label:newDoc.label||doc.label,url:newDoc.url||doc.url});
                                setEditDocId(null);setNewDoc({label:"",url:"",tag:"Dokumen"});}}
                                style={{flex:1,padding:"8px",fontSize:12,fontWeight:600,
                                  background:G900,color:WHITE,border:"none",borderRadius:8,cursor:"pointer"}}>
                                Simpan
                              </button>
                              <button onClick={()=>setEditDocId(null)}
                                style={{padding:"8px 14px",fontSize:12,background:"none",
                                  border:`1px solid ${BORDER2}`,borderRadius:8,cursor:"pointer",color:MUTED}}>
                                Batal
                              </button>
                            </div>
                          </div>
                        ):(
                          <div style={{display:"flex",alignItems:"center",gap:12}}>
                            <div style={{width:36,height:36,borderRadius:8,background:BG3,
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:18,flexShrink:0}}>
                              {doc.icon||"📄"}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{fontSize:13,fontWeight:500,color:WHITE,margin:"0 0 2px",
                                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.label}</p>
                              <a href={doc.url} target="_blank" rel="noreferrer"
                                style={{fontSize:11,color:G900,textDecoration:"none"}}>Buka link →</a>
                            </div>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>{setEditDocId(doc.id);setNewDoc({label:doc.label,url:doc.url,tag:doc.tag});}}
                                style={{fontSize:11,padding:"3px 8px",borderRadius:20,background:BG3,
                                  color:G900,border:`1px solid ${BORDER2}`,cursor:"pointer"}}>Edit</button>
                              <button onClick={()=>setConfirmDelete({type:"document",id:doc.id,label:doc.label})}
                                style={{fontSize:11,padding:"3px 8px",borderRadius:20,
                                  background:CHIP_RED,color:RED,border:`1px solid #3A1818`,cursor:"pointer"}}>×</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {docs.length===0&&!showAddDoc&&(
              <div style={{textAlign:"center",padding:"40px 0",color:MUTED}}>
                <p style={{fontSize:32,margin:"0 0 8px"}}>📁</p>
                <p style={{fontSize:13}}>Belum ada dokumen</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ VENDOR ══════════ */}
        {tab==="pernikahan"&&subW==="vendor"&&(
          <div style={{padding:"20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <h2 style={{fontFamily:"Lora,serif",fontSize:22,fontWeight:600,color:WHITE,
                  margin:"0 0 2px",fontStyle:"italic"}}>Vendor Kami</h2>
                <p style={{fontSize:12,color:MUTED,margin:0}}>
                  {vendors.filter(v=>v.status==="booking").length} vendor terkonfirmasi
                </p>
              </div>
              <button onClick={()=>setShowAddVendor(p=>!p)}
                style={{fontSize:12,padding:"6px 14px",borderRadius:20,
                  background:showAddVendor?BG3:G900,color:showAddVendor?MUTED:WHITE,
                  border:"none",cursor:"pointer",fontWeight:600}}>
                {showAddVendor?"Batal":"+ Tambah"}
              </button>
            </div>

            {/* Summary */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
              {[
                {label:"Booking",val:vendors.filter(v=>v.status==="booking").length,color:G900,bg:CHIP_GREEN},
                {label:"Negosiasi",val:vendors.filter(v=>v.status==="negosiasi").length,color:AMBER,bg:CHIP_AMBER},
                {label:"Prospek",val:vendors.filter(v=>v.status==="prospek").length,color:MUTED,bg:BG3},
              ].map((s,i)=>(
                <div key={i} style={{...card({padding:"10px 12px",textAlign:"center"})}}>
                  <p style={{fontSize:20,fontWeight:700,color:s.color,margin:"0 0 2px",fontFamily:"Lora,serif"}}>{s.val}</p>
                  <p style={{fontSize:10,color:s.color,margin:0,fontWeight:600}}>{s.label}</p>
                </div>
              ))}
            </div>

            {showAddVendor&&(
              <div style={{...card(),marginBottom:12}} className="fade-up">
                <p style={{fontSize:12,fontWeight:600,color:WHITE,margin:"0 0 10px"}}>Vendor Baru</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nama vendor</p>
                    <input value={newVendor.name} placeholder="mis. Rizkha Photography"
                      onChange={e=>setNewVendor(p=>({...p,name:e.target.value}))} style={inp()}/>
                  </div>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Kategori</p>
                    <input value={newVendor.category} placeholder="mis. Fotografer"
                      onChange={e=>setNewVendor(p=>({...p,category:e.target.value}))} style={inp()}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nomor WA</p>
                    <input value={newVendor.phone} placeholder="628xxxxxxxxx"
                      onChange={e=>setNewVendor(p=>({...p,phone:e.target.value}))} style={inp()}/>
                  </div>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Harga</p>
                    <input value={newVendor.price} placeholder="mis. Rp 8.500.000"
                      onChange={e=>setNewVendor(p=>({...p,price:e.target.value}))} style={inp()}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>PIC / Kontak</p>
                    <input value={newVendor.contact} placeholder="Nama PIC"
                      onChange={e=>setNewVendor(p=>({...p,contact:e.target.value}))} style={inp()}/>
                  </div>
                  <div>
                    <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Status</p>
                    <select value={newVendor.status}
                      onChange={e=>setNewVendor(p=>({...p,status:e.target.value}))}
                      style={{...inp(),appearance:"none",colorScheme:"dark"}}>
                      {["prospek","negosiasi","booking"].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Catatan</p>
                  <input value={newVendor.note} placeholder="Detail kesepakatan..."
                    onChange={e=>setNewVendor(p=>({...p,note:e.target.value}))} style={inp()}/>
                </div>
                {vendorErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{vendorErr}</p>}
                <button onClick={handleAddVendor}
                  style={{width:"100%",padding:"10px",fontSize:13,fontWeight:600,
                    background:G900,color:WHITE,border:"none",borderRadius:10,cursor:"pointer"}}>
                  Simpan vendor
                </button>
              </div>
            )}

            {vendors.length===0&&!showAddVendor&&(
              <div style={{textAlign:"center",padding:"40px 0",color:MUTED}}>
                <p style={{fontSize:32,margin:"0 0 8px"}}>🏪</p>
                <p style={{fontSize:13}}>Belum ada vendor. Klik "+ Tambah".</p>
              </div>
            )}

            {vendors.map(v=>{
              const st=STATUS_VENDOR[v.status]||STATUS_VENDOR.prospek;
              const isOpen=vendorOpen===v.id;
              const isEdit=editVendorId===v.id;
              return(
                <div key={v.id} style={{...card(),marginBottom:10}}>
                  {isEdit?(
                    <div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div>
                          <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nama</p>
                          <input defaultValue={v.name}
                            onChange={e=>setNewVendor(p=>({...p,name:e.target.value}))} style={inp()}/>
                        </div>
                        <div>
                          <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Harga</p>
                          <input defaultValue={v.price||""}
                            onChange={e=>setNewVendor(p=>({...p,price:e.target.value}))} style={inp()}/>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div>
                          <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>WA</p>
                          <input defaultValue={v.phone||""}
                            onChange={e=>setNewVendor(p=>({...p,phone:e.target.value}))} style={inp()}/>
                        </div>
                        <div>
                          <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Status</p>
                          <select defaultValue={v.status}
                            onChange={e=>setNewVendor(p=>({...p,status:e.target.value}))}
                            style={{...inp(),appearance:"none",colorScheme:"dark"}}>
                            {["prospek","negosiasi","booking"].map(s=><option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{marginBottom:8}}>
                        <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Catatan</p>
                        <input defaultValue={v.note||""}
                          onChange={e=>setNewVendor(p=>({...p,note:e.target.value}))} style={inp()}/>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={async()=>{
                          await updateVendor(v.id,{
                            name:newVendor.name||v.name,price:newVendor.price||v.price,
                            phone:newVendor.phone||v.phone,status:newVendor.status||v.status,
                            note:newVendor.note||v.note,
                          });setEditVendorId(null);setNewVendor({category:"",name:"",contact:"",phone:"",instagram:"",price:"",status:"prospek",note:"",icon:"🏪"});}}
                          style={{flex:1,padding:"8px",fontSize:12,fontWeight:600,
                            background:G900,color:WHITE,border:"none",borderRadius:8,cursor:"pointer"}}>
                          Simpan
                        </button>
                        <button onClick={()=>setEditVendorId(null)}
                          style={{padding:"8px 14px",fontSize:12,background:"none",
                            border:`1px solid ${BORDER2}`,borderRadius:8,cursor:"pointer",color:MUTED}}>
                          Batal
                        </button>
                      </div>
                    </div>
                  ):(
                    <div>
                      <button onClick={()=>setVendorOpen(isOpen?null:v.id)}
                        style={{width:"100%",background:"none",border:"none",cursor:"pointer",
                          padding:0,display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
                        <div style={{width:40,height:40,borderRadius:10,background:BG3,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:20,flexShrink:0}}>{v.icon||"🏪"}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                            <p style={{fontSize:13,fontWeight:600,color:WHITE,margin:0,
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.name}</p>
                            <Chip label={st.label} bg={st.bg} color={st.color}/>
                          </div>
                          <p style={{fontSize:11,color:MUTED,margin:0}}>{v.category}</p>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <p style={{fontSize:13,fontWeight:600,color:G900,margin:"0 0 1px"}}>{v.price||"—"}</p>
                          <span style={{fontSize:10,color:MUTED,display:"inline-block",
                            transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                        </div>
                      </button>
                      {isOpen&&(
                        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${BORDER}`}} className="fade-up">
                          {v.note&&(
                            <div style={{background:BG3,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                              <p style={{fontSize:11,color:MUTED,fontWeight:600,margin:"0 0 3px"}}>CATATAN</p>
                              <p style={{fontSize:12,color:MID,margin:0,lineHeight:1.6}}>{v.note}</p>
                            </div>
                          )}
                          {[
                            {label:"PIC",val:v.contact},
                            {label:"WhatsApp",val:v.phone,accent:true},
                            {label:"Instagram",val:v.instagram,accent:true},
                          ].filter(r=>r.val).map((r,i,arr)=>(
                            <div key={i} style={{display:"flex",justifyContent:"space-between",
                              padding:"8px 0",borderBottom:i<arr.length-1?`1px solid ${BORDER}`:"none"}}>
                              <span style={{fontSize:12,color:MUTED}}>{r.label}</span>
                              <span style={{fontSize:12,fontWeight:500,color:r.accent?G900:WHITE}}>{r.val}</span>
                            </div>
                          ))}
                          <div style={{display:"flex",gap:8,marginTop:12}}>
                            {v.phone&&(
                              <a href={`https://wa.me/${v.phone.replace(/\D/g,"")}`}
                                target="_blank" rel="noreferrer"
                                style={{flex:1,padding:"9px 0",fontSize:12,fontWeight:600,
                                  background:G900,color:WHITE,borderRadius:10,textDecoration:"none",
                                  textAlign:"center",display:"block"}}>
                                Hubungi {(v.contact||"vendor").split(" ")[0]}
                              </a>
                            )}
                            <button onClick={()=>{setEditVendorId(v.id);
                              setNewVendor({...v});}}
                              style={{padding:"9px 12px",fontSize:12,fontWeight:600,background:BG3,
                                color:G900,border:`1px solid ${BORDER2}`,borderRadius:10,cursor:"pointer"}}>
                              Edit
                            </button>
                            <button onClick={()=>setConfirmDelete({type:"vendor",id:v.id,label:v.name})}
                              style={{padding:"9px 12px",fontSize:12,fontWeight:600,
                                background:CHIP_RED,color:RED,border:`1px solid #3A1818`,
                                borderRadius:10,cursor:"pointer"}}>
                              Hapus
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════ INFO ══════════ */}
        {tab==="info"&&(
          <div style={{padding:"20px"}}>
            {/* Coordinator card */}
            <div style={{...card({background:G500,border:"none"}),marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <Leaf size={16} color="rgba(255,255,255,.7)"/>
                <p style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.7)",
                  margin:0,letterSpacing:".06em"}}>HUBUNGI KOORDINATOR</p>
              </div>
              <p style={{fontSize:14,fontWeight:600,color:WHITE,margin:"0 0 4px"}}>
                Tim Damargaleri Organizer
              </p>
              <p style={{fontSize:12,color:"rgba(255,255,255,.65)",margin:"0 0 14px",lineHeight:1.6}}>
                Siap membantu setiap hari 08.00–21.00 WIB
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <a href={`https://wa.me/${pmWA.replace(/\D/g,"")}`}
                  target="_blank" rel="noreferrer"
                  style={{padding:"10px 0",fontSize:12,fontWeight:600,
                    background:"rgba(255,255,255,.15)",color:WHITE,
                    border:"1px solid rgba(255,255,255,.25)",borderRadius:10,
                    textDecoration:"none",textAlign:"center"}}>
                  Chat WhatsApp
                </a>
                <a href="https://instagram.com/damargaleri.organizer"
                  target="_blank" rel="noreferrer"
                  style={{padding:"10px 0",fontSize:12,fontWeight:600,
                    background:"rgba(255,255,255,.1)",color:WHITE,
                    border:"1px solid rgba(255,255,255,.15)",borderRadius:10,
                    textDecoration:"none",textAlign:"center"}}>
                  Instagram
                </a>
              </div>
            </div>

            {/* FAQ */}
            <h2 style={{fontFamily:"Lora,serif",fontSize:20,fontWeight:600,color:WHITE,
              margin:"0 0 4px",fontStyle:"italic"}}>Pertanyaan Umum</h2>
            <p style={{fontSize:12,color:MUTED,margin:"0 0 16px"}}>
              Semua yang perlu kamu tahu tentang pernikahan & Damargaleri
            </p>
            {FAQS.map((sec,si)=>(
              <div key={si} style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <Leaf size={12} color={G900}/>
                  <p style={{fontSize:10,fontWeight:700,color:G900,margin:0,
                    letterSpacing:".08em",textTransform:"uppercase"}}>{sec.section}</p>
                </div>
                {sec.items.map((item,qi)=>{
                  const key=`${si}-${qi}`,open=faqOpen===key;
                  return(
                    <div key={qi} style={{...card(),marginBottom:6}}>
                      <button onClick={()=>setFaqOpen(open?null:key)}
                        style={{width:"100%",background:"none",border:"none",cursor:"pointer",
                          display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,
                          padding:0,textAlign:"left"}}>
                        <span style={{fontSize:13,fontWeight:500,color:WHITE,lineHeight:1.4}}>{item.q}</span>
                        <span style={{fontSize:12,color:MUTED,flexShrink:0,display:"inline-block",
                          transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                      </button>
                      {open&&(
                        <p style={{fontSize:13,color:MID,margin:"10px 0 0",
                          lineHeight:1.7,borderTop:`1px solid ${BORDER}`,paddingTop:10}} className="fade-up">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <div style={{height:16}}/>
          </div>
        )}
      </div>

      {/* DELETE MODAL */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",
          zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{...card({background:BG2}),width:"100%",maxWidth:320}} className="fade-up">
            <p style={{fontSize:16,fontWeight:600,color:WHITE,margin:"0 0 6px",fontFamily:"Lora,serif"}}>
              Hapus item ini?
            </p>
            <p style={{fontSize:13,color:MUTED,margin:"0 0 20px",lineHeight:1.5}}>
              <strong style={{color:WHITE}}>{confirmDelete.label}</strong> akan dihapus permanen.
            </p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmDelete(null)}
                style={{flex:1,padding:"11px 0",fontSize:13,background:"none",
                  border:`1px solid ${BORDER2}`,borderRadius:10,cursor:"pointer",color:MUTED}}>
                Batal
              </button>
              <button onClick={handleDelete}
                style={{flex:1,padding:"11px 0",fontSize:13,fontWeight:600,
                  background:RED,color:WHITE,border:"none",borderRadius:10,cursor:"pointer"}}>
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,
        background:"rgba(17,23,20,.92)",backdropFilter:"blur(12px)",
        borderTop:`1px solid ${BORDER}`,
        paddingBottom:"env(safe-area-inset-bottom,4px)",zIndex:50,
        display:"flex"}}>
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
              <span style={{fontSize:10,color:active?G900:MUTED,
                fontWeight:active?600:400,fontFamily:"Inter,sans-serif"}}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
