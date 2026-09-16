/* ============================================================
   download-data.js — نور القرآن
   شغّل مرة واحدة:  node download-data.js
   بينزّل المصحف والترجمات من الـ API ويحفظها كملفات داخل مجلد data/
   (بعدها الموقع يشتغل بدون نت للقراءة)
   ============================================================ */
const fs = require('fs');
const path = require('path');

const EDITIONS = [
  { id: 'quran-uthmani', file: 'mushaf.js',  varName: 'MUSHAF',  mushaf: true  },
  { id: 'en.sahih',      file: 'en.js',      varName: 'TRANS_EN' },
  { id: 'fr.hamidullah', file: 'fr.js',      varName: 'TRANS_FR' },
  { id: 'de.aburida',    file: 'de.js',      varName: 'TRANS_DE' },
  { id: 'tr.diyanet',    file: 'tr.js',      varName: 'TRANS_TR' },
  { id: 'ur.jalandhry',  file: 'ur.js',      varName: 'TRANS_UR' },
];

(async () => {
  fs.mkdirSync('data', { recursive: true });
  for (const e of EDITIONS) {
    const url = `https://api.alquran.cloud/v1/quran/${e.id}`;
    process.stdout.write(`⬇️  جاري تنزيل ${e.id} ... `);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const surahs = j.data.surahs.map(s => ({
        n: s.number, name: s.name, ename: s.englishName, ayahs: s.numberOfAyahs
      }));
      const ayahs = [];
      for (const s of j.data.surahs) {
        for (const a of s.ayahs) {
          const o = { n: a.number, s: s.number, a: a.numberInSurah, t: a.text };
          if (e.mushaf) o.p = a.page; // رقم صفحة المصحف المطبوع (1-604)
          ayahs.push(o);
        }
      }
      const out = `/* ${e.id} — نور القرآن */\nwindow.${e.varName}=${JSON.stringify({ surahs, ayahs })};`;
      fs.writeFileSync(path.join('data', e.file), out);
      console.log(`✓  ${e.file}  (${(out.length / 1024 / 1024).toFixed(2)} MB)`);
    } catch (err) {
      console.log(`✗ فشل (${err.message}) — تأكد من الإنترنت وأعد المحاولة`);
      process.exit(1);
    }
  }
  console.log('\n✅ تم! دلوقتي ارفع مجلد data/ بالكامل على GitHub (في جذر المستودع).');
})();
