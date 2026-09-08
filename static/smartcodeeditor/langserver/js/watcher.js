import { watch, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { readdir, stat, writeFile } from "node:fs/promises";

const ALGATOR_ROOT  = process.env.ALGATOR_ROOT  || "/algator-root";
const WORKSPACE     = process.env.LSP_WORKSPACE || "/tmp/lsp-workspace";
const SERVER_URL    = "http://localhost:3000";

const WATCHED_EXTENSIONS = new Set([".java", ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".jar"]);

function isWatched(filepath) {
  return WATCHED_EXTENSIONS.has(filepath.slice(filepath.lastIndexOf(".")).toLowerCase());
}

function isJar(filepath) {
  return filepath.toLowerCase().endsWith(".jar");
}

// algator-root → workspace (za LSP)
function syncToWorkspace(filepath) {
  if (!isWatched(filepath)) return;

  const rel  = relative(ALGATOR_ROOT, filepath);
  const dest = join(WORKSPACE, rel);

  try {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(filepath, dest);
    console.log(`[watcher] algator→workspace: ${rel}`);
    notifyServer(rel, 2, isJar(filepath));
  } catch (e) {
    console.warn(`[watcher] sync failed: ${rel} — ${e.message}`);
  }
}

// workspace → algator-root 
async function syncToAlgator(rel, content) {
  const dest = join(ALGATOR_ROOT, rel);
  try {
    mkdirSync(dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf8");
    console.log(`[watcher] workspace→algator: ${rel}`);
  } catch (e) {
    console.warn(`[watcher] algator write failed: ${rel} — ${e.message}`);
  }
}

async function notifyServer(rel, type = 2, isJarFile = false) {
  try {
    await fetch(`${SERVER_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: rel, type, isJar: isJarFile })
    });
  } catch {

  }
}

async function initialSync(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await initialSync(full);
    else if (entry.isFile() && isWatched(entry.name)) syncToWorkspace(full);
  }
}


const recentServerWrites = new Map();


export function markServerWrite(rel) {
  recentServerWrites.set(normalizePath(rel), Date.now());
  setTimeout(() => recentServerWrites.delete(normalizePath(rel)), 2000);
}

function isRecentServerWrite(rel) {
  const t = recentServerWrites.get(normalizePath(rel));
  return t && (Date.now() - t) < 2000;
}

function normalizePath(p) {
  return String(p || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}


function watchAlgatorRoot() {
  watch(ALGATOR_ROOT, { recursive: true }, (event, filename) => {
    if (!filename) return;
    const rel  = normalizePath(filename);
    const full = join(ALGATOR_ROOT, filename);

    setTimeout(() => {

      if (isRecentServerWrite(rel)) return;

      stat(full)
        .then(info => { if (info.isFile()) syncToWorkspace(full); })
        .catch(() => {});
    }, 150);
  });

  console.log(`[watcher] Opazujem algator-root: ${ALGATOR_ROOT}`);
}

export { syncToAlgator };

function startWatcher() {
  if (!existsSync(ALGATOR_ROOT)) {
    console.log(`[watcher] ${ALGATOR_ROOT} ne obstaja — watcher se ne zažene.`);
    console.log(`[watcher] Montirajte: -v /pot/do/algator-root:/algator-root`);
    return;
  }

  mkdirSync(WORKSPACE, { recursive: true });

  console.log(`[watcher] LSP workspace (temp): ${WORKSPACE}`);

  initialSync(ALGATOR_ROOT).then(() => {
    console.log("[watcher] Začetna sinhronizacija končana.");
    watchAlgatorRoot();
  });
}

startWatcher();