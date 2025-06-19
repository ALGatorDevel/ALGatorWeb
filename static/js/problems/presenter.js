class PagePresenters extends PageData {
  services = {
    'get_presenters': {
      'endpoint': '/projects/get_presenters',
      'method'  : 'GET',
      'params'  : ["ProjectName"],
      'comment' : ''
    }
  };

  constructor() {
    super();

    this.projectPresenters = [];
    this.presenterJSONs    = new Map();
    this.navbar            = [];
  }

  setVar(type, value) {
    switch (type) {
      case "get_presenters": this.storePresenters(value); break;  
    }
  }

  storePresenters(value) {
    this.projectPresenters = value[0];

    Object.keys(value[1]).forEach(pName => this.presenterJSONs.set(pName, value[1][pName]));
  }
}

pp = new PagePresenters();
presentersShown = false;


async function showPresenters() {
  if (!presentersShown) {
    await pp.waitForDataToLoad(["get_presenters"], false, {'ProjectName': projectName}); 
    let presentersDiv = document.getElementById("presenters");
    pp.projectPresenters.forEach(pName => {
      try {
        let presenter = pp.presenterJSONs.get(pName);
        presentersDiv.innerHTML += getPresenterDivHtml(pName, presenter.Title, true, false);
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
        addPresenterToNavbar(pName, presenter.ShortTitle);
      } catch (e){}      
    });
    await populatePrivatnessSpans("presenter");
    showHidePrivatenessIcons();
    if (pp.projectPresenters.length > 0) scrollToPresenter(pp.projectPresenters[0]);
    document.getElementById("nopresenters").innerHTML = pp.projectPresenters.length == 0 ? "No presenters available." : "";
    presentersShown = true;
  }
  
  enableEditMode(isEditMode);

  fillReportData(projectName);
  repaintViews();
  MathJax.typeset();
}


// ids of tmp presenters (to be stored in pp.presenterJSONs during new/edit process)
newPresenterID  = "newPresenter";
editPresenterID = "editPresenter";

function getQueryDefaultJSON(){
    return {
            "Algorithms": ["*"],
            "ComputerID": "",
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
          "Query"      : getQueryDefaultJSON(),
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
        <span name="privateness_span_holder" key="${pEID}" ename="${pName}">#</span>        
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
  let okCancelButtons = getOkCancelButtonsHTML(pName, okCancelQ);
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
          <tr><td class="gentd"><label for="alauthor-__key__">Author of implementation</label></td>
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
function getQueryHTML(id, clock=false) {
  let clockButtons = !clock ? "" : `
    <div class='w3-row'>
      <img id="clockOn-playground" onclick="playgroundClockOnOff(0);" src="/static/images/clock48_1.png" style="width:20px;margin-right:5px; float:right;display:none">
      <img id="clockOf-playground" onclick="playgroundClockOnOff(1);" src="/static/images/clock48_0.png" style="width:20px;margin-right:5px; float:right;">
    </div>
  `;
  let indInfoButton   = infoButton("indicators");
  let groupInfoButton = infoButton("groupby");
  return `
    <div class='w3-container'>
        ${clockButtons}
        <div class='box'>
            <div class='w3-row'>
                <h2 id="queryTitle_${id}" style='font-family: customFont'>Select results</h2>
            </div>

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
                            <select class="w3-select" id="qComputerID_${id}" style="width: 100%;">
                            </select>
                        </div>
                        <div class='w3-row'>
                            <input class="w3-check" id='qCount_${id}' type="checkbox" >
                            <label for='qCount_${id}'>Count</label>
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

    fillSelector(['', "F0", ...projectComputers], [""]/*json["Query"]["ComputerID"]*/,   "qComputerID_"+presenterID, "")
    wirePControl(presenterID, "qComputerID", json["Query"], "ComputerID",   "change", refreshAction);

    wirePCheckbox(presenterID, "qCount", json["Query"], "Count", refreshAction);
}


function fillPresenterDiv(presenterID, divID, okAction, cancelAction, refreshAction) {
  var json = pp.presenterJSONs.get(presenterID);
  var div = document.getElementById(divID);
  if (div != null) {
    let author = json.Author ? json.Author : "algator";
    let date   = json.Date   ? json.Date   : "00/00/0000";

    div.innerHTML =  getPresenterTitleDivHTML(presenterID, json["Title"], false, true);
    div.innerHTML += getPresenterHTML(presenterID, author, date);
    div.innerHTML += getQueryHTML(presenterID);
    div.innerHTML += getDataTableDivHTML(presenterID);
    // div.innerHTML += getOKCancelButtonsDiv(presenterID);

    wireButton(presenterID+"_cancel", cancelAction);
    wireButton(presenterID+"_ok",     okAction);

    wirePControl(presenterID, "presenterMTitle", json, "Title",        "keyup");
    wirePControl(presenterID, "presenterSTitle", json, "ShortTitle",   "keyup");
    wirePControl(presenterID, "presenterDesc",   json, "Descripotion", "keyup");

    fillAndWireQuery(json, presenterID, refreshAction);
  }
}

function closeNewPresenterView() {
  $('#newPresenter').hide();
  $('#presenters').show();
  repaintViews();
}

function cancelNewPresenter() {
  closeNewPresenterView();
}


async function createNewPresenter() {
    var pJSON = getPresenterDefaultJSON(newPresenterID);
    pp.presenterJSONs.set(newPresenterID, pJSON);

    fillPresenterDiv(newPresenterID, "newPresenter", newPresenterDone, cancelNewPresenter, refreshNewPresenterData);

    refreshNewPresenterData();

    document.getElementById("OKCancelButtons_" + newPresenterID).style.display = "flex";
    $('#newPresenter').show();
    $('#presenters').hide();
}

function refreshNewPresenterData() {
    refreshData(newPresenterID);
}
function refreshEditPresenterData() {
    refreshData(editPresenterID);
}

async function refreshData(presenterID) {
  let json = pp.presenterJSONs.get(presenterID);
  let queryJson = (json != null) ? json["Query"] : {};
  let newPresenterData = await getData(url, projectName, json);
  presenterData.set(presenterID, newPresenterData);
  drawTable(newPresenterData, `presenterTable_${presenterID}`, "350px", false);
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
        q: `alter {"Action":"SavePresenter", "ProjectName":"${projectName}", "PresenterName":"${newPresenterName}",  "PresenterData":${JSON.stringify(presenterJSON)}}`
    };
  
    $.post(url, param, function(response) {
        var answer = response.answer; //!response->answer 
  
        if(answer.includes('"Status":0')){
            pp.presenterJSONs.set(newPresenterName, presenterJSON);
            presenterData.set(newPresenterName, presenterData.get(newPresenterID));
            pp.projectPresenters.push(newPresenterName);
            add_entity('et4', newPresenterEID, newPresenterName, true);


            closeNewPresenterView();
            let pHTML = getPresenterDivHtml(newPresenterName, presenterJSON["Title"], true, false);
            $('#presenters').append(pHTML);
            document.getElementById("myPlusDropdownContent_"+newPresenterName).innerHTML += 
              getViewsDropDownItems(newPresenterName);

            addLockersToNewPresenter(newPresenterName);

            scrollToPresenter(newPresenterName);

            var nopresentersDiv = document.getElementById("nopresenters");
            if (nopresentersDiv) nopresentersDiv.style.display="none";
        }
        else console.log("Error adding presenter!")
    });
}

async function addLockersToNewPresenter(newPresenterName) {
  let privatnessHolder = document.getElementById("presenterEditButtons_"+newPresenterName);
  if (privatnessHolder) {
    await populatePrivatnessSpans("presenter", privatnessHolder);
    showHidePrivatenessIcons(privatnessHolder);
  }
}


function editPresenter(presenterName) {
  var pJSON = pp.presenterJSONs.get(presenterName);
  pp.presenterJSONs.set(editPresenterID, pJSON);

  fillPresenterDiv(editPresenterID, "editPresenter_"+presenterName, editPresenterDone, cancelEditPresenter, refreshEditPresenterData);
  refreshEditPresenterData();

  freezOtherDivs(presenterName, '.presenterTab');
  $('#editPresenter_'+presenterName).show();
  $('#title_'+presenterName).hide();
  $('#views_'+presenterName).hide();
  scrollToPresenter(presenterName);
}

function resotrePresenterViewAfterEdit(presenterName) {
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
    let pData         = presenterData.get(editPresenterID);
    let presenterName = presenterJSON["Name"];
    resotrePresenterViewAfterEdit(presenterName);

    var param = {
        csrfmiddlewaretoken: window.CSRF_TOKEN, 
        q: `alter {"Action":"SavePresenter", "ProjectName":"${projectName}", "PresenterName":"${presenterName}",  "PresenterData":${JSON.stringify(presenterJSON)}}`
    };
  
    $.post(url, param, function(response) {
        var answer = response.answer; //!response->answer 
  
        if(answer.includes('"Status":0')){
          let navEl = document.getElementById(`navBarEl${presenterName}`);
          if (navEl != null) navEl.innerHTML = presenterJSON["ShortTitle"];
       
          let elTitle = document.getElementById(`presenterTitle_${presenterName}`);
          if (elTitle != null) elTitle.innerHTML = presenterJSON["Title"];

          pp.presenterJSONs.set(presenterName, presenterJSON);
          presenterData. set(presenterName, pData);

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


async function fillReportData(projectName) {
  for (let [presenterName, presenterJSON] of pp.presenterJSONs) {
    let data = await getData(url, projectName, presenterJSON);
    presenterData.set(presenterName, data);
    populatePresenterDiv(data, presenterJSON);
  };
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

function populatePresenterDiv(data, presenterJson) {
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
        getView(presenterName, viewName).drawView(viewJSON, "view_"+viewID);
      }
    });
  });
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
    
      $('#navBarEl'+presenterName).remove();
      pp.navbar = pp.navbar.filter(element => element !== presenterName);
    
      pp.presenterJSONs.delete(presenterName);
      presenterData.delete(presenterName);
      let idx = pp.projectPresenters.indexOf(presenterName);
      if (idx !== -1) 
        pp.projectPresenters.splice(idx, 1);
    }


  })
}
