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
  let privatenessSpanHolder = project.eid == 'e?' ? '' : `<span name="privateness_span_holder" key="${project.eid}" ename="${project.name}"></span>`;
  
  return `
    <div class="w3-panel w3-card-2 myCard" onclick="redirectToUrlWithParams('/project/${project.name}', {homepoint: true });">
      <header class="w3-container">
        <div style="display: flex;justify-content: space-between;align-items: center;">
          <h2 id="project_name_${project.eid}" class='cardHeader'>${sTit} ${getByHTML(project.ownerName)}</h2>          
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
  let searchString = document.getElementById('projectSearchInput').value;
  let sortbyE      = document.getElementById('projectSearchSortby').value;
  let descE        = document.getElementById('projectSearchDesc');
  let onlyMine       = document.getElementById('show_only_my').checked;

  let newTab = [...projects];

  // filter out my projects 
  if (onlyMine)
    newTab = newTab.filter(project => project.owner == current_user_uid);

  // filter out projects that contain searchString string
  newTab = newTab.filter(project => project.includes(searchString));

  // sort according to selected criteria
  newTab.sort((obj1, obj2) => {
    let direction = (descE.checked ? -1 : 1) * (sortbyE == "pop" ? -1 : 1);
    if (sortbyE == "modified" || sortbyE == "pop") 
      return direction * (obj2[sortbyE] - obj1[sortbyE]);
    else
      return direction * obj1[sortbyE].localeCompare(obj2[sortbyE]);
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

  if (sp.style.display != "flex") {
    sp.style.display="flex";

    spi.focus(); // Osredotoči se na input
    spi.select();
  } else {
    sp.style.display="none";
  }
}


document.addEventListener("DOMContentLoaded", async function() {
  let showNewProjectPanel = await can("e0_P", "can_add_project");
  document.getElementById("new_project_button").style.display = showNewProjectPanel ? "flex" : "none";

  createCards();
  printCards();

  await populatePrivatnessSpans("project");
  showHidePrivatenessIcons();
});
