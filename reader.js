/* ============================================================
   reader.js — مكتبة القراءة «اقرأ» — نور القرآن
   مصحف بترقيم الصفحات المطبوعة (604) + كتب ترجمات تنقسم صفحات
   تعمل بدون إنترنت بعد أول تحميل (ملفات data/)
   ============================================================ */
(function () {
  "use strict";

  const BISMILLAH = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

  const BOOKS = {
    ar: { file: 'data/mushaf.js', v: 'MUSHAF',  name: 'المصحف الشريف',   author: 'رواية حفص • الرسم العثماني', dir: 'rtl', kind: 'mushaf', cover: 'linear-gradient(160deg,#14532d 0%,#0c1210 100%)' },
    en: { file: 'data/en.js',     v: 'TRANS_EN', name: 'The Noble Quran', author: 'Saheeh International', dir: 'ltr', kind: 'book', cover: 'linear-gradient(160deg,#1e3a5f 0%,#0c1210 100%)' },
    fr: { file: 'data/fr.js',     v: 'TRANS_FR', name: 'Le Saint Coran',  author: 'Muhammad Hamidullah', dir: 'ltr', kind: 'book', cover: 'linear-gradient(160deg,#5f1e3a 0%,#0c1210 100%)' },
    de: { file: 'data/de.js',     v: 'TRANS_DE', name: 'Der edle Quran',  author: 'Abu Rida', dir: 'ltr', kind: 'book', cover: 'linear-gradient(160deg,#3a2c12 0%,#0c1210 100%)' },
    tr: { file: 'data/tr.js',     v: 'TRANS_TR', name: 'Kur’an-ı Kerim',  author: 'Diyanet İşleri', dir: 'ltr', kind: 'book', cover: 'linear-gradient(160deg,#123a35 0%,#0c1210 100%)' },
    ur: { file: 'data/ur.js',     v: 'TRANS_UR', name: 'نور القرآن',      author: 'فتح محمد جالندہری', dir: 'rtl', kind: 'book', cover: 'linear-gradient(160deg,#2d1e5f 0%,#0c1210 100%)' },
  };

  const BOOK_PAGE_SIZE = 10; // عدد آيات صفحة كتب الترجمة
  const mem = {};
  const st = { id: null, data: null, page: 1, pages: 1, pageMap: null };
  const $ = id => document.getElementById(id);

  /* ---------- تحميل ملفات البيانات (مرة واحدة ثم من الكاش) ---------- */
  function loadBook(id) {
    return new Promise((res, rej) => {
      if (mem[id]) return res(mem[id]);
      const b = BOOKS[id];
      const s = document.createElement('script');
      s.src = b.file;
      s.onload = () => { mem[id] = window[b.v]; res(mem[id]); };
      s.onerror = () => rej(new Error('data'));
      document.head.appendChild(s);
    });
  }

  function getPos() { try { return JSON.parse(localStorage.getItem('nq_read_pos') || '{}'); } catch (e) { return {}; } }
  function savePos() { const p = getPos(); p[st.id] = st.page; localStorage.setItem('nq_read_pos', JSON.stringify(p)); }

  /* ---------- المكتبة (الأغلفة) ---------- */
  function renderLibrary() {
    $('bookSel').innerHTML = Object.entries(BOOKS).map(([id, b]) =>
      `<option value="${id}">📖 ${b.name}</option>`).join('');
    $('libraryGrid').innerHTML = Object.entries(BOOKS).map(([id, b]) => `
      <div class="book-cover" style="background:${b.cover}" onclick="openBook('${id}')">
        <div class="book-cover-inner" dir="${b.dir}">
          <div class="book-cover-name">${b.name}</div>
          <div class="book-cover-author">${b.author}</div>
        </div>
        <div class="book-cover-brand">نور القرآن</div>
      </div>`).join('');
  }

  /* ---------- فتح الكتاب ---------- */
  window.openBook = async function (id) {
    const b = BOOKS[id];
    st.id = id;
    $('bookOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    $('bookSel').value = id;
    $('bookPage').innerHTML = `<p class="book-loading">جاري فتح الكتاب…<br><small>(أول مرة يحتاج اتصالاً بالإنترنت، بعدها يعمل بدون نت)</small></p>`;
    try {
      if (!st.data || st.bookKey !== id) {
        st.data = await loadBook(id);
        st.bookKey = id;
        st.pageMap = null;
      }
      st.pages = b.kind === 'mushaf' ? 604 : Math.ceil(st.data.ayahs.length / BOOK_PAGE_SIZE);
      const saved = getPos()[id];
      st.page = (saved >= 1 && saved <= st.pages) ? saved : 1;
      fillSurahSelect();
      renderPage();
    } catch (e) {
      $('bookPage').innerHTML = `<p class="book-loading">⚠️ تعذر تحميل ملفات الكتاب.<br>تأكد من رفع مجلد <b>data/</b> على الموقع (خطوة التحميل).</p>`;
    }
  };

  window.closeBook = function () {
    $('bookOverlay').classList.remove('open');
    document.body.style.overflow = '';
  };

  window.switchBook = function (sel) { openBook(sel.value); };

  /* ---------- قوائم السور ---------- */
  function fillSurahSelect() {
    $('bookSurahSel').innerHTML = st.data.surahs.map(s =>
      `<option value="${s.n}">${s.n}. ${s.name.replace('سُورَةُ ', '')}</option>`).join('');
  }

  window.goSurah = function (sel) {
    const sn = +sel.value;
    if (BOOKS[st.id].kind === 'mushaf') {
      const first = st.data.ayahs.find(x => x.s === sn);
      if (first) { st.page = first.p; renderPage(); }
    } else {
      const idx = st.data.ayahs.findIndex(x => x.s === sn);
      if (idx >= 0) { st.page = Math.floor(idx / BOOK_PAGE_SIZE) + 1; renderPage(); }
    }
    sel.value = '';
  };

  /* ---------- عرض الصفحة ---------- */
  function surahBanner(name) {
    return `<div class="bsurah"><span class="bsurah-frame">${name.replace('سُورَةُ ', 'سُورَةُ ')}</span></div>`;
  }

  function renderPage() {
    const b = BOOKS[st.id];
    let html = '';

    if (b.kind === 'mushaf') {
      if (!st.pageMap) {
        st.pageMap = {};
        for (const a of st.data.ayahs) { (st.pageMap[a.p] = st.pageMap[a.p] || []).push(a); }
      }
      const items = st.pageMap[st.page] || [];
      let lastS = 0;
      for (const a of items) {
        if (a.s !== lastS) {
          html += surahBanner(st.data.surahs[a.s - 1].name);
          if (a.s !== 1 && a.s !== 9 && a.a === 1) {
            html += `<div class="bbismillah">${BISMILLAH}</div>`;
          }
          lastS = a.s;
        }
        let t = a.t;
        if (a.s !== 1 && a.a === 1 && t.indexOf(BISMILLAH) === 0) {
          t = t.replace(BISMILLAH, '').trim();
        }
        html += `<span class="bayah">${t} <span class="bayah-num">${a.a}</span></span> `;
      }
    } else {
      const start = (st.page - 1) * BOOK_PAGE_SIZE;
      const items = st.data.ayahs.slice(start, start + BOOK_PAGE_SIZE);
      let lastS = 0;
      for (const a of items) {
        if (a.s !== lastS) {
          const sr = st.data.surahs[a.s - 1];
          html += `<div class="btrans-surah">${sr.ename} — ${sr.name.replace('سُورَةُ ', '')}</div>`;
          lastS = a.s;
        }
        html += `<div class="btrans-ayah"><span class="bayah-num">${a.a}</span><p>${a.t}</p></div>`;
      }
    }

    $('bookPage').innerHTML = html || '<p class="book-loading">صفحة فارغة</p>';
    $('bookPage').setAttribute('dir', b.dir);
    $('bookPageNum').textContent = `${st.page} / ${st.pages}`;
    $('bookJump').value = st.page;
    $('bookPrev').disabled = st.page <= 1;
    $('bookNext').disabled = st.page >= st.pages;
    savePos();
    $('bookStage').scrollTop = 0;
  }

  window.bookPrev = function () { if (st.page > 1) { st.page--; renderPage(); } };
  window.bookNext = function () { if (st.page < st.pages) { st.page++; renderPage(); } };
  window.bookJumpGo = function (inp) {
    let p = parseInt(inp.value, 10);
    if (isNaN(p)) p = 1;
    st.page = Math.min(Math.max(p, 1), st.pages);
    renderPage();
  };

  document.addEventListener('keydown', e => {
    if (!$('bookOverlay').classList.contains('open')) return;
    if (e.key === 'Escape') closeBook();
    if (e.key === 'ArrowLeft') bookNext();   // RTL: اليسار = التالي
    if (e.key === 'ArrowRight') bookPrev();
  });

  renderLibrary();
})();
