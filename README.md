# 🎭 Stage Designer
**Stage set & lighting layout tool for Burgdorff Center for the Performing Arts**

Live at: `https://YOUR-USERNAME.github.io/stage-designer/`

---

## First-time setup (do this once)

### Step 1 — Create a GitHub account
Go to [github.com](https://github.com) and sign up if you don't have an account.

### Step 2 — Create the repository
1. Click the **+** icon (top right) → **New repository**
2. Name it exactly: `stage-designer`
3. Set it to **Public** (required for free GitHub Pages)
4. Do **not** check "Add README" — leave it empty
5. Click **Create repository**

### Step 3 — Enable GitHub Pages with Actions
1. In your new repo, go to **Settings** → **Pages** (left sidebar)
2. Under **Source**, choose **GitHub Actions**
3. Click **Save**

### Step 4 — Upload the project files
On GitHub.com you can drag-and-drop files directly:

1. In your empty repo, click **uploading an existing file** (the link in the middle of the page)
2. Drag the entire `stage-designer` folder contents into the upload area:
   ```
   .github/
     workflows/
       deploy.yml
   src/
     App.jsx
     main.jsx
   index.html
   package.json
   vite.config.js
   .gitignore
   README.md
   ```
3. At the bottom, write a commit message like `Initial upload`
4. Click **Commit changes**

> ⚠️ You must upload the `.github` folder too — that's the automation that builds and deploys the site.

### Step 5 — Watch it deploy
1. Click the **Actions** tab in your repo
2. You'll see a workflow called "Deploy to GitHub Pages" running (yellow dot = in progress)
3. It takes about 2 minutes to finish (green checkmark = done)
4. Your app is now live at: `https://YOUR-USERNAME.github.io/stage-designer/`

### Step 6 — Fix the vite.config.js base path
Open `vite.config.js` and make sure the `base` matches your repo name:
```js
base: '/stage-designer/',   // ← must match your repo name exactly
```
If you named your repo something different (e.g. `burgdorff-stage`), change this to `'/burgdorff-stage/'`.

---

## Adding to your iPad home screen

1. Open `https://YOUR-USERNAME.github.io/stage-designer/` in **Safari** on your iPad
2. Tap the **Share** button (box with arrow pointing up)
3. Tap **Add to Home Screen**
4. Name it "Stage Designer" → tap **Add**

It will appear as a full-screen app icon on your home screen. No App Store needed.

---

## Updating the app (checking out and checking in changes)

There are two ways to update — the web editor (easiest, no install needed) and Git on your computer (best for larger changes).

---

### Option A: Edit on GitHub.com (no software needed, works on iPad)

**To edit a file:**
1. Go to your repo on github.com
2. Click on the file you want to edit (e.g. `src/App.jsx`)
3. Click the **pencil icon** (Edit this file) in the top right
4. Make your changes in the editor
5. Scroll down, write a commit message describing what you changed
6. Click **Commit changes** → **Commit directly to main**
7. GitHub Actions automatically rebuilds and deploys — live in ~2 minutes

**To upload a new version of App.jsx from Claude:**
1. Download the new `stage-designer.jsx` from Claude
2. Go to your repo → `src/` folder
3. Click `App.jsx` → pencil icon → select all → paste the new code
4. Commit with a message like `Update: added venue customization`

---

### Option B: Git on your Mac or Windows PC (recommended for regular updates)

#### First-time computer setup

**Install Git** (if you don't have it):
- Mac: open Terminal, type `git --version` — macOS will offer to install it
- Windows: download from [git-scm.com](https://git-scm.com)

**Install Node.js** (needed to run locally):
- Download from [nodejs.org](https://nodejs.org) — choose the LTS version

**Clone your repo to your computer:**
```bash
git clone https://github.com/YOUR-USERNAME/stage-designer.git
cd stage-designer
npm install
```

**Run it locally:**
```bash
npm run dev
```
Open `http://localhost:5173/stage-designer/` in your browser. The app runs live on your computer.

---

#### Day-to-day workflow: pulling, editing, pushing

**Before you start working — always pull first:**
```bash
cd stage-designer
git pull
```
This downloads any changes made since you last worked (e.g. edits made on GitHub.com).

**Make your changes:**
- Edit `src/App.jsx` in any text editor (VS Code is great — free at code.visualstudio.com)
- Test locally with `npm run dev`

**Save and publish your changes:**
```bash
git add .
git commit -m "What you changed — e.g. Added new fixture types"
git push
```
GitHub Actions picks this up automatically and deploys in ~2 minutes.

**Check deployment status:**
Go to your repo → **Actions** tab → watch the latest run.

---

### Version history and rolling back

Every commit is saved forever. To see history:
- GitHub.com → **Commits** (clock icon above the file list)
- Each commit has a unique ID (like `a3f2c91`)

**To go back to an older version on GitHub.com:**
1. Click **Commits**
2. Find the version you want
3. Click `<>` (Browse files at this point)
4. Navigate to `src/App.jsx` → click it → click **Raw**
5. Copy all the text
6. Go back to the current `src/App.jsx` → edit → paste → commit

**To go back using Git:**
```bash
git log --oneline          # see list of commits with short IDs
git revert HEAD            # undo the last commit safely
git push
```

---

## Sharing layout files with collaborators

The app saves/loads `.json` layout files. To share a plot:
1. In the app, click **⬇ JSON** — saves a `.json` file
2. Email or AirDrop it to your collaborator
3. They open the app → **⬆ Import** → select the file

No accounts or logins needed for collaborators to use the app — just send them your GitHub Pages URL.

---

## Project structure

```
stage-designer/
├── .github/
│   └── workflows/
│       └── deploy.yml      ← Automated build & deploy (don't edit this)
├── src/
│   ├── App.jsx             ← THE MAIN APP — edit this when Claude gives you updates
│   └── main.jsx            ← React entry point (rarely needs editing)
├── index.html              ← HTML shell (rarely needs editing)
├── package.json            ← Dependencies (rarely needs editing)
├── vite.config.js          ← Build config — update 'base' if you rename the repo
├── .gitignore
└── README.md               ← This file
```

**The only file you'll regularly update is `src/App.jsx`.**
When Claude gives you an improved version of the app, that's the file to replace.

---

## Troubleshooting

**App shows a blank page after deploy:**
- Check the `base` in `vite.config.js` matches your repo name exactly (including `/` on both ends)
- Check the Actions tab for error messages

**"Permission denied" when pushing:**
- GitHub may need you to authenticate. Run `git config --global credential.helper osxkeychain` (Mac) and push again — it will prompt for your GitHub username and a Personal Access Token (generate one at GitHub → Settings → Developer settings → Personal access tokens → Tokens classic → Generate new token → check `repo` scope)

**Changes not showing up:**
- Hard-refresh the browser: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows) / hold Reload on iPad
- Check Actions tab to confirm deployment finished

**App works in Claude but not on GitHub Pages:**
- The most common cause is the `base` path in `vite.config.js` not matching the repo name

---

*Built for Burgdorff Center for the Performing Arts, Maplewood NJ*
