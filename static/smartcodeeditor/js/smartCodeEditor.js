// ═══════════════════════════════════════════════════════════════════════
// smartCodeEditor.js  — vrstni red: config.js → lspClient.js → smartCodeEditor.js → editorMain.js
//
// MODE PROJECT  (večdatotečni urejevalnik s projekti in zavihki):
//   var ed = smartCodeEditor.initEditor("editorDiv", true, true, true, smartCodeEditor.editorMode.PROJECT);
//
// MODE FOLDER  (odpre direktorij kot projekt):
//   var ed = smartCodeEditor.initEditor("editorDiv", true, true, true, smartCodeEditor.editorMode.FOLDER);
//
// MODE SINGLE:
//   var ed = smartCodeEditor.initEditor("div", false, false, true, smartCodeEditor.editorMode.SINGLE, {
//     language: "java",   // "java" | "c" | "cpp"
//     folder:   "mylib"   // relativna podmapa workspace za LSP kontekst (opcijsko)
//   });
//   ed.whenReady().then(() => {
//     ed.setContent("public class X { }", "java");
//     console.log(ed.getContent());
//   });
//
// EMBEDDED:
//   var ed = smartCodeEditor.initEmbeddedEditor({
//     divId: "my-editor",
//     hiddenDiv: "my-hidden-textarea",
//     height: "700px" // sprejme tudi številko: 700
//   });
//

window.smartCodeEditor = (() => {

  const editorMode = Object.freeze({
    PROJECT: "project", 
    FOLDER:  "folder",    
    SINGLE:  "single"     
  });

  const _modeMap = { project: 1, folder: 2, single: 3 };

  function resolveMode(m) {
    if (typeof m === "string") return _modeMap[m.toLowerCase()] ?? 1;
    return Number(m) || 1;
  }

  function normalizeCssSize(value, fallback = null) {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    return typeof value === "number"
      ? `${value}px`
      : String(value);
  }

  function applyEmbeddedHeight(root, value, fallback = "650px") {
    if (!root) return;

    const height = normalizeCssSize(value, fallback);
    if (!height) return;

    root.style.height = height;
    root.style.minHeight = height;
  }

  const callbacks = { onChange: null, onSave: null, onFileOpen: null };
  let editorMainPatched = false;

  function hookIntoEditorMain() {
    if (editorMainPatched) return;
    editorMainPatched = true;

    const waitForCodeMirror = () => {
      if (typeof editor === "undefined" || !editor) {
        setTimeout(waitForCodeMirror, 100);
        return;
      }

      editor.on("change", (cm, ch) => {
        if (ch.origin === "setValue") return;

        if (callbacks.onChange) {
          try {
            callbacks.onChange(
              editor.getValue(),
              typeof activeFile !== "undefined" ? activeFile : null
            );
          } catch (e) {
            console.error("[smartCodeEditor] onChange:", e);
          }
        }
      });
    };

    waitForCodeMirror();

    if (typeof saveActiveFile === "function") {
      const originalSaveActiveFile = saveActiveFile;

      window.saveActiveFile = async function(silent) {
        await originalSaveActiveFile.call(this, silent);

        if (callbacks.onSave) {
          try {
            callbacks.onSave(
              typeof editor !== "undefined" && editor ? editor.getValue() : "",
              typeof activeFile !== "undefined" ? activeFile : null
            );
          } catch (e) {
            console.error("[smartCodeEditor] onSave:", e);
          }
        }
      };
    }

    if (typeof openFile === "function") {
      const originalOpenFile = openFile;

      window.openFile = async function(filename) {
        await originalOpenFile.call(this, filename);

        if (callbacks.onFileOpen) {
          try {
            callbacks.onFileOpen(
              filename,
              typeof modeForFile === "function" ? modeForFile(filename) : ""
            );
          } catch (e) {
            console.error("[smartCodeEditor] onFileOpen:", e);
          }
        }
      };
    }
  }

  class EditorAPI {
    constructor(
      divId,
      showToolbar = true,
      showTabStatusbar = true,
      showDiagnostics = true,
      mode = editorMode.PROJECT,
      options = {}
    ) {
      if (typeof mode === "object" && mode !== null) {
        options = mode;
        mode = options.mode ?? editorMode.PROJECT;
      }

      this.divId            = divId;
      this.showToolbar      = showToolbar !== false;
      this.showTabStatusbar = showTabStatusbar !== false;
      this.showDiagnostics  = showDiagnostics !== false;
      this.mode             = resolveMode(mode);
      this.options          = options || {};
      this.syncRoot         = Object.prototype.hasOwnProperty.call(this.options, "syncRoot")
        ? (this.options.syncRoot || "")
        : (this.options.projectFolder || this.options.folder || "");
      this.lsyncEnabled     = this.options.lsyncEnabled === true;
      this.options.syncRoot = this.syncRoot;
      this.options.lsyncEnabled = this.lsyncEnabled;
      this.readyState       = false;
      this.embeddedEditorInstance = null;

      if (this.mode === 3) {
        window.smartCodeInitialMode     = 3;
        window.smartCodeShowDiagnostics = this.showDiagnostics;
        window.smartCodeInitialOptions  = this.options;
        this.initEmbeddedEditorMode();
        return;
      }

      window.smartCodeShowDiagnostics = this.showDiagnostics;
      window.smartCodeInitialMode     = this.mode;
      window.smartCodeInitialOptions  = this.options;

      this.prepareDom();

      const mountEditor = async () => {
        if (typeof editor === "undefined" || !editor) {
          setTimeout(mountEditor, 100);
          return;
        }

        this.mount();
        this.readyState = true;
        hookIntoEditorMain();

        if (this.options.project) {
          await this.openProject(this.options.project);
        } else if (this.mode === 1) {
          await this.openWorkspaceProject();
        } else if (this.mode === 2) {
          this.showDirectoryPrompt();
        }
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => mountEditor());
      } else {
        mountEditor();
      }
    }

    initEmbeddedEditorMode() {
      const initEmbeddedEditor = () => {
        const factory = window.createEmbeddedEditor || window.createTargetEditor;

        if (typeof factory !== "function") {
          setTimeout(initEmbeddedEditor, 50);
          return;
        }

        const root = this.root();
        if (!root) return;

        root.style.display       = "flex";
        root.style.flexDirection = "column";
        root.style.overflow      = "hidden";

        applyEmbeddedHeight(
          root,
          this.options.height,
          root.style.height || "100%"
        );

        const initialContent =
          Object.prototype.hasOwnProperty.call(this.options, "content")
            ? this.options.content
            : this.options.initialContent;

        this.embeddedEditorInstance = factory(root, {
          language:        this.options.language || "java",
          projectFolder:   this.options.projectFolder || this.options.folder || this.options.project || null,
          lspFolder:       this.options.lspFolder || this.options.projectFolder || this.options.folder || this.options.project || null,
          folder:          this.options.folder || this.options.projectFolder || this.options.project || null,
          syncRoot:        this.syncRoot,
          lsyncEnabled:    this.lsyncEnabled,
          savePath:        this.options.savePath || null,
          saveEnabled:     this.options.saveEnabled === true,
          showDiagnostics: this.showDiagnostics,
          readOnly:        this.options.readOnly !== false,
          content:         initialContent,
          height:          this.options.height
        });

        this.readyState = true;

        if (initialContent !== undefined) {
          this.embeddedEditorInstance.setContent(
            initialContent ?? "",
            this.options.language || "java"
          );
        }

        if (this.pendingContent !== undefined) {
          this.embeddedEditorInstance.setContent(
            this.pendingContent ?? "",
            this.pendingLanguage || this.options.language || "java"
          );

          this.pendingContent  = undefined;
          this.pendingLanguage = undefined;
        }

        setTimeout(() => {
          this.embeddedEditorInstance?.refresh?.();
          this.embeddedEditorInstance?.focus?.();
        }, 100);
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => initEmbeddedEditor());
      } else {
        initEmbeddedEditor();
      }
    }

    root() {
      const root = document.getElementById(this.divId);
      if (!root) console.error(`[smartCodeEditor] element #${this.divId} ne obstaja`);
      return root;
    }

    prepareRoot(root) {
      root.classList.add("smartcode-root");
      if (!root.style.width)  root.style.width  = "100%";
      if (!root.style.height) root.style.height = "100vh";
      root.style.display       = "flex";
      root.style.flexDirection = "column";
      root.style.overflow      = "hidden";
      root.style.minHeight     = "0";
    }

    createDom(root) {
      root.innerHTML = `
        <header class="topbar">
          <div class="title">SmartCode</div>
          <div class="controls">
            <button id="newFileBtn"     class="btn-secondary" type="button">New File</button>
            <button id="openBtn"        class="btn-secondary" type="button">Open Files</button>
            <button id="openFolderBtn"  class="btn-secondary" type="button">Open Project</button>
            <button id="saveBtn"        class="btn-primary"   type="button">Save</button>
            <input  id="fileInput" type="file" multiple hidden />
          </div>
        </header>

        <div id="tabBar" class="tab-bar"></div>

        <main class="editor-wrapper">
          <textarea id="editor"></textarea>
        </main>

        <section id="diagnosticsPanel" class="diagnostics-panel">
          <div class="diagnostics-header">
            <span class="diagnostics-title">Problems</span>
            <span id="diagnosticsCount" class="diagnostics-count">0 errors, 0 warnings</span>
          </div>
          <div id="diagnosticsList" class="diagnostics-list">
            <div class="diagnostics-empty">Ni zaznanih napak.</div>
          </div>
        </section>

        <footer class="statusbar">
          <span id="serverInfo">LSP: —</span>
          <span id="autosaveInfo" class="autosave-idle">Autosave: —</span>
          <span id="cursorInfo">Ln 1, Col 1</span>
        </footer>
      `;
    }

    existingEditorElements() {
      return [
        document.querySelector("header.topbar, .topbar"),
        document.getElementById("tabBar"),
        document.querySelector("main.editor-wrapper, .editor-wrapper"),
        document.getElementById("diagnosticsPanel"),
        document.querySelector("footer.statusbar, .statusbar")
      ].filter(Boolean);
    }

    prepareDom() {
      const root = this.root();
      if (!root) return;

      this.prepareRoot(root);

      if (!document.getElementById("editor")) {
        this.createDom(root);
      } else {
        for (const el of this.existingEditorElements()) {
          if (el.parentElement !== root) root.appendChild(el);
        }
      }

      this.applyVisibility();
    }

    mount() {
      const root = this.root();
      if (!root) return;

      this.prepareRoot(root);
      this.applyVisibility();

      setTimeout(() => editor?.refresh(), 50);
      setTimeout(() => editor?.refresh(), 250);
    }

    showDirectoryPrompt() {
      const root = this.root();
      if (!root || document.getElementById("smartcodeDirectoryPrompt")) return;

      const box = document.createElement("div");
      box.id = "smartcodeDirectoryPrompt";
      box.style.cssText = "position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(248,250,252,.86);backdrop-filter:blur(3px);";
      box.innerHTML = `
        <div style="background:#fff;border:1px solid #dbe3ef;border-radius:16px;box-shadow:0 18px 50px rgba(15,23,42,.14);padding:24px;max-width:460px;text-align:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
          <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Open project directory</div>
          <div style="font-size:14px;color:#475569;margin-bottom:18px;line-height:1.45;">
            Način 2 odpre direktorij kot projekt. Vse .java, .c, .cpp, .h, .hpp datoteke iz izbrane mape in podmap se odprejo v zavihkih in sinhronizirajo z LSP.
          </div>
          <button id="smartcodeDirectoryPromptBtn" type="button" style="border:0;border-radius:10px;padding:10px 16px;background:#2563eb;color:white;font-weight:700;cursor:pointer;">Izberi direktorij</button>
        </div>
      `;

      const oldPosition = root.style.position;
      if (!oldPosition || oldPosition === "static") root.style.position = "relative";

      root.appendChild(box);

      document.getElementById("smartcodeDirectoryPromptBtn")?.addEventListener("click", async () => {
        try {
          await this.openDirectoryProject();
          box.remove();
        } catch (e) {
          console.warn("[smartCodeEditor] open directory failed:", e.message);
        }
      });
    }

    applyVisibility() {
      const toolbar          = document.querySelector("header.topbar, .topbar");
      const tabbar           = document.getElementById("tabBar");
      const status           = document.querySelector("footer.statusbar, .statusbar");
      const diagnosticsPanel = document.getElementById("diagnosticsPanel");

      if (toolbar)          toolbar.style.display = this.showToolbar      ? "" : "none";
      if (tabbar)           tabbar.style.display  = this.showTabStatusbar ? "" : "none";
      if (status)           status.style.display  = this.showTabStatusbar ? "" : "none";

      if (diagnosticsPanel) {
        diagnosticsPanel.style.display =
          this.showDiagnostics && diagnosticsPanel.classList.contains("has-problems")
            ? "" : "none";
      }

      window.smartCodeShowDiagnostics = this.showDiagnostics;

      if (typeof editor !== "undefined" && editor) {
        editor.setOption(
          "gutters",
          this.showDiagnostics
            ? ["CodeMirror-linenumbers", "lsp-diagnostics-gutter"]
            : ["CodeMirror-linenumbers"]
        );

        if (!this.showDiagnostics && typeof clearDiagnostics === "function") clearDiagnostics();

        if (this.showDiagnostics && typeof renderDiagnostics === "function") {
          const uri =
            typeof activeFile !== "undefined" && typeof fileStates !== "undefined"
              ? fileStates.get(activeFile)?.uri : null;

          const list =
            uri && typeof diagnosticsByFile !== "undefined"
              ? diagnosticsByFile.get(uri) || [] : [];

          renderDiagnostics(list, uri);
        }

        editor.refresh();
      }
    }

    //Public API

    async openProject(project) {
      if (this.mode === 3) { console.warn("[smartCodeEditor] openProject ni na voljo v SINGLE načinu"); return; }
      if (typeof window.openSmartCodeProject !== "function") { console.warn("[smartCodeEditor] openSmartCodeProject še ni pripravljen"); return; }
      await window.openSmartCodeProject(project);
    }

    async openDemoProject() {
      if (this.mode !== 3) document.getElementById("demoProjectBtn")?.click();
    }

    async openDirectoryProject() {
      if (this.mode === 3) return;
      if (typeof window.openSmartCodeFolderProject === "function") { await window.openSmartCodeFolderProject(); return; }
      document.getElementById("openFolderBtn")?.click();
    }

    async openWorkspaceProject() {
      if (this.mode === 3) return;
      if (typeof window.openSmartCodeWorkspaceProject === "function") { await window.openSmartCodeWorkspaceProject(); return; }
      console.warn("[smartCodeEditor] openSmartCodeWorkspaceProject še ni pripravljen");
    }

    getProjectInfo() {
      if (this.mode === 3) return null;
      return typeof window.getSmartCodeProjectInfo === "function" ? window.getSmartCodeProjectInfo() : null;
    }

    async setSyncRoot(syncRoot = "", lsyncEnabled = this.lsyncEnabled) {
      const root = String(syncRoot || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");

      this.syncRoot = root;
      this.lsyncEnabled = lsyncEnabled === true;
      this.options.syncRoot = this.syncRoot;
      this.options.lsyncEnabled = this.lsyncEnabled;

      try {
        const baseUrl =
          typeof SmartCodeConfig !== "undefined" && SmartCodeConfig.server?.httpUrl
            ? SmartCodeConfig.server.httpUrl
            : "http://localhost:3000";

        const res = await fetch(`${baseUrl}/sync-root`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            syncRoot: this.syncRoot,
            folder: this.options.folder || "",
            lsyncEnabled: this.lsyncEnabled
          })
        });

        return res.ok;
      } catch (e) {
        console.warn("[smartCodeEditor] setSyncRoot failed:", e.message);
        return false;
      }
    }

    async setLsyncEnabled(enabled) {
      return await this.setSyncRoot(this.syncRoot || "", enabled === true);
    }

    getSyncOptions() {
      return {
        syncRoot: this.syncRoot || "",
        lsyncEnabled: this.lsyncEnabled === true
      };
    }

    setContent(code, language) {
      if (this.mode === 3) {
        if (!this.embeddedEditorInstance) {
          this.pendingContent  = code;
          this.pendingLanguage = language;
          return;
        }
        this.embeddedEditorInstance.setContent(code, language);
        return;
      }

      if (typeof editor === "undefined" || !editor) { console.warn("[smartCodeEditor] editor še ni pripravljen"); return; }

      if (language) {
        const project = {
          id: `external-${Date.now()}`, name: "External content",
          source: "api", persist: false,
          files: [{ path: language, content: code ?? "" }],
          activeFile: language
        };
        if (typeof window.openSmartCodeProject === "function") window.openSmartCodeProject(project);
        return;
      }

      const prev = typeof isFileSwitch !== "undefined" ? isFileSwitch : false;
      try { if (typeof isFileSwitch !== "undefined") isFileSwitch = true; } catch {}
      editor.setValue(code ?? "");
      try { if (typeof isFileSwitch !== "undefined") isFileSwitch = prev; } catch {}
    }

    getContent() {
      if (this.mode === 3) return this.embeddedEditorInstance ? this.embeddedEditorInstance.getContent() : "";
      if (typeof editor === "undefined" || !editor) return "";
      return editor.getValue();
    }

    setLanguage(lang) {
      if (this.mode === 3) { this.embeddedEditorInstance?.setLanguage(lang); return; }
      if (typeof editor === "undefined" || !editor) return;

      const modes = { java: "text/x-java", c: "text/x-csrc", cpp: "text/x-c++src", "c++": "text/x-c++src" };
      const mode  = modes[lang];
      if (!mode) { console.warn(`[smartCodeEditor] neznan jezik: ${lang}`); return; }

      editor.setOption("mode", mode);
      editor.setOption("theme", "eclipse");
      if (typeof updateEditorLanguageClass === "function") updateEditorLanguageClass(mode);
      editor.refresh();
    }

    getLanguage() {
      if (this.mode === 3) return this.embeddedEditorInstance ? this.embeddedEditorInstance.language : "java";
      if (typeof editor === "undefined" || !editor) return "plain";
      return ({ "text/x-java": "java", "text/x-csrc": "c", "text/x-c++src": "cpp" })[editor.getOption("mode")] || "plain";
    }

    async openFile(filename) {
      if (this.mode !== 3 && typeof openFile === "function") await openFile(filename);
    }

    async save() {
      if (this.mode !== 3 && typeof saveActiveFile === "function") await saveActiveFile(false);
    }

    setReadOnly(val) {
      if (this.mode === 3) { this.embeddedEditorInstance?.setReadOnly(val); return; }
      if (typeof editor !== "undefined" && editor) editor.setOption("readOnly", !!val);
    }

    focus() {
      if (this.mode === 3) { this.embeddedEditorInstance?.focus(); return; }
      if (typeof editor !== "undefined" && editor) editor.focus();
    }

    setDiagnosticsVisible(v) {
      this.showDiagnostics = v !== false;
      if (this.mode === 3) { this.embeddedEditorInstance?.setDiagnosticsVisible(v); return; }
      this.applyVisibility();
    }

    setUIVisible(v)           { if (this.mode !== 3) { this.showToolbar = this.showTabStatusbar = v !== false; this.applyVisibility(); } }
    setToolbarVisible(v)      { if (this.mode !== 3) { this.showToolbar = v !== false; this.applyVisibility(); } }
    setTabStatusbarVisible(v) { if (this.mode !== 3) { this.showTabStatusbar = v !== false; this.applyVisibility(); } }

    onChange(fn)   { callbacks.onChange  = typeof fn === "function" ? fn : null; }
    onSave(fn)     { callbacks.onSave    = typeof fn === "function" ? fn : null; }
    onFileOpen(fn) { callbacks.onFileOpen = typeof fn === "function" ? fn : null; }

    get cm() {
      return this.mode === 3
        ? (this.embeddedEditorInstance?.cm ?? null)
        : (typeof editor !== "undefined" ? editor : null);
    }

    get activeFile() {
      return this.mode === 3 ? null : (typeof activeFile !== "undefined" ? activeFile : null);
    }

    get ready() { return this.readyState; }

    whenReady() {
      return new Promise(resolve => {
        const check = () => this.readyState ? resolve(this) : setTimeout(check, 50);
        check();
      });
    }

    destroy() {
      callbacks.onChange = callbacks.onSave = callbacks.onFileOpen = null;
      if (this.mode === 3) this.embeddedEditorInstance?.destroy();
    }
  }


  function embeddedModeToLanguage(mode, fallback = "java") {
    const m = String(mode || "").toLowerCase();
    if (m.includes("c++") || m.includes("cpp")) return "cpp";
    if (m.includes("csrc") || m.includes("x-c") || m === "c") return "c";
    if (m.includes("java")) return "java";
    return fallback;
  }

  function normalizeEmbeddedProjectFolder(projectName, projectFolder) {
    if (projectFolder) return projectFolder;
    if (!projectName) return "";
    const name = String(projectName);
    return name.startsWith("PROJ-") ? name : "PROJ-" + name;
  }

  function getServerHttpUrl() {
    return typeof SmartCodeConfig !== "undefined" && SmartCodeConfig.server?.httpUrl
      ? SmartCodeConfig.server.httpUrl
      : "http://localhost:3000";
  }

  function encodeEmbeddedWorkspacePath(path) {
    return String(path || "")
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
  }

  function waitEmbedded(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function inferJavaFilePath(filePath, content, language, enabled = true) {
    if (
      enabled === false ||
      String(language || "").toLowerCase() !== "java" ||
      !content
    ) {
      return filePath;
    }

    const match = String(content).match(
      /\bpublic\s+(?:(?:abstract|final|sealed|non-sealed)\s+)*(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/
    );

    if (!match) return filePath;

    const normalized = String(filePath || "Main.java").replace(/\\/g, "/");
    const slash = normalized.lastIndexOf("/");
    const folder = slash >= 0 ? normalized.slice(0, slash + 1) : "";

    return `${folder}${match[1]}.java`;
  }

  async function resolveEmbeddedSource(opts) {
    if (!opts.projectName || !opts.algorithmName) {
      const language = opts.language || embeddedModeToLanguage(opts.mode, "java");
      const projectFolder = normalizeEmbeddedProjectFolder(
        opts.projectName,
        opts.projectFolder || opts.folder || opts.project
      );
      let savePath = opts.filePath || opts.savePath || opts.relativePath ||
        ((opts.key || "Main") + ({ java: ".java", c: ".c", cpp: ".cpp" }[language] || ".java"));

      savePath = inferJavaFilePath(
        savePath,
        opts.content,
        language,
        opts.inferJavaFileName !== false
      );

      return {
        ...opts,
        language,
        projectFolder,
        lspFolder: opts.lspFolder || projectFolder,
        folder: opts.folder || projectFolder,
        syncRoot: Object.prototype.hasOwnProperty.call(opts, "syncRoot")
          ? opts.syncRoot
          : projectFolder,
        savePath,
        content: Object.prototype.hasOwnProperty.call(opts, "content")
          ? (opts.content ?? "")
          : undefined,
        saveEnabled: opts.saveEnabled === true
      };
    }

    const query = new URLSearchParams({
      project: String(opts.projectName),
      algorithm: String(opts.algorithmName)
    });

    const response = await fetch(`${getServerHttpUrl()}/resolve-embedded-file?${query.toString()}`);
    if (!response.ok) {
      let message = `Datoteke algoritma '${opts.algorithmName}' ni mogoče najti.`;
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch {}
      throw new Error(message);
    }

    const source = await response.json();

    let resolvedContent = source.content ?? "";

    /*
     * Ob prvem prikazu ALGator včasih odpre panel, preden je vsebina
     * sinhronizirane datoteke že vrnjena v resolverju. Pot je takrat
     * pravilna (zato LSP že pokaže diagnostiko), CodeMirror pa dobi
     * prazen niz. V tem primeru datoteko neposredno preberemo iz
     * /workspace in nekajkrat ponovimo poskus.
     */
    if (
      resolvedContent === "" &&
      source.projectFolder &&
      source.relativePath
    ) {
      const workspacePath = encodeEmbeddedWorkspacePath(
        `${source.projectFolder}/${source.relativePath}`
      );

      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const fileResponse = await fetch(
            `${getServerHttpUrl()}/workspace/${workspacePath}`,
            { cache: "no-store" }
          );

          if (fileResponse.ok) {
            const fileContent = await fileResponse.text();

            if (fileContent !== "") {
              resolvedContent = fileContent;
              break;
            }
          }
        } catch {}

        await waitEmbedded(100);
      }
    }

    return {
      ...opts,
      language: source.language,
      projectFolder: source.projectFolder,
      lspFolder: opts.lspFolder || source.projectFolder,
      folder: source.projectFolder,
      syncRoot: source.projectFolder,
      savePath: source.relativePath,
      content: resolvedContent,
      lsyncEnabled: true,
      saveEnabled: false,
      resolvedSource: {
        ...source,
        content: resolvedContent
      }
    };
  }

  function createEmbeddedAdapter(api, root, hiddenEl, opts) {
    const listeners = [];

    const resolvedInitialContent =
      Object.prototype.hasOwnProperty.call(opts, "content")
        ? String(opts.content ?? "")
        : null;

    let currentReadOnly = opts.readOnly !== false;
    let resizeObserver = null;
    let mutationObserver = null;
    let visibilityTimer = null;
    let destroyed = false;

    function getValue() {
      return api.getContent ? api.getContent() : "";
    }

    function ensureResolvedContent() {
      if (
        resolvedInitialContent === null ||
        resolvedInitialContent === "" ||
        getValue() !== ""
      ) {
        return false;
      }

      if (api.setContent) {
        api.setContent(
          resolvedInitialContent,
          opts.language || "java"
        );
      }

      if (hiddenEl) {
        hiddenEl.value = resolvedInitialContent;
      }

      return true;
    }

    function setValue(value) {
      const code = value ?? "";
      if (api.setContent) api.setContent(code, opts.language || "java");
      if (hiddenEl) hiddenEl.value = code;
    }

    function notifyChange(value, cm, change) {
      const code = value ?? "";
      if (hiddenEl) {
        hiddenEl.value = code;
        hiddenEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (typeof opts.onChange === "function") opts.onChange(code, opts);
      listeners.forEach(fn => {
        try { fn(cm || api.cm, change || { origin: "smartcode" }); }
        catch (e) { console.error("[smartCodeEditor] embedded change listener:", e); }
      });
    }

    function isVisible() {
      if (destroyed || !root || !document.documentElement.contains(root)) return false;

      const style = window.getComputedStyle(root);
      const rect = root.getBoundingClientRect();

      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0;
    }

    function refreshNow() {
      if (!isVisible()) return false;

      ensureResolvedContent();

      if (api.refresh) api.refresh();
      if (api.cm?.refresh) api.cm.refresh();

      return !!api.cm;
    }

    function refreshEditor() {
      requestAnimationFrame(() => {
        if (destroyed || !refreshNow()) return;
        setTimeout(refreshNow, 60);
        setTimeout(refreshNow, 180);
      });
    }

    function waitUntilVisible() {
      clearTimeout(visibilityTimer);

      const check = () => {
        if (destroyed) return;

        if (!refreshNow()) {
          visibilityTimer = setTimeout(check, 100);
          return;
        }

        setTimeout(refreshNow, 60);
        setTimeout(refreshNow, 180);
      };

      check();
    }

    function installVisibilityObservers() {
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          if (isVisible()) refreshEditor();
        });
        resizeObserver.observe(root);
      }

      if (typeof MutationObserver !== "undefined") {
        mutationObserver = new MutationObserver(() => {
          if (isVisible()) refreshEditor();
        });

        let element = root;
        while (element && element !== document.documentElement) {
          mutationObserver.observe(element, {
            attributes: true,
            attributeFilter: ["class", "style", "hidden"]
          });
          element = element.parentElement;
        }
      }

      waitUntilVisible();
    }

    function applyReadOnly(value) {
      currentReadOnly = value === true;

      if (api.setReadOnly) api.setReadOnly(currentReadOnly);
      else if (api.cm?.setOption) api.cm.setOption("readOnly", currentReadOnly);

      root.style.backgroundColor = currentReadOnly ? "#f5f5f5" : "#FBFFFB";
      refreshEditor();
    }

    const adapter = {
      api,
      getValue() {
        return getValue();
      },
      getDoc() {
        return {
          getValue() {
            return getValue();
          },
          setValue(value) {
            setValue(value);
          }
        };
      },
      doc: {
        getValue() {
          return getValue();
        },
        setValue(value) {
          setValue(value);
        }
      },
      refresh() {
        refreshEditor();
        waitUntilVisible();
      },
      setSize(width, height) {
        if (width !== undefined && width !== null && width !== "") {
          root.style.width = normalizeCssSize(width);
        }

        if (height !== undefined && height !== null && height !== "") {
          applyEmbeddedHeight(root, height);
        }

        refreshEditor();
        waitUntilVisible();
      },
      setOption(option, value) {
        if (option === "readOnly") {
          applyReadOnly(value);
          return;
        }
        api.cm?.setOption?.(option, value);
      },
      getOption(option) {
        if (option === "readOnly") return currentReadOnly;
        return api.cm?.getOption?.(option);
      },
      setReadOnly(value) {
        applyReadOnly(value);
      },
      getWrapperElement() {
        return root;
      },
      on(eventName, callback) {
        if (eventName === "change" && typeof callback === "function") listeners.push(callback);
      },
      focus() {
        if (api.focus) api.focus();
      },
      whenReady() {
        return api.whenReady ? api.whenReady().then(() => adapter) : Promise.resolve(adapter);
      },
      destroy() {
        destroyed = true;
        clearTimeout(visibilityTimer);
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
        if (api.destroy) api.destroy();
      }
    };

    installVisibilityObservers();

    api.whenReady().then(() => {
      /*
       * Prazna začetna vrednost ne sme prepisati kode, ki jo je resolver
       * oziroma AlgatorInstance že naložil. Neprazno resolver vsebino pa
       * vedno uporabimo.
       */
      if (Object.prototype.hasOwnProperty.call(opts, "content")) {
        const incomingContent = String(opts.content ?? "");
        const currentContent = getValue();

        if (incomingContent !== "" || currentContent === "") {
          setValue(incomingContent);
        } else if (hiddenEl) {
          hiddenEl.value = currentContent;
        }
      }

      ensureResolvedContent();

      // Uporabi trenutno stanje. Edit mode ga je lahko med inicializacijo že spremenil.
      applyReadOnly(currentReadOnly);

      if (api.cm) {
        api.cm.on("change", function(cm, change) {
          if (change?.origin === "setValue") return;
          notifyChange(cm.getValue(), cm, change);
        });
      }

      waitUntilVisible();
    });

    return adapter;
  }

  function createDeferredEmbeddedAdapter(root, hiddenEl, opts) {
    let activeAdapter = null;
    let destroyed = false;
    let pendingValue;
    let pendingReadOnly = opts.readOnly !== false;
    const listeners = [];
    let resolveReady;
    const readyPromise = new Promise(resolve => { resolveReady = resolve; });

    const adapter = {
      api: null,
      error: null,
      getValue() {
        if (activeAdapter) return activeAdapter.getValue();
        if (pendingValue !== undefined) return pendingValue;
        return hiddenEl ? hiddenEl.value : "";
      },
      getDoc() {
        return adapter.doc;
      },
      doc: {
        getValue() {
          return adapter.getValue();
        },
        setValue(value) {
          const code = value || "";
          pendingValue = code;
          if (hiddenEl) hiddenEl.value = code;
          if (activeAdapter) activeAdapter.doc.setValue(code);
        }
      },
      refresh() {
        activeAdapter?.refresh?.();
      },
      setSize(width, height) {
        if (width !== undefined && width !== null && width !== "") {
          root.style.width = normalizeCssSize(width);
        }

        if (height !== undefined && height !== null && height !== "") {
          applyEmbeddedHeight(root, height);
        }

        activeAdapter?.setSize?.(width, height);
      },
      setOption(option, value) {
        if (option === "readOnly") pendingReadOnly = !!value;
        activeAdapter?.setOption?.(option, value);
      },
      getWrapperElement() {
        return root;
      },
      on(eventName, callback) {
        if (eventName !== "change" || typeof callback !== "function") return;
        listeners.push(callback);
        activeAdapter?.on?.(eventName, callback);
      },
      focus() {
        activeAdapter?.focus?.();
      },
      whenReady() {
        return readyPromise;
      },
      destroy() {
        destroyed = true;
        activeAdapter?.destroy?.();
      },
      _attach(realAdapter) {
        if (destroyed) {
          realAdapter?.destroy?.();
          return;
        }
        activeAdapter = realAdapter;
        adapter.api = realAdapter.api || null;
        listeners.forEach(listener => activeAdapter.on("change", listener));
        activeAdapter.setOption("readOnly", pendingReadOnly);

        if (pendingValue !== undefined) {
          const loadedContent = activeAdapter.getValue();

          if (pendingValue !== "" || loadedContent === "") {
            activeAdapter.doc.setValue(pendingValue);
          }
        }

        activeAdapter.whenReady().then(() => {
          activeAdapter.refresh?.();
          resolveReady(adapter);
        });
      },
      _fail(error) {
        adapter.error = error;
        root.innerHTML = "";
        const errorElement = document.createElement("div");
        errorElement.className = "smartcode-embedded-error";
        errorElement.textContent = String(error?.message || error);
        root.appendChild(errorElement);
        resolveReady(adapter);
      }
    };

    return adapter;
  }

  function initEmbeddedEditor(divIdOrOptions, options = {}) {
    const opts = typeof divIdOrOptions === "object" && divIdOrOptions !== null
      ? { ...divIdOrOptions }
      : { ...options, divId: divIdOrOptions };

    const divId = opts.divId || opts.cmDiv || opts.containerId;
    const root = document.getElementById(divId);
    const hiddenEl = opts.hiddenDiv ? document.getElementById(opts.hiddenDiv) : null;

    if (!root) {
      console.error(`[smartCodeEditor] element #${divId} ne obstaja`);
      return null;
    }

    root.innerHTML = "";
    root.classList.remove("CodeMirror");
    root.classList.add("smartcode-embedded-root");
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.overflow = "hidden";

    applyEmbeddedHeight(
      root,
      opts.height,
      root.style.height || "650px"
    );

    const deferred = createDeferredEmbeddedAdapter(root, hiddenEl, opts);

    resolveEmbeddedSource(opts)
      .then(resolved => {
        const api = new EditorAPI(
          divId,
          false,
          false,
          resolved.showDiagnostics !== false,
          editorMode.SINGLE,
          resolved
        );
        const realAdapter = createEmbeddedAdapter(api, root, hiddenEl, resolved);
        deferred._attach(realAdapter);
      })
      .catch(error => {
        console.error("[smartCodeEditor] embedded initialization failed:", error);
        deferred._fail(error);
      });

    return deferred;
  }

  return {
    editorMode,

    // Vrne seznam projektov iz ciljne mape za sinhronizacijo
    async getProjects() {
      try {
        const url = getServerHttpUrl() + "/projects";
        const res = await fetch(url);
        if (!res.ok) return [];
        const { projects } = await res.json();
        return projects;
      } catch {
        return [];
      }
    },

    initEmbeddedEditor,

    initEditor(
      divId,
      showToolbar     = true,
      showTabStatusbar = true,
      showDiagnostics = true,
      mode            = editorMode.PROJECT,
      options         = {}
    ) {
      return new EditorAPI(divId, showToolbar, showTabStatusbar, showDiagnostics, mode, options);
    }
  };

})();