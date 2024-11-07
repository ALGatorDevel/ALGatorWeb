presenterData    = new Map();
descriptionViews = new Map();
var isSidebarOpen = true;

function toggleSidebar() {
  var newWidth = 200;
  if (isSidebarOpen) {
    closeSideBar();    
    newWidth = 50;
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

var sectionTitle = ['Problem Overview',       'Implementation', /* 'Algorithms',*/ 'Results and Analysis',  'Results playground'  ]; // 'Algorithms', 'Source code'     
var sections     = ['projectDescription',     'editProject',    /* 'algorithms',*/ 'results',               'playground'          ]; // 'algorithms', 'implementation'  
var sectionIcons = ['fas fa-project-diagram', 'fa fa-wrench',   /* 'fas fa-fan',*/ 'fa fa-chart-line',      'fas fa-cog fa-pulse' ]; // 'fa-gears',   'fa-edit'

var numberOfTopItems = /*4*/3;

// some items are to be shown only in some cases; this function checks if item is to be shown and returns tree/false
async function showItem(item) {
 //if (debugPrint) console.log(`Showing item: ${item}`);
 switch (item) {
    case 'xConsole':
      //if (debugPrint) console.log('Superuser check:', current_user_is_superuser);
      return true; //current_user_is_superuser;
    case 'groups':
      //if (debugPrint) console.log('Checking permission for groups...');
      const canEditUsers = await can('e0_S', "can_edit_users");
      //if (debugPrint) console.log('Can edit users:', canEditUsers);
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
      <span><i class="${sectionIcons[i]}"></i></span>
      <span>${sectionTitle[i]}</span>
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
    //if (debugPrint) console.log(`Item: ${sections[i]}, showItem result: ${si}`);
    if (si) { 
      if (i<topItems) topD +=getSideBarItemHTML(i); else bottomD +=getSideBarItemHTML(i);
    }
  }

  return `
  <div style="display:flex;flex-direction: column; height: calc(100vh - 120px);">
    <div>${topD}</div>
    <div style="flex-grow: 1;"></div>
    <div>${bottomD}</div>
  </div>  `;  
}

function showSectionSideNavbar(sectionId) {
  sections.forEach(function(id) {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(sectionId).style.display = 'block';

  var title = "";
  for(i=0; i<sections.length; i++) {
    if (sections[i] == sectionId) {title = sectionTitle[i]; break;}
  }
  document.getElementById("sectionTitleSpan").innerHTML = title;

  try {document.getElementById(sectionId).getElementsByClassName('navBarEl')[0].click();} catch (e){}

  switch (sectionId) {
    // EDIT PROJECT
    case "projectDescription": if (pageProject) updateTestSetsDescList(); break;
    case "results":            repaintViews(); break;
    case "editProject":        setEditPageHeight(); break;
    case "algorithms" :        showListOfAlgorithms(); break;
    // SETTINGS
    case "profile":            loadProfilePage(); break;
    case "password":         loadChangePasswordPage(); break;  
    case "permissions":        getEntities(); break;  
    case "groups":            loadGroupsPage(); 
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
  }, 500);
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
  document.getElementById("navBarEl"+id).style.color = '#27ae60';

  var myElement = document.getElementById(id);
  var topPos = myElement.offsetTop;
  $("#descriptionInnerContent").animate({
    scrollTop: topPos - 105
  }, 800); 
}

function getProblemDescriptionTitleDiv(sectionID, title, content) {
  let okCancelButtons = getOkCancelButtonsHTML(sectionID, false, "position:relative; top:10px; right:26px");
  return `

    <div id="${sectionID}" class="problemDescTab" style="display: block;">
      <div class='w3-row' id="title_${sectionID}">

        <div class='w3-col s8'>
          <h2 class="pdh2" id='h2_${sectionID}'>${title}</h2>
        </div>
        <div class='w3-col s4' style="float:inline-end;">                   
          <div class="editMode" style="margin-right:30px; display:none">
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

function addAndWireProblemDescriptionTitleDiv(sectionID, title) {
  let s1 = getProblemDescriptionTitleDiv(sectionID, title, projectDescJSON[sectionID]);
  $("#descriptionInnerContent").append(s1);

  let view = getViewOfType("TextBox", "projectDescription", sectionID); 
  descriptionViews.set(sectionID, view);
  document.getElementById("descriptionEdit_"+sectionID).innerHTML = view.getEditorHTML();  
  view.initNewMode();
  view.viewJSON["htmltext"]=projectDescJSON[sectionID];
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
  descriptionViews.get(sectionID).viewJSON["htmltext"] = projectDescJSON[sectionID]; 
}



function editProblemDescriptionSave(event) {
  let sectionID = event.data.param1;
  showHideProblemDescriptionTitleButtons(sectionID, true);

  let htmlContent = descriptionViews.get(sectionID).viewJSON["htmltext"]; 
  projectDescJSON[sectionID] = htmlContent;

  moveResources(sectionID, htmlContent, editProblemDescriptionSavePhase2);
}

function editProblemDescriptionSavePhase2(sectionID, htmlContent, newHtmlText) {
  document.getElementById("descriptionDisplay_"+sectionID).innerHTML = htmlContent;

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


function updateTestSetsDescList() {
  var testSetsDescDiv = document.getElementById("descriptionAdditional_testSets");
  if (testSetsDescDiv) {
    testSetsDescDiv.style.display = "block";

    
    var testsets = pageProject.testsets;
    var content  = "<p><b>Implemented testsets:</b><p><ul>";;
    testsets.forEach(ts => {content += testsetLineHTML(ts)});
    testSetsDescDiv.innerHTML = content;
  }
}

/************ Algorithms ***************************/

function getAlgorithmCard(algorithmName, desc) {
  return `
        <div class="w3-panel w3-card-2 myCard" onclick="showAlgorithmOnPage('${algorithmName}')">
            <header class="w3-container">
                <h2 class='cardHeader'>${algorithmName}</h2>
            </header>

            <div class="w3-container cardDesc">
                <p>${desc}</p>
            </div>
        </div>
  `;
}

function showHideListDetailPanel(showList=true) {
  var listPanel   = document.getElementById("algorithm_panel_list");
  var detailPanel = document.getElementById("algorithm_panel_detail");

  listPanel.  style.display = showList  ? "" : "none";
  detailPanel.style.display = !showList ? "" : "none";
}

function showListOfAlgorithms() {
  showHideListDetailPanel(true);
    var listPanel = document.getElementById("list_of_algorithms_panel");
    var list = "";
    pageProject.algorithms.forEach(algorithm => {
      list += getAlgorithmCard(algorithm.name, algorithm.description);
    });
    listPanel.innerHTML = list;
}

function showAlgorithmOnPage(algorithmName) {
  var alg = pageProject.algorithms.get(algorithmName);
  if (alg) {
    showHideListDetailPanel(false);
    document.getElementById("algorithm_panel_detail").innerHTML = 
      getAlgorithmHTML(projectName, algorithmName, alg.eid, alg.description, alg.shortname, alg.date, alg.author, alg.language, alg.htmlContent);
  }
}