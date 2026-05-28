# Career Toolkit — AI tools for your job search

> A suite of bilingual (RO/EN) AI career tools — CV evaluator, CV tailoring, ATS checker,
> cover letters, bio optimizer, salary negotiation, project reviews. Zero cost, runs anywhere,
> no API key required.

🔗 **Live:** `https://laurandreea10.github.io/career-toolkit/` · 👤 [LaurAndreea10](https://github.com/LaurAndreea10)

---

## 🇷🇴 Română

### Ce conține

Șapte aplicații, fiecare rezolvând o etapă din căutarea unui job:

| Unealtă | Ce face |
|---|---|
| **CV Scout** | Evaluează CV-ul: scoruri, feedback pe secțiuni, rescrieri, interviu adaptiv |
| **CV Tailor** | Rescrie CV-ul pentru un anunț anume, arată ce s-a schimbat, exportă `.docx` |
| **ATS Gate** | Verifică compatibilitatea ATS: parsabilitate, structură, cuvinte-cheie |
| **Cover Forge** | Generează scrisori de intenție din CV + anunț |
| **Bio Lab** | Optimizează headline + „Despre" pentru LinkedIn/X/portofoliu |
| **Counter** | Coach de negociere salarială: strategie, sumă-țintă, mesaj |
| **Proof** | Reviewer de proiecte de portofoliu cu scor și feedback |

### Cum funcționează (cost zero)

Fiecare aplicație detectează unde rulează. În **Claude.ai** folosește AI-ul real; pe **GitHub Pages** trece automat pe un motor local care rulează 100% în browser. Nicio cheie API nu e scrisă în cod, deci nu poate fi expusă și nu generează costuri.

### Deploy pe GitHub Pages

1. Pune tot conținutul acestui folder în repo (cu `index.html` în rădăcină).
2. **Settings → Pages → Deploy from branch → `main` / root.**
3. Gata — site-ul e live la `https://<user>.github.io/<repo>/`.

Nu e nevoie de build, npm sau configurare. Aplicațiile sunt fișiere HTML standalone care încarcă React de la CDN.

---

## 🇬🇧 English

### What's inside

Seven apps, each solving a step of the job hunt:

| Tool | What it does |
|---|---|
| **CV Scout** | Evaluates the CV: scores, section feedback, rewrites, adaptive interview |
| **CV Tailor** | Rewrites the CV for a specific job, shows what changed, exports `.docx` |
| **ATS Gate** | Checks ATS compatibility: parseability, structure, keywords |
| **Cover Forge** | Generates cover letters from CV + job post |
| **Bio Lab** | Optimizes headline + "About" for LinkedIn/X/portfolio |
| **Counter** | Salary negotiation coach: strategy, target number, message |
| **Proof** | Portfolio project reviewer with score and feedback |

### How it works (zero cost)

Each app detects where it runs. Inside **Claude.ai** it uses the real AI; on **GitHub Pages** it automatically falls back to a local engine that runs 100% in the browser. No API key is written into the code, so it can't leak or bill.

### Deploy to GitHub Pages

1. Put the contents of this folder in a repo (with `index.html` at the root).
2. **Settings → Pages → Deploy from branch → `main` / root.**
3. Done — the site is live at `https://<user>.github.io/<repo>/`.

No build, npm, or config needed. The apps are standalone HTML files that load React from a CDN.

---

## 📁 Structure

```
.
├── index.html          # hub (landing page, links to all tools)
├── about.html          # case study / about page
├── cv-scout/index.html
├── cv-tailor/index.html
├── ats-gate/index.html
├── cover-forge/index.html
├── bio-lab/index.html
├── counter/index.html
└── proof/index.html
```

## 🛠️ Stack

React (via CDN) · Babel standalone · pdf.js · JSZip (for `.docx`) · pure CSS · bilingual RO/EN

> Note: the in-browser builds use Babel standalone for zero-config deployment. For production performance you can later migrate to a Vite build, but for a portfolio demo this runs instantly with no setup.
