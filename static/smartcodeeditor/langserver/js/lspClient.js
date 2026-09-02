function createLspClient(workspaceProvider = null) {
  let socket    = null;
  let socketUrl = "";
  let socketGeneration = 0;
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
      const configuredWorkspace = typeof workspaceProvider === "function"
        ? workspaceProvider()
        : null;
      const rootUri = configuredWorkspace?.uri || (
        typeof SmartCodeConfig !== "undefined"
          ? SmartCodeConfig.workspace?.rootUri
          : null
      );

      result = rootUri
        ? [{ uri: rootUri, name: configuredWorkspace?.name || "workspace" }]
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

function connect(url, forceReconnect = false) {
  const targetUrl = String(url || "");

  if (
    !forceReconnect &&
    socket &&
    socketUrl === targetUrl &&
    (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)
  ) {
    return false;
  }

  try {
     const previousSocket = socket;
     const generation = ++socketGeneration;
     const nextSocket = new WebSocket(targetUrl);

     socket = nextSocket;
     socketUrl = targetUrl;
     connected = false;

     for (const [, request] of pending) {
       request.reject(new Error("LSP context changed"));
     }
     pending.clear();

     if (
       previousSocket &&
       (previousSocket.readyState === WebSocket.CONNECTING || previousSocket.readyState === WebSocket.OPEN)
     ) {
       previousSocket.close(1000, "LSP context changed");
     }

     nextSocket.onopen = () => {
        if (generation !== socketGeneration || socket !== nextSocket) {
          nextSocket.close(1000, "Superseded LSP connection");
          return;
        }
        connected = true;
        emit("open");
      };

      nextSocket.onclose = () => {
        if (generation !== socketGeneration || socket !== nextSocket) return;
        connected = false;
        for (const [, p] of pending) p.reject(new Error("LSP disconnected"));
        pending.clear();
        emit("close");
      };

      nextSocket.onerror = err => {
        if (generation === socketGeneration && socket === nextSocket) emit("error", err);
      };

      nextSocket.onmessage = event => {
        if (generation !== socketGeneration || socket !== nextSocket) return;
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
      return true;
    } catch (e) {
      console.error("LSP connect failed:", e);
      return false;
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
    if (!listeners[type]) return () => {};
    listeners[type].push(cb);
    return () => {
      const index = listeners[type].indexOf(cb);
      if (index >= 0) listeners[type].splice(index, 1);
    };
  }

  return { connect, sendRequest, sendNotification, isReady, on };
}


const clangdClient = createLspClient();

function connectLsp(url)                  { clangdClient.connect(url); }
function sendLspRequest(method, params)   { return clangdClient.sendRequest(method, params); }
function sendLspNotification(method, p)   { clangdClient.sendNotification(method, p); }
function isLspReady()                     { return clangdClient.isReady(); }
function onLspOpen(cb)                    { return clangdClient.on("open", cb); }
function onLspClose(cb)                   { return clangdClient.on("close", cb); }
function onLspError(cb)                   { return clangdClient.on("error", cb); }
function onLspDiagnostics(cb)             { return clangdClient.on("diagnostics", cb); }
function onLspNotification(cb)            { return clangdClient.on("notification", cb); }


let javaLspWorkspace = null;
const javaClient = createLspClient(() => javaLspWorkspace);

function connectJavaLsp(url)              { return javaClient.connect(url); }
function reconnectJavaLsp(url)           { return javaClient.connect(url, true); }
function setJavaLspWorkspace(uri, name)    { javaLspWorkspace = uri ? { uri, name: name || "workspace" } : null; }
function sendJavaRequest(method, params)  { return javaClient.sendRequest(method, params); }
function sendJavaNotification(method, p)  { javaClient.sendNotification(method, p); }
function isJavaLspReady()                 { return javaClient.isReady(); }
function onJavaLspOpen(cb)                { return javaClient.on("open", cb); }
function onJavaLspClose(cb)               { return javaClient.on("close", cb); }
function onJavaLspError(cb)               { return javaClient.on("error", cb); }
function onJavaLspDiagnostics(cb)         { return javaClient.on("diagnostics", cb); }
function onJavaLspNotification(cb)        { return javaClient.on("notification", cb); }
  
