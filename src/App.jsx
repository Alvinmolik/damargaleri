import { useState, useRef, useEffect, useCallback } from "react";
import { useProject } from "./hooks/useProject.js";

/* ── DESIGN TOKENS ── */
const G900="#1B4332",G700="#2D6A4F",G500="#52B788",G300="#95D5B2",G100="#D8F3DC",G50="#F0FAF3";
const CREAM="#F4F6F2",CARD="#FFFFFF",DARK="#1C1C1E",MID="#3A3A3C",MUTED="#8A8A8E";
const BORDER="rgba(0,0,0,.07)",BORDER2="rgba(0,0,0,.1)";
const RED="#D33E3E",AMBER="#B7770D",AMBERBG="#FEF9E7";
const SHADOW="0 2px 16px rgba(0,0,0,.07)";
const SHADOW_FLOAT="0 8px 32px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08)";
const GLASS="rgba(255,255,255,.72)";
const GLASS_NAV="rgba(244,246,242,.85)";

const CHART_COLORS=["#2D6A4F","#C9A84C","#E05A5A","#5A8FD4","#B88852","#9B6BC9","#52B8A4","#C95252","#5ABF8E","#6BC96B"];

const STATUS_VENDOR={booking:{label:"Booking",bg:"#E8F5EC",color:G700},negosiasi:{label:"Negosiasi",bg:AMBERBG,color:AMBER},prospek:{label:"Prospek",bg:"#F5F5F5",color:MUTED}};
const STATUS_INV={lunas:{label:"Lunas",bg:"#E8F5EC",color:G700},menunggu:{label:"Jatuh tempo",bg:AMBERBG,color:AMBER},belum:{label:"Belum",bg:"#F5F5F5",color:MUTED}};

const FAQS=[
  {section:"Dokumen pernikahan",items:[
    {q:"Dokumen apa saja yang dibutuhkan untuk menikah di KUA?",a:"N1 (surat nikah dari kelurahan), N2 (surat persetujuan mempelai), N4 (surat izin orang tua jika di bawah 21 tahun), fotokopi KTP, KK, akta lahir, dan pas foto 2×3 serta 3×4 masing-masing 5 lembar."},
    {q:"Berapa lama proses pendaftaran nikah?",a:"Untuk menikah di KUA, pendaftaran dilakukan minimal 10 hari kerja sebelum tanggal akad. Untuk gereja atau catatan sipil, biasanya 2–4 minggu sebelumnya."},
    {q:"Apakah foto prewed wajib dilakukan sebelum hari H?",a:"Tidak wajib, tapi sangat disarankan untuk keperluan dekorasi backdrop, undangan digital, dan dokumentasi kenangan. Idealnya 3–6 bulan sebelum hari H."},
  ]},
  {section:"Persiapan hari H",items:[
    {q:"Jam berapa sebaiknya pasangan tiba di venue?",a:"Untuk akad pagi hari, pasangan sebaiknya sudah siap minimal 2 jam sebelumnya. Tim makeup biasanya mulai bekerja 3–4 jam sebelum akad."},
    {q:"Apa yang harus kami siapkan H-1?",a:"Pastikan seluruh pakaian, aksesori, dan dokumen sudah dikumpulkan. Lakukan briefing singkat dengan orang tua dan saksi. Tim Damargaleri akan menghubungi Anda untuk konfirmasi final."},
    {q:"Bagaimana jika ada vendor yang tiba-tiba membatalkan?",a:"Semua vendor rekanan sudah terikat kontrak dengan klausul pembatalan. Tim kami sudah memiliki daftar backup vendor yang bisa diaktifkan dalam 24 jam."},
  ]},
  {section:"Layanan Damargaleri",items:[
    {q:"Apa perbedaan paket Essential dan Full Service Premium?",a:"Paket Essential: koordinasi hari H 8 jam, 3 asisten, tanpa vendor hunting. Full Service Premium: koordinasi H-12 bulan, vendor hunting, meeting tidak terbatas, dekorasi, MC, dokumentasi, 5 asisten hari H."},
    {q:"Apakah bisa request vendor di luar rekanan Damargaleri?",a:"Tentu bisa. Tim kami akan tetap mengkoordinasikan semua vendor pilihan Anda."},
    {q:"Bagaimana cara komunikasi dengan koordinator?",a:"Via WhatsApp setiap hari pukul 08.00–21.00 WIB. Target respons WA adalah 15 menit."},
  ]},
];

/* ── HELPERS ── */
const fmt=n=>"Rp "+Number(n||0).toLocaleString("id-ID");
const inp=(ex={})=>({width:"100%",padding:"11px 14px",fontSize:13,border:`1.5px solid ${BORDER2}`,borderRadius:12,outline:"none",color:DARK,background:CARD,fontFamily:"Inter,sans-serif",boxSizing:"border-box",...ex});
const card=(ex={})=>({background:CARD,borderRadius:18,boxShadow:SHADOW,padding:"16px",...ex});
const chip=(bg,color)=>({fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:20,background:bg,color,display:"inline-block"});

function Leaf({size=16,color=G700}){
  return(<svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2C8 2 3 4.5 3 9C3 11.76 5.24 14 8 14C10.76 14 13 11.76 13 9C13 4.5 8 2 8 2Z" fill={color} fillOpacity=".15" stroke={color} strokeWidth="1" strokeLinejoin="round"/>
    <path d="M8 14V8M8 8C8 8 6 7 5 5.5M8 8C8 8 10 7 11 5.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
  </svg>);
}

function Ring({pct}){
  const r=34,c=2*Math.PI*r;
  return(<svg width="84" height="84" viewBox="0 0 84 84">
    <circle cx="42" cy="42" r={r} fill="none" stroke="#EEF1EC" strokeWidth="6"/>
    <circle cx="42" cy="42" r={r} fill="none" stroke={G700} strokeWidth="6"
      strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"
      transform="rotate(-90 42 42)" style={{transition:"stroke-dasharray .8s cubic-bezier(.4,0,.2,1)"}}/>
    <text x="42" y="38" textAnchor="middle" fontSize="16" fontWeight="700" fill={G900} fontFamily="Lora,serif">{pct}%</text>
    <text x="42" y="52" textAnchor="middle" fontSize="9" fill={MUTED} fontFamily="Inter,sans-serif">selesai</text>
  </svg>);
}

function DonutChart({data}){
  const total=data.reduce((s,d)=>s+d.value,0);
  if(!total) return <p style={{fontSize:12,color:MUTED,textAlign:"center",padding:"16px 0"}}>Isi anggaran kategori untuk melihat grafik</p>;
  const r=48,cx=64,cy=64;
  let ang=-Math.PI/2;
  const segs=data.filter(d=>d.value>0).map((d,i)=>{
    const a=(d.value/total)*2*Math.PI;
    const x1=cx+r*Math.cos(ang),y1=cy+r*Math.sin(ang);
    ang+=a;
    const x2=cx+r*Math.cos(ang),y2=cy+r*Math.sin(ang);
    return{...d,x1,y1,x2,y2,large:a>Math.PI?1:0,pct:Math.round((d.value/total)*100),color:CHART_COLORS[i%CHART_COLORS.length]};
  });
  return(
    <div style={{display:"flex",gap:16,alignItems:"center"}}>
      <svg width="128" height="128" viewBox="0 0 128 128" style={{flexShrink:0}}>
        {segs.map((s,i)=>(
          <path key={i} d={`M${cx},${cy} L${s.x1},${s.y1} A${r},${r} 0 ${s.large},1 ${s.x2},${s.y2}Z`}
            fill={s.color} opacity=".9"/>
        ))}
        <circle cx={cx} cy={cy} r={r-18} fill={CARD}/>
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="9" fill={MUTED} fontFamily="Inter,sans-serif">Total</text>
        <text x={cx} y={cy+9} textAnchor="middle" fontSize="8" fontWeight="700" fill={G900} fontFamily="Inter,sans-serif">{fmt(total)}</text>
      </svg>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
        {segs.slice(0,7).map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
            <span style={{fontSize:10,color:MUTED,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</span>
            <span style={{fontSize:10,fontWeight:600,color:DARK}}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingScreen(){
  return(<div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:CREAM,gap:12}}>
    <Leaf size={28} color={G700}/>
    <span style={{fontFamily:"Dancing Script,cursive",fontSize:26,color:G900}}>Damargaleri</span>
    <span style={{fontSize:11,color:MUTED}}>Memuat pernikahan Anda...</span>
  </div>);
}
function ErrorScreen({message}){
  return(<div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:CREAM,gap:12,padding:24,textAlign:"center"}}>
    <Leaf size={28} color={MUTED}/>
    <span style={{fontFamily:"Dancing Script,cursive",fontSize:26,color:G900}}>Damargaleri</span>
    <span style={{fontSize:13,color:MUTED,lineHeight:1.6}}>{message}</span>
  </div>);
}

/* ══════════════════════════════════════
   MAIN APP
══════════════════════════════════════ */
export default function App({slug,readOnly=false}){
  const pageSlug=slug||window.location.pathname.replace(/^\//,"").split("/")[0];
  const {project,loading,error,updateProject,toggleTask,addTask,updateTask,deleteTask,updateBudgetCategory,addBudgetCategory,deleteBudgetCategory,addInvoice,updateInvoice,deleteInvoice,addDocument,updateDocument,deleteDocument,addVendor,updateVendor,deleteVendor,updateCoverImage}=useProject(pageSlug,readOnly);

  const [tab,setTab]=useState("home");
  const [subP,setSubP]=useState("checklist");
  const [checklistModule,setChecklistModule]=useState("timeline");
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
  const [editInvData,setEditInvData]=useState({});
  const [editBudget,setEditBudget]=useState(null);
  const [budgetInput,setBudgetInput]=useState({cat:"",alloc:"",spent:""});
  const [budgetErr,setBudgetErr]=useState("");
  const [vendorOpen,setVendorOpen]=useState(null);
  const [showAddVendor,setShowAddVendor]=useState(false);
  const [newVendor,setNewVendor]=useState({category:"",budget_category_id:"",name:"",contact:"",phone:"",instagram:"",contract_amount:"",paid_amount:"",status:"prospek",note:"",icon:"🏪"});
  const [vendorErr,setVendorErr]=useState("");
  const [editVendorId,setEditVendorId]=useState(null);
  const [editVendorData,setEditVendorData]=useState({});
  const [editDocData,setEditDocData]=useState({});
  const [editingDetail,setEditingDetail]=useState(false);
  const [detailForm,setDetailForm]=useState({});
  const [coverPos,setCoverPos]=useState(30);
  const [editingCover,setEditingCover]=useState(false);
  const [countdown,setCountdown]=useState({d:0,h:0,m:0,s:0});
  const [confirmDelete,setConfirmDelete]=useState(null);
  // Optimistic UI for checklist
  const [localDone,setLocalDone]=useState({});
  const coverRef=useRef();

  useEffect(()=>{
    if(!project)return;
    const title=`${project.bride_name} & ${project.groom_name} — Damargaleri`;
    const desc=`Wedding planner digital untuk pernikahan ${project.bride_name} & ${project.groom_name}. Dikelola oleh Damargaleri Organizer.`;
    document.title=title;
    const m=(p,v,a="name")=>{let el=document.querySelector(`meta[${a}="${p}"]`);if(!el){el=document.createElement("meta");el.setAttribute(a,p);document.head.appendChild(el);}el.setAttribute("content",v);};
    m("description",desc);m("og:title",title,"property");m("og:description",desc,"property");
    m("og:image",project.cover_image_url||`${window.location.origin}/cover-default.jpg`,"property");
  },[project]);

  useEffect(()=>{
    if(!project?.wedding_date)return;
    const d=new Date(project.wedding_date+"T10:00:00");
    const tick=()=>{const diff=d-new Date();if(diff<=0){setCountdown({d:0,h:0,m:0,s:0});return;}setCountdown({d:Math.floor(diff/86400000),h:Math.floor((diff%86400000)/3600000),m:Math.floor((diff%3600000)/60000),s:Math.floor((diff%60000)/1000)});};
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[project?.wedding_date]);

  useEffect(()=>{
    const first=(project?.checklist_phases||[])
      .filter(phase=>(phase.module||"timeline")===checklistModule)
      .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))[0];
    setExp(first?.id||null);
  },[project?.id,checklistModule]);

  if(loading)return <LoadingScreen/>;
  if(error||!project)return <ErrorScreen message="Project tidak ditemukan atau kamu tidak punya akses."/>;

  const phases=[...(project.checklist_phases||[])]
    .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const filteredPhases=phases.filter(
    phase=>(phase.module||"timeline")===checklistModule
  );
  const budget=project.budget_categories||[];
  const vendors=project.vendors||[];
  const invoices=project.invoices||[];
  const docs=project.documents||[];
  const pkg=project.packages;
  const coverImg=project.cover_image_url||"/cover-default.jpg";
  const coupleNames=`${project.bride_name} & ${project.groom_name}`;
  const weddingDate=project.wedding_date?new Date(project.wedding_date).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"Tanggal belum diset";
  const pmWA=project.profiles?.wa_number||pkg?.wa_number||"6288213767999";

  // Merge server state with optimistic local state
  const allTasks=phases.flatMap(p=>(p.checklist_tasks||[]).map(t=>({...t,done:localDone[t.id]!==undefined?localDone[t.id]:t.done})));
  const doneCount=allTasks.filter(t=>t.done).length;
  const pct=allTasks.length?Math.round((doneCount/allTasks.length)*100):0;
  const vendorCommitted=vendors.filter(v=>v.status==="booking").reduce((s,v)=>s+Number(v.contract_amount||0),0);
  const vendorPaid=vendors.reduce((s,v)=>s+Number(v.paid_amount||0),0);
  const manualSpent=budget.reduce((s,b)=>s+Number(b.spent||0),0);
  const totalSpent=manualSpent+vendorPaid;
  const budgetTotal=Number(project.budget_total)||budget.reduce((s,b)=>s+Number(b.allocated||0),0)||1;
  const budgetPct=Math.round((totalSpent/budgetTotal)*100);

  // Optimistic toggle — instant UI update, then sync to server
  async function handleToggleTask(tid,currentDone){
    const newDone=!currentDone;
    setLocalDone(p=>({...p,[tid]:newDone}));
    await toggleTask(tid,newDone);
    // Clear optimistic after server confirms
    setLocalDone(p=>{const n={...p};delete n[tid];return n;});
  }

  async function handleAddTask(pid){
    if(!newTask.text.trim()){setTaskErr("Tulis nama tugas dulu.");return;}
    await addTask(pid,newTask);
    setNewTask({text:"",pic:"",loc:"",due_date:""});setTaskErr("");setAddTo(null);
  }

  async function handleEditTask(task){
    const text=window.prompt("Nama tugas",task.text);
    if(text===null||!text.trim())return;
    const pic=window.prompt("PIC / penanggung jawab",task.pic||"Pasangan");
    if(pic===null)return;
    const loc=window.prompt("Lokasi",task.location||"—");
    if(loc===null)return;
    const dueDate=window.prompt("Tanggal target (YYYY-MM-DD, boleh kosong)",task.due_date||"");
    if(dueDate===null)return;
    const {error}=await updateTask(task.id,{
      text:text.trim(),pic:pic.trim(),loc:loc.trim(),due_date:dueDate.trim(),
      details:task.details||"",
    });
    if(error)window.alert("Gagal mengubah tugas: "+error.message);
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
    setNewInv({label:"",amount:"",due_date:"",status:"belum",category:"WO",doc_url:""});setInvErr("");setShowAddInv(false);
  }
  async function handleSaveInvoice(id){
    await updateInvoice(id,editInvData);setEditInvId(null);setEditInvData({});
  }
  async function handleAddDoc(){
    if(!newDoc.label.trim()){setDocErr("Nama wajib diisi.");return;}
    if(!newDoc.url.trim()){setDocErr("Link wajib diisi.");return;}
    const icons={Foto:"📷",Dokumen:"📄",Referensi:"🎨",Lainnya:"🔗"};
    await addDocument({...newDoc,icon:icons[newDoc.tag]||"🔗"});
    setNewDoc({label:"",url:"",tag:"Dokumen"});setDocErr("");setShowAddDoc(false);
  }
  async function handleSaveDoc(id){
    await updateDocument(id,editDocData);setEditDocId(null);setEditDocData({});
  }
  async function handleAddVendor(){
    if(!newVendor.name.trim()){setVendorErr("Nama vendor wajib diisi.");return;}
    if(!newVendor.category.trim()){setVendorErr("Kategori wajib diisi.");return;}
    const contractAmount=parseInt(String(newVendor.contract_amount).replace(/\D/g,""))||0;
    const paidAmount=parseInt(String(newVendor.paid_amount).replace(/\D/g,""))||0;
    if(paidAmount>contractAmount){setVendorErr("Jumlah dibayar tidak boleh melebihi nilai kontrak.");return;}
    const {error}=await addVendor({...newVendor,contract_amount:contractAmount,paid_amount:paidAmount,budget_category_id:newVendor.budget_category_id||null});
    if(error){setVendorErr(error.message);return;}
    setNewVendor({category:"",budget_category_id:"",name:"",contact:"",phone:"",instagram:"",contract_amount:"",paid_amount:"",status:"prospek",note:"",icon:"🏪"});setVendorErr("");setShowAddVendor(false);
  }
  async function handleSaveVendor(id){
    const payload={...editVendorData};
    payload.contract_amount=parseInt(String(payload.contract_amount??0).replace(/\D/g,""))||0;
    payload.paid_amount=parseInt(String(payload.paid_amount??0).replace(/\D/g,""))||0;
    payload.budget_category_id=payload.budget_category_id||null;
    if(payload.paid_amount>payload.contract_amount){setVendorErr("Jumlah dibayar tidak boleh melebihi nilai kontrak.");return;}
    const {error}=await updateVendor(id,payload);
    if(error){setVendorErr(error.message);return;}
    setVendorErr("");setEditVendorId(null);setEditVendorData({});
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

  const SLabel=({t})=><p style={{fontSize:10,fontWeight:700,color:MUTED,letterSpacing:".1em",textTransform:"uppercase",margin:"0 0 10px"}}>{t}</p>;

  const TABS=[
    {id:"home",label:"Beranda",d:"M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-7h6v7"},
    {id:"persiapan",label:"Persiapan",d:"M9 11l2 2 4-4M6 3h12a2 2 0 0 1 2 2v16H4V5a2 2 0 0 1 2-2z"},
    {id:"pernikahan",label:"Pernikahan",d:"M7.5 12.5 12 17l4.5-4.5a3.2 3.2 0 0 0-4.5-4.5 3.2 3.2 0 0 0-4.5 4.5zM9.5 5.5 12 2l2.5 3.5"},
    {id:"info",label:"Info",d:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 10v7M12 7h.01"},
  ];

  return(
    <div style={{width:"100%",maxWidth:430,margin:"0 auto",minHeight:"100vh",background:CREAM,display:"flex",flexDirection:"column",fontFamily:"Inter,sans-serif",color:DARK}}>

      {/* TOP BAR — glass */}
      <div style={{position:"sticky",top:0,zIndex:50,background:GLASS_NAV,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",padding:"13px 20px 11px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${BORDER}`}}>
        <Leaf size={18} color={G700}/>
        <span style={{fontFamily:"Dancing Script,cursive",fontSize:21,color:G900}}>Damargaleri</span>
        <div style={{width:18}}/>
      </div>

      {readOnly&&(
        <div style={{background:"#FFF7E6",color:"#8A5A00",fontSize:11,fontWeight:600,textAlign:"center",padding:"8px 14px",borderBottom:"1px solid #F1D7A5"}}>
          Mode demo · perubahan tidak disimpan
        </div>
      )}

      <div style={{flex:1,paddingBottom:90}}>

        {/* ══ HOME ══ */}
        {tab==="home"&&(
          <div>
            {/* Cover hero */}
            <div style={{position:"relative",height:380,overflow:"hidden",background:G900}}>
              <img src={coverImg} alt="Cover"
                style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`center ${coverPos}%`,transition:"object-position .2s"}}
                onError={e=>{e.target.src="/cover-default.jpg"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.04) 0%,rgba(27,67,50,.92) 100%)"}}/>
              {editingCover?(
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.55)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:"0 28px"}}>
                  <p style={{fontSize:12,color:"#fff",fontWeight:500}}>↕ Geser untuk atur posisi foto</p>
                  <input type="range" min="0" max="100" value={coverPos} onChange={e=>setCoverPos(Number(e.target.value))} style={{width:"100%",accentColor:G500}}/>
                  <div style={{display:"flex",gap:10}}>
                    <button onPointerDown={e=>{e.stopPropagation();setEditingCover(false);}} style={{padding:"8px 20px",fontSize:12,fontWeight:600,background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,cursor:"pointer"}}>Batal</button>
                    <button onPointerDown={e=>{e.stopPropagation();setEditingCover(false);}} style={{padding:"8px 20px",fontSize:12,fontWeight:600,background:G500,color:"#fff",border:"none",borderRadius:20,cursor:"pointer"}}>✓ Simpan</button>
                  </div>
                </div>
              ):(
                <div style={{position:"absolute",top:12,right:12,display:"flex",gap:6}}>
                  <button onClick={()=>setEditingCover(true)} style={{padding:"5px 10px",fontSize:10,fontWeight:600,background:"rgba(0,0,0,.35)",color:"#fff",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.2)",borderRadius:20,cursor:"pointer"}}>Atur posisi</button>
                  <button onClick={()=>coverRef.current.click()} style={{padding:"5px 10px",fontSize:10,fontWeight:600,background:"rgba(0,0,0,.35)",color:"#fff",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.2)",borderRadius:20,cursor:"pointer"}}>Ganti foto</button>
                </div>
              )}
              <input ref={coverRef} type="file" accept="image/*" onChange={handleCover} style={{display:"none"}}/>
              {!editingCover&&(
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 24px 24px"}}>
                  <p style={{fontSize:10,color:"rgba(255,255,255,.5)",letterSpacing:".14em",textTransform:"uppercase",margin:"0 0 4px"}}>The Wedding Celebration Of</p>
                  <h1 style={{fontFamily:"Lora,serif",fontSize:30,fontWeight:600,fontStyle:"italic",color:"#fff",margin:"0 0 3px",lineHeight:1.2}}>{coupleNames}</h1>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.6)",margin:"0 0 14px"}}>📅 {weddingDate}{project.location?` · ${project.location}`:""}</p>
                  {/* Countdown glass card */}
                  <div style={{background:"rgba(255,255,255,.12)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:16,padding:"12px 16px",border:"1px solid rgba(255,255,255,.15)",display:"flex",justifyContent:"space-around"}}>
                    {[["Hari",countdown.d],["Jam",countdown.h],["Menit",countdown.m],["Detik",countdown.s]].map(([l,v])=>(
                      <div key={l} style={{textAlign:"center"}}>
                        <p style={{fontFamily:"Lora,serif",fontSize:26,fontWeight:700,color:"#fff",margin:"0 0 1px",lineHeight:1}}>{String(v).padStart(2,"0")}</p>
                        <p style={{fontSize:9,color:"rgba(255,255,255,.5)",margin:0,letterSpacing:".08em",textTransform:"uppercase"}}>{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{padding:"20px 16px 0",display:"flex",flexDirection:"column",gap:12}}>
              {/* Progress */}
              <div style={{...card(),display:"flex",alignItems:"center",gap:16}}>
                <Ring pct={pct}/>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,color:MUTED,margin:"0 0 3px"}}>Tugas Terselesaikan</p>
                  <p style={{fontSize:22,fontWeight:700,color:G900,margin:"0 0 8px",fontFamily:"Lora,serif"}}>{doneCount} <span style={{fontSize:14,color:MUTED,fontWeight:400}}>/ {allTasks.length}</span></p>
                  <span style={{...chip(G50,G700),border:`1px solid ${G100}`}}>{countdown.d} hari lagi</span>
                </div>
              </div>

              {/* Budget */}
              <div style={card()}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <p style={{fontSize:13,fontWeight:600,color:DARK,margin:0}}>Realisasi Anggaran</p>
                  <span style={{fontSize:12,fontWeight:600,color:budgetPct>90?RED:budgetPct>70?AMBER:G700}}>{budgetPct}% Terpakai</span>
                </div>
                <div style={{height:6,borderRadius:3,background:"#EEF1EC",overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",width:`${Math.min(budgetPct,100)}%`,background:budgetPct>90?RED:budgetPct>70?AMBER:G700,borderRadius:3,transition:"width .8s cubic-bezier(.4,0,.2,1)"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div><p style={{fontSize:10,color:MUTED,margin:"0 0 1px"}}>Terpakai</p><p style={{fontSize:12,fontWeight:600,color:DARK,margin:0}}>{fmt(totalSpent)}</p></div>
                  <div style={{textAlign:"right"}}><p style={{fontSize:10,color:MUTED,margin:"0 0 1px"}}>Sisa</p><p style={{fontSize:12,fontWeight:600,color:budgetTotal-totalSpent<0?RED:G700,margin:0}}>{fmt(budgetTotal-totalSpent)}</p></div>
                </div>
              </div>

              {/* Info grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  {icon:"📅",label:"Tanggal Acara",val:project.wedding_date?new Date(project.wedding_date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"—"},
                  {icon:"📍",label:"Lokasi Venue",val:project.venue||"—"},
                  {icon:"👥",label:"Target Undangan",val:project.guest_count||"—"},
                  {icon:"💰",label:"Total Anggaran",val:project.budget_total?fmt(project.budget_total):"—"},
                ].map((c,i)=>(
                  <div key={i} style={{...card({padding:"13px 14px"})}}>
                    <p style={{fontSize:20,margin:"0 0 6px"}}>{c.icon}</p>
                    <p style={{fontSize:10,color:MUTED,margin:"0 0 2px"}}>{c.label}</p>
                    <p style={{fontSize:12,fontWeight:600,color:DARK,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.val}</p>
                  </div>
                ))}
              </div>

              {/* Next tasks */}
              <div style={card()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <p style={{fontSize:14,fontWeight:600,color:DARK,margin:0,fontFamily:"Lora,serif",fontStyle:"italic"}}>Tugas Selanjutnya</p>
                  <button onClick={()=>{setTab("persiapan");setSubP("checklist");}} style={{fontSize:11,color:G700,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Lihat Semua →</button>
                </div>
                {allTasks.filter(t=>!t.done).slice(0,5).map((t,i,arr)=>(
                  <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${BORDER}`:"none"}}>
                    <div onClick={()=>handleToggleTask(t.id,t.done)}
                      style={{width:20,height:20,borderRadius:"50%",flexShrink:0,marginTop:1,border:`1.5px solid ${G300}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:13,color:MID,margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text}</p>
                      <div style={{display:"flex",gap:6}}>
                        <span style={{fontSize:10,color:MUTED}}>👤 {t.pic||"Pasangan"}</span>
                        {t.due_date&&<span style={{fontSize:10,color:AMBER}}>📅 {new Date(t.due_date).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {allTasks.filter(t=>!t.done).length===0&&<p style={{fontSize:13,color:G700,textAlign:"center",padding:"12px 0"}}>🎉 Semua tugas sudah selesai!</p>}
              </div>
            </div>
            <div style={{height:16}}/>
          </div>
        )}

        {/* ══ PERSIAPAN sub-tabs ══ */}
        {tab==="persiapan"&&(
          <div style={{position:"sticky",top:48,zIndex:40,background:GLASS_NAV,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",display:"flex",borderBottom:`1px solid ${BORDER}`}}>
            {[["checklist","✅","Checklist"],["budget","💰","Budget"]].map(([id,ico,lbl])=>(
              <button key={id} onClick={()=>setSubP(id)}
                style={{flex:1,padding:"12px 0",fontSize:13,fontWeight:500,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:subP===id?G900:MUTED,borderBottom:subP===id?`2px solid ${G900}`:"2px solid transparent",fontFamily:"Inter,sans-serif",transition:"color .15s"}}>
                <span style={{fontSize:15}}>{ico}</span>{lbl}
              </button>
            ))}
          </div>
        )}

        {/* ══ CHECKLIST ══ */}
        {tab==="persiapan"&&subP==="checklist"&&(
          <div style={{padding:"16px 16px 0"}}>
            <div style={{...card(),marginBottom:12}}>
              <p style={{fontSize:11,fontWeight:700,color:MUTED,letterSpacing:".08em",margin:"0 0 6px",textTransform:"uppercase"}}>Status Kemajuan</p>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:26,fontWeight:700,color:G900,fontFamily:"Lora,serif"}}>{doneCount}</span>
                <span style={{fontSize:13,color:MUTED}}>/ {allTasks.length} Tugas</span>
                <span style={{...chip(G50,G700),border:`1px solid ${G100}`,marginLeft:"auto"}}>{pct}%</span>
              </div>
              <div style={{height:4,borderRadius:2,background:"#EEF1EC",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:G700,borderRadius:2,transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:12}}>
              {[
                ["timeline","🗓️","Timeline"],
                ["keperluan","📦","Keperluan"],
                ["kua","📄","KUA"],
              ].map(([id,icon,label])=>(
                <button key={id} onClick={()=>setChecklistModule(id)} style={{
                  padding:"9px 6px",fontSize:11,fontWeight:600,borderRadius:10,
                  border:`1px solid ${checklistModule===id?G700:BORDER}`,
                  color:checklistModule===id?"#fff":G700,
                  background:checklistModule===id?G700:CARD,cursor:"pointer",
                }}>{icon} {label}</button>
              ))}
            </div>

            {filteredPhases.map((phase,phaseIdx)=>{
              const phaseTasks=[...(phase.checklist_tasks||[])]
                .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
                .map(t=>({...t,done:localDone[t.id]!==undefined?localDone[t.id]:t.done}));
              const isOpen=expanded===phase.id;
              const done=phaseTasks.filter(t=>t.done).length;
              const allDone=done===phaseTasks.length&&phaseTasks.length>0;
              return(
                <div key={phase.id} style={{marginBottom:10}}>
                  <button onClick={()=>setExp(isOpen?null:phase.id)}
                    style={{...card({padding:"14px 16px"}),width:"100%",border:`1.5px solid ${isOpen?G100:BORDER}`,cursor:"pointer",textAlign:"left",transition:"all .2s",boxShadow:isOpen?`0 4px 20px rgba(45,106,79,.1)`:SHADOW}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:26,height:26,borderRadius:"50%",background:allDone?G700:"#EEF1EC",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:allDone?"#fff":MUTED,transition:"all .3s"}}>{allDone?"✓":(phaseIdx+1)}</div>
                        <span style={{fontSize:14,fontWeight:600,color:allDone?MUTED:DARK}}>{phase.label}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{...chip(allDone?G50:"#F5F5F5",allDone?G700:MUTED),border:`1px solid ${allDone?G100:BORDER}`}}>{done}/{phaseTasks.length}{allDone?" ✓":""}</span>
                        <span style={{fontSize:10,color:MUTED,display:"inline-block",transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                      </div>
                    </div>
                    <div style={{height:3,borderRadius:2,background:"#EEF1EC",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${phaseTasks.length?Math.round((done/phaseTasks.length)*100):0}%`,background:allDone?G500:G700,borderRadius:2,transition:"width .4s cubic-bezier(.4,0,.2,1)"}}/>
                    </div>
                  </button>

                  {isOpen&&(
                    <div style={{...card({padding:0,borderRadius:"0 0 16px 16px",overflow:"hidden"}),border:`1.5px solid ${G100}`,borderTop:"none",marginTop:-6}} className="fade-up">
                      {phaseTasks.map((task,ti)=>{
                        const isDone=task.done;
                        return(
                          <div key={task.id} className={isDone?"row-done":""}
                            style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 16px",borderBottom:ti<phaseTasks.length-1?`1px solid ${BORDER}`:"none",background:isDone?"rgba(45,106,79,.03)":"transparent",transition:"background .4s"}}>
                            <div onClick={()=>handleToggleTask(task.id,isDone)}
                              className={isDone?"check-ring":""}
                              style={{width:22,height:22,borderRadius:"50%",flexShrink:0,marginTop:1,background:isDone?G700:"transparent",border:isDone?"none":`1.5px solid #C8D4C0`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"background .25s, border .25s, box-shadow .3s",boxShadow:isDone?`0 0 0 4px rgba(45,106,79,.1)`:"none"}}>
                              {isDone&&<svg width="11" height="9" viewBox="0 0 11 9" fill="none" className="check-icon"><path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <div style={{flex:1}}>
                              <p className={isDone?"task-strike":""}
                                style={{fontSize:13,color:isDone?MUTED:MID,margin:"0 0 5px",lineHeight:1.4,transition:"color .3s"}}>{task.text}</p>
                              {task.details&&<p style={{fontSize:11,color:MUTED,margin:"0 0 6px",lineHeight:1.45}}>{task.details}</p>}
                              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:10,color:G700,background:G50,padding:"2px 7px",borderRadius:20,border:`0.5px solid ${G100}`}}>👤 {task.pic||"Pasangan"}</span>
                                <span style={{fontSize:10,color:MUTED,background:"#F5F5F5",padding:"2px 7px",borderRadius:20}}>📍 {task.location||"—"}</span>
                                {task.due_date&&<span style={{fontSize:10,color:AMBER,background:AMBERBG,padding:"2px 7px",borderRadius:20}}>📅 {new Date(task.due_date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</span>}
                              </div>
                            </div>
                            {!readOnly&&<div style={{display:"flex",gap:2,flexShrink:0}}>
                              <button onClick={e=>{e.stopPropagation();handleEditTask(task);}} style={{padding:"2px 5px",background:"none",border:"none",cursor:"pointer",color:G700,fontSize:13,opacity:.65}}>✎</button>
                              <button onClick={e=>{e.stopPropagation();setConfirmDelete({type:"task",id:task.id,label:task.text});}} style={{padding:"2px 5px",background:"none",border:"none",cursor:"pointer",color:MUTED,fontSize:16,opacity:.4}}>×</button>
                            </div>}
                          </div>
                        );
                      })}
                      {!readOnly&&(addingTo===phase.id?(
                        <div style={{padding:"12px 16px"}}>
                          <input value={newTask.text} placeholder="Nama tugas..." autoFocus onChange={e=>{setNewTask(p=>({...p,text:e.target.value}));setTaskErr("");}} onKeyDown={e=>e.key==="Enter"&&handleAddTask(phase.id)} style={{...inp(),marginBottom:8,borderColor:taskErr?RED:BORDER2}}/>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                            <input value={newTask.pic} placeholder="PIC" onChange={e=>setNewTask(p=>({...p,pic:e.target.value}))} style={inp()}/>
                            <input value={newTask.loc} placeholder="Lokasi" onChange={e=>setNewTask(p=>({...p,loc:e.target.value}))} style={inp()}/>
                          </div>
                          <p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Tanggal target (opsional)</p>
                          <input type="date" value={newTask.due_date} onChange={e=>setNewTask(p=>({...p,due_date:e.target.value}))} style={{...inp(),marginBottom:8}}/>
                          {taskErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{taskErr}</p>}
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>handleAddTask(phase.id)} style={{flex:1,padding:"9px",fontSize:13,fontWeight:600,background:G900,color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>Tambah</button>
                            <button onClick={()=>{setAddTo(null);setNewTask({text:"",pic:"",loc:"",due_date:""}); }} style={{padding:"9px 16px",fontSize:13,background:"none",border:`1.5px solid ${BORDER2}`,borderRadius:10,cursor:"pointer",color:MUTED}}>Batal</button>
                          </div>
                        </div>
                      ):(
                        <button onClick={()=>{setAddTo(phase.id);setNewTask({text:"",pic:"",loc:"",due_date:""}); }} style={{display:"flex",alignItems:"center",gap:6,padding:"12px 16px",background:"none",border:"none",cursor:"pointer",color:G700,fontSize:13,width:"100%"}}>
                          <span style={{fontSize:18}}>+</span> Tambah Sub-tugas di {phase.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{height:16}}/>
          </div>
        )}

        {/* ══ BUDGET ══ */}
        {tab==="persiapan"&&subP==="budget"&&(
          <div style={{padding:"16px 16px 0"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[{label:"Total Anggaran",val:fmt(budgetTotal)},{label:"Sudah Dibayar",val:fmt(totalSpent),accent:true},{label:"Sisa Kas",val:fmt(budgetTotal-totalSpent),neg:budgetTotal-totalSpent<0}].map((c,i)=>(
                <div key={i} style={{...card({padding:"10px 12px"})}}>
                  <p style={{fontSize:9,color:MUTED,margin:"0 0 3px",textTransform:"uppercase",letterSpacing:".05em"}}>{c.label}</p>
                  <p style={{fontSize:11,fontWeight:700,color:c.neg?RED:c.accent?G700:DARK,margin:0,lineHeight:1.2}}>{c.val}</p>
                </div>
              ))}
            </div>
            <div style={{height:6,borderRadius:3,background:"#EEF1EC",overflow:"hidden",marginBottom:4}}>
              <div style={{height:"100%",width:`${Math.min(budgetPct,100)}%`,background:budgetPct>90?RED:budgetPct>70?AMBER:G700,borderRadius:3,transition:"width .8s"}}/>
            </div>
            <p style={{fontSize:10,color:MUTED,textAlign:"right",margin:"0 0 12px"}}>{budgetPct}% terpakai</p>

            <div style={{...card({padding:"12px 14px"}),marginBottom:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><p style={{fontSize:9,color:MUTED,margin:"0 0 3px",textTransform:"uppercase"}}>Kontrak vendor booking</p><p style={{fontSize:13,fontWeight:700,color:DARK,margin:0}}>{fmt(vendorCommitted)}</p></div>
              <div><p style={{fontSize:9,color:MUTED,margin:"0 0 3px",textTransform:"uppercase"}}>Pembayaran vendor</p><p style={{fontSize:13,fontWeight:700,color:G700,margin:0}}>{fmt(vendorPaid)}</p></div>
            </div>

            {budget.filter(b=>Number(b.allocated)>0).length>0&&(
              <div style={{...card(),marginBottom:12}}>
                <SLabel t="Distribusi Anggaran"/>
                <DonutChart data={budget.map(b=>({label:b.name,value:Number(b.allocated)||0}))}/>
              </div>
            )}

            {budget.map(b=>{
              const linkedVendors=vendors.filter(v=>v.budget_category_id===b.id);
              const vendorCatCommitted=linkedVendors.filter(v=>v.status==="booking").reduce((s,v)=>s+Number(v.contract_amount||0),0);
              const vendorCatPaid=linkedVendors.reduce((s,v)=>s+Number(v.paid_amount||0),0);
              const categoryPaid=Number(b.spent||0)+vendorCatPaid;
              const over=categoryPaid>Number(b.allocated);
              const catPct=Number(b.allocated)>0?Math.round((categoryPaid/Number(b.allocated))*100):0;
              const isEdit=editBudget===b.id;
              return(
                <div key={b.id} style={{...card(),marginBottom:10}}>
                  {isEdit?(
                    <div>
                      <input value={budgetInput.cat} onChange={e=>setBudgetInput(p=>({...p,cat:e.target.value}))} placeholder="Nama kategori" style={{...inp(),marginBottom:8}}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Anggaran (Rp)</p><input value={budgetInput.alloc} onChange={e=>{setBudgetInput(p=>({...p,alloc:e.target.value}));setBudgetErr("");}} style={inp()}/></div>
                        <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Dibayar (Rp)</p><input value={budgetInput.spent} onChange={e=>{setBudgetInput(p=>({...p,spent:e.target.value}));setBudgetErr("");}} style={inp()}/></div>
                      </div>
                      {budgetErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{budgetErr}</p>}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>handleSaveBudget(b.id)} style={{flex:1,padding:"9px",fontSize:12,fontWeight:600,background:G900,color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>Simpan</button>
                        <button onClick={()=>{setEditBudget(null);setBudgetErr("");}} style={{padding:"9px 14px",fontSize:12,background:"none",border:`1.5px solid ${BORDER2}`,borderRadius:10,cursor:"pointer",color:MUTED}}>Batal</button>
                      </div>
                    </div>
                  ):(
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:20}}>{b.icon||"💸"}</span>
                          <div>
                            <p style={{fontSize:13,fontWeight:500,color:DARK,margin:"0 0 1px"}}>{b.name}</p>
                            <p style={{fontSize:11,color:MUTED,margin:0}}>Dibayar {fmt(categoryPaid)} dari {fmt(b.allocated)}</p>
                            {linkedVendors.length>0&&<p style={{fontSize:10,color:G700,margin:"2px 0 0"}}>{linkedVendors.length} vendor · kontrak booking {fmt(vendorCatCommitted)}</p>}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          {over&&<span style={{fontSize:10,fontWeight:600,color:RED}}>⚠</span>}
                          <button onClick={()=>{setEditBudget(b.id);setBudgetInput({cat:b.name,alloc:String(b.allocated),spent:String(b.spent)});}} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:G50,color:G700,border:`1px solid ${G100}`,cursor:"pointer"}}>Edit</button>
                          <button onClick={()=>setConfirmDelete({type:"budget",id:b.id,label:b.name})} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FEF2F2",color:RED,border:"1px solid #FECACA",cursor:"pointer"}}>Hapus</button>
                        </div>
                      </div>
                      <div style={{height:4,borderRadius:2,background:"#EEF1EC",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${Math.min(catPct,100)}%`,background:over?RED:catPct>80?AMBER:G500,borderRadius:2,transition:"width .5s"}}/>
                      </div>
                      <p style={{fontSize:10,color:over?RED:MUTED,textAlign:"right",margin:"3px 0 0"}}>{catPct}%</p>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={()=>addBudgetCategory("Kategori baru")} style={{width:"100%",padding:"13px",fontSize:13,fontWeight:500,background:"none",border:`1.5px dashed ${BORDER2}`,borderRadius:14,cursor:"pointer",color:G700,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span style={{fontSize:18}}>+</span> Tambah kategori
            </button>
          </div>
        )}

        {/* ══ PERNIKAHAN sub-tabs ══ */}
        {tab==="pernikahan"&&(
          <div style={{position:"sticky",top:48,zIndex:40,background:GLASS_NAV,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",display:"flex",borderBottom:`1px solid ${BORDER}`}}>
            {[["detail","💍","Detail"],["invoice","🧾","Invoice"],["dokumen","📁","Dokumen"],["vendor","🏪","Vendor"]].map(([id,ico,lbl])=>(
              <button key={id} onClick={()=>setSubW(id)} style={{flex:1,padding:"12px 0",fontSize:11,fontWeight:500,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,color:subW===id?G900:MUTED,borderBottom:subW===id?`2px solid ${G900}`:"2px solid transparent",fontFamily:"Inter,sans-serif"}}>
                <span style={{fontSize:13}}>{ico}</span>{lbl}
              </button>
            ))}
          </div>
        )}

        {/* ══ DETAIL ══ */}
        {tab==="pernikahan"&&subW==="detail"&&(
          <div>
            {/* Cover banner — taller, full */}
            <div style={{position:"relative",height:240,overflow:"hidden",background:G900}}>
              <img src={coverImg} alt="Cover" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`center ${coverPos}%`}} onError={e=>{e.target.src="/cover-default.jpg"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.1) 0%,rgba(27,67,50,.9) 100%)"}}/>
              <div style={{position:"absolute",bottom:20,left:24,right:24}}>
                <p style={{fontSize:10,color:"rgba(255,255,255,.5)",letterSpacing:".12em",textTransform:"uppercase",margin:"0 0 4px"}}>Pernikahan</p>
                <h2 style={{fontFamily:"Lora,serif",fontSize:24,fontWeight:600,fontStyle:"italic",color:"#fff",margin:"0 0 2px",lineHeight:1.2}}>{coupleNames}</h2>
                <p style={{fontSize:11,color:"rgba(255,255,255,.55)",margin:0}}>{weddingDate}</p>
              </div>
            </div>
            <div style={{padding:"16px 16px 0"}}>
              <div style={{...card(),marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <SLabel t="Info Pernikahan"/>
                  <button onClick={editingDetail?handleSaveDetail:()=>{setDetailForm({wedding_date:project.wedding_date||"",venue:project.venue||"",venue_address:project.venue_address||"",guest_count:project.guest_count||"",budget_total:project.budget_total||"",location:project.location||""});setEditingDetail(true);}}
                    style={{fontSize:11,padding:"5px 14px",borderRadius:20,background:editingDetail?G900:G50,color:editingDetail?"#fff":G700,border:`1px solid ${editingDetail?G900:G100}`,cursor:"pointer",marginBottom:10,fontWeight:600}}>
                    {editingDetail?"✓ Simpan":"Edit"}
                  </button>
                </div>
                {editingDetail?(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {[{key:"wedding_date",label:"Tanggal",type:"date"},{key:"venue",label:"Venue"},{key:"venue_address",label:"Alamat venue"},{key:"guest_count",label:"Estimasi tamu"},{key:"budget_total",label:"Total anggaran (Rp)"},{key:"location",label:"Kota"}].map(f=>(
                      <div key={f.key}><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>{f.label}</p>
                        <input type={f.type||"text"} value={detailForm[f.key]||""} onChange={e=>setDetailForm(p=>({...p,[f.key]:e.target.value}))} style={inp()}/></div>
                    ))}
                    <button onClick={()=>setEditingDetail(false)} style={{padding:"9px",fontSize:12,background:"none",border:`1.5px solid ${BORDER2}`,borderRadius:10,cursor:"pointer",color:MUTED}}>Batal</button>
                  </div>
                ):(
                  <div>
                    {[{label:"Tanggal",val:weddingDate},{label:"Venue",val:project.venue||"—"},{label:"Alamat",val:project.venue_address||"—"},{label:"Estimasi tamu",val:project.guest_count||"—"},{label:"Total anggaran",val:project.budget_total?fmt(project.budget_total):"—"}].map((r,i,arr)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${BORDER}`:"none"}}>
                        <span style={{fontSize:13,color:MUTED,flexShrink:0,marginRight:16}}>{r.label}</span>
                        <span style={{fontSize:13,fontWeight:500,color:DARK,textAlign:"right"}}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {pkg&&(
                <div style={{...card(),marginBottom:12}}>
                  <SLabel t="Paket Layanan"/>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <p style={{fontSize:14,fontWeight:600,color:DARK,margin:0}}>{pkg.name||project.package_name}</p>
                    <p style={{fontSize:13,fontWeight:600,color:G700,margin:0}}>{pkg.price||"—"}</p>
                  </div>
                  {(pkg.includes||[]).map((item,i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:5}}>
                      <span style={{color:G500,fontSize:11,flexShrink:0}}>✓</span>
                      <span style={{fontSize:12,color:MID,lineHeight:1.5}}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{...card({background:G900}),marginBottom:16}}>
                <p style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.6)",margin:"0 0 4px",letterSpacing:".06em"}}>WEDDING CONCIERGE</p>
                <p style={{fontSize:14,fontWeight:600,color:"#fff",margin:"0 0 2px"}}>Konsultasi dengan Damargaleri</p>
                <p style={{fontSize:12,color:"rgba(255,255,255,.6)",margin:"0 0 14px"}}>{pkg?.coordinator||"Tim"} siap mendampingi setiap langkah.</p>
                <a href={`https://wa.me/${pmWA.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                  style={{display:"block",padding:"11px",fontSize:13,fontWeight:600,background:"rgba(255,255,255,.15)",color:"#fff",borderRadius:12,textDecoration:"none",textAlign:"center",border:"1px solid rgba(255,255,255,.2)"}}>
                  Chat via WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ══ INVOICE ══ */}
        {tab==="pernikahan"&&subW==="invoice"&&(
          <div style={{padding:"16px 16px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <h2 style={{fontFamily:"Lora,serif",fontSize:20,fontWeight:600,color:DARK,margin:0,fontStyle:"italic"}}>Semua Invoice</h2>
              <button onClick={()=>setShowAddInv(p=>!p)} style={{fontSize:12,padding:"6px 14px",borderRadius:20,background:showAddInv?"#F5F5F5":G900,color:showAddInv?MUTED:"#fff",border:"none",cursor:"pointer",fontWeight:600}}>{showAddInv?"Batal":"+ Tambah"}</button>
            </div>
            {showAddInv&&(
              <div style={{...card(),marginBottom:12}} className="fade-up">
                <p style={{fontSize:12,fontWeight:600,color:DARK,margin:"0 0 10px"}}>Invoice Baru</p>
                <input value={newInv.label} placeholder="Nama invoice..." onChange={e=>{setNewInv(p=>({...p,label:e.target.value}));setInvErr("");}} style={{...inp(),marginBottom:8}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <input value={newInv.amount} placeholder="Jumlah (Rp)" onChange={e=>{setNewInv(p=>({...p,amount:e.target.value}));setInvErr("");}} style={inp()}/>
                  <input value={newInv.due_date} placeholder="Tgl jatuh tempo" onChange={e=>setNewInv(p=>({...p,due_date:e.target.value}))} style={inp()}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <select value={newInv.status} onChange={e=>setNewInv(p=>({...p,status:e.target.value}))} style={{...inp(),appearance:"none"}}>{["belum","menunggu","lunas"].map(s=><option key={s}>{s}</option>)}</select>
                  <select value={newInv.category} onChange={e=>setNewInv(p=>({...p,category:e.target.value}))} style={{...inp(),appearance:"none"}}>{["WO","Vendor","Venue","Lainnya"].map(c=><option key={c}>{c}</option>)}</select>
                </div>
                <input value={newInv.doc_url} placeholder="Link PDF / Drive (opsional)" onChange={e=>setNewInv(p=>({...p,doc_url:e.target.value}))} style={{...inp(),marginBottom:8}}/>
                {invErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{invErr}</p>}
                <button onClick={handleAddInvoice} style={{width:"100%",padding:"10px",fontSize:13,fontWeight:600,background:G900,color:"#fff",border:"none",borderRadius:12,cursor:"pointer"}}>Simpan invoice</button>
              </div>
            )}
            {["WO","Vendor","Venue","Lainnya"].map(cat=>{
              const filtered=invoices.filter(i=>i.category===cat);
              if(!filtered.length)return null;
              return(
                <div key={cat} style={{marginBottom:12}}>
                  <p style={{fontSize:10,fontWeight:700,color:MUTED,letterSpacing:".1em",margin:"0 0 8px",textTransform:"uppercase"}}>{cat}</p>
                  {filtered.map(inv=>{
                    const st=STATUS_INV[inv.status]||STATUS_INV.belum;
                    const isEdit=editInvId===inv.id;
                    return(
                      <div key={inv.id} style={{...card(),marginBottom:8}}>
                        {isEdit?(
                          <div>
                            <input value={editInvData.label??inv.label} onChange={e=>setEditInvData(p=>({...p,label:e.target.value}))} style={{...inp(),marginBottom:8}}/>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                              <input value={editInvData.amount??inv.amount} onChange={e=>setEditInvData(p=>({...p,amount:e.target.value}))} style={inp()}/>
                              <input value={editInvData.due_date??inv.due_date??""} onChange={e=>setEditInvData(p=>({...p,due_date:e.target.value}))} style={inp()}/>
                            </div>
                            <select value={editInvData.status??inv.status} onChange={e=>setEditInvData(p=>({...p,status:e.target.value}))} style={{...inp(),appearance:"none",marginBottom:8}}>{["belum","menunggu","lunas"].map(s=><option key={s}>{s}</option>)}</select>
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>handleSaveInvoice(inv.id)} style={{flex:1,padding:"9px",fontSize:12,fontWeight:600,background:G900,color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>Simpan</button>
                              <button onClick={()=>{setEditInvId(null);setEditInvData({});}} style={{padding:"9px 14px",fontSize:12,background:"none",border:`1.5px solid ${BORDER2}`,borderRadius:10,cursor:"pointer",color:MUTED}}>Batal</button>
                            </div>
                          </div>
                        ):(
                          <div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                              <div style={{flex:1,marginRight:8}}>
                                <p style={{fontSize:13,fontWeight:500,color:DARK,margin:"0 0 2px"}}>{inv.label}</p>
                                <p style={{fontSize:11,color:MUTED,margin:0}}>{inv.due_date||""}</p>
                              </div>
                              <span style={chip(st.bg,st.color)}>{st.label}</span>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <p style={{fontSize:15,fontWeight:700,color:inv.status==="lunas"?MUTED:DARK,margin:0}}>{inv.amount}</p>
                              <div style={{display:"flex",gap:6}}>
                                {inv.doc_url&&<a href={inv.doc_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:G700,textDecoration:"none",fontWeight:500}}>📄</a>}
                                <button onClick={()=>{setEditInvId(inv.id);setEditInvData({label:inv.label,amount:inv.amount,due_date:inv.due_date||"",status:inv.status});}} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:G50,color:G700,border:`1px solid ${G100}`,cursor:"pointer"}}>Edit</button>
                                <button onClick={()=>setConfirmDelete({type:"invoice",id:inv.id,label:inv.label})} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FEF2F2",color:RED,border:"1px solid #FECACA",cursor:"pointer"}}>Hapus</button>
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
            {invoices.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:MUTED}}><p style={{fontSize:32,margin:"0 0 8px"}}>🧾</p><p style={{fontSize:13}}>Belum ada invoice</p></div>}
          </div>
        )}

        {/* ══ DOKUMEN ══ */}
        {tab==="pernikahan"&&subW==="dokumen"&&(
          <div style={{padding:"16px 16px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <h2 style={{fontFamily:"Lora,serif",fontSize:20,fontWeight:600,color:DARK,margin:0,fontStyle:"italic"}}>Dokumen & Link</h2>
              <button onClick={()=>setShowAddDoc(p=>!p)} style={{fontSize:12,padding:"6px 14px",borderRadius:20,background:showAddDoc?"#F5F5F5":G900,color:showAddDoc?MUTED:"#fff",border:"none",cursor:"pointer",fontWeight:600}}>{showAddDoc?"Batal":"+ Tambah"}</button>
            </div>
            {showAddDoc&&(
              <div style={{...card(),marginBottom:12}} className="fade-up">
                <input value={newDoc.label} placeholder="Nama dokumen..." onChange={e=>{setNewDoc(p=>({...p,label:e.target.value}));setDocErr("");}} style={{...inp(),marginBottom:8}}/>
                <input value={newDoc.url} placeholder="https://..." onChange={e=>{setNewDoc(p=>({...p,url:e.target.value}));setDocErr("");}} style={{...inp(),marginBottom:8}}/>
                <select value={newDoc.tag} onChange={e=>setNewDoc(p=>({...p,tag:e.target.value}))} style={{...inp(),appearance:"none",marginBottom:8}}>{["Foto","Dokumen","Referensi","Lainnya"].map(t=><option key={t}>{t}</option>)}</select>
                {docErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{docErr}</p>}
                <button onClick={handleAddDoc} style={{width:"100%",padding:"10px",fontSize:13,fontWeight:600,background:G900,color:"#fff",border:"none",borderRadius:12,cursor:"pointer"}}>Simpan</button>
              </div>
            )}
            {["Foto","Dokumen","Referensi","Lainnya"].map(tag=>{
              const tagged=docs.filter(d=>d.tag===tag);
              if(!tagged.length)return null;
              return(
                <div key={tag} style={{marginBottom:16}}>
                  <p style={{fontSize:10,fontWeight:700,color:MUTED,letterSpacing:".1em",margin:"0 0 8px",textTransform:"uppercase"}}>{tag}</p>
                  {tagged.map(doc=>{
                    const isEdit=editDocId===doc.id;
                    return(
                      <div key={doc.id} style={{...card(),marginBottom:8}}>
                        {isEdit?(
                          <div>
                            <input value={editDocData.label??doc.label} onChange={e=>setEditDocData(p=>({...p,label:e.target.value}))} style={{...inp(),marginBottom:8}}/>
                            <input value={editDocData.url??doc.url} onChange={e=>setEditDocData(p=>({...p,url:e.target.value}))} style={{...inp(),marginBottom:8}}/>
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>handleSaveDoc(doc.id)} style={{flex:1,padding:"9px",fontSize:12,fontWeight:600,background:G900,color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>Simpan</button>
                              <button onClick={()=>{setEditDocId(null);setEditDocData({});}} style={{padding:"9px 14px",fontSize:12,background:"none",border:`1.5px solid ${BORDER2}`,borderRadius:10,cursor:"pointer",color:MUTED}}>Batal</button>
                            </div>
                          </div>
                        ):(
                          <div style={{display:"flex",alignItems:"center",gap:12}}>
                            <div style={{width:36,height:36,borderRadius:10,background:G50,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{doc.icon||"📄"}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{fontSize:13,fontWeight:500,color:DARK,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.label}</p>
                              <a href={doc.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:G700,textDecoration:"none"}}>Buka link →</a>
                            </div>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>{setEditDocId(doc.id);setEditDocData({label:doc.label,url:doc.url});}} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:G50,color:G700,border:`1px solid ${G100}`,cursor:"pointer"}}>Edit</button>
                              <button onClick={()=>setConfirmDelete({type:"document",id:doc.id,label:doc.label})} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FEF2F2",color:RED,border:"1px solid #FECACA",cursor:"pointer"}}>×</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {docs.length===0&&!showAddDoc&&<div style={{textAlign:"center",padding:"40px 0",color:MUTED}}><p style={{fontSize:32,margin:"0 0 8px"}}>📁</p><p style={{fontSize:13}}>Belum ada dokumen</p></div>}
          </div>
        )}

        {/* ══ VENDOR ══ */}
        {tab==="pernikahan"&&subW==="vendor"&&(
          <div style={{padding:"16px 16px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <h2 style={{fontFamily:"Lora,serif",fontSize:20,fontWeight:600,color:DARK,margin:"0 0 2px",fontStyle:"italic"}}>Vendor Kami</h2>
                <p style={{fontSize:12,color:MUTED,margin:0}}>{vendors.filter(v=>v.status==="booking").length} vendor terkonfirmasi</p>
              </div>
              <button onClick={()=>setShowAddVendor(p=>!p)} style={{fontSize:12,padding:"6px 14px",borderRadius:20,background:showAddVendor?"#F5F5F5":G900,color:showAddVendor?MUTED:"#fff",border:"none",cursor:"pointer",fontWeight:600}}>{showAddVendor?"Batal":"+ Tambah"}</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[{label:"Booking",val:vendors.filter(v=>v.status==="booking").length,color:G700,bg:G50},{label:"Negosiasi",val:vendors.filter(v=>v.status==="negosiasi").length,color:AMBER,bg:AMBERBG},{label:"Prospek",val:vendors.filter(v=>v.status==="prospek").length,color:MUTED,bg:"#F5F5F5"}].map((s,i)=>(
                <div key={i} style={{...card({padding:"10px 12px",textAlign:"center"})}}>
                  <p style={{fontSize:20,fontWeight:700,color:s.color,margin:"0 0 2px",fontFamily:"Lora,serif"}}>{s.val}</p>
                  <p style={{fontSize:10,color:s.color,margin:0,fontWeight:600}}>{s.label}</p>
                </div>
              ))}
            </div>
            {showAddVendor&&(
              <div style={{...card(),marginBottom:12}} className="fade-up">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nama vendor</p><input value={newVendor.name} onChange={e=>setNewVendor(p=>({...p,name:e.target.value}))} style={inp()}/></div>
                  <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Kategori</p><input value={newVendor.category} onChange={e=>setNewVendor(p=>({...p,category:e.target.value}))} style={inp()}/></div>
                </div>
                <div style={{marginBottom:8}}><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Masuk ke kategori budget</p><select value={newVendor.budget_category_id} onChange={e=>setNewVendor(p=>({...p,budget_category_id:e.target.value}))} style={{...inp(),appearance:"none"}}><option value="">— Pilih kategori budget —</option>{budget.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nomor WA</p><input value={newVendor.phone} onChange={e=>setNewVendor(p=>({...p,phone:e.target.value}))} style={inp()}/></div>
                  <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nilai kontrak (Rp)</p><input inputMode="numeric" value={newVendor.contract_amount} onChange={e=>setNewVendor(p=>({...p,contract_amount:e.target.value}))} style={inp()}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Sudah dibayar / DP (Rp)</p><input inputMode="numeric" value={newVendor.paid_amount} onChange={e=>setNewVendor(p=>({...p,paid_amount:e.target.value}))} style={inp()}/></div>
                  <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Status</p>
                    <select value={newVendor.status} onChange={e=>setNewVendor(p=>({...p,status:e.target.value}))} style={{...inp(),appearance:"none"}}>{["prospek","negosiasi","booking"].map(s=><option key={s}>{s}</option>)}</select>
                  </div>
                </div>
                <div style={{marginBottom:8}}><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>PIC</p><input value={newVendor.contact} onChange={e=>setNewVendor(p=>({...p,contact:e.target.value}))} style={inp()}/></div>
                <div style={{marginBottom:8}}><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Catatan</p><input value={newVendor.note} onChange={e=>setNewVendor(p=>({...p,note:e.target.value}))} style={inp()}/></div>
                {vendorErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{vendorErr}</p>}
                <button onClick={handleAddVendor} style={{width:"100%",padding:"10px",fontSize:13,fontWeight:600,background:G900,color:"#fff",border:"none",borderRadius:12,cursor:"pointer"}}>Simpan vendor</button>
              </div>
            )}
            {vendors.length===0&&!showAddVendor&&<div style={{textAlign:"center",padding:"40px 0",color:MUTED}}><p style={{fontSize:32,margin:"0 0 8px"}}>🏪</p><p style={{fontSize:13}}>Belum ada vendor. Klik "+ Tambah".</p></div>}
            {vendors.map(v=>{
              const st=STATUS_VENDOR[v.status]||STATUS_VENDOR.prospek;
              const isOpen=vendorOpen===v.id;
              const isEdit=editVendorId===v.id;
              return(
                <div key={v.id} style={{...card(),marginBottom:10}}>
                  {isEdit?(
                    <div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nama</p><input value={editVendorData.name??v.name} onChange={e=>setEditVendorData(p=>({...p,name:e.target.value}))} style={inp()}/></div>
                        <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Nilai kontrak</p><input value={editVendorData.contract_amount??v.contract_amount??""} onChange={e=>setEditVendorData(p=>({...p,contract_amount:e.target.value}))} style={inp()}/></div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Sudah dibayar / DP</p><input value={editVendorData.paid_amount??v.paid_amount??""} onChange={e=>setEditVendorData(p=>({...p,paid_amount:e.target.value}))} style={inp()}/></div>
                        <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Kategori budget</p><select value={editVendorData.budget_category_id??v.budget_category_id??""} onChange={e=>setEditVendorData(p=>({...p,budget_category_id:e.target.value}))} style={{...inp(),appearance:"none"}}><option value="">— Belum dipilih —</option>{budget.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>WA</p><input value={editVendorData.phone??v.phone??""} onChange={e=>setEditVendorData(p=>({...p,phone:e.target.value}))} style={inp()}/></div>
                        <div><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Status</p>
                          <select value={editVendorData.status??v.status} onChange={e=>setEditVendorData(p=>({...p,status:e.target.value}))} style={{...inp(),appearance:"none"}}>{["prospek","negosiasi","booking"].map(s=><option key={s}>{s}</option>)}</select>
                        </div>
                      </div>
                      <div style={{marginBottom:8}}><p style={{fontSize:11,color:MUTED,margin:"0 0 4px"}}>Catatan</p><input value={editVendorData.note??v.note??""} onChange={e=>setEditVendorData(p=>({...p,note:e.target.value}))} style={inp()}/></div>
                      {vendorErr&&<p style={{fontSize:11,color:RED,margin:"0 0 8px"}}>{vendorErr}</p>}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>handleSaveVendor(v.id)} style={{flex:1,padding:"9px",fontSize:12,fontWeight:600,background:G900,color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>Simpan</button>
                        <button onClick={()=>{setEditVendorId(null);setEditVendorData({});}} style={{padding:"9px 14px",fontSize:12,background:"none",border:`1.5px solid ${BORDER2}`,borderRadius:10,cursor:"pointer",color:MUTED}}>Batal</button>
                      </div>
                    </div>
                  ):(
                    <div>
                      <button onClick={()=>setVendorOpen(isOpen?null:v.id)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
                        <div style={{width:40,height:40,borderRadius:12,background:G50,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{v.icon||"🏪"}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                            <p style={{fontSize:13,fontWeight:600,color:DARK,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.name}</p>
                            <span style={chip(st.bg,st.color)}>{st.label}</span>
                          </div>
                          <p style={{fontSize:11,color:MUTED,margin:0}}>{v.category}</p>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <p style={{fontSize:13,fontWeight:600,color:G700,margin:"0 0 1px"}}>{Number(v.contract_amount)>0?fmt(v.contract_amount):(v.price||"—")}</p>
                          <span style={{fontSize:10,color:MUTED,display:"inline-block",transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                        </div>
                      </button>
                      {isOpen&&(
                        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${BORDER}`}} className="fade-up">
                          {v.note&&<div style={{background:G50,borderRadius:10,padding:"10px 12px",marginBottom:10}}><p style={{fontSize:11,color:G700,fontWeight:600,margin:"0 0 3px"}}>CATATAN</p><p style={{fontSize:12,color:MID,margin:0,lineHeight:1.6}}>{v.note}</p></div>}
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}><div style={{background:"#FAFAFA",borderRadius:9,padding:9}}><p style={{fontSize:9,color:MUTED,margin:"0 0 2px"}}>NILAI KONTRAK</p><p style={{fontSize:12,fontWeight:600,margin:0}}>{fmt(v.contract_amount||0)}</p></div><div style={{background:G50,borderRadius:9,padding:9}}><p style={{fontSize:9,color:G700,margin:"0 0 2px"}}>SUDAH DIBAYAR</p><p style={{fontSize:12,fontWeight:600,color:G700,margin:0}}>{fmt(v.paid_amount||0)}</p></div></div>
                          {[{label:"PIC",val:v.contact},{label:"WhatsApp",val:v.phone,accent:true},{label:"Instagram",val:v.instagram,accent:true}].filter(r=>r.val).map((r,i,arr)=>(
                            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<arr.length-1?`1px solid ${BORDER}`:"none"}}>
                              <span style={{fontSize:12,color:MUTED}}>{r.label}</span>
                              <span style={{fontSize:12,fontWeight:500,color:r.accent?G700:DARK}}>{r.val}</span>
                            </div>
                          ))}
                          <div style={{display:"flex",gap:8,marginTop:12}}>
                            {v.phone&&<a href={`https://wa.me/${v.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{flex:1,padding:"9px 0",fontSize:12,fontWeight:600,background:G900,color:"#fff",borderRadius:10,textDecoration:"none",textAlign:"center",display:"block"}}>Hubungi {(v.contact||"vendor").split(" ")[0]}</a>}
                            <button onClick={()=>{setVendorErr("");setEditVendorId(v.id);setEditVendorData({name:v.name,contract_amount:String(v.contract_amount||0),paid_amount:String(v.paid_amount||0),budget_category_id:v.budget_category_id||"",phone:v.phone||"",status:v.status,note:v.note||""});}} style={{padding:"9px 12px",fontSize:12,fontWeight:600,background:G50,color:G700,border:`1px solid ${G100}`,borderRadius:10,cursor:"pointer"}}>Edit</button>
                            <button onClick={()=>setConfirmDelete({type:"vendor",id:v.id,label:v.name})} style={{padding:"9px 12px",fontSize:12,fontWeight:600,background:"#FEF2F2",color:RED,border:"1px solid #FECACA",borderRadius:10,cursor:"pointer"}}>Hapus</button>
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

        {/* ══ INFO ══ */}
        {tab==="info"&&(
          <div style={{padding:"16px 16px 0"}}>
            <div style={{...card({background:G900}),marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <Leaf size={16} color="rgba(255,255,255,.6)"/>
                <p style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.6)",margin:0,letterSpacing:".08em"}}>HUBUNGI KOORDINATOR</p>
              </div>
              <p style={{fontSize:14,fontWeight:600,color:"#fff",margin:"0 0 3px"}}>Tim Damargaleri Organizer</p>
              <p style={{fontSize:12,color:"rgba(255,255,255,.6)",margin:"0 0 14px",lineHeight:1.6}}>Siap membantu setiap hari 08.00–21.00 WIB</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <a href={`https://wa.me/${pmWA.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{padding:"10px 0",fontSize:12,fontWeight:600,background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,textDecoration:"none",textAlign:"center"}}>Chat WhatsApp</a>
                <a href="https://instagram.com/damargaleri.organizer" target="_blank" rel="noreferrer" style={{padding:"10px 0",fontSize:12,fontWeight:600,background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,textDecoration:"none",textAlign:"center"}}>Instagram</a>
              </div>
            </div>
            <h2 style={{fontFamily:"Lora,serif",fontSize:20,fontWeight:600,color:DARK,margin:"0 0 4px",fontStyle:"italic"}}>Pertanyaan Umum</h2>
            <p style={{fontSize:12,color:MUTED,margin:"0 0 14px"}}>Semua yang perlu kamu tahu tentang pernikahan & Damargaleri</p>
            {FAQS.map((sec,si)=>(
              <div key={si} style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <Leaf size={12} color={G700}/>
                  <p style={{fontSize:10,fontWeight:700,color:G700,margin:0,letterSpacing:".08em",textTransform:"uppercase"}}>{sec.section}</p>
                </div>
                {sec.items.map((item,qi)=>{
                  const key=`${si}-${qi}`,open=faqOpen===key;
                  return(
                    <div key={qi} style={{...card(),marginBottom:6}}>
                      <button onClick={()=>setFaqOpen(open?null:key)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:0,textAlign:"left"}}>
                        <span style={{fontSize:13,fontWeight:500,color:DARK,lineHeight:1.4}}>{item.q}</span>
                        <span style={{fontSize:12,color:MUTED,flexShrink:0,display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                      </button>
                      {open&&<p style={{fontSize:13,color:MID,margin:"10px 0 0",lineHeight:1.7,borderTop:`1px solid ${BORDER}`,paddingTop:10}} className="fade-up">{item.a}</p>}
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{...card(),width:"100%",maxWidth:320,boxShadow:SHADOW_FLOAT}} className="fade-up">
            <p style={{fontSize:16,fontWeight:600,color:DARK,margin:"0 0 6px",fontFamily:"Lora,serif"}}>Hapus item ini?</p>
            <p style={{fontSize:13,color:MUTED,margin:"0 0 20px",lineHeight:1.5}}><strong style={{color:DARK}}>{confirmDelete.label}</strong> akan dihapus permanen.</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,padding:"11px 0",fontSize:13,background:"none",border:`1.5px solid ${BORDER2}`,borderRadius:12,cursor:"pointer",color:MUTED}}>Batal</button>
              <button onClick={handleDelete} style={{flex:1,padding:"11px 0",fontSize:13,fontWeight:600,background:RED,color:"#fff",border:"none",borderRadius:12,cursor:"pointer"}}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING GLASS BOTTOM NAV */}
      <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",zIndex:50,width:"calc(100% - 32px)",maxWidth:380}}>
        <div style={{background:GLASS_NAV,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRadius:28,boxShadow:SHADOW_FLOAT,border:`1px solid rgba(255,255,255,.6)`,padding:"6px 8px",display:"flex"}}>
          {TABS.map(t=>{
            const active=tab===t.id;
            return(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 0",cursor:"pointer",background:active?"rgba(27,67,50,.08)":"none",border:"none",borderRadius:22,transition:"background .2s"}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke={active?G900:MUTED} strokeWidth={active?2:1.5}
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.d}/>
                </svg>
                <span style={{fontSize:9,color:active?G900:MUTED,fontWeight:active?700:400,fontFamily:"Inter,sans-serif",letterSpacing:active?".02em":"0"}}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
