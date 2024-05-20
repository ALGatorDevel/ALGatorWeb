// ids of tmp presenters (to be stored in presenterJSONs during new/edit process)
newPresenterID  = "newPresenter";
editPresenterID = "editPresenter";

function getQueryDefaultJSON(){
    return {
            "Algorithms": ["*"],
            "ComputerID": "F0.C0",
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
          "Name": `${name}`,
          "Title": `New presenter`,
          "ShortTitle": `${name}`,
          "Description": "",
          "Query": getQueryDefaultJSON(),
          "Layout": [],
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


function getPresenterTitleDivHTML(pName, pTitle, editButtonsQ, okCancelQ) {
  let editButtons = !editButtonsQ ? "" : `
    <div id="presenterEditButtons_${pName}" class='editMode' style="float:right;">
        
        
      <div class="myPlusDropdown" id="myPlusDropdown_${pName}">
          <img id="myPlusDropdownIcon_${pName}" src="/static/images/new.png" style="width:18px;" />
          <!--i class="far fa-plus-square icon" id="myPlusDropdownIcon_${pName}"></i-->
          <div class="myPlusDropdown-content" id="myPlusDropdownContent_${pName}" style="left: -140px;">
              <span style="padding-top: 10px; padding-left: 10px; border-bottom: 1px solid black; width:100%;">Add:</span>
          </div>
      </div>
      <i class="fa-solid fa-pen-to-square icon" onclick="editPresenter('${pName}')"></i>
      <i class="fa-solid fa-times icon" onclick="deletePresenter('${pName}')"></i>
      &nbsp;
    </div>
  `;
  let okCancelButtons = getOkCancelButtonsHTML(pName, okCancelQ);
  return `
    <div class='w3-row ptitle' id="title_${pName}">
      <div class='w3-col s8'>
        <h2 class="ptitleh2" id='presenterTitle_${pName}'>${pTitle}</h2>
      </div>
      <div class='w3-col s4' style="float:inline-end;">                   
         ${editButtons}${okCancelButtons}
      </div>
  </div>  
  `; 
}

function getPresenterHTML(id) {
  return `
    <div class='w3-container'>
      <div class='box'>
          <div class='w3-row'>
              <label for="presenterMTitle_${id}">Presenter title:</label>
              <input id='presenterMTitle_${id}'  class="w3-input w3-border w3-round" type="text" style="width: 100%; height: 30px">
          </div>
          <div class='w3-row'>
              <label for="presenterSTitle_${id}">Presenter short title:</label>
              <input id='presenterSTitle_${id}' class="w3-input w3-border w3-round" type="text" style="width: 100%; height: 30px">
          </div>
          <div class='w3-row'>
              <label for="presenterDesc_${id}">Presenter description:</label>
              <input id='presenterDesc_${id}' class="w3-input w3-border w3-round" type="text" style="width: 100%; height: 30px">
          </div>
      </div>
    </div>
  `;
}
function getQueryHTML(id) {
  return `
    <div class='w3-container'>
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
                            <label for="qIndicators_${id}">Indicators:</label>
                            <select id="qIndicators_${id}" multiple="multiple" style="width: 100%;">
                                <option value="*"  value="*">*</option>  
                            </select>
                        </div>
                    </div>
                </div>
                <div class='w3-col s6'>                    
                    <div class='box' style='margin-left: 5px; margin-right: 5px;'>
                        <div class='w3-row'>
                            <label for="qGroupby_${id}">Group by:</label>
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
    <div id="${pName}" class="presenterTab">
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
  pageProject.indicators.forEach(function(i){result.push(i);});
  pageProject.timers.forEach(function(i){result.push(i);});
  pageProject.counters.forEach(function(i){result.push(i);});
  return result;
}

function fillAndWireQuery(json, presenterID, refreshAction) {
    var algs = projectJSON["Algorithms"].slice(); if (!algs.includes("*")) algs.unshift("*");
    var tsts = projectJSON["TestSets"].slice();   if (!tsts.includes("*")) tsts.unshift("*");

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

    fillSelector(projectJSON["Computers"], json["Query"]["ComputerID"],   "qComputerID_"+presenterID, "")
    wirePControl(presenterID, "qComputerID", json["Query"], "ComputerID",   "change", refreshAction);

    wirePCheckbox(presenterID, "qCount", json["Query"], "Count", refreshAction);
}


function fillPresenterDiv(presenterID, divID, okAction, cancelAction, refreshAction) {
  var json = presenterJSONs.get(presenterID);
  var div = document.getElementById(divID);
  if (div != null) {
    div.innerHTML =  getPresenterTitleDivHTML(presenterID, json["Title"], false, true);
    div.innerHTML += getPresenterHTML(presenterID);
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
    presenterJSONs.set(newPresenterID, pJSON);

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
  let json = presenterJSONs.get(presenterID);
  let queryJson = (json != null) ? json["Query"] : {};
  let newPresenterData = await getData(url, projectName, json);
  presenterData.set(presenterID, newPresenterData);
  drawTable(newPresenterData, `presenterTable_${presenterID}`, "350px");
}


function addNewPresenter() {
    return new Promise((resolve, reject) => {
        
      var param = {
          csrfmiddlewaretoken: window.CSRF_TOKEN, 
          q: `alter {"Action":"NewPresenter", "ProjectName":${projectName}, "PresenterType":0}`
      };
      $.post(url, param, function(response) {
          var answer = response.response; 
          let res = answer;
          try {res = JSON.parse(answer).Answer;} catch (e) {}
          resolve(res);
          return;
      }).fail(reject);
    });
}

async function newPresenterDone() {
    let newPresenterName =  await addNewPresenter();
    let presenterJSON = presenterJSONs.get(newPresenterID);

    presenterJSON["Name"]=newPresenterName;
    navBars.results.push({'sectionId': newPresenterName})
    var navBarElHtml = `
      <a id="navBarEl${newPresenterName}" class="w3-bar-item navBarEl" 
         style="background-color: white;" onclick="scrollToPresenter('${newPresenterName}')">
            ${presenterJSON["ShortTitle"]}
      </a>
    `;
    $('#presentersCont').append(navBarElHtml);

    var param = {
        csrfmiddlewaretoken: window.CSRF_TOKEN, 
        q: `alter {"Action":"SavePresenter", "ProjectName":"${projectName}", "PresenterName":"${newPresenterName}",  "PresenterData":${JSON.stringify(presenterJSON)}}`
    };
  
    $.post(url, param, function(response) {
        var answer = response.response; 
  
        if(answer.includes('"Status":0')){
            presenterJSONs.set(newPresenterName, presenterJSON);
            presenterData.set(newPresenterName, presenterData.get(newPresenterID));
            projectJSON["MainProjPresenters"].push(newPresenterName);

            closeNewPresenterView();
            let pHTML = getPresenterDivHtml(newPresenterName, presenterJSON["Title"], true, false);
            $('#presenters').append(pHTML);
            document.getElementById("myPlusDropdownContent_"+newPresenterName).innerHTML += 
              getViewsDropDownItems(newPresenterName);
            scrollToPresenter(newPresenterName);
            document.getElementById("nopresenters").style.display="none";
        }
        else console.log("Error adding presenter!")
    });
}


function editPresenter(presenterName) {
  var pJSON = presenterJSONs.get(presenterName);
  presenterJSONs.set(editPresenterID, pJSON);

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
  let presenterName = presenterJSONs.get(editPresenterID)["Name"];
  resotrePresenterViewAfterEdit(presenterName);
}

function editPresenterDone() {
    let presenterJSON = presenterJSONs.get(editPresenterID);
    let pData         = presenterData.get(editPresenterID);
    let presenterName = presenterJSON["Name"];
    resotrePresenterViewAfterEdit(presenterName);

    var param = {
        csrfmiddlewaretoken: window.CSRF_TOKEN, 
        q: `alter {"Action":"SavePresenter", "ProjectName":"${projectName}", "PresenterName":"${presenterName}",  "PresenterData":${JSON.stringify(presenterJSON)}}`
    };
  
    $.post(url, param, function(response) {
        var answer = response.response; 
  
        if(answer.includes('"Status":0')){
          let navEl = document.getElementById(`navBarEl${presenterName}`);
          if (navEl != null) navEl.innerHTML = presenterJSON["ShortTitle"];
       
          let elTitle = document.getElementById(`presenterTitle_${presenterName}`);
          if (elTitle != null) elTitle.innerHTML = presenterJSON["Title"];

          presenterJSONs.set(presenterName, presenterJSON);
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
  for (let [presenterName, presenterJSON] of presenterJSONs) {
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
      let viewJSON = presenterJSONs.get(presenterName)[viewName];
      let element = document.getElementsByName(viewID + "_outer")[0];
      if(element != null) {
        console.log(viewID + element.classList);
        removeSClasses(element); 
        element.classList.add(widthClass);
        console.log(viewID + element.classList);
        getView(presenterName, viewName).drawView(viewJSON, "view_"+viewID);
      }
    });
  });
}


function showSection(sectionId, sections) {
  sections.forEach(function(section) {
    document.getElementById(section.sectionId).style.display = 'none';
    document.getElementById("navBarEl"+section.sectionId).style.color = '#333';
  });
  document.getElementById("navBarEl"+sectionId).style.color = '#27ae60';
  document.getElementById(sectionId).style.display = 'block';
}


function scrollToPresenter(presenterName){

  if(document.getElementById("navBarEl"+presenterName) !== null){
    navBars.results.forEach(function(section) {
      document.getElementById("navBarEl"+section.sectionId).style.color = '#333';
    });
    document.getElementById("navBarEl"+presenterName).style.color = '#27ae60';
  }
  
  let topOffset = 0;
  
  for (let index = 0; index < presentersDataJSON.length; index++) {

    if(presenterName === presentersDataJSON[index].Name)
      break;
    
    var divElement = document.getElementById(presentersDataJSON[index].Name);
    var height = divElement.clientHeight;
    topOffset += height;
  }

  $("#presentersContent").animate({
    scrollTop: topOffset
  }, 800); 

}


function deletePresenterView(presenterName, viewName) {
  showYesNoDialog("Do you want to delete this view?", deletePresenterViewPhase2, presenterName, viewName);
}

function deletePresenterViewPhase2(answer, presenterName, viewName) {
  if (answer != 0) return;

  let presenterJSON = presenterJSONs.get(presenterName);
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
    var answer = response.response; 

    if(answer.includes('"Status":0')){
      $('#'+presenterName).remove();
      $('#navBarEl'+presenterName).remove();
      navBars.results = navBars.results.filter(function(item) {
        return item.sectionId !== presenterName;
      });

      presenterJSONs.delete(presenterName);
      presenterData.delete(presenterName);
      let idx = projectJSON["MainProjPresenters"].indexOf(presenterName);
      if (idx !== -1) 
        projectJSON["MainProjPresenters"].splice(idx, 1);
    }


  })
}
