const EDIT_SIZES = {
    'Q': { w: 580, h: 580 }, 'A': { w: 320, h: 220 }, 'F': { w: 340, h: 240 },
    'P': { w: 420, h: 320 }, 'R': { w: 300, h: 200 }
};
const app = {
    boxes: [], boxCounter: 0, pendingRemoveId: null,
    canvas: document.getElementById('diagram_canvas'),
    svg: document.getElementById('svg_connections'),
    clearState() {
        this.boxes = []; this.boxCounter = 0;
        document.querySelectorAll('.box-card').forEach(c => c.remove());
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
      this.canvas = document.getElementById('diagram_canvas'),
      this.svg    = document.getElementById('svg_connections'),

      data ? this.loadJSON(data) : this.clearState(); 
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
        return Math.random() > 0.5 ? "Status: OK" : [101, 202, 303];
    },
    addFirstClassBox() {
        const newBox = this.createBoxData('Q', null);
        this.renderBox(newBox, true);
    },
    createBoxData(type, parentId) {
        this.boxCounter++;
        const id = 'box_' + Math.random().toString(36).substr(2, 9);
        
        // Get the center of the visible panel area
        const panel = document.getElementById('presenters_data_panel');
        const centerX = panel.scrollLeft + (panel.clientWidth / 2) - 110; // 110 is half of default box width (220)
        const centerY = panel.scrollTop + (panel.clientHeight / 2) - 65;  // 65 is half of default box height (130)
        
        const box = {
            id: id, name: `data_${this.boxCounter}`, type: type,
            parent: parentId, creationString: '{"note":"Double click to edit"}',
            x: centerX, y: centerY, w: 220, h: 130,
            isEditing: false, preEditSize: { w: 220, h: 130 }
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
        el.className = 'box-card';
        el.style.left = box.x + 'px'; el.style.top = box.y + 'px';
        el.style.width = box.w + 'px'; el.style.height = box.h + 'px';
        el.innerHTML = `
            <div class="box-header color-${box.type}">
                <span>${box.name}</span>
                <div class="header-actions">
                    <button class="icon-btn" onclick="app.showDeriveModal('${box.id}')" title="Derive Child">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="icon-btn btn-remove" onclick="app.removeBox('${box.id}')" title="Remove Box">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="box-content">
                <div class="creation-string" title='${box.creationString}'>${box.creationString}</div>
                <div class="data-area">${this.renderDataPreview(box.data)}</div>
                <button class="edit-toggle-btn" onclick="app.toggleEditMode('${box.id}')" style="margin-top:auto">Edit Properties</button>
            </div>
            <div class="edit-panel">
                <textarea>${box.creationString}</textarea>
                <div style="display:flex; gap:8px; margin-top:8px">
                    <button onclick="app.saveEdit('${box.id}')" style="flex:1">OK</button>
                    <button onclick="app.toggleEditMode('${box.id}')" style="flex:1">Cancel</button>
                </div>
            </div>
        `;
        this.canvas.appendChild(el);
        this.initInteractions(el, box);
        
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
    renderDataPreview(data) {
        if (Array.isArray(data)) return `<button onclick="alert('Data: ${JSON.stringify(data)}')"><i class="far fa-list-alt"></i> Show Data</button>`;
        return `<div style="font-weight:600">Value: ${data}</div>`;
    },
    initInteractions(el, box) {
        const header = el.querySelector('.box-header');
        
        // Prevent drag when clicking on buttons
        const buttons = el.querySelectorAll('.header-actions button');
        buttons.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        });
        
        header.onmousedown = (e) => {
            if (e.target.closest('.header-actions')) return;
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
            }
            this.drawArrows();
        }).observe(el);
    },
    toggleEditMode(id, force = false) {
        const box = this.boxes.find(b => b.id === id);
        const el = document.getElementById(id);
        const panel = el.querySelector('.edit-panel');
        const content = el.querySelector('.box-content');
        const panel_container = document.getElementById('presenters_data_panel');
        box.isEditing = force || !box.isEditing;
        if (box.isEditing) {
            el.classList.add('is-editing');
            el.style.zIndex = "1000";
            box.preEditSize = { w: el.offsetWidth, h: el.offsetHeight };
            const es = EDIT_SIZES[box.type];
            el.style.width = es.w + 'px'; el.style.height = es.h + 'px';
            panel.style.display = 'block'; content.style.display = 'none';
            
            // Scroll the box to center of visible area
            setTimeout(() => {
                const boxRect = el.getBoundingClientRect();
                const panelRect = panel_container.getBoundingClientRect();
                
                // Calculate center position
                const centerX = (panelRect.width / 2) - (boxRect.width / 2);
                const centerY = (panelRect.height / 2) - (boxRect.height / 2);
                
                // Scroll to center
                panel_container.scrollLeft += centerX - boxRect.left + panelRect.left;
                panel_container.scrollTop += centerY - boxRect.top + panelRect.top;
            }, 0);
        } else {
            el.classList.remove('is-editing');
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
            el.querySelector('.creation-string').innerText = val;
            el.querySelector('.data-area').innerHTML = this.renderDataPreview(box.data);
            this.toggleEditMode(id);
        } catch (e) { alert("Invalid JSON"); }
    },
    showDeriveModal(parentId) {
        const container = document.getElementById('modal_type_buttons');
        container.innerHTML = '';
        ['Q','A','F','P','R'].forEach(t => {
            const b = document.createElement('button');
            b.innerText = `Type ${t}`;
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