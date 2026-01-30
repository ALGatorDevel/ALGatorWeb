presenterData    = new Map();
descriptionViews = new Map();
var isSidebarOpen = true;

ausers.waitForDataToLoad(["get_entities"], false);


function toggleSidebar() {
  var newWidth = 200;
  var hpx      =42;
  if (isSidebarOpen) {
    closeSideBar();    
    newWidth = 50;
    hpx = 120;
  } else {
    openSideBar();
  }

  isSidebarOpen = !isSidebarOpen;
  adjustMainMargin();
  repaintViews();

  toggleSlimElements();

  var problemNavbar = document.getElementById("problemNavbar");
  problemNavbar.style.width = `calc(100% - ${newWidth}px)`;
  problemNavbar.style.left = `${newWidth}px`;

  var mid_banner = document.getElementById("menu_mid_banner");
  mid_banner.style.height = `calc(100vh - ${hpx}px)`; 
}

function toggleSlimElements() {
  var slimElements = document.querySelectorAll('.slim');
  var wideElements = document.querySelectorAll('.wide');

  slimElements.forEach(function(element) {
    if (isSidebarOpen) {
      element.style.display = 'none'; 
    } else {
      element.style.display = 'block'; 
    }
  });

  wideElements.forEach(function(element) {
    if (isSidebarOpen) {
      element.style.display = 'block'; 
    } else {
      element.style.display = 'none'; 
    }
  });
}

document.addEventListener("DOMContentLoaded", function() {
  toggleSlimElements();
  adjustMainMargin();
});

window.addEventListener('resize', adjustMainMargin);
window.addEventListener('resize', repaintViews);


mySideBarWidth="200px";

function openSideBar() {
  document.getElementById("main").style.marginLeft = mySideBarWidth;
  document.getElementById("mySidebar").style.width = mySideBarWidth;
}
function closeSideBar() {
  document.getElementById("main").style.marginLeft = "50px";
  document.getElementById("mySidebar").style.minWidth = "50px";
  document.getElementById("mySidebar").style.width = "50px";
}


function adjustMainMargin() {
  // ce je side bar odprt
  if(isSidebarOpen){
    document.getElementById('mySidebar').style.minWidth = mySideBarWidth;
    document.getElementById('mySidebar').style.width = mySideBarWidth;
    var windowWidth = window.innerWidth;
    var sidebarWidth = document.getElementById('mySidebar').offsetWidth; // sirina sidebara
    var sidebarMinWidth = 150; 
    var sidebarPercentageWidth = windowWidth * 0.15; // zracunamo 15%
  
    document.getElementById('main').style.marginLeft = `${sidebarWidth}px`;
  }
  else{
    document.getElementById('mySidebar').style.minWidth = '0px';
  }

}

var sectionTitle = ['Problem Overview',       'Implementation',  'Testsets',    'Algorithms', 'Testing results', 'Presentation',     'Results playground',   '#ALGator shell'     ];       
var sections     = ['projectDescription',     'editProject',     'testsets',    'algorithms', 'awResults',       'results',          'playground',           'algatorshell'       ];    
var sectionIcons = ['fas fa-project-diagram', 'fa fa-wrench',    'fas fa-vial', 'fas fa-fan', 'fas fa-running',  'fa fa-chart-line', 'fa-solid fa-terminal', 'fas fa-cog fa-pulse'];  

var numberOfTopItems = 6;

// some items are to be shown only in some cases; this function checks if item is to be shown and returns tree/false
async function showItem(item) {
 switch (item) {
    case 'xConsole': // XConsole is shown only to superuser
      return current_user_is_superuser;
    case 'aShell': case 'algatorshell': // ALGator shell is shown only to superuser
      return current_user_is_superuser;
    case 'groups':
      const canEditUsers = await can('e0_S', "can_edit_users");
      return canEditUsers;
    case 'permissions':
      let ents = await getEntitiesKeysAsSet();
      let showPermissions = false;
      for (const ent of ents) 
        if (await can(ent, "can_edit_rights")) showPermissions=true;
      return showPermissions;

    default: return true; // all "normal" items are always shown
 }
}


function getSideBarItemHTML(i) {
  return `
 <div id='${sections[i]}-sbitem' class='row' onclick="showSectionSideNavbar('${sections[i]}')">
    <p class='sideBarEl wide'>
      <span class="du">▸ &nbsp</span>
      <!--span><i class="${sectionIcons[i]}"></i></span-->
      <span>${sectionTitle[i]}&nbsp;</span>
    </p>
    <p class='sideBarEl slim' style="display: none;" data-tooltip="${sectionTitle[i]}" onmouseover="showTooltip(event)" onmouseout="hideTooltip()">
      <span><i class="${sectionIcons[i]}"></i></span>
    </p>
  </div>
  `;
}
async function getSideBarItemsHTML(topItems) {
  var topD = "", bottomD="";
  for(let i=0; i<sections.length;i++) {
    let si = await showItem(sections[i]);
    if (si) { 
      if (i<topItems) topD +=getSideBarItemHTML(i); else bottomD +=getSideBarItemHTML(i);
    }
  }

  return `
  <div id="menu_mid_banner" style="display:flex;flex-direction: column; height: calc(100vh - 42px);">
    <div>${topD}</div>
    <div style="flex-grow: 1;"></div>
    <div>${bottomD}</div>
  </div>  `;  
}

// pages that have already been displayed
const displayedPages  = new Set();

function showSectionSideNavbar(sectionId) {
  sections.forEach(function(id) {
    if (document.getElementById(id))
      document.getElementById(id).style.display = 'none';
  });
  document.getElementById(sectionId).style.display = 'block';

  var title = "";
  for(i=0; i<sections.length; i++) {
    if (sections[i] == sectionId) {title = sectionTitle[i]; break;}
  }
  document.getElementById("sectionTitleSpan").innerHTML = title;

  // only click on first menu item (to show first subpage) the first time the page is shown
  if (!displayedPages.has(sectionId)) {
    //try {document.getElementById(sectionId).getElementsByClassName('navBarEl')[0].click();} catch (e){}

    switch (sectionId) {
      // EDIT PROJECT
      case "projectDescription": showProblemDescription(); break;
      case "results":            showPresenters(); break;
      case "awResults":          showTestingResults(); break;
      case "editProject":        showImplementation(); break;
      case "testsets":           showEntitiesPage('testset', pageProject.testsets); break;
      case "algorithms" :        showEntitiesPage('algorithm', pageProject.algorithms); break;
      case "playground":         showPlayground();break;
      case "algatorshell":       showAlgatorShell();break;
      // SETTINGS
      case "profile":            loadProfilePage(); break;
      case "password":           loadChangePasswordPage(); break;  
      case "permissions":        getEntities(); break;  
      case "groups":             loadGroupsPage(); break;
      case "aShell":             openAShellInWindow(); break;
    }
    displayedPages.add(sectionId);
  }
}


function addSortableColoumns(presenterJSON, view, tableId, tableInstance, sortById){
  var table =$('#'+tableId);
  var tableInstance;
  if ($.fn.dataTable.isDataTable('#'+tableId)) {
    $('#'+tableId).DataTable().destroy();
    tableInstance = table.DataTable({
      "paging": false,  
      "searching": false,  
      "info": false 
    }); 
  }
  else{
    tableInstance = table.DataTable({
      "paging": false,  
      "searching": false,  
      "info": false 
    }); 
  }
  
  if(!presenterJSON[view].sortableColumns){
    // da user nemore urejati tabele
    $('#'+tableId+' thead th').css('pointer-events', 'none');
  }
  else{
    $('#'+tableId+' thead th').css('pointer-events', 'auto');
  }

  $('#'+tableId+' th').each(function() {
    $(this).click(function() {
      if(presenterJSON[view].sortableColumns){
        presenterJSON[view].sortBy = $(this).text();
        if(sortById !== ''){
          // $('#'+sortById).text(presenterJSON[view]['sortBy']);
        }
      }
    });
  });

  if(presenterJSON[view].sortBy !== ''){
    var columnName = presenterJSON[view].sortBy; 
    let index = 0;
    $('#'+tableId+' th').each(function() {
      if($(this).text() === columnName){
        tableInstance.order([[index, 'asc']]).draw();
      }
      index++;
    });
  }
}


async function updateTableSortBy(presenterJSON, view, tableId, sortby, sortById){

  presenterJSON[view]['sortBy'] = sortby;
  presenterJSON['Query']['SortBy'] = [sortby];

  // samo ce imamo obkljukano Sortable columns lahko urejamo vrstice
  if(presenterJSON[view]['sortableColumns']){
      data = await getData(url, projectName, presenterJSON);
      let tableData = filterColumns(data, presenterJSON[view]["Columns"]);
      if(tableData.length > 0){
        createTable(tableData, tableId, '350px')
      }
      else{
          console.log("Ni podatkov")
      }
      $('#'+tableId+' th').each(function() {
          $(this).click(function() {
            var headerText = $(this).text();
            updateTableSortBy(presenterJSON, view, tableId, headerText, sortById);
          });
      });
      
  }
}

function repaintViews() {
  setTimeout(() => {
    if (typeof  aLayout !== "undefined") 
      aLayout.views.forEach((view)=>view.repaint());
    if (typeof  playgroundViews !== "undefined")
      for (let [viewName, view] of playgroundViews) view.repaint();
  }, 200);
}

function redrawPresenterViews(presenterName) {
  setTimeout(() => {
    aLayout.views.forEach((view)=>{if (view.presenterName == presenterName) view.draw()});
  }, 500);
}


function getOkCancelButtonsHTML(id, okCancelQ, style) {
  return `
    <div id="OKCancelButtons_${id}" style="float: right; display:${okCancelQ ? "flex" : "none"}; ${style!=null ? style : ''}">
      <div class='' style="display: flex; justify-content: center;">
        <button id="${id}_okbutton" class="w3-button w3-padding w3-round"
            style='margin:10px; width:90%; background-color: #eeeeee' >Save</button>
      </div>
      <div class='' style="display: flex; justify-content: center;">
        <button id="${id}_cancelbutton" class="w3-button w3-padding w3-round"
            style='margin:10px; width:90%; background-color: #eeeeee'>Cancel</button>
      </div>                
    </div>
  `;
}



//////////// Project description   ///////////////

function scrollToDescriptionDiv(id) {
  $('.pdElt').css("color", '#333');

  var myElement = document.getElementById(id);
  var topPos = myElement.offsetTop;
  $("#descriptionInnerContent").animate({
    scrollTop: topPos - 105
  }, 500); 
}

pdNavbar =  [{'sId': 'html_desc',            'text': 'Problem Description'},
             {'sId': 'test_case_html_desc',  'text': 'Test cases'},
             {'sId': 'test_sets_html_desc',  'text': 'Test sets'},
             {'sId': 'algorithms_html_desc', 'text': 'Algorithms'},
             {'sId': 'project_ref_desc',     'text': 'References'},
            ];


function showSection(paneID, tabID) {
  selectTab(paneID, tabID);
  scrollToDescriptionDiv(tabID);
}

async function showProblemDescription() {
  await pageProject.waitForDataToLoad(["get_project_html_description"], false, {'ProjectName': projectName});

  const tTabs = "problemOverview";
  addTabPane(tTabs);  

  let descCont = document.getElementById("descriptionInnerContent");
  descCont.innerHTML = "";

  pdNavbar.forEach(nb => {
    addTab(tTabs, nb.sId, nb.text, showSection);

    addAndWireProblemDescriptionTitleDiv(projectEID, nb.sId, nb.text);
  });
  
  wireTabs(tTabs);
  showSection(tTabs, pdNavbar[0].sId);
  
  // ko se prva stran naloži, sprožim še nalaganje vseh ostalih podatkov spletne strani, da bodo na voljo, ko jih bodo ostale podstrani potrebovale
  pageProject.waitForDataToLoad(["get_computer_familes", "get_project_general_data", "get_project_properties"], 
      false, {'ProjectName': projectName});
  pp.waitForDataToLoad(["get_presenters"], false, {'ProjectName': projectName});
  
  formatMath(descCont);
}

function getProblemDescriptionTitleDiv(pEID, sectionID, title, content) {
  let okCancelButtons = getOkCancelButtonsHTML(sectionID, false, "position:relative; top:10px; right:26px");
  return `

    <div id="${sectionID}" class="problemDescTab" style="display: block;">
      <div class='w3-row' id="title_${sectionID}">

        <div class='w3-col s8'>
          <h2 class="pdh2" id='h2_${sectionID}'>${title}</h2>
        </div>
        <div class='w3-col s4' style="float:inline-end;">                   
          <div class="editMode" w="${pEID} cw" style="margin-right:30px; display:none">
            ${okCancelButtons}
            <i id="editButton_${sectionID}" class="far fa-edit" onclick="editDescriptionHtml('${sectionID}')" 
               style="float:right; display: flex; position:relative; top:40px; right:30px;"></i>
          </div>
        </div>
      </div>  
      <div id="descriptionDisplay_${sectionID}" class="pdbox" sytle="display: block;">
        ${content}
      </div>
      <div id="descriptionAdditional_${sectionID}" class="pdbox" style="margin-top: -16px; display: none;"></div>
      <div id="descriptionEdit_${sectionID}" style="display: none; margin: -25px 30px 15px 30px;"></div>
    </div>        
  `;
}

function addAndWireProblemDescriptionTitleDiv(pEID, sectionID, title) {
  let s1 = getProblemDescriptionTitleDiv(pEID, sectionID, title, pageProject.project_html_descriptions[sectionID]);
  $("#descriptionInnerContent").append(s1);

  let view = getViewOfType("TextBox", "projectDescription", sectionID); 
  descriptionViews.set(sectionID, view);
  document.getElementById("descriptionEdit_"+sectionID).innerHTML = view.getEditorHTML();  
  view.initNewMode();
  view.viewJSON["htmltext"]=pageProject.project_html_descriptions[sectionID];
  view.fillDataAndWireControls();

  wireButton(sectionID+"_cancel", editProblemDescriptionCancel, sectionID);
  wireButton(sectionID+"_ok",     editProblemDescriptionSave,   sectionID);
}

// which sections on "Problem overview" page have additional description block? Currently: only testSets (list of testsets)
var visibleAdditionalDivs = ["testSets"];

function showHideProblemDescriptionTitleButtons(sectionID, show) {
  document.getElementById(`editButton_${sectionID}`)     .style.display      = show  ? 'flex' : 'none';
  document.getElementById(`OKCancelButtons_${sectionID}`).style.display      = !show ? 'flex' : 'none';

  document.getElementById(`descriptionDisplay_${sectionID}`)  .style.display =  show ? 'block' : 'none';
  document.getElementById(`descriptionEdit_${sectionID}`)     .style.display = !show ? 'block' : 'none';

  let visible = visibleAdditionalDivs.includes(sectionID) ? 'block' : 'none';
  document.getElementById(`descriptionAdditional_${sectionID}`)  .style.display =  show ? visible : 'none';  

  unfreezDivs(".problemDescTab");
}

function freezOtherSections(presenter) {
  var elements = document.querySelectorAll('.presenterTab');
  elements.forEach(function(element) {
    if (element.id != presenter)
      element.classList.add("frozen-div");
  });
}

function editDescriptionHtml(sectionID) {
  showHideProblemDescriptionTitleButtons(sectionID, false);
  descriptionViews.get(sectionID).fillDataAndWireControls();

  freezOtherDivs(sectionID, ".problemDescTab");
  scrollToDescriptionDiv(sectionID);
}   

function editProblemDescriptionCancel(event) {
  let sectionID = event.data.param1;

  showHideProblemDescriptionTitleButtons(sectionID, true);

  // cancel edit in view, set previous htmltext
  descriptionViews.get(sectionID).viewJSON["htmltext"] = pageProject.project_html_descriptions[sectionID]; 
}



function editProblemDescriptionSave(event) {
  let sectionID = event.data.param1;
  showHideProblemDescriptionTitleButtons(sectionID, true);

  let htmlContent = descriptionViews.get(sectionID).viewJSON["htmltext"]; 
  pageProject.project_html_descriptions[sectionID] = htmlContent;

  moveResources(sectionID, htmlContent, editProblemDescriptionSavePhase2);
}

function editProblemDescriptionSavePhase2(sectionID, htmlContent, newHtmlText) {
  document.getElementById("descriptionDisplay_"+sectionID).innerHTML = htmlContent;
  formatMath(document.getElementById("descriptionInnerContent"));


  newHtmlText = replaceStaticProjDocLinkWithDolarStatic(newHtmlText);
  let json = JSON.stringify({"Type":sectionID, "Content": btoa(unescape(encodeURIComponent(newHtmlText)))});
  askServer(null, sectionID, "saveHTML", 
     `alter {'Action':'SaveHTML', 'ProjectName':'${projectName}', 'Data':${json}}`);
}




function testsetLineHTML(testset) {
  return `
    <li>
    <div>
      <p>${testset.name} [${testset.eid}]: ${testset.description}</p>
    </div>
    </li>
  `;
}

let playgroungFilled = false;
async function showPlayground() {
  if (!playgroungFilled) {
    await pageProject.waitForDataToLoad(["get_project_properties"], false, {'ProjectName':projectName});
    playgroungFilled = true;
    fillPlaygroundDiv();  
    fillAndWireQuery(getPresenterDefaultJSON(), playgroundID, queryChanged);
  }
}

let algatorShellLoaded = false;
function showAlgatorShell() {
  if (!algatorShellLoaded) {
    algatorShellLoaded = true;

    $("#algatorshell_container").load("/ashell/", {'project' : projectName,       csrfmiddlewaretoken : window.CSRF_TOKEN});
  }
}
