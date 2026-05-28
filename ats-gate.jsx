import React, { useState, useRef, useEffect } from "react";

// ============================================================
// ATS GATE — AI + heuristic ATS Compatibility Checker
// Career Toolkit suite. Same architecture. Accent: coral-red.
// Checks: overall ATS score, parseability/format issues,
// structure (contact, sections, dates), job keyword match.
// The local engine is deterministic and works fully offline.
// ============================================================

const API_HOST = "https://api.anthropic.com/v1/messages";
const inClaudeAI = typeof window !== "undefined" && /claude\.ai|anthropic/.test(window.location?.hostname || "");

const T = {
  ro: {
    brand: "ATS GATE", tagline: "Verificator de compatibilitate ATS",
    intro: "Lipește CV-ul (și opțional anunțul de job). Verific cum îl „vede” un sistem ATS: parsabilitate, structură, cuvinte-cheie — și ce să repari.",
    cvTab: "CV", jobTab: "Anunț job (opțional)",
    cvPlaceholder: "Lipește aici CV-ul tău (sau încarcă PDF mai jos)…",
    jobPlaceholder: "Lipește anunțul pentru potrivirea cu cuvintele-cheie…",
    upload: "Încarcă PDF",
    run: "Verifică ATS", running: "Se verifică…",
    steps: ["Se parsează documentul…", "Se verifică structura…", "Se evaluează formatul…", "Se compară cuvintele-cheie…"],
    overall: "Scor ATS", verdict: "Verdict",
    sectionsTitle: "Verificări", parseTitle: "Parsabilitate & format", structTitle: "Structură", kwTitle: "Potrivire cuvinte-cheie",
    pass: "OK", warn: "Atenție", fail: "Problemă",
    matched: "Găsite", missing: "Lipsă", kwScore: "Acoperire",
    fixTitle: "De reparat", reset: "Începe din nou", noInput: "Adaugă CV-ul.", tryDemo: "Încearcă cu un CV demo",
    history: "Istoric", historyEmpty: "Nimic salvat încă.", open: "Deschide", del: "Șterge", clearAll: "Șterge tot",
    savedNote: "Salvat automat pe acest dispozitiv", poweredLive: "Analiză live prin Claude", poweredLocal: "Motor local determinist · fără cost",
    errorTitle: "Ceva n-a mers", errorBody: "Încearcă din nou.",
    checks: {
      contact: "Date de contact", email: "Email prezent", phone: "Telefon prezent",
      sections: "Secțiuni standard", dates: "Date / perioade", length: "Lungime potrivită",
      bullets: "Bullet points", columns: "Fără coloane multiple", tables: "Fără tabele/grafice",
      fonts: "Text simplu (fără simboluri exotice)", headers: "Titluri recognoscibile", verbs: "Verbe de acțiune",
    },
  },
  en: {
    brand: "ATS GATE", tagline: "ATS compatibility checker",
    intro: "Paste your CV (and optionally the job post). I check how an ATS \"sees\" it: parseability, structure, keywords — and what to fix.",
    cvTab: "CV", jobTab: "Job post (optional)",
    cvPlaceholder: "Paste your CV here (or upload a PDF below)…",
    jobPlaceholder: "Paste the job post for keyword matching…",
    upload: "Upload PDF",
    run: "Check ATS", running: "Checking…",
    steps: ["Parsing the document…", "Checking structure…", "Assessing format…", "Comparing keywords…"],
    overall: "ATS score", verdict: "Verdict",
    sectionsTitle: "Checks", parseTitle: "Parseability & format", structTitle: "Structure", kwTitle: "Keyword match",
    pass: "OK", warn: "Warning", fail: "Issue",
    matched: "Matched", missing: "Missing", kwScore: "Coverage",
    fixTitle: "To fix", reset: "Start over", noInput: "Add your CV.", tryDemo: "Try with a demo CV",
    history: "History", historyEmpty: "Nothing saved yet.", open: "Open", del: "Delete", clearAll: "Clear all",
    savedNote: "Auto-saved on this device", poweredLive: "Live analysis via Claude", poweredLocal: "Deterministic local engine · no cost",
    errorTitle: "Something went wrong", errorBody: "Try again.",
    checks: {
      contact: "Contact details", email: "Email present", phone: "Phone present",
      sections: "Standard sections", dates: "Dates / periods", length: "Reasonable length",
      bullets: "Bullet points", columns: "No multi-columns", tables: "No tables/graphics",
      fonts: "Plain text (no exotic symbols)", headers: "Recognizable headings", verbs: "Action verbs",
    },
  },
};

const DEMO_CV =
  "Laura Andreea\nFront-End Developer\nlaura@example.com · +40 712 345 678 · github.com/LaurAndreea10\n\nSUMMARY\nSelf-taught front-end developer with a CRM and digital marketing background.\n\nEXPERIENCE\nFront-End Developer — Independent (2023–present)\n- Built 60+ bilingual web apps deployed on GitHub Pages\n- Developed ClientOps Suite with React, Vite and Tailwind\n- Reduced load times and improved UX across projects\n\nSKILLS\nReact, Vite, Tailwind, Recharts, Git, REST APIs, SEO\n\nEDUCATION\nSelf-directed learning — front-end development\n\nCERTIFICATIONS\nGoogle, freeCodeCamp, Anthropic, LinkedIn Learning";
const DEMO_JOB =
  "Hiring a React Developer. Required: React, Git, REST APIs, TypeScript, modern CSS. Nice to have: Tailwind, SEO, dashboards.";

function clamp(n) { const v = Math.round(Number(n) || 0); return Math.max(0, Math.min(100, v)); }
function scoreColor(n) { if (n >= 80) return "#4ade80"; if (n >= 60) return "#ffd166"; if (n >= 40) return "#ff9e3d"; return "#ff5a5a"; }

// ---- shared helpers -----------------------------------------

function fileToBase64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = () => rej(new Error("read failed")); r.readAsDataURL(file); }); }
const PDFJS_VER = "3.11.174";
let _pdfjsPromise = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.min.js`;
    s.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.worker.min.js`; res(window.pdfjsLib); } catch (e) { rej(e); } };
    s.onerror = () => rej(new Error("pdf.js failed"));
    document.head.appendChild(s);
  });
  return _pdfjsPromise;
}
async function extractPdfText(file) {
  const lib = await loadPdfJs(); const buf = await file.arrayBuffer(); const pdf = await lib.getDocument({ data: buf }).promise;
  let out = ""; const max = Math.min(pdf.numPages, 6);
  for (let p = 1; p <= max; p++) { const page = await pdf.getPage(p); const tc = await page.getTextContent(); out += tc.items.map((it) => it.str).join(" ") + "\n"; }
  return out.trim();
}

const HKEY = "atsgate:history";
let _mem = [];
const store = {
  async load() {
    try { if (window.storage?.get) { const r = await window.storage.get(HKEY); return r?.value ? JSON.parse(r.value) : []; } } catch (e) {}
    try { if (typeof localStorage !== "undefined") { const raw = localStorage.getItem(HKEY); return raw ? JSON.parse(raw) : []; } } catch (e) {}
    return [..._mem];
  },
  async save(list) {
    const j = JSON.stringify(list); _mem = list;
    try { if (window.storage?.set) { await window.storage.set(HKEY, j); return; } } catch (e) {}
    try { if (typeof localStorage !== "undefined") localStorage.setItem(HKEY, j); } catch (e) {}
  },
};

async function callClaude(content, maxTokens = 1400) {
  const resp = await fetch(API_HOST, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages: [{ role: "user", content }] }) });
  const data = await resp.json();
  const raw = data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

// ---- deterministic ATS engine (works offline) ---------------

function extractKeywords(jd) {
  const stop = new Set("the a an and or for with to of in on at is are be we you our your role job experience years team work will must should have has able strong good plus nice to have required și sau pentru cu de la în pe este sunt vei trebuie ani echipă rol".split(/\s+/));
  const freq = {};
  (jd.toLowerCase().match(/[a-zăâîșț+#.]{3,}/gi) || []).forEach((w) => { const c = w.replace(/[.]+$/, ""); if (!stop.has(c) && c.length >= 3) freq[c] = (freq[c] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);
}

function atsAnalyze(cv, job, lang) {
  const L = lang === "ro";
  const text = cv || "";
  const low = text.toLowerCase();
  const lines = text.split("\n").filter((l) => l.trim());
  const words = text.split(/\s+/).filter(Boolean);
  const wc = words.length;

  const mk = (id, status, hint) => ({ id, status, hint });

  // --- parseability / format ---
  const parse = [];
  const exotic = (text.match(/[★☆►▶◆●■♦✦✧➤➔⬤]/g) || []).length;
  parse.push(mk("fonts", exotic > 2 ? "fail" : exotic > 0 ? "warn" : "pass",
    L ? "Evită simboluri grafice — ATS le poate citi greșit. Folosește bullet-uri simple (•/-)." : "Avoid graphic symbols — ATS may misread them. Use simple bullets (•/-)."));
  // multi-column heuristic: many lines with 2+ big gaps
  const colLines = lines.filter((l) => /\S\s{4,}\S/.test(l)).length;
  parse.push(mk("columns", colLines > lines.length * 0.3 ? "fail" : colLines > 2 ? "warn" : "pass",
    L ? "Layout pe mai multe coloane încurcă parserele. Folosește o singură coloană." : "Multi-column layouts confuse parsers. Use a single column."));
  const tableish = /\|\s*\S+\s*\|/.test(text) || (text.match(/\t/g) || []).length > 5;
  parse.push(mk("tables", tableish ? "fail" : "pass",
    L ? "Tabelele și taburile pot rupe ordinea textului în ATS." : "Tables and tabs can break text order in ATS."));
  const bullets = (text.match(/^[\s]*[•\-*▪]/gm) || []).length;
  parse.push(mk("bullets", bullets >= 3 ? "pass" : bullets >= 1 ? "warn" : "fail",
    L ? "Folosește bullet points pentru responsabilități/realizări." : "Use bullet points for responsibilities/achievements."));

  // --- structure ---
  const struct = [];
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  struct.push(mk("email", hasEmail ? "pass" : "fail", L ? "Adaugă o adresă de email vizibilă." : "Add a visible email address."));
  const hasPhone = /(\+?\d[\d\s().-]{7,})/.test(text);
  struct.push(mk("phone", hasPhone ? "pass" : "warn", L ? "Un număr de telefon ajută la contact." : "A phone number helps recruiters reach you."));
  const secMap = { experience: ["experience", "experiență", "experienta"], education: ["education", "educație", "educatie", "studii"], skills: ["skills", "competențe", "competente", "abilități"] };
  const foundSecs = Object.keys(secMap).filter((k) => secMap[k].some((s) => low.includes(s)));
  struct.push(mk("sections", foundSecs.length >= 3 ? "pass" : foundSecs.length >= 2 ? "warn" : "fail",
    L ? "Folosește titluri standard: Experiență, Educație, Competențe." : "Use standard headings: Experience, Education, Skills."));
  const dates = (text.match(/\b(19|20)\d{2}\b/g) || []).length;
  struct.push(mk("dates", dates >= 2 ? "pass" : dates >= 1 ? "warn" : "fail",
    L ? "Include perioade clare (ani) pentru fiecare rol." : "Include clear date ranges (years) for each role."));
  struct.push(mk("length", wc >= 200 && wc <= 900 ? "pass" : wc < 200 ? "warn" : "warn",
    L ? `~${wc} cuvinte. Ideal 250-700 pentru 1-2 pagini.` : `~${wc} words. Aim for 250-700 across 1-2 pages.`));
  const verbs = ["led", "built", "created", "designed", "managed", "developed", "improved", "increased", "reduced", "delivered", "condus", "construit", "creat", "dezvoltat", "gestionat", "îmbunătățit"];
  const verbHits = verbs.filter((v) => low.includes(v)).length;
  struct.push(mk("verbs", verbHits >= 3 ? "pass" : verbHits >= 1 ? "warn" : "fail",
    L ? "Începe bullet-urile cu verbe de acțiune (am construit, am condus…)." : "Start bullets with action verbs (built, led, designed…)."));

  // --- keyword match ---
  let kw = null;
  if (job && job.trim().length > 15) {
    const kws = extractKeywords(job);
    const matched = kws.filter((k) => low.includes(k));
    const missing = kws.filter((k) => !low.includes(k));
    kw = { score: kws.length ? clamp((matched.length / kws.length) * 100) : 0, matched: matched.slice(0, 10), missing: missing.slice(0, 10) };
  }

  // --- scoring ---
  const scoreOf = (arr) => { const w = { pass: 1, warn: 0.5, fail: 0 }; return arr.reduce((s, c) => s + w[c.status], 0) / arr.length; };
  const parseScore = scoreOf(parse) * 100;
  const structScore = scoreOf(struct) * 100;
  const kwScore = kw ? kw.score : null;
  const overall = clamp(kw ? parseScore * 0.35 + structScore * 0.35 + kwScore * 0.3 : parseScore * 0.5 + structScore * 0.5);

  const verdict = L
    ? overall >= 80 ? "CV-ul trece bine prin majoritatea sistemelor ATS." : overall >= 60 ? "Trece, dar câteva ajustări reduc riscul de respingere automată." : "Risc mare de respingere automată — repară problemele de mai jos."
    : overall >= 80 ? "Your CV passes most ATS systems well." : overall >= 60 ? "It passes, but a few fixes lower the auto-reject risk." : "High auto-reject risk — fix the issues below.";

  // top fixes = failing/warning checks
  const allChecks = [...parse, ...struct];
  const fixes = allChecks.filter((c) => c.status !== "pass").sort((a, b) => (a.status === "fail" ? -1 : 1)).slice(0, 5).map((c) => c.hint);
  if (kw && kw.missing.length) fixes.push(L ? `Integrează cuvinte-cheie lipsă: ${kw.missing.slice(0, 5).join(", ")}.` : `Weave in missing keywords: ${kw.missing.slice(0, 5).join(", ")}.`);

  return { overall, verdict, parse, struct, keyword: kw, fixes };
}

// ---- UI atoms -----------------------------------------------

function Ring({ value, size = 124 }) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r, off = c - (value / 100) * c, col = scoreColor(value);
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 8px ${col}88)` }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill={col} style={{ font: "700 1.95rem 'JetBrains Mono', monospace" }}>{value}</text>
    </svg>
  );
}

const STATUS_ICON = { pass: "✓", warn: "!", fail: "✕" };

function CheckRow({ c, label, statusLabels }) {
  return (
    <div className={`ag-check ${c.status}`}>
      <span className="ag-dot">{STATUS_ICON[c.status]}</span>
      <div>
        <div className="ag-check-head"><strong>{label}</strong><span className={`ag-stat ${c.status}`}>{statusLabels[c.status]}</span></div>
        {c.status !== "pass" && <p>{c.hint}</p>}
      </div>
    </div>
  );
}

// ---- main ---------------------------------------------------

export default function ATSGate() {
  const [lang, setLang] = useState("ro");
  const [view, setView] = useState("input");
  const [cv, setCv] = useState(""); const [job, setJob] = useState("");
  const [tab, setTab] = useState("cv");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const [hist_, setHist_] = useState([]); const [showHist, setShowHist] = useState(false);
  useEffect(() => { store.load().then(setHist_); }, []);

  const t = T[lang]; const live = inClaudeAI;
  const canRun = cv.trim().length > 25;

  async function onPdf(f) { if (!f || f.type !== "application/pdf") return; try { const txt = await extractPdfText(f); if (txt) { setCv(txt); setTab("cv"); } } catch (e) { console.warn(e); } }
  async function pushHistory(entry) { const item = { id: Date.now(), ts: new Date().toISOString(), lang, ...entry }; const next = [item, ...hist_].slice(0, 30); setHist_(next); await store.save(next); }
  async function deleteHistory(id) { const n = hist_.filter((h) => h.id !== id); setHist_(n); await store.save(n); }
  async function clearHistory() { setHist_([]); await store.save([]); }

  async function run() {
    if (!canRun) return;
    setView("loading"); setStep(0);
    const timer = setInterval(() => setStep((s) => (s + 1) % t.steps.length), 1300);
    try {
      // Always run the deterministic engine — ATS checks are objective.
      const base = atsAnalyze(cv, job, lang);
      let out = base;
      if (live) {
        // Augment the verdict/fixes with AI judgment, keeping deterministic checks.
        try {
          const langName = lang === "ro" ? "Romanian" : "English";
          const ai = await callClaude([{ type: "text", text:
            `You are an ATS expert. Given this CV${job ? " and job post" : ""}, write in ${langName} a sharp verdict and up to 5 prioritized fixes for ATS compatibility. Respond with ONLY JSON: {"verdict":"...","fixes":["..",".."]}\n\nCV:\n${cv}${job ? `\n\nJOB:\n${job}` : ""}` }], 700);
          out = { ...base, verdict: ai.verdict || base.verdict, fixes: (ai.fixes && ai.fixes.length ? ai.fixes : base.fixes) };
        } catch (e) { /* keep deterministic result */ }
      } else { await new Promise((r) => setTimeout(r, 1100)); }
      setResult(out); setView("result");
      pushHistory({ overall: out.overall, result: out, preview: out.verdict?.slice(0, 80) || "" });
    } catch (e) { console.error(e); setView("error"); }
    finally { clearInterval(timer); }
  }

  function reset() { setView("input"); setResult(null); setCv(""); setJob(""); }
  function openHistory(item) { setResult(item.result); setShowHist(false); setView("result"); }

  return (
    <div className="ag-root" data-lang={lang}>
      <style>{CSS}</style>
      <div className="ag-grid" /><div className="ag-glow ag-glow-a" /><div className="ag-glow ag-glow-b" />
      <header className="ag-header">
        <div className="ag-brand"><span className="ag-logo">⊟</span><div><h1>{t.brand}</h1><p>{t.tagline}</p></div></div>
        <div className="ag-hr">
          <span className={`ag-pill ${live ? "live" : "local"}`}>{live ? "● LIVE AI" : "● LOCAL"}</span>
          <button className="ag-lang" onClick={() => setShowHist(true)}>⧉ {t.history}{hist_.length > 0 && <span className="ag-badge">{hist_.length}</span>}</button>
          <button className="ag-lang" onClick={() => setLang((l) => (l === "ro" ? "en" : "ro"))}>{lang === "ro" ? "EN" : "RO"}</button>
        </div>
      </header>

      <main className="ag-main">
        {view === "input" && (
          <section className="ag-fade">
            <p className="ag-intro">{t.intro}</p>
            <div className="ag-panel">
              <div className="ag-tabs">
                <button className={tab === "cv" ? "on" : ""} onClick={() => setTab("cv")}>{t.cvTab}</button>
                <button className={tab === "job" ? "on" : ""} onClick={() => setTab("job")}>{t.jobTab}</button>
              </div>
              {tab === "cv" ? (
                <>
                  <textarea className="ag-ta" rows={9} placeholder={t.cvPlaceholder} value={cv} onChange={(e) => setCv(e.target.value)} />
                  <input ref={inputRef} type="file" accept=".pdf" hidden onChange={(e) => onPdf(e.target.files?.[0])} />
                  <button className="ag-upload" onClick={() => inputRef.current?.click()}>⬆ {t.upload}</button>
                </>
              ) : (
                <textarea className="ag-ta" rows={9} placeholder={t.jobPlaceholder} value={job} onChange={(e) => setJob(e.target.value)} />
              )}
              <button className="ag-run" disabled={!canRun} onClick={run}>{t.run} <span>→</span></button>
              {!canRun && (<><p className="ag-muted">{t.noInput}</p><button className="ag-demo" onClick={() => { setCv(DEMO_CV); setJob(DEMO_JOB); }}>{t.tryDemo}</button></>)}
            </div>
          </section>
        )}

        {view === "loading" && (<section className="ag-loading"><div className="ag-scan"><div className="ag-scan-bar" /></div><p className="ag-step">{t.steps[step]}</p><span className="ag-muted">{live ? t.poweredLive : t.poweredLocal}</span></section>)}
        {view === "error" && (<section className="ag-error"><h2>{t.errorTitle}</h2><p>{t.errorBody}</p><button className="ag-run" onClick={reset}>{t.reset}</button></section>)}

        {view === "result" && result && (
          <section className="ag-fade">
            <div className="ag-overall">
              <Ring value={clamp(result.overall)} />
              <div><span className="ag-eyebrow">{t.overall}</span><p className="ag-verdict">{result.verdict}</p></div>
            </div>

            {result.fixes?.length > 0 && (
              <div className="ag-card ag-fixes">
                <span className="ag-eyebrow">{t.fixTitle}</span>
                <ul className="ag-fix-list">{result.fixes.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
            )}

            <div className="ag-card">
              <span className="ag-eyebrow">{t.parseTitle}</span>
              <div className="ag-checks">{result.parse.map((c, i) => <CheckRow key={i} c={c} label={t.checks[c.id] || c.id} statusLabels={{ pass: t.pass, warn: t.warn, fail: t.fail }} />)}</div>
            </div>

            <div className="ag-card">
              <span className="ag-eyebrow">{t.structTitle}</span>
              <div className="ag-checks">{result.struct.map((c, i) => <CheckRow key={i} c={c} label={t.checks[c.id] || c.id} statusLabels={{ pass: t.pass, warn: t.warn, fail: t.fail }} />)}</div>
            </div>

            {result.keyword && (
              <div className="ag-card">
                <div className="ag-kw-head"><span className="ag-eyebrow" style={{ margin: 0 }}>{t.kwTitle}</span><strong style={{ color: scoreColor(clamp(result.keyword.score)), fontFamily: "'JetBrains Mono',monospace" }}>{clamp(result.keyword.score)}%</strong></div>
                <div className="ag-kw-grid">
                  <div><small className="ag-kw-lbl ok">{t.matched}</small><div className="ag-kws">{result.keyword.matched.map((k, i) => <span key={i} className="ag-kw ok">{k}</span>)}</div></div>
                  <div><small className="ag-kw-lbl miss">{t.missing}</small><div className="ag-kws">{result.keyword.missing.map((k, i) => <span key={i} className="ag-kw miss">{k}</span>)}</div></div>
                </div>
              </div>
            )}

            <button className="ag-ghost" onClick={reset}>↺ {t.reset}</button>
          </section>
        )}
      </main>

      <div className={`ag-ov ${showHist ? "open" : ""}`} onClick={() => setShowHist(false)} />
      <aside className={`ag-drawer ${showHist ? "open" : ""}`}>
        <div className="ag-drawer-top"><span className="ag-eyebrow" style={{ margin: 0 }}>{t.history}</span><button className="ag-close" onClick={() => setShowHist(false)}>✕</button></div>
        {hist_.length === 0 ? <p className="ag-muted">{t.historyEmpty}</p> : (
          <>
            <div className="ag-hist-list">
              {hist_.map((h) => (
                <div key={h.id} className="ag-hist-item">
                  <div className="ag-hist-meta"><span className="ag-hist-prev">{h.preview}</span><span className="ag-hist-score" style={{ color: scoreColor(h.overall) }}>{h.overall}</span></div>
                  <span className="ag-hist-date">{new Date(h.ts).toLocaleDateString()}</span>
                  <div className="ag-hist-act"><button onClick={() => openHistory(h)}>{t.open}</button><button className="del" onClick={() => deleteHistory(h.id)}>{t.del}</button></div>
                </div>
              ))}
            </div>
            <button className="ag-clear" onClick={clearHistory}>{t.clearAll}</button>
            <p className="ag-muted" style={{ fontSize: ".72rem" }}>{t.savedNote}</p>
          </>
        )}
      </aside>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=JetBrains+Mono:wght@400;700&family=Outfit:wght@300;400;500;600&display=swap');
.ag-root{--bg:#0f0605;--panel:rgba(30,14,12,0.72);--line:rgba(255,90,90,0.16);--txt:#f5e8e6;--mut:#a88a86;--rd:#ff5a5a;--rd2:#ff7a45;position:relative;min-height:100vh;background:var(--bg);color:var(--txt);font-family:'Outfit',sans-serif;overflow-x:hidden;padding-bottom:80px;}
.ag-root *{box-sizing:border-box;}
.ag-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,90,90,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,90,90,.03) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,#000,transparent);pointer-events:none;}
.ag-glow{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;}
.ag-glow-a{width:520px;height:520px;background:#ff7a45;top:-180px;right:-120px;opacity:.22;}
.ag-glow-b{width:460px;height:460px;background:#c2410c;bottom:-160px;left:-140px;opacity:.2;}
.ag-header{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:26px clamp(20px,5vw,64px);}
.ag-brand{display:flex;gap:14px;align-items:center;}
.ag-logo{font-size:1.7rem;color:var(--rd);filter:drop-shadow(0 0 10px var(--rd));}
.ag-brand h1{margin:0;font-family:'Fraunces',serif;font-weight:900;font-size:1.45rem;letter-spacing:.04em;}
.ag-brand p{margin:0;font-size:.78rem;color:var(--mut);}
.ag-hr{display:flex;align-items:center;gap:12px;}
.ag-pill{font-family:'JetBrains Mono',monospace;font-size:.66rem;letter-spacing:.1em;padding:5px 10px;border-radius:8px;border:1px solid var(--line);}
.ag-pill.live{color:var(--rd);border-color:rgba(255,90,90,.4);}.ag-pill.local{color:var(--mut);}
.ag-lang{background:transparent;border:1px solid var(--line);color:var(--rd);font-family:'JetBrains Mono',monospace;font-size:.8rem;padding:8px 14px;border-radius:10px;cursor:pointer;transition:.25s;}
.ag-lang:hover{background:rgba(255,90,90,.08);}
.ag-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:6px;background:var(--rd);color:#2a0808;border-radius:9px;font-size:.68rem;font-weight:700;}
.ag-main{position:relative;z-index:2;max-width:760px;margin:0 auto;padding:0 clamp(20px,5vw,40px);}
.ag-fade{animation:rise .5s ease both;}
.ag-intro{font-size:clamp(1.05rem,2.4vw,1.3rem);line-height:1.5;max-width:600px;margin:24px 0 28px;font-weight:300;}
.ag-intro::first-line{color:var(--rd);}
.ag-panel{background:var(--panel);backdrop-filter:blur(16px);border:1px solid var(--line);border-radius:20px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.4);}
.ag-tabs{display:flex;gap:6px;margin-bottom:16px;background:rgba(0,0,0,.3);padding:5px;border-radius:12px;width:fit-content;}
.ag-tabs button{background:transparent;border:none;color:var(--mut);padding:8px 16px;border-radius:8px;cursor:pointer;font-family:'Outfit';font-size:.88rem;transition:.2s;}
.ag-tabs button.on{background:rgba(255,90,90,.14);color:var(--rd);}
.ag-ta{width:100%;background:rgba(0,0,0,.28);border:1px solid var(--line);border-radius:14px;color:var(--txt);padding:16px;font-family:'Outfit';font-size:.95rem;resize:vertical;line-height:1.5;}
.ag-ta:focus{outline:none;border-color:var(--rd);}
.ag-ta::placeholder{color:var(--mut);}
.ag-upload{margin-top:10px;background:transparent;border:1px dashed var(--line);color:var(--rd);padding:9px 16px;border-radius:11px;cursor:pointer;font-family:'Outfit';font-size:.85rem;transition:.2s;}
.ag-upload:hover{background:rgba(255,90,90,.06);}
.ag-run{width:100%;margin-top:20px;background:linear-gradient(95deg,var(--rd),var(--rd2));color:#2a0808;border:none;padding:16px;border-radius:14px;font-family:'Outfit';font-weight:600;font-size:1.02rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:.25s;}
.ag-run:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 30px rgba(255,90,90,.3);}
.ag-run:disabled{opacity:.35;cursor:not-allowed;}
.ag-run:hover:not(:disabled) span{transform:translateX(4px);}
.ag-muted{text-align:center;color:var(--mut);font-size:.82rem;margin:10px 0 0;}
.ag-demo{display:block;margin:12px auto 0;background:transparent;border:1px dashed var(--line);color:var(--rd);padding:9px 18px;border-radius:11px;cursor:pointer;font-family:'Outfit';font-size:.85rem;}
.ag-demo:hover{background:rgba(255,90,90,.06);}
.ag-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:48vh;gap:22px;animation:rise .4s ease both;}
.ag-scan{position:relative;width:120px;height:150px;border:1.5px solid var(--line);border-radius:8px;background:rgba(255,90,90,.03);overflow:hidden;}
.ag-scan::before{content:"";position:absolute;left:14px;right:14px;top:20px;height:7px;border-radius:4px;background:rgba(255,90,90,.14);box-shadow:0 16px 0 rgba(255,90,90,.14),0 32px 0 rgba(255,90,90,.1),0 48px 0 rgba(255,90,90,.1),0 64px 0 rgba(255,90,90,.07);}
.ag-scan-bar{position:absolute;left:-4px;right:-4px;height:2px;background:var(--rd);box-shadow:0 0 16px var(--rd);animation:scan 1.7s ease-in-out infinite;z-index:2;}
.ag-step{font-family:'JetBrains Mono',monospace;color:var(--rd);font-size:.92rem;}
.ag-error{text-align:center;padding:60px 20px;}
.ag-error h2{font-family:'Fraunces',serif;color:var(--rd2);}
.ag-error p{color:var(--mut);margin-bottom:24px;}
.ag-overall{display:flex;align-items:center;gap:24px;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:24px;margin:14px 0;animation:rise .4s ease both;}
.ag-overall>div{flex:1;min-width:200px;}
.ag-verdict{font-family:'Fraunces',serif;font-size:clamp(1.15rem,2.6vw,1.45rem);line-height:1.35;font-weight:600;margin:8px 0 0;}
.ag-card{background:var(--panel);backdrop-filter:blur(16px);border:1px solid var(--line);border-radius:18px;padding:22px;margin-bottom:14px;}
.ag-eyebrow{display:block;font-family:'JetBrains Mono',monospace;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);margin-bottom:16px;}
.ag-fixes{border-color:rgba(255,158,61,.3);}
.ag-fix-list{margin:0;padding-left:18px;}
.ag-fix-list li{font-size:.9rem;line-height:1.5;margin-bottom:9px;color:var(--txt);}
.ag-fix-list li::marker{color:var(--rd2);}
.ag-checks{display:flex;flex-direction:column;gap:12px;}
.ag-check{display:flex;gap:12px;align-items:flex-start;}
.ag-dot{flex-shrink:0;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;margin-top:1px;}
.ag-check.pass .ag-dot{background:rgba(74,222,128,.15);color:#4ade80;}
.ag-check.warn .ag-dot{background:rgba(255,209,102,.15);color:#ffd166;}
.ag-check.fail .ag-dot{background:rgba(255,90,90,.15);color:#ff5a5a;}
.ag-check-head{display:flex;align-items:center;gap:10px;}
.ag-check-head strong{font-size:.95rem;}
.ag-stat{font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:6px;}
.ag-stat.pass{background:rgba(74,222,128,.12);color:#4ade80;}
.ag-stat.warn{background:rgba(255,209,102,.12);color:#ffd166;}
.ag-stat.fail{background:rgba(255,90,90,.12);color:#ff5a5a;}
.ag-check p{font-size:.84rem;color:var(--mut);line-height:1.45;margin:5px 0 0;}
.ag-kw-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;}
.ag-kw-head strong{font-size:1.3rem;}
.ag-kw-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.ag-kw-lbl{display:block;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;}
.ag-kw-lbl.ok{color:#4ade80;}.ag-kw-lbl.miss{color:var(--rd);}
.ag-kws{display:flex;flex-wrap:wrap;gap:6px;}
.ag-kw{font-size:.76rem;padding:4px 9px;border-radius:7px;font-family:'JetBrains Mono',monospace;}
.ag-kw.ok{background:rgba(74,222,128,.1);color:#4ade80;border:1px solid rgba(74,222,128,.25);}
.ag-kw.miss{background:rgba(255,90,90,.08);color:var(--rd);border:1px solid rgba(255,90,90,.22);}
.ag-ghost{width:100%;background:transparent;border:1px solid var(--line);color:var(--mut);padding:13px;border-radius:12px;cursor:pointer;font-family:'Outfit';transition:.2s;}
.ag-ghost:hover{border-color:var(--rd);color:var(--rd);}
.ag-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:.3s;z-index:9;}
.ag-ov.open{opacity:1;pointer-events:auto;}
.ag-drawer{position:fixed;top:0;right:0;height:100%;width:min(380px,90vw);background:#150807;border-left:1px solid var(--line);box-shadow:-20px 0 60px rgba(0,0,0,.5);transform:translateX(100%);transition:transform .32s cubic-bezier(.2,.8,.2,1);z-index:10;padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;}
.ag-drawer.open{transform:translateX(0);}
.ag-drawer-top{display:flex;justify-content:space-between;align-items:center;}
.ag-close{background:transparent;border:1px solid var(--line);color:var(--mut);width:32px;height:32px;border-radius:9px;cursor:pointer;}
.ag-close:hover{color:var(--rd);border-color:var(--rd);}
.ag-hist-list{display:flex;flex-direction:column;gap:12px;}
.ag-hist-item{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;}
.ag-hist-meta{display:flex;justify-content:space-between;align-items:center;gap:10px;}
.ag-hist-prev{font-size:.82rem;color:var(--txt);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.ag-hist-score{font-family:'JetBrains Mono',monospace;font-size:1.1rem;font-weight:700;}
.ag-hist-date{font-family:'JetBrains Mono',monospace;font-size:.68rem;color:var(--mut);display:block;margin-top:6px;}
.ag-hist-act{display:flex;gap:8px;margin-top:10px;}
.ag-hist-act button{flex:1;background:rgba(255,90,90,.08);border:1px solid var(--line);color:var(--rd);padding:7px;border-radius:9px;cursor:pointer;font-family:'Outfit';font-size:.8rem;}
.ag-hist-act button.del{background:transparent;color:#ff8a8a;border-color:rgba(255,138,138,.3);}
.ag-clear{background:transparent;border:1px solid rgba(255,138,138,.3);color:#ff8a8a;padding:10px;border-radius:11px;cursor:pointer;font-family:'Outfit';font-size:.85rem;}
@keyframes scan{0%,100%{top:0;}50%{top:calc(100% - 2px);}}
@keyframes rise{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:none;}}
@media(max-width:600px){.ag-kw-grid{grid-template-columns:1fr;}.ag-overall{justify-content:center;text-align:center;}}
`;
