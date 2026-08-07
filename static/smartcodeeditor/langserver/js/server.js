import http from "node:http";
import { WebSocketServer } from "ws";
import { spawn, execFile } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  watch
} from "node:fs";
import { join, dirname, relative, basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const LSYNC_ROOT     = process.env.LSYNC_ROOT || "/algator_lsync_root";
const WORKSPACE      = LSYNC_ROOT;
const ALGATOR_RUNTIME_ROOT = process.env.ALGATOR_RUNTIME_ROOT || "/algator_runtime";
let   projectFolder  = normalizeSyncRoot(process.env.PROJECT_FOLDER || "");

function normalizePath(p) {
  return String(p || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function normalizeSyncRoot(folder) {
  const rel = normalizePath(folder).replace(/\/+/g, "/").replace(/\/+$/, "");
  if (!rel || rel.includes("..")) return "";
  return rel;
}

function safeJoin(base, relPath) {
  const rel = normalizePath(relPath);
  const full = join(base, rel);
  if (rel.includes("..") || (!full.startsWith(base + "/") && full !== base)) return null;
  return full;
}

function readRequestBody(req) {
  return new Promise(resolve => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => resolve(body));
  });
}


const WATCHED_EXTS = new Set([".java", ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".jar"]);

function isWatched(name) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 && WATCHED_EXTS.has(name.slice(dot).toLowerCase());
}

function lsyncSourceRoot() {
  return projectFolder ? join(LSYNC_ROOT, projectFolder) : LSYNC_ROOT;
}

async function syncLsyncToWorkspace() {
  return;
}

function watchLsyncRoot() {
  const root = lsyncSourceRoot();
  if (!existsSync(root)) return;

  try {
    watch(root, { recursive: true }, (event, filename) => {
      if (!filename || !isWatched(filename)) return;
      const rel = projectFolder
        ? `${projectFolder}/${normalizePath(filename)}`
        : normalizePath(filename);

      setTimeout(() => {
        notifyJdtlsFileChanged(rel);
        if (rel.toLowerCase().endsWith(".jar") || rel.toLowerCase().endsWith(".java")) {
          try { bootstrapJavaProject(); }
          catch (e) { console.warn(`[java] classpath rebuild failed: ${e.message}`); }
        }
      }, 200);
    });
    console.log(`[watch] Opazujem <algator_lsync_root>: ${root}`);
  } catch (e) {
    console.warn(`[watch] LSP watcher ni aktiven: ${e.message}`);
  }
}

function notifyJdtlsFileChanged(rel) {
  if (!jdtls.isReady()) return;
  const uri  = pathToFileURL(join(WORKSPACE, rel)).href;
  const isJar = rel.toLowerCase().endsWith(".jar");
  for (const client of javaClients) {
    if (!client.initialized) continue;
    client.sendNotification("workspace/didChangeWatchedFiles", {
      changes: [{ uri, type: 2 }]
    });
    if (isJar) {
      client.sendNotification("workspace/didChangeConfiguration", {
        settings: { java: { project: { referencedLibraries: [join(WORKSPACE, "**", "*.jar")] } } }
      });
    }
  }
}

//Java projekt bootstrap

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function detectPackageName(text = "") {
  const clean = String(text)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const m = clean.match(/^\s*package\s+([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*;/m);
  return m ? m[1] : "";
}

function parentDir(relPath = "") {
  const rel = normalizePath(relPath).replace(/\/+$/, "");
  const idx = rel.lastIndexOf("/");
  return idx >= 0 ? rel.slice(0, idx) : "";
}

function javaSourceRootForFile(relPath, content = null) {
  const rel = normalizePath(relPath);
  if (!rel.toLowerCase().endsWith(".java")) return "";
  const dir = parentDir(rel);
  let text = content;
  if (text === null || text === undefined) {
    try {
      const fp = safeJoin(WORKSPACE, rel);
      if (fp && existsSync(fp)) text = readFileSync(fp, "utf8");
    } catch { text = ""; }
  }
  const pkg = detectPackageName(text || "");
  if (!pkg) return dir;
  const pkgPath = pkg.replace(/\./g, "/");
  if (dir === pkgPath) return "";
  if (dir.endsWith("/" + pkgPath)) return dir.slice(0, dir.length - pkgPath.length - 1);
  return dir;
}

const activeJavaSourceFolders = new Set();

function addJavaSourceFolder(folder = "") {
  const rel = normalizeSyncRoot(folder);
  if (rel) activeJavaSourceFolders.add(rel);
}

function addJavaSourceFolderForFile(relPath, content = null) {
  const root = javaSourceRootForFile(relPath, content);
  if (root) activeJavaSourceFolders.add(root);
  return root;
}

function autoDetectJavaSourceFolders() {
  const detected = new Set();
  const skip = new Set([".git", ".metadata", ".settings", ".smartcode-runtime", "java-data", "bin", "build", "node_modules"]);

  function walk(dir, rel = "") {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (skip.has(name)) continue;
      const abs = join(dir, name);
      const relPath = rel ? rel + "/" + name : name;
      let st;
      try { st = statSync(abs); } catch { continue; }
      if (st.isDirectory()) walk(abs, relPath);
      else if (st.isFile() && name.toLowerCase().endsWith(".java")) {
        detected.add(javaSourceRootForFile(relPath));
      }
    }
  }

  // Če je aktiven projectFolder (npr. SINGLE način), omeji zaznavanje samo
  // na ta projekt - sicer se v isti jdtls workspace pomešajo razredi iz
  // vseh ostalih projektov (npr. podvojen "Main" v default packageu).
  const scopeRoot = projectFolder ? join(WORKSPACE, projectFolder) : WORKSPACE;
  walk(scopeRoot, projectFolder);
  return [...detected].sort();
}

function getJavaSourceFolders() {
  const folders = new Set();
  for (const f of autoDetectJavaSourceFolders()) folders.add(f);
  for (const f of activeJavaSourceFolders) folders.add(f);
  if (projectFolder) folders.add(projectFolder);

  const all = [...folders].sort();
  if (!all.length) return [""];
  return all.filter(folder =>
    folder === "" || !all.some(other => other !== folder && other !== "" && other.startsWith(folder + "/"))
  );
}

function classpathEntryForSourceFolder(folder, allFolders) {
  if (folder !== "") {
    return `  <classpathentry kind="src" path="${escapeXml(folder)}"/>`;
  }
  const excludes = allFolders.filter(f => f).map(f => `${f}/**`);
  if (!excludes.length) return `  <classpathentry kind="src" path=""/>`;
  return `  <classpathentry kind="src" path="" excluding="${escapeXml(excludes.join("|"))}"/>`;
}

// Jar datoteke v <algator_lsync_root>
function findJarEntries() {
  const jars = new Set();

  function walk(dir, valueForFile) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }

    for (const name of entries) {
      const abs = join(dir, name);

      let st;
      try { st = statSync(abs); } catch { continue; }

      if (st.isDirectory()) {
        walk(abs, valueForFile);
      } else if (
        st.isFile() &&
        name.toLowerCase().endsWith(".jar")
      ) {
        jars.add(valueForFile(abs));
      }
    }
  }

  if (existsSync(ALGATOR_RUNTIME_ROOT)) {
    walk(ALGATOR_RUNTIME_ROOT, absolutePath => absolutePath);
  }

  if (projectFolder) {
    const selectedProjectRoot = join(WORKSPACE, projectFolder);

    if (existsSync(selectedProjectRoot)) {
      walk(
        selectedProjectRoot,
        absolutePath =>
          relative(WORKSPACE, absolutePath).replace(/\\/g, "/")
      );
    }
  } else {
    let entries = [];

    try {
      entries = readdirSync(WORKSPACE);
    } catch {}

    for (const name of entries) {
      if (!name.startsWith("PROJ-")) continue;

      const projectRoot = join(WORKSPACE, name);

      try {
        if (statSync(projectRoot).isDirectory()) {
          walk(
            projectRoot,
            absolutePath =>
              relative(WORKSPACE, absolutePath).replace(/\\/g, "/")
          );
        }
      } catch {}
    }
  }

  return [...jars].sort();
}

function jarAbsolutePath(jarPath) {
  return jarPath.startsWith("/")
    ? jarPath
    : join(WORKSPACE, jarPath);
}

const JAVA_DATA_DIR = process.env.JDTLS_DATA_DIR || "/tmp/jdtls-data";
const SETTINGS_DIR  = join(WORKSPACE, ".settings");
const WORKSPACE_URI = pathToFileURL(WORKSPACE).href;

mkdirSync(WORKSPACE, { recursive: true });
mkdirSync(JAVA_DATA_DIR, { recursive: true });
mkdirSync(SETTINGS_DIR, { recursive: true });

function writeFileIfChanged(filePath, content) {
  let current = null;

  try {
    current = readFileSync(filePath, "utf8");
  } catch {}

  if (current === content) return false;

  writeFileSync(filePath, content, "utf8");
  return true;
}

function bootstrapJavaProject() {
  const projectFile = join(WORKSPACE, ".project");
  const classpathFile = join(WORKSPACE, ".classpath");
  const prefsFile = join(
    SETTINGS_DIR,
    "org.eclipse.jdt.core.prefs"
  );

  const sourceFolders = getJavaSourceFolders();

  for (const folder of sourceFolders) {
    if (folder) {
      mkdirSync(join(WORKSPACE, folder), {
        recursive: true
      });
    }
  }

  const sourceEntries = sourceFolders
    .map(folder =>
      classpathEntryForSourceFolder(
        folder,
        sourceFolders
      )
    )
    .join("\n");

  const jars = findJarEntries();

  const jarEntries = jars
    .map(rel =>
      `  <classpathentry kind="lib" path="${escapeXml(rel)}"/>`
    )
    .join("\n");

  const projectContent = `<?xml version="1.0" encoding="UTF-8"?>
<projectDescription>
  <name>smartcode</name>
  <comment></comment>
  <projects></projects>
  <buildSpec>
    <buildCommand>
      <name>org.eclipse.jdt.core.javabuilder</name>
      <arguments></arguments>
    </buildCommand>
  </buildSpec>
  <natures>
    <nature>org.eclipse.jdt.core.javanature</nature>
  </natures>
</projectDescription>
`;

  const classpathContent = `<?xml version="1.0" encoding="UTF-8"?>
<classpath>
${sourceEntries}
${jarEntries}
  <classpathentry kind="con" path="org.eclipse.jdt.launching.JRE_CONTAINER"/>
  <classpathentry kind="output" path="bin"/>
</classpath>
`;

  const prefsContent = `eclipse.preferences.version=1
org.eclipse.jdt.core.compiler.codegen.targetPlatform=17
org.eclipse.jdt.core.compiler.compliance=17
org.eclipse.jdt.core.compiler.source=17
`;

  writeFileIfChanged(projectFile, projectContent);
  const classpathChanged = writeFileIfChanged(
    classpathFile,
    classpathContent
  );
  writeFileIfChanged(prefsFile, prefsContent);

  mkdirSync(join(WORKSPACE, "bin"), {
    recursive: true
  });

  console.log(
    `[java] source folders: ${
      sourceFolders.map(folder => folder || "/").join(", ")
    }`
  );

  console.log(
    `[java] classpath JARs (${jars.length}): ${
      jars.join(", ")
    }`
  );

  if (
    !jars.some(path =>
      path.replace(/\\/g, "/")
        .endsWith("/ALGator.jar")
    )
  ) {
    console.warn(
      "[java] ALGator.jar ni najden v classpathu."
    );
  }

  if (classpathChanged && jdtls.isReady()) {
    notifyJdtlsFileChanged(".classpath");

    for (const client of javaClients) {
      if (!client.initialized) continue;

      client.sendNotification(
        "workspace/didChangeConfiguration",
        {
          settings: {
            java: {
              project: {
                referencedLibraries: jars.map(jarAbsolutePath)
              }
            }
          }
        }
      );
    }
  }

  return {
    sourceFolders,
    jars,
    classpathChanged
  };
}

function scanWorkspaceFiles(folder = "") {
  const root = folder ? join(WORKSPACE, folder) : WORKSPACE;
  const results = [];
  function walk(dir, rel) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const abs = join(dir, name);
      const relPath = rel ? rel + "/" + name : name;
      let st;
      try { st = statSync(abs); } catch { continue; }
      if (st.isDirectory()) walk(abs, relPath);
      else if (st.isFile()) results.push(relPath);
    }
  }
  walk(root, folder);
  return results.sort();
}


const EMBEDDED_SOURCE_EXTENSIONS = new Set([".java", ".c", ".cpp", ".cc", ".cxx"]);

function sourceLanguageForPath(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".java") return "java";
  if (ext === ".c") return "c";
  if (ext === ".cpp" || ext === ".cc" || ext === ".cxx") return "cpp";
  return null;
}

function normalizeEmbeddedProjectFolder(projectName) {
  let folder = normalizeSyncRoot(projectName || "");
  if (!folder) return "";
  if (!folder.startsWith("PROJ-")) folder = `PROJ-${folder}`;
  if (folder.includes("/")) return "";
  return folder;
}

function findEmbeddedSourceFile(projectName, algorithmName) {
  const projectFolder = normalizeEmbeddedProjectFolder(projectName);
  const algorithm = String(algorithmName || "").trim();
  if (!projectFolder || !algorithm) return null;

  const projectRoot = safeJoin(LSYNC_ROOT, projectFolder);
  if (!projectRoot || !existsSync(projectRoot)) return null;

  const algorithmLower = algorithm.toLowerCase();
  const compactAlgorithm = algorithmLower.replace(/[^a-z0-9_]+/g, "");
  const skippedDirectories = new Set([".git", "node_modules", "bin", "build", "results"]);
  const candidates = [];

  function walk(directory) {
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const absolutePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        if (!skippedDirectories.has(entry.name.toLowerCase())) walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;
      const extension = extname(entry.name).toLowerCase();
      if (!EMBEDDED_SOURCE_EXTENSIONS.has(extension)) continue;

      const projectRelativePath = relative(projectRoot, absolutePath).replace(/\\/g, "/");
      const lowerPath = projectRelativePath.toLowerCase();
      const stem = basename(entry.name, extension).toLowerCase();
      const compactStem = stem.replace(/[^a-z0-9_]+/g, "");
      const segments = lowerPath.split("/");

      let score = 0;
      if (stem === algorithmLower || compactStem === compactAlgorithm) score += 1000;
      if (segments.includes(algorithmLower)) score += 700;
      if (segments.some(segment => segment.replace(/[^a-z0-9_]+/g, "") === compactAlgorithm)) score += 650;
      if (lowerPath.startsWith("algs/")) score += 250;
      if (lowerPath.includes("/src/")) score += 80;
      if (stem.includes(algorithmLower) || compactStem.includes(compactAlgorithm)) score += 120;

      if (score > 0) {
        candidates.push({
          score,
          projectFolder,
          projectRelativePath,
          workspaceRelativePath: `${projectFolder}/${projectRelativePath}`,
          absolutePath,
          language: sourceLanguageForPath(projectRelativePath)
        });
      }
    }
  }

  walk(projectRoot);
  candidates.sort((a, b) => b.score - a.score || a.projectRelativePath.length - b.projectRelativePath.length);
  return candidates[0] || null;
}

//LSP procesa

function createLspProcess(name, getArgs, clients) {
  let proc        = null;
  let procReady   = false;
  let initialized = false;
  let initResult  = null;
  let buf         = Buffer.alloc(0);

  function broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(data);
    }
  }

  function sendRaw(obj) {
    if (!proc || !procReady) return;
    try {
      const json = JSON.stringify(obj);
      const body = Buffer.from(json, "utf8");
      const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "ascii");
      proc.stdin.write(Buffer.concat([header, body]));
    } catch (e) {
      if (e.code !== "EPIPE") console.error(`[${name}] send error:`, e.message);
    }
  }

  function handleClientMessage(ws, msg) {
    const method = msg.method;
    const id     = msg.id;

    if (method === "initialize") {
      if (initialized && initResult !== null) {
        ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: initResult }));
        console.log(`[${name}] replayed initialize to reconnected client`);
      } else {
        sendRaw(msg);
      }
      return;
    }

    if (method === "initialized") {
      if (!initialized) sendRaw(msg);
      return;
    }

    sendRaw(msg);
  }

  function start() {
    let spawnArgs;
    try { spawnArgs = getArgs(); }
    catch (e) {
      console.error(`[${name}] cannot get args: ${e.message} — retrying in 5s`);
      setTimeout(start, 5000);
      return;
    }

    const { cmd, args, opts } = spawnArgs;
    try {
      proc      = spawn(cmd, args, opts);
      procReady = true;
      buf       = Buffer.alloc(0);
    } catch (e) {
      console.error(`[${name}] spawn failed: ${e.message} — retrying in 5s`);
      setTimeout(start, 5000);
      return;
    }

    console.log(`[${name}] started (pid ${proc.pid})`);

    proc.stdout.on("data", chunk => {
      buf = Buffer.concat([buf, chunk]);
      while (true) {
        const sep = buf.indexOf("\r\n\r\n");
        if (sep === -1) break;
        const headerStr = buf.slice(0, sep).toString("ascii");
        const match = headerStr.match(/Content-Length:\s*(\d+)/i);
        if (!match) { buf = buf.slice(sep + 4); continue; }
        const len = Number(match[1]);
        const bodyStart = sep + 4;
        const bodyEnd   = bodyStart + len;
        if (buf.length < bodyEnd) break;
        const bodyBuf = buf.slice(bodyStart, bodyEnd);
        buf = buf.slice(bodyEnd);
        try {
          const parsed = JSON.parse(bodyBuf.toString("utf8"));
          if (parsed.id !== undefined && !initialized && parsed.result !== undefined) {
            initialized = true;
            initResult  = parsed.result;
            console.log(`[${name}] initialized successfully`);
          }
          broadcast(parsed);
        } catch (e) {
          console.error(`[${name}] bad JSON:`, e.message);
        }
      }
    });

    proc.stderr.on("data", c => process.stderr.write(`[${name}] ${c}`));

    proc.on("exit", (code, signal) => {
      procReady   = false;
      initialized = false;
      initResult  = null;
      console.log(`[${name}] exited (code=${code} signal=${signal}) — restarting in 2s`);
      setTimeout(start, 2000);
    });

    proc.stdin.on("error", e => {
      if (e.code !== "EPIPE") console.error(`[${name}] stdin:`, e.message);
    });
  }

  return {
    handleClientMessage,
    sendNotification: (method, params) => sendRaw({ jsonrpc: "2.0", method, params }),
    start,
    isReady: () => procReady
  };
}

// clangd
const clangdClients = new Set();
const clangd = createLspProcess("clangd", () => {
  const compileDb = join(WORKSPACE, "build", "compile_commands.json");
  const args = [
    "--background-index",
    "--clang-tidy",
    "--log=error",
    "--completion-style=detailed",
    "--header-insertion=never",
    "--ranking-model=decision_forest"
  ];
  if (existsSync(compileDb)) {
    args.push(`--compile-commands-dir=${join(WORKSPACE, "build")}`);
    console.log("[clangd] using compile_commands.json");
  }
  return { cmd: "clangd", args, opts: { cwd: WORKSPACE } };
}, clangdClients);

// jdtls
const javaClients = new Set();
const jdtls = createLspProcess("jdtls", () => {
  const pluginsDir = "/opt/jdtls/plugins";
  if (!existsSync(pluginsDir)) throw new Error("jdtls not installed at /opt/jdtls");
  const launcher = readdirSync(pluginsDir)
    .find(f => f.startsWith("org.eclipse.equinox.launcher_") && f.endsWith(".jar"));
  if (!launcher) throw new Error("jdtls launcher jar not found in " + pluginsDir);
  console.log("[jdtls] launcher:", launcher);
  return {
    cmd: "java",
    args: [
      "-Declipse.application=org.eclipse.jdt.ls.core.id1",
      "-Dosgi.bundles.defaultStartLevel=4",
      "-Declipse.product=org.eclipse.jdt.ls.core.product",
      "-Dlog.level=ERROR",
      "-Dfile.encoding=UTF-8",
      "-Xms256m", "-Xmx1G", "-XX:+UseG1GC",
      "--add-modules=ALL-SYSTEM",
      "--add-opens", "java.base/java.util=ALL-UNNAMED",
      "--add-opens", "java.base/java.lang=ALL-UNNAMED",
      "--add-opens", "java.base/sun.nio.ch=ALL-UNNAMED",
      "-jar", join(pluginsDir, launcher),
      "-configuration", "/opt/jdtls/config_linux",
      "-data", JAVA_DATA_DIR
    ],
    opts: { cwd: WORKSPACE }
  };
}, javaClients);

//HTTP strežnik

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "POST" && req.url === "/project-folder") {
    try {
      const body = await readRequestBody(req);
      const data = JSON.parse(body || "{}");
      const newFolder = normalizeSyncRoot(data.projectFolder || data.folder || "");
      if (newFolder !== projectFolder) activeJavaSourceFolders.clear();
      projectFolder = newFolder;
      console.log(`[server] projectFolder nastavljen na: ${projectFolder || "/"}`);
      await syncLsyncToWorkspace();
      bootstrapJavaProject();
      watchLsyncRoot();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, projectFolder, workspace: WORKSPACE }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/sync-root") {
    try {
      const body = await readRequestBody(req);
      const data = JSON.parse(body || "{}");
      const newFolder = normalizeSyncRoot(data.syncRoot || data.folder || "");
      if (newFolder) {
        if (newFolder !== projectFolder) activeJavaSourceFolders.clear();
        projectFolder = newFolder;
        if (data.folder) addJavaSourceFolder(data.folder);
      }
      await syncLsyncToWorkspace();
      bootstrapJavaProject();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, projectFolder, workspace: WORKSPACE }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/rebuild-java-classpath") {
    try {
      bootstrapJavaProject();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, javaSourceFolders: getJavaSourceFolders() }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/java-project") {
    try {
      const body = await readRequestBody(req);
      const data = JSON.parse(body || "{}");
      const folder = normalizeSyncRoot(data.folder || "");
      if (folder) addJavaSourceFolder(folder);
      bootstrapJavaProject();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, javaSourceFolders: getJavaSourceFolders() }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/resolve-embedded-file")) {
    try {
      const requestUrl = new URL(req.url, "http://localhost");
      const projectName = requestUrl.searchParams.get("project") || "";
      const algorithmName = requestUrl.searchParams.get("algorithm") || "";
      const source = findEmbeddedSourceFile(projectName, algorithmName);

      if (!source) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: false,
          error: `Datoteke za algoritem '${algorithmName}' v projektu '${projectName}' ni mogoče najti v lsync mapi.`
        }));
        return;
      }

      const content = readFileSync(source.absolutePath, "utf8");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        ok: true,
        projectFolder: source.projectFolder,
        relativePath: source.projectRelativePath,
        workspacePath: source.workspaceRelativePath,
        language: source.language,
        content
      }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  const fileMatch = req.url?.match(/^\/workspace\/(.+)$/);

  if (req.method === "GET" && fileMatch) {
    const relPath = decodeURIComponent(fileMatch[1]);
    const fp = safeJoin(WORKSPACE, relPath);
    if (!fp) { res.writeHead(403); res.end("Forbidden"); return; }
    if (!existsSync(fp)) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(readFileSync(fp, "utf8"));
    return;
  }

  if (req.method === "POST" && fileMatch) {
    const relPath = normalizePath(decodeURIComponent(fileMatch[1]));
    const fp = safeJoin(WORKSPACE, relPath);
    if (!fp) { res.writeHead(403); res.end("Forbidden"); return; }
    try {
      const body = await readRequestBody(req);
      mkdirSync(dirname(fp), { recursive: true });
      writeFileSync(fp, body, "utf8");
      console.log(`[server] saved algator_lsync_root: ${relPath}`);

      if (relPath.toLowerCase().endsWith(".java")) {
        addJavaSourceFolderForFile(relPath, body);
        bootstrapJavaProject();
      }


      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }
  const patchMatch = req.url?.match(/^\/workspace-patch\/(.+)$/);
  if (req.method === "POST" && patchMatch) {
    const relPath = normalizePath(decodeURIComponent(patchMatch[1]));
    const fp = safeJoin(WORKSPACE, relPath);
    if (!fp) { res.writeHead(403); res.end("Forbidden"); return; }
    try {
      const body = await readRequestBody(req);
      const patch = JSON.parse(body || "{}");
      let current = "";
      if (existsSync(fp)) current = readFileSync(fp, "utf8");
      const updated = applyTextPatch(current, patch);
      mkdirSync(dirname(fp), { recursive: true });
      writeFileSync(fp, updated, "utf8");
      console.log(`[server] patched algator_lsync_root: ${relPath}`);
      if (relPath.toLowerCase().endsWith(".java")) {
        addJavaSourceFolderForFile(relPath, updated);
        bootstrapJavaProject();
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/scan")) {
    const scanUrl = new URL(req.url, "http://localhost");
    const folder = normalizeSyncRoot(scanUrl.searchParams.get("folder") || "");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ files: scanWorkspaceFiles(folder) }));
    return;
  }

  if (req.method === "GET" && req.url === "/java-classpath") {
    try {
      const state = bootstrapJavaProject();

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        projectFolder,
        sourceFolders: state.sourceFolders,
        jars: state.jars
      }));
    } catch (e) {
      res.writeHead(500, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        ok: false,
        error: e.message
      }));
    }

    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      workspace:    WORKSPACE,
      lsyncRoot:    LSYNC_ROOT,
      projectFolder,
      workspaceUri: WORKSPACE_URI,
      jdtlsDataDir: JAVA_DATA_DIR,
      clangd:       clangd.isReady(),
      jdtls:        jdtls.isReady(),
      clangdClients: clangdClients.size,
      javaClients:   javaClients.size,
      files:         scanWorkspaceFiles()
    }));
    return;
  }

  if (req.method === "POST" && req.url === "/notify") {
    try {
      const body = await readRequestBody(req);
      const { file, type = 2 } = JSON.parse(body || "{}");
      const rel = normalizePath(file);
      if (!rel) { res.writeHead(400); res.end("Missing file"); return; }
      notifyJdtlsFileChanged(rel);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400); res.end(e.message);
    }
    return;
  }

  if (req.method === "GET" && req.url === "/projects") {
    try {
      const entries = readdirSync(LSYNC_ROOT, { withFileTypes: true });
      const projects = entries
        .filter(e => e.isDirectory() && !e.name.startsWith("."))
        .map(e => e.name)
        .sort();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ projects }));
    } catch {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ projects: [] }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

function applyTextPatch(content, patch) {
  const lines = String(content || "").split("\n");
  const fromLine = patch?.from?.line ?? 0;
  const fromCh   = patch?.from?.ch ?? 0;
  const toLine   = patch?.to?.line ?? fromLine;
  const toCh     = patch?.to?.ch ?? fromCh;
  const insertLines = Array.isArray(patch?.text) ? patch.text : [String(patch?.text ?? "")];

  while (lines.length <= toLine) lines.push("");

  const before = (lines[fromLine] || "").slice(0, fromCh);
  const after  = (lines[toLine]   || "").slice(toCh);
  const replacement = [...insertLines];

  if (replacement.length === 1) {
    replacement[0] = before + replacement[0] + after;
  } else {
    replacement[0] = before + replacement[0];
    replacement[replacement.length - 1] = replacement[replacement.length - 1] + after;
  }

  lines.splice(fromLine, toLine - fromLine + 1, ...replacement);
  return lines.join("\n");
}

const wssClangd = new WebSocketServer({ noServer: true });
const wssJava   = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  if (req.url === "/java") {
    wssJava.handleUpgrade(req, socket, head, ws => wssJava.emit("connection", ws));
  } else {
    wssClangd.handleUpgrade(req, socket, head, ws => wssClangd.emit("connection", ws));
  }
});

function setupWss(wss, lspProc, clientSet, name) {
  wss.on("connection", ws => {
    ws.initialized = false;
    clientSet.add(ws);
    console.log(`[${name}] browser connected (${clientSet.size} active)`);

    ws.on("message", raw => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.method === "initialized") ws.initialized = true;
        lspProc.handleClientMessage(ws, msg);
      } catch (e) {
        console.error(`[${name}] bad WS message:`, e.message);
      }
    });

    ws.on("close", () => { clientSet.delete(ws); console.log(`[${name}] disconnected`); });
    ws.on("error", err => { clientSet.delete(ws); console.error(`[${name}] WS error:`, err.message); });
  });
}

const JAVA_CLASSPATH_REFRESH_MS = Number(process.env.JAVA_CLASSPATH_REFRESH_MS || 2000);
if (JAVA_CLASSPATH_REFRESH_MS > 0) {
  setInterval(() => {
    try { bootstrapJavaProject(); }
    catch (e) { console.warn(`[java] classpath refresh failed: ${e.message}`); }
  }, JAVA_CLASSPATH_REFRESH_MS);
}

setupWss(wssClangd, clangd, clangdClients, "clangd");
setupWss(wssJava,   jdtls,  javaClients,   "jdtls");

/*
 * .project in .classpath morata obstajati že pred zagonom JDTLS.
 * Tako JDTLS ob prvem uvozu projekta takoj vidi ALGator.jar,
 * projektne JAR-e in vse Java source mape.
 */
bootstrapJavaProject();

clangd.start();
jdtls.start();

watchLsyncRoot();

server.listen(3000, () => {
  console.log("SmartCode LSP server na http://localhost:3000");
  console.log("  LSYNC_ROOT:    ", LSYNC_ROOT);
  console.log("  LSP root:      ", WORKSPACE);
  console.log("  projectFolder: ", projectFolder || "(cel lsync-root)");
  console.log("  WORKSPACE_URI: ", WORKSPACE_URI);
});