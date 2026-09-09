const localSetup = true;                    // true for testing, false for server installation
const lspServer  = "algator.fri.uni-lj.si"; // used only if localSetup==false

const host       = localSetup ? "localhost:3000" : `${lspServer}/lsp`;
const secure     = localSetup ? "" : "s";

const SmartCodeConfig = {
  server: {
    httpUrl:  `http${secure}://${host}`,
    wsClangd: `ws${secure}://${host}/`,
    wsJava:   `ws${secure}://${host}/java`
  },

  workspace: {
    rootUri: "file:///algator_lsync_root"
  },

  workspace: {
    rootUri: "file:///algator_lsync_root"
  },

  editor: {
    autosaveDelay:   700,
    completionDelay: 60,
    identifierDelay: 80,
    javaInitDelay:   1200,
    javaRetryDelay:  2000,
    memberMaxItems:  40,
    javaMemberMax:   60,
    identifierMax:   50
  }
};

Object.freeze(SmartCodeConfig.server);
Object.freeze(SmartCodeConfig.workspace);
Object.freeze(SmartCodeConfig.editor);
Object.freeze(SmartCodeConfig);
