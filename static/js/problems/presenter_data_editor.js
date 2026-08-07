        const BOXES = {//                    width&height  edit width&height (note: edit size should be
                       //                                                      at least as big as normal
                       //                                                      size in each dimension!)
            'Q':  { desc:'Query',            icon:'fas fa-database',   w:550, h:300, ew: 800, eh: 580, color: "#3d7daa" },
            'S':  { desc:'Aggregate',        icon:'fas fa-calculator', w:330, h:160, ew: 550, eh: 440, color: "#3a8a5c" },
            'GF': { desc:'Filter & GroupBy', icon:'fas fa-filter',     w:550, h:300, ew: 720, eh: 720, color: "#a07820" },
            'T':  { desc:'Table',            icon:'fas fa-table',      w:550, h:300, ew: 820, eh: 640, color: "#715a8e" },
            'C':  { desc:'Reduce',            icon:'fas fa-compress-alt', w:550, h:300, ew: 700, eh: 680, color: "#a84540" },
            'V':  { desc:'Values',            icon:'fas fa-list-ol',      w:280, h:200, ew: 660, eh: 520, color: "#2a7f7f" },
        };

        const AGGREGATE_FUNCTIONS = ['SUM', 'MIN', 'MAX', 'AVG', 'MED', 'FIRST', 'LAST'];

        // ── GF helpers ──────────────────────────────────────────────
        const GF_FUNCS = ['MIN', 'MAX', 'AVG', 'SUM', 'FIRST', 'LAST', 'CAT'];
        const GF_OPS   = ['==', '!=', '<', '<=', '>', '>='];

        function gfQuoteValue(val) {
            const s = String(val ?? '');
            if (s === '') return "''";
            if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) return s;
            if (!isNaN(parseFloat(s)) && isFinite(Number(s))) return s;
            return `'${s}'`;
        }

        function buildGfOpStrings(ops) {
            const strs = [];
            for (const op of (ops || [])) {
                if (op.type === 'filter') {
                    if (!op.clauses || op.clauses.length === 0) continue;
                    let expr = '';
                    op.clauses.forEach((c, i) => {
                        if (i > 0) expr += ` ${c.bool || '&&'} `;
                        expr += `(${c.col} ${c.op} ${gfQuoteValue(c.val)})`;
                    });
                    if (expr) strs.push(`filter:${expr}`);
                } else if (op.type === 'groupby') {
                    if (!op.field) continue;
                    let s = `groupby:${op.field}`;
                    for (const a of (op.addons || [])) {
                        if (!a.pattern || !a.func) continue;
                        let part = `${a.pattern}:${a.func}`;
                        if (a.hasCond && a.condCol && a.condOp && (a.condVal ?? '') !== '')
                            part += `@(${a.condCol}${a.condOp}${gfQuoteValue(a.condVal)})`;
                        s += `; ${part}`;
                    }
                    strs.push(s);
                }
            }
            return strs;
        }

        function aggregateColumn(data, column, func, decimals = 2) {
            if (!data || data.length < 2) return null;
            const headers = data[0];
            const colIdx = headers.indexOf(column);
            if (colIdx === -1) return null;
            const values = data.slice(1).map(row => row[colIdx]).filter(v => v !== null && v !== undefined && v !== '');
            if (values.length === 0) return null;
            if (func === 'FIRST') return values[0];
            if (func === 'LAST')  return values[values.length - 1];
            const nums = values.map(Number).filter(v => !isNaN(v));
            if (nums.length === 0) return null;
            const round = v => parseFloat(v.toFixed(decimals));
            switch (func) {
                case 'SUM': return round(nums.reduce((a, b) => a + b, 0));
                case 'MIN': return round(Math.min(...nums));
                case 'MAX': return round(Math.max(...nums));
                case 'AVG': return round(nums.reduce((a, b) => a + b, 0) / nums.length);
                case 'MED': {
                    const sorted = [...nums].sort((a, b) => a - b);
                    const mid = Math.floor(sorted.length / 2);
                    return round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
                }
                default: return null;
            }
        }

        function insertAtCursor(input, text) {
            const start = input.selectionStart ?? input.value.length;
            const end   = input.selectionEnd   ?? input.value.length;
            input.value = input.value.slice(0, start) + text + input.value.slice(end);
            input.selectionStart = input.selectionEnd = start + text.length;
            input.dispatchEvent(new Event('input'));
            input.focus();
        }

        const ARRAY_PREVIEW_K = 3;  // Show k x k preview of    array data
        const H_LEN = 4;  // Header truncation: show H_LEN chars from start and end

        // ── V box formula evaluator ──────────────────────────────────────────
        // Uses the shared resolveRef() from algatorData.js for all data access.

        function vAggApply(func, values) {
            // values: array of already-numeric values (output of vFlattenToNums).
            if (values.length === 0) return 0;
            const f = func.toUpperCase();
            if (f === 'COUNT') return values.length;
            if (f === 'FIRST') return values[0];
            if (f === 'LAST')  return values[values.length - 1];
            const nums = values.filter(v => !isNaN(v));
            if (nums.length === 0) return 0;
            switch (f) {
                case 'SUM':  return nums.reduce((a, b) => a + b, 0);
                case 'MIN':  return Math.min(...nums);
                case 'MAX':  return Math.max(...nums);
                case 'AVG':  return nums.reduce((a, b) => a + b, 0) / nums.length;
                case 'MED': {
                    const s = [...nums].sort((a, b) => a - b);
                    const mid = Math.floor(s.length / 2);
                    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
                }
                default: return 0;
            }
        }

        function vFlattenToNums(resolved) {
            // Flatten any resolveRef result (scalar / 1-D / 2-D) into an array of numbers.
            if (resolved === null || resolved === undefined) return [];
            const flat = [];
            (function walk(v) {
                if (Array.isArray(v)) v.forEach(walk);
                else { const n = Number(v); if (!isNaN(n)) flat.push(n); }
            })(resolved);
            return flat;
        }

        function vScalarFromRow(row, headers) {
            // Convert a 1-D row array to a scalar for use in arithmetic.
            // Prefers the 'value' column (V-box convention); falls back to last numeric.
            if (!Array.isArray(row)) return Number(row) || 0;
            const valIdx = headers ? headers.indexOf('value') : -1;
            if (valIdx >= 0 && valIdx < row.length) return Number(row[valIdx]) || 0;
            for (let ci = row.length - 1; ci >= 0; ci--) {
                const n = Number(row[ci]);
                if (!isNaN(n)) return n;
            }
            return 0;
        }

        function vEvaluateFormula(formula, entryResults, allBoxes) {
            // entryResults : already-evaluated scalar values for this V box (0-based).
            // allBoxes     : all PDE boxes (any name, not just data_x).
            let expr = (formula || '').trim();
            if (!expr) return 0;

            // A fake activePde so we can call the shared resolveRef().
            const fakePde = { boxes: allBoxes };

            // Box-name alternation: longest names first to avoid partial matches.
            const BOX = allBoxes.length
                ? '(?:' + allBoxes.map(b => b.name)
                    .sort((a, b) => b.length - a.length)
                    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                    .join('|') + ')'
                : '(?:__no_box__)';

            const FUNCS = 'SUM|MIN|MAX|AVG|COUNT|FIRST|LAST|MED';

            // ── step 1: standalone #n → within-box entry value (1-based) ────────
            // Negative lookbehind (?<!\[) prevents matching #n inside [#n] selectors,
            // which are passed through to resolveRef for V-box entry-value lookup.
            expr = expr.replace(/(?<!\[)#(\d+)/g, (_, n) => {
                const idx = parseInt(n) - 1;
                if (idx < 0 || idx >= entryResults.length) return '0';
                const v = entryResults[idx];
                return String(v !== undefined && v !== null ? v : 0);
            });

            // ── step 2: FUNC(refExpr) → scalar ───────────────────────────────────
            // Handles new form FUNC(box["col"]) and deprecated form FUNC(box, 'col').
            const re_func = new RegExp(`(${FUNCS})\\s*\\(([^()]*)\\)`, 'gi');
            expr = expr.replace(re_func, (_, func, arg) => {
                arg = arg.trim();
                // Deprecated: FUNC(boxName, 'col') or FUNC(boxName, "col")
                const deprM = arg.match(new RegExp(`^(${BOX})\\s*,\\s*['"]([^'"]+)['"]$`));
                if (deprM) arg = `${deprM[1]}["${deprM[2]}"]`;

                const resolved = resolveRef(arg, fakePde);
                if (resolved === null) return '0';
                return String(vAggApply(func, vFlattenToNums(resolved)));
            });

            // ── step 3: box[...] references → scalar ─────────────────────────────
            // Matches boxName followed by one or more bracket groups.
            const re_ref = new RegExp(`\\b(${BOX})((?:\\[[^\\]]*\\])+)`, 'g');
            expr = expr.replace(re_ref, (match, boxName, selStr) => {
                const resolved = resolveRef(boxName + selStr, fakePde);
                if (resolved === null) return '0';
                if (!Array.isArray(resolved)) return String(Number(resolved) || 0);
                // 1-D result: could be a row (box[n]) or a column (box["col"]).
                // For arithmetic use extract a scalar; for multi-value data use FUNC().
                if (!Array.isArray(resolved[0])) {
                    const bx    = allBoxes.find(b => b.name === boxName);
                    const hdrs  = (bx && Array.isArray(bx.data) && Array.isArray(bx.data[0]))
                                  ? bx.data[0] : null;
                    return String(vScalarFromRow(resolved, hdrs));
                }
                // 2-D result (wildcard): not meaningful in scalar arithmetic → row count
                return String(Math.max(0, resolved.length - 1));
            });

            // ── step 4: bare box → scalar ─────────────────────────────────────────
            const re_bare = new RegExp(`\\b(${BOX})\\b`, 'g');
            expr = expr.replace(re_bare, (_, boxName) => {
                const bx = allBoxes.find(b => b.name === boxName);
                if (!bx) return '0';
                if (!Array.isArray(bx.data)) return String(Number(bx.data) || 0);
                return String(Math.max(0, bx.data.length - 1));
            });

            // ── step 5: evaluate arithmetic ───────────────────────────────────────
            try {
                // eslint-disable-next-line no-new-func
                const result = new Function('return (' + expr + ')')();
                if (typeof result === 'number' && isFinite(result))
                    return parseFloat(result.toFixed(6));
                return result;
            } catch (e) {
                return 'ERR';
            }
        }
        // ── end V box formula evaluator ──────────────────────────────────────

        function createPde(name) {
            const instance = {
                name,
                boxes: [], boxCounter: 0, editingId: null, pendingRemoveId: null, pendingRemoveIds: null, pendingRenameId: null,
                zoom: 1.0,
                canvas: null, svg: null,

                truncateHeader(header) {
                    const headerStr = String(header);
                    const maxChars = 2 * H_LEN + 1;
                    if (headerStr.length > maxChars) {
                        const availableChars = maxChars - 1;
                        const startChars = Math.ceil(availableChars / 2);
                        const endChars = Math.floor(availableChars / 2);
                        return headerStr.substring(0, startChars) + '…' + headerStr.substring(headerStr.length - endChars);
                    }
                    return headerStr;
                },

                clearState() {
                    this.boxes = []; this.boxCounter = 0;
                    this.canvas.querySelectorAll('.pde_box-card').forEach(c => c.remove());
                    this.drawArrows();
                },

                loadJSON(jsonInput) {
                    try {
                        const parsed = (typeof jsonInput === 'string') ? JSON.parse(jsonInput) : jsonInput;
                        // support both old format (bare array) and new format ({boxes, zoom, ...})
                        const data = Array.isArray(parsed) ? parsed : (parsed.boxes ?? []);
                        this.clearState();
                        this.boxes = data;
                        let maxIdx = 0;
                        this.boxes.forEach(box => {
                            const idx = parseInt(box.name.replace('data_', '')) || 0;
                            if (idx > maxIdx) maxIdx = idx;
                        });
                        this.boxCounter = maxIdx;
                        // migrate old single-parent format to parents array; clear isNew flag
                        this.boxes.forEach(box => {
                            if (!Array.isArray(box.parents))
                                box.parents = box.parent ? [box.parent] : [];
                            box.isNew = false;
                        });
                        // sanitise geometry — guard against corrupted saved state
                        this.boxes.forEach(box => {
                            if (!(box.x >= 0)) box.x = 10;
                            if (!(box.y >= 0)) box.y = 10;
                            if (!(box.w >= 10)) box.w = BOXES[box.type]?.w ?? 50;
                            if (!(box.h >= 10)) box.h = BOXES[box.type]?.h ?? 100;
                        });
                        this.boxes.forEach(box => this.renderBox(box, box.isEditing));
                        this.drawArrows();
                    } catch (e) { alert("Load Error: " + e.message); }
                },

                async init(pdeJSON = null, progressCallback = null) {
                    this.canvas = document.getElementById(name + '_diagram_canvas');
                    this.svg = document.getElementById(name + '_svg_connections');

                    // start view autosave: save every 5s if zoom or scroll changed
                    this._viewDirty = false;
                    const scrollEl = document.getElementById(name + '_scroll');
                    if (scrollEl) scrollEl.addEventListener('scroll', () => { this._viewDirty = true; });
                    if (scrollEl) {
                        // trackpad pinch: browser sends wheel + ctrlKey
                        scrollEl.addEventListener('wheel', e => {
                            if (!e.ctrlKey) return;
                            e.preventDefault();
                            const rect   = scrollEl.getBoundingClientRect();
                            const focal  = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                            const delta  = e.deltaY ?? e.deltaX ?? 0;
                            const factor = delta > 0 ? 0.95 : 1.05;
                            this.setZoom(this.zoom * factor, focal);
                        }, { passive: false });
                        // touchscreen pinch
                        scrollEl.addEventListener('touchstart',  e => this._onPinchStart(e),  { passive: false });
                        scrollEl.addEventListener('touchmove',   e => this._onPinchMove(e),   { passive: false });
                        scrollEl.addEventListener('touchend',    e => this._onPinchEnd(e),    { passive: false });
                        scrollEl.addEventListener('touchcancel', e => this._onPinchEnd(e),    { passive: false });
                    }
                    if (this._autosaveInterval) clearInterval(this._autosaveInterval);
                    this._autosaveInterval = setInterval(() => {
                        if (this._viewDirty) {
                            this._viewDirty = false;
                            this.savePdeState(projectName);
                        }
                    }, 5000);

                    if (pdeJSON) {
                        const state      = (typeof pdeJSON === 'string') ? JSON.parse(pdeJSON) : pdeJSON;
                        const boxesArray = Array.isArray(state) ? state : (state.boxes || []);
                        this.loadJSON(boxesArray);
                        if (!Array.isArray(state)) {
                            this.setZoom(state.zoom ?? 1);
                            // panel may still be hidden — store for restoreScroll() call once visible
                            this._pendingScrollLeft = state.scrollLeft ?? 0;
                            this._pendingScrollTop  = state.scrollTop  ?? 0;
                        }
                        await this.preloadQBoxes(progressCallback);
                    } else {
                        this.clearState();
                        this._pendingFreshStart = true;
                    }
                },

                restoreScroll() {
                    if (this._pendingScrollLeft === undefined) return;
                    const scroll = document.getElementById(name + '_scroll');
                    if (scroll) {
                        scroll.scrollLeft = this._pendingScrollLeft;
                        scroll.scrollTop  = this._pendingScrollTop;
                    }
                    this._pendingScrollLeft = undefined;
                    this._pendingScrollTop  = undefined;
                },

                _pinchDist(e) {
                    const t = e.touches;
                    return Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
                },

                _onPinchStart(e) {
                    if (e.touches.length !== 2) return;
                    e.preventDefault();
                    this._pinchStartDist = this._pinchDist(e);
                    this._pinchStartZoom = this.zoom;
                    const scroll = document.getElementById(name + '_scroll');
                    const rect   = scroll ? scroll.getBoundingClientRect() : { left: 0, top: 0 };
                    const t = e.touches;
                    this._pinchFocal = {
                        x: (t[0].clientX + t[1].clientX) / 2 - rect.left,
                        y: (t[0].clientY + t[1].clientY) / 2 - rect.top,
                    };
                },

                _onPinchMove(e) {
                    if (e.touches.length !== 2) return;
                    e.preventDefault();
                    if (this._pinchStartDist === null) return;
                    const ratio   = this._pinchDist(e) / this._pinchStartDist;
                    const newZoom = Math.max(0.1, Math.min(2.0, this._pinchStartZoom * ratio));
                    this.setZoom(newZoom, this._pinchFocal);
                },

                _onPinchEnd(e) {
                    this._pinchStartDist = null;
                    this._pinchStartZoom = null;
                },

                setZoom(z, focal) {
                    const oldZoom = this.zoom;
                    this.zoom = Math.min(2.0, Math.max(0.1, z));
                    this.canvas.style.transform = `scale(${this.zoom})`;
                    this.canvas.style.transformOrigin = 'top left';
                    // CSS transform does not affect layout size — expand margins so the
                    // scroll container tracks the full scaled size; must happen before
                    // adjusting scrollLeft/scrollTop so the browser accepts the new values.
                    this.canvas.style.marginRight  = Math.max(0, this.canvas.offsetWidth  * (this.zoom - 1)) + 'px';
                    this.canvas.style.marginBottom = Math.max(0, this.canvas.offsetHeight * (this.zoom - 1)) + 'px';
                    const pct = Math.round(this.zoom * 100);
                    // Update the zoom-toggle button label and highlight active menu item
                    const label = document.getElementById(name + '_zoom_label');
                    if (label) {
                        const span = label.querySelector('span');
                        if (span) span.textContent = pct + '%';
                    }
                    const menu = document.getElementById(name + '_zoom_menu');
                    if (menu) menu.querySelectorAll('button').forEach(b => {
                        b.classList.toggle('pde_zoom-active', parseInt(b.dataset.pct) === pct);
                    });
                    // keep the canvas point under focal stationary
                    if (focal) {
                        const scroll = document.getElementById(name + '_scroll');
                        if (scroll) {
                            const canvasX = (scroll.scrollLeft + focal.x) / oldZoom;
                            const canvasY = (scroll.scrollTop  + focal.y) / oldZoom;
                            scroll.scrollLeft = canvasX * this.zoom - focal.x;
                            scroll.scrollTop  = canvasY * this.zoom - focal.y;
                        }
                    }
                    this._viewDirty = true;
                },

                toggleZoomMenu(btnEl) {
                    const menu = document.getElementById(name + '_zoom_menu');
                    if (!menu) return;
                    if (menu.style.display !== 'none') { menu.style.display = 'none'; return; }

                    // Build menu entries on first open (or rebuild each time to stay fresh)
                    menu.innerHTML = '';
                    const levels = [10,15,20,25,30,40,50,60,70,80,90,100,110,120,130,150,175,200];
                    const currentPct = Math.round(this.zoom * 100);
                    levels.forEach(pct => {
                        const btn = document.createElement('button');
                        btn.textContent = pct + '%';
                        btn.dataset.pct = pct;
                        if (pct === currentPct) btn.classList.add('pde_zoom-active');
                        btn.addEventListener('mousedown', e => {
                            e.preventDefault();
                            menu.style.display = 'none';
                            this.setZoom(pct / 100);
                        });
                        menu.appendChild(btn);
                    });

                    menu.style.display = 'block';
                    // Close on any outside click
                    const close = e => {
                        if (!menu.contains(e.target) && e.target !== btnEl) {
                            menu.style.display = 'none';
                            document.removeEventListener('mousedown', close, true);
                        }
                    };
                    document.addEventListener('mousedown', close, true);
                },

                getStateAsJSON() {
                    const clean = this.boxes.map(({ data, jsonClone, _keyHandler, ...rest }) => rest);
                    const scroll = document.getElementById(name + '_scroll');
                    return JSON.stringify({
                        boxes:      clean,
                        zoom:       this.zoom,
                        scrollLeft: scroll ? scroll.scrollLeft : 0,
                        scrollTop:  scroll ? scroll.scrollTop  : 0,
                    });
                },

                savePdeState(projectName) {
                    const stateJSON = this.getStateAsJSON();
                    $.post('/projects/save_pde_state', {
                        csrfmiddlewaretoken: window.CSRF_TOKEN,
                        ProjectName: projectName,
                        pde_state: stateJSON,
                    });
                },

                removeBox(id) {
                    this.pendingRemoveId = id;

                    // Fixed-point: a box is removed only if ALL its parents will be removed.
                    const toRemove = [id];
                    let changed = true;
                    while (changed) {
                        changed = false;
                        this.boxes.forEach(b => {
                            if (toRemove.includes(b.id)) return;
                            if (b.parents && b.parents.length > 0 && b.parents.every(p => toRemove.includes(p))) {
                                toRemove.push(b.id);
                                changed = true;
                            }
                        });
                    }
                    this.pendingRemoveIds = toRemove;

                    // Build message
                    const names = toRemove.map(rid => this.boxes.find(b => b.id === rid)?.name).filter(Boolean);
                    const msgEl = document.getElementById(name + '_confirm_message');
                    if (msgEl) {
                        if (names.length === 1) {
                            msgEl.innerHTML = `Remove <strong>${names[0]}</strong>?`;
                        } else {
                            const rest = names.slice(1).map(n => `<em>${n}</em>`).join(', ');
                            msgEl.innerHTML = `Remove <strong>${names[0]}</strong>?<br>
                                The following boxes depend solely on it and will also be removed: ${rest}.`;
                        }
                    }
                    document.getElementById(name + '_confirm_modal').style.display = 'flex';
                },

                renameBox(id) {
                    const box = this.boxes.find(b => b.id === id);
                    if (!box) return;
                    this.pendingRenameId = id;
                    const modal = document.getElementById(name + '_rename_modal');
                    const input = document.getElementById(name + '_rename_input');
                    input.value = box.name;
                    input.focus();
                    input.select();
                    modal.style.display = 'flex';
                },

                showAlert(message) {
                    const msgEl = document.getElementById(name + '_alert_message');
                    if (msgEl) msgEl.textContent = message;
                    document.getElementById(name + '_alert_modal').style.display = 'flex';
                },

                confirmRename() {
                    const input = document.getElementById(name + '_rename_input');
                    const newName = input.value.trim();
                    if (!newName) { this.showAlert('Box name cannot be empty.'); return; }
                    const id = this.pendingRenameId;
                    const box = this.boxes.find(b => b.id === id);
                    if (!box) return;

                    // 1. Reject duplicate names
                    if (this.boxes.some(b => b.id !== id && b.name === newName)) {
                        this.showAlert(`Name "${newName}" is already used by another box.`);
                        return;
                    }

                    const oldName = box.name;
                    box.name = newName;

                    const el = document.getElementById(id);
                    if (el) {
                        const nameSpan = el.querySelector('.pde_header-title span');
                        if (nameSpan) nameSpan.textContent = box.name;
                    }

                    // 2. Update formula references in all T boxes
                    // Match oldName only when not followed by another word character
                    // (so "data_1" doesn't match inside "data_10")
                    const safeOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(safeOld + '(?=[^a-zA-Z0-9_]|$)', 'g');
                    this.boxes.forEach(b => {
                        if (b.type === 'T' && Array.isArray(b.json.Columns)) {
                            b.json.Columns.forEach(col => {
                                if (col.type === 'formula' && col.expr)
                                    col.expr = col.expr.replace(regex, newName);
                            });
                        }
                    });

                    // 3. Update $type{oldName...} references in all TextboxView htmltext.
                    // Use Object.keys() rather than layout.flat() to avoid null-entry crashes.
                    // Use a function replacement to avoid $1+digit being mis-parsed as $1n.
                    const tbRegex = new RegExp('(\\$\\w+\\{)' + safeOld + '(?=\\W|$)', 'g');
                    if (typeof pp !== 'undefined' && pp.presenterJSONs) {
                        pp.presenterJSONs.forEach((presJSON, presName) => {
                            let changed = false;
                            Object.keys(presJSON).forEach(key => {
                                if (!key.startsWith('TextBox_')) return;
                                const viewData = presJSON[key];
                                if (viewData && typeof viewData.htmltext === 'string') {
                                    const updated = viewData.htmltext.replace(
                                        tbRegex, (match, prefix) => prefix + newName
                                    );
                                    if (updated !== viewData.htmltext) {
                                        viewData.htmltext = updated;
                                        changed = true;
                                    }
                                }
                            });
                            if (changed) savePresenter(projectName, presName, presJSON, null);
                        });
                        // Redraw live views so they immediately reflect the new name
                        if (typeof repaintViews === 'function') repaintViews();
                    }

                    this.refreshDependentCreationStrings(id);
                    this.savePdeState(projectName);
                    this.cancelRename();
                },

                refreshDependentCreationStrings(renamedId) {
                    this.boxes.forEach(box => {
                        const ref = box.json.Source === renamedId ||
                                    (box.json.Columns || []).some(c => c.source === renamedId);
                        if (!ref) return;
                        box.creationString = this.getBoxSummary(box);
                        const el = document.getElementById(box.id);
                        if (el) el.querySelector('.pde_creation-string').innerText = box.creationString;
                    });
                },

                cancelRename() {
                    document.getElementById(name + '_rename_modal').style.display = 'none';
                    this.pendingRenameId = null;
                },

                async confirmRemove(confirmed) {
                    document.getElementById(name + '_confirm_modal').style.display = 'none';
                    if (!confirmed) { this.pendingRemoveId = null; this.pendingRemoveIds = null; return; }

                    const toRemoveIds = this.pendingRemoveIds || [this.pendingRemoveId];

                    // Phase 1: collect survivors that lose at least one parent but keep others.
                    // Update their parents array before removing anything.
                    const survivors = [];
                    this.boxes.forEach(b => {
                        if (toRemoveIds.includes(b.id)) return;
                        if (b.parents && b.parents.some(p => toRemoveIds.includes(p))) {
                            b.parents = b.parents.filter(p => !toRemoveIds.includes(p));
                            survivors.push(b);
                        }
                    });

                    // Phase 2: remove orphaned boxes from state and DOM.
                    this.boxes = this.boxes.filter(b => !toRemoveIds.includes(b.id));
                    toRemoveIds.forEach(rid => { const el = document.getElementById(rid); if (el) el.remove(); });

                    // Phase 3: recompile survivors (their removed parents are gone from this.boxes now).
                    for (const b of survivors)
                        await this.setBoxData(b, await this.compileData(b));

                    this.drawArrows();
                    this.pendingRemoveId = null;
                    this.pendingRemoveIds = null;
                },

                async addFirstClassBox(startInEdit=true) {
                    if (this.editingId) return;
                    const newBox = await this.createBox('Q', null);
                    this.renderBox(newBox, startInEdit);
                },

                // center current active (in_edit) or first box
                centerActiveBox() {
                    const box = this.editingId ? 
                        this.boxes.find(b => b.id === this.editingId) : 
                        this.boxes.find(b => !b.parents || b.parents.length === 0);
                    
                    if (!box) return;
                    this.centerBox(box.id);
                },

                centerBox(box_id) {
                    const el = document.getElementById(box_id);
                    if (!el) return;
                    const scroll = document.getElementById(name + '_scroll');
                    const targetScrollLeft = el.offsetLeft * this.zoom - (scroll.clientWidth  / 2) + (el.offsetWidth  * this.zoom / 2);
                    const targetScrollTop  = el.offsetTop  * this.zoom - (scroll.clientHeight / 2) + (el.offsetHeight * this.zoom / 2);
                    scroll.scrollLeft = Math.max(0, targetScrollLeft);
                    scroll.scrollTop  = Math.max(0, targetScrollTop);
                },

                autoLayout() {
                    if (this.boxes.length === 0) return;

                    const MARGIN = 300;  // canvas offset — leaves space to the top and left
                    const H_GAP  = 60;   // horizontal gap between columns
                    const V_GAP  = 28;   // vertical gap between boxes in the same column

                    // ── 1. Assign a column (depth) to every box ──────────────────────
                    // Column = max(parent columns) + 1; roots (no valid parents) → col 0.
                    const colOf = {};
                    const getCol = (id) => {
                        if (id in colOf) return colOf[id];
                        const box = this.boxes.find(b => b.id === id);
                        if (!box) return (colOf[id] = 0);
                        const live = (box.parents || []).filter(pid => this.boxes.some(b => b.id === pid));
                        return (colOf[id] = live.length ? Math.max(...live.map(getCol)) + 1 : 0);
                    };
                    this.boxes.forEach(b => getCol(b.id));

                    // ── 2. Group boxes by column; compute column x positions ─────────
                    const byCol = {};
                    this.boxes.forEach(b => {
                        const c = colOf[b.id];
                        (byCol[c] = byCol[c] || []).push(b);
                    });
                    const numCols = Math.max(...Object.keys(byCol).map(Number)) + 1;

                    const colX = {};
                    let xAcc = MARGIN;
                    for (let c = 0; c < numCols; c++) {
                        colX[c] = xAcc;
                        xAcc += Math.max(...(byCol[c] || [{ w: 200 }]).map(b => b.w)) + H_GAP;
                    }

                    // ── 3. Assign y positions column by column ───────────────────────
                    const cenY = {};   // box.id → vertical centre in px

                    for (let c = 0; c < numCols; c++) {
                        const boxes = (byCol[c] || []).slice();
                        if (!boxes.length) continue;

                        // Sort order: col 0 preserves current top-to-bottom order;
                        // later cols sort by the average centre-y of their parents.
                        if (c === 0) {
                            boxes.sort((a, b) => (a.y || 0) - (b.y || 0));
                        } else {
                            boxes.sort((a, b) => {
                                const avg = box => {
                                    const ps = (box.parents || []).filter(pid => pid in cenY);
                                    return ps.length
                                        ? ps.reduce((s, pid) => s + cenY[pid], 0) / ps.length
                                        : 0;
                                };
                                return avg(a) - avg(b);
                            });
                        }

                        // Place boxes: each box wants to be centred at its parents' avg y.
                        // Push down whenever the ideal position would overlap the previous box.
                        const placed = [];
                        for (const box of boxes) {
                            const ps = (box.parents || []).filter(pid => pid in cenY);
                            const ideal = ps.length
                                ? ps.reduce((s, pid) => s + cenY[pid], 0) / ps.length
                                : (placed.length
                                    ? placed[placed.length - 1].cy
                                      + placed[placed.length - 1].box.h / 2 + V_GAP + box.h / 2
                                    : MARGIN + box.h / 2);

                            const minY = placed.length
                                ? placed[placed.length - 1].cy
                                  + placed[placed.length - 1].box.h / 2 + V_GAP + box.h / 2
                                : MARGIN + box.h / 2;

                            const cy = Math.max(ideal, minY, MARGIN + box.h / 2);
                            placed.push({ box, cy });
                            cenY[box.id] = cy;
                        }

                        // Shift the whole column upward so it centres around its ideal average,
                        // as long as the first box stays above MARGIN.
                        const avgIdeal  = boxes.reduce((s, b) => {
                            const ps = (b.parents || []).filter(pid => pid in cenY);
                            return s + (ps.length ? ps.reduce((ss, pid) => ss + cenY[pid], 0) / ps.length : cenY[b.id]);
                        }, 0) / boxes.length;
                        const avgActual = placed.reduce((s, p) => s + p.cy, 0) / placed.length;
                        const shift     = avgIdeal - avgActual;
                        if (shift < 0) {
                            const firstMin = MARGIN + placed[0].box.h / 2;
                            const safeShift = Math.max(shift, firstMin - placed[0].cy);
                            if (safeShift < 0) {
                                placed.forEach(p => { p.cy += safeShift; cenY[p.box.id] = p.cy; });
                            }
                        }
                    }

                    // ── 4. Apply positions to boxes and DOM elements ─────────────────
                    this.boxes.forEach(b => {
                        b.x = colX[colOf[b.id] ?? 0] ?? MARGIN;
                        b.y = Math.max(MARGIN, Math.round((cenY[b.id] ?? MARGIN) - b.h / 2));
                        const el = document.getElementById(b.id);
                        if (el) { el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; }
                    });

                    // Expand scroll margins if needed, then redraw arrows and save
                    this.canvas.style.marginRight  = Math.max(0, this.canvas.offsetWidth  * (this.zoom - 1)) + 'px';
                    this.canvas.style.marginBottom = Math.max(0, this.canvas.offsetHeight * (this.zoom - 1)) + 'px';
                    this.drawArrows();
                    this._viewDirty = true;
                    this.savePdeState(projectName);
                },

                async createBox(type, parentId) {
                    this.boxCounter++;
                    const id = 'box_' + Math.random().toString(36).substr(2, 9);
                    const scroll = document.getElementById(name + '_scroll');
                    const centerX = scroll.scrollLeft + (scroll.clientWidth / 2) - 180;
                    const centerY = scroll.scrollTop  + (scroll.clientHeight / 2) - 65;
                    const box = {
                        id, name: `data_${this.boxCounter}`, type,
                        parents: parentId ? [parentId] : [], json: this.getDefaultJSON(type),
                        x: centerX, y: centerY, w: BOXES[type].w, h: BOXES[type].h,
                        isEditing: false, preEditSize: { w: BOXES[type].w, h: BOXES[type].h },
                        isNew: true
                    };

                    if (parentId) {
                        const p = this.boxes.find(b => b.id === parentId);
                        if (p) { box.x = p.x + p.w + 100; box.y = p.y + 50; }
                        if (type === 'S' || type === 'C') box.json.Source = parentId;
                    }
                    this.setBoxData(box, await this.compileData(box));
                    this.boxes.push(box);
                    return box;
                },

                async refreshRootBoxes() {
                    await this.preloadQBoxes(null);
                },

                // Loads data for all root (parentless) boxes one by one, optionally
                // reporting progress via onEach(doneCount, totalCount).
                // Called by init() so a progress callback can be threaded through.
                async preloadQBoxes(onEach) {
                    const roots = this.boxes.filter(b => !b.parents || b.parents.length === 0);
                    const total = roots.length;
                    let done = 0;
                    if (typeof onEach === 'function') onEach(0, total);
                    for (const box of roots) {
                        await this.setBoxData(box, await this.compileData(box));
                        if (typeof onEach === 'function') onEach(++done, total);
                    }
                },

                async setBoxData(box, data) {
                    box.data = data;
                    this.refreshBoxDisplay(box);

                    for (const childBox of this.boxes.filter(b => b.parents && b.parents.includes(box.id))) {
                        await this.setBoxData(childBox, await this.compileData(childBox));
                    }
                },

                renderBox(box, startInEdit = false) {
                    const el = document.createElement('div');
                    el.id = box.id;
                    el.dataset.type = box.type;
                    el.className = 'pde_box-card';
                    el.style.left = box.x + 'px'; el.style.top = box.y + 'px';
                    el.style.width = box.w + 'px'; el.style.height = box.h + 'px';

                    const boxEditHTML = this.getBoxEditHTML(box);

                    el.innerHTML = `
                        <div class="pde_box-header" style="background-color:${BOXES[box.type].color}">
                            <div class="pde_header-title">
                                <i class="${BOXES[box.type].icon} pde_box-type-icon"></i>
                                <span>${box.name}</span>
                                <button class="pde_icon-btn" onclick="pde_${name}.renameBox('${box.id}')" title="Rename Box">
                                    <i class="far fa-edit icon"></i>
                                </button>
                            </div>
                            <div class="pde_header-actions">
                                <button class="pde_icon-btn" onclick="pde_${name}.showDeriveModal('${box.id}')" title="Derive Child Box">
                                    <i class="fas fa-code-branch"></i>
                                </button>
                                <button class="pde_icon-btn pde_usages-btn" onclick="pde_${name}.toggleUsages('${box.id}', this)" title="Show usages">
                                    <i class="fas fa-eye"></i>
                                    <span class="pde_usages-badge" id="pde_ubc_${box.id}"></span>
                                </button>
                                <button class="pde_icon-btn pde_btn-remove" onclick="pde_${name}.removeBox('${box.id}')" title="Remove Box">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="pde_box-content">
                            <div class="pde_creation-string-wrapper">
                                <div class="pde_creation-string" title='${JSON.stringify(box.json)}'>${box.creationString || this.getBoxSummary(box)}</div>
                                <button class="pde_edit-icon-btn" onclick="pde_${name}.startEdit('${box.id}')" title="Edit Properties">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                            <div class="pde_data-area"></div>
                        </div>
                        <div class="pde_edit-panel">
                            <div class="pde_edit-panel_center">
                              ${boxEditHTML}
                            </div>
                            <div style="display:flex; gap:8px; margin-top:8px; margin-bottom:8px">
                                <button onclick="pde_${name}.saveEdit('${box.id}')" style="flex:1">OK</button>
                                <button onclick="pde_${name}.cancelEdit('${box.id}')" style="flex:1">Cancel</button>
                            </div>
                        </div>
                    `;

                    this.canvas.appendChild(el);
                    this.initInteractions(el, box);

                    this.refreshBoxDisplay(box);

                    setTimeout(() => {
                        const scroll = document.getElementById(name + '_scroll');
                        const boxRect = el.getBoundingClientRect();
                        const scrollRect = scroll.getBoundingClientRect();
                        const centerX = (scrollRect.width / 2) - (boxRect.width / 2);
                        const centerY = (scrollRect.height / 2) - (boxRect.height / 2);
                        scroll.scrollLeft += boxRect.left - scrollRect.left - centerX;
                        scroll.scrollTop  += boxRect.top  - scrollRect.top  - centerY;
                    }, 0);

                    if (startInEdit) this.startEdit(box.id);
                },

                renderDataPreview(box, boxElement = null) {
                    var data = box.data;
                    if (Array.isArray(data)) {
                        const isMatrix = data.length > 0 && Array.isArray(data[0]);
                        if (isMatrix) {
                            let displayRows = ARRAY_PREVIEW_K;
                            let displayCols = ARRAY_PREVIEW_K;
                            if (boxElement) {
                                const contentWidth = boxElement.offsetWidth;
                                const contentHeight = boxElement.offsetHeight;
                                const charsPerColumn = 2 * H_LEN + 1;
                                const charWidth = 6;
                                const minCellWidth = (charsPerColumn * charWidth) + 8;
                                const availableWidth = contentWidth - 50;
                                displayCols = Math.max(1, Math.floor(availableWidth / minCellWidth));
                                const availableHeight = contentHeight - 70;
                                const rowHeight = 16;
                                displayRows = Math.max(1, Math.floor(availableHeight / rowHeight));
                            }
                            let tableHTML = '<div class="pde_array-table">';
                            const rowCount = Math.min(displayRows, data.length);
                            const hasMoreRows = data.length > displayRows;
                            for (let i = 0; i < rowCount; i++) {
                                tableHTML += '<div class="pde_array-table-row">';
                                const row = data[i];
                                const colCount = Math.min(displayCols, row.length);
                                const hasMoreCols = row.length > displayCols;
                                for (let j = 0; j < colCount; j++) {
                                    tableHTML += `<div class="pde_array-table-cell">${this.truncateHeader(row[j])}</div>`;
                                }
                                if (hasMoreCols) tableHTML += '<div class="pde_array-table-cell">…</div>';
                                tableHTML += '</div>';
                            }
                            if (hasMoreRows) {
                                tableHTML += '<div class="pde_array-table-row">';
                                for (let j = 0; j < displayCols; j++) {
                                    tableHTML += '<div class="pde_array-table-cell" style="color: #999;">·</div>';
                                }
                                if (data.length > 0 && data[0].length > displayCols) {
                                    tableHTML += '<div class="pde_array-table-cell" style="color: #999;">·</div>';
                                }
                                tableHTML += '</div>';
                            }
                            tableHTML += '</div>';
                            return `
                                <div class="pde_value-array">
                                    <div class="pde_array-container">${tableHTML}</div>
                                    <div class="pde_data-controls">
                                        <button class="pde_data-icon-btn" onclick="pde_${name}.showBoxDataFullscreen('${box.id}')" title="Show all data">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }
                        // one-dimensional arrays
                        const itemCount = data.length;
                        const matrixItems = [];
                        for (let i = 0; i < ARRAY_PREVIEW_K && i < data.length; i++) matrixItems.push(data[i]);
                        const preview = matrixItems.join(', ');
                        const moreText = itemCount > ARRAY_PREVIEW_K ? ` ...` : '';
                        return `
                            <div class="pde_data-area">
                                <div class="pde_value-array">
                                    <div class="pde_value-array-info">[${itemCount}] ${preview}${moreText}</div>
                                    <button class="pde_data-icon-btn" onclick="pde_${name}.showBoxDataFullscreen('${box.id}')" title="Show all data">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }
                    return `<div class="pde_data-area"><div class="pde_value-scalar">${data}</div></div>`;
                },

                showBoxDataFullscreen(box_id) {
                  const box = this.boxes.find(b => b.id === box_id);
                  if (box)
                    showModalDisplay(box.name, array2DToHTMLTable(box.data), 1, 95 );

                }, 

                async showBoxPreviewDataFullscreen(box_id) {
                  const box = this.boxes.find(b => b.id === box_id);
                  if (box) {
                    let tmpData = await this.compileData(box, box.jsonClone);
                    showModalDisplay(box.name, array2DToHTMLTable(tmpData), 1, 95 );
                  }
                },



                initInteractions(el, box) {
                    const header = el.querySelector('.pde_box-header');
                    const buttons = el.querySelectorAll('.pde_header-actions button');
                    buttons.forEach(btn => btn.addEventListener('mousedown', (e) => e.stopPropagation()));

                    header.onmousedown = (e) => {
                        if (e.target.closest('.pde_header-actions')) return;
                        let startX = e.clientX, startY = e.clientY;
                        document.onmousemove = (me) => {
                            box.x = Math.max(0, el.offsetLeft - (startX - me.clientX) / this.zoom);
                            box.y = Math.max(0, el.offsetTop  - (startY - me.clientY) / this.zoom);
                            startX = me.clientX; startY = me.clientY;
                            el.style.left = box.x + 'px'; el.style.top = box.y + 'px';
                            this.drawArrows();
                        };
                        document.onmouseup = () => { document.onmousemove = null; };
                    };

                    new ResizeObserver(() => {
                        if (!box.isEditing) {
                            box.w = el.offsetWidth; box.h = el.offsetHeight;
                            if (Array.isArray(box.data)) this.refreshBoxDisplay(box);
                        }
                        this.drawArrows();
                    }).observe(el);
                },

                toggleEditMode(id, force = false) {
                    const box = this.boxes.find(b => b.id === id);
                    const el = document.getElementById(id);
                    const panel = el.querySelector('.pde_edit-panel');
                    const content = el.querySelector('.pde_box-content');
                    const scroll = document.getElementById(name + '_scroll');

                    box.isEditing = force || !box.isEditing;
                    if (box.isEditing) {
                        this.editingId = id;
                        box._keyHandler = (e) => {
                            if (e.key === 'Escape') {
                                // Let showModalDisplay / info popup handle their own Esc first
                                if (document.querySelector('body > .modal, [data-info-popup]')) return;
                                e.preventDefault(); this.cancelEdit(id);
                            }
                            else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); this.saveEdit(id); }
                        };
                        document.addEventListener('keydown', box._keyHandler);
                        this.canvas.classList.add('pde_has-editing');
                        el.classList.add('pde_is-editing');
                        el.style.zIndex = "1000";
                        box.preEditSize = { w: el.offsetWidth, h: el.offsetHeight };
                        const es = BOXES[box.type];
                        el.style.width = es.ew + 'px'; el.style.height = es.eh + 'px';
                        panel.style.display = 'flex'; content.style.display = 'none';
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                const boxRect = el.getBoundingClientRect();
                                const scrollRect = scroll.getBoundingClientRect();
                                const targetScrollLeft = el.offsetLeft * this.zoom - (scrollRect.width  / 2) + (boxRect.width  / 2);
                                const targetScrollTop  = el.offsetTop  * this.zoom - (scrollRect.height / 2) + (boxRect.height / 2);
                                scroll.scrollLeft = targetScrollLeft;
                                scroll.scrollTop  = targetScrollTop;
                            });
                        });
                    } else {
                        this.editingId = null;
                        if (box._keyHandler) { document.removeEventListener('keydown', box._keyHandler); box._keyHandler = null; }
                        this.canvas.classList.remove('pde_has-editing');
                        el.classList.remove('pde_is-editing');
                        el.style.zIndex = "10";
                        
                        panel.style.display = 'none'; 

                        const tableDiv = panel.querySelector('[id^="show_data_table_"]');
                        if (tableDiv) tableDiv.innerHTML = '';

                        content.style.display = 'flex';
                        el.style.width = box.preEditSize.w + 'px'; el.style.height = box.preEditSize.h + 'px';
                        box.w = box.preEditSize.w; box.h = box.preEditSize.h;
                    }
                    this.drawArrows();
                },

                startEdit(id) {
                  if (this.editingId && this.editingId !== id) return;
                  const box = this.boxes.find(b => b.id === id);
                  this.fillEditFormWithData(box);
                  this.refreshEditForm(box);
                  this.toggleEditMode(id);
                },

                cancelEdit(id) {
                  const box = this.boxes.find(b => b.id === id);
                  if (box.isNew) {
                      // Box was never confirmed — remove it silently
                      this.editingId = null;
                      if (box._keyHandler) { document.removeEventListener('keydown', box._keyHandler); box._keyHandler = null; }
                      this.canvas.classList.remove('pde_has-editing');
                      this.boxes = this.boxes.filter(b => b.id !== id);
                      const el = document.getElementById(id);
                      if (el) el.remove();
                      this.drawArrows();
                      return;
                  }
                  box.jsonClone = null;
                  this.toggleEditMode(id);
                  this.centerBox(id);
                },

                // Derive the parents array from a box's configuration.
                // S: single source; T: all col-sources + boxes referenced in formulas.
                computeParents(box) {
                    const ids = new Set();
                    if (box.type === 'S' || box.type === 'C' || box.type === 'GF') {
                        if (box.json && box.json.Source) ids.add(box.json.Source);
                    } else if (box.type === 'T' && box.json && Array.isArray(box.json.Columns)) {
                        box.json.Columns.forEach(col => {
                            if (col.type === 'col' && col.source) {
                                ids.add(col.source);
                            } else if (col.type === 'formula' && col.expr) {
                                this.boxes.forEach(b => {
                                    if (b.id === box.id) return;
                                    const safe = b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    if (new RegExp(safe + '(?=[^a-zA-Z0-9_]|$)').test(col.expr))
                                        ids.add(b.id);
                                });
                            }
                        });
                    } else if (box.type === 'V' && box.json && Array.isArray(box.json.Entries)) {
                        box.json.Entries.forEach(entry => {
                            if (!entry.formula) return;
                            this.boxes.forEach(b => {
                                if (b.id === box.id) return;
                                const safe = b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                if (new RegExp(safe + '(?=[^a-zA-Z0-9_]|$)').test(entry.formula))
                                    ids.add(b.id);
                            });
                        });
                    }
                    return [...ids];
                },

                async saveEdit(id) {
                    const box = this.boxes.find(b => b.id === id);
                    const el = document.getElementById(id);

                    // Snapshot old V-box entry names before the try block so the variable
                    // is accessible in the propagation code that runs after try/catch.
                    const oldVEntries = (box.type === 'V' && Array.isArray(box.json.Entries))
                        ? box.json.Entries.map(e => e.name || '')
                        : null;

                    try {
                        box.isNew = false;

                        box.json = JSON.parse(JSON.stringify(box.jsonClone));

                        if (box.type === 'S' || box.type === 'T' || box.type === 'C' || box.type === 'GF' || box.type === 'V')
                            box.parents = this.computeParents(box);
                        await this.setBoxData(box, await this.compileData(box));
                        box.creationString = this.getBoxSummary(box);
                        el.querySelector('.pde_creation-string').innerText = box.creationString;
                        this.drawArrows();
                        this.toggleEditMode(id);

                    } catch (e) {}

                    // Propagate V-box entry name changes to TextBox htmltext references.
                    // Lives OUTSIDE try/catch so errors surface in the console.
                    // e.g. $double{data_5["total"]} → $double{data_5["newName"]}
                    if (oldVEntries && typeof pp !== 'undefined' && pp.presenterJSONs) {
                        const newVEntries = (box.json.Entries || []).map(e => e.name || '');
                        const safeBoxRef  = (box.name || box.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        // Match either literal " or HTML-encoded &quot; (browsers differ on innerHTML serialisation)
                        const Q = '(?:"|&quot;)';
                        let tbChanged = false;
                        oldVEntries.forEach((oldName, i) => {
                            const newName = newVEntries[i] || '';
                            if (!oldName || !newName || oldName === newName) return;
                            const safeOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const re = new RegExp(`(${safeBoxRef}\\[${Q})${safeOld}(${Q}\\])`, 'g');
                            pp.presenterJSONs.forEach((presJSON, presName) => {
                                if (!presJSON) return;
                                let changed = false;
                                Object.keys(presJSON).forEach(key => {
                                    if (!key.startsWith('TextBox_')) return;
                                    const vd = presJSON[key];
                                    if (vd && typeof vd.htmltext === 'string') {
                                        const updated = vd.htmltext.replace(re, (_, g1, g2) => g1 + newName + g2);
                                        if (updated !== vd.htmltext) {
                                            vd.htmltext = updated;
                                            changed = true;
                                            tbChanged = true;
                                        }
                                    }
                                });
                                if (changed) savePresenter(projectName, presName, presJSON, null);
                            });
                        });
                        if (tbChanged && typeof repaintViews === 'function') repaintViews();
                    }

                    this.centerBox(id);
                    this.savePdeState(projectName);
                },

                showDeriveModal(parentId) {
                    if (this.editingId) return;

                    const BOX_DESC = {
                        'S':  'Collapses a column of the source table into a single scalar number (SUM, MIN, MAX, AVG, …).',
                        'GF': 'Filters and re-orders rows of the source table without changing its column structure.',
                        'T':  'Assembles a new table by picking columns from multiple sources and adding formula columns.',
                        'C':  'Applies COUNT, SUM, MIN, MAX, AVG, FIRST or LAST to rows that satisfy a condition; supports loop iteration and grouping.',
                        'V':  'Builds a named scalar list: each entry has a formula that can aggregate tables, reference cells, and refer to previous entries.',
                    };

                    const container = document.getElementById(name + '_modal_type_buttons');
                    container.innerHTML = '';

                    Object.keys(BOXES).forEach(t => {
                        if (t === 'Q') return;
                        const color = BOXES[t].color;

                        const card = document.createElement('div');
                        card.className = 'pde_type-card';
                        card.innerHTML = `
                            <div class="pde_type-card-top" style="background:${color};">
                                <i class="${BOXES[t].icon} pde_type-icon"></i>
                                <span class="pde_type-name">${BOXES[t].desc}</span>
                                <span class="pde_type-key">${t}</span>
                            </div>
                            <p class="pde_type-desc">${BOX_DESC[t] || ''}</p>`;
                        card.onclick = async () => {
                            const childBox = await this.createBox(t, parentId);
                            this.renderBox(childBox, true);
                            this.closeDeriveModal();
                        };
                        container.appendChild(card);
                    });

                    const modal = document.getElementById(name + '_type_modal');
                    this._deriveEscHandler = (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closeDeriveModal(); } };
                    document.addEventListener('keydown', this._deriveEscHandler);
                    modal.style.display = 'flex';
                },

                closeDeriveModal() {
                    document.getElementById(name + '_type_modal').style.display = 'none';
                    if (this._deriveEscHandler) {
                        document.removeEventListener('keydown', this._deriveEscHandler);
                        this._deriveEscHandler = null;
                    }
                },

                refreshBoxDisplay(box) {
                    const el = document.getElementById(box.id);
                    if (!el) return;
                    const dataArea = el.querySelector('.pde_data-area');
                    if (dataArea) dataArea.innerHTML = this.renderDataPreview(box, el);
                },

                drawArrows() {
                    const paths = this.svg.querySelectorAll('path:not(defs path)');
                    paths.forEach(p => p.remove());
                    this.boxes.forEach(child => {
                        if (!child.parents || child.parents.length === 0) return;
                        child.parents.forEach(parentId => {
                            const p = this.boxes.find(b => b.id === parentId);
                            if (p) {
                                const sX = p.x + p.w, sY = p.y + (p.h / 2);
                                const eX = child.x,   eY = child.y + (child.h / 2);
                                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                                const cp = sX + (eX - sX) / 2;
                                path.setAttribute("d", `M ${sX} ${sY} C ${cp} ${sY}, ${cp} ${eY}, ${eX} ${eY}`);
                                path.setAttribute("stroke", "#444");
                                path.setAttribute("stroke-width", "2");
                                path.setAttribute("fill", "none");
                                path.setAttribute("marker-end", `url(#${name}_arrowhead)`);
                                this.svg.appendChild(path);
                            }
                        });
                    });
                },



                // gets data from source and make appropriate transformations according to box type
                async compileData(box, json = undefined) { 
                    json = json ?? box.json;

                    const parentBox = this.boxes.find(b => b.id === (box.parents && box.parents[0]));
                    // use parentBox.data ... parent's data (if needed for data compilation)

                    switch (box.type) {
                      case 'Q': 
                        var data = await getData(url, projectName, json);
                        return data;
                      case 'GF': {
                        const srcBox = this.boxes.find(b => b.id === json.Source);
                        if (!srcBox || !Array.isArray(srcBox.data)) return null;
                        const gfOps = buildGfOpStrings(json.Ops);
                        return gfOps.length ? groupbyFilterData(srcBox.data, gfOps) : srcBox.data;
                      }
                      case 'S': {
                        const srcBox = this.boxes.find(b => b.id === json.Source);
                        if (!srcBox || !Array.isArray(srcBox.data)) return null;
                        return aggregateColumn(srcBox.data, json.Column, json.Function, json.Decimals ?? 2);
                      }

                      case 'T': {
                        if (!json.Columns || json.Columns.length === 0)
                            return [['ID', 'Testset', 'TID']];

                        // Precompute key→row maps for every array box (Testset|||TID composite key)
                        const allBoxMaps = {};
                        this.boxes.forEach(b => {
                            if (!Array.isArray(b.data) || b.data.length < 2 || !Array.isArray(b.data[0])) return;
                            const hdrs = b.data[0];
                            const ti = hdrs.indexOf('Testset'), di = hdrs.indexOf('TID');
                            if (ti === -1 || di === -1) return;
                            const map = {};
                            b.data.slice(1).forEach(row => {
                                const key = `${row[ti]}|||${row[di]}`;
                                if (!map[key]) map[key] = row;
                            });
                            allBoxMaps[b.id] = { headers: hdrs, map };
                        });

                        // Inner join: intersect keys across all "col" source boxes.
                        // If there are no "col" columns (formula-only), fall back to the
                        // union of all keys from every available array box.
                        const colSrcIds = [...new Set(json.Columns.filter(c => c.type === 'col').map(c => c.source).filter(id => allBoxMaps[id]))];
                        let commonKeys;
                        if (colSrcIds.length === 0) {
                            const allKeys = new Set();
                            Object.values(allBoxMaps).forEach(bm => Object.keys(bm.map).forEach(k => allKeys.add(k)));
                            commonKeys = [...allKeys];
                        } else {
                            commonKeys = Object.keys(allBoxMaps[colSrcIds[0]].map);
                            for (let i = 1; i < colSrcIds.length; i++) {
                                const set = new Set(Object.keys(allBoxMaps[colSrcIds[i]].map));
                                commonKeys = commonKeys.filter(k => set.has(k));
                            }
                        }

                        const resultHeaders = ['ID', 'Testset', 'TID', ...json.Columns.map(c => c.name)];
                        const rows = [resultHeaders];

                        commonKeys.forEach((key, rowIdx) => {
                            const [testset, tid] = key.split('|||');
                            const rowVals = [rowIdx + 1, testset, tid];

                            // Build variable map for formula evaluation
                            const varMap = {};
                            this.boxes.forEach(b => { if (!Array.isArray(b.data)) varMap[b.name] = b.data; });
                            this.boxes.forEach(b => {
                                const bm = allBoxMaps[b.id];
                                if (!bm || !bm.map[key]) return;
                                const rd = bm.map[key];
                                bm.headers.forEach((h, i) => { varMap[`${b.name}.${h}`] = rd[i]; });
                            });
                            // Sort keys longest-first to avoid partial substitutions
                            const sortedVarKeys = Object.keys(varMap).sort((a, b) => b.length - a.length);

                            for (const colDef of json.Columns) {
                                if (colDef.type === 'col') {
                                    const bm = allBoxMaps[colDef.source];
                                    if (bm && bm.map[key]) {
                                        const ci = bm.headers.indexOf(colDef.column);
                                        rowVals.push(ci !== -1 ? bm.map[key][ci] : null);
                                    } else { rowVals.push(null); }
                                } else {
                                    try {
                                        let expr = colDef.expr ?? '0';
                                        for (const k of sortedVarKeys) {
                                            if (!expr.includes(k)) continue;
                                            const v = varMap[k];
                                            const n = Number(v);
                                            expr = expr.split(k).join(isNaN(n) ? JSON.stringify(v) : String(n));
                                        }
                                        // eslint-disable-next-line no-new-func
                                        const res = new Function('return (' + expr + ')')();
                                        const n = Number(res);
                                        rowVals.push(isNaN(n) ? res : parseFloat(n.toFixed(10)));
                                    } catch { rowVals.push(null); }
                                }
                            }
                            rows.push(rowVals);
                        });

                        return rows;
                      }

                      case 'C': {
                        const srcBox = this.boxes.find(b => b.id === json.Source);
                        if (!srcBox || !Array.isArray(srcBox.data) || srcBox.data.length < 2) return null;

                        let criteria = json.Condition ?? '';
                        if (json.Loop) {
                            const l = json.Loop;
                            criteria = `$for{${l.var},${l.from},${l.to},${l.step}}:${criteria}`;
                        }

                        const hdrs = srcBox.data[0];
                        const hasAlgoCols = hdrs.some(h => typeof h === 'string' && h.includes('.'));

                        const cFunc = json.Function || 'COUNT';

                        // If source has Algorithm.Indicator headers (Q/GF/S), delegate to createCountTable
                        if (hasAlgoCols) return createCountTable(srcBox.data, criteria, json.Group || null, cFunc, json.Column || '');

                        // --- Simple table path (T box, plain column names) ---
                        // Build an expression by replacing column names with row[index]
                        const buildRowExpr = (expr) => {
                            let js = expr;
                            const tokens = [...new Set((expr.match(/\b[a-zA-Z_]\w*\b/g) || []))];
                            tokens.sort((a, b) => b.length - a.length); // longest first → no partial match
                            tokens.forEach(tok => {
                                const idx = hdrs.indexOf(tok);
                                if (idx !== -1)
                                    js = js.replace(new RegExp(`\\b${tok}\\b`, 'g'), `row[${idx}]`);
                            });
                            return js;
                        };

                        // Helper: reduce a set of matched values with the chosen function
                        const applyReduceFunc = (func, vals) => {
                            if (func === 'COUNT') return vals.length;
                            if (vals.length === 0) return 0;
                            if (func === 'FIRST') return vals[0];
                            if (func === 'LAST')  return vals[vals.length - 1];
                            const nums = vals.map(Number).filter(v => !isNaN(v));
                            if (nums.length === 0) return 0;
                            switch (func) {
                                case 'SUM': return parseFloat(nums.reduce((a, b) => a + b, 0).toFixed(4));
                                case 'MIN': return Math.min(...nums);
                                case 'MAX': return Math.max(...nums);
                                case 'AVG': return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4));
                                default:    return null;
                            }
                        };

                        const groupIdx = json.Group ? hdrs.indexOf(json.Group) : -1;

                        // Determine output aggregate columns (once, before loops)
                        const skipHdrNames = new Set(['ID', 'Testset', 'TID', json.Group].filter(Boolean));
                        let aggCols; // [{idx, name}]
                        if (cFunc === 'COUNT') {
                            aggCols = [{ idx: -1, name: 'count' }];
                        } else if (json.Column && hdrs.indexOf(json.Column) !== -1) {
                            aggCols = [{ idx: hdrs.indexOf(json.Column), name: `${json.Column}.${cFunc.toLowerCase()}` }];
                        } else {
                            // all columns except known ID-like and group
                            aggCols = hdrs
                                .map((h, i) => ({ idx: i, name: h }))
                                .filter(({ name, idx }) => !skipHdrNames.has(name) && idx !== groupIdx)
                                .map(({ idx, name }) => ({ idx, name: `${name}.${cFunc.toLowerCase()}` }));
                        }

                        // Detect simple condition field (field op value) for threshold column
                        const condTemplate = json.Condition ?? '';
                        const condFieldMatch = condTemplate.match(/^\s*(\w+)\s*(==|!=|<=|>=|<|>)\s*/);
                        const condFieldForHdr = (condFieldMatch && condFieldMatch[1] !== (json.Group || ''))
                            ? condFieldMatch[1] : null;

                        // Parse optional $for loop from criteria string
                        let iterations = [{ i: null, varName: 'i', rawCriteria: criteria }];
                        const forMatch = criteria.match(/^\$for\{(\w+),(-?\d+),(-?\d+),(-?\d+)\}:(.*)/);
                        if (forMatch) {
                            const [, varName, start, end, step, expr] = forMatch;
                            iterations = [];
                            for (let v = parseInt(start); v <= parseInt(end); v += parseInt(step))
                                iterations.push({ i: v, varName, rawCriteria: expr });
                        }

                        const dataRows = srcBox.data.slice(1);
                        const resultRows = [];
                        let rowId = 1;

                        iterations.forEach(iter => {
                            const uniqueGroups = groupIdx !== -1
                                ? [...new Set(dataRows.map(r => r[groupIdx]))].sort((a, b) => a - b)
                                : [null];

                            uniqueGroups.forEach(groupVal => {
                                const subset = groupIdx !== -1
                                    ? dataRows.filter(r => r[groupIdx] === groupVal)
                                    : dataRows;

                                // Resolve ${expr} loop placeholders
                                let rawExpr = iter.rawCriteria;
                                if (iter.i !== null) {
                                    rawExpr = rawExpr.replace(/\$\{(.*?)\}/g, (_, e) => {
                                        try { return new Function(iter.varName, `return (${e})`)(iter.i); }
                                        catch { return 0; }
                                    });
                                }

                                // Extract threshold from resolved simple condition
                                let condThreshold = null;
                                if (condFieldForHdr) {
                                    const thMatch = rawExpr.match(/^\s*\w+\s*(?:==|!=|<=|>=|<|>)\s*(.+?)\s*$/);
                                    if (thMatch) {
                                        const v = thMatch[1].trim();
                                        condThreshold = isNaN(Number(v)) ? v : Number(v);
                                    }
                                }

                                const jsExpr = buildRowExpr(rawExpr);
                                const condFn = jsExpr.trim()
                                    ? (() => { try { return new Function('row', `return (${jsExpr})`); } catch { return null; } })()
                                    : null; // empty condition → all rows match

                                const matchedRows = [];
                                subset.forEach(row => {
                                    try { if (!condFn || condFn(row)) matchedRows.push(row); }
                                    catch { /* skip bad rows */ }
                                });

                                const resultRow = [rowId++];
                                if (iter.i !== null) resultRow.push(iter.i);
                                if (groupIdx !== -1) resultRow.push(groupVal);
                                if (condFieldForHdr !== null) resultRow.push(condThreshold);
                                aggCols.forEach(({ idx }) => {
                                    const vals = idx === -1
                                        ? matchedRows.map(() => 1)
                                        : matchedRows.map(row => row[idx]);
                                    resultRow.push(applyReduceFunc(cFunc, vals));
                                });
                                resultRows.push(resultRow);
                            });
                        });

                        // Result header
                        const resultHdr = ['ID'];
                        if (iterations[0]?.i !== null) resultHdr.push(iterations[0].varName);
                        if (groupIdx !== -1) resultHdr.push(json.Group);
                        if (condFieldForHdr !== null) resultHdr.push('cond');
                        aggCols.forEach(({ name }) => resultHdr.push(name));

                        return [resultHdr, ...resultRows];
                      }

                      case 'V': {
                        const entries = json.Entries || [];
                        if (entries.length === 0) return [['#', 'name', 'value']];
                        const result = [['#', 'name', 'value']];
                        const evaluatedValues = [];
                        for (let i = 0; i < entries.length; i++) {
                            const entry = entries[i];
                            let value;
                            try {
                                value = vEvaluateFormula(entry.formula || '', evaluatedValues, this.boxes);
                            } catch (e) {
                                value = 'ERR';
                            }
                            evaluatedValues.push(value);
                            result.push([i + 1, entry.name || '', value]);
                        }
                        return result;
                      }

                      default: return "Status: OK";
                    }
                },

                // Returns plain (non-algorithm) column names for a source box.
                // For T boxes, only the built-in ID/Testset/TID columns are plain;
                // all user-defined columns are algorithm-specific regardless of name.
                getPlainColsFromBox(srcBox) {
                    if (!srcBox || !Array.isArray(srcBox.data) || !srcBox.data[0]) return [];
                    if (srcBox.type === 'T')
                        return srcBox.data[0].filter(h => ['ID', 'Testset', 'TID'].includes(h));
                    return srcBox.data[0].filter(h => !String(h).includes('.'));
                },

                // Returns algorithm-specific column names (short, deduplicated) for a source box.
                // For T boxes, all user-defined columns (beyond ID/Testset/TID) are algorithm-specific.
                // For other boxes, columns with a dot are algorithm-specific; returned as last segment.
                getAlgoColsFromBox(srcBox) {
                    if (!srcBox || !Array.isArray(srcBox.data) || !srcBox.data[0]) return [];
                    if (srcBox.type === 'T')
                        return srcBox.data[0].filter(h => !['ID', 'Testset', 'TID'].includes(h));
                    const seen = new Set();
                    const result = [];
                    for (const h of srcBox.data[0]) {
                        if (!String(h).includes('.')) continue;
                        const short = h.slice(h.lastIndexOf('.') + 1);
                        if (!seen.has(short)) { seen.add(short); result.push(short); }
                    }
                    return result;
                },

                getBoxSummary(box) {
                    const j = box.json;
                    switch (box.type) {
                        case 'Q': {
                            if (j.Description && j.Description !== 'Query') return `Query: ${j.Description}`;
                            const q = j.Query || {};
                            const algs = (q.Algorithms || []).join(', ') || '*';
                            const inds = (q.Indicators || []).join(', ') || '*';
                            const ts   = (q.TestSets   || []).join(', ') || '*';
                            return `Query: Alg: ${algs} · Ind: ${inds} · TS: ${ts}`;
                        }
                        case 'S':
                            return j.Description || (j.Function && j.Column ? `${j.Function}(${j.Column})` : 'Aggregate');
                        case 'GF': {
                            const srcBox = this.boxes.find(b => b.id === j.Source);
                            const srcName = srcBox ? srcBox.name : '?';
                            const ops = buildGfOpStrings(j.Ops || []);
                            return ops.length ? `${srcName} | ${ops.join(' | ')}` : (j.Description || 'Filter & GroupBy');
                        }
                        case 'T': {
                            const cols = j.Columns || [];
                            if (!cols.length) return 'Table: ' + (j.Description || '—');
                            const parts = cols.slice(0, 3).map(c => {
                                if (c.type === 'formula') return `${c.name} (= ${c.expr})`;
                                const srcBox = this.boxes.find(b => b.id === c.source);
                                const srcName = srcBox ? srcBox.name : '?';
                                return `${c.name} (${srcName} | ${c.column})`;
                            });
                            if (cols.length > 3) parts.push(`+${cols.length - 3} more`);
                            return 'Table: ' + parts.join(', ');
                        }
                        case 'C': {
                            const func = j.Function || 'COUNT';
                            const col  = func !== 'COUNT' && j.Column ? `(${j.Column})` : '';
                            let s = j.Condition ?? '';
                            if (j.Loop) {
                                const l = j.Loop;
                                s = `$for{${l.var},${l.from},${l.to},${l.step}}:${s}`;
                            }
                            if (j.Group) s += ` @${j.Group}`;
                            return `Reduce ${func}${col}: ` + (s || j.Description || '—');
                        }
                        case 'V': {
                            const entries = j.Entries || [];
                            if (!entries.length) return 'Values: ' + (j.Description || '—');
                            const names = entries.slice(0, 4).map(e => e.name || '?').join(', ');
                            return 'Values: ' + names + (entries.length > 4 ? ` +${entries.length - 4}` : '');
                        }
                        default:
                            return j.Description || JSON.stringify(j);
                    }
                },

                getDefaultJSON(type) {
                  switch (type) {
                    case 'Q':  return {"Description": "Query",            "Query": getQueryDefaultJSON()};
                    case 'S':  return {"Description": "Aggregate",         "Source": "", "Column": "", "Function": "SUM", "Decimals": 2};
                    case 'GF': return {"Description": "Filter & GroupBy",  "Source": "", "Ops": []};
                    case 'T':  return {"Description": "Table",             "Columns": []};
                    case 'C':  return {"Description": "Reduce", "Source": "", "Function": "COUNT", "Column": "", "Loop": null, "Condition": "", "Group": ""};
                    case 'V':  return {"Description": "Values", "Entries": []};
                    default:   return "{}";
                  }
                },

                getBoxEditHTML(box) {
                    const pid = `${this.name}_${box.id}`;
                    switch (box.type) {
                      case 'Q': {
                        return `
                          <div class="pde_edit-form">
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Description</span>
                              <input id="qDescription_${pid}" type="text" style="flex:1;">
                            </div>
                            ${getQueryHTML(pid, false, false)}
                            <div class="pde_table-area">
                              <div id="show_data_table_${box.id}">x</div>
                            </div>
                          </div>`;
                      }

                      case 'S':
                        return `
                          <div class="pde_edit-form">
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Description</span>
                              <input id="sDescription_${pid}" type="text" style="flex:1;">
                            </div>
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:46px;">Source</span>
                              <select id="sSource_${pid}" style="flex:1;"></select>
                              <span class="pde_form-label" style="width:46px; margin-left:8px;">Column</span>
                              <select id="sColumn_${pid}" style="flex:1;"></select>
                            </div>
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:60px;">Function</span>
                              <div style="display:flex; flex:1; gap:3px;">
                                ${AGGREGATE_FUNCTIONS.map(f => `<button class="pde_func-btn" data-func="${f}">${f}</button>`).join('')}
                              </div>
                              <span class="pde_form-label" style="margin-left:8px;">Dec</span>
                              <input id="sDecimals_${pid}" type="number" min="0" max="10" value="2" style="width:42px; margin-left:4px;">
                            </div>
                            <div class="pde_result-display">
                              <strong id="sResult_${pid}">—</strong>
                            </div>
                          </div>`;

                      case 'T': {
                        return `
                          <div class="pde_edit-form">
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Description</span>
                              <input id="tDescription_${pid}" type="text" style="flex:1;">
                            </div>
                            <div style="flex:1; min-height:0; display:flex; flex-direction:column; border:1px solid #ddd; border-radius:4px; overflow:hidden;">
                              <div class="pde_t-col-header">
                                <span style="width:20px;"></span>
                                <span style="flex:0 0 114px; padding-left:4px;">Name</span>
                                <span style="flex:1;">Definition &nbsp;<span style="font-weight:400; text-transform:none; letter-spacing:0;">(source · column or formula)</span></span>
                                <span style="width:24px;"></span>
                              </div>
                              <div id="tColumns_${pid}" style="flex:1; overflow-y:auto;"></div>
                            </div>
                            <div class="pde_form-row" style="gap:6px;">
                              <button id="tAddCol_${pid}" class="pde_func-btn" style="flex:none; padding:5px 12px;">+ Column</button>
                              <button id="tAddFormula_${pid}" class="pde_func-btn" style="flex:none; padding:5px 12px;">+ Formula</button>
                            </div>
                            <details>
                              <summary style="display:flex; align-items:center; gap:8px; list-style:none; cursor:pointer; user-select:none;">
                                <span class="pde_form-label" style="white-space:nowrap;">▶ Variables</span>
                                <span style="flex:1; font-size:10px; font-weight:400; color:#888; text-transform:none; letter-spacing:0;">(expand, then click a chip to insert into focused formula)</span>
                                <input id="tVarsFilter_${pid}" type="text" placeholder="filter…"
                                  class="pde_t-vars-filter"
                                  style="width:150px; font-size:11px; padding:2px 5px; border:1px solid #ccc; border-radius:3px;"
                                  onclick="event.stopPropagation()">
                              </summary>
                              <div id="tVars_${pid}" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;
                                   padding:2px 0; max-height:65px; overflow-y:auto;"></div>
                            </details>
                            <div style="flex:0 0 160px; min-height:0; overflow:hidden;">
                              <div id="show_data_table_${box.id}" style="height:100%;"></div>
                            </div>
                          </div>`;
                      }

                      case 'C':
                        return `
                          <div class="pde_edit-form">
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Description</span>
                              <input id="cDescription_${pid}" type="text" style="flex:1;">
                            </div>
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Source</span>
                              <select id="cSource_${pid}" style="flex:1;"></select>
                            </div>
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Function</span>
                              <div style="display:flex; flex:1; gap:3px; flex-wrap:wrap;">
                                ${['COUNT','SUM','MIN','MAX','AVG','FIRST','LAST'].map(f =>
                                    `<button class="pde_func-btn" data-func="${f}">${f}</button>`).join('')}
                              </div>
                            </div>
                            <div class="pde_form-row" id="cColumnRow_${pid}">
                              <span class="pde_form-label" style="width:72px;">Column</span>
                              <select id="cColumn_${pid}" style="flex:1;"></select>
                            </div>
                            <div class="pde_form-row">
                              <label style="display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none;">
                                <input type="checkbox" id="cUseLoop_${pid}">
                                <span class="pde_form-label" style="margin:0;">Repeat</span>
                              </label>
                            </div>
                            <div id="cLoopParams_${pid}" style="display:none;">
                              <div class="pde_form-row">
                                <span class="pde_form-label" style="width:30px;">For</span>
                                <input id="cLoopVar_${pid}" type="text" style="width:38px; text-align:center; font-family:monospace;">
                                <span class="pde_form-label" style="width:38px; margin-left:8px;">From</span>
                                <input id="cLoopFrom_${pid}" type="number" style="width:58px;">
                                <span class="pde_form-label" style="width:20px; margin-left:8px;">To</span>
                                <input id="cLoopTo_${pid}" type="number" style="width:58px;">
                                <span class="pde_form-label" style="width:30px; margin-left:8px;">Step</span>
                                <input id="cLoopStep_${pid}" type="number" style="width:58px;">
                              </div>
                            </div>
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Condition</span>
                              <input id="cCondition_${pid}" type="text" style="flex:1; font-family:monospace; font-size:11px;"
                                     placeholder="e.g. Tmin &lt; 1000">
                            </div>
                            <div class="pde_form-row" style="align-items:flex-start;">
                              <span class="pde_form-label" style="width:72px; padding-top:3px;">Columns</span>
                              <div id="cColChips_${pid}" style="display:flex; flex-wrap:wrap; gap:4px; flex:1; max-height:65px; overflow-y:auto;"></div>
                            </div>
                            <div id="cLoopChipsRow_${pid}" style="display:none;">
                              <div class="pde_form-row" style="align-items:flex-start;">
                                <span class="pde_form-label" style="width:72px; padding-top:3px;">Loop var</span>
                                <div id="cLoopChips_${pid}" style="display:flex; flex-wrap:wrap; gap:4px; flex:1;"></div>
                              </div>
                            </div>
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Group by</span>
                              <select id="cGroup_${pid}" style="flex:1;"></select>
                            </div>
                            <div class="pde_form-row" style="align-items:flex-start;">
                              <div id="cFullStr_${pid}" class="pde_c-full-str"></div>
                              <button id="cCreate_${pid}" class="pde_func-btn"
                                style="flex:none; padding:5px 14px; margin-left:8px; background:#a84540; color:white; border-color:#883020;">
                                ▶ Apply
                              </button>
                              <span id="cRowCount_${pid}" style="font-size:11px; color:#888; white-space:nowrap; align-self:center; margin-left:4px;"></span>
                            </div>
                            <div style="flex:1; min-height:0; overflow:hidden;">
                              <div id="show_data_table_${box.id}" style="height:100%;"></div>
                            </div>
                          </div>`;

                      case 'V':
                        return `
                          <div class="pde_edit-form">
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Description</span>
                              <input id="vDescription_${pid}" type="text" style="flex:1;">
                            </div>
                            <div style="display:flex; flex-direction:column; border:1px solid #ddd; border-radius:4px; overflow:hidden; min-height:80px;">
                              <div class="pde_t-col-header" style="display:grid; grid-template-columns:28px 130px 1fr 26px; gap:0;">
                                <span style="padding-left:6px;">#</span>
                                <span style="padding-left:4px;">Name</span>
                                <span>Formula</span> ${infoButton('vBoxHelp')}
                                <span></span>
                              </div>
                              <div id="vEntries_${pid}" style="overflow-y:auto; max-height:220px;"></div>
                            </div>
                            <div class="pde_form-row" style="gap:6px;">
                              <button id="vAddEntry_${pid}" class="pde_func-btn" style="flex:none; padding:5px 12px;">+ Entry</button>
                              <span style="flex:1;"></span>
                              <button id="vApply_${pid}" class="pde_func-btn"
                                style="flex:none; padding:5px 14px; background:#2a7f7f; color:white; border-color:#1a5f5f;">
                                ▶ Apply
                              </button>
                            </div>
                            <details>
                              <summary style="display:flex; align-items:center; gap:8px; list-style:none; cursor:pointer; user-select:none;">
                                <span class="pde_form-label" style="white-space:nowrap;">▶ Variables</span>
                                <span style="flex:1; font-size:10px; font-weight:400; color:#888; text-transform:none; letter-spacing:0;">(expand, click to insert into focused formula)</span>
                              </summary>
                              <div id="vChips_${pid}" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; max-height:65px; overflow-y:auto; padding:2px 0;"></div>
                            </details>
                            <div style="flex:0 0 160px; min-height:0; overflow:hidden;">
                              <div id="show_data_table_${box.id}" style="height:100%;"></div>
                            </div>
                          </div>`;

                      case 'GF':
                        return `
                          <div class="pde_edit-form">
                            <div class="pde_form-row">
                              <span class="pde_form-label" style="width:72px;">Description</span>
                              <input id="gfDescription_${pid}" type="text" style="flex:1;">
                              <span class="pde_form-label" style="width:46px; margin-left:8px;">Source</span>
                              <select id="gfSource_${pid}" style="flex:1;"></select>
                            </div>
                            <div id="gfOps_${pid}" style="flex:1; min-height:100px; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column; gap:6px; padding-right:2px;"></div>
                            <div id="gfFullStr_${pid}" class="gf-full-str"></div>
                            <div class="pde_form-row" style="gap:6px;">
                              <button id="gfAddFilter_${pid}" class="pde_func-btn" style="flex:none; padding:4px 12px;">
                                <i class="fas fa-plus"></i> Filter
                              </button>
                              <button id="gfAddGroupBy_${pid}" class="pde_func-btn" style="flex:none; padding:4px 12px;">
                                <i class="fas fa-plus"></i> Group By
                              </button>
                              <span style="flex:1;"></span>
                              <button id="gfApply_${pid}" class="pde_func-btn"
                                style="flex:none; padding:4px 14px; background:#a07820; color:white; border-color:#7a5a10;">
                                ▶ Apply
                              </button>
                              <button onclick="pde_${name}.showBoxPreviewDataFullscreen('${box.id}')"
                                class="pde_func-btn" title="Show results"
                                style="flex:none; padding:4px 10px;">
                                <i class="fas fa-eye"></i>
                              </button>
                              <span id="gfRowCount_${pid}" style="font-size:11px; color:#888; white-space:nowrap; align-self:center;"></span>
                            </div>
                            <div style="flex:1; min-height:0; overflow:hidden;">
                              <div id="show_data_table_${box.id}" style="height:100%;"></div>
                            </div>
                          </div>`;

                      default:
                        return `<textarea>${box.json}</textarea>`;
                    }
                },

                fillEditFormWithData(box) {
                  const pid = `${this.name}_${box.id}`;
                  box.jsonClone = JSON.parse(JSON.stringify(box.json));
                  switch (box.type) {
                    case 'Q': {
                        const qDescInp = document.getElementById(`qDescription_${pid}`);
                        if (qDescInp) {
                            qDescInp.value = box.jsonClone.Description ?? '';
                            qDescInp.addEventListener('input', () => { box.jsonClone.Description = qDescInp.value; });
                        }
                        fillAndWireQuery(box.jsonClone, pid, () => this.refreshEditForm(box));
                        break;
                    }

                    case 'S': {
                        const srcSel  = document.getElementById(`sSource_${pid}`);
                        const colSel  = document.getElementById(`sColumn_${pid}`);
                        const decInp  = document.getElementById(`sDecimals_${pid}`);
                        const descInp = document.getElementById(`sDescription_${pid}`);
                        const panel   = document.getElementById(box.id).querySelector('.pde_edit-panel');
                        const funcBtns = panel.querySelectorAll('.pde_func-btn');

                        const setActiveFunc = (func) => {
                            funcBtns.forEach(b => b.classList.toggle('active', b.dataset.func === func));
                        };

                        // populate source dropdown with boxes that have 2D array data
                        const populateSources = () => {
                            srcSel.innerHTML = '';
                            this.boxes
                                .filter(b => b.id !== box.id && Array.isArray(b.data) && b.data.length > 0 && Array.isArray(b.data[0]))
                                .forEach(b => srcSel.appendChild(new Option(b.name, b.id)));
                            srcSel.value = box.jsonClone.Source;
                        };

                        // populate column dropdown from selected source box headers
                        const populateColumns = () => {
                            colSel.innerHTML = '';
                            const srcBox = this.boxes.find(b => b.id === srcSel.value);
                            if (srcBox && Array.isArray(srcBox.data) && srcBox.data.length > 0)
                                srcBox.data[0].forEach(col => colSel.appendChild(new Option(col, col)));
                            colSel.value = box.jsonClone.Column;
                        };

                        box._sDescLocked = false;
                        populateSources();
                        populateColumns();
                        setActiveFunc(box.jsonClone.Function);
                        decInp.value  = box.jsonClone.Decimals ?? 2;
                        descInp.value = box.jsonClone.Description ?? '';

                        srcSel.addEventListener('change', () => {
                            box.jsonClone.Source = srcSel.value;
                            populateColumns();
                            box.jsonClone.Column = colSel.value;
                            this.refreshEditForm(box);
                        });
                        colSel.addEventListener('change', () => {
                            box.jsonClone.Column = colSel.value;
                            this.refreshEditForm(box);
                        });
                        funcBtns.forEach(b => b.addEventListener('click', () => {
                            box.jsonClone.Function = b.dataset.func;
                            setActiveFunc(b.dataset.func);
                            this.refreshEditForm(box);
                        }));
                        decInp.addEventListener('change', () => {
                            box.jsonClone.Decimals = parseInt(decInp.value) || 0;
                            this.refreshEditForm(box);
                        });
                        descInp.addEventListener('input', () => {
                            box.jsonClone.Description = descInp.value;
                            box._sDescLocked = true;
                        });
                        break;
                    }

                    case 'T': {
                        let lastFocusedFormula = null;

                        const descInpT = document.getElementById(`tDescription_${pid}`);
                        descInpT.value = box.jsonClone.Description ?? '';
                        descInpT.addEventListener('input', () => { box.jsonClone.Description = descInpT.value; });

                        const renderColumns = () => {
                            const container = document.getElementById(`tColumns_${pid}`);
                            container.innerHTML = '';
                            box.jsonClone.Columns.forEach((col, idx) => {
                                const row = document.createElement('div');
                                row.className = 'pde_t-col-row';

                                // Up / Down buttons
                                const upDnDiv = document.createElement('div');
                                upDnDiv.className = 'pde_t-updn-wrap';
                                const upBtn = document.createElement('button');
                                upBtn.textContent = '▲'; upBtn.className = 'pde_t-updn-btn';
                                upBtn.title = 'Move up'; upBtn.disabled = idx === 0;
                                upBtn.onclick = () => {
                                    if (idx > 0) {
                                        [box.jsonClone.Columns[idx-1], box.jsonClone.Columns[idx]] =
                                        [box.jsonClone.Columns[idx],   box.jsonClone.Columns[idx-1]];
                                        renderColumns(); this.refreshEditForm(box);
                                    }
                                };
                                const dnBtn = document.createElement('button');
                                dnBtn.textContent = '▼'; dnBtn.className = 'pde_t-updn-btn';
                                dnBtn.title = 'Move down'; dnBtn.disabled = idx === box.jsonClone.Columns.length - 1;
                                dnBtn.onclick = () => {
                                    if (idx < box.jsonClone.Columns.length - 1) {
                                        [box.jsonClone.Columns[idx], box.jsonClone.Columns[idx+1]] =
                                        [box.jsonClone.Columns[idx+1], box.jsonClone.Columns[idx]];
                                        renderColumns(); this.refreshEditForm(box);
                                    }
                                };
                                upDnDiv.appendChild(upBtn); upDnDiv.appendChild(dnBtn);
                                row.appendChild(upDnDiv);

                                // Name input
                                const nameInp = document.createElement('input');
                                nameInp.type = 'text'; nameInp.value = col.name ?? '';
                                nameInp.className = 'pde_t-name-inp';
                                nameInp.oninput = () => { col.name = nameInp.value; };
                                row.appendChild(nameInp);

                                if (col.type === 'col') {
                                    // Source select
                                    const srcSel = document.createElement('select');
                                    srcSel.className = 'pde_t-src-sel';
                                    this.boxes
                                        .filter(b => b.id !== box.id && ['Q','T','GF'].includes(b.type) && Array.isArray(b.data) && b.data.length > 1 && Array.isArray(b.data[0]))
                                        .forEach(b => srcSel.appendChild(new Option(b.name, b.id)));
                                    srcSel.value = col.source;

                                    // Column select
                                    const colSel = document.createElement('select');
                                    colSel.className = 'pde_t-col-sel';

                                    const populateColSel = () => {
                                        colSel.innerHTML = '';
                                        const srcBox = this.boxes.find(b => b.id === srcSel.value);
                                        if (srcBox && Array.isArray(srcBox.data) && srcBox.data.length > 0)
                                            srcBox.data[0].forEach(h => colSel.appendChild(new Option(h, h)));
                                        colSel.value = col.column;
                                    };
                                    populateColSel();

                                    srcSel.onchange = () => {
                                        col.source = srcSel.value;
                                        const oldColumn = col.column;
                                        populateColSel();
                                        col.column = colSel.value;
                                        if (col.name === oldColumn) {
                                            col.name = col.column;
                                            nameInp.value = col.name;
                                        }
                                        this.refreshEditForm(box);
                                    };
                                    colSel.onchange = () => {
                                        const oldColumn = col.column;
                                        col.column = colSel.value;
                                        if (col.name === oldColumn) {
                                            col.name = col.column;
                                            nameInp.value = col.name;
                                        }
                                        this.refreshEditForm(box);
                                    };
                                    row.appendChild(srcSel);
                                    row.appendChild(colSel);
                                } else {
                                    // Formula input
                                    const formulaInp = document.createElement('input');
                                    formulaInp.type = 'text'; formulaInp.value = col.expr ?? '';
                                    formulaInp.className = 'pde_t-formula-inp';
                                    formulaInp.placeholder = 'e.g. data_1.BubbleSort.Tmin / data_2.QuickSort.Tmin';
                                    formulaInp.onfocus = () => { lastFocusedFormula = formulaInp; };
                                    formulaInp.oninput = () => {
                                        col.expr = formulaInp.value;
                                        this.refreshEditForm(box);
                                    };
                                    row.appendChild(formulaInp);
                                }

                                // Delete button
                                const delBtn = document.createElement('button');
                                delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                                delBtn.className = 'pde_t-del-btn';
                                delBtn.title = 'Remove column';
                                delBtn.onclick = () => {
                                    box.jsonClone.Columns.splice(idx, 1);
                                    renderColumns(); this.refreshEditForm(box);
                                };
                                row.appendChild(delBtn);

                                container.appendChild(row);
                            });
                        };

                        const renderVars = (filter = '') => {
                            const varsDiv = document.getElementById(`tVars_${pid}`);
                            if (!varsDiv) return;
                            varsDiv.innerHTML = '';
                            const lf = filter.toLowerCase();
                            this.boxes.forEach(b => {
                                if (b.id === box.id) return;
                                if (!Array.isArray(b.data)) {
                                    if (lf && !b.name.toLowerCase().includes(lf)) return;
                                    const chip = document.createElement('span');
                                    chip.className = 'pde_var-chip';
                                    chip.textContent = b.name;
                                    chip.title = `Scalar value: ${b.data}`;
                                    chip.onclick = () => {
                                        if (lastFocusedFormula) { insertAtCursor(lastFocusedFormula, b.name); this.refreshEditForm(box); }
                                    };
                                    varsDiv.appendChild(chip);
                                } else if (b.data.length > 0 && Array.isArray(b.data[0])) {
                                    b.data[0].forEach(colName => {
                                        const ref = `${b.name}.${colName}`;
                                        if (lf && !ref.toLowerCase().includes(lf)) return;
                                        const chip = document.createElement('span');
                                        chip.className = 'pde_var-chip';
                                        chip.textContent = ref;
                                        chip.onclick = () => {
                                            if (lastFocusedFormula) { insertAtCursor(lastFocusedFormula, ref); this.refreshEditForm(box); }
                                        };
                                        varsDiv.appendChild(chip);
                                    });
                                }
                            });
                        };

                        const filterInp = document.getElementById(`tVarsFilter_${pid}`);
                        if (filterInp) filterInp.oninput = () => renderVars(filterInp.value);

                        document.getElementById(`tAddCol_${pid}`).onclick = () => {
                            const firstSrc = this.boxes.find(b => b.id !== box.id && ['Q','T','GF'].includes(b.type) && Array.isArray(b.data) && b.data.length > 1 && Array.isArray(b.data[0]));
                            const firstCol = firstSrc && firstSrc.data.length > 0 ? firstSrc.data[0][0] : '';
                            box.jsonClone.Columns.push({
                                name:   firstCol,
                                type:   'col',
                                source: firstSrc ? firstSrc.id : '',
                                column: firstCol
                            });
                            renderColumns(); this.refreshEditForm(box);
                        };

                        document.getElementById(`tAddFormula_${pid}`).onclick = () => {
                            const fCount = box.jsonClone.Columns.filter(c => c.type === 'formula').length;
                            box.jsonClone.Columns.push({ name: `formula_${fCount + 1}`, type: 'formula', expr: '' });
                            renderColumns();
                        };

                        renderColumns();
                        renderVars();
                        break;
                    }

                    case 'C': {
                        const descInp      = document.getElementById(`cDescription_${pid}`);
                        const srcSel       = document.getElementById(`cSource_${pid}`);
                        const columnRow    = document.getElementById(`cColumnRow_${pid}`);
                        const columnSel    = document.getElementById(`cColumn_${pid}`);
                        const loopChk      = document.getElementById(`cUseLoop_${pid}`);
                        const loopParams   = document.getElementById(`cLoopParams_${pid}`);
                        const loopVarInp   = document.getElementById(`cLoopVar_${pid}`);
                        const loopFromInp  = document.getElementById(`cLoopFrom_${pid}`);
                        const loopToInp    = document.getElementById(`cLoopTo_${pid}`);
                        const loopStepInp  = document.getElementById(`cLoopStep_${pid}`);
                        const condInp      = document.getElementById(`cCondition_${pid}`);
                        const colChipsDiv  = document.getElementById(`cColChips_${pid}`);
                        const loopChipsRow = document.getElementById(`cLoopChipsRow_${pid}`);
                        const loopChipsDiv = document.getElementById(`cLoopChips_${pid}`);
                        const groupSel     = document.getElementById(`cGroup_${pid}`);
                        const fullStrDiv   = document.getElementById(`cFullStr_${pid}`);
                        const funcBtns     = document.getElementById(box.id).querySelectorAll('.pde_edit-panel .pde_func-btn[data-func]');

                        // ── helpers ───────────────────────────────────────
                        const getLoop = () => loopChk.checked ? {
                            var:  loopVarInp.value.trim() || 'i',
                            from: parseInt(loopFromInp.value) || 1,
                            to:   parseInt(loopToInp.value)   || 10,
                            step: parseInt(loopStepInp.value) || 1
                        } : null;

                        const updateFullStr = () => {
                            let s = box.jsonClone.Condition ?? '';
                            if (box.jsonClone.Loop) {
                                const l = box.jsonClone.Loop;
                                s = `$for{${l.var},${l.from},${l.to},${l.step}}:${s}`;
                            }
                            if (box.jsonClone.Group) s += ` @${box.jsonClone.Group}`;
                            fullStrDiv.textContent = s || '—';
                        };

                        const setActiveFunc = (func) => {
                            funcBtns.forEach(b => b.classList.toggle('active', b.dataset.func === func));
                            columnRow.style.display = func === 'COUNT' ? 'none' : '';
                        };

                        const populateColumnSel = () => {
                            columnSel.innerHTML = '<option value="">— all —</option>';
                            const srcBox = this.boxes.find(b => b.id === srcSel.value);
                            if (srcBox) this.getAlgoColsFromBox(srcBox)
                                .forEach(col => columnSel.appendChild(new Option(col, col)));
                            columnSel.value = box.jsonClone.Column ?? '';
                        };

                        const populateColChips = () => {
                            colChipsDiv.innerHTML = '';
                            const srcBox = this.boxes.find(b => b.id === srcSel.value);
                            if (!srcBox) return;
                            const currentFunc = box.jsonClone.Function || 'COUNT';
                            this.getAlgoColsFromBox(srcBox).forEach(col => {
                                const chip = document.createElement('span');
                                chip.className = 'pde_var-chip';
                                chip.textContent = col;
                                chip.onclick = () => { insertAtCursor(condInp, col); syncCond(); };
                                colChipsDiv.appendChild(chip);
                            });
                            if (currentFunc !== 'COUNT') {
                                this.getPlainColsFromBox(srcBox).forEach(col => {
                                    const chip = document.createElement('span');
                                    chip.className = 'pde_var-chip';
                                    chip.textContent = col;
                                    chip.onclick = () => { insertAtCursor(condInp, col); syncCond(); };
                                    colChipsDiv.appendChild(chip);
                                });
                            }
                        };

                        const populateGroup = () => {
                            groupSel.innerHTML = '<option value="">— none —</option>';
                            const srcBox = this.boxes.find(b => b.id === srcSel.value);
                            if (srcBox)
                                this.getPlainColsFromBox(srcBox)
                                    .forEach(col => groupSel.appendChild(new Option(col, col)));
                            groupSel.value = box.jsonClone.Group ?? '';
                        };

                        const renderLoopChips = () => {
                            loopChipsDiv.innerHTML = '';
                            const v = loopVarInp.value.trim() || 'i';
                            [`\${${v}}`, `\${${v}*10}`, `\${${v}*100}`, `\${${v}*1000}`].forEach(expr => {
                                const chip = document.createElement('span');
                                chip.className = 'pde_var-chip pde_var-chip-loop';
                                chip.textContent = expr;
                                chip.onclick = () => { insertAtCursor(condInp, expr); syncCond(); };
                                loopChipsDiv.appendChild(chip);
                            });
                        };

                        const syncCond = () => {
                            box.jsonClone.Condition = condInp.value;
                            updateFullStr();
                        };

                        // ── init ──────────────────────────────────────────
                        descInp.value     = box.jsonClone.Description ?? '';
                        condInp.value     = box.jsonClone.Condition   ?? '';
                        const loop        = box.jsonClone.Loop;
                        loopChk.checked   = !!loop;
                        loopVarInp.value  = loop?.var  ?? 'i';
                        loopFromInp.value = loop?.from ?? 1;
                        loopToInp.value   = loop?.to   ?? 10;
                        loopStepInp.value = loop?.step ?? 1;
                        loopParams.style.display   = loop ? '' : 'none';
                        loopChipsRow.style.display = loop ? '' : 'none';

                        srcSel.innerHTML = '';
                        this.boxes.filter(b => b.id !== box.id && Array.isArray(b.data) && b.data.length > 1 && Array.isArray(b.data[0]))
                            .forEach(b => srcSel.appendChild(new Option(b.name, b.id)));
                        srcSel.value = box.jsonClone.Source ?? '';

                        setActiveFunc(box.jsonClone.Function || 'COUNT');
                        populateColumnSel();
                        populateColChips();
                        populateGroup();
                        renderLoopChips();
                        updateFullStr();

                        // ── wire events ───────────────────────────────────
                        descInp.addEventListener('input', () => { box.jsonClone.Description = descInp.value; });

                        funcBtns.forEach(b => b.addEventListener('click', () => {
                            box.jsonClone.Function = b.dataset.func;
                            setActiveFunc(b.dataset.func);
                            populateColChips();
                        }));

                        columnSel.addEventListener('change', () => {
                            box.jsonClone.Column = columnSel.value;
                        });

                        srcSel.addEventListener('change', () => {
                            box.jsonClone.Source = srcSel.value;
                            populateColumnSel(); populateColChips(); populateGroup(); updateFullStr();
                        });

                        loopChk.addEventListener('change', () => {
                            box.jsonClone.Loop = getLoop();
                            loopParams.style.display   = loopChk.checked ? '' : 'none';
                            loopChipsRow.style.display = loopChk.checked ? '' : 'none';
                            updateFullStr();
                        });

                        const syncLoop = () => {
                            box.jsonClone.Loop = getLoop();
                            renderLoopChips(); updateFullStr();
                        };
                        [loopVarInp, loopFromInp, loopToInp, loopStepInp].forEach(el =>
                            el.addEventListener('input', syncLoop));

                        condInp.addEventListener('input', syncCond);

                        groupSel.addEventListener('change', () => {
                            box.jsonClone.Group = groupSel.value;
                            updateFullStr();
                        });

                        document.getElementById(`cCreate_${pid}`).onclick = () => this.refreshEditForm(box);

                        break;
                    }

                    case 'V': {
                        const descInp   = document.getElementById(`vDescription_${pid}`);
                        const entriesDiv = document.getElementById(`vEntries_${pid}`);
                        const chipsDiv  = document.getElementById(`vChips_${pid}`);

                        if (!Array.isArray(box.jsonClone.Entries)) box.jsonClone.Entries = [];

                        let focusedFormula = null;

                        const renderEntries = () => {
                            entriesDiv.innerHTML = '';
                            box.jsonClone.Entries.forEach((entry, i) => {
                                const row = document.createElement('div');
                                row.style.cssText = 'display:grid; grid-template-columns:28px 130px 1fr 26px; align-items:center; border-bottom:1px solid #eee; min-height:28px;';
                                const nameVal    = (entry.name    || '').replace(/"/g, '&quot;');
                                const formulaVal = (entry.formula || '').replace(/"/g, '&quot;');
                                row.innerHTML = `
                                    <span style="text-align:center; font-size:11px; color:#888; user-select:none;">${i + 1}</span>
                                    <input type="text" value="${nameVal}" placeholder="name"
                                        data-role="name" data-idx="${i}"
                                        style="border:none; border-right:1px solid #eee; padding:2px 5px; font-size:12px; outline:none; width:100%; box-sizing:border-box; background:transparent;">
                                    <input type="text" value="${formulaVal}" placeholder="formula…"
                                        data-role="formula" data-idx="${i}"
                                        style="border:none; padding:2px 5px; font-size:12px; font-family:monospace; outline:none; width:100%; box-sizing:border-box; background:transparent;">
                                    <button data-role="del" data-idx="${i}"
                                        style="border:none; background:none; color:#c44; cursor:pointer; font-size:15px; line-height:1; padding:0 4px;">×</button>
                                `;
                                const nameInp    = row.querySelector('[data-role="name"]');
                                const formulaInp = row.querySelector('[data-role="formula"]');
                                const delBtn     = row.querySelector('[data-role="del"]');
                                nameInp.addEventListener('input', () => { box.jsonClone.Entries[i].name = nameInp.value; });
                                formulaInp.addEventListener('input', () => { box.jsonClone.Entries[i].formula = formulaInp.value; });
                                formulaInp.addEventListener('focus', () => { focusedFormula = formulaInp; });
                                delBtn.addEventListener('click', () => {
                                    box.jsonClone.Entries.splice(i, 1);
                                    renderEntries();
                                    populateChips();
                                });
                                entriesDiv.appendChild(row);
                            });
                        };

                        const populateChips = () => {
                            chipsDiv.innerHTML = '';
                            // Box-name chips
                            this.boxes.filter(b => b.id !== box.id).forEach(b => {
                                const chip = document.createElement('span');
                                chip.className = 'pde_var-chip';
                                chip.textContent = b.name;
                                chip.onclick = () => { if (focusedFormula) { insertAtCursor(focusedFormula, b.name); focusedFormula.dispatchEvent(new Event('input')); } };
                                chipsDiv.appendChild(chip);
                            });
                            // #n chips for existing entries
                            box.jsonClone.Entries.forEach((e, i) => {
                                const chip = document.createElement('span');
                                chip.className = 'pde_var-chip pde_var-chip-loop';
                                chip.textContent = `#${i + 1}`;
                                chip.title = e.name || '';
                                chip.onclick = () => { if (focusedFormula) { insertAtCursor(focusedFormula, `#${i + 1}`); focusedFormula.dispatchEvent(new Event('input')); } };
                                chipsDiv.appendChild(chip);
                            });
                        };

                        descInp.value = box.jsonClone.Description ?? '';
                        descInp.addEventListener('input', () => { box.jsonClone.Description = descInp.value; });

                        renderEntries();
                        populateChips();

                        document.getElementById(`vAddEntry_${pid}`).onclick = () => {
                            box.jsonClone.Entries.push({ name: '', formula: '' });
                            renderEntries();
                            populateChips();
                            const inputs = entriesDiv.querySelectorAll('[data-role="formula"]');
                            if (inputs.length > 0) {
                                const last = inputs[inputs.length - 1];
                                last.focus();
                                focusedFormula = last;
                            }
                        };

                        document.getElementById(`vApply_${pid}`).onclick = () => {
                            populateChips();
                            this.refreshEditForm(box);
                        };

                        break;
                    }

                    case 'GF': {
                        const descInp = document.getElementById(`gfDescription_${pid}`);
                        const srcSel  = document.getElementById(`gfSource_${pid}`);

                        descInp.value = box.jsonClone.Description ?? '';
                        descInp.addEventListener('input', () => { box.jsonClone.Description = descInp.value; });

                        if (!Array.isArray(box.jsonClone.Ops)) box.jsonClone.Ops = [];

                        // Populate source dropdown
                        srcSel.innerHTML = '';
                        this.boxes
                            .filter(b => b.id !== box.id && Array.isArray(b.data) && b.data.length > 0 && Array.isArray(b.data[0]))
                            .forEach(b => srcSel.appendChild(new Option(b.name, b.id)));

                        // Default source: use stored value, fall back to first parent, then first option
                        if (!box.jsonClone.Source && box.parents && box.parents.length > 0)
                            box.jsonClone.Source = box.parents[0];
                        srcSel.value = box.jsonClone.Source ?? '';
                        if (!srcSel.value && srcSel.options.length > 0) {
                            srcSel.value = srcSel.options[0].value;
                            box.jsonClone.Source = srcSel.value;
                        }

                        const getHdrs = () => {
                            const sb = this.boxes.find(b => b.id === srcSel.value);
                            return (sb && Array.isArray(sb.data) && sb.data.length > 0) ? sb.data[0] : [];
                        };

                        // Plain (non-algorithm) fields — for gf-col-sel and gf-field-sel
                        const getColOptions = () => {
                            const srcBox = this.boxes.find(b => b.id === srcSel.value);
                            return this.getPlainColsFromBox(srcBox);
                        };

                        // All fields (plain + algo short names) — for gf-pat-sel and gf-cond-col-sel
                        const getAllColOptions = () => {
                            const srcBox = this.boxes.find(b => b.id === srcSel.value);
                            return [...this.getPlainColsFromBox(srcBox), ...this.getAlgoColsFromBox(srcBox)];
                        };

                        // Generic select builder: options array, selected value, CSS class
                        const mkSel = (options, val, cls) => {
                            const el = document.createElement('select');
                            el.className = cls;
                            options.forEach(o => el.appendChild(new Option(o, o)));
                            el.value = (options.includes(val) ? val : null) ?? options[0] ?? '';
                            return el;
                        };

                        const updateFullStr = () => {
                            const div = document.getElementById(`gfFullStr_${pid}`);
                            if (div) div.textContent = buildGfOpStrings(box.jsonClone.Ops).join('\n') || '—';
                        };

                        const renderOps = () => {
                            const container = document.getElementById(`gfOps_${pid}`);
                            if (!container) return;
                            container.innerHTML = '';
                            const ops = box.jsonClone.Ops;
                            const cols = getColOptions();   // short, deduplicated column names

                            ops.forEach((op, idx) => {
                                const card = document.createElement('div');
                                card.className = `gf-op-card gf-op-${op.type}`;

                                // ── Card header ─────────────────────────────────────
                                const hdr = document.createElement('div');
                                hdr.className = 'gf-op-header';

                                const badge = document.createElement('span');
                                if (op.type === 'filter') {
                                    badge.className = 'gf-op-badge gf-badge-filter';
                                    badge.innerHTML = '<i class="fas fa-filter"></i> FILTER';
                                    hdr.appendChild(badge);
                                    const sp = document.createElement('span'); sp.style.flex = '1';
                                    hdr.appendChild(sp);
                                } else {
                                    badge.className = 'gf-op-badge gf-badge-groupby';
                                    badge.innerHTML = '<i class="fas fa-layer-group"></i> GROUP BY';
                                    hdr.appendChild(badge);
                                    const fieldSel = mkSel(cols, op.field, 'gf-field-sel');
                                    fieldSel.onchange = () => { op.field = fieldSel.value; updateFullStr(); };
                                    hdr.appendChild(fieldSel);
                                    const sp = document.createElement('span'); sp.style.flex = '1';
                                    hdr.appendChild(sp);
                                }

                                const upBtn = document.createElement('button');
                                upBtn.className = 'gf-updn-btn'; upBtn.textContent = '▲'; upBtn.disabled = idx === 0;
                                upBtn.onclick = () => { [ops[idx-1], ops[idx]] = [ops[idx], ops[idx-1]]; renderOps(); updateFullStr(); };

                                const dnBtn = document.createElement('button');
                                dnBtn.className = 'gf-updn-btn'; dnBtn.textContent = '▼'; dnBtn.disabled = idx === ops.length - 1;
                                dnBtn.onclick = () => { [ops[idx], ops[idx+1]] = [ops[idx+1], ops[idx]]; renderOps(); updateFullStr(); };

                                const delBtn = document.createElement('button');
                                delBtn.className = 'gf-del-op-btn'; delBtn.innerHTML = '<i class="fas fa-times"></i>';
                                delBtn.onclick = () => { ops.splice(idx, 1); renderOps(); updateFullStr(); };

                                hdr.append(upBtn, dnBtn, delBtn);
                                card.appendChild(hdr);

                                // ── Filter body ─────────────────────────────────────
                                if (op.type === 'filter') {
                                    if (!Array.isArray(op.clauses)) op.clauses = [];
                                    const clausesDiv = document.createElement('div');
                                    clausesDiv.className = 'gf-clauses';

                                    const renderClauses = () => {
                                        clausesDiv.innerHTML = '';
                                        op.clauses.forEach((clause, ci) => {
                                            if (ci > 0) {
                                                const boolBtn = document.createElement('button');
                                                boolBtn.className = 'gf-bool-btn';
                                                boolBtn.textContent = clause.bool || '&&';
                                                boolBtn.title = 'Click to toggle AND / OR';
                                                boolBtn.onclick = () => {
                                                    clause.bool = clause.bool === '&&' ? '||' : '&&';
                                                    boolBtn.textContent = clause.bool;
                                                    updateFullStr();
                                                };
                                                clausesDiv.appendChild(boolBtn);
                                            }
                                            const row = document.createElement('div');
                                            row.className = 'gf-clause-row';
                                            const colSel = mkSel(cols, clause.col, 'gf-col-sel');
                                            colSel.onchange = () => { clause.col = colSel.value; updateFullStr(); };
                                            const opSel = mkSel(GF_OPS, clause.op, 'gf-op-sel');
                                            opSel.onchange = () => { clause.op = opSel.value; updateFullStr(); };
                                            const valInp = document.createElement('input');
                                            valInp.type = 'text'; valInp.className = 'gf-val-inp';
                                            valInp.value = clause.val ?? ''; valInp.placeholder = 'value';
                                            valInp.oninput = () => { clause.val = valInp.value; updateFullStr(); };
                                            const delC = document.createElement('button');
                                            delC.className = 'gf-del-clause-btn'; delC.innerHTML = '<i class="fas fa-times"></i>';
                                            delC.onclick = () => {
                                                op.clauses.splice(ci, 1);
                                                if (op.clauses.length > 0) delete op.clauses[0].bool;
                                                renderClauses(); updateFullStr();
                                            };
                                            row.append(colSel, opSel, valInp, delC);
                                            clausesDiv.appendChild(row);
                                        });
                                        // + AND / + OR buttons
                                        const addRow = document.createElement('div');
                                        addRow.className = 'gf-add-clause-row';
                                        ['&&', '||'].forEach(bool => {
                                            const btn = document.createElement('button');
                                            btn.className = 'gf-add-clause-btn';
                                            btn.textContent = bool === '&&' ? '+ AND' : '+ OR';
                                            btn.onclick = () => {
                                                op.clauses.push({ bool, col: cols[0] ?? '', op: '==', val: '' });
                                                renderClauses(); updateFullStr();
                                            };
                                            addRow.appendChild(btn);
                                        });
                                        clausesDiv.appendChild(addRow);
                                    };
                                    renderClauses();
                                    card.appendChild(clausesDiv);

                                // ── GroupBy body ────────────────────────────────────
                                } else {
                                    if (!Array.isArray(op.addons)) op.addons = [];
                                    const addonsDiv = document.createElement('div');
                                    addonsDiv.className = 'gf-addons';

                                    const renderAddons = () => {
                                        addonsDiv.innerHTML = '';
                                        op.addons.forEach((addon, ai) => {
                                            const row = document.createElement('div');
                                            row.className = 'gf-addon-row';
                                            const patSel = mkSel(['*', ...getAllColOptions()], addon.pattern, 'gf-pat-sel');
                                            patSel.onchange = () => { addon.pattern = patSel.value; updateFullStr(); };
                                            const colon = document.createElement('span');
                                            colon.className = 'gf-colon'; colon.textContent = ':';
                                            const funcSel = mkSel(GF_FUNCS, addon.func, 'gf-func-sel');
                                            funcSel.onchange = () => { addon.func = funcSel.value; updateFullStr(); };
                                            const condBtn = document.createElement('button');
                                            condBtn.className = 'gf-cond-btn' + (addon.hasCond ? ' active' : '');
                                            condBtn.textContent = 'where'; condBtn.title = 'Aggregate only rows where condition is true';
                                            condBtn.onclick = () => { addon.hasCond = !addon.hasCond; renderAddons(); updateFullStr(); };
                                            row.append(patSel, colon, funcSel, condBtn);
                                            if (addon.hasCond) {
                                                const ccSel = mkSel(getAllColOptions(), addon.condCol, 'gf-cond-col-sel');
                                                ccSel.onchange = () => { addon.condCol = ccSel.value; updateFullStr(); };
                                                const coSel = mkSel(GF_OPS, addon.condOp, 'gf-cond-op-sel');
                                                coSel.onchange = () => { addon.condOp = coSel.value; updateFullStr(); };
                                                const cvInp = document.createElement('input');
                                                cvInp.type = 'text'; cvInp.className = 'gf-cond-val-inp';
                                                cvInp.value = addon.condVal ?? ''; cvInp.placeholder = 'value';
                                                cvInp.oninput = () => { addon.condVal = cvInp.value; updateFullStr(); };
                                                row.append(ccSel, coSel, cvInp);
                                            }
                                            const delA = document.createElement('button');
                                            delA.className = 'gf-del-clause-btn'; delA.innerHTML = '<i class="fas fa-times"></i>';
                                            delA.onclick = () => { op.addons.splice(ai, 1); renderAddons(); updateFullStr(); };
                                            row.appendChild(delA);
                                            addonsDiv.appendChild(row);
                                        });
                                        const addAddonBtn = document.createElement('button');
                                        addAddonBtn.className = 'gf-add-clause-btn';
                                        addAddonBtn.innerHTML = '<i class="fas fa-plus"></i> Rule';
                                        addAddonBtn.style.margin = '2px 0 4px';
                                        addAddonBtn.onclick = () => {
                                            op.addons.push({ pattern: '*', func: 'FIRST', hasCond: false, condCol: getAllColOptions()[0] ?? '', condOp: '==', condVal: '' });
                                            renderAddons(); updateFullStr();
                                        };
                                        addonsDiv.appendChild(addAddonBtn);
                                    };
                                    renderAddons();
                                    card.appendChild(addonsDiv);
                                }

                                container.appendChild(card);
                            });
                        };

                        // Wire add-operation buttons
                        const scrollLastOp = () => {
                            const container = document.getElementById(`gfOps_${pid}`);
                            if (container && container.lastElementChild)
                                container.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        };
                        document.getElementById(`gfAddFilter_${pid}`).onclick = () => {
                            box.jsonClone.Ops.push({ type: 'filter', clauses: [{ col: getColOptions()[0] ?? '', op: '==', val: '' }] });
                            renderOps(); updateFullStr(); scrollLastOp();
                        };
                        document.getElementById(`gfAddGroupBy_${pid}`).onclick = () => {
                            box.jsonClone.Ops.push({ type: 'groupby', field: getColOptions()[0] ?? '', addons: [] });
                            renderOps(); updateFullStr(); scrollLastOp();
                        };
                        document.getElementById(`gfApply_${pid}`).onclick = () => this.refreshEditForm(box);

                        srcSel.addEventListener('change', () => {
                            box.jsonClone.Source = srcSel.value;
                            renderOps(); updateFullStr();
                            this.refreshEditForm(box);
                        });

                        renderOps();
                        updateFullStr();
                        this.refreshEditForm(box);
                        break;
                    }
                  }
                },

                // ── Usages ────────────────────────────────────────────────
                getBoxUsages(boxId) {
                    const usages = [];
                    const typeIcons = {
                        'Table': 'fas fa-table', 'Graph': 'fas fa-chart-bar',
                        'TextBox': 'fas fa-font', 'Image': 'fas fa-image'
                    };

                    // helper: build per-box regex for $token{boxName...} detection in htmltext
                    const box = this.boxes.find(b => b.id === boxId);
                    const boxName = box?.name;
                    const tbRefRegex = boxName
                        ? new RegExp(`\\$\\w+\\{${boxName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\W|$)`)
                        : null;

                    // derived PDE boxes (children whose parents include this box)
                    this.boxes
                        .filter(b => Array.isArray(b.parents) && b.parents.includes(boxId))
                        .forEach(b => usages.push({ kind: 'derived', label: b.name, icon: BOXES[b.type]?.icon || 'fas fa-cube' }));

                    // views that use this box as data_source OR reference it in TextBox htmltext
                    if (name === 'playground_pde') {
                        if (typeof playgroundViews !== 'undefined') {
                            for (const [viewName, view] of playgroundViews) {
                                const vJSON = view.viewJSON || {};
                                const isTextBox     = viewName.startsWith('TextBox_');
                                const usedAsSource  = !isTextBox && vJSON['data_source'] === boxId;
                                const usedInTextbox = isTextBox && tbRefRegex && tbRefRegex.test(vJSON.htmltext || '');
                                if (usedAsSource || usedInTextbox) {
                                    const type = viewName.split('_')[0];
                                    usages.push({ kind: 'view', label: viewName, icon: typeIcons[type] || 'fas fa-chart-area' });
                                }
                            }
                        }
                    } else {
                        if (typeof pp !== 'undefined') {
                            for (const [presenterName, presJSON] of pp.presenterJSONs) {
                                if (!presJSON) continue;
                                const layout = presJSON.Layout || [];
                                const shortTitle = presJSON.ShortTitle || presenterName;
                                layout.flat().forEach(viewName => {
                                    const viewData = presJSON[viewName];
                                    if (!viewData) return;
                                    const isTextBox     = viewName.startsWith('TextBox_');
                                    const usedAsSource  = !isTextBox && viewData['data_source'] === boxId;
                                    const usedInTextbox = isTextBox && tbRefRegex && tbRefRegex.test(viewData.htmltext || '');
                                    if (usedAsSource || usedInTextbox) {
                                        const type = viewName.split('_')[0];
                                        usages.push({ kind: 'view', label: viewName, presenter: shortTitle, icon: typeIcons[type] || 'fas fa-chart-area' });
                                    }
                                });
                            }
                        }
                    }
                    return usages;
                },

                toggleUsages(boxId, btn) {
                    const existing = document.getElementById('pde_usages_popup');
                    if (existing) { existing.remove(); return; }

                    const usages = this.getBoxUsages(boxId);
                    const popup = document.createElement('div');
                    popup.id = 'pde_usages_popup';
                    popup.className = 'pde_usages-popup';

                    const derived = usages.filter(u => u.kind === 'derived');
                    const views   = usages.filter(u => u.kind === 'view');

                    if (usages.length === 0) {
                        popup.innerHTML = '<div class="pde_usages-empty"><i class="fas fa-info-circle"></i> Not used</div>';
                    } else {
                        let html = '';
                        if (derived.length > 0) {
                            html += `<div class="pde_usages-header">Derived boxes (${derived.length}):</div>` +
                                derived.map(u =>
                                    `<div class="pde_usages-item">` +
                                    `<i class="${u.icon}" style="width:14px;text-align:center;opacity:0.7"></i> ${u.label}` +
                                    `</div>`
                                ).join('');
                        }
                        if (views.length > 0) {
                            html += `<div class="pde_usages-header">Views (${views.length}):</div>` +
                                views.map(u =>
                                    `<div class="pde_usages-item">` +
                                    `<i class="${u.icon}" style="width:14px;text-align:center;opacity:0.7"></i> ${u.label}` +
                                    (u.presenter ? `<span class="pde_usages-presenter">${u.presenter}</span>` : '') +
                                    `</div>`
                                ).join('');
                        }
                        popup.innerHTML = html;
                    }

                    document.body.appendChild(popup);
                    const rect = btn.getBoundingClientRect();
                    popup.style.top  = (rect.bottom + 4) + 'px';
                    // align right edge of popup with right edge of button, clamped to viewport
                    const popW = popup.offsetWidth || 180;
                    popup.style.left = Math.max(4, rect.right - popW) + 'px';

                    const close = (e) => {
                        if (!popup.contains(e.target) && e.target !== btn) {
                            popup.remove();
                            document.removeEventListener('click', close);
                        }
                    };
                    setTimeout(() => document.addEventListener('click', close), 0);
                },

                updateUsageBadges() {
                    this.boxes.forEach(box => {
                        const badge = document.getElementById('pde_ubc_' + box.id);
                        if (!badge) return;
                        const count = this.getBoxUsages(box.id).length;
                        badge.textContent = count > 0 ? count : '';
                        badge.style.display = count > 0 ? 'flex' : 'none';
                    });
                },

                async refreshEditForm(box) {
                  const pid = `${this.name}_${box.id}`;
                  let tmpData = await this.compileData(box, box.jsonClone);
                  switch (box.type) {
                    case 'Q':
                      drawTable(tmpData, `show_data_table_${box.id}`, "250px", false);
                      break;
                    case 'T':
                      drawTable(tmpData, `show_data_table_${box.id}`, "160px", false);
                      break;
                    case 'V':
                      drawTable(tmpData, `show_data_table_${box.id}`, "160px", false);
                      break;
                    case 'C': {
                      drawTable(tmpData, `show_data_table_${box.id}`, "100%", false);
                      const cCountEl = document.getElementById(`cRowCount_${pid}`);
                      if (cCountEl) {
                          const n = Array.isArray(tmpData) && tmpData.length > 1 ? tmpData.length - 1 : 0;
                          cCountEl.textContent = n === 0 ? 'no rows' : `${n} row${n !== 1 ? 's' : ''}`;
                      }
                      break;
                    }
                    case 'GF': {
                      drawTable(tmpData, `show_data_table_${box.id}`, "100%", false);
                      const gfCountEl = document.getElementById(`gfRowCount_${pid}`);
                      if (gfCountEl) {
                          const n = Array.isArray(tmpData) && tmpData.length > 1 ? tmpData.length - 1 : 0;
                          gfCountEl.textContent = n === 0 ? 'no rows' : `${n} row${n !== 1 ? 's' : ''}`;
                      }
                      break;
                    }
                    case 'S': {
                      const resultEl = document.getElementById(`sResult_${pid}`);
                      if (resultEl) resultEl.textContent = (tmpData !== null && tmpData !== undefined)
                          ? `${box.jsonClone.Function}(${box.jsonClone.Column}) = ${tmpData}`
                          : '—';
                      if (!box._sDescLocked) {
                          const autoDesc = box.jsonClone.Column && box.jsonClone.Function
                              ? `${box.jsonClone.Function}(${box.jsonClone.Column})`
                              : '';
                          box.jsonClone.Description = autoDesc;
                          const descEl = document.getElementById(`sDescription_${pid}`);
                          if (descEl) descEl.value = autoDesc;
                      }
                      break;
                    }
                  }
                }
            };


            window['pde_' + name] = instance;
            return instance;
        }

