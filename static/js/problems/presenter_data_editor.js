        const EDIT_SIZES = {
            'Q': { w: 580, h: 580 }, 'A': { w: 320, h: 220 }, 'F': { w: 340, h: 240 },
            'P': { w: 420, h: 320 }, 'R': { w: 300, h: 200 }
        };
        const ARRAY_PREVIEW_K = 3;  // Show k x k preview of array data
        const H_LEN = 4;  // Header truncation: show H_LEN chars from start and end

        const pde = {
            boxes: [], boxCounter: 0, pendingRemoveId: null, pendingRenameId: null,
            canvas: document.getElementById('diagram_canvas'),
            svg: document.getElementById('svg_connections'),

            truncateHeader(header) {
                const headerStr = String(header);
                // Only truncate if necessary
                // Available width per column allows ~9 characters
                const maxChars = 2 * H_LEN + 1; // 9 chars
                
                if (headerStr.length > maxChars) {
                    // Show as many chars as possible with ellipsis in middle
                    // Format: startChars + "…" + endChars
                    const availableChars = maxChars - 1; // -1 for the ellipsis
                    const startChars = Math.ceil(availableChars / 2);
                    const endChars = Math.floor(availableChars / 2);
                    return headerStr.substring(0, startChars) + '…' + headerStr.substring(headerStr.length - endChars);
                }
                return headerStr;
            },

            clearState() {
                this.boxes = []; this.boxCounter = 0;
                document.querySelectorAll('.pde_box-card').forEach(c => c.remove());
                this.drawArrows();
            },

            loadJSON(jsonInput) {
                try {
                    const data = (typeof jsonInput === 'string') ? JSON.parse(jsonInput) : jsonInput;
                    this.clearState();
                    this.boxes = data;
                    let maxIdx = 0;
                    this.boxes.forEach(box => {
                        const idx = parseInt(box.name.replace('data_', '')) || 0;
                        if (idx > maxIdx) maxIdx = idx;
                    });
                    this.boxCounter = maxIdx;
                    this.boxes.forEach(box => this.renderBox(box, box.isEditing));
                    this.drawArrows();
                } catch (e) { alert("Load Error: " + e.message); }
            },

            init(data = null) { 
                this.canvas=document.getElementById('diagram_canvas');
                this.svg=document.getElementById('svg_connections');

                if (data) {
                    this.loadJSON(data);
                } else {
                    this.clearState();
                    // Create initial Q box
                    const initialBox = this.createBoxData('Q', null);
                    this.renderBox(initialBox, false);
                }
            },

            exportState() {
                const stateString = JSON.stringify(this.boxes);
                console.log("DIAGRAM_EXPORT:", stateString);
                return stateString;
            },

            removeBox(id) {
                this.pendingRemoveId = id;
                document.getElementById('confirm_modal').style.display = 'flex';
            },

            renameBox(id) {
                const box = this.boxes.find(b => b.id === id);
                if (!box) return;
                
                this.pendingRenameId = id;
                const modal = document.getElementById('rename_modal');
                const input = document.getElementById('rename_input');
                input.value = box.name;
                input.focus();
                input.select();
                modal.style.display = 'flex';
            },

            confirmRename() {
                const input = document.getElementById('rename_input');
                const newName = input.value.trim();
                
                if (!newName) {
                    alert('Box name cannot be empty');
                    return;
                }
                
                const id = this.pendingRenameId;
                const box = this.boxes.find(b => b.id === id);
                if (!box) return;
                
                box.name = newName;
                const el = document.getElementById(id);
                if (el) {
                    const nameSpan = el.querySelector('.pde_header-title span');
                    if (nameSpan) {
                        nameSpan.textContent = box.name;
                    }
                }
                
                this.cancelRename();
            },

            cancelRename() {
                document.getElementById('rename_modal').style.display = 'none';
                this.pendingRenameId = null;
            },

            confirmRemove(confirmed) {
                document.getElementById('confirm_modal').style.display = 'none';
                if (!confirmed) {
                    this.pendingRemoveId = null;
                    return;
                }
                
                const id = this.pendingRemoveId;
                const toRemoveIds = [];
                const findDescendants = (parentId) => {
                    toRemoveIds.push(parentId);
                    this.boxes.filter(b => b.parent === parentId).forEach(child => findDescendants(child.id));
                };
                findDescendants(id);
                this.boxes = this.boxes.filter(b => !toRemoveIds.includes(b.id));
                toRemoveIds.forEach(rid => {
                    const el = document.getElementById(rid);
                    if (el) el.remove();
                });
                this.drawArrows();
                this.pendingRemoveId = null;
            },

            getData(type, creationStr) {
                // Q, A, F always return 2D arrays
                if (['Q', 'A', 'F'].includes(type)) {
                    return [
                        ["ID", "N", "QuickSort.Tmin", "QuickSort.Tmax", "Pass"],
                        [101, 202, 303, 404, 505],
                        [106, 207, 308, 409, 510],
                        [111, 212, 313, 414, 515],
                        [116, 217, 318, 419, 520],
                        [121, 222, 323, 424, 525]
                    ];
                }
                // P, R always return scalars
                return "Status: OK";
            },

            addFirstClassBox() {
                const newBox = this.createBoxData('Q', null);
                this.renderBox(newBox, true);
            },

            centerFirstBox() {
                // Find the first box (root box with no parent, or the first created box)
                let firstBox = this.boxes.find(b => !b.parent);
                
                if (!firstBox) {
                    alert('No boxes to center');
                    return;
                }
                
                const el = document.getElementById(firstBox.id);
                if (!el) return;
                
                const panel_container = document.getElementById('presenters_data_panel');
                
                // Calculate scroll position to center the first box
                const targetScrollLeft = el.offsetLeft - (panel_container.clientWidth / 2) + (el.offsetWidth / 2);
                const targetScrollTop = el.offsetTop - (panel_container.clientHeight / 2) + (el.offsetHeight / 2);
                
                // Scroll to center with smooth animation
                panel_container.scrollLeft = targetScrollLeft;
                panel_container.scrollTop = targetScrollTop;
            },

            createBoxData(type, parentId) {
                this.boxCounter++;
                const id = 'box_' + Math.random().toString(36).substr(2, 9);
                
                // Get the center of the visible panel area
                const panel = document.getElementById('presenters_data_panel');
                const centerX = panel.scrollLeft + (panel.clientWidth / 2) - 180; // 180 is half of default box width (360)
                const centerY = panel.scrollTop + (panel.clientHeight / 2) - 65;  // 65 is half of default box height (130)
                
                const box = {
                    id: id, name: `data_${this.boxCounter}`, type: type,
                    parent: parentId, creationString: '{"note":"Double click to edit"}',
                    x: centerX, y: centerY, w: 360, h: 130,
                    isEditing: false, preEditSize: { w: 360, h: 130 }
                };
                if (parentId) {
                    const p = this.boxes.find(b => b.id === parentId);
                    if (p) { box.x = p.x + p.w + 100; box.y = p.y + 50; }
                }
                box.data = this.getData(type, box.creationString);
                this.boxes.push(box);
                return box;
            },

            renderBox(box, startInEdit = false) {
                const el = document.createElement('div');
                el.id = box.id;
                el.className = 'pde_box-card';
                el.style.left = box.x + 'px'; el.style.top = box.y + 'px';
                el.style.width = box.w + 'px'; el.style.height = box.h + 'px';

                el.innerHTML = `
                    <div class="pde_box-header pde_color-${box.type}">
                        <div class="pde_header-title">
                            <span>${box.name}</span>
                            <button class="pde_icon-btn" onclick="pde.renameBox('${box.id}')" title="Rename Box">
                                <i class="far fa-edit icon"></i>
                            </button>
                        </div>
                        <div class="pde_header-actions">
                            <button class="pde_icon-btn" onclick="pde.showDeriveModal('${box.id}')" title="Derive Child Box">
                                <i class="fas fa-code-branch"></i>
                            </button>
                            <button class="pde_icon-btn pde_btn-remove" onclick="pde.removeBox('${box.id}')" title="Remove Box">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="pde_box-content">
                        <div class="pde_creation-string-wrapper">
                            <div class="pde_creation-string" title='${box.creationString}'>${box.creationString}</div>
                            <button class="pde_edit-icon-btn" onclick="pde.toggleEditMode('${box.id}')" title="Edit Properties">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                        <div class="pde_data-area"></div>
                    </div>
                    <div class="pde_edit-panel">
                        <textarea>${box.creationString}</textarea>
                        <div style="display:flex; gap:8px; margin-top:8px">
                            <button onclick="pde.saveEdit('${box.id}')" style="flex:1">OK</button>
                            <button onclick="pde.toggleEditMode('${box.id}')" style="flex:1">Cancel</button>
                        </div>
                    </div>
                `;

                this.canvas.appendChild(el);
                this.initInteractions(el, box);
                
                // Set data area content after element is in DOM (for responsive sizing)
                const dataArea = el.querySelector('.pde_data-area');
                dataArea.innerHTML = this.renderDataPreview(box.data, el);
                
                // Scroll to center the new box in visible area
                setTimeout(() => {
                    const panel = document.getElementById('presenters_data_panel');
                    const boxRect = el.getBoundingClientRect();
                    const panelRect = panel.getBoundingClientRect();
                    
                    const centerX = (panelRect.width / 2) - (boxRect.width / 2);
                    const centerY = (panelRect.height / 2) - (boxRect.height / 2);
                    
                    panel.scrollLeft += boxRect.left - panelRect.left - centerX;
                    panel.scrollTop += boxRect.top - panelRect.top - centerY;
                }, 0);
                
                if (startInEdit) this.toggleEditMode(box.id, true);
            },

            renderDataPreview(data, boxElement = null) {
                if (Array.isArray(data)) {
                    const isMatrix = data.length > 0 && Array.isArray(data[0]);
                    
                    if (isMatrix) {
                        // Calculate number of rows and columns based on box size
                        let displayRows = ARRAY_PREVIEW_K;
                        let displayCols = ARRAY_PREVIEW_K;
                        
                        if (boxElement) {
                            // Get actual dimensions from the box element
                            const contentWidth = boxElement.offsetWidth;
                            const contentHeight = boxElement.offsetHeight;
                            
                            // Calculate minimum column width needed for truncated headers
                            // Truncated format: "XXXX…XXXX" = H_LEN + 1 (ellipsis) + H_LEN chars
                            // In monospace 10px font, each char is ~6px, plus padding
                            const charsPerColumn = 2 * H_LEN + 1; // e.g., 4 + 1 + 4 = 9 chars
                            const charWidth = 6; // approximate width per character in 10px monospace
                            const minCellWidth = (charsPerColumn * charWidth) + 8; // +8 for padding
                            
                            // Reserve space for icon (30px) and padding (20px)
                            const availableWidth = contentWidth - 50;
                            displayCols = Math.max(1, Math.floor(availableWidth / minCellWidth));
                            
                            // Account for creation-string area (~40px), data-area padding (16px) and borders
                            const availableHeight = contentHeight - 70;
                            const rowHeight = 16; // 10px font + 1.4 line-height + 2px margin + padding
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
                                const cellValue = this.truncateHeader(row[j]);
                                tableHTML += `<div class="pde_array-table-cell">${cellValue}</div>`;
                            }
                            
                            // Show dots if this row has more columns
                            if (hasMoreCols) {
                                tableHTML += '<div class="pde_array-table-cell">…</div>';
                            }
                            tableHTML += '</div>';
                        }
                        
                        // Show dots row if there are more rows below
                        if (hasMoreRows) {
                            tableHTML += '<div class="pde_array-table-row">';
                            // Fill with dots for each column
                            for (let j = 0; j < displayCols; j++) {
                                tableHTML += '<div class="pde_array-table-cell" style="color: #999;">·</div>';
                            }
                            // Add one more dot if there are more columns too
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
                                    <button class="pde_data-icon-btn" onclick="alert('Data: ${JSON.stringify(data).replace(/'/g, "\\'")})" title="Show all data">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }
                    
                    // 1D array fallback
                    const itemCount = data.length;
                    const matrixItems = [];
                    for (let i = 0; i < ARRAY_PREVIEW_K && i < data.length; i++) {
                        matrixItems.push(data[i]);
                    }
                    const preview = matrixItems.join(', ');
                    const moreText = itemCount > ARRAY_PREVIEW_K ? ` ...` : '';
                    return `
                        <div class="pde_data-area">
                            <div class="pde_value-array">
                                <div class="pde_value-array-info">[${itemCount}] ${preview}${moreText}</div>
                                <button class="pde_data-icon-btn" onclick="alert('Data: ${JSON.stringify(data).replace(/'/g, "\\'")})" title="Show all data">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }
                return `<div class="pde_data-area"><div class="pde_value-scalar">${data}</div></div>`;
            },

            initInteractions(el, box) {
                const header = el.querySelector('.pde_box-header');
                
                // Prevent drag when clicking on buttons
                const buttons = el.querySelectorAll('.pde_header-actions button');
                buttons.forEach(btn => {
                    btn.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                    });
                });
                
                header.onmousedown = (e) => {
                    if (e.target.closest('.pde_header-actions')) return;
                    let startX = e.clientX, startY = e.clientY;
                    document.onmousemove = (me) => {
                        box.x = Math.max(0, el.offsetLeft - (startX - me.clientX));
                        box.y = Math.max(0, el.offsetTop - (startY - me.clientY));
                        startX = me.clientX; startY = me.clientY;
                        el.style.left = box.x + 'px'; el.style.top = box.y + 'px';
                        this.drawArrows();
                    };
                    document.onmouseup = () => { document.onmousemove = null; };
                };

                new ResizeObserver(() => {
                    if (!box.isEditing) {
                        box.w = el.offsetWidth; box.h = el.offsetHeight;
                        // Recalculate data display for responsive sizing
                        const dataArea = el.querySelector('.pde_data-area');
                        if (dataArea && Array.isArray(box.data)) {
                            dataArea.innerHTML = this.renderDataPreview(box.data, el);
                        }
                    }
                    this.drawArrows();
                }).observe(el);
            },

            toggleEditMode(id, force = false) {
                const box = this.boxes.find(b => b.id === id);
                const el = document.getElementById(id);
                const panel = el.querySelector('.pde_edit-panel');
                const content = el.querySelector('.pde_box-content');
                const panel_container = document.getElementById('presenters_data_panel');

                box.isEditing = force || !box.isEditing;
                if (box.isEditing) {
                    el.classList.add('pde_is-editing');
                    el.style.zIndex = "1000";
                    box.preEditSize = { w: el.offsetWidth, h: el.offsetHeight };
                    const es = EDIT_SIZES[box.type];
                    el.style.width = es.w + 'px'; el.style.height = es.h + 'px';
                    panel.style.display = 'block'; content.style.display = 'none';
                    
                    // Scroll the box to center of visible area after layout has updated
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const boxRect = el.getBoundingClientRect();
                            const panelRect = panel_container.getBoundingClientRect();
                            
                            // Calculate the new center position for the box
                            const targetScrollLeft = el.offsetLeft - (panelRect.width / 2) + (boxRect.width / 2);
                            const targetScrollTop = el.offsetTop - (panelRect.height / 2) + (boxRect.height / 2);
                            
                            // Scroll smoothly to center
                            panel_container.scrollLeft = targetScrollLeft;
                            panel_container.scrollTop = targetScrollTop;
                        });
                    });
                } else {
                    el.classList.remove('pde_is-editing');
                    el.style.zIndex = "10";
                    panel.style.display = 'none'; content.style.display = 'flex';
                    el.style.width = box.preEditSize.w + 'px'; el.style.height = box.preEditSize.h + 'px';
                    box.w = box.preEditSize.w; box.h = box.preEditSize.h;
                }
                this.drawArrows();
            },

            saveEdit(id) {
                const box = this.boxes.find(b => b.id === id);
                const el = document.getElementById(id);
                const val = el.querySelector('textarea').value;
                try {
                    JSON.parse(val);
                    box.creationString = val;
                    box.data = this.getData(box.type, val);
                    el.querySelector('.pde_creation-string').innerText = val;
                    const dataArea = el.querySelector('.pde_data-area');
                    dataArea.innerHTML = this.renderDataPreview(box.data, el);
                    this.toggleEditMode(id);
                } catch (e) { alert("Invalid JSON"); }
            },

            showDeriveModal(parentId) {
                const container = document.getElementById('modal_type_buttons');
                container.innerHTML = '';
                ['A','F','P','R'].forEach(t => {
                    const b = document.createElement('button');
                    b.innerText = `Type ${t}`;
                    b.style.padding = '8px 16px';
                    b.style.margin = '4px';
                    b.style.cursor = 'pointer';
                    b.style.borderRadius = '4px';
                    b.style.border = '1px solid #999';
                    b.style.background = '#fff';
                    b.style.fontWeight = '600';
                    b.style.transition = 'background 0.2s';
                    b.onmouseover = () => b.style.background = '#f0f0f0';
                    b.onmouseout = () => b.style.background = '#fff';
                    b.onclick = () => {
                        const childBox = this.createBoxData(t, parentId);
                        this.renderBox(childBox, true);
                        document.getElementById('type_modal').style.display = 'none';
                    };
                    container.appendChild(b);
                });
                document.getElementById('type_modal').style.display = 'flex';
            },

            drawArrows() {
                // Remove all existing paths but keep defs
                const paths = this.svg.querySelectorAll('path:not(defs path)');
                paths.forEach(p => p.remove());

                this.boxes.forEach(child => {
                    if (child.parent) {
                        const p = this.boxes.find(b => b.id === child.parent);
                        if (p) {
                            const sX = p.x + p.w; 
                            const sY = p.y + (p.h / 2);
                            const eX = child.x; 
                            const eY = child.y + (child.h / 2);
                            
                            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                            const cp = sX + (eX - sX) / 2;
                            
                            path.setAttribute("d", `M ${sX} ${sY} C ${cp} ${sY}, ${cp} ${eY}, ${eX} ${eY}`);
                            path.setAttribute("stroke", "#444"); 
                            path.setAttribute("stroke-width", "2");
                            path.setAttribute("fill", "none");
                            
                            // FIX: Added direct reference to the marker ID
                            path.setAttribute("marker-end", "url(#arrowhead)");
                            
                            this.svg.appendChild(path);
                        }
                    }
                });
            }
        };