//Preveri odvisnosti
if (typeof SmartCodeConfig === "undefined") throw new Error("config.js ni naložen!");
if (typeof CodeMirror === "undefined") throw new Error("codemirror.js ni naložen!");

let editor;
const CFG = SmartCodeConfig;

const fileStates = new Map();
let activeFile = null;

let diagnosticMarks = [];
const diagnosticsByFile = new Map();

let autosaveTimer = null;
let completionTimer = null;
let signatureTimer = null;
let isFileSwitch = false;
let suppressInputRead = false;
let completionReqSeq = 0;
let clangdInitialized = false;
let javaInitialized = false;
let didChangeWatchedTimer = null;
const openedDocs = new Set();

let activeFolderHandle = null;


let activeProject = null;
let browserPersistenceEnabled = false;

const DEBUG_LSP = false;

function debugLog(...args) {
  if (DEBUG_LSP) console.log(...args);
}

function hasServerSupport() {
  return !!(CFG.server?.httpUrl && CFG.server?.wsClangd && CFG.server?.wsJava);
}

function supportsFsAccess() {
  return !!window.showOpenFilePicker && !!window.showDirectoryPicker;
}

function normalizePath(path) {
  return String(path || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function safeProjectId(id) {
  return normalizePath(id || "default")
    .replace(/[^A-Za-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

function currentStorageNamespace() {
  return activeProject?.id ? safeProjectId(activeProject.id) : "standalone";
}

function baseName(path) {
  const p = normalizePath(path);
  const parts = p.split("/");
  return parts[parts.length - 1] || p;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapePathSegment(segment) {
  return encodeURIComponent(segment).replace(/%2F/g, "/");
}

function severityToClass(severity) {
  if (severity === 1) return "error";
  if (severity === 2) return "warning";
  if (severity === 3) return "info";
  return "hint";
}

function severityToLabel(severity) {
  if (severity === 1) return "Error";
  if (severity === 2) return "Warning";
  if (severity === 3) return "Info";
  return "Hint";
}

function compactDiagnosticMessage(message) {
  const text = String(message || "").trim();

  if (/^The import .+ cannot be resolved$/i.test(text)) {
    return "The import cannot be resolved";
  }

  if (/^.+ cannot be resolved to a type$/i.test(text)) {
    return "A type cannot be resolved";
  }

  if (/^The method .+ must override or implement a supertype method$/i.test(text)) {
    return "A method cannot override or implement a supertype method";
  }

  return text;
}

function compactDiagnostics(diagnostics) {
  const seen = new Set();

  return (diagnostics || [])
    .filter(diag => diag && (diag.severity === 1 || diag.severity === 2))
    .filter(diag => {
      const start = diag.range?.start || {};
      const end = diag.range?.end || {};
      const key = [
        diag.severity,
        diag.message,
        start.line,
        start.character,
        end.line,
        end.character
      ].join("|");

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function groupDiagnosticsForPanel(diagnostics) {
  const groups = new Map();

  (diagnostics || []).forEach(diag => {
    const message = compactDiagnosticMessage(diag.message);
    const key = `${diag.severity}|${message}`;
    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      existing.locations.push(diag);
    } else {
      groups.set(key, {
        severity: diag.severity,
        message,
        first: diag,
        count: 1,
        locations: [diag]
      });
    }
  });

  return Array.from(groups.values());
}

// Browser cache


function cacheKeyForFile(filename) {
  return `smartcode:${currentStorageNamespace()}:file:${normalizePath(filename)}`;
}

function cacheFileListKey() {
  return `smartcode:${currentStorageNamespace()}:filelist`;
}

function activeProjectKey() {
  return "smartcode:activeProject";
}

function persistFileListToBrowser() {
  if (!browserPersistenceEnabled || !activeProject) return;

  try {
    localStorage.setItem(cacheFileListKey(), JSON.stringify([...fileStates.keys()]));
    localStorage.setItem(activeProjectKey(), JSON.stringify({
      id: activeProject.id,
      name: activeProject.name || activeProject.id,
      source: activeProject.source || "browser"
    }));
  } catch (e) {
    console.warn("persistFileListToBrowser failed:", e.message);
  }
}

function persistFileToBrowser(filename, content) {
  if (!browserPersistenceEnabled || !activeProject) return false;

  try {
    localStorage.setItem(cacheKeyForFile(filename), content ?? "");
    persistFileListToBrowser();
    return true;
  } catch (e) {
    console.warn("persistFileToBrowser failed:", e.message);
    return false;
  }
}

function readFileFromBrowser(filename) {
  try {
    return localStorage.getItem(cacheKeyForFile(filename));
  } catch {
    return null;
  }
}

function loadBrowserWorkspace(projectMeta = null) {
  if (!browserPersistenceEnabled || !activeProject) return;

  try {
    if (projectMeta) {
      activeProject = {
        id: safeProjectId(projectMeta.id || projectMeta.name),
        name: projectMeta.name || projectMeta.id || "Project",
        source: projectMeta.source || "browser"
      };
    }

    const raw = localStorage.getItem(cacheFileListKey());
    const files = raw ? JSON.parse(raw) : [];

    for (const filename of files) {
      const norm = normalizePath(filename);
      const text = readFileFromBrowser(norm);
      if (text !== null && !fileStates.has(norm)) {
        fileStates.set(norm, createFileState(norm, {
          content: text,
          dirty: false
        }));
      }
    }
  } catch (e) {
    console.warn("loadBrowserWorkspace failed:", e.message);
  }
}

function modeForFile(filename) {
  const f = normalizePath(filename).toLowerCase();
  if (f.endsWith(".java")) return "text/x-java";
  if (f.endsWith(".c")) return "text/x-csrc";
  if (
    f.endsWith(".cpp") ||
    f.endsWith(".cc") ||
    f.endsWith(".cxx") ||
    f.endsWith(".h") ||
    f.endsWith(".hpp")
  ) return "text/x-c++src";
  return "text/plain";
}

const languageIds = {
  "text/x-java": "java",
  "text/x-csrc": "c",
  "text/x-c++src": "cpp",
  "text/plain": "plaintext"
};

const themes = {
  "text/x-java": "eclipse",
  "text/x-csrc": "eclipse",
  "text/x-c++src": "eclipse",
  "text/plain": "eclipse"
};

function uriForFile(filename) {
  return `${CFG.workspace.rootUri}/${normalizePath(filename)}`;
}

function isClangdFile(filename) {
  const m = modeForFile(filename);
  return m === "text/x-c++src" || m === "text/x-csrc";
}

function isJavaFile(filename) {
  return modeForFile(filename) === "text/x-java";
}

function isCodeFile(filename) {
  const m = modeForFile(filename);
  return m === "text/x-java" || m === "text/x-csrc" || m === "text/x-c++src";
}

function shouldMirrorFile(filename) {
  const f = normalizePath(filename).toLowerCase();
  return (
    f.endsWith(".java") ||
    f.endsWith(".c") ||
    f.endsWith(".cpp") ||
    f.endsWith(".cc") ||
    f.endsWith(".cxx") ||
    f.endsWith(".h") ||
    f.endsWith(".hpp") ||
    f.endsWith("compile_commands.json") ||
    f.endsWith("cmakelists.txt") ||
    f.endsWith(".project") ||
    f.endsWith(".classpath") ||
    f.includes(".settings/")
  );
}

function currentMode() {
  return modeForFile(activeFile || "");
}

function isClangd() {
  return isClangdFile(activeFile || "");
}

function isJava() {
  return isJavaFile(activeFile || "");
}

function createFileState(filename, extra = {}) {
  const mode = modeForFile(filename);
  return {
    filename: normalizePath(filename),
    uri: uriForFile(filename),
    languageId: languageIds[mode] || "plaintext",
    version: 1,
    content: null,
    handle: null,
    dirty: false,
    ...extra
  };
}

function ensureFileState(filename, extra = {}) {
  const key = normalizePath(filename);
  if (!fileStates.has(key)) {
    fileStates.set(key, createFileState(key, extra));
  } else {
    Object.assign(fileStates.get(key), extra || {});
  }
  return fileStates.get(key);
}

function docState() {
  const st = fileStates.get(activeFile);
  if (!st) return { uri: "", languageId: "plaintext", version: 1 };
  return st;
}


// Local file handles


async function readHandleText(handle) {
  const file = await handle.getFile();
  return await file.text();
}

async function ensureLocalHandleForState(filename, st) {
  if (st.handle) return st.handle;

  if (activeFolderHandle) {
    const parts = normalizePath(filename).split("/").filter(Boolean);
    if (!parts.length) return null;

    let dir = activeFolderHandle;
    for (const segment of parts.slice(0, -1)) {
      dir = await dir.getDirectoryHandle(segment, { create: true });
    }

    st.handle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    return st.handle;
  }

  if (window.showSaveFilePicker) {
    st.handle = await window.showSaveFilePicker({
      suggestedName: baseName(filename) || filename,
      excludeAcceptAllOption: false
    });
    return st.handle;
  }

  return null;
}

async function loadContentForState(filename, st) {
  const norm = normalizePath(filename);

  if (st.handle) {
    try {
      const text = await readHandleText(st.handle);
      st.content = text;
      persistFileToBrowser(norm, text);
      return text;
    } catch (e) {
      console.warn("Local file read failed:", norm, e.message);
    }
  }

  if (hasServerSupport()) {
    try {
      const res = await fetch(`${CFG.server.httpUrl}/workspace/${escapePathSegment(norm)}`, {
        cache: "no-store"
      });

      if (res.ok) {
        const text = await res.text();
        st.content = text;
        persistFileToBrowser(norm, text);
        return text;
      }
    } catch (e) {
      console.warn("Workspace file read failed:", norm, e.message);
    }
  }

  const cached = readFileFromBrowser(norm);
  if (cached !== null) {
    st.content = cached;
    return cached;
  }

  st.content = defaultSnippet(norm);
  return st.content;
}

async function writeStateToLocal(filename, st, { promptIfNeeded = true } = {}) {
  if (!st) return false;

  const content = filename === activeFile && editor ? editor.getValue() : (st.content ?? "");
  st.content = content;

  let handle = st.handle || null;

  if (!handle && promptIfNeeded) {
    try {
      handle = await ensureLocalHandleForState(filename, st);
    } catch (e) {
      console.warn("Local save picker cancelled or failed:", e.message);
      return false;
    }
  }

  if (!handle) return false;

  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();

  st.handle = handle;
  return true;
}


async function syncFileToServer(filename, content) {
  if (!hasServerSupport()) return false;
  if (!shouldMirrorFile(filename)) return false;

  const rel = normalizePath(filename);
  if (!rel) return false;

  try {
    const res = await fetch(`${CFG.server.httpUrl}/workspace/${escapePathSegment(rel)}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: content ?? ""
    });
    return res.ok;
  } catch (e) {
    console.warn("syncFileToServer failed:", rel, e.message);
    return false;
  }
}

async function mirrorStateToServer(filename) {
  const st = fileStates.get(filename);
  if (!st) return false;
  const content = filename === activeFile && editor ? editor.getValue() : (st.content ?? "");
  return await syncFileToServer(filename, content);
}

async function notifyServerFileChange(filename, type = 2) {
  if (!hasServerSupport()) return;

  const st = fileStates.get(filename);
  if (!st) return;

  if (isJavaFile(filename) && javaInitialized && typeof sendJavaNotification === "function") {
    sendJavaNotification("workspace/didChangeWatchedFiles", {
      changes: [{ uri: st.uri, type }]
    });
  }
}

async function setServerSyncRoot(syncRoot) {
  if (!hasServerSupport()) return false;
  const root = normalizePath(syncRoot || "").replace(/\/+$/, "");
  try {
    const res = await fetch(`${CFG.server.httpUrl}/sync-root`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncRoot: root })
    });
    return res.ok;
  } catch (e) {
    console.warn("setServerSyncRoot failed:", e.message);
    return false;
  }
}

async function setServerProjectFolder(projectFolder) {
  if (!hasServerSupport()) return false;
  const folder = normalizePath(projectFolder || "").replace(/\/+$/, "");
  try {
    const res = await fetch(`${CFG.server.httpUrl}/project-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectFolder: folder })
    });
    if (res.ok) {
      console.log("[editor] project-folder nastavljen:", folder || "(cel lsync-root)");
    }
    return res.ok;
  } catch (e) {
    console.warn("setServerProjectFolder failed:", e.message);
    return false;
  }
}

let embeddedServerProjectFolder = null;

async function ensureEmbeddedServerProjectFolder(projectFolder) {
  const folder = normalizePath(projectFolder || "").replace(/\/+$/, "");
  if (!folder || embeddedServerProjectFolder === folder) return true;
  const ok = await setServerProjectFolder(folder);
  if (ok) embeddedServerProjectFolder = folder;
  return ok;
}

// LSP routing

function lspRequest(method, params) {
  if (!hasServerSupport()) return Promise.reject(new Error("No server"));
  if (isJava() && typeof sendJavaRequest === "function") return sendJavaRequest(method, params);
  if (isClangd() && typeof sendLspRequest === "function") return sendLspRequest(method, params);
  return Promise.reject(new Error("No LSP for this language"));
}

function lspNotification(method, params) {
  if (!hasServerSupport()) return;
  if (isJava() && typeof sendJavaNotification === "function") {
    sendJavaNotification(method, params);
    return;
  }
  if (isClangd() && typeof sendLspNotification === "function") {
    sendLspNotification(method, params);
  }
}

function lspReady() {
  if (!hasServerSupport()) return false;

  if (isJava()) {
    return javaInitialized && typeof isJavaLspReady === "function" && isJavaLspReady();
  }

  if (isClangd()) {
    return clangdInitialized && typeof isLspReady === "function" && isLspReady();
  }

  return false;
}

// Signature hint

let sigEl = null;

function showSignatureHint(html) {
  if (!html) {
    hideSignatureHint();
    return;
  }

  if (!sigEl) {
    sigEl = document.createElement("div");
    sigEl.className = "cm-signature-hint";
    document.body.appendChild(sigEl);
  }

  sigEl.innerHTML = html;
  sigEl.style.display = "block";

  requestAnimationFrame(() => {
    if (!sigEl || !editor) return;
    const cur = editor.getCursor();
    const coords = editor.charCoords({ line: cur.line, ch: cur.ch }, "window");
    sigEl.style.left = Math.max(4, coords.left) + "px";
    sigEl.style.top = (coords.top - sigEl.offsetHeight - 8) + "px";
  });
}

function hideSignatureHint() {
  if (sigEl) sigEl.style.display = "none";
}

function callDepth() {
  if (!editor) return 0;

  const cur = editor.getCursor();
  const before = (editor.getLine(cur.line) || "").slice(0, cur.ch);
  let depth = 0;
  let inStr = false;
  let strCh = "";

  for (const ch of before) {
    if (inStr) {
      if (ch === strCh) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      strCh = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")" && depth > 0) depth--;
  }

  return depth;
}

function scheduleSignatureRefresh(triggerChar, isRetrigger, delay) {
  clearTimeout(signatureTimer);
  signatureTimer = setTimeout(() => {
    if (callDepth() > 0) requestSignatureHelp(triggerChar, isRetrigger);
    else hideSignatureHint();
  }, delay ?? CFG.editor.completionDelay);
}

// Completion help

function stripSnippets(text) {
  if (!text) return "";
  return text
    .replace(/\$\{[0-9]+:[^}]*\}/g, "")
    .replace(/\$\{[0-9]+\}/g, "")
    .replace(/\$[0-9]+/g, "")
    .replace(/\$\{[^}]+\}/g, "")
    .trimEnd();
}

function getInsertText(item) {
  if (item.textEdit?.newText) return stripSnippets(item.textEdit.newText);
  if (item.insertText) return stripSnippets(item.insertText);
  return item.label || "";
}

function getCompletionEditRange(item, fallbackFrom, fallbackTo) {
  const edit = item?.textEdit;
  const range =
    edit?.replace ||
    edit?.insert ||
    edit?.range;

  if (
    !range?.start ||
    !range?.end ||
    !Number.isInteger(range.start.line) ||
    !Number.isInteger(range.start.character) ||
    !Number.isInteger(range.end.line) ||
    !Number.isInteger(range.end.character)
  ) {
    return {
      from: fallbackFrom,
      to: fallbackTo
    };
  }

  return {
    from: {
      line: range.start.line,
      ch: range.start.character
    },
    to: {
      line: range.end.line,
      ch: range.end.character
    }
  };
}

const JAVA_LOCAL_SNIPPETS = [
  {
    label: "cast",
    detail: "Casts the expression to a new type",
    insertText: "(${1:Type}) ${2:expression}"
  },
  {
    label: "for",
    detail: "Creates a for statement",
    insertText: "for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$0\n}"
  },
  {
    label: "foreach",
    detail: "Creates an enhanced for statement",
    insertText: "for (${1:Type} ${2:item} : ${3:collection}) {\n\t$0\n}"
  },
  {
    label: "forr",
    detail: "Creates a reverse for statement",
    insertText: "for (int ${1:i} = ${2:length} - 1; ${1:i} >= 0; ${1:i}--) {\n\t$0\n}"
  },
  {
    label: "nnull",
    detail: "Creates an if statement and checks for not null",
    insertText: "if (${1:expression} != null) {\n\t$0\n}"
  },
  {
    label: "null",
    detail: "Creates an if statement and checks for null",
    insertText: "if (${1:expression} == null) {\n\t$0\n}"
  },
  {
    label: "opt",
    detail: "Creates an Optional.ofNullable(...) call",
    insertText: "Optional.ofNullable(${1:value})"
  },
  {
    label: "syserr",
    detail: "Sends the affected object to System.err",
    insertText: "System.err.println(${1});"
  },
  {
    label: "sysout",
    detail: "Sends the affected object to System.out",
    insertText: "System.out.println(${1});"
  }
];

function javaSnippetItems(prefix = "") {
  const low = String(prefix || "").toLowerCase();

  return JAVA_LOCAL_SNIPPETS
    .filter(snippet => !low || snippet.label.startsWith(low))
    .map((snippet, index) => ({
      ...snippet,
      kind: 15,
      insertTextFormat: 2,
      sortText: `0000-${String(index).padStart(2, "0")}-${snippet.label}`,
      data: {
        smartCodeLocalJavaSnippet: true
      }
    }));
}

function isLocalJavaSnippet(item) {
  return item?.data?.smartCodeLocalJavaSnippet === true;
}

function expandSnippetText(rawText, indent = "") {
  const raw = String(rawText || "");
  const placeholders = new Map();
  let finalCursor = null;
  let output = "";
  let lastIndex = 0;

  const appendText = value => {
    output += String(value || "").replace(/\n/g, `\n${indent}`);
  };

  const tokenPattern =
    /\$\{(\d+):([^}]*)\}|\$\{(\d+)\}|\$(\d+)/g;

  let match;

  while ((match = tokenPattern.exec(raw)) !== null) {
    appendText(raw.slice(lastIndex, match.index));

    const placeholderNumber = Number(
      match[1] ?? match[3] ?? match[4]
    );

    const defaultValue = match[2] ?? "";

    if (placeholderNumber === 0) {
      finalCursor = output.length;
    } else {
      const start = output.length;
      appendText(defaultValue);
      const end = output.length;

      if (!placeholders.has(placeholderNumber)) {
        placeholders.set(placeholderNumber, {
          start,
          end
        });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  appendText(raw.slice(lastIndex));

  const orderedPlaceholders = Array.from(placeholders.entries())
    .sort((a, b) => a[0] - b[0]);

  return {
    text: output,
    selection: orderedPlaceholders.length
      ? orderedPlaceholders[0][1]
      : null,
    finalCursor:
      finalCursor === null ? output.length : finalCursor
  };
}

function insertSnippet(cm, rawText, from, to) {
  const lineText = cm.getLine(from.line) || "";
  const indent = (lineText.slice(0, from.ch).match(/^\s*/) || [""])[0];
  const expanded = expandSnippetText(rawText, indent);
  const baseIndex = cm.indexFromPos(from);

  cm.replaceRange(expanded.text, from, to, "complete");

  if (expanded.selection) {
    const selectionFrom = cm.posFromIndex(
      baseIndex + expanded.selection.start
    );

    const selectionTo = cm.posFromIndex(
      baseIndex + expanded.selection.end
    );

    cm.setSelection(selectionFrom, selectionTo);
    return;
  }

  cm.setCursor(
    cm.posFromIndex(baseIndex + expanded.finalCursor)
  );
}

function isCallable(item) {
  const kind = Number(item?.kind);

  // LSP CompletionItemKind:
  // 2 = Method, 3 = Function, 4 = Constructor.
  if ([2, 3, 4].includes(kind)) return true;

  // Vsi drugi standardni tipi (package/module, class, variable,
  // field, snippet ...) ne smejo dobiti avtomatskih oklepajev.
  if (kind >= 1 && kind <= 25) return false;

  // Rezervni način samo za strežnike, ki ne vrnejo kind.
  const candidate = stripSnippets(
    item?.textEdit?.newText ||
    item?.insertText ||
    item?.label ||
    ""
  );

  return /^[A-Za-z_$][A-Za-z0-9_$]*\s*\(/.test(candidate);
}

function getFunctionName(item) {
  const clean = stripSnippets(item.insertText || item.textEdit?.newText || item.label || "");
  const m = clean.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
  return m ? m[1] : clean.split("(")[0].trim();
}

function isJavaMemberCompletionItem(item) {
  return [2, 5, 6, 10, 12, 20, 21].includes(item?.kind);
}

function getKindInfo(kind) {
  switch (kind) {
    case 1:  return { icon: "⊡", color: "#888" };          // Text
    case 2:  return { icon: "m", color: "#c792ea" };        // Method
    case 3:  return { icon: "ƒ", color: "#82aaff" };        // Function
    case 4:  return { icon: "C", color: "#f78c6c" };        // Constructor
    case 5:  return { icon: "◈", color: "#ffcb6b" };        // Field
    case 6:  return { icon: "m", color: "#c792ea" };        // Variable (method-like)
    case 7:  return { icon: "C", color: "#f78c6c" };        // Class
    case 8:  return { icon: "I", color: "#89ddff" };        // Interface
    case 9:  return { icon: "M", color: "#c3e88d" };        // Module
    case 10: return { icon: "◈", color: "#ffcb6b" };        // Property
    case 11: return { icon: "e", color: "#f78c6c" };        // Unit
    case 12: return { icon: "=", color: "#c3e88d" };        // Value
    case 13: return { icon: "∈", color: "#f78c6c" };        // Enum
    case 14: return { icon: "k", color: "#ff5370" };        // Keyword
    case 15: return { icon: "S", color: "#89ddff" };        // Snippet
    case 16: return { icon: "#", color: "#ffcb6b" };        // Color
    case 17: return { icon: "F", color: "#888" };           // File
    default: return { icon: "·", color: "#888" };
  }
}

function getTypedPrefixInfo() {
  const cur = editor.getCursor();
  const line = editor.getLine(cur.line) || "";
  let start = cur.ch;

  while (start > 0 && /[A-Za-z0-9_$]/.test(line[start - 1])) start--;

  return {
    from: CodeMirror.Pos(cur.line, start),
    to: CodeMirror.Pos(cur.line, cur.ch),
    prefix: line.slice(start, cur.ch)
  };
}

function escapeHtmlBasic(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function installEditorBoldStyles() {
  if (document.getElementById("smartcode-editor-bold-style")) return;

  const style = document.createElement("style");
  style.id = "smartcode-editor-bold-style";
  style.textContent = `
    .CodeMirror.smartcode-mode-c .cm-keyword,
    .CodeMirror.smartcode-mode-c .cm-builtin,
    .CodeMirror.smartcode-mode-c .cm-atom,
    .CodeMirror.smartcode-mode-c .cm-meta,
    .CodeMirror.smartcode-mode-cpp .cm-keyword,
    .CodeMirror.smartcode-mode-cpp .cm-builtin,
    .CodeMirror.smartcode-mode-cpp .cm-atom,
    .CodeMirror.smartcode-mode-cpp .cm-meta {
      font-weight: 700;
    }

    .CodeMirror-hints .lsp-hint-prefix {
      font-weight: 700 !important;
    }
  `;
  document.head.appendChild(style);
}

function updateEditorLanguageClass(mode) {
  const wrap = editor?.getWrapperElement?.();
  if (!wrap) return;

  wrap.classList.remove(
    "smartcode-mode-java",
    "smartcode-mode-c",
    "smartcode-mode-cpp",
    "smartcode-mode-plain"
  );

  if (mode === "text/x-java") wrap.classList.add("smartcode-mode-java");
  else if (mode === "text/x-csrc") wrap.classList.add("smartcode-mode-c");
  else if (mode === "text/x-c++src") wrap.classList.add("smartcode-mode-cpp");
  else wrap.classList.add("smartcode-mode-plain");
}

function appendLabelWithBoldPrefix(labelSpan, label, prefix) {
  const text = String(label || "");
  const p = String(prefix || "");

  if (!p) {
    labelSpan.textContent = text;
    return;
  }

  const idx = text.toLowerCase().indexOf(p.toLowerCase());
  if (idx < 0) {
    labelSpan.textContent = text;
    return;
  }

  labelSpan.appendChild(document.createTextNode(text.slice(0, idx)));

  const boldPart = document.createElement("strong");
  boldPart.className = "lsp-hint-prefix";
  boldPart.textContent = text.slice(idx, idx + p.length);
  labelSpan.appendChild(boldPart);

  labelSpan.appendChild(document.createTextNode(text.slice(idx + p.length)));
}

// Startup

document.addEventListener("DOMContentLoaded", async () => {

  if (window.smartCodeInitialMode === 3) {
    if (hasServerSupport()) {
      const opts = window.smartCodeInitialOptions || {};
      if (opts.projectFolder) {
        await setServerProjectFolder(opts.projectFolder);
      } else {
        const hasExplicitSyncRoot = Object.prototype.hasOwnProperty.call(opts, "syncRoot");
        const syncRoot = hasExplicitSyncRoot ? (opts.syncRoot || "") : (opts.folder || "");
        await setServerSyncRoot(syncRoot);
      }

      initClangdLsp();
      initJavaLsp();
    }
    return;
  }

  initEditor();
  initUI();
  renderTabs();
  setAutosaveInfo("Autosave: —", "autosave-idle");
  setServerInfo("LSP: starting…");

  if (hasServerSupport()) {
    const opts = window.smartCodeInitialOptions || {};
    if (opts.projectFolder) {
      setServerProjectFolder(opts.projectFolder);
    } else {
      const hasExplicitSyncRoot = Object.prototype.hasOwnProperty.call(opts, "syncRoot");
      const syncRoot = hasExplicitSyncRoot ? (opts.syncRoot || "") : (opts.folder || "");
      setServerSyncRoot(syncRoot);
    }

    initClangdLsp();
    initJavaLsp();
  } else {
    setServerInfo("LSP: off");
  }
});

// Editor setup

function initEditor() {
  /*
   * Glavni PROJECT/FOLDER editor ima vedno textarea z id="editor".
   * Ne uporabljaj splošnega ".editor-wrapper textarea", ker bi globalni
   * initEditor ob prvem odprtju ALGator algoritma prevzel textarea
   * embedded editorja in nad njim ustvaril še en prazen CodeMirror.
   */
  const ta = document.getElementById("editor");
  if (!ta) return;

  editor = CodeMirror.fromTextArea(ta, {
    mode: "text/plain",
    theme: "eclipse",
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: false,
    gutters: ["CodeMirror-linenumbers", "lsp-diagnostics-gutter"],
    extraKeys: {
      "Ctrl-Space": () => { if (lspReady()) requestCompletion(null); },
      "Ctrl-S":     () => saveActiveFile(false),
      "Esc":        () => { hideSignatureHint(); editor.closeHint?.(); },

            "Left": (cm) => {
        cm.execCommand("goCharLeft");
        if (cm.state.completionActive) {
          clearTimeout(completionTimer);
          completionTimer = setTimeout(() => {
            const { prefix } = getTypedPrefixInfo();
            if (prefix.length >= 1) requestCompletion(null);
            else cm.closeHint?.();
          }, 60);
        }
      },

            "Right": (cm) => {
        cm.execCommand("goCharRight");
        if (cm.state.completionActive) {
          clearTimeout(completionTimer);
          completionTimer = setTimeout(() => {
            const { prefix } = getTypedPrefixInfo();
            if (prefix.length >= 1) requestCompletion(null);
            else cm.closeHint?.();
          }, 60);
        }
      }
    }
  });

  editor.setSize("100%", "100%");
  installEditorBoldStyles();
  updateEditorLanguageClass("text/plain");
  editor.refresh();


  editor.getWrapperElement().addEventListener("keydown", function(e) {
    const hint = editor.state.completionActive;
    if (!hint) return;
    const w = hint.widget;
    if (!w) return;

    if (e.key === "ArrowDown" || e.key === "Down") {
      e.preventDefault(); e.stopPropagation();
      w.changeActive(w.selectedHint + 1);
    } else if (e.key === "ArrowUp" || e.key === "Up") {
      e.preventDefault(); e.stopPropagation();
      w.changeActive(w.selectedHint - 1);
    } else if (e.key === "PageDown") {
      e.preventDefault(); e.stopPropagation();
      w.changeActive(w.selectedHint + (w.screenAmount?.() || 5) - 1, true);
    } else if (e.key === "PageUp") {
      e.preventDefault(); e.stopPropagation();
      w.changeActive(w.selectedHint - (w.screenAmount?.() || 5) + 1, true);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault(); e.stopPropagation();
      w.pick();
    } else if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      hint.close();
    }
  }, true); // capture:true — pred CodeMirrorjem
  editor.on("cursorActivity", () => {
  updateCursorInfo();

  clearTimeout(signatureTimer);

  signatureTimer = setTimeout(() => {
    if (!lspReady()) {
      hideSignatureHint();
      return;
    }

    if (callDepth() > 0) {
      requestSignatureHelp(null, true);
    } else {
      hideSignatureHint();
    }
  }, 120);
});

  editor.on("change", (_cm, change) => {
  if (isFileSwitch) return;

  const changedFile = activeFile;
  const st = fileStates.get(changedFile);
  if (!st) return;

  st.version++;
  st.dirty = true;
  st.content = editor.getValue();

  persistFileToBrowser(changedFile, st.content);

  setAutosaveInfo("Autosave: pending…", "autosave-pending");
  renderTabs();

  if (lspReady()) {
    lspNotification("textDocument/didChange", {
      textDocument: { uri: st.uri, version: st.version },
      contentChanges: [{ text: st.content }]
    });

    if (isJava() && typeof sendJavaNotification === "function") {
      clearTimeout(didChangeWatchedTimer);
      didChangeWatchedTimer = setTimeout(() => {
        const changes = [...openedDocs]
          .filter(uri => uri !== st.uri)
          .map(uri => ({ uri, type: 2 }));

        if (changes.length) {
          sendJavaNotification("workspace/didChangeWatchedFiles", {
            changes
          });
        }
      }, 500);
    }
  }

    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => saveFile(changedFile, true), CFG.editor.autosaveDelay);
    
	
        if (isJava() && change.origin === "+input") {
      const inserted = Array.isArray(change.text) ? change.text.join("") : "";
      const ch = inserted ? inserted[inserted.length - 1] : "";
      if (/^[A-Za-z0-9_$]$/.test(ch)) {
        clearTimeout(completionTimer);
        completionTimer = setTimeout(() => requestCompletion(null), 120);
      }
    }

        if (change.origin === "+delete") {
      clearTimeout(completionTimer);
      const { prefix } = getTypedPrefixInfo();

      if (editor.state.completionActive || prefix.length >= 1) {
        completionTimer = setTimeout(() => requestCompletion(null), 120);
      }

      if (callDepth() > 0) scheduleSignatureRefresh(null, true, 120);
      else hideSignatureHint();
    }
  });

  editor.on("inputRead", (_cm, change) => {
    if (suppressInputRead || !lspReady()) return;
    if (change.origin === "complete" || change.origin === "setValue") return;

    const text = (change.text || []).join("\n");
    if (!text || text.includes("\n")) return;

    const ch = text.slice(-1);
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line) || "";

    if (ch === ".") {
      clearTimeout(completionTimer);
      if (editor.state.completionActive) editor.closeHint?.();
      completionTimer = setTimeout(() => requestCompletion("."), CFG.editor.completionDelay);
      return;
    }

    if (ch === ">" && cur.ch >= 2 && line[cur.ch - 2] === "-") {
      clearTimeout(completionTimer);
      if (editor.state.completionActive) editor.closeHint?.();
      completionTimer = setTimeout(() => requestCompletion(">"), CFG.editor.completionDelay);
      return;
    }

    if (ch === ":" && cur.ch >= 2 && line[cur.ch - 2] === ":") {
      clearTimeout(completionTimer);
      if (editor.state.completionActive) editor.closeHint?.();
      completionTimer = setTimeout(() => requestCompletion(":"), CFG.editor.completionDelay);
      return;
    }

    if (ch === "(") {
      if (editor.state.completionActive) editor.closeHint?.();
      scheduleSignatureRefresh("(", false, 80);
      return;
    }

    if (ch === ",") {
      scheduleSignatureRefresh(",", true, CFG.editor.completionDelay);
      return;
    }

    if (ch === ")") {
      clearTimeout(signatureTimer);
      signatureTimer = setTimeout(() => {
        if (callDepth() <= 0) hideSignatureHint();
        else scheduleSignatureRefresh(null, true, 0);
      }, 50);
      return;
    }

        if (!isJava() && /^[a-zA-Z0-9_$]$/.test(ch)) {
      clearTimeout(completionTimer);
      completionTimer = setTimeout(() => requestCompletion(null), CFG.editor.identifierDelay);
    }
  });

  updateCursorInfo();
}

// File management

async function refreshFileList({ openFirst = false, includeServerWorkspace = false } = {}) {
  let files = [];

  if (includeServerWorkspace && hasServerSupport()) {
    try {
      const scanFolder = normalizePath(
        window.smartCodeInitialOptions?.projectFolder ||
        window.smartCodeInitialOptions?.folder ||
        window.smartCodeInitialOptions?.syncRoot ||
        ""
      );
      const scanUrl = scanFolder
        ? `${CFG.server.httpUrl}/scan?folder=${encodeURIComponent(scanFolder)}`
        : `${CFG.server.httpUrl}/scan`;
      const res = await fetch(scanUrl);
      if (res.ok) {
        const data = await res.json();
        files = (data.files || []).filter(f => isCodeFile(f));
      }
    } catch (e) {
      console.warn("refreshFileList: /scan failed:", e.message);
    }
  }

  if (!files.length) {
    files = [...fileStates.keys()].filter(isCodeFile);
  }

  for (const f of files) {
    const norm = normalizePath(f);

    if (!fileStates.has(norm)) {
      fileStates.set(norm, createFileState(norm, { content: null }));
    } else if (includeServerWorkspace && hasServerSupport()) {
      const st = fileStates.get(norm);
      if (st && !st.dirty && !st.handle) st.content = null;
    }
  }

  renderTabs();

  if (openFirst && files.length) {
    const first = files.find(isCodeFile);
    if (first) await openFile(first);
  }
}

function clearEditorForNoProject(message = "") {
  activeFile = null;
  clearDiagnostics();
  hideSignatureHint();

  if (editor) {
    isFileSwitch = true;
    editor.setOption("mode", "text/plain");
    editor.setOption("theme", "eclipse");
    updateEditorLanguageClass("text/plain");
    editor.setValue(message);
    editor.clearHistory();
    isFileSwitch = false;
    editor.refresh();
  }

  renderTabs();
  updateCursorInfo();
  setAutosaveInfo("Autosave: —", "autosave-idle");
}

function resetProject({ id, name, source = "api", persist = true } = {}) {
  for (const filename of [...fileStates.keys()]) {
    sendDidCloseForFile(filename);
  }

  fileStates.clear();
  diagnosticsByFile.clear();
  openedDocs.clear();

  activeProject = {
    id: safeProjectId(id || name || `project-${Date.now()}`),
    name: name || id || "Project",
    source
  };

  browserPersistenceEnabled = persist !== false;
  activeFolderHandle = null;
  clearEditorForNoProject("");
}

async function openProjectFromFiles(project) {
  const files = Array.isArray(project?.files) ? project.files : [];

  resetProject({
    id: project?.id || project?.name || `project-${Date.now()}`,
    name: project?.name || project?.id || "Project",
    source: project?.source || "api",
    persist: project?.persist !== false
  });

  for (const file of files) {
    const filename = normalizePath(file.path || file.filename || file.name || "");
    if (!filename) continue;

    const content = String(file.content ?? "");
    ensureFileState(filename, {
      content,
      handle: file.handle || null,
      dirty: false
    });

    persistFileToBrowser(filename, content);
    await syncFileToServer(filename, content);
  }

  renderTabs();

  const first = project?.activeFile || files.map(f => normalizePath(f.path || f.filename || f.name || "")).find(isCodeFile);
  if (first && fileStates.has(first)) await openFile(first);

  if (hasServerSupport() && javaInitialized) {
    await openAllJavaFilesInLsp();
  }
}

window.openSmartCodeProject = openProjectFromFiles;

async function openWorkspaceProject() {
  if (!hasServerSupport()) {
    console.warn("Workspace project potrebuje SmartCode server.");
    clearEditorForNoProject("SmartCode server ni dosegljiv. Workspace datotek ni mogoče naložiti.");
    return;
  }

  resetProject({
    id: "workspace",
    name: "Workspace",
    source: "server-workspace",
    persist: false
  });

  await refreshFileList({
    openFirst: true,
    includeServerWorkspace: true
  });

  if (hasServerSupport() && javaInitialized) {
    await openAllJavaFilesInLsp();
  }
}

window.openSmartCodeWorkspaceProject = openWorkspaceProject;

window.getSmartCodeProjectInfo = function() {
  return activeProject ? { ...activeProject, files: [...fileStates.keys()] } : null;
};

async function openDemoProject() {
  if (!hasServerSupport()) {
    alert("Demo projekt potrebuje SmartCode server.");
    return;
  }

  try {
    const res = await fetch(`${CFG.server.httpUrl}/project/demo`);
    if (!res.ok) throw new Error(await res.text());
    const project = await res.json();
    await openProjectFromFiles(project);
  } catch (e) {
    alert(`Demo projekta ni bilo mogoče odpreti: ${e.message}`);
  }
}

async function openFile(filename) {
  const norm = normalizePath(filename);

  if (!fileStates.has(norm)) {
  fileStates.set(norm, createFileState(norm, {
    content: null
  }));
  renderTabs();
}

const st = fileStates.get(norm);

if (st.content === null) {
  await loadContentForState(norm, st);
}

    if (activeFile && activeFile !== norm) {
    const cur = fileStates.get(activeFile);
    if (cur) cur.content = editor.getValue();
  }

    if (activeFile && activeFile !== norm) {
    const old = fileStates.get(activeFile);
    if (old && isClangdFile(activeFile) && openedDocs.has(old.uri)) {
      sendDidCloseForFile(activeFile);
    }
  }

  activeFile = norm;
  if (browserPersistenceEnabled && activeProject) {
    localStorage.setItem(`smartcode:${currentStorageNamespace()}:activeFile`, norm);
  }

  const mode = modeForFile(norm);
  const theme = themes[mode] || "eclipse";

  isFileSwitch = true;
  editor.setOption("mode", mode);
  editor.setOption("theme", theme);
  updateEditorLanguageClass(mode);
  editor.setValue(st.content || "");
  editor.clearHistory();
  isFileSwitch = false;

  editor.refresh();
  editor.focus();

  clearDiagnostics();
  hideSignatureHint();
  setAutosaveInfo(st.dirty ? "Autosave: pending…" : "Autosave: —", st.dirty ? "autosave-pending" : "autosave-idle");
  updateCursorInfo();
  updateServerInfo();
  renderTabs();

  if (lspReady()) sendDidOpenForFile(norm);

  const existingDiagnostics = diagnosticsByFile.get(st.uri) || [];
  renderDiagnostics(existingDiagnostics, st.uri);
}

function defaultSnippet(filename) {
  const mode = modeForFile(filename);
  const rawBase = baseName(filename).replace(/\.[^.]+$/, "");
  const cls = (rawBase.charAt(0).toUpperCase() + rawBase.slice(1)).replace(/[^A-Za-z0-9_$]/g, "") || "Main";

  if (mode === "text/x-java") {
    return `public class ${cls} {\n\n    public static void main(String[] args) {\n        \n    }\n}\n`;
  }

  if (mode === "text/x-csrc") {
    return `#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n`;
  }

  if (mode === "text/x-c++src") {
    return `#include <iostream>\n\nint main() {\n    \n    return 0;\n}\n`;
  }

  return "";
}

function renderTabs() {
  const bar = document.getElementById("tabBar");
  if (!bar) return;

  bar.innerHTML = "";
  for (const [filename, st] of fileStates) {
    if (!isCodeFile(filename)) continue;

    const tab = document.createElement("div");
    tab.className = "tab" + (filename === activeFile ? " tab-active" : "");

    const icon = document.createElement("span");
    icon.className = "tab-icon";
    icon.textContent = fileIcon(filename);

    const label = document.createElement("span");
    label.className = "tab-label";
    label.textContent = filename + (st?.dirty ? " •" : "");

    const close = document.createElement("button");
    close.className = "tab-close";
    close.textContent = "×";
    close.title = "Zapri tab (desni klik = izbriši datoteko)";
    close.addEventListener("click", e => {
      e.stopPropagation();
      closeTab(filename);
    });
    close.addEventListener("contextmenu", e => {
      e.preventDefault();
      e.stopPropagation();
      showTabContextMenu(filename, e.clientX, e.clientY);
    });

    tab.appendChild(icon);
    tab.appendChild(label);
    tab.appendChild(close);
    tab.addEventListener("click", () => openFile(filename));
    bar.appendChild(tab);
  }
}

function fileIcon(filename) {
  const m = modeForFile(filename);
  if (m === "text/x-java") return "☕";
  if (m === "text/x-csrc") return "🔵";
  if (m === "text/x-c++src") return "🟣";
  return "📄";
}

async function closeTab(filename) {
  const codeTabs = [...fileStates.keys()].filter(isCodeFile);

  const st = fileStates.get(filename);
  if (st?.dirty) {
    const ok = confirm(`Datoteka ${filename} ni shranjena. Zaprem tab?`);
    if (!ok) return;
  }

  sendDidCloseForFile(filename);

  if (activeFile === filename) {
    fileStates.delete(filename);
    const remaining = [...fileStates.keys()].filter(isCodeFile);
    activeFile = null;
    if (remaining.length) await openFile(remaining[0]);
    else clearEditorForNoProject("");
  } else {
    fileStates.delete(filename);
    renderTabs();
  }

  persistFileListToBrowser();
}

function showTabContextMenu(filename, x, y) {
    document.getElementById("sc-ctx-menu")?.remove();

  const menu = document.createElement("div");
  menu.id = "sc-ctx-menu";
  menu.className = "sc-context-menu";
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9999;`;

  const items = [
    { label: "📋 Preimenuj",   action: () => renameFile(filename) },
    { label: "🗑 Izbriši datoteko", action: () => deleteFile(filename), danger: true },
  ];

  for (const item of items) {
    const btn = document.createElement("button");
    btn.className = "sc-ctx-item" + (item.danger ? " sc-ctx-danger" : "");
    btn.textContent = item.label;
    btn.addEventListener("click", () => { menu.remove(); item.action(); });
    menu.appendChild(btn);
  }

  document.body.appendChild(menu);

    const dismiss = (e) => {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("mousedown", dismiss); }
  };
  setTimeout(() => document.addEventListener("mousedown", dismiss), 0);
}

async function deleteFile(filename) {
  const confirmed = confirm(`Izbriši datoteko "${filename}"?\n\nDatoteka bo trajno izbrisana iz brskalnika.`);
  if (!confirmed) return;

  sendDidCloseForFile(filename);
  fileStates.delete(filename);

  if (browserPersistenceEnabled && activeProject) {
    localStorage.removeItem(cacheKeyForFile(filename));
  }

  if (activeFile === filename) {
    const remaining = [...fileStates.keys()].filter(isCodeFile);
    activeFile = null;
    if (remaining.length) await openFile(remaining[0]);
    else clearEditorForNoProject("");
  } else {
    renderTabs();
  }

  persistFileListToBrowser();
}

async function renameFile(filename) {
  const newName = prompt("Novo ime datoteke:", filename);
  if (!newName?.trim() || newName === filename) return;

  const st = fileStates.get(filename);
  if (!st) return;

  const content = filename === activeFile ? editor.getValue() : (st.content || "");

    const newSt = createFileState(newName, {
    content,
    handle: st.handle || null,
    dirty: false
  });

  sendDidCloseForFile(filename);
  fileStates.delete(filename);

  if (browserPersistenceEnabled && activeProject) {
    localStorage.removeItem(cacheKeyForFile(filename));
  }

  fileStates.set(normalizePath(newName), newSt);
  persistFileToBrowser(newName, content);
  await syncFileToServer(newName, content);

  if (activeFile === filename) {
    activeFile = newName;
    if (browserPersistenceEnabled && activeProject) {
      localStorage.setItem(`smartcode:${currentStorageNamespace()}:activeFile`, newName);
    }
  }

  renderTabs();
  persistFileListToBrowser();
  if (lspReady()) sendDidOpenForFile(newName);
}

// UI buttons
function initUI() {

  if (!document.getElementById("newFileBtn")) {
    setTimeout(initUI, 50);
    return;
  }

  document.getElementById("newFileBtn")?.addEventListener("click", createNewFile);
  document.getElementById("demoProjectBtn")?.addEventListener("click", openDemoProject);
  document.getElementById("saveBtn")?.addEventListener("click", () => saveActiveFile(false));

  document.getElementById("openBtn")?.addEventListener("click", async () => {
    if (window.showOpenFilePicker) {
      await openFilesWithPicker();
    } else {
      document.getElementById("fileInput")?.click();
    }
  });

  document.getElementById("openFolderBtn")?.addEventListener("click", openFolderWorkspace);
  document.getElementById("fileInput")?.addEventListener("change", onLocalFilesSelected);
}

async function createNewFile() {
  if (!activeProject) {
    resetProject({
      id: `scratch-${Date.now()}`,
      name: "Scratch project",
      source: "browser",
      persist: true
    });
  }

  const name = prompt("Ime datoteke (npr. Helper.java, utils.cpp, math.c):");
  if (!name || !name.trim()) return;

  const filename = normalizePath(name.trim());
  const content = defaultSnippet(filename);

  const st = ensureFileState(filename, {
    content,
    dirty: true
  });

  persistFileToBrowser(filename, content);
  renderTabs();
  await openFile(filename);

  if (hasServerSupport()) {
    await syncFileToServer(filename, content);

    if (isJavaFile(filename) && javaInitialized && typeof sendJavaNotification === "function") {
      sendJavaNotification("textDocument/didOpen", {
        textDocument: {
          uri: st.uri,
          languageId: "java",
          version: st.version,
          text: content
        }
      });
      openedDocs.add(st.uri);
    }
  }
}

async function onLocalFilesSelected(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  resetProject({
    id: `local-files-${Date.now()}`,
    name: "Local files",
    source: "file-input",
    persist: true
  });

  for (const file of files) {
    const text = await file.text();
    const filename = normalizePath(file.webkitRelativePath || file.name);

    ensureFileState(filename, {
      content: text,
      handle: null,
      dirty: false
    });

    persistFileToBrowser(filename, text);
    await syncFileToServer(filename, text);
  }

  renderTabs();
  if (files.length > 0) {
    const last = files[files.length - 1];
    await openFile(normalizePath(last.webkitRelativePath || last.name));
  }

  if (hasServerSupport() && javaInitialized) {
    await openAllJavaFilesInLsp();
  }

  e.target.value = "";
}

async function openFilesWithPicker() {
  if (!window.showOpenFilePicker) {
    document.getElementById("fileInput")?.click();
    return;
  }

  const handles = await window.showOpenFilePicker({ multiple: true });
  if (!handles.length) return;

  resetProject({
    id: `local-files-${Date.now()}`,
    name: "Local files",
    source: "file-picker",
    persist: true
  });

  for (const handle of handles) {
    const filename = normalizePath(handle.name);
    const text = await readHandleText(handle);

    ensureFileState(filename, {
      content: text,
      handle,
      dirty: false
    });

    persistFileToBrowser(filename, text);
    await syncFileToServer(filename, text);
  }

  renderTabs();
  if (handles.length) await openFile(normalizePath(handles[handles.length - 1].name));

  if (hasServerSupport() && javaInitialized) {
    await openAllJavaFilesInLsp();
  }
}

async function walkDirectory(dirHandle, prefix = "") {
  const files = [];

  for await (const [name, entry] of dirHandle.entries()) {
    const rel = prefix ? `${prefix}/${name}` : name;

    if (entry.kind === "directory") {
      files.push(...await walkDirectory(entry, rel));
    } else {
      files.push({ path: normalizePath(rel), handle: entry });
    }
  }

  return files;
}

async function openFolderWorkspace() {
  if (!window.showDirectoryPicker) {
    alert("Open Folder deluje v Chromium brskalnikih (Chrome / Edge).");
    return;
  }

  const dirHandle = await window.showDirectoryPicker();

  resetProject({
    id: dirHandle.name || `folder-${Date.now()}`,
    name: dirHandle.name || "Folder project",
    source: "folder-picker",
    persist: true
  });

  activeFolderHandle = dirHandle;

  const entries = await walkDirectory(dirHandle);
  const files = entries.filter(e => isCodeFile(e.path) || shouldMirrorFile(e.path));

  for (const entry of files) {
    const text = await readHandleText(entry.handle);

    ensureFileState(entry.path, {
      content: text,
      handle: entry.handle,
      dirty: false
    });

    persistFileToBrowser(entry.path, text);
    await syncFileToServer(entry.path, text);
  }

  renderTabs();

  const firstCode = files.map(e => e.path).find(isCodeFile);
  if (firstCode) await openFile(firstCode);

  if (hasServerSupport() && javaInitialized) {
    await openAllJavaFilesInLsp();
  }
}

window.openSmartCodeFolderProject = openFolderWorkspace;

// LSP — clangd

function initClangdLsp() {
  if (typeof connectLsp !== "function") return;

  connectLsp(CFG.server.wsClangd);

  onLspOpen(async () => {
    if (clangdInitialized) return;
    if (isClangd()) setServerInfo("LSP: clangd connecting…");

    try {
      await sendLspRequest("initialize", {
        processId: null,
        rootUri: CFG.workspace.rootUri,
        capabilities: lspCapabilities()
      });

      sendLspNotification("initialized", {});

            clangdInitialized = true;
      if (isClangd()) setServerInfo("LSP: clangd ✓");

            if (activeFile) {
        sendDidOpenForFile(activeFile);
      }
    } catch (e) {
      console.error("clangd init failed:", e);
    }
  });

  onLspClose(() => {
    clangdInitialized = false;
    if (isClangd()) setServerInfo("LSP: disconnected");
  });

  onLspError(() => {
    if (isClangd()) setServerInfo("LSP: error");
  });

  onLspDiagnostics(params => {
    if (params) renderDiagnostics(params.diagnostics || [], params.uri);
  });
}

// LSP — jdtls

function initJavaLsp() {
  if (typeof connectJavaLsp !== "function") return;

  connectJavaLsp(CFG.server.wsJava);

  onJavaLspOpen(async () => {
  if (javaInitialized) return;
  if (isJava()) setServerInfo("LSP: jdtls connecting…");

  await new Promise(r => setTimeout(r, CFG.editor.javaInitDelay));

    try {
      await sendJavaRequest("initialize", {
        processId: null,
        rootUri: CFG.workspace.rootUri,
        workspaceFolders: [{ uri: CFG.workspace.rootUri, name: "workspace" }],
        capabilities: lspCapabilities()
      });

      sendJavaNotification("initialized", {});
      javaInitialized = true;

      sendJavaNotification("workspace/didChangeConfiguration", {
        settings: {
          java: {
            completion: { enabled: true, guessMethodArguments: true },
            signatureHelp: { enabled: true }
          }
        }
      });

      if (isJava()) setServerInfo("LSP: jdtls ✓");

      await openAllJavaFilesInLsp();

            if (activeFile) {
        sendDidOpenForFile(activeFile);
      }
    } catch (e) {
      console.error("jdtls init failed:", e);
      javaInitialized = false;
      if (isJava()) setServerInfo("LSP: jdtls retrying…");
      setTimeout(() => {
        if (typeof connectJavaLsp === "function") connectJavaLsp(CFG.server.wsJava);
      }, CFG.editor.javaRetryDelay);
    }
  });

  onJavaLspClose(() => {
    javaInitialized = false;
    openedDocs.clear();
    if (isJava()) setServerInfo("LSP: jdtls disconnected");

    setTimeout(() => {
      if (!javaInitialized && typeof connectJavaLsp === "function") {
        connectJavaLsp(CFG.server.wsJava);
      }
    }, CFG.editor.javaRetryDelay);
  });

  onJavaLspError(() => {
    if (isJava()) setServerInfo("LSP: jdtls error");
  });

  onJavaLspDiagnostics(params => {
    if (params) renderDiagnostics(params.diagnostics || [], params.uri);
  });
}

async function openAllJavaFilesInLsp() {
  if (!hasServerSupport() || !javaInitialized) return;

  const javaFiles = [...fileStates.keys()].filter(f => f.endsWith(".java"));

  for (const filename of javaFiles) {
    const st = fileStates.get(filename);
    if (!st) continue;
    if (openedDocs.has(st.uri)) continue;

    const text = st.content == null
  ? await loadContentForState(filename, st)
  : st.content;

await syncFileToServer(filename, text);

    openedDocs.add(st.uri);
    sendJavaNotification("textDocument/didOpen", {
      textDocument: { uri: st.uri, languageId: "java", version: st.version, text }
    });
  }
}

function lspCapabilities() {
  return {
    textDocument: {
      completion: {
        completionItem: {
          insertTextFormat: { valueSet: [1, 2] },
          documentationFormat: ["plaintext", "markdown"],
          snippetSupport: true,
          resolveSupport: { properties: ["documentation", "detail"] }
        },
        contextSupport: true
      },
      signatureHelp: {
        signatureInformation: {
          documentationFormat: ["plaintext", "markdown"],
          parameterInformation: { labelOffsetSupport: true }
        },
        contextSupport: true
      },
      hover: { contentFormat: ["plaintext", "markdown"] },
      publishDiagnostics: { relatedInformation: true }
    },
    workspace: {
      workspaceFolders: true,
      didChangeWatchedFiles: { dynamicRegistration: true }
    }
  };
}

function sendDidOpenForFile(filename) {
  const st = fileStates.get(filename);
  if (!st || !lspReady()) return;

  const text = filename === activeFile ? editor.getValue() : (st.content || "");

        if (openedDocs.has(st.uri)) {
    lspNotification("textDocument/didClose", { textDocument: { uri: st.uri } });
    openedDocs.delete(st.uri);
  }

  openedDocs.add(st.uri);
  lspNotification("textDocument/didOpen", {
    textDocument: {
      uri:        st.uri,
      languageId: st.languageId,
      version:    st.version,
      text
    }
  });
}

function sendDidCloseForFile(filename) {
  const st = fileStates.get(filename);
  if (!st) return;

  if (!openedDocs.has(st.uri)) return;
  openedDocs.delete(st.uri);

  if (!lspReady()) return;
  lspNotification("textDocument/didClose", { textDocument: { uri: st.uri } });
}

function updateServerInfo() {
  if (!hasServerSupport()) {
    setServerInfo("LSP: off");
    return;
  }

  if (isClangd()) setServerInfo(clangdInitialized ? "LSP: clangd ✓" : "LSP: connecting…");
  else if (isJava()) setServerInfo(javaInitialized ? "LSP: jdtls ✓" : "LSP: connecting…");
  else setServerInfo("LSP: —");
}

// Signature Help

function requestSignatureHelp(triggerChar, isRetrigger) {
  if (!lspReady()) return;

  const st = docState();
  const cur = editor.getCursor();

  lspRequest("textDocument/signatureHelp", {
    textDocument: { uri: st.uri },
    position: { line: cur.line, character: cur.ch },
    context: {
      triggerKind: triggerChar ? 2 : 1,
      isRetrigger: isRetrigger ?? false,
      triggerCharacter: triggerChar || undefined
    }
  })
    .then(result => {
      if (!result?.signatures?.length) {
        hideSignatureHint();
        return;
      }

      const sig = result.signatures[result.activeSignature ?? 0];
      if (!sig) {
        hideSignatureHint();
        return;
      }

      const paramIdx = result.activeParameter ?? sig.activeParameter ?? 0;
      const params = sig.parameters || [];
      let label = escapeHtmlBasic(sig.label);

      if (params[paramIdx]) {
        const p = params[paramIdx];
        let pLabel, pStart, pEnd;

        if (Array.isArray(p.label)) {
          [pStart, pEnd] = p.label;
          pLabel = sig.label.slice(pStart, pEnd);
        } else {
          pLabel = p.label;
          pStart = sig.label.indexOf(pLabel);
          pEnd = pStart + pLabel.length;
        }

        if (pStart >= 0) {
          label =
            escapeHtmlBasic(sig.label.slice(0, pStart)) +
            "<strong>" + escapeHtmlBasic(pLabel) + "</strong>" +
            escapeHtmlBasic(sig.label.slice(pEnd));
        }
      }

      showSignatureHint(label);
    })
    .catch(() => {});
}

// Completion

function requestCompletion(triggerChar = null) {
  if (!lspReady()) return;

  const st = docState();
  const reqSeq = ++completionReqSeq;
  const reqVer = st.version;
  const reqMode = currentMode();
  const reqCur = editor.getCursor();
  const isMember = triggerChar === "." || triggerChar === ">" || triggerChar === ":";
  const { from, to, prefix } = getTypedPrefixInfo();
  const typedPrefix = isMember ? "" : prefix;

  if (!isMember && typedPrefix.length < 1) {
    if (editor.state.completionActive) editor.closeHint?.();
    return;
  }

  lspRequest("textDocument/completion", {
    textDocument: { uri: st.uri },
    position: { line: reqCur.line, character: reqCur.ch },
    context: triggerChar
      ? { triggerKind: 2, triggerCharacter: triggerChar }
      : { triggerKind: 1 }
  })
    .then(result => {
      if (reqSeq !== completionReqSeq) return;
      if (reqVer !== docState().version && !isJava()) return;
      if (reqMode !== currentMode()) return;

      const cur = editor.getCursor();
      if (cur.line !== reqCur.line || cur.ch < from.ch) return;

      let items = Array.isArray(result) ? result : (result?.items ?? []);

      if (isJava() && !isMember) {
        items = [
          ...javaSnippetItems(typedPrefix),
          ...items
        ];
      }

      if (!items.length) {
        if (editor.state.completionActive) editor.closeHint?.();
        return;
      }

      if (typedPrefix && (!isJava() || isMember)) {
        const lower = typedPrefix.toLowerCase();
        items = items.filter(item =>
          (item.label || "").toLowerCase().startsWith(lower) ||
          (item.filterText || "").toLowerCase().startsWith(lower) ||
          stripSnippets(item.insertText || "").toLowerCase().startsWith(lower)
        );
      }

      if (isClangd()) {
        if (isMember) {
          const m = items.filter(i => (i.sortText || "9") < "4");
          if (m.length) items = m;
        } else {
          items = items.filter(i => (i.sortText || "9") < "7");
        }
      }

      if (!items.length) {
        if (editor.state.completionActive) editor.closeHint?.();
        return;
      }

      items.sort((a, b) => (a.sortText || a.label || "").localeCompare(b.sortText || b.label || ""));
      const max = isMember
        ? (isJava() ? CFG.editor.javaMemberMax : CFG.editor.memberMaxItems)
        : CFG.editor.identifierMax;

      items = items.slice(0, max);

      if (editor.state.completionActive) editor.closeHint?.();

      CodeMirror.showHint(editor, () => ({
        from,
        to,
        list: items.map(item => {
          const localSnippet = isLocalJavaSnippet(item);
          const callable = !localSnippet && isCallable(item);
          const displayLabel = callable
            ? (item.label.includes("(") ? item.label : item.label + "(…)")
            : item.label;
          return {
            text: callable ? getFunctionName(item) + "()" : getInsertText(item) || item.label,
    
            render(el) {
              el.classList.add("lsp-hint-item");

                            const kindIcon = document.createElement("span");
              kindIcon.className = "lsp-hint-kind";
              const kindInfo = getKindInfo(item.kind);
              kindIcon.textContent = kindInfo.icon;
              kindIcon.style.color = kindInfo.color;
              el.appendChild(kindIcon);

                            const labelSpan = document.createElement("span");
              labelSpan.className = "lsp-hint-label";

                            appendLabelWithBoldPrefix(labelSpan, displayLabel, typedPrefix);
              el.appendChild(labelSpan);

                            if (item.detail) {
                const detailSpan = document.createElement("span");
                detailSpan.className = "lsp-hint-detail";
                detailSpan.textContent = item.detail.split("\n")[0].trim().slice(0, 40);
                el.appendChild(detailSpan);
              }
            },
            hint(cm) {
              suppressInputRead = true;

              const editRange = getCompletionEditRange(
                item,
                from,
                to
              );

              try {
                if (localSnippet) {
                  insertSnippet(
                    cm,
                    item.insertText || item.label,
                    editRange.from,
                    editRange.to
                  );
                } else if (callable) {
                  cm.replaceRange(
                    getFunctionName(item) + "()",
                    editRange.from,
                    editRange.to,
                    "complete"
                  );

                  const p = cm.getCursor();
                  cm.setCursor({
                    line: p.line,
                    ch: p.ch - 1
                  });

                  setTimeout(
                    () => requestSignatureHelp("(", false),
                    60
                  );
                } else {
                  cm.replaceRange(
                    getInsertText(item) || item.label,
                    editRange.from,
                    editRange.to,
                    "complete"
                  );
                }
              } finally {
                setTimeout(() => { suppressInputRead = false; }, 0);
              }
            }
          };
        })
      }), {
        completeSingle: false,
        alignWithWord: true,
        closeOnUnfocus: true
      });
    })
    .catch(e => console.error("Completion failed:", e));
}

// Save

async function saveFile(filename, silent = false) {
  const norm = normalizePath(filename);
  if (!norm) return;

  const st = fileStates.get(norm);
  if (!st) return;

  const content = norm === activeFile && editor
    ? editor.getValue()
    : (st.content ?? "");

  st.content = content;

  const cachedOk = persistFileToBrowser(norm, content);

  let wroteLocal = false;
  try {
    wroteLocal = await writeStateToLocal(norm, st, {
      promptIfNeeded: !silent
    });
  } catch (e) {
    console.warn("writeStateToLocal failed:", e.message);
  }

  let mirrored = false;
  try {
    mirrored = await mirrorStateToServer(norm);
  } catch (e) {
    console.warn("mirrorStateToServer failed:", e.message);
  }

  if (norm === activeFile && hasServerSupport() && lspReady()) {
    try {
      lspNotification("textDocument/didSave", {
        textDocument: { uri: st.uri }
      });
      await notifyServerFileChange(norm, 2);
    } catch (e) {
      console.warn("LSP didSave notify failed:", e.message);
    }
  }

  if (cachedOk || wroteLocal || mirrored) {
    st.dirty = false;
    renderTabs();

    if (norm === activeFile) {
      if (wroteLocal) {
        setAutosaveInfo("Autosave: saved ✓", "autosave-ok");
      } else if (cachedOk) {
        setAutosaveInfo("Autosave: cached ✓", "autosave-ok");
      } else {
        setAutosaveInfo("Autosave: mirrored ✓", "autosave-pending");
      }

      setTimeout(() => setAutosaveInfo("Autosave: —", "autosave-idle"), 2500);
    }

    return;
  }

  if (norm === activeFile) {
    setAutosaveInfo("Autosave: failed ✗", "autosave-fail");
  }

  if (!silent) {
    alert("Save failed: ni bilo mogoče shraniti ne lokalno ne v browser cache.");
  }
}

async function saveActiveFile(silent = false) {
  if (!activeFile) return;
  return saveFile(activeFile, silent);
}

// Diagnostics — per file

function renderDiagnostics(diagnostics, uri) {
  if (!editor) return;

  const activeUri = fileStates.get(activeFile)?.uri;
  if (uri) diagnosticsByFile.set(uri, diagnostics || []);

  if (uri && uri !== activeUri) return;

  const list = diagnostics || [];
  clearDiagnostics();

  const byLine = new Map();

  list.forEach(diag => {
    const severityClass = severityToClass(diag.severity);
    const from = { line: diag.range.start.line, ch: diag.range.start.character };
    let endLine = diag.range.end.line;
    let endCh = diag.range.end.character;

    if (from.line === endLine && from.ch === endCh) endCh = from.ch + 1;
    if (endLine < from.line) endLine = from.line;

    const lineText = editor.getLine(from.line) || "";
    if (from.line === endLine && endCh > lineText.length) endCh = lineText.length;
    if (from.line === endLine && endCh <= from.ch) endCh = Math.min(lineText.length, from.ch + 1);

    const to = { line: endLine, ch: endCh };
    const mark = editor.markText(from, to, {
      className: `cm-lsp-${severityClass}`,
      attributes: { title: `${severityToLabel(diag.severity)}: ${diag.message}` }
    });
    diagnosticMarks.push(mark);

    const existing = byLine.get(from.line);
    if (!existing) {
      byLine.set(from.line, { severity: diag.severity, diagnostics: [diag] });
    } else {
      existing.diagnostics.push(diag);
      if ((diag.severity || 4) < (existing.severity || 4)) existing.severity = diag.severity;
    }
  });

  for (const [line, info] of byLine.entries()) {
    const severityClass = severityToClass(info.severity);

    const gutterMarker = document.createElement("div");
    gutterMarker.className = `cm-diagnostic-gutter-marker is-${severityClass}`;
    gutterMarker.title = info.diagnostics.map(d => `${severityToLabel(d.severity)}: ${d.message}`).join("\n");
    gutterMarker.textContent = info.severity === 1 ? "●" : info.severity === 2 ? "▲" : "◆";

    editor.setGutterMarker(line, "lsp-diagnostics-gutter", gutterMarker);
    diagnosticMarks.push({ clear: () => editor.setGutterMarker(line, "lsp-diagnostics-gutter", null) });

    editor.addLineClass(line, "background", `cm-diagnostic-line-${severityClass}`);
    diagnosticMarks.push({ clear: () => editor.removeLineClass(line, "background", `cm-diagnostic-line-${severityClass}`) });

    editor.addLineClass(line, "wrap", `cm-diagnostic-linewrap-${severityClass}`);
    diagnosticMarks.push({ clear: () => editor.removeLineClass(line, "wrap", `cm-diagnostic-linewrap-${severityClass}`) });
  }

  renderDiagnosticsPanel(activeUri, list);
}

function renderDiagnosticsPanel(uri, diagnostics) {
  const panel = document.getElementById("diagnosticsPanel");
  const listEl = document.getElementById("diagnosticsList");
  const countEl = document.getElementById("diagnosticsCount");

  if (!panel || !listEl || !countEl) return;

  const items = diagnostics || [];
  const errors = items.filter(d => d.severity === 1).length;
  const warnings = items.filter(d => d.severity === 2).length;
  countEl.textContent = `${errors} errors, ${warnings} warnings`;

  listEl.innerHTML = "";


  if (window.smartCodeShowDiagnostics === false || !items.length) {
    panel.classList.remove("has-problems");
    panel.style.display = "none";
    return;
  }

  panel.style.display = "";
  panel.classList.add("has-problems");

  items.forEach(diag => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `diagnostic-item is-${severityToClass(diag.severity)}`;

    const line = diag.range?.start?.line ?? 0;
    const ch = diag.range?.start?.character ?? 0;
    const source = diag.source ? ` • ${diag.source}` : "";

    row.innerHTML = `
      <span class="diagnostic-severity ${severityToClass(diag.severity)}"></span>
      <span class="diagnostic-main">
        <span class="diagnostic-message">${escapeHtml(diag.message)}</span>
        <span class="diagnostic-meta">${severityToLabel(diag.severity)} • line ${line + 1}, col ${ch + 1}${escapeHtml(source)}</span>
      </span>
    `;

    row.addEventListener("click", () => {
      editor.focus();
      editor.setCursor({ line, ch });
      editor.scrollIntoView({ line, ch }, 120);
    });

    listEl.appendChild(row);
  });
}

function clearDiagnostics() {
  diagnosticMarks.forEach(m => {
    try { m.clear(); } catch {}
  });
  diagnosticMarks = [];

  if (editor) editor.clearGutter("lsp-diagnostics-gutter");
}

function clearDiagnosticsForFile(uri) {
  diagnosticsByFile.delete(uri);
  clearDiagnostics();
  renderDiagnosticsPanel(uri, []);
}

// Status bar

function updateCursorInfo() {
  const pos = editor?.getCursor();
  if (!pos) return;
  const el = document.getElementById("cursorInfo");
  if (el) el.textContent = `Ln ${pos.line + 1}, Col ${pos.ch + 1}`;
}

function setServerInfo(t) {
  const el = document.getElementById("serverInfo");
  if (el) el.textContent = t;
}

function setAutosaveInfo(t, c) {
  const el = document.getElementById("autosaveInfo");
  if (!el) return;
  el.textContent = t;
  el.className = c;
}
/* ═══════════════════════════════════════════════════════════════════════════
  mode 3 — izolirani urejevalniki brez zavihkov in autosave

 Vsak klic window.createAlgatorEditor(containerEl, opts) vrne neodvisno
 instanco CodeMirror z lastnim LSP kontekstom, diagnostikami in API-jem.

 Opcije:
   language        "java" | "c" | "cpp"  (privzeto: "java")
   folder          relativna podmapa workspace za LSP kontekst (opcijsko)
  showDiagnostics true/false (privzeto: true)
*/

let _algatorIdCounter = 0;

function _waitLspInit(isJava) {
  return new Promise(resolve => {
    const check = () => {
      const ok = isJava ? javaInitialized : clangdInitialized;
      if (ok) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}

class AlgatorInstance {
  constructor(containerEl, opts = {}) {
    this.id       = _algatorIdCounter++;
    this.language = opts.language || "java";
    this.projectFolder = opts.projectFolder || opts.folder || opts.project || null;
    this.lspFolder = opts.lspFolder || this.projectFolder || null;
    this.folder   = opts.folder || this.projectFolder || null;
    this.syncRoot = opts.syncRoot || this.projectFolder || null;
    this.savePath = opts.savePath || null;
    this.saveEnabled = opts.saveEnabled === true;
    this._showDiagnostics = opts.showDiagnostics !== false;
    this._marks   = [];
    this._version = 1;
    this._ready   = false;
    this._readyCbs = [];
    this._compSeq  = 0;
    this._compTimer = null;
    this._saveTimer = null;
    this._suppressCompletion = false;

    this._updateVirtualFile();

	this._buildDom(containerEl);
	this._initCM();

	this.setContent(opts.content ?? "", this.language);

this._connectLsp();
  }

  _extensionForLanguage(lang) {
    return { java: ".java", c: ".c", cpp: ".cpp" }[lang] || ".java";
  }

  _updateVirtualFile() {
    const folder = normalizePath(this.projectFolder || this.folder || this.syncRoot || "").replace(/\/+$/, "");

    if (this.savePath) {
      const save = normalizePath(this.savePath);
      this.virtualFile = folder && !save.startsWith(folder + "/")
        ? `${folder}/${save}`
        : save;
    } else {
      const ext = this._extensionForLanguage(this.language);
      const name = `embedded_${this.id}${ext}`;
      this.virtualFile = folder ? `${folder}/${name}` : name;
    }

    this.uri = uriForFile(this.virtualFile);
  }

  //DOM
  _buildDom(container) {
        const wrapper = document.createElement("div");
    wrapper.className = "editor-wrapper";
    wrapper.style.cssText = "flex:1 1 auto;overflow:hidden;min-height:0;position:relative;";
    const ta = document.createElement("textarea");
    wrapper.appendChild(ta);
    container.appendChild(wrapper);
    this._ta = ta;

        const panel = document.createElement("section");
    panel.className = "diagnostics-panel";
    panel.style.display = "none";
    panel.innerHTML = `
      <div class="diagnostics-header">
        <span class="diagnostics-title">Problems</span>
        <span class="algator-diag-count diagnostics-count">0 errors, 0 warnings</span>
      </div>
      <div class="algator-diag-list diagnostics-list">
        <div class="diagnostics-empty">Ni zaznanih napak.</div>
      </div>`;
    container.appendChild(panel);
    this._diagPanel = panel;
    this._diagList  = panel.querySelector(".algator-diag-list");
    this._diagCount = panel.querySelector(".algator-diag-count");
  }

  //CodeMirror
  _modeStr(lang) {
    return { java: "text/x-java", c: "text/x-csrc", cpp: "text/x-c++src" }[lang] || "text/x-java";
  }

  _initCM() {
    this.cm = CodeMirror.fromTextArea(this._ta, {
      mode:             this._modeStr(this.language),
      theme:            "eclipse",
      lineNumbers:      true,
      matchBrackets:    true,
      autoCloseBrackets: true,
      indentUnit:       2,
      tabSize:          2,
      gutters:          this._showDiagnostics
                          ? ["CodeMirror-linenumbers", "lsp-diagnostics-gutter"]
                          : ["CodeMirror-linenumbers"],
      extraKeys: {
        "Ctrl-Space": () => this._requestCompletion(null),
        "Ctrl-S":     () => { /* brez autosave v mode 3 */ },
        "Esc":        () => { this._hideSignatureHint(); this.cm.closeHint?.(); },

        "Left": (cm) => {
          cm.execCommand("goCharLeft");
          if (cm.state.completionActive) {
            clearTimeout(this._compTimer);
            this._compTimer = setTimeout(() => {
              const { prefix } = this._typedPrefix();
              if (prefix.length >= 1) this._requestCompletion(null);
              else cm.closeHint?.();
            }, 60);
          }
        },

        "Right": (cm) => {
          cm.execCommand("goCharRight");
          if (cm.state.completionActive) {
            clearTimeout(this._compTimer);
            this._compTimer = setTimeout(() => {
              const { prefix } = this._typedPrefix();
              if (prefix.length >= 1) this._requestCompletion(null);
              else cm.closeHint?.();
            }, 60);
          }
        }
      }
    });
    this.cm.setSize("100%", "100%");
    updateEditorLanguageClass(this._modeStr(this.language));

    this.cm.getWrapperElement().addEventListener("keydown", (e) => {
      const hint = this.cm.state.completionActive;
      if (!hint) return;

      const w = hint.widget;
      if (!w) return;

      if (e.key === "ArrowDown" || e.key === "Down") {
        e.preventDefault();
        e.stopPropagation();
        w.changeActive(w.selectedHint + 1);
      } else if (e.key === "ArrowUp" || e.key === "Up") {
        e.preventDefault();
        e.stopPropagation();
        w.changeActive(w.selectedHint - 1);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        e.stopPropagation();
        w.changeActive(w.selectedHint + (w.screenAmount?.() || 5) - 1, true);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        e.stopPropagation();
        w.changeActive(w.selectedHint - (w.screenAmount?.() || 5) + 1, true);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        w.pick();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        hint.close();
        this._hideSignatureHint();
      }
    }, true);

    this.cm.on("cursorActivity", () => {
      clearTimeout(this._sigTimer);

      this._sigTimer = setTimeout(() => {
        if (!this._lspReady()) {
          this._hideSignatureHint();
          return;
        }

        if (this._callDepth() > 0) {
          this._requestSignatureHelp(null, true);
        } else {
          this._hideSignatureHint();
        }
      }, 120);
    });

        this.cm.on("change", (_cm, ch) => {
      if (ch.origin === "setValue") return;

      this._notifyLspChange();

      if (this.saveEnabled) {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this._saveToWorkspace(), CFG.editor.autosaveDelay ?? 1500);
      }

      if (ch.origin === "+delete") {
        clearTimeout(this._compTimer);

        const { prefix } = this._typedPrefix();

        if (this.cm.state.completionActive || prefix.length >= 1) {
          this._compTimer = setTimeout(() => this._requestCompletion(null), 120);
        }

        if (this._callDepth() > 0) {
          this._scheduleSignatureRefresh(null, true, 120);
        } else {
          this._hideSignatureHint();
        }
      }
    });

    this.cm.on("inputRead", (_cm, change) => {
      if (this._suppressCompletion) return;
      if (change.origin === "complete" || change.origin === "setValue") return;

      const text = (change.text || []).join("\n");
      if (!text || text.includes("\n")) return;
      const ch = text.slice(-1);
      const cur = this.cm.getCursor();
      const line = this.cm.getLine(cur.line) || "";

      this._notifyLspChange();

      if (ch === ".") {
        this._schedComp(".", CFG.editor.completionDelay); return;
      }
      if (ch === ">" && cur.ch >= 2 && line[cur.ch - 2] === "-") {
        this._schedComp(">", CFG.editor.completionDelay); return;
      }
      if (ch === ":" && cur.ch >= 2 && line[cur.ch - 2] === ":") {
        this._schedComp(":", CFG.editor.completionDelay); return;
      }

      if (ch === "(") {
        if (this.cm.state.completionActive) this.cm.closeHint?.();
        this._scheduleSignatureRefresh("(", false, 80);
        return;
      }

      if (ch === ",") {
        this._scheduleSignatureRefresh(",", true, CFG.editor.completionDelay);
        return;
      }

      if (ch === ")") {
        clearTimeout(this._sigTimer);
        this._sigTimer = setTimeout(() => {
          if (this._callDepth() <= 0) this._hideSignatureHint();
          else this._scheduleSignatureRefresh(null, true, 0);
        }, 50);
        return;
      }

      // Identifier
      if (/^[A-Za-z0-9_$]$/.test(ch)) {
        this._schedComp(null, CFG.editor.identifierDelay);
      }
    });
  }

  _schedComp(triggerChar, delay) {
    clearTimeout(this._compTimer);
    this._compTimer = setTimeout(() => this._requestCompletion(triggerChar), delay);
  }

  //LSP com
  _isJava() { return this.language === "java"; }

  _lspRequest(method, params) {
    if (!hasServerSupport()) return Promise.reject(new Error("No server"));
    if (this._isJava()) return sendJavaRequest(method, params);
    return sendLspRequest(method, params);
  }

  _lspNotify(method, params) {
    if (!hasServerSupport()) return;
    if (this._isJava()) sendJavaNotification(method, params);
    else               sendLspNotification(method, params);
  }

  _lspReady() {
    if (!hasServerSupport()) return false;
    if (this._isJava()) return javaInitialized  && typeof isJavaLspReady === "function" && isJavaLspReady();
    return clangdInitialized && typeof isLspReady === "function" && isLspReady();
  }

  _langId() {
    return this.language === "java" ? "java" : this.language === "cpp" ? "cpp" : "c";
  }

  _openInLsp() {
    if (!this._lspReady()) return;
    this._lspNotify("textDocument/didOpen", {
      textDocument: {
        uri:        this.uri,
        languageId: this._langId(),
        version:    this._version,
        text:       this.cm.getValue()
      }
    });
  }

  _notifyLspChange() {
    if (!this._lspReady()) return;
    this._version++;
    this._lspNotify("textDocument/didChange", {
      textDocument:   { uri: this.uri, version: this._version },
      contentChanges: [{ text: this.cm.getValue() }]
    });
  }

  //Signature help
  _showSignatureHint(html) {
    if (!html) {
      this._hideSignatureHint();
      return;
    }

    if (!this._sigEl) {
      this._sigEl = document.createElement("div");
      this._sigEl.className = "cm-signature-hint";
      document.body.appendChild(this._sigEl);
    }

    this._sigEl.innerHTML = html;
    this._sigEl.style.display = "block";

    requestAnimationFrame(() => {
      if (!this._sigEl || !this.cm) return;
      const cur = this.cm.getCursor();
      const coords = this.cm.charCoords({ line: cur.line, ch: cur.ch }, "window");
      this._sigEl.style.left = Math.max(4, coords.left) + "px";
      this._sigEl.style.top = (coords.top - this._sigEl.offsetHeight - 8) + "px";
    });
  }

  _hideSignatureHint() {
    if (this._sigEl) this._sigEl.style.display = "none";
  }

  _callDepth() {
    if (!this.cm) return 0;

    const cur = this.cm.getCursor();
    const before = (this.cm.getLine(cur.line) || "").slice(0, cur.ch);
    let depth = 0;
    let inStr = false;
    let strCh = "";

    for (const ch of before) {
      if (inStr) {
        if (ch === strCh) inStr = false;
        continue;
      }

      if (ch === '"' || ch === "'") {
        inStr = true;
        strCh = ch;
        continue;
      }

      if (ch === "(") depth++;
      else if (ch === ")" && depth > 0) depth--;
    }

    return depth;
  }

  _scheduleSignatureRefresh(triggerChar, isRetrigger, delay) {
    clearTimeout(this._sigTimer);
    this._sigTimer = setTimeout(() => {
      if (this._callDepth() > 0) this._requestSignatureHelp(triggerChar, isRetrigger);
      else this._hideSignatureHint();
    }, delay ?? CFG.editor.completionDelay);
  }

  _requestSignatureHelp(triggerChar, isRetrigger) {
    if (!this._lspReady()) return;

    const cur = this.cm.getCursor();

    this._lspRequest("textDocument/signatureHelp", {
      textDocument: { uri: this.uri },
      position: { line: cur.line, character: cur.ch },
      context: {
        triggerKind: triggerChar ? 2 : 1,
        isRetrigger: isRetrigger ?? false,
        triggerCharacter: triggerChar || undefined
      }
    })
      .then(result => {
        if (!result?.signatures?.length) {
          this._hideSignatureHint();
          return;
        }

        const sig = result.signatures[result.activeSignature ?? 0];
        if (!sig) {
          this._hideSignatureHint();
          return;
        }

        const paramIdx = result.activeParameter ?? sig.activeParameter ?? 0;
        const params = sig.parameters || [];
        let label = escapeHtmlBasic(sig.label);

        if (params[paramIdx]) {
          const p = params[paramIdx];
          let pLabel, pStart, pEnd;

          if (Array.isArray(p.label)) {
            [pStart, pEnd] = p.label;
            pLabel = sig.label.slice(pStart, pEnd);
          } else {
            pLabel = p.label;
            pStart = sig.label.indexOf(pLabel);
            pEnd = pStart + pLabel.length;
          }

          if (pStart >= 0) {
            label =
              escapeHtmlBasic(sig.label.slice(0, pStart)) +
              "<strong>" + escapeHtmlBasic(pLabel) + "</strong>" +
              escapeHtmlBasic(sig.label.slice(pEnd));
          }
        }

        this._showSignatureHint(label);
      })
      .catch(() => {});
  }

  //Completion
  _typedPrefix() {
    const cur  = this.cm.getCursor();
    const line = this.cm.getLine(cur.line) || "";
    let start  = cur.ch;
    while (start > 0 && /[\w$]/.test(line[start - 1])) start--;
    return { from: { line: cur.line, ch: start }, to: cur, prefix: line.slice(start, cur.ch) };
  }

  _requestCompletion(triggerChar) {
    if (!this._lspReady()) return;

    const cur        = this.cm.getCursor();
    const { from, to, prefix } = this._typedPrefix();
    const isMember   = [".", ">", ":"].includes(triggerChar);
    const typedPfx   = isMember ? "" : prefix;
    const seq        = ++this._compSeq;

    if (!isMember && typedPfx.length < 1) return;

    this._lspRequest("textDocument/completion", {
      textDocument: { uri: this.uri },
      position:     { line: cur.line, character: cur.ch },
      context: triggerChar
        ? { triggerKind: 2, triggerCharacter: triggerChar }
        : { triggerKind: 1 }
    }).then(result => {
      if (seq !== this._compSeq) return;

      let items = Array.isArray(result) ? result : (result?.items ?? []);

      if (this._isJava() && !isMember) {
        items = [
          ...javaSnippetItems(typedPfx),
          ...items
        ];
      }

      if (!items.length) return;

            if (typedPfx) {
        const low = typedPfx.toLowerCase();
        items = items.filter(i =>
          (i.label || "").toLowerCase().startsWith(low) ||
          stripSnippets(i.insertText || "").toLowerCase().startsWith(low)
        );
      }
            if (!this._isJava()) {
        items = isMember
          ? items.filter(i => (i.sortText || "9") < "4") || items
          : items.filter(i => (i.sortText || "9") < "7");
      }

      if (!items.length) return;
      items.sort((a, b) => (a.sortText || a.label || "").localeCompare(b.sortText || b.label || ""));
      items = items.slice(0, isMember
        ? (this._isJava() ? CFG.editor.javaMemberMax : CFG.editor.memberMaxItems)
        : CFG.editor.identifierMax);

      if (this.cm.state.completionActive) this.cm.closeHint?.();

      const self = this;
      CodeMirror.showHint(this.cm, () => ({
        from, to,
        list: items.map(item => {
          const localSnippet = isLocalJavaSnippet(item);
          const callable    = !localSnippet && isCallable(item);
          const kindInfo    = getKindInfo(item.kind);
          const displayLbl  = callable ? (item.label.includes("(") ? item.label : item.label + "(…)") : item.label;
          return {
            text: callable ? getFunctionName(item) + "()" : getInsertText(item) || item.label,
            render(el) {
              el.classList.add("lsp-hint-item");
              const icon = document.createElement("span");
              icon.className = "lsp-hint-kind"; icon.textContent = kindInfo.icon; icon.style.color = kindInfo.color;
              el.appendChild(icon);
              const lbl = document.createElement("span");
              lbl.className = "lsp-hint-label";
              appendLabelWithBoldPrefix(lbl, displayLbl, typedPfx);
              el.appendChild(lbl);
              if (item.detail) {
                const det = document.createElement("span");
                det.className = "lsp-hint-detail";
                det.textContent = item.detail.split("\n")[0].trim().slice(0, 40);
                el.appendChild(det);
              }
            },
            hint(cm) {
              self._suppressCompletion = true;

              const editRange = getCompletionEditRange(
                item,
                from,
                to
              );

              try {
                if (localSnippet) {
                  insertSnippet(
                    cm,
                    item.insertText || item.label,
                    editRange.from,
                    editRange.to
                  );
                } else if (callable) {
                  cm.replaceRange(
                    getFunctionName(item) + "()",
                    editRange.from,
                    editRange.to,
                    "complete"
                  );

                  const p = cm.getCursor();
                  cm.setCursor({
                    line: p.line,
                    ch: p.ch - 1
                  });

                  setTimeout(
                    () => self._requestSignatureHelp("(", false),
                    60
                  );
                } else {
                  cm.replaceRange(
                    getInsertText(item) || item.label,
                    editRange.from,
                    editRange.to,
                    "complete"
                  );
                }
              } finally {
                setTimeout(() => { self._suppressCompletion = false; }, 0);
              }
            }
          };
        })
      }), {
        completeSingle: false,
        alignWithWord: true,
        closeOnUnfocus: true
      });
    }).catch(() => {});
  }

  //Diagnostics
  _clearDiagMarks() {
    this._marks.forEach(m => { try { m.clear(); } catch {} });
    this._marks = [];
    this.cm.clearGutter("lsp-diagnostics-gutter");
  }

  _renderDiagnostics(diagnostics) {
    this._clearDiagMarks();

    const items = compactDiagnostics(diagnostics);
    const groups = groupDiagnosticsForPanel(items);
    const errors = groups.filter(group => group.severity === 1).length;
    const warns = groups.filter(group => group.severity === 2).length;

    if (this._diagCount) {
      this._diagCount.textContent = `${errors} errors, ${warns} warnings`;
    }

    if (!this._showDiagnostics || !items.length) {
      this._diagPanel.classList.remove("has-problems");
      this._diagPanel.style.display = "none";

      if (this._diagList) {
        this._diagList.innerHTML =
          "<div class='diagnostics-empty'>Ni zaznanih napak.</div>";
      }

      return;
    }

    this._diagPanel.style.display = "";
    this._diagPanel.classList.add("has-problems");

    const byLine = new Map();

    items.forEach(diag => {
      const sc = severityToClass(diag.severity);
      const start = diag.range?.start || { line: 0, character: 0 };
      const end = diag.range?.end || start;
      const from = {
        line: start.line ?? 0,
        ch: start.character ?? 0
      };

      let eLine = end.line ?? from.line;
      let eCh = end.character ?? from.ch;

      if (from.line === eLine && from.ch === eCh) {
        eCh = from.ch + 1;
      }

      const lineText = this.cm.getLine(from.line) || "";

      if (from.line === eLine && eCh > lineText.length) {
        eCh = lineText.length;
      }

      if (from.line === eLine && eCh <= from.ch) {
        eCh = Math.min(lineText.length, from.ch + 1);
      }

      const mark = this.cm.markText(
        from,
        { line: eLine, ch: eCh },
        {
          className: `cm-lsp-${sc}`,
          attributes: {
            title: `${severityToLabel(diag.severity)}: ${diag.message}`
          }
        }
      );

      this._marks.push(mark);

      const existing = byLine.get(from.line);

      if (!existing) {
        byLine.set(from.line, {
          severity: diag.severity,
          diagnostics: [diag]
        });
      } else {
        existing.diagnostics.push(diag);

        if ((diag.severity || 4) < (existing.severity || 4)) {
          existing.severity = diag.severity;
        }
      }
    });

    for (const [line, info] of byLine) {
      const sc = severityToClass(info.severity);
      const marker = document.createElement("div");

      marker.className = `cm-diagnostic-gutter-marker is-${sc}`;
      marker.title = info.diagnostics
        .map(diag => `${severityToLabel(diag.severity)}: ${diag.message}`)
        .join("\n");
      marker.textContent = info.severity === 1 ? "●" : "▲";

      this.cm.setGutterMarker(
        line,
        "lsp-diagnostics-gutter",
        marker
      );

      this._marks.push({
        clear: () =>
          this.cm.setGutterMarker(
            line,
            "lsp-diagnostics-gutter",
            null
          )
      });
    }

    if (this._diagList) {
      this._diagList.innerHTML = "";

      groups.slice(0, 10).forEach(group => {
        const diag = group.first;
        const row = document.createElement("button");
        const line = diag.range?.start?.line ?? 0;
        const ch = diag.range?.start?.character ?? 0;
        const occurrences =
          group.count > 1 ? ` • ${group.count} locations` : "";

        row.type = "button";
        row.className =
          `diagnostic-item is-${severityToClass(group.severity)}`;

        row.innerHTML = `
          <span class="diagnostic-severity ${severityToClass(group.severity)}"></span>
          <span class="diagnostic-main">
            <span class="diagnostic-message">${escapeHtml(group.message)}</span>
            <span class="diagnostic-meta">${severityToLabel(group.severity)} • line ${line + 1}, col ${ch + 1}${occurrences}</span>
          </span>`;

        row.addEventListener("click", () => {
          this.cm.focus();
          this.cm.setCursor({ line, ch });
          this.cm.scrollIntoView({ line, ch }, 120);
        });

        this._diagList.appendChild(row);
      });
    }
  }

  //LSP connect + folder context
  _connectLsp() {
        const onDiag = this._isJava() ? onJavaLspDiagnostics : onLspDiagnostics;
    onDiag(params => {
      if (params?.uri === this.uri) this._renderDiagnostics(params.diagnostics || []);
    });

    const activate = async () => {
      const lspFolder = normalizePath(
        this.lspFolder || this.projectFolder || this.folder || this.syncRoot || ""
      ).replace(/\/+$/, "");

      if (lspFolder) await ensureEmbeddedServerProjectFolder(lspFolder);
      await _waitLspInit(this._isJava());
      this._openInLsp();
      if (lspFolder) await this._openFolderContext();
      if (!this._ready) {
        this._ready = true;
        this._readyCbs.forEach(fn => fn(this));
        this._readyCbs = [];
      }
    };

        if (this._lspReady()) { activate(); }

        const onOpen = this._isJava() ? onJavaLspOpen : onLspOpen;
    onOpen(() => activate());
  }

  async _openFolderContext() {
    const folder = normalizePath(
      this.lspFolder || this.projectFolder || this.folder || this.syncRoot || ""
    );
    if (!hasServerSupport() || !folder) return;
    try {
      const url = `${CFG.server.httpUrl}/scan?folder=${encodeURIComponent(folder)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const { files } = await res.json();

      const isJavaSelf = this._isJava();
      const exts = isJavaSelf ? [".java"] : [".c", ".cpp", ".cc", ".cxx", ".h", ".hpp"];

      for (const f of files) {
        const lf = f.toLowerCase();
        if (!exts.some(e => lf.endsWith(e))) continue;
                if (f === this.virtualFile) continue;

        try {
          const fRes = await fetch(`${CFG.server.httpUrl}/workspace/${encodeURIComponent(f)}`);
          if (!fRes.ok) continue;
          const text    = await fRes.text();
          const langId  = lf.endsWith(".java") ? "java" : lf.endsWith(".cpp") || lf.endsWith(".cc") || lf.endsWith(".cxx") ? "cpp" : "c";
          const fUri    = uriForFile(f);

          this._lspNotify("textDocument/didOpen", {
            textDocument: { uri: fUri, languageId: langId, version: 1, text }
          });
        } catch {}
      }
    } catch (e) {
      console.warn("[AlgatorMode] folder context failed:", e.message);
    }
  }

  //Public API
  setContent(code, language) {
        if (language && language !== this.language) {
      this.language = language;
      this._updateVirtualFile();
      const mode = this._modeStr(language);
      this.cm.setOption("mode", mode);
      updateEditorLanguageClass(mode);
    }

    this._version++;
    this.cm.setValue(code ?? "");

    if (this._lspReady()) {
      this._lspNotify("textDocument/didOpen", {
        textDocument: {
          uri:        this.uri,
          languageId: this._langId(),
          version:    this._version,
          text:       code ?? ""
        }
      });
    }

    if (this.saveEnabled && hasServerSupport()) {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this._saveToWorkspace(), 300);
    }
  }

  async _saveToWorkspace() {
    if (!this.saveEnabled || !hasServerSupport()) return;
    const content = this.cm.getValue();

    try {
      await fetch(
        `${CFG.server.httpUrl}/workspace/${encodeURIComponent(this.virtualFile)}`,
        { method: "POST", headers: { "Content-Type": "text/plain; charset=utf-8" }, body: content }
      );
    } catch (e) {
      console.warn(`[embedded] workspace save failed: ${e.message}`);
    }
  }

  getContent() { return this.cm.getValue(); }

  setLanguage(lang) {
    this.setContent(this.getContent(), lang);
  }

  setDiagnosticsVisible(val) {
    this._showDiagnostics = val !== false;
    this.cm.setOption("gutters",
      this._showDiagnostics
        ? ["CodeMirror-linenumbers", "lsp-diagnostics-gutter"]
        : ["CodeMirror-linenumbers"]
    );
    if (!this._showDiagnostics) {
      this._clearDiagMarks();
      this._diagPanel.classList.remove("has-problems");
      this._diagPanel.style.display = "none";
    }
  }

  setReadOnly(val) { this.cm.setOption("readOnly", !!val); }
  focus()          { this.cm.focus(); }
  refresh()        { this.cm.refresh(); }

  whenReady() {
    return new Promise(resolve => {
      if (this._ready) resolve(this);
      else this._readyCbs.push(resolve);
    });
  }

  destroy() {
        if (this._lspReady()) {
      this._lspNotify("textDocument/didClose", { textDocument: { uri: this.uri } });
    }
    this._hideSignatureHint();
    this._sigEl?.remove?.();
    this._sigEl = null;
    this._clearDiagMarks();
    this.cm.toTextArea();
  }
}

//Global
window.createEmbeddedEditor = function(containerEl, opts = {}) {
  return new AlgatorInstance(containerEl, opts);
};

window.createAlgatorEditor = window.createEmbeddedEditor;