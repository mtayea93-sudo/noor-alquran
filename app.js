/* ===== نور القرآن — app.js ===== */
const API = "https://api.alquran.cloud/v1";
const CDN = "https://cdn.islamic.network/quran";

const LANG_NAMES = {
  ar:"العربية", en:"الإنجليزية", fr:"الفرنسية", de:"الألمانية", es:"الإسبانية",
  tr:"التركية", ur:"الأردية", id:"الإندونيسية", ms:"الماليزية", ru:"الروسية",
  zh:"الصينية", hi:"الهندية", bn:"البنغالية", fa:"الفارسية", ps:"الباشتو",
  ug:"الأويغورية", ku:"الكردية", ta:"التاميلية", ml:"المالايالامية",
  th:"التايلاندية", sw:"السواحيلية", az:"الأذربيجانية", bs:"البوسنية",
  so:"الصومالية", sq:"الألبانية", it:"الإيطالية", nl:"الهولندية",
  sv:"السويدية", no:"النرويجية", pt:"البرتغالية"
};
const AR_EDITION_NAMES = {
  "en.sahih":"صحيح إنترناشونال","en.pickthall":"بيكثال","en.yusufali":"يوسف علي",
  "en.asad":"محمد أسد","fr.hamidullah":"هاميد الله","de.aburida":"أبو ريدة",
  "tr.diyanet":"هيئة الشؤون الدينية التركية","ur.jalandhry":"جلال الدين جهاندري",
  "id.indonesian":"إندونيسية رسمية","ms.basmeih":"بسميه","ru.kuliev":"كولييف",
  "bn.bengali":"محيي الدين خان","es.cortes":"كورتيس","it.piccardo":"بيكاردو"
};

/* قائمة احتياطية بأشهر القرّاء — تُستخدم لو الـ API فشل أو اتمنع */
const RECITERS_FALLBACK = [
  {identifier:"ar.alafasy",name:"مشاري راشد العفاسي",englishName:"Mishary Rashid Alafasy",language:"ar"},
  {identifier:"ar.abdulbasitmurattal",name:"عبد الباسط عبد الصمد",englishName:"Abdul Basit Abdul Samad",language:"ar"},
  {identifier:"ar.minshawi",name:"محمد صديق المنشاوي",englishName:"Muhammad Siddiq El-Minshawi",language:"ar"},
  {identifier:"ar.minshawimujawwad",name:"المنشاوي (رواية مجوَّدة)",englishName:"Minshawi (Mujawwad)",language:"ar"},
  {identifier:"ar.husary",name:"محمود خليل الحصري",englishName:"Mahmoud Khalil Al-Husary",language:"ar"},
  {identifier:"ar.hudhaify",name:"علي بن عبد الرحمن الحذيفي",englishName:"Ali Al-Hudhaify",language:"ar"},
  {identifier:"ar.shaatree",name:"أبو بكر الشاطري",englishName:"Abu Bakr Al-Shatri",language:"ar"},
  {identifier:"ar.mahermuaiqly",name:"ماهر المعيقلي",englishName:"Maher Al-Muaiqly",language:"ar"},
  {identifier:"ar.abdullahbasfar",name:"عبد الله بصفر",englishName:"Abdullah Basfar",language:"ar"},
  {identifier:"ar.muhammadayyoup",name:"محمد أيوب",englishName:"Muhammad Ayyub",language:"ar"},
  {identifier:"ar.muhammadjibreel",name:"محمد جبريل",englishName:"Muhammad Jibreel",language:"ar"},
  {identifier:"ar.ahmedajamy",name:"أحمد بن علي العجمي",englishName:"Ahmed Al-Ajamy",language:"ar"},
  {identifier:"ar.aymanswoaid",name:"أيمن سويد",englishName:"Ayman Suwaid",language:"ar"},
  {identifier:"ar.hanirifai",name:"هاني الرفاعي",englishName:"Hani Ar-Rifai",language:"ar"},
  {identifier:"ar.ibrahimakhdar",name:"إبراهيم الأخضر",englishName:"Ibrahim Akhdar",language:"ar"},
  {identifier:"ar.parhizgar",name:"شهريار برهيزكار",englishName:"Shahriar Parhizgar",language:"fa"}
];

const state = {
  surahs: [],
  reciters: [],
  translations: [],
  tafsirs: [],
  reciter: localStorage.getItem("nq_reciter") || "ar.alafasy",
  translation: localStorage.getItem("nq_translation") || "none",
  tafsir: localStorage.getItem("nq_tafsir") || "ar.muyassar",
  currentSurah: null,
  playingAll: false,
  currentAyahIdx: -1
};

const $ = id => document.getElementById(id);
const audioEl = $("mainAudio");

async function fetchJSON(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error("bad response");
  return r.json();
}

/* ---------- init ---------- */
(async function init(){
  // كل طلب لوحده — لو واحد فشل الباقي يشتغل
  const [surahsRes, transRes, tafsirRes, audioRes] = await Promise.allSettled([
    fetchJSON(`${API}/surah`),
    fetchJSON(`${API}/edition/type/translation`),
    fetchJSON(`${API}/edition/type/tafsir`),
    fetchJSON(`${API}/edition/format/audio`)
  ]);

  // 1) السور
  if(surahsRes.status === "fulfilled"){
    state.surahs = surahsRes.value.data;
    renderSurahGrid(state.surahs);
  }else{
    $("surahGrid").innerHTML = `<p style="text-align:center;color:#e5c878;padding:20px">تعذر تحميل السور — تحقق من اتصال الإنترنت وأعد تحميل الصفحة.</p>`;
  }

  // 2) الترجمات
  if(transRes.status === "fulfilled"){
    state.translations = transRes.value.data
      .filter(e => e.format === "text")
      .sort((a,b)=>(LANG_NAMES[a.language]||a.language).localeCompare(LANG_NAMES[b.language]||b.language,"ar"));
  }

  // 3) التفسير
  if(tafsirRes.status === "fulfilled"){
    state.tafsirs = tafsirRes.value.data.filter(e => e.format === "text");
  }

  // 4) القرّاء: API أولًا، ولو فشل/فاضي نستخدم القائمة الاحتياطية
  if(audioRes.status === "fulfilled"){
    const list = audioRes.value.data.filter(e => e.type === "audio" && e.format === "audio");
    state.reciters = list.length ? list : RECITERS_FALLBACK;
  }else{
    state.reciters = RECITERS_FALLBACK;
  }

  fillSelects();
  renderReciters(state.reciters);
  try{ $("statLangs").querySelector(".stat-num").textContent = new Set(state.translations.map(t=>t.language)).size || "…"; }catch(e){}
  try{ $("statReciters").querySelector(".stat-num").textContent = state.reciters.length; }catch(e){}
})();

/* ---------- selects ---------- */
function fillSelects(){
  const recSel = $("reciterSelect");
  recSel.innerHTML = state.reciters.map(r=>
    `<option value="${r.identifier}" ${r.identifier===state.reciter?"selected":""}>🎧 ${r.name}</option>`
  ).join("");
  recSel.onchange = () => { state.reciter = recSel.value; localStorage.setItem("nq_reciter", state.reciter); refreshReader(); updateReciterHighlight(); };

  const trSel = $("translationSelect");
  const trGroups = {};
  state.translations.forEach(t=>{
    const ln = LANG_NAMES[t.language] || t.language.toUpperCase();
    (trGroups[ln] = trGroups[ln] || []).push(t);
  });
  trSel.innerHTML = `<option value="none">🌍 بدون ترجمة (العربية فقط)</option>` +
    Object.keys(trGroups).sort((a,b)=>a.localeCompare(b,"ar")).map(ln=>
      `<optgroup label="${ln}">` + trGroups[ln].map(t=>
        `<option value="${t.identifier}" ${t.identifier===state.translation?"selected":""}>${AR_EDITION_NAMES[t.identifier] || t.englishName}</option>`
      ).join("") + `</optgroup>`
    ).join("");
  trSel.onchange = () => { state.translation = trSel.value; localStorage.setItem("nq_translation", state.translation); refreshReader(); };

  const tfSel = $("tafsirSelect");
  tfSel.innerHTML = `<option value="none">📚 بدون تفسير</option>` + state.tafsirs.map(t=>
    `<option value="${t.identifier}" ${t.identifier===state.tafsir?"selected":""}>📚 ${t.name} — ${t.englishName}</option>`
  ).join("");
  tfSel.onchange = () => { state.tafsir = tfSel.value; localStorage.setItem("nq_tafsir", state.tafsir); refreshReader(); };
}

/* ---------- surah grid ---------- */
function renderSurahGrid(list){
  $("surahGrid").innerHTML = list.map(s=>`
    <div class="surah-card" onclick="openSurah(${s.number})">
      <div class="surah-num"><span>${s.number}</span></div>
      <div class="surah-info">
        <h4>${s.name.replace("سُورَةُ ","سورة ")}</h4>
        <p>${s.numberOfAyahs} آية • ${s.revelationType === "Meccan" ? "مكية" : "مدنية"}</p>
      </div>
      <span class="surah-badge">${s.englishName}</span>
    </div>`).join("") || `<p style="color:var(--muted)">لا توجد نتائج مطابقة.</p>`;
}
$("surahSearch").addEventListener("input", e=>{
  const q = e.target.value.trim();
  const filtered = state.surahs.filter(s =>
    !q || s.name.includes(q) || s.englishName.toLowerCase().includes(q.toLowerCase()) ||
    String(s.number) === q || s.name.replace(/[\u064B-\u0652\u0670\u0640]/g,"").includes(q)
  );
  renderSurahGrid(filtered);
});

/* ---------- reader ---------- */
window.openSurah = async function(n){
  stopPlayAll();
  state.currentSurah = n;
  $("readerOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  $("readerBody").innerHTML = `<p style="text-align:center;padding:60px 0;color:var(--muted)">جاري تحميل السورة…</p>`;

  const editions = ["quran-uthmani"];
  if(state.translation !== "none") editions.push(state.translation);
  if(state.tafsir !== "none") editions.push(state.tafsir);
  editions.push(state.reciter);

  try{
    const res = await fetch(`${API}/surah/${n}/editions/${editions.join(",")}`).then(r=>r.json());
    const data = res.data;
    const arabic = data.find(d=>d.edition.identifier==="quran-uthmani");
    const trans  = data.find(d=>d.edition.type==="translation");
    const tafsir = data.find(d=>d.edition.type==="tafsir");
    const rec    = data.find(d=>d.edition.format==="audio");

    const s = state.surahs.find(x=>x.number===n);
    $("readerTitle").textContent = arabic.name;
    $("readerMeta").textContent = `${arabic.englishName} • ${arabic.numberOfAyahs} آية • ${arabic.revelationType==="Meccan"?"مكية":"مدنية"} • القارئ: ${rec.edition.name}`;

    let html = "";
    if(n!==1 && n!==9){
      html += `<div class="bismillah-line">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>`;
    }
    arabic.ayahs.forEach((a,i)=>{
      const aNum = a.numberInSurah;
      if(n!==1 && aNum===1) return;
      const tAyah = trans ? trans.ayahs[i] : null;
      const fAyah = tafsir ? tafsir.ayahs[i] : null;
      const rAyah = rec ? rec.ayahs[i] : null;
      html += `
      <div class="ayah-block" id="ayah-${i}" data-global="${a.number}">
        <div class="ayah-head">
          <span class="ayah-num-badge">${aNum}</span>
          <button class="ayah-play-btn" onclick="playAyah(${i}, this)" title="استماع">▶</button>
          ${rAyah ? `<button class="ayah-play-btn" style="font-size:1.05rem" onclick="repeatAyah(${i})" title="تكرار">🔁</button>` : ""}
        </div>
        <div class="ayah-arabic">${a.text}${n!==1 && n!==9 && aNum!==1 ? " ﴿"+aNum+"﴾" : ""}</div>
        ${tAyah ? `<div class="ayah-translation"><strong>[${trans.edition.englishName}]</strong><br>${tAyah.text}</div>` : ""}
        ${fAyah ? `<div class="ayah-tafsir"><strong>التفسير (${tafsir.edition.name}):</strong><br>${fAyah.text}</div>` : ""}
      </div>`;
    });
    $("readerBody").innerHTML = html;
    state._surahData = { arabic, trans, tafsir, rec };
  }catch(err){
    $("readerBody").innerHTML = `<p style="text-align:center;padding:60px 0;color:#e5c878">حدث خطأ أثناء التحميل، تحقق من الإنترنت وحاول مرة أخرى.</p>`;
  }
};

function refreshReader(){
  if(state.currentSurah) openSurah(state.currentSurah);
}

window.playAyah = function(i, btn){
  const { rec } = state._surahData;
  stopPlayAll();
  document.querySelectorAll(".ayah-block").forEach(b=>b.classList.remove("playing"));
  const block = $("ayah-"+i);
  block.classList.add("playing");
  block.scrollIntoView({behavior:"smooth", block:"center"});
  showAudioBar(`الآية ${i+1} • ${state._surahData.rec.edition.name}`);
  audioEl.src = rec.ayahs[i].audio;
  audioEl.play();
  audioEl.onended = ()=>{ block.classList.remove("playing"); hideAudioBar(); };
};

window.repeatAyah = function(i){
  const { rec } = state._surahData;
  const block = $("ayah-"+i);
  audioEl.loop = true;
  showAudioBar(`تكرار الآية ${i+1} • ${rec.edition.name}`);
  document.querySelectorAll(".ayah-block").forEach(b=>b.classList.remove("playing"));
  block.classList.add("playing");
  audioEl.src = rec.ayahs[i].audio;
  audioEl.play();
  audioEl.onended = null;
};

$("playAllBtn").onclick = function(){
  if(state.playingAll){ stopPlayAll(); return; }
  state.playingAll = true;
  this.textContent = "⏸ إيقاف";
  this.classList.add("playing");
  state.currentAyahIdx = -1;
  playNextAyah();
};
function playNextAyah(){
  if(!state.playingAll) return;
  const { arabic, rec } = state._surahData;
  state.currentAyahIdx++;
  const i = state.currentAyahIdx;
  if(i >= arabic.ayahs.length){ stopPlayAll(); return; }
  document.querySelectorAll(".ayah-block").forEach(b=>b.classList.remove("playing"));
  const block = $("ayah-"+i);
  if(!block){ playNextAyah(); return; }
  block.classList.add("playing");
  block.scrollIntoView({behavior:"smooth", block:"center"});
  showAudioBar(`سورة ${arabic.name.replace("سُورَةُ ","")} — الآية ${arabic.ayahs[i].numberInSurah} • ${rec.edition.name}`);
  audioEl.loop = false;
  audioEl.src = rec.ayahs[i].audio;
  audioEl.play();
  audioEl.onended = playNextAyah;
}
function stopPlayAll(){
  state.playingAll = false;
  audioEl.loop = false;
  const btn = $("playAllBtn");
  btn.textContent = "▶ تشغيل السورة";
  btn.classList.remove("playing");
  document.querySelectorAll(".ayah-block").forEach(b=>b.classList.remove("playing"));
}

function showAudioBar(text){ $("audioBarText").textContent = text; $("audioBar").classList.add("show"); }
function hideAudioBar(){ $("audioBar").classList.remove("show"); audioEl.pause(); }

$("readerClose").onclick = ()=>{ stopPlayAll(); hideAudioBar(); $("readerOverlay").classList.remove("open"); document.body.style.overflow=""; };
$("nextSurahBtn").onclick = ()=>{ if(state.currentSurah<114) openSurah(state.currentSurah+1); };
$("prevSurahBtn").onclick = ()=>{ if(state.currentSurah>1) openSurah(state.currentSurah-1); };
document.addEventListener("keydown", e=>{ if(e.key==="Escape") $("readerClose").click(); });

/* ---------- reciters section ---------- */
function renderReciters(list){
  $("reciterGrid").innerHTML = list.map(r=>`
    <div class="reciter-card ${r.identifier===state.reciter?"active-reciter":""}" id="reciter-${r.identifier.replace(/\./g,"_")}">
      <div class="reciter-avatar">${r.name.trim().charAt(0)}</div>
      <h4>${r.name}</h4>
      <p>${r.englishName} • ${LANG_NAMES[r.language]||r.language}</p>
      <div class="reciter-actions">
        <button class="reciter-btn primary" onclick="previewReciter('${r.identifier}','${r.name.replace(/'/g,"")}')">▶ استماع</button>
        <button class="reciter-btn" onclick="setReciter('${r.identifier}')">جعله قارئ القراءة</button>
      </div>
    </div>`).join("");
}
/* بحث القرّاء */
$("reciterSearch").addEventListener("input", e=>{
  const q = e.target.value.trim();
  const filtered = state.reciters.filter(r =>
    !q || r.name.includes(q) || r.englishName.toLowerCase().includes(q.toLowerCase())
  );
  renderReciters(filtered);
});
window.previewReciter = function(id, name){
  showAudioBar(`استماع • ${name}`);
  audioEl.loop = false;
  audioEl.src = `${CDN}/audio/128/${id}/1.mp3`;
  audioEl.play();
  audioEl.onended = ()=> hideAudioBar();
};
window.setReciter = function(id){
  state.reciter = id;
  localStorage.setItem("nq_reciter", id);
  $("reciterSelect").value = id;
  updateReciterHighlight();
  refreshReader();
};
function updateReciterHighlight(){
  document.querySelectorAll(".reciter-card").forEach(c=>c.classList.remove("active-reciter"));
  const card = $("reciter-"+state.reciter.replace(/\./g,"_"));
  if(card) card.classList.add("active-reciter");
}

/* ---------- nav ---------- */
$("navToggle").onclick = ()=> $("mainNav").classList.toggle("open");
document.querySelectorAll(".nav-link").forEach(l=>l.onclick=()=>$("mainNav").classList.remove("open"));
