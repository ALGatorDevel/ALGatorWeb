function createLspClient() {
  let socket    = null;
  let connected = false;
  let nextId    = 1;
  const pending   = new Map();
  const listeners = { open: [], close: [], error: [], diagnostics: [], notification: [] };

function sendMessage(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(message));
  return true;
}

function javaClientSettings() {
  return {
    java: {
      completion: {
        enabled: true,
        guessMethodArguments: true
      },
      signatureHelp: {
        enabled: true
      }
    }
  };
}

function configurationValue(section) {
  const settings = javaClientSettings();
  if (!section) return settings;

  let value = settings;
  for (const part of String(section).split(".")) {
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.prototype.hasOwnProperty.call(value, part)
    ) {
      return null;
    }
    value = value[part];
  }

  return value;
}

function answerServerRequest(msg) {
  let result = null;

  switch (msg.method) {
    case "workspace/configuration": {
      const items = Array.isArray(msg.params?.items)
        ? msg.params.items
        : [];

      result = items.map(item =>
        configurationValue(item?.section)
      );
      break;
    }

    case "workspace/workspaceFolders": {
      const rootUri =
        typeof SmartCodeConfig !== "undefined"
          ? SmartCodeConfig.workspace?.rootUri
          : null;

      result = rootUri
        ? [{ uri: rootUri, name: "workspace" }]
        : null;
      break;
    }

    case "workspace/applyEdit":
      result = {
        applied: false,
        failureReason: "Client-side workspace edits are not supported."
      };
      break;

    case "client/registerCapability":
    case "client/unregisterCapability":
    case "window/workDoneProgress/create":
    case "window/showMessageRequest":
      result = null;
      break;

    default:
      result = null;
      break;
  }

  sendMessage({
    jsonrpc: "2.0",
    id: msg.id,
    result
  });
}

function emit(type, payload) {
   for (const cb of listeners[type]) {
      try { cb(payload); } catch (e) { console.error("LSP listener error:", e); }
   }
}

function connect(url) {
  try {
     socket = new WebSocket(url);

     socket.onopen = () => {
        connected = true;
        emit("open");
      };

      socket.onclose = () => {
        connected = false;
        for (const [, p] of pending) p.reject(new Error("LSP disconnected"));
        pending.clear();
        emit("close");
      };

      socket.onerror = err => emit("error", err);

      socket.onmessage = event => {
        let msg;
        try { msg = JSON.parse(event.data); }
        catch (e) { console.error("Bad LSP JSON:", e); return; }

        /*
         * LSP strežnik lahko tudi sam pošlje request z id-jem
         * (npr. client/registerCapability in workspace/configuration).
         * Tak request ni odgovor na naš pending request in mu moramo
         * odgovoriti, sicer JDTLS obstane v delno inicializiranem stanju.
         */
        if (typeof msg.id !== "undefined" && msg.method) {
          answerServerRequest(msg);
          return;
        }

        if (typeof msg.id !== "undefined") {
          const p = pending.get(msg.id);
          if (p) {
            pending.delete(msg.id);
            msg.error ? p.reject(new Error(msg.error.message || "LSP error"))
                      : p.resolve(msg.result);
          }
          return;
        }

        if (msg.method === "textDocument/publishDiagnostics") {
          emit("diagnostics", msg.params);
          return;
        }

        emit("notification", msg);
      };
    } catch (e) {
      console.error("LSP connect failed:", e);
    }
  }

function sendRequest(method, params) {
    if (!isReady()) return Promise.reject(new Error("LSP not connected"));
    const id = nextId++;
    sendMessage({ jsonrpc: "2.0", id, method, params });
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  function sendNotification(method, params) {
    if (!isReady()) return;
    sendMessage({ jsonrpc: "2.0", method, params });
  }

  function isReady() {
    return connected && socket && socket.readyState === WebSocket.OPEN;
  }

  function on(type, cb) {
    if (listeners[type]) listeners[type].push(cb);
  }

  return { connect, sendRequest, sendNotification, isReady, on };
}


const clangdClient = createLspClient();

function connectLsp(url)                  { clangdClient.connect(url); }
function sendLspRequest(method, params)   { return clangdClient.sendRequest(method, params); }
function sendLspNotification(method, p)   { clangdClient.sendNotification(method, p); }
function isLspReady()                     { return clangdClient.isReady(); }
function onLspOpen(cb)                    { clangdClient.on("open", cb); }
function onLspClose(cb)                   { clangdClient.on("close", cb); }
function onLspError(cb)                   { clangdClient.on("error", cb); }
function onLspDiagnostics(cb)             { clangdClient.on("diagnostics", cb); }
function onLspNotification(cb)            { clangdClient.on("notification", cb); }


const javaClient = createLspClient();

function connectJavaLsp(url)              {  if (javaClient && javaClient.isReady()) return; javaClient.connect(url); }
function sendJavaRequest(method, params)  { return javaClient.sendRequest(method, params); }
function sendJavaNotification(method, p)  { javaClient.sendNotification(method, p); }
function isJavaLspReady()                 { return javaClient.isReady(); }
function onJavaLspOpen(cb)                { javaClient.on("open", cb); }
function onJavaLspClose(cb)               { javaClient.on("close", cb); }
function onJavaLspError(cb)               { javaClient.on("error", cb); }
function onJavaLspDiagnostics(cb)         { javaClient.on("diagnostics", cb); }
function onJavaLspNotification(cb)        { javaClient.on("notification", cb); }
  