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
  return LSYNC_ROOT;
}

async function syncLsyncToWorkspace() {
  return;
}

function watchLsyncRoot() {
  const root = lsyncSourceRoot();
  if (!existsSync(root)) return;

  if (lsyncWatcher) {
    lsyncWatcher.close();
    lsyncWatcher = null;
  }

  const watchedProjectFolder = "";

  try {
    lsyncWatcher = watch(root, { recursive: true }, (event, filename) => {
      if (!filename || !isWatched(filename)) return;
      const rel = watchedProjectFolder
        ? `${watchedProjectFolder}/${normalizePath(filename)}`
        : normalizePath(filename);

      setTimeout(() => {
        notifyJdtlsFileChanged(rel);
        if (rel.toLowerCase().endsWith(".jar") || rel.toLowerCase().endsWith(".java")) {
          for (const state of javaProjectStates.values()) {
            if (!rel.startsWith(`${state.projectFolder}/`)) continue;
            try { bootstrapJavaProjectState(state); }
            catch (e) { console.warn(`[java] classpath rebuild failed: ${e.message}`); }
          }
        }
      }, 200);
    });
    console.log(`[watch] Opazujem <algator_lsync_root>: ${root}`);
  } catch (e) {
    console.warn(`[watch] LSP watcher ni aktiven: ${e.message}`);
  }
}

let lsyncWatcher = null;

function notifyJdtlsFileChanged(rel) {
  const workspacePath = normalizePath(rel);
  for (const connection of javaConnections) {
    if (!workspacePath.startsWith(`${connection.state.projectFolder}/`)) continue;
    notifyJavaConnectionFileChanged(connection, workspacePath);

    if (workspacePath.toLowerCase().endsWith(".jar") && connection.process.isInitialized()) {
      const jars = findJavaProjectJars(connection.state);
      connection.process.sendNotification("workspace/didChangeConfiguration", {
        settings: {
          java: {
            project: {
              referencedLibraries: jars.map(path => javaProjectJarAbsolutePath(connection.state, path))
            }
          }
        }
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
let activeJavaAlgorithmSourceFolder = "";

function isJavaAlgorithmPath(relPath) {
  const rel = normalizePath(relPath).toLowerCase();
  const prefix = projectFolder
    ? `${projectFolder}/algs/`.toLowerCase()
    : "";
  return !!prefix && rel.startsWith(prefix);
}

function addJavaSourceFolder(folder = "") {
  const rel = normalizeSyncRoot(folder);
  if (rel) activeJavaSourceFolders.add(rel);
}

function addJavaSourceFolderForFile(relPath, content = null) {
  const root = javaSourceRootForFile(relPath, content);
  if (!root) return root;

  if (isJavaAlgorithmPath(relPath)) {
    activeJavaAlgorithmSourceFolder = root;
  } else {
    activeJavaSourceFolders.add(root);
  }

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
      if (st.isDirectory()) {
        const algorithmRoot = projectFolder
          ? `${projectFolder}/algs`.toLowerCase()
          : "";
        if (algorithmRoot && relPath.toLowerCase() === algorithmRoot) continue;
        walk(abs, relPath);
      }
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
  if (activeJavaAlgorithmSourceFolder) folders.add(activeJavaAlgorithmSourceFolder);
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

const JAVA_DATA_ROOT = process.env.JDTLS_DATA_DIR || "/tmp/jdtls-data";
const SETTINGS_DIR  = join(WORKSPACE, ".settings");
const WORKSPACE_URI = pathToFileURL(WORKSPACE).href;

function javaProjectScope() {
  return (projectFolder || "all-projects").replace(/[^A-Za-z0-9._-]/g, "_");
}

function javaDataDirectory() {
  return join(JAVA_DATA_ROOT, javaProjectScope());
}

function javaOutputFolder() {
  return `bin/${javaProjectScope()}`;
}

mkdirSync(WORKSPACE, { recursive: true });
mkdirSync(JAVA_DATA_ROOT, { recursive: true });
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
  const outputFolder = javaOutputFolder();

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
  <classpathentry kind="output" path="${escapeXml(outputFolder)}"/>
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

  mkdirSync(join(WORKSPACE, outputFolder), {
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

  if (classpathChanged && jdtls.isInitialized()) {
    notifyJdtlsFileChanged(".classpath");
    jdtls.sendNotification(
      "java/projectConfigurationUpdate",
      { uri: WORKSPACE_URI }
    );
    jdtls.sendNotification(
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

  return {
    sourceFolders,
    jars,
    outputFolder,
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
  const compactAlgorithm = algorithmLower
    .replace(/^alg[\s_-]*/, "")
    .replace(/[^a-z0-9]+/g, "");
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
      const exactAlgorithmDirectory = segments.some(segment =>
        segment
          .replace(/^alg[\s_-]*/, "")
          .replace(/[^a-z0-9]+/g, "") === compactAlgorithm
      );

      let score = 0;
      if (exactAlgorithmDirectory) score += 5000;
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
  let initializeRequestIds = new Set();
  let initializeClients = new Map();
  let buf         = Buffer.alloc(0);
  let restarting  = false;
  let restartWaiters = [];
  let initializationWaiters = [];
  let stopped = false;

  function resetInitialization() {
    initialized = false;
    initResult = null;
    initializeRequestIds = new Set();
    initializeClients = new Map();
  }

  function finishInitialization() {
    initialized = true;
    for (const waiter of initializationWaiters) {
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
    initializationWaiters = [];
  }

  function disconnectClients() {
    for (const ws of [...clients]) {
      if (ws.readyState === 0 || ws.readyState === 1) {
        ws.close(1012, "LSP project context changed");
      }
    }
  }

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
      if (initResult !== null) {
        ws.send(JSON.stringify({ jsonrpc: "2.0", id, result: initResult }));
        console.log(`[${name}] replayed initialize to reconnected client`);
      } else {
        initializeClients.set(ws, id);
        if (!initializeRequestIds.size) {
          initializeRequestIds.add(id);
          sendRaw(msg);
        }
      }
      return;
    }

    if (method === "initialized") {
      if (!initialized && initResult !== null) {
        sendRaw(msg);
        finishInitialization();
        console.log(`[${name}] initialized successfully`);
      }
      return;
    }

    sendRaw(msg);
  }

  function start() {
    if (stopped) return;
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

    for (const resolve of restartWaiters) resolve();
    restartWaiters = [];

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
          if (
            parsed.id !== undefined &&
            initializeRequestIds.has(parsed.id) &&
            (parsed.result !== undefined || parsed.error !== undefined)
          ) {
            initializeRequestIds.clear();
            if (parsed.result !== undefined) initResult = parsed.result;

            for (const [client, requestId] of initializeClients) {
              if (client.readyState !== 1) continue;
              client.send(JSON.stringify(parsed.error !== undefined
                ? { jsonrpc: "2.0", id: requestId, error: parsed.error }
                : { jsonrpc: "2.0", id: requestId, result: parsed.result }));
            }
            initializeClients.clear();
            continue;
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
      resetInitialization();

      if (stopped) {
        console.log(`[${name}] stopped`);
        return;
      }

      if (restarting) {
        restarting = false;
        console.log(`[${name}] exited (code=${code} signal=${signal}) — restarting for active project`);
        start();
      } else {
        disconnectClients();
        console.log(`[${name}] exited (code=${code} signal=${signal}) — restarting in 2s`);
        setTimeout(start, 2000);
      }
    });

    proc.stdin.on("error", e => {
      if (e.code !== "EPIPE") console.error(`[${name}] stdin:`, e.message);
    });
  }

  return {
    handleClientMessage,
    sendNotification: (method, params) => sendRaw({ jsonrpc: "2.0", method, params }),
    start,
    stop: () => {
      stopped = true;
      procReady = false;
      resetInitialization();
      for (const waiter of initializationWaiters) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error(`${name} stopped`));
      }
      initializationWaiters = [];
      if (proc && proc.exitCode === null && !proc.killed) proc.kill();
    },
    restart: () => new Promise(resolve => {
      restartWaiters.push(resolve);
      procReady = false;
      resetInitialization();

      if (proc && proc.exitCode === null && !proc.killed) {
        restarting = true;
        if (!proc.kill()) {
          restarting = false;
          start();
        }
      } else {
        start();
      }
    }),
    disconnectClients,
    waitUntilInitialized: (timeoutMs = 30000) => {
      if (initialized) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const waiter = {
          resolve,
          reject,
          timer: setTimeout(() => {
            initializationWaiters = initializationWaiters.filter(item => item !== waiter);
            reject(new Error(`${name} initialization timeout`));
          }, timeoutMs)
        };

        initializationWaiters.push(waiter);
      });
    },
    isReady: () => procReady,
    isInitialized: () => initialized
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
const javaProjectStates = new Map();
const javaConnections = new Set();
let javaConnectionId = 0;

function javaProjectState(folder) {
  const normalized = normalizeSyncRoot(folder);
  if (!normalized) return null;
  if (javaProjectStates.has(normalized)) return javaProjectStates.get(normalized);

  const root = safeJoin(WORKSPACE, normalized);
  if (!root || !existsSync(root)) return null;

  const state = {
    projectFolder: normalized,
    root,
    uri: pathToFileURL(root).href,
    activeSourceFolders: new Set(),
    activeAlgorithmSourceFolder: "",
    connections: new Set(),
    sharedConnection: null
  };
  javaProjectStates.set(normalized, state);
  return state;
}

async function waitForJavaProjectState(folder, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  let state = javaProjectState(folder);

  while (!state && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 100));
    state = javaProjectState(folder);
  }

  return state;
}

function javaProjectRelativePath(state, workspacePath) {
  const rel = normalizePath(workspacePath);
  const prefix = `${state.projectFolder}/`;
  return rel.startsWith(prefix) ? rel.slice(prefix.length) : "";
}

function javaProjectSourceRoot(state, workspacePath, content = null) {
  const rel = javaProjectRelativePath(state, workspacePath);
  if (!rel.toLowerCase().endsWith(".java")) return "";

  const dir = parentDir(rel);
  let text = content;
  if (text === null || text === undefined) {
    try {
      const file = safeJoin(state.root, rel);
      text = file && existsSync(file) ? readFileSync(file, "utf8") : "";
    } catch {
      text = "";
    }
  }

  const pkg = detectPackageName(text || "");
  if (!pkg) return dir;
  const pkgPath = pkg.replace(/\./g, "/");
  if (dir === pkgPath) return "";
  if (dir.endsWith("/" + pkgPath)) return dir.slice(0, dir.length - pkgPath.length - 1);
  return dir;
}

function addJavaProjectSourceFile(state, workspacePath, content = null) {
  const root = javaProjectSourceRoot(state, workspacePath, content);
  if (!root) return root;

  const rel = javaProjectRelativePath(state, workspacePath).toLowerCase();
  if (rel.startsWith("algs/")) state.activeAlgorithmSourceFolder = root;
  else state.activeSourceFolders.add(root);
  return root;
}

function detectJavaProjectSourceFolders(state) {
  const folders = new Set();
  const skip = new Set([
    ".git", ".metadata", ".settings", ".smartcode-bin", "bin", "build", "node_modules", "results"
  ]);

  function walk(dir, rel = "") {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (skip.has(entry.name.toLowerCase())) continue;
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      const entryAbs = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entryRel.toLowerCase() === "algs") continue;
        walk(entryAbs, entryRel);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".java")) {
        const workspacePath = `${state.projectFolder}/${entryRel}`;
        const root = javaProjectSourceRoot(state, workspacePath);
        if (root) folders.add(root);
      }
    }
  }

  walk(state.root);
  return folders;
}

function javaProjectSourceFolders(state) {
  const folders = detectJavaProjectSourceFolders(state);
  for (const folder of state.activeSourceFolders) folders.add(folder);
  if (state.activeAlgorithmSourceFolder) folders.add(state.activeAlgorithmSourceFolder);

  const all = [...folders].sort();
  if (!all.length) return [""];
  return all.filter(folder =>
    folder === "" || !all.some(other => other !== folder && other !== "" && other.startsWith(folder + "/"))
  );
}

function findJavaProjectJars(state) {
  const jars = new Set();

  function walk(dir, valueForFile) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file, valueForFile);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".jar")) {
        jars.add(valueForFile(file));
      }
    }
  }

  if (existsSync(ALGATOR_RUNTIME_ROOT)) walk(ALGATOR_RUNTIME_ROOT, file => file);
  walk(state.root, file => relative(state.root, file).replace(/\\/g, "/"));
  return [...jars].sort();
}

function javaProjectJarAbsolutePath(state, jarPath) {
  return jarPath.startsWith("/") ? jarPath : join(state.root, jarPath);
}

function notifyJavaConnectionFileChanged(connection, workspacePath) {
  const rel = javaProjectRelativePath(connection.state, workspacePath);
  if (!rel && workspacePath !== ".classpath") return;

  if (!connection.process.isInitialized()) {
    connection.pendingFileChanges.add(workspacePath);
    return;
  }

  const file = workspacePath === ".classpath"
    ? join(connection.state.root, ".classpath")
    : join(connection.state.root, rel);
  connection.process.sendNotification("workspace/didChangeWatchedFiles", {
    changes: [{ uri: pathToFileURL(file).href, type: 2 }]
  });
}

function flushJavaConnectionFileChanges(connection) {
  if (!connection.process.isInitialized() || !connection.pendingFileChanges.size) return;

  const pending = [...connection.pendingFileChanges];
  connection.pendingFileChanges.clear();

  for (const workspacePath of pending) {
    notifyJavaConnectionFileChanged(connection, workspacePath);
  }
}

function bootstrapJavaProjectState(state) {
  const sourceFolders = javaProjectSourceFolders(state);
  const jars = findJavaProjectJars(state);
  const settingsDir = join(state.root, ".settings");
  const outputFolder = "bin/smartcode";

  for (const folder of sourceFolders) {
    if (folder) mkdirSync(join(state.root, folder), { recursive: true });
  }

  mkdirSync(settingsDir, { recursive: true });
  mkdirSync(join(state.root, outputFolder), { recursive: true });

  const sourceEntries = sourceFolders
    .map(folder => classpathEntryForSourceFolder(folder, sourceFolders))
    .join("\n");
  const jarEntries = jars
    .map(path => `  <classpathentry kind="lib" path="${escapeXml(path)}"/>`)
    .join("\n");
  const projectName = `smartcode-${state.projectFolder.replace(/[^A-Za-z0-9._-]/g, "_")}`;

  const projectContent = `<?xml version="1.0" encoding="UTF-8"?>
<projectDescription>
  <name>${escapeXml(projectName)}</name>
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
  <classpathentry kind="output" path="${outputFolder}"/>
</classpath>
`;
  const prefsContent = `eclipse.preferences.version=1
org.eclipse.jdt.core.compiler.codegen.targetPlatform=17
org.eclipse.jdt.core.compiler.compliance=17
org.eclipse.jdt.core.compiler.source=17
`;

  writeFileIfChanged(join(state.root, ".project"), projectContent);
  const classpathChanged = writeFileIfChanged(join(state.root, ".classpath"), classpathContent);
  writeFileIfChanged(join(settingsDir, "org.eclipse.jdt.core.prefs"), prefsContent);

  if (classpathChanged) {
    for (const connection of state.connections) {
      notifyJavaConnectionFileChanged(connection, ".classpath");
      if (connection.process.isInitialized()) {
        connection.process.sendNotification("java/projectConfigurationUpdate", { uri: state.uri });
        connection.process.sendNotification("workspace/didChangeConfiguration", {
          settings: {
            java: {
              project: {
                referencedLibraries: jars.map(path => javaProjectJarAbsolutePath(state, path))
              }
            }
          }
        });
      }
    }
  }

  return { sourceFolders, jars, outputFolder, classpathChanged };
}

function createJavaConnection(state, ws) {
  if (state.sharedConnection) {
    const connection = state.sharedConnection;
    clearTimeout(connection.idleStopTimer);
    connection.idleStopTimer = null;
    connection.clients.add(ws);
    return connection;
  }

  const clients = new Set([ws]);
  const id = ++javaConnectionId;
  const scope = state.projectFolder.replace(/[^A-Za-z0-9._-]/g, "_");
  const dataDirectory = join(JAVA_DATA_ROOT, scope, "shared");
  const pluginsDir = "/opt/jdtls/plugins";

  const connection = {
    id,
    state,
    clients,
    openDocuments: new Set(),
    documentOwners: new Map(),
    documentSnapshots: new Map(),
    documentVersions: new Map(),
    pendingDocumentCloseTimers: new Map(),
    pendingFileChanges: new Set(),
    idleStopTimer: null,
    started: false,
    process: null
  };

  connection.process = createLspProcess(`jdtls:${state.projectFolder}:${id}`, () => {
    mkdirSync(dataDirectory, { recursive: true });
    if (!existsSync(pluginsDir)) throw new Error("jdtls not installed at /opt/jdtls");
    const launcher = readdirSync(pluginsDir)
      .find(file => file.startsWith("org.eclipse.equinox.launcher_") && file.endsWith(".jar"));
    if (!launcher) throw new Error("jdtls launcher jar not found in " + pluginsDir);

    return {
      cmd: "java",
      args: [
        "-Declipse.application=org.eclipse.jdt.ls.core.id1",
        "-Dosgi.bundles.defaultStartLevel=4",
        "-Declipse.product=org.eclipse.jdt.ls.core.product",
        "-Djava.lsp.joinOnCompletion=true",
        "-Dlog.level=ERROR",
        "-Dfile.encoding=UTF-8",
        "-Xms256m", "-Xmx1G", "-XX:+UseG1GC",
        "--add-modules=ALL-SYSTEM",
        "--add-opens", "java.base/java.util=ALL-UNNAMED",
        "--add-opens", "java.base/java.lang=ALL-UNNAMED",
        "--add-opens", "java.base/sun.nio.ch=ALL-UNNAMED",
        "-jar", join(pluginsDir, launcher),
        "-configuration", "/opt/jdtls/config_linux",
        "-data", dataDirectory
      ],
      opts: { cwd: state.root }
    };
  }, clients);

  state.sharedConnection = connection;
  state.connections.add(connection);
  javaConnections.add(connection);
  return connection;
}

function javaDocumentDiskContent(connection, uri) {
  const workspacePath = javaWorkspacePathFromUri(connection.state, uri);
  if (!workspacePath) return null;
  const rel = javaProjectRelativePath(connection.state, workspacePath);
  const file = rel ? join(connection.state.root, rel) : null;
  if (!file || !existsSync(file)) return null;
  try { return readFileSync(file, "utf8"); }
  catch { return null; }
}

function cancelPendingJavaDocumentClose(connection, uri) {
  const timer = connection.pendingDocumentCloseTimers.get(uri);
  if (timer) clearTimeout(timer);
  connection.pendingDocumentCloseTimers.delete(uri);
}

function closeJavaDocumentNow(connection, uri) {
  cancelPendingJavaDocumentClose(connection, uri);
  if (!connection.openDocuments.has(uri)) return;
  connection.process.sendNotification("textDocument/didClose", { textDocument: { uri } });
  connection.openDocuments.delete(uri);
  connection.documentOwners.delete(uri);
  connection.documentSnapshots.delete(uri);
  connection.documentVersions.delete(uri);
}

function scheduleJavaDocumentClose(connection, uri, startedAt = Date.now()) {
  cancelPendingJavaDocumentClose(connection, uri);

  const owners = connection.documentOwners.get(uri);
  if (owners && owners.size) return;

  const snapshot = connection.documentSnapshots.get(uri);
  const disk = javaDocumentDiskContent(connection, uri);
  if (snapshot == null || disk === snapshot || Date.now() - startedAt >= 120000) {
    closeJavaDocumentNow(connection, uri);
    return;
  }

  const timer = setTimeout(() => scheduleJavaDocumentClose(connection, uri, startedAt), 100);
  connection.pendingDocumentCloseTimers.set(uri, timer);
}

function releaseJavaWebSocketDocuments(connection, ws) {
  for (const uri of ws.javaOpenDocuments || []) {
    const owners = connection.documentOwners.get(uri);
    if (owners) {
      owners.delete(ws);
      if (!owners.size) scheduleJavaDocumentClose(connection, uri);
    }
  }
  ws.javaOpenDocuments?.clear();
}

function scheduleJavaConnectionIdleStop(connection) {
  if (connection.clients.size || connection.idleStopTimer) return;
  connection.idleStopTimer = setTimeout(() => {
    if (connection.clients.size) return;
    for (const timer of connection.pendingDocumentCloseTimers.values()) clearTimeout(timer);
    connection.pendingDocumentCloseTimers.clear();
    connection.process.stop();
    connection.state.connections.delete(connection);
    javaConnections.delete(connection);
    if (connection.state.sharedConnection === connection) connection.state.sharedConnection = null;
  }, 120000);
}

function javaWorkspacePathFromUri(state, uri) {
  const rootUri = pathToFileURL(state.root + "/").href;
  const value = String(uri || "");
  if (!value.startsWith(rootUri)) return "";
  return `${state.projectFolder}/${normalizePath(decodeURIComponent(value.slice(rootUri.length)))}`;
}

function javaMessageDocumentUri(message) {
  return message?.params?.textDocument?.uri || message?.params?.uri || "";
}

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
      const state = await waitForJavaProjectState(newFolder);
      if (!state) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid project folder" }));
        return;
      }
      projectFolder = newFolder;
      console.log(`[server] projectFolder nastavljen na: ${projectFolder || "/"}`);
      await syncLsyncToWorkspace();
      bootstrapJavaProjectState(state);
      watchLsyncRoot();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        projectFolder: state.projectFolder,
        workspace: state.root,
        workspaceUri: state.uri
      }));
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
        projectFolder = newFolder;
      }
      await syncLsyncToWorkspace();
      const state = javaProjectState(projectFolder);
      if (state) bootstrapJavaProjectState(state);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        projectFolder,
        workspace: state?.root || WORKSPACE,
        workspaceUri: state?.uri || WORKSPACE_URI
      }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/rebuild-java-classpath") {
    try {
      const state = javaProjectState(projectFolder);
      if (!state) throw new Error("Java project is not selected");
      const result = bootstrapJavaProjectState(state);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, javaSourceFolders: result.sourceFolders }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/java-context") {
    try {
      const body = await readRequestBody(req);
      const data = JSON.parse(body || "{}");
      const requestedProject = normalizeSyncRoot(data.projectFolder || "");
      const file = normalizePath(data.file || data.filename || "");
      const projectState = javaProjectState(requestedProject);

      if (
        !projectState ||
        !file.startsWith(requestedProject + "/") ||
        !file.toLowerCase().endsWith(".java")
      ) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid Java context" }));
        return;
      }

      const fp = safeJoin(WORKSPACE, file);
      const content = fp && existsSync(fp) ? readFileSync(fp, "utf8") : null;
      addJavaProjectSourceFile(projectState, file, content);
      const state = bootstrapJavaProjectState(projectState);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        projectFolder: requestedProject,
        file,
        javaSourceFolders: state.sourceFolders,
        classpathChanged: state.classpathChanged
      }));
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
      const state = javaProjectState(projectFolder);
      if (!state) throw new Error("Java project is not selected");
      if (folder) state.activeSourceFolders.add(folder);
      const result = bootstrapJavaProjectState(state);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, javaSourceFolders: result.sourceFolders }));
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

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        ok: true,
        projectFolder: source.projectFolder,
        relativePath: source.projectRelativePath,
        workspacePath: source.workspaceRelativePath,
        language: source.language
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
        const state = javaProjectState(relPath.split("/")[0]);
        if (state) {
          addJavaProjectSourceFile(state, relPath, body);
          bootstrapJavaProjectState(state);
        }
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
        const state = javaProjectState(relPath.split("/")[0]);
        if (state) {
          addJavaProjectSourceFile(state, relPath, updated);
          bootstrapJavaProjectState(state);
        }
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
      const projectState = javaProjectState(projectFolder);
      if (!projectState) throw new Error("Java project is not selected");
      const state = bootstrapJavaProjectState(projectState);

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        projectFolder: projectState.projectFolder,
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
      jdtlsDataDir: JAVA_DATA_ROOT,
      clangd:       clangd.isReady(),
      jdtls:        [...javaConnections].some(connection => connection.process.isReady()),
      clangdClients: clangdClients.size,
      javaClients:   javaConnections.size,
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
  const requestUrl = new URL(req.url || "/", "http://localhost");
  if (requestUrl.pathname === "/java") {
    const requestedProject = normalizeSyncRoot(requestUrl.searchParams.get("projectFolder") || "");
    const state = javaProjectState(requestedProject);
    if (!state) {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wssJava.handleUpgrade(req, socket, head, ws => wssJava.emit("connection", ws, state));
  } else {
    wssClangd.handleUpgrade(req, socket, head, ws => wssClangd.emit("connection", ws));
  }
});

function setupWss(wss, lspProc, clientSet, name) {
  wss.on("connection", ws => {
    ws.initialized = false;
    ws.openDocuments = new Set();
    ws.cleanedUp = false;
    clientSet.add(ws);
    console.log(`[${name}] browser connected (${clientSet.size} active)`);

    ws.on("message", raw => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.method === "initialized") {
          ws.initialized = true;
        }

        lspProc.handleClientMessage(ws, msg);
      } catch (e) {
        console.error(`[${name}] bad WS message:`, e.message);
      }
    });

    const cleanup = () => {
      if (ws.cleanedUp) return;
      ws.cleanedUp = true;

      clientSet.delete(ws);
    };

    ws.on("close", () => {
      cleanup();
      console.log(`[${name}] disconnected`);
    });

    ws.on("error", err => {
      cleanup();
      console.error(`[${name}] WS error:`, err.message);
    });
  });
}

function setupJavaWss() {
  wssJava.on("connection", (ws, state) => {
    const connection = createJavaConnection(state, ws);
    ws.cleanedUp = false;
    ws.javaOpenDocuments = new Set();
    bootstrapJavaProjectState(state);
    console.log(`[jdtls:${state.projectFolder}] browser connected`);

    ws.on("message", raw => {
      try {
        const message = JSON.parse(raw.toString());

        if (message.method === "initialize") {
          message.params = {
            ...(message.params || {}),
            rootUri: state.uri,
            workspaceFolders: [{ uri: state.uri, name: state.projectFolder }]
          };
        }

        const documentUri = javaMessageDocumentUri(message);
        const workspacePath = documentUri
          ? javaWorkspacePathFromUri(state, documentUri)
          : "";

        if (documentUri && !workspacePath) {
          if (message.id !== undefined) {
            ws.send(JSON.stringify({
              jsonrpc: "2.0",
              id: message.id,
              error: { code: -32602, message: "Document is outside the selected project" }
            }));
          }
          return;
        }

        if (message.method === "textDocument/didOpen") {
          const textDocument = message.params?.textDocument;
          const uri = textDocument?.uri;
          if (!uri) return;

          cancelPendingJavaDocumentClose(connection, uri);
          ws.javaOpenDocuments.add(uri);
          if (!connection.documentOwners.has(uri)) connection.documentOwners.set(uri, new Set());
          connection.documentOwners.get(uri).add(ws);

          const previousAlgorithmRoot = state.activeAlgorithmSourceFolder;
          const previousSourceFolders = new Set(state.activeSourceFolders);
          addJavaProjectSourceFile(state, workspacePath, textDocument?.text || "");
          if (
            previousAlgorithmRoot !== state.activeAlgorithmSourceFolder ||
            previousSourceFolders.size !== state.activeSourceFolders.size
          ) {
            bootstrapJavaProjectState(state);
          }

          const text = String(textDocument?.text ?? "");
          if (connection.openDocuments.has(uri)) {
            const previousText = connection.documentSnapshots.get(uri);
            if (previousText !== text) {
              const version = (connection.documentVersions.get(uri) || 1) + 1;
              connection.documentVersions.set(uri, version);
              connection.documentSnapshots.set(uri, text);
              connection.process.sendNotification("textDocument/didChange", {
                textDocument: { uri, version },
                contentChanges: [{ text }]
              });
            }
            return;
          }

          const version = 1;
          message.params.textDocument.version = version;
          connection.openDocuments.add(uri);
          connection.documentVersions.set(uri, version);
          connection.documentSnapshots.set(uri, text);
        } else if (message.method === "textDocument/didChange") {
          const uri = message.params?.textDocument?.uri;
          if (uri) {
            const changes = Array.isArray(message.params?.contentChanges)
              ? message.params.contentChanges
              : [];
            const fullTextChange = [...changes].reverse().find(change => typeof change?.text === "string");
            if (fullTextChange) connection.documentSnapshots.set(uri, fullTextChange.text);

            const version = (connection.documentVersions.get(uri) || 1) + 1;
            connection.documentVersions.set(uri, version);
            message.params.textDocument.version = version;
          }
        } else if (message.method === "textDocument/didClose") {
          const uri = message.params?.textDocument?.uri;
          if (!uri) return;

          ws.javaOpenDocuments.delete(uri);
          const owners = connection.documentOwners.get(uri);
          if (owners) {
            owners.delete(ws);
            if (!owners.size) scheduleJavaDocumentClose(connection, uri);
          }
          return;
        }

        connection.process.handleClientMessage(ws, message);

        if (message.method === "initialized") {
          const result = bootstrapJavaProjectState(state);
          connection.process.sendNotification("workspace/didChangeConfiguration", {
            settings: {
              java: {
                project: {
                  referencedLibraries: result.jars.map(path => javaProjectJarAbsolutePath(state, path))
                }
              }
            }
          });
          flushJavaConnectionFileChanges(connection);

          if (connection.process.isInitialized() && ws.readyState === 1) {
            ws.send(JSON.stringify({
              jsonrpc: "2.0",
              method: "language/status",
              params: { type: "ServiceReady", message: "" }
            }));
          }
        }
      } catch (error) {
        console.error(`[jdtls:${state.projectFolder}] bad WS message:`, error.message);
      }
    });

    const cleanup = () => {
      if (ws.cleanedUp) return;
      ws.cleanedUp = true;

      releaseJavaWebSocketDocuments(connection, ws);
      connection.clients.delete(ws);
      scheduleJavaConnectionIdleStop(connection);
    };

    ws.on("close", () => {
      cleanup();
      console.log(`[jdtls:${state.projectFolder}] disconnected`);
    });
    ws.on("error", error => {
      cleanup();
      console.error(`[jdtls:${state.projectFolder}] WS error:`, error.message);
    });

    if (!connection.started) {
      connection.started = true;
      connection.process.start();
    }
  });
}

const JAVA_CLASSPATH_REFRESH_MS = Number(process.env.JAVA_CLASSPATH_REFRESH_MS || 2000);
if (JAVA_CLASSPATH_REFRESH_MS > 0) {
  setInterval(() => {
    for (const state of javaProjectStates.values()) {
      try { bootstrapJavaProjectState(state); }
      catch (e) { console.warn(`[java] classpath refresh failed: ${e.message}`); }
    }
  }, JAVA_CLASSPATH_REFRESH_MS);
}

setupWss(wssClangd, clangd, clangdClients, "clangd");
setupJavaWss();

const initialJavaProject = javaProjectState(projectFolder);
if (initialJavaProject) bootstrapJavaProjectState(initialJavaProject);

clangd.start();

watchLsyncRoot();

server.listen(3000, () => {
  console.log("SmartCode LSP server na http://localhost:3000");
  console.log("  LSYNC_ROOT:    ", LSYNC_ROOT);
  console.log("  LSP root:      ", WORKSPACE);
  console.log("  projectFolder: ", projectFolder || "(cel lsync-root)");
  console.log("  WORKSPACE_URI: ", WORKSPACE_URI);
});
