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
    return `<span style="font-size: 14px; color: black;">(by ${name})</span>`;
  else 
    return `<span style="font-size: 14px; color: black;">(local project)</span>`;
}

function getProjectHTML(project) {
  let tags = `<div class="tags">`;
  project.tags.forEach(tag => tags+=`<span id="project_tag_${project.eid}_${tag}" class="card-tag">#${tag}</span>`);
  tags    +=  `</div>`;

  let sTit = project.shortTitle; if (!sTit || sTit=="?") sTit = project.name;
  let desc = truncateText(project.description, 500); 
  let privatenessSpanHolder = (!project.ownerName || (project.eid == 'e?')) ? 
  '' : `<span name="privateness_span_holder" key="${project.eid}" ename="${project.name}"></span>`;
  
  return `
    <div class="w3-panel w3-card-2 myCard">
      <header class="w3-container">
        <div style="display: flex;justify-content: space-between;align-items: center;">
          <h2 id="project_name_${project.eid}" class='cardHeader' onclick="redirectToUrlWithParams('/project/${project.name}', {homepoint: true });">
            ${sTit} ${getByHTML(project.ownerName)}

          </h2> 
          ${privatenessSpanHolder}
        </div>        
      </header>
      <div class="w3-container cardDesc">
          <p id="project_desc_${project.eid}">${ desc }</p>
          <hr style="margin-bottom:0px">
          <div class="card-meta">
            <span>Algorithms:  <strong>${ project.algorithms }         </strong></span> <span>|</span> 
            <span>Test Sets:   <strong>${ project.testsets }           </strong></span> <span>|</span>
            <span>Modified:    <strong>${ timeAgo(project.modified) }  </strong></span> 
          </div>
          <hr style="margin-top:8px">
          ${tags}
      </div>
    </div>
  `;
}

function createCards() {
  projects.forEach(function (project) {
    let pDiv = document.createElement('div');
    pDiv.innerHTML = getProjectHTML(project);
    project.card = pDiv;
  });
}

function printCards() {
  let searchString   = document.getElementById('projectSearchInput').value;
  let sortbyE        = document.getElementById('projectSearchSortby').value;
  let descE          = document.getElementById('projectSearchDesc');
  let onlyMine       = document.getElementById('show_only_my').checked;
  let showSandboxes  = document.getElementById('show_sandboxes').checked;

  let newTab = [...projects];

  // filter out my projects 
  if (onlyMine)
    newTab = newTab.filter(project => project.owner == current_user_uid);

  if (!showSandboxes)
    newTab = newTab.filter(project => !project.tags.includes('sandbox'));

  // filter out projects that contain searchString string
  newTab = newTab.filter(project => project.includes(searchString));

  // sort according to selected criteria
  newTab.sort((obj1, obj2) => {
    let direction = (descE.checked ? -1 : 1) * (sortbyE == "pop" ? -1 : 1);
    
    let local1 = obj1.ownerName ? 0 : 1; 
    let local2 = obj2.ownerName ? 0 : 1;
    // local projects first
    if (local1 ^ local2) 
      return (local1 - local2); 
    else {
      if (sortbyE == "modified" || sortbyE == "pop") 
        return direction * (obj2[sortbyE] - obj1[sortbyE]);
      else
        return direction * obj1[sortbyE].localeCompare(obj2[sortbyE]);
    }
  });

  let container = document.getElementById('projectCardsContainer');
  if (projects.length > 0) {
    container.innerHTML = "";
    newTab.forEach(project => container.appendChild(project.card));

    // markup searchString in name, description and tags of the projects
    if (searchString != previousMarkupString)
      markup(newTab, searchString);
  }
}

let previousMarkupString = "";
function markup(projects, searchString) {  
  previousMarkupString = searchString;
  
  let ss = searchString.toLowerCase();
  let regex = new RegExp(searchString, "gi");

  // setting this (never-appearing-string) clears all selections
  if (!searchString) searchString="___";

  projects.forEach(p => {
    let projectNameE = document.getElementById(`project_name_${p.eid}`);   
    let sTit = p.shortTitle; if (!sTit || sTit=="?") sTit = p.name; 
    projectNameE.innerHTML = sTit.replace(regex, match => `<span class="mu">${match}</span>`);

    let projectDescE = document.getElementById(`project_desc_${p.eid}`);    
    projectDescE.innerHTML = p.description.replace(regex, match => `<span class="mu">${match}</span>`);
  
    p.tags.forEach(tag => {
      let tagE = document.getElementById(`project_tag_${p.eid}_${tag}`);    
      tagE.innerHTML = "#" + tag.replace(regex, match => `<span class="mu">${match}</span>`);
    })
  });
}


function switchSearchPanel() {
  let sp = document.getElementById("projectSearchPanel");
  let spi = document.getElementById("projectSearchInput");

  let fmi = document.getElementById("filter_menu_item");

  if (sp.style.display != "flex") {
    sp.style.display="flex";
    fmi.innerHTML = "Hide filter panel"
    spi.focus();
    spi.select();
  } else {
    sp.style.display="none";
    fmi.innerHTML = "Filter ...";

    // clear search filter
    spi.value = "";
    spi.dispatchEvent(new Event('input'));

  }
}


//////////////   ListOfProblems ... menu ////////////////////////////////////////
let outsideClickListener = null;

function addMenuIconListener() {
  const menuIcon = document.getElementById('menuIcon');
  const dropdownMenu = document.getElementById('dropdownMenu');

  // Toggle menu visibility
  menuIcon.addEventListener('click', (e) => {
    dropdownMenu.classList.toggle('open');
    e.stopPropagation(); // Prevent event from reaching the body
    if (dropdownMenu.classList.contains('open')) {
        addOutsideClickListener();
    } else {
        removeOutsideClickListener();
    }
  });
}

// Add listener to close menu on outside click
function addOutsideClickListener() {
    const menuIcon = document.getElementById('menuIcon');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!outsideClickListener) {
        outsideClickListener = (event) => {
            if (!dropdownMenu.contains(event.target) && event.target !== menuIcon) {
                dropdownMenu.classList.remove('open');
                removeOutsideClickListener();
            }
        };
        document.addEventListener('click', outsideClickListener);
    }
}

// Remove outside click listener
function removeOutsideClickListener() {
    if (outsideClickListener) {
        document.removeEventListener('click', outsideClickListener);
        outsideClickListener = null;
    }
}

// Handle menu option click
function handleMenuClick(action) {
    const dropdownMenu = document.getElementById('dropdownMenu');
    dropdownMenu.classList.remove('open');
    removeOutsideClickListener();

    switch (action) {
      case 'find' : switchSearchPanel(); break;
      case 'newProject': newProject(); break;
      case 'importProject': openFileDialog(); break;
    }
}

async function openFileDialog() {
  let fileInput = document.getElementById('fileInput');
  fileInput.click();
  fileInput.onchange = async () => {
      document.body.style.cursor = "wait";
      if (fileInput.files.length > 0)  {
        let uploadResult = await uploadFiles([fileInput.files[0]], new Map([["type", "importProject"],[]]));
        if (uploadResult.Status == 0) {
          let path     = uploadResult.Answer.Location;
          let filename = fileInput.files[0].name;
          askServer(importProjectPhase2, projectName, "import", `alter {'Action':'ImportProject', 'Path':'${path}', 'Filename':'${filename}', 'ProjectName':'?'}`); 
        } else  {
          document.body.style.cursor = "default";
          showPopup(uploadResult.Answer);
        }
      }      
  };
}


function importProjectPhase2(p1, p2, response) {
  document.body.style.cursor = "default";

  if (response.Status==0) {
    // response.Answer = "Project 'BasicSort04' imported successfully."
    const match = response.Answer.match(/'([^']+)'/);
    if (match) {
      // redirect to the imported project
      window.location.href = "/project/" + match[1];
    }
  } else {
    showPopup(response.Answer);
  }  
}

/////////////////////////////////////////////////////////////////////


document.addEventListener("DOMContentLoaded", async function() {
  addMenuIconListener();

  let showNewProjectOption = await can("e0_P", "can_add_project");
  if (!showNewProjectOption) document.getElementById("newP_menu_item").remove();

  let showImpProjectOption = await can("e0_P", "can_import_project");
  if (!showImpProjectOption) document.getElementById("impP_menu_item").remove();


  createCards();
  printCards();

  await populatePrivatnessSpans("project");
  showHidePrivatenessIcons();
});
