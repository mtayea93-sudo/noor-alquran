/* ============================================================
   tools.js — أدوات العبادة: مسبحة + مواقيت صلاة + إذاعات قرآن
   نور القرآن
   ============================================================ */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ================= 1) المسبحة الإلكترونية ================= */
  const ADHKAR = [
    { t: "سُبْحَانَ الله" },
    { t: "الحَمْدُ لله" },
    { t: "اللهُ أَكْبَر" },
    { t: "لَا إِلٰهَ إِلَّا الله" },
    { t: "أَسْتَغْفِرُ الله" },
    { t: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِالله" },
    { t: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّد" },
    { t: "سُبْحَانَ اللهِ وَبِحَمْدِه" },
    { t: "سُبْحَانَ اللهِ الْعَظِيم" },
  ];

  function tasLoad() {
    try { return JSON.parse(localStorage.getItem("nq_tasbih")) || null; } catch (e) { return null; }
  }
  let tas = tasLoad() || { i: 0, count: 0, target: 33, total: 0 };
  if (!ADHKAR[tas.i]) tas.i = 0;

  function tasSave() { localStorage.setItem("nq_tasbih", JSON.stringify(tas)); }

  function tasRender() {
    $("tasDhikr").textContent = ADHKAR[tas.i].t;
    $("tasCount").textContent = tas.count;
    $("tasTotal").textContent = tas.total.toLocaleString("ar-EG");
    $("tasTarget").textContent = tas.target === Infinity ? "∞" : tas.target;
    const pct = tas.target === Infinity ? 0 : Math.min(100, (tas.count / tas.target) * 100);
    $("tasBar").style.width = pct + "%";
  }

  window.tasTap = function () {
    tas.count++; tas.total++;
    if (navigator.vibrate) navigator.vibrate(12);
    if (tas.target !== Infinity && tas.count >= tas.target) {
      if (navigator.vibrate) navigator.vibrate([90, 60, 90]);
      tasFlash("ما شاء الله! أتممت الهدف 🌟");
      tas.count = 0;
    }
    tasSave(); tasRender();
  };

  function tasFlash(msg) {
    const f = $("tasFlash");
    f.textContent = msg;
    f.classList.add("show");
    setTimeout(() => f.classList.remove("show"), 2200);
  }

  window.tasSelect = function (sel) { tas.i = +sel.value; tas.count = 0; tasSave(); tasRender(); };
  window.tasTargetFn = function (sel) {
    tas.target = sel.value === "inf" ? Infinity : +sel.value;
    if (tas.count >= (tas.target === Infinity ? Infinity : tas.target)) tas.count = 0;
    tasSave(); tasRender();
  };
  window.tasResetCycle = function () { tas.count = 0; tasSave(); tasRender(); };
  window.tasResetAll = function () {
    if (confirm("هل تريد تصفير جميع العدادات؟")) { tas = { i: tas.i, count: 0, target: tas.target, total: 0 }; tasSave(); tasRender(); }
  };

  function tasInit() {
    $("tasDhikrSel").innerHTML = ADHKAR.map((d, i) => `<option value="${i}" ${i === tas.i ? "selected" : ""}>${d.t}</option>`).join("");
    $("tasTargetSel").innerHTML = [33, 100, 1000, 10000]
      .map(v => `<option value="${v}" ${v === tas.target ? "selected" : ""}>الهدف: ${v}</option>`).join("") +
      `<option value="inf" ${tas.target === Infinity ? "selected" : ""}>بدون هدف ∞</option>`;
    tasRender();
  }

  /* ================= 2) مواقيت الصلاة ================= */
  const PRAYERS = [
    ["Fajr", "الفجر"], ["Sunrise", "الشروق"], ["Dhuhr", "الظهر"],
    ["Asr", "العصر"], ["Maghrib", "المغرب"], ["Isha", "العشاء"],
  ];
  let prayTimer = null;

  function toMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

  function prayRender(timings) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let nextIdx = -1, nextMin = Infinity;
    const times = PRAYERS.map(([k, name]) => ({ name, time: timings[k] }));

    times.forEach((p, i) => {
      const m = toMin(p.time);
      if (m > nowMin && m < nextMin) { nextMin = m; nextIdx = i; }
    });

    $("prayGrid").innerHTML = times.map((p, i) => `
      <div class="pray-cell ${i === nextIdx ? "next" : ""}">
        <span class="pray-name">${p.name}</span>
        <span class="pray-time">${p.time}</span>
      </div>`).join("");

    clearInterval(prayTimer);
    function tick() {
      const n = new Date();
      let target;
      if (nextIdx >= 0) {
        const [h, m] = times[nextIdx].time.split(":").map(Number);
        target = new Date(n); target.setHours(h, m, 0, 0);
        $("prayNextLabel").textContent = "الصلاة القادمة: " + times[nextIdx].name;
      } else {
        target = new Date(n); target.setDate(target.getDate() + 1);
        const [h, m] = times[0].time.split(":").map(Number);
        target.setHours(h, m, 0, 0);
        $("prayNextLabel").textContent = "الصلاة القادمة: " + times[0].name + " (غدًا)";
      }
      let diff = Math.max(0, target - n);
      const hh = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const mm = String(Math.floor(diff % 3600000 / 60000)).padStart(2, "0");
      const ss = String(Math.floor(diff % 60000 / 1000)).padStart(2, "0");
      $("prayCountdown").textContent = hh + ":" + mm + ":" + ss;
    }
    tick();
    prayTimer = setInterval(tick, 1000);
  }

  function prayFetch(url) {
    $("prayStatus").textContent = "⏳ جاري جلب المواقيت…";
    fetch(url).then(r => { if (!r.ok) throw 0; return r.json(); })
      .then(j => {
        $("prayStatus").textContent = "✅ تم تحديث المواقيت";
        prayRender(j.data.timings);
      })
      .catch(() => { $("prayStatus").textContent = "⚠️ تعذر جلب المواقيت — تحقق من الإنترنت"; });
  }

  window.prayLocate = function () {
    if (!navigator.geolocation) { $("prayStatus").textContent = "⚠️ متصفحك لا يدعم تحديد الموقع — استخدم المدينة"; return; }
    $("prayStatus").textContent = "⏳ جاري تحديد موقعك…";
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: la, longitude: lo } = pos.coords;
        prayFetch(`https://api.aladhan.com/v1/timings/${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")}?latitude=${la}&longitude=${lo}&method=5`);
      },
      () => { $("prayStatus").textContent = "⚠️ تم رفض إذن الموقع — اكتب مدينتك يدويًا"; }
    );
  };

  window.prayCityGo = function () {
    const v = $("prayCity").value.trim();
    if (!v) return;
    const [city, country] = v.split(/[،,]/).map(s => s && s.trim()).concat("");
    prayFetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city || v)}&country=${encodeURIComponent(country || "")}&method=5`);
  };

  /* ================= 3) إذاعات القرآن الكريم ================= */
  const STATIONS = [
    { n: "📻 إذاعة القرآن — تلاوات منوعة", u: "https://backup.qurango.com/radio/quran" },
    { n: "🎙️ مشاري راشد العفاسي", u: "https://backup.qurango.com/radio/alafasy" },
    { n: "🎙️ عبد الباسط عبد الصمد (مجوَّد)", u: "https://backup.qurango.com/radio/abdulbasit" },
    { n: "🎙️ سعود الشريم", u: "https://backup.qurango.com/radio/saud_alshuraim" },
    { n: "🎙️ ناصر القطامي", u: "https://backup.qurango.com/radio/nasser_alqatami" },
    { n: "🎙️ إدريس أبكر", u: "https://backup.qurango.com/radio/idrees_abkar" },
    { n: "🎙️ عبد الله عواد الجهني", u: "https://backup.qurango.com/radio/abdullah_aljuhani" },
  ];
  let curStation = -1;
  const raudio = () => $("radioAudio");

  function radioRender() {
    $("radioList").innerHTML = STATIONS.map((s, i) => `
      <button class="radio-item ${i === curStation ? "active" : ""}" onclick="radioPlay(${i})">
        <span>${s.n}</span>
        <span class="radio-state">${i === curStation ? "⏸ إيقاف" : "▶ تشغيل"}</span>
      </button>`).join("");
  }

  window.radioPlay = function (i) {
    const a = raudio();
    if (curStation === i) { a.pause(); a.removeAttribute("src"); curStation = -1; $("radioStatus").textContent = "⏸ توقف البث"; radioRender(); return; }
    curStation = i;
    $("radioStatus").textContent = "⏳ جاري الاتصال بالبث…";
    a.src = STATIONS[i].u;
    a.play().then(() => {
      $("radioStatus").textContent = "🔴 بث مباشر: " + STATIONS[i].n.replace(/^\S+\s/, "");
    }).catch(() => {
      $("radioStatus").textContent = "⚠️ تعذر تشغيل البث — تحقق من الإنترنت";
      curStation = -1;
    });
    radioRender();
  };

  raudio().addEventListener("error", () => {
    if (curStation >= 0) { $("radioStatus").textContent = "⚠️ انقطع البث — جرّب إذاعة أخرى"; curStation = -1; radioRender(); }
  });

  /* ================= تشغيل ================= */
  tasInit();
  radioRender();
})();
