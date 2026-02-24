projectName = "unknown";

function timeAgo(timestamp) {
    const now = Date.now();
    const diff = Math.floor(now/1000) - timestamp; // Difference in seconds

    if (diff < 60) return `${diff} seconds ago`;
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(days / 365);
    return `${years} years ago`;
}
function truncateText(text, len=500) {
    if (text.length <= len) return text;
    let words = text.split(" ");
    let charCount = 0;
    let truncatedText = "";
    for (let word of words) {
        charCount += word.length + 1; // +1 for the space
        if (charCount > len) break;
        truncatedText += word + " ";
    }
    return truncatedText.trim() + " ...";
}


class Project {
  constructor(eid, name, shortTitle, description, tags, modified, algorithms, testsets, owner, ownerName, popularity) {
    this.eid           = eid; 
    this.name          = name;        
    this.shortTitle    = shortTitle;
    this.description   = description; 
    this.tags          = tags;        
    this.modified      = modified;    
    this.algorithms    = algorithms;   
    this.testsets      = testsets;  
    this.owner         = owner;
    this.ownerName     = ownerName;
    this.pop           = popularity;
  }

  // does name, description or any tag contain search string?
  includes(search) {
    let ss = search.toLowerCase();
    let includes = false;
    this.tags.forEach(tag => includes |= tag.toLowerCase().includes(ss));
    return includes || this.name.toLowerCase().includes(ss) || this.description.toLowerCase().includes(ss);
  }
}

let projects = []
function addProject(eid, name, shortTitle, description, tags, modified, algorithms, testsets, owner, ownerName, popularity) {
  projects.push(new Project(eid, name, shortTitle, description, tags, modified, algorithms, testsets, owner, ownerName, popularity));
}

function getByHTML(name) {
  if (name)
    if (name==current_user_username)
        return "You";
    else 
    return name;
  else 
    return `(local project)`;
}

function getProjectHTML(proj) {
  let tags = ""; proj.tags.forEach(tag => tags+=`<span id="project_tag_${proj.eid}_${tag}" class="tag">${tag}</span>`);
  let sTit = proj.shortTitle; if (!sTit || sTit=="?") sTit = proj.name;
  let desc = truncateText(proj.description, 500); 

  let privatenessSpanHolder = (!proj.ownerName || (proj.eid == 'e?')) ? 
  '' : `<span name="privateness_span_holder" key="${proj.eid}" ename="${proj.name}"></span>`;


  return `
    <tr data-date="${proj.modified}" style="display:none" id="project_row_${proj.eid}">
        <td>
          <span id="project_name_${proj.eid}" class="project-title" onclick="redirectToUrlWithParams('/project/${proj.name}', {homepoint: true });" title="Project ${proj.name}">${sTit}</span>
          <span class="project-desc">${desc}</span>
          <div class="tag-list">${tags}</div>
        </td>
        <td class="dividabletd">
          <div class="owner-info">
            ${privatenessSpanHolder} <span>${getByHTML(proj.ownerName)}</span>
          </div>
        </td>
        <td>${ timeAgo(proj.modified) }</td>
        <td>
          <i id="download_project"                    title="Download project" class="fas fa-download actico"                                           style="cursor:pointer"></i> 
          <i id="remove_project"   eid="${proj.eid}"  title="Remove project"   class="fas fa-times icon actico removeProject"  w="${proj.eid} cw" style="cursor:pointer; display:none" onclick="removeEntity(this, removeProjectTraces, '${proj.name}');"></i>      
        </td>
    </tr>
  `;
}

function createCards() {
  const tableBody = document.getElementById("projectsBody");  
  projects.forEach(function (project) {
    tableBody.innerHTML += getProjectHTML(project);
  });
}


// remove all remaining traces of project on page after removal
function removeProjectTraces(eid, projName) {
  // remove from table
  const projTr = document.getElementById(`project_row_${eid}`);
  if (projTr) projTr.remove();

  // remove from "Projects" array
  projects = projects.filter(p => p.eid !== eid);

  updateVisibilityG();
}



// shows remove buttons (x) for projects that can be removed by current user
async function showRemoveButtons(context = document) {
  const removeButtons = context.querySelectorAll('.removeProject');

  for (const element of removeButtons) {
    let canEdit = false;

    try {
      const w = element.getAttribute("w").split(" ");
      canEdit = await can(w[0], pShorts.get(w[1]));
      // console.log(`${w[0]},${w[1]}: ${pShorts.get(w[1])} = ${canEdit}`);
    } catch (e) {
      canEdit = false;
    }

    element.style.display = canEdit ? "" : "none";
  }
}



function changePrivatnesss(key, is_private) {
  runNamedService(ausers.services, "set_private", {'eid':key, 'private': is_private ? "True" : "False"}, (result)=>{/* ignore erros*/});
}

function traverseEntities(entity, state, callback) {
  if (!entity?.entities) return;

  for (const child of Object.values(entity.entities)) {
    if (!child?.entities) continue;

    for (const [key, grandChild] of Object.entries(child.entities)) {
      callback(key, state);
      traverseEntities(grandChild, state, callback);
    }
  }
}


function askForProjectPrivatnessChange(entity, state) {
  let nstate = state ? "private" : "public";
  let smsg = state ? "lock" : "unlock";
  showYesNoDialog(`The project is now ${nstate}. Do you also want to ${smsg} all algorithms, test sets, and presenters in the project?`, 
      projectPrivatnessChange , 'no_param', state, entity);
}

function projectPrivatnessChange(action, no_param, new_state, entity) {
 if (action == 0)  { // do change privatness
    traverseEntities(entity, new_state, changePrivatnesss);
 }
}

let updateVisibilityG = null;
// filtering and sorting logic
document.addEventListener('DOMContentLoaded', async () => {
    await populatePrivatnessSpans("project", document, askForProjectPrivatnessChange);


    const searchInput = document.querySelector('.search-input');
    const clearBtn = document.getElementById('clearSearch');
    const projectRows = Array.from(document.querySelectorAll('tbody tr'));
    const filterBtns = document.querySelectorAll('.filter-btn');
    const table = document.querySelector('table');
    const headers = table.querySelectorAll('th');

    const noProblemsDiv = document.getElementById("no_problems");

    // 1. Store original HTML and clean data for sorting/resetting
    const originalContentMap = new Map();
    const rowData = projectRows.map((row, index) => {
        originalContentMap.set(index, row.innerHTML);
        return {
            element: row,
            index: index,
            // Clean text for sorting
            title: row.querySelector('.project-title').textContent.trim().toLowerCase(),
            owner: row.cells[1].textContent.trim().toLowerCase(),
            date: row.getAttribute('data-date') || "" 
        };
    });


    let currentSort = { column: null, asc: true };

    const updateVisibility = () => {
        const rawSearch = searchInput.value.toLowerCase().trim();
        const searchWords = rawSearch ? rawSearch.split(/\s+/) : [];
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        const filterType = activeFilterBtn ? activeFilterBtn.id : 'btnAll';

        rowData.forEach((data) => {
            const row = data.element;
            // Reset to original state before filtering/highlighting
            row.innerHTML = originalContentMap.get(data.index);

            const textContent = row.textContent.toLowerCase();
            const tagsEl = row.querySelector('.tag-list');
            const isSandbox = tagsEl && tagsEl.textContent.toLowerCase().includes('sandbox');
            const isMine = data.owner.includes('you');

            // Multi-word AND search
            const matchesSearch = searchWords.every(word => textContent.includes(word));
            
            // Category Filter Logic
            let matchesFilter = false;
            if (filterType === 'btnAll') {
                matchesFilter = (searchWords.length > 0) || !isSandbox;
            } else if (filterType === 'btnMy') {
                matchesFilter = isMine;
            } else if (filterType === 'btnSandbox') {
                matchesFilter = isSandbox;
            }

            if (matchesSearch && matchesFilter) {
                row.style.display = "";
                if (searchWords.length > 0) applySafeHighlighting(row, searchWords);
            } else {
                row.style.display = "none";
            }
        });
        showHidePrivatenessIcons();

        const visibleRows = [...table.tBodies[0].rows].filter(row => row.offsetParent !== null).length;
        let noProblemsTxt = `No projects found in category '${filterType.replaceAll('btn', '')}'`;
        if (rawSearch) noProblemsTxt += ` (filter: '${rawSearch}')`;
        noProblemsDiv.style.display = visibleRows > 0 ? "none" : "";
        noProblemsDiv.innerHTML = noProblemsTxt;

        showRemoveButtons();
    };
    updateVisibilityG = updateVisibility;

    // --- SORTING LOGIC ---
    headers.forEach((header, colIndex) => {
        if (header.textContent.trim() === "Status" || !header.textContent.trim()) return;

        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            currentSort.asc = (currentSort.column === colIndex) ? !currentSort.asc : true;
            currentSort.column = colIndex;

            rowData.sort((a, b) => {
                let valA, valB;
                if (colIndex === 0) { valA = a.title; valB = b.title; }
                else if (colIndex === 1) { valA = a.owner; valB = b.owner; }
                else if (colIndex === 2) { valA = a.date; valB = b.date; }

                if (valA < valB) return currentSort.asc ? -1 : 1;
                if (valA > valB) return currentSort.asc ? 1 : -1;
                return 0;
            });

            // Re-order rows in the DOM
            const tbody = table.querySelector('tbody');
            rowData.forEach(data => tbody.appendChild(data.element));

            // Visual feedback
            headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            header.classList.add(currentSort.asc ? 'sort-asc' : 'sort-desc');
            
            updateVisibility(); 
        });
    });

    // --- SEARCH & FILTER EVENTS ---
    searchInput.addEventListener('input', () => {
        if (clearBtn) clearBtn.style.display = searchInput.value ? "block" : "none";    
        setCookie("filterFor", searchInput.value);
        updateVisibility();
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = "";
            clearBtn.style.display = "none";
            setCookie("filterFor", "");
            updateVisibility();
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');            
            updateVisibility();
            setCookie("filterBtn", btn.id);
        });
    });

    // Reuse your existing applySafeHighlighting function here...
    function applySafeHighlighting(rootElement, words) {
        const regex = new RegExp(`(${words.join('|')})`, 'gi');
        const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null, false);
        const nodesToReplace = [];
        let currentNode;
        while (currentNode = walker.nextNode()) {
            if (words.some(word => currentNode.textContent.toLowerCase().includes(word))) {
                nodesToReplace.push(currentNode);
            }
        }
        nodesToReplace.forEach(node => {
            const parent = node.parentNode;
            if (!parent || ['MARK', 'SCRIPT', 'STYLE'].includes(parent.tagName)) return;
            const span = document.createElement('span');
            span.innerHTML = node.textContent.replace(regex, '<mark class="highlight">$1</mark>');
            while (span.firstChild) parent.insertBefore(span.firstChild, node);
            parent.removeChild(node);
        });
    }


    // Add this inside your DOMContentLoaded listener
    const menuToggle = document.getElementById('menuToggle');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (menuToggle && dropdownMenu) {
        // Toggle menu
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close menu if clicking anywhere else on the page
        window.addEventListener('click', () => {
            if (dropdownMenu.classList.contains('show')) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // filter projects as they were filtered at last visit
    let selectedBtn=getCookie("filterBtn");
    if (selectedBtn) document.getElementById(selectedBtn).click();

    searchInput.value = getCookie("filterFor");

    updateVisibility();
});