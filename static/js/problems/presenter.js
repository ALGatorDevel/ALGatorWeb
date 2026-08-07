class PagePresenters extends PageData {
  services = {
    'get_presenter': {
      'endpoint': '/projects/get_presenter',
      'method'  : 'GET',
      'params'  : ["ProjectName", "PresenterName", "Deep"],
      'comment' : ''
    },

    'get_presenters': {
      'endpoint': '/projects/get_presenters',
      'method'  : 'GET',
      'params'  : ["ProjectName"],
      'comment' : ''
    },

    'get_pde_state': {
      'endpoint': '/projects/get_pde_state',
      'method'  : 'GET',
      'params'  : ["ProjectName"],
      'comment' : ''
    },
  };

  constructor() {
    super();

    this.projectPresenters = [];
    this.presenterJSONs    = new Map();
    this.navbar            = [];
    this.pdeState          = null;
    this.deepLoadedPresenters = new Set();     
  }

  setVar(type, value, params) {
    switch (type) {
      case "get_presenter" : this.storeOnePresenterData(value); break;
      case "get_presenters": this.storePresenters(value); break;
      case "get_pde_state" : this.pdeState = value; break;
    }
  }

  storeOnePresenterData(value) {
    this.presenterJSONs.set(value[0], value[1])
  }

  storePresenters(value) {
    this.projectPresenters = value[0];

    Object.keys(value[1]).forEach(pName => this.presenterJSONs.set(pName, value[1][pName]));
  }
}

// Updates the "... loading presenter data x/y" span in the loading div.
function setLoadingProgress(x, y) {
    const el = document.getElementById('loading_progress_msg');
    if (el) el.textContent = y > 0 ? `${x} / ${y}` : '...';
}

// Holds the PDE init promise so showPresenters() can await it if preloading
// started but hasn't finished yet when the user clicks "Presentation".
let _pdeInitPromise = null;

// Pre-loads full data for all presenters in the background so that
// usage information in the PDE is complete without opening each tab.
// Also initialises the PDE and fetches Q-box query data early, showing
// progress in the loading div before the user opens the Presentation tab.
async function preloadAllPresenters() {
    await pp.waitForDataToLoad(["get_presenters"], false, {'ProjectName': projectName});
    const service = pp.services['get_presenter'];
    await Promise.all(pp.projectPresenters.map(pName =>
        sendRequest(service.endpoint,
            { ProjectName: projectName, PresenterName: pName, Deep: 1 },
            service.method
        ).then(result => {
            try {
                const jres = JSON.parse(result);
                if (jres.Status === 0) {
                    pp.storeOnePresenterData(jres.Answer);
                    pp.deepLoadedPresenters.add(pName);
                }
            } catch (e) {}
        })
    ));

    // Initialise PDE and preload Q-box query data now, with progress feedback,
    // so the data is ready (or loading) before the user opens the Presentation tab.
    if (!pde) {
        _pdeInitPromise = (async () => {
            await pp.waitForDataToLoad(["get_pde_state"], false, {'ProjectName': projectName});
            pde = createPde('presdata');
            try {
                await pde.init(pp.pdeState, (x, y) => setLoadingProgress(x, y));
            } catch (e) {
                await pde.init(null, (x, y) => setLoadingProgress(x, y));
            }
            pde._dataPreloaded = true;
        })();
        await _pdeInitPromise;
    }

    if (typeof pde !== 'undefined' && pde) pde.updateUsageBadges();
}


pp = new PagePresenters();
presentersShown = false;
pde = null;

async function showPresenters() {
  if (!presentersShown) {
    await pp.waitForDataToLoad(["get_presenters", "get_pde_state"], false, {'ProjectName': projectName});
    pp.projectPresenters.forEach(pName => {
      try {
        let presenter = pp.presenterJSONs.get(pName);
        addTab("presenters", pName, presenter.ShortTitle, guardedShowPresenter);
      } catch (e) {}
    });

    if (_pdeInitPromise) {
      // Background preload started — wait for it to finish (may already be done)
      await _pdeInitPromise;
    } else if (!pde || !pde._dataPreloaded) {
      // Preload didn't run (e.g. page loaded very quickly) — init PDE now
      if (!pde) pde = createPde('presdata');
      try {
        await pde.init(pp.pdeState, (x, y) => setLoadingProgress(x, y));
      } catch (e) {
        await pde.init(null, (x, y) => setLoadingProgress(x, y));
      }
    }

    presentersShown = true;
  }

  let hasPresenters = pp.projectPresenters.length > 0;
  showCorPresenterDiv(hasPresenters, false);
  if (hasPresenters) showPresenter("presenters", pp.projectPresenters[0]);
}

async function showPresenter(paneID, tabID) {
  showCorPresenterDiv(true, false);
  selectTab(paneID, tabID);

  if (!pp.deepLoadedPresenters.has(tabID)) {
    await pp.waitForDataToLoad(["get_presenter"], true, {'ProjectName': projectName, 'PresenterName': tabID, 'Deep': 1});
    pp.deepLoadedPresenters.add(tabID);   // ← mark loaded
  }

  if (!pp.presenterJSONs.has(tabID)) return;

  let presentersDiv = document.getElementById("presenters");

  const pName     = tabID;
  const presenter = pp.presenterJSONs.get(pName);

  await migratePresenterIfNeeded(pName);   // ← add here

  presentersDiv.innerHTML = getPresenterDivHtml(pName, presenter.Title, true, false);
  await addLockersToPresenter(pName);

  let flc = 0;
  presenter.Layout.forEach(row => { 
    document.getElementById(`views_${pName}`).innerHTML += `<div class="w3-row" id="${pName}_${++flc}_container"></div>`;
    row.forEach(cell => {
        document.getElementById(`${pName}_${flc}_container`).innerHTML += getViewOuterHtml(pName,cell);
        createNewView(pName, cell);
    });
  });

  document.getElementById(`myPlusDropdownIcon_${pName}`).addEventListener("click", function() {
    var dropdownContent = document.getElementById(`myPlusDropdownContent_${pName}`);
    dropdownContent.style.display = (dropdownContent.style.display === "block") ? "none" : "block";
  });
  document.getElementById(`myPlusDropdownContent_${pName}`).innerHTML += getViewsDropDownItems(pName);

  enableEditMode(isEditMode);

  fillReportData(projectName, pName);
}


// ids of tmp presenters (to be stored in pp.presenterJSONs during new/edit process)
newPresenterID  = "newPresenter";
editPresenterID = "editPresenter";

function getQueryDefaultJSON(){
    return {
            "Algorithms": ["*"],
            "ComputerID": [],
            "Count": false,
            "Filter": [],
            "GroupBy": [],
            "Indicators": ["*EM"],
            "Parameters": [],
            "SortBy": [],
            "TestSets": ["*"]
          };
}


function getPresenterDefaultJSON(name){
    return {
          "Name"       : name,
          "Author"     : current_user_username,
          "Date"       : getCurrentFormattedDate(),
          "eid"        : "",
          "Title"      : `New presenter`,
          "ShortTitle" : name,
          "Description": "",
          "Layout"     : [],
    }  
}


function wirePCheckbox(presenterID, selector, json, property, doAction) {
  const $checkbox = $("#"+selector+"_"+presenterID);
  $checkbox.prop("checked", json[property]).change(function() {
    let isChecked = $(this).prop("checked");
    json[property] = isChecked;
    if (doAction != null) doAction();
  });
}

function wirePControl(presenterID, selector, json, property, action, doAction) {
  let val = json[property];
  $(`#${selector}_${presenterID}`).val(val);
  $(`#${selector}_${presenterID}`).on(action, function() {
      json[property] = $(this).val();
      if (doAction != null) doAction();
  });
}


function getPresenterEID(pName) {
    try {
        let eid = pp.presenterJSONs.get(pName).eid;
        return  eid ? eid : "e?";
    } catch (e) {
        return "";
    }
}

function getPresenterTitleDivHTML(pName, pTitle, editButtonsQ, okCancelQ) {
  let pEID = getPresenterEID(pName);

  let editButtons = !editButtonsQ ? "" : `
    <div id="presenterEditButtons_${pName}" w="${pEID} cw" class='editMode' style="float:right;">
        
      <div>
        <span name="privateness_span_holder" key="${pEID}" ename="${pName}"></span>        
        <i class="far fa-edit icon" style="margin-bottom: 2px;" title="Edit presenter data" onclick="editPresenter('${pName}')"></i>        
        <div class="myPlusDropdown" id="myPlusDropdown_${pName}">
            <!--img id="myPlusDropdownIcon_${pName}" src="/static/images/new.png" style="width:18px;" -->
            <i class="far fa-plus-square icon" title="Add presenter view" id="myPlusDropdownIcon_${pName}"></i>
            <div class="myPlusDropdown-content" id="myPlusDropdownContent_${pName}" style="left: -140px;">
                <span style="padding-top: 10px; padding-left: 10px; border-bottom: 1px solid black; width:100%;">Add:</span>
            </div>
        </div>
        <i class="fas fa-times icon" title="Remove presenter" onclick="deletePresenter('${pName}')"></i>
        &nbsp;
      </div>
    </div>
  `;
  let okCancelButtons = getOkCancelButtonsHTML(pName, okCancelQ, "margin: 0px 11px;");
  return `
    <div class='w3-row' id="title_${pName}">
      <div class='w3-col s8'>
        <h2 class="ptitleh2" id='presenterTitle_${pName}'>${pTitle} ${printEID ? " ["+pEID+"]" : ""}</h2>
      </div>
      <div class='w3-col s4' style="float:inline-end;">                   
         ${editButtons}${okCancelButtons}
      </div>
  </div>  
  `; 
}


function getPresenterHTML(id, author, date) {
  return `
    <div class='w3-container'>
      <div class='box'>
        <table style="width:100%; padding: 15px;">
          <tr><td class="gentd"><label for="alauthor-__key__">Author</label></td>
             <td><input class="almostW pEdit" disabled disabled readonly type="text" id="alauthor-__key__" value="${author}">
          </td></tr>         
          <tr><td class="gentd"><label for="aldate-__key__">Creation Date</label></td>
             <td><input class="almostW pEdit" disabled disabled readonly type="text" id="aldate-__key__" value="${date}">
          </td></tr>

          <tr><td class="gentd"><label for="presenterMTitle_${id}">Presenter title:</label></td>
              <td><input id='presenterMTitle_${id}'  class="almostW" type="text" >
          </td></tr>
          
          <tr><td class="gentd"><label for="presenterSTitle_${id}">Presenter short title:</label></td>
              <td><input id='presenterSTitle_${id}' class="almostW" type="text">
           </td></tr>

          <tr><td class="gentd"><label for="presenterDesc_${id}">Presenter description:</label></td>
              <td><textarea id='presenterDesc_${id}' class="almostW" style="margin-bottom:-20px;" type="text"></textarea>
          </td></tr>

        </table>  
      </div>
    </div>
  `;
}
function getQueryHTML(id, clock=false, hasTitle=true) {
  let clockButtons = !clock ? "" : `
    <div class='w3-row'>
      <img id="clockOn-playground" onclick="playgroundClockOnOff(0);" src="/static/images/clock48_1.png" style="width:20px;margin-right:5px; float:right;display:none">
      <img id="clockOf-playground" onclick="playgroundClockOnOff(1);" src="/static/images/clock48_0.png" style="width:20px;margin-right:5px; float:right;">
    </div>
  `;
  let indInfoButton   = infoButton("indicators");
  let groupInfoButton = infoButton("groupby");
  let title=!hasTitle ? "" :
  `
  <div class='w3-row'>
      <h2 id="queryTitle_${id}" style='font-family: customFont'>Select results</h2>
  </div>
  `; 
  return `
    <div class='w3-container'>
        ${clockButtons}
        <div class='box'>
            ${title}
            <div class='w3-row'>
                <div class='w3-col s6'>
                    <div class='box' style='margin-left: 5px; margin-right: 5px;'>
                        <div class='w3-row'>
                            <label for="qAlgorithms_${id}">Algorithms:</label>
                            <select id="qAlgorithms_${id}" multiple="multiple" style="width: 100%;">
                                <option value="*"  value="*">*</option>  
                            </select>
                        </div>
                        <div class='w3-row'>
                            <label for="qTestsets_${id}">Test sets:</label>
                            <select id="qTestsets_${id}" multiple="multiple" style="width: 100%;">
                                <option value="*"  value="*">*</option>  
                            </select>
                        </div>
                        <div class='w3-row'>
                            <label for="qParameters_${id}">Parameters:</label>
                            <select id="qParameters_${id}" multiple="multiple" style="width: 100%;">
                                <option value="*"  value="*">*</option>  
                            </select>
                        </div>
                        <div class='w3-row'>
                            <label for="qIndicators_${id}">Indicators:</label>${indInfoButton}
                            <select id="qIndicators_${id}" multiple="multiple" style="width: 100%;">
                                <option value="*"  value="*">*</option>  
                            </select>
                        </div>
                    </div>
                </div>
                <div class='w3-col s6'>                    
                    <div class='box' style='margin-left: 5px; margin-right: 5px;'>
                        <div class='w3-row'>
                            <label for="qGroupby_${id}">Group by:</label>${groupInfoButton}
                            <select id="qGroupby_${id}" multiple="multiple" style="width: 100%;">
                            </select> 
                        </div>                    
                        <div class='w3-row'>
                            <label for="qFilter_${id}">Filter:</label>
                            <select id="qFilter_${id}" multiple="multiple" style="width: 100%;">
                            </select> 
                        </div>
                        <div class='w3-row'>
                            <label for="qSortby_${id}">Sort by:</label>
                            <select id="qSortby_${id}" multiple="multiple" style="width: 100%;">
                            </select> 
                        </div>
                        <div class='w3-row'>
                            <label for="qComputerID_${id}">ComputerID:</label>
                            <select id="qComputerID_${id}" multiple="multiple" style="width: 100%;">
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;
}
function getDataTableDivHTML(id) {
  return `
    <div class='w3-container' style="color: gray;">
    <div class="box">
      <div class='w3-row'>
        <h2 id="dataTitle_${id}" style='font-family: customFont'>Data</h2>
      </div>
      <div class='w3-row'>
        <div id="presenterTable_${id}"></div>
      </div>
    </div>
    </div>
  `; 
}

function getOKCancelButtonsDiv(id) {
  return `
  <div class='w3-container'>
    <div class='box'>
      <div class='w3-row'>
        <div class='w3-col s6' style="display: flex; justify-content: center;">
          <button id="okbutton_${id}" class="w3-button w3-padding w3-round" style='width: 90%; background-color: #4ac17b'>OK</button>
        </div>
        <div class='w3-col s6' style="display: flex; justify-content: center;">
          <button id="cancelbutton_${id}" class="w3-button w3-padding w3-round" style='width: 90%; background-color: #4ac17b'>Cancle</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

function getPresenterDivHtml(pName, pTitle, editB, okcancelB) {
  let pTitleDivHTML = getPresenterTitleDivHTML(pName, pTitle, editB, okcancelB);
  return `
    <div id="${pName}" class="presenterTab ptitle">
        ${pTitleDivHTML}
        <div id='editPresenter_${pName}' style='display: none'></div>
        
        <div  id='editView_${pName}' style='display: none; padding: 0px 5px;'>
          <div id="viewCont_edit_${pName}"></div>
          <div class='w3-row' style="text-align:"></div>
        </div>

        <div class='${pName}' style='display: block' id='views_${pName}'></div>
    </div>
    `;
}

function wireButton(bId, action, param1, param2) {
    let buttonId = `#${bId}button`
    if ($(buttonId) != null) {
        // replace button with its clone (to remove listeners) ...
        $(buttonId).replaceWith($(buttonId).clone());
        // ... and register new listener
        //$(buttonId).on("click", action);
        $(buttonId).click({param1: param1, param2: param2}, action);
    }
}

function getProjectParameters() {
    return pageProject.parameters;
}
function getProjectIndicators() {
  let result = ["*EM", "*CNT", "*JVM"];
  pageProject.indicators.forEach(function(i){result.push(i.name);});
  pageProject.timers.forEach(function(i){result.push(i.name);});
  pageProject.counters.forEach(function(i){result.push(i.name);});
  return result;
}

function fillAndWireQuery(json, presenterID, refreshAction) {
    var algs =  Array.from(pageProject.algorithms.keys());  if (!algs.includes("*")) algs.unshift("*");
    var tsts =  Array.from(pageProject.testsets.keys());    if (!tsts.includes("*")) tsts.unshift("*");

    fillSelector(algs, json["Query"]["Algorithms"], "qAlgorithms_"+presenterID, "Select ...")
    wirePControl(presenterID, "qAlgorithms", json["Query"], "Algorithms",   "change", refreshAction);

    fillSelector(tsts, json["Query"]["TestSets"],   "qTestsets_"+presenterID, "Select ...")
    wirePControl(presenterID, "qTestsets", json["Query"], "TestSets",   "change", refreshAction);

    fillSelector(getProjectParameters(), json["Query"]["Parameters"],   "qParameters_"+presenterID, "Select ...")
    wirePControl(presenterID, "qParameters", json["Query"], "Parameters",   "change", refreshAction);

    fillSelector(getProjectIndicators(), json["Query"]["Indicators"],   "qIndicators_"+presenterID, "Select ...")
    wirePControl(presenterID, "qIndicators", json["Query"], "Indicators",   "change", refreshAction);

    fillSelector(getProjectParameters(), json["Query"]["GroupBy"],   "qGroupby_"+presenterID, "Select ...")
    wirePControl(presenterID, "qGroupby", json["Query"], "GroupBy",   "change", refreshAction);

    fillSelector([], json["Query"]["Filter"],   "qFilter_"+presenterID, "Select ...")
    wirePControl(presenterID, "qFilter", json["Query"], "Filter",   "change", refreshAction);

    fillSelector(getProjectParameters(), json["Query"]["SortBy"],   "qSortby_"+presenterID, "Select ...")
    wirePControl(presenterID, "qSortby", json["Query"], "SortBy",   "change", refreshAction);

    //fillSelector(['', "F0", ...projectComputers], [""]/*json["Query"]["ComputerID"]*/,   "qComputerID_"+presenterID, "")
    fillSelector(['', ...projectComputers], json["Query"]["ComputerID"],   "qComputerID_"+presenterID, "Select ...")
    wirePControl(presenterID, "qComputerID", json["Query"], "ComputerID",   "change", refreshAction);
}


function fillPresenterDiv(presenterID, divID, okAction, cancelAction) {
  var json = pp.presenterJSONs.get(presenterID);
  var div = document.getElementById(divID);
  if (div != null) {
    let author = json.Author ? json.Author : "algator";
    let date   = json.Date   ? json.Date   : "00/00/0000";

    div.innerHTML =  getPresenterTitleDivHTML(presenterID, json["Title"], false, true);
    div.innerHTML += getPresenterHTML(presenterID, author, date);
    //div.innerHTML += getQueryHTML(presenterID);
    //div.innerHTML += getDataTableDivHTML(presenterID);
    // div.innerHTML += getOKCancelButtonsDiv(presenterID);

    wireButton(presenterID+"_cancel", cancelAction);
    wireButton(presenterID+"_ok",     okAction);

    wirePControl(presenterID, "presenterMTitle", json, "Title",       "keyup");
    wirePControl(presenterID, "presenterSTitle", json, "ShortTitle",  "keyup");
    wirePControl(presenterID, "presenterDesc",   json, "Description", "keyup");
  }
}

function closeNewPresenterView() {
  $('#newPresenter').hide();
  $(curVisPresDiv).show();
  repaintViews();
}

function cancelNewPresenter() {
  // show tabs
  const tabPane = document.getElementById("tabwrapper_presenters");
  tabPane.style.display="flex";

  closeNewPresenterView();
}

async function createNewPresenter() {
    curVisPresDiv = $('#presenters').is(':visible') ? "#presenters" : "#presenters_data_panel";

    var pJSON = getPresenterDefaultJSON(newPresenterID);
    pp.presenterJSONs.set(newPresenterID, pJSON);

    fillPresenterDiv(newPresenterID, "newPresenter", newPresenterDone, cancelNewPresenter);

    document.getElementById("OKCancelButtons_" + newPresenterID).style.display = "flex";
    $('#newPresenter').show();
    $(curVisPresDiv).hide();

    // hide tabs
    const tabPane = document.getElementById("tabwrapper_presenters");
    tabPane.style.display="none";
}

function addNewPresenter() {
    return new Promise((resolve, reject) => {  
      var param = {
          csrfmiddlewaretoken: window.CSRF_TOKEN, 
          q: `alter {"Action":"NewPresenter", "ProjectName":${projectName}, "PresenterType":0, 'Author':'${current_user_username}', 'Date':'${getCurrentFormattedDate()}'}`
      };
      $.post(url, param, function(response) {
          var answer = response.answer; //!response->answer 
          try {
            let res = JSON.parse(answer);
            if (res.Status == 0)
                resolve(res.Answer);
            else
                resolve(res.Message);
          } catch (e) {
            resolve(answer);
          }
      }).fail(reject);
    });
}

function addPresenterToNavbar(newPresenterName, shortTitle) {
  pp.navbar.push(newPresenterName);
  var navBarElHtml = `
    <a id="navBarEl${newPresenterName}" class="w3-bar-item navBarEl" 
       style="background-color: white; color:black;" onclick="scrollToPresenter('${newPresenterName}')">${shortTitle}
    </a>
  `;
  $('#presentersCont').append(navBarElHtml);
}

async function newPresenterDone() {
    // show tabs
    const tabPane = document.getElementById("tabwrapper_presenters");
    tabPane.style.display="flex";


    let newPresenter =  await addNewPresenter();
    // check correctness of answer
    if (!(newPresenter && typeof newPresenter === 'object')) {
      showPopup(newPresenter);
      closeNewPresenterView();
      return;
    }

    let newPresenterName = newPresenter.Name;
    let newPresenterEID = newPresenter.eid;

    let presenterJSON = pp.presenterJSONs.get(newPresenterID);

    presenterJSON["Name"]  = newPresenterName;
    presenterJSON["eid"]  = newPresenterEID;

    addPresenterToNavbar(newPresenterName,presenterJSON["ShortTitle"]);

    var param = {
        csrfmiddlewaretoken: window.CSRF_TOKEN, 
        q: `alter {"Action":"SavePresenter", "ProjectName":"${projectName}", "PresenterName":"${newPresenterName}",  "PresenterData":${presenterToCleanString(presenterJSON)}}`
    };
  
    $.post(url, param, function(response) {
        var answer = response.answer; //!response->answer 
  
        if(answer.includes('"Status":0')){
            pp.presenterJSONs.set(newPresenterName, presenterJSON);
            pp.projectPresenters.push(newPresenterName);
            add_entity('et4', newPresenterEID, newPresenterName, true);

            closeNewPresenterView();

            addTab("presenters",newPresenterName, presenterJSON.ShortTitle, guardedShowPresenter);
            showPresenter("presenters", newPresenterName);
            showCorPresenterDiv(true, false); 


            var nopresentersDiv = document.getElementById("nopresenters");
            if (nopresentersDiv) nopresentersDiv.style.display="none";
        }
        else console.log("Error adding presenter!")
    });
}

async function addLockersToPresenter(presenterName) {
  let privatnessHolder = document.getElementById("presenterEditButtons_"+presenterName);
  if (privatnessHolder) {
    await populatePrivatnessSpans("presenter", privatnessHolder);
    showHidePrivatenessIcons(privatnessHolder);
  }
}


function editPresenter(presenterName) {
  var pJSON = pp.presenterJSONs.get(presenterName);
  pp.presenterJSONs.set(editPresenterID, pJSON);

  fillPresenterDiv(editPresenterID, "editPresenter_"+presenterName, editPresenterDone, cancelEditPresenter);

  window._presenterViewDirty = false;
  setTimeout(() => {
    const container = document.getElementById('editPresenter_' + presenterName);
    if (container) {
      const markDirty = () => { window._presenterViewDirty = true; };
      container.addEventListener('input',  markDirty);
      container.addEventListener('change', markDirty);
      container.addEventListener('click',  e => {
        if (e.target.matches('button,input,select,textarea')) markDirty();
      });
    }
  }, 0);

  freezOtherDivs(presenterName, '.presenterTab');
  $('#editPresenter_'+presenterName).show();
  $('#title_'+presenterName).hide();
  $('#views_'+presenterName).hide();
  scrollToPresenter(presenterName);
}

function resotrePresenterViewAfterEdit(presenterName) {
  window._presenterViewDirty = false;
  $('#editPresenter_'+presenterName).hide();
  $('#title_'+presenterName).show();
  $('#views_'+presenterName).show();

  $('#editPresenter_'+presenterName).empty();

  unfreezDivs('.presenterTab');
}

function cancelEditPresenter() {
  let presenterName = pp.presenterJSONs.get(editPresenterID)["Name"];
  resotrePresenterViewAfterEdit(presenterName);
}

function editPresenterDone() {
    let presenterJSON = pp.presenterJSONs.get(editPresenterID);
    let presenterName = presenterJSON["Name"];
    resotrePresenterViewAfterEdit(presenterName);

    changeTabTitle("presenters", presenterName, presenterJSON.ShortTitle);

    var param = {
        csrfmiddlewaretoken: window.CSRF_TOKEN, 
        q: `alter {"Action":"SavePresenter", "ProjectName":"${projectName}", "PresenterName":"${presenterName}",  "PresenterData":${presenterToCleanString(presenterJSON)}}`
    };
  
    $.post(url, param, function(response) {
        var answer = response.answer; //!response->answer 
  
        if(answer.includes('"Status":0')){
          let navEl = document.getElementById(`navBarEl${presenterName}`);
          if (navEl != null) navEl.innerHTML = presenterJSON["ShortTitle"];
       
          let elTitle = document.getElementById(`presenterTitle_${presenterName}`);
          if (elTitle != null) elTitle.innerHTML = presenterJSON["Title"];

          pp.presenterJSONs.set(presenterName, presenterJSON);

          scrollToPresenter(presenterName);
          redrawPresenterViews(presenterName);
        }
        else 
          showPopup(anwser);
    });
}


function freezOtherDivs(presenter, selectorID) {
  var elements = document.querySelectorAll(selectorID);
  elements.forEach(function(element) {
    if (element.id != presenter)
      element.classList.add("frozen-div");
  });
}
function unfreezDivs(selectorID) {
  var elements = document.querySelectorAll(selectorID);
  elements.forEach(function(element) {
      element.classList.remove("frozen-div");
  });
}


async function fillReportData(projectName, presenterName) {
  let presenterJSON = pp.presenterJSONs.get(presenterName);
  populatePresenterDiv(presenterJSON);
}


// remove all 's' (s2, s3, s4, s6, ...) classes 
function removeSClasses(element) {
  var regex = /^s\d+$/;
  var classes = element.className.split(' ');
  var filteredClasses = classes.filter(function(className) {
    return !regex.test(className);
  });
  element.className = filteredClasses.join(' ');
}

function populatePresenterDiv(presenterJson) {
  var layout = presenterJson.Layout;
  let presenterName = presenterJson.Name;
  if (layout) layout.forEach(function (row) {
    var widthClass = 's' + (Math.floor(12 / row.length)).toString();

    row.forEach(function (viewName) {
      let viewID = `${presenterName}_${viewName}`;
      let viewJSON = pp.presenterJSONs.get(presenterName)[viewName];
      let element = document.getElementsByName(viewID + "_outer")[0];
      if(element != null) {
        removeSClasses(element);
        element.classList.add(widthClass);
        // Clear any inline height a placeholder may have stamped on the presenterBox,
        // so it no longer constrains (flex-shrinks) the viewContainer inside.
        const presBox = element.querySelector('.presenterBox');
        if (presBox) presBox.style.height = '';
        // Restore view content height from saved view JSON
        const viewContEl = element.querySelector(`#view_${viewID}`);
        if (viewContEl && viewJSON?.height) viewContEl.style.height = viewJSON.height + 'px';
        getView(presenterName, viewName).drawView(viewJSON, "view_"+viewID);
      }
    });
  });
  if (pde) pde.updateUsageBadges();
}


function highlightTitle(presenterName) {
  pp.navbar.forEach(function(title) {
    let titEl = document.getElementById("navBarEl"+title);
    if (titEl) titEl.style.color = '#333';
  });
  let totEl = document.getElementById("navBarEl"+presenterName);
  if (totEl) totEl.style.color = "var(--submenu_color)";
}


function scrollToPresenter(presenterName){
 highlightTitle(presenterName);

 var prDiv = document.getElementById(presenterName);
 if (prDiv) prDiv.scrollIntoView({behavior: "smooth",  block: "nearest"});
}


function duplicatePresenterView(presenterName, viewName) {
  let presenterJSON = pp.presenterJSONs.get(presenterName);

  // Build a unique name for the copy (same type, next available number)
  let viewType    = viewName.split('_')[0];
  let newViewName = viewType + '_' + getNextViewNumber(presenterJSON, viewType);

  // Deep-copy the source view's settings
  presenterJSON[newViewName] = JSON.parse(JSON.stringify(presenterJSON[viewName]));

  // Insert a new single-view row immediately after the row that contains viewName
  let layout   = presenterJSON.Layout;
  let rowIndex = layout.findIndex(row => row.includes(viewName));
  if (rowIndex === -1) return;
  layout.splice(rowIndex + 1, 0, [newViewName]);

  // Insert the DOM row directly below the source view's row
  let sourceRow  = $(`div[name="${presenterName}_${viewName}_outer"]`).closest('.w3-row');
  let newRowHTML = '<div class="w3-row">' + getViewOuterHtml(presenterName, newViewName) + '</div>';
  sourceRow.after(newRowHTML);

  // Register view object, draw it, re-wire draggable and edit-mode buttons
  createNewView(presenterName, newViewName);
  getView(presenterName, newViewName).draw();
  makeDraggable();
  enableEditMode(isEditMode);

  // Persist
  savePresenter(projectName, presenterName, presenterJSON, null);
}

function deletePresenterView(presenterName, viewName) {
  showYesNoDialog("Do you want to delete this view?", deletePresenterViewPhase2, presenterName, viewName);
}

function deletePresenterViewPhase2(answer, presenterName, viewName) {
  if (answer != 0) return;

  let presenterJSON = pp.presenterJSONs.get(presenterName);
  removeElementFromArray(presenterJSON.Layout, viewName);
  delete presenterJSON[viewName];
  savePresenter(projectName, presenterName, presenterJSON, null);

  aLayout.views.delete(getViewID(presenterName, viewName))

  removeColWithId(presenterName, viewName);
}




function deletePresenter(presenterName){
  showYesNoDialog("Do you want to delete this presenter?", deletePresenterPhase2, presenterName);
}

function deletePresenterPhase2(answer, presenterName){
  if (answer != 0) return;

  var param = {
    csrfmiddlewaretoken: window.CSRF_TOKEN, 
    q: `alter {"Action":"RemovePresenter", "ProjectName":"${projectName}", "PresenterName":"${presenterName}"}`
  };

  $.post(url, param, function(response) {
    var answer = response.answer; //!response->answer 

    if(answer.includes('"Status":0')){
      $('#'+presenterName).remove();
        
      pp.presenterJSONs.delete(presenterName);
      let idx = pp.projectPresenters.indexOf(presenterName);
      if (idx !== -1) 
        pp.projectPresenters.splice(idx, 1);

      let nextTabID = removeTab("presenters", presenterName);

      if (pp.projectPresenters.length > 0)
        showPresenter("presenters", nextTabID);
      else
        showCorPresenterDiv(false, false);
    }


  })
}

function showCorPresenterDiv(hasEntities, showingData) {
  if (!showingData) {
    document.getElementById("loading_presenters_div").style.display  =  "none";
    document.getElementById(`no_presenters_div`)     .style.display  =  hasEntities ? "none" : "";
    document.getElementById(`presenters`)            .style.display  =  hasEntities ? ""     : "none";

    document.getElementById(`presenters_data_panel`) .style.display  = "none";
  } else {
    document.getElementById("loading_presenters_div").style.display  =  "none";
    document.getElementById(`no_presenters_div`)     .style.display  =  "none";
    document.getElementById(`presenters`)            .style.display  =  "none";

    document.getElementById(`presenters_data_panel`) .style.display  = "";    
  }
}


// ── Edit-guard modal & save ────────────────────────────────────────────────

// Returns a Promise<boolean>: true = Save, false = Cancel / ESC.
function showEditGuardModal(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.38)',
      'z-index:99999', 'display:flex', 'align-items:center', 'justify-content:center'
    ].join(';');

    const box = document.createElement('div');
    box.style.cssText = [
      'background:#fff', 'border-radius:10px', 'padding:26px 30px',
      'box-shadow:0 8px 36px rgba(0,0,0,0.22)',
      'min-width:320px', 'max-width:420px', 'font-family:inherit'
    ].join(';');

    box.innerHTML = `
      <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#1a1a1a;">
        Unsaved Changes
      </h3>
      <p style="margin:0 0 22px;font-size:13px;color:#444;line-height:1.55;">
        ${message || 'The current view has unsaved changes.<br>Save changes and continue?'}
      </p>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button id="_egCancel" style="
          padding:6px 18px;border-radius:20px;border:1px solid #c8c8c8;
          background:#f5f5f5;font-size:12px;font-weight:600;cursor:pointer;
          box-shadow:0 1px 3px rgba(0,0,0,.1);">Cancel</button>
        <button id="_egSave" style="
          padding:6px 18px;border-radius:20px;border:none;
          background:#2563eb;color:#fff;font-size:12px;font-weight:700;cursor:pointer;
          box-shadow:0 1px 3px rgba(0,0,0,.15);">Save</button>
      </div>`;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = result => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(result);
    };
    const onKey = e => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(false); });
    box.querySelector('#_egCancel').addEventListener('click', () => close(false));
    box.querySelector('#_egSave')  .addEventListener('click', () => close(true));
  });
}

// Saves whichever edit is currently active.
async function saveActiveEdit() {
  const pName = getActivePresenterName();
  if (pName && presenterEditActive()) {
    // Trigger the jQuery-bound OK handler so event.data is populated correctly.
    const okBtn = document.getElementById(pName + '_okbutton');
    if (okBtn) $(okBtn).trigger('click');
  }
  if (pdeEditActive()) {
    await pde.saveEdit(pde.editingId);
  }
}

// ── Edit-guard helpers ─────────────────────────────────────────────────────
// Returns the name (id) of the currently rendered .presenterTab div, or null.
function getActivePresenterName() {
  const el = document.querySelector('.presenterTab');
  return el ? el.id : null;
}

// True if a presenter view-editor or presenter-settings editor is open.
function presenterEditActive() {
  const pName = getActivePresenterName();
  if (!pName) return false;
  const editViewEl  = document.getElementById('editView_'      + pName);
  const editPresEl  = document.getElementById('editPresenter_' + pName);
  const isVis = el => el && getComputedStyle(el).display !== 'none';
  return isVis(editViewEl) || isVis(editPresEl);
}

// True if a PDE box is open in the editor.
function pdeEditActive() {
  return typeof pde !== 'undefined' && pde && pde.editingId !== null;
}

// True if there are unsaved changes worth asking about.
// presenterEditActive() alone is not enough — the user must have actually changed
// something (tracked by _presenterViewDirty) to warrant the dialog.
function anyEditActive() {
  return (presenterEditActive() && window._presenterViewDirty === true) || pdeEditActive();
}

// Silently cancel whichever edit is currently active.
function cancelAnyActiveEdit() {
  const pName = getActivePresenterName();
  if (pName) {
    const editViewEl = document.getElementById('editView_'      + pName);
    const editPresEl = document.getElementById('editPresenter_' + pName);
    if (editViewEl && getComputedStyle(editViewEl).display !== 'none') hideViewEdit(pName);
    if (editPresEl && getComputedStyle(editPresEl).display !== 'none') cancelEditPresenter();
  }
  if (pdeEditActive()) pde.cancelEdit(pde.editingId);
}

// Guarded version of showPresenter: asks for confirmation when an edit is active.
// Used as the tab onclick callback — showPresentersData stays unguarded (always allowed).
async function guardedShowPresenter(paneID, tabID) {
  // Returning to the same presenter that has an active view-edit (dirty or not):
  // the #presenters div is merely hidden — just un-hide it.  Do NOT call
  // showPresenter() which would rebuild presentersDiv.innerHTML and destroy the editor.
  if (presenterEditActive() && tabID === getActivePresenterName() && !pdeEditActive()) {
    showCorPresenterDiv(true, false);
    selectTab(paneID, tabID);
    return;
  }

  // Switching to a different presenter — only ask if the user actually changed something.
  if (anyEditActive()) {
    // Bring the editing presenter into view first so the user sees what the question
    // is about before the modal appears.
    if (presenterEditActive()) {
      const editingName = getActivePresenterName();
      showCorPresenterDiv(true, false);
      selectTab(paneID, editingName);
      scrollToPresenter(editingName);
      await new Promise(r => setTimeout(r, 80));
    }

    const save = await showEditGuardModal(
      'The current view has unsaved changes.<br>Save and switch to the selected presenter?'
    );
    if (!save) return;   // Cancel / ESC — stay in edit mode
    await saveActiveEdit();
  }
  showPresenter(paneID, tabID);
}
// ── end edit-guard helpers ─────────────────────────────────────────────────

function showPresentersData() {
  showCorPresenterDiv(false, true);
  selectTab("presenters", "presData");
  setPresentersDataHeight();
  if (pde) {
    pde.restoreScroll();
    if (pde._pendingFreshStart) {
      pde._pendingFreshStart = false;
      if (pde.boxes.length === 0) pde.addFirstClassBox(false);
    }
    pde.updateUsageBadges();
  }
}


function setPresentersDataHeight() {
  var presDataDiv = document.getElementById("presenters_data_panel");
  var contentDiv = document.getElementById('presentersContent');
  presDataDiv.style.height = (window.innerHeight - contentDiv.offsetTop - 22) + 'px';
}



// funkcija je bila dodana, ko sem spremenil način pridobivanja podatkov posameznega prezenterja;
// prej je imel vsak prezenter svojo poizvedbo, sedaj so poizvedbe skupne. Ko uporabnik odpre
// star prezenter, ga ta funkcija preoblikuje v novo obliko in shrani. Ko bodo vsi projekti pretvorjeni
// v nov sistem, ta funkcija ne bo več potrebna (in jo bom lahko odstranil). 
async function migratePresenterIfNeeded(presenterName) {
 const presenter = pp.presenterJSONs.get(presenterName);
  if (!presenter) return;

  // Backfill missing height on view JSONs (added when per-view resize was introduced)
  const defaultHeights = { Graph: 450, Table: 450, TextBox: 450 };
  let heightMigrated = false;
  (presenter.Layout || []).flat().forEach(vName => {
    if (presenter[vName] && !('height' in presenter[vName])) {
      const type = vName.split('_')[0];
      presenter[vName].height = defaultHeights[type] ?? 350;
      heightMigrated = true;
    }
  });
  if (heightMigrated) savePresenter(projectName, presenterName, presenter, null);

  if (!('Query' in presenter)) return;

  // reuse existing Q node if its query matches
  const queryStr = JSON.stringify(presenter.Query);
  const existingNode = pde.boxes.find(b =>
    b.type === 'Q' && JSON.stringify(b.json?.Query) === queryStr
  );

  if (existingNode) {
    presenter.Layout.flat().forEach(viewName => {
      if (presenter[viewName] && !viewName.startsWith('TextBox_')) presenter[viewName].data_source = existingNode.id;
    });
    delete presenter.Query;
    savePresenter(projectName, presenterName, presenter, null);
    pp.presenterJSONs.set(presenterName, presenter);
    return;
  }

  // derive box name from presenter's numeric suffix (Presenter_3 → data_3)
  const match = presenterName.match(/_(\d+)$/);
  let num = match ? parseInt(match[1]) : ++pde.boxCounter;
  let boxName = `data_${num}`;
  while (pde.boxes.find(b => b.name === boxName))
    boxName = `data_${++pde.boxCounter}`;
  if (num > pde.boxCounter) pde.boxCounter = num;

  // find non-overlapping position (to the right of existing nodes)
  let posX = 100, posY = 100;
  if (pde.boxes.length > 0) {
    posX = Math.max(...pde.boxes.map(b => b.x + b.w)) + 50;
    posY = pde.boxes[0].y;
  }

  // build the new Q dataNode
  const id = 'box_' + Math.random().toString(36).substr(2, 9);
  const newNode = {
    id, name: boxName, type: 'Q',
    parents: [],
    json: { Description: 'Query', Query: presenter.Query },
    x: posX, y: posY,
    w: BOXES['Q'].w, h: BOXES['Q'].h,
    isEditing: false,
    preEditSize: { w: BOXES['Q'].w, h: BOXES['Q'].h },
    isNew: false
  };

  // set data_source on all non-TextBox views (TextBox views reference data via $token{} syntax)
  presenter.Layout.flat().forEach(viewName => {
    if (presenter[viewName] && !viewName.startsWith('TextBox_')) presenter[viewName].data_source = id;
  });

  // remove old Query field
  delete presenter.Query;

  // fetch data, add to pde, render
  newNode.data = await pde.compileData(newNode);
  pde.boxes.push(newNode);
  pde.renderBox(newNode, false);
  pde.drawArrows();

  // persist both presenter and pde state
  savePresenter(projectName, presenterName, presenter, null);
  pde.savePdeState(projectName);

  pp.presenterJSONs.set(presenterName, presenter);
}