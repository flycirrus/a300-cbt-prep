# A300-600 CBT Prep

A small, mobile-friendly study app for the A300-600 CBT self-study questions
(100 questions). Pure static HTML/CSS/JS — no build step, no server, no
dependencies. The questions are inlined in `data.js`, so it runs from a file,
from any static host, and from Vercel.

## Files
- `index.html` — markup
- `styles.css` — styling (mobile-first, dark)
- `app.js` — logic
- `data.js` — the 100 questions (generated from `../data/questions.json`)
- `vercel.json` — static config

## Run locally
Just open `index.html` in a browser (double-click). No server needed, because
the data is inlined.

## Deploy to Vercel
This `app/` folder is the site root. Deploy only this folder (not the parent
project, which contains private files).

**Option A — Vercel CLI**
```
cd "app"
npx vercel          # first run: log in + confirm; deploys a preview
npx vercel --prod   # production URL
```
When asked for settings: framework = Other, build command = none,
output directory = ./ (root).

**Option B — Git import**
Push just this `app/` folder to its own repo, import it on vercel.com,
set "Root Directory" to the folder that holds `index.html`, framework "Other".

## Features
- Language: English
- **CBT groups** to study: Alle Fragen · CBT A-1 … A-9 (grouped by the course CBTs — each block is a CBT that restarts its question numbering at 1 in the source PDF)
- **Learn** mode: instant feedback (correct/incorrect highlighted)
- **Exam** mode: no feedback, score + review of wrong answers at the end
- Optional shuffle of questions and/or answers
- Questions with a ⚠ badge were corrected/unconfirmed vs. the source
  (2 had a red box = the pre-selected answer was wrong; the note shows the real
  answer). These still deserve a manual check against the manual.
- Keyboard: 1–6 select an option, Enter = next

## Updating the questions
Edit `../data/questions.json`, then regenerate `data.js`:
```
python3 - <<'PY'
import json
d=json.load(open("../data/questions.json"))
slim=[{"id":q["id"],"question":q["question"],"options":q["options"],
       "correct_index":q["correct_index"],"confidence":q["confidence"],
       "flag":q["flag"],"page":q["page"]} for q in d["questions"]]
open("data.js","w").write("window.CBT_DATA = "+json.dumps(
   {"title":"A300-600 CBT Prep","total":len(slim),"questions":slim},
   ensure_ascii=False)+";\n")
PY
```
