let playgroundID = "playground";
let numberOfViews = 1;
let playgroundViews = new Map();

function fillPlaygroundDiv() {
  let qElt = document.getElementById('queryEditorDiv');
  if (qElt != null) {
    qElt.innerHTML = '<div style="height:20px;"></div>'
    qElt.innerHTML += getQueryHTML(playgroundID);
    //qElt.innerHTML += getDataTableDivHTML(playgroundID);
    
    let playgroundJSON  = getPresenterDefaultJSON();
    presenterJSONs.set(playgroundID, playgroundJSON);

    fillAndWireQuery(playgroundJSON, playgroundID, queryChanged);
    queryChanged();

    document.getElementById("playgroundViewsDropdown").innerHTML += getQueryViewsDropItems();
    $('#querySubNavBar').append(getNavBarElement("queryTitle_" + playgroundID, "Select"));
    //$('#querySubNavBar').append(getNavBarElement("dataTitle_"  + playgroundID, "Data"));
    
    setTimeout(() => {addNewPlaygroundView("Table")}, 1000);
  }
}

function getQueryViewsDropItems(pName) {
  let result = "";
  let views = AView.registeredViewsForPlayground;
  for (let i = 0; i < views.length; i++)
    result += `<div class="newviewitem" onclick="addNewPlaygroundView('${views[i]}');">${views[i]}</div>`;
  return result;
}

async function queryChanged() {
  let playgroundJSON = presenterJSONs.get(playgroundID);
  let queryPresenterData = await getData(url, projectName, playgroundJSON);
  presenterData.set(playgroundID, queryPresenterData);
  drawTable(queryPresenterData, `presenterTable_${playgroundID}`, "350px");

  for (let [viewName, view] of playgroundViews) {
    view.fillControlsAfterDataChange();
    view.draw();
  };
}

function addNewPlaygroundView(viewType) {
  let viewName = viewType + "_" + (numberOfViews++);
  newViewObject = getViewOfType(viewType, playgroundID, viewName); 
  playgroundViews.set(viewName, newViewObject);
  newViewObject.initNewMode();
  addAndEditPlaygroundView(viewName, newViewObject);
}

function getNavBarElement(tagName, tagTitle) {
  return `
    <a id="qeElt_${tagName}" class="w3-bar-item navBarEl bw qeELt" style="background-color: white; color: rgb(51, 51, 51);" 
       onclick="scrollToQueryView('${tagName}')">${tagTitle}</a>
  `;   
}

function addAndEditPlaygroundView(viewName, aView) {
  $("#queryViewsDiv").append(  
  `<div id="playgroundViewTitle_${viewName}" class="box">

     <div id="queryViewsDiv_${viewName}" class="w3-row" style="position: relative;">
       <h2 style="margin:0px;">${viewName}</h2>
       <i class="fas fa-times icon" onclick="deletePlaygroundView('${viewName}')" style="position:absolute;top:0;right:0;"></i>
     </div>
     <div class="w3-row">
       ${aView.getEditorHTML()}
     </div>
   </div>`);

   $('#querySubNavBar').append(getNavBarElement("playgroundViewTitle_" + viewName, viewName));

  aView.fillDataAndWireControls();   

  scrollToQueryView("playgroundViewTitle_" + viewName);
}

function deletePlaygroundView(viewName) {
  showYesNoDialog("Do you want to delete " + viewName + "?", deletePlaygroundViewPhase2, viewName);
}
function deletePlaygroundViewPhase2(answer, viewName) {
  if (answer != 0) return;
  
  $(`#playgroundViewTitle_${viewName}`).remove();
  $(`#qeElt_playgroundViewTitle_${viewName}`).remove();
  playgroundViews.delete(viewName);
}


function scrollToQueryView(tag) {
  $('.qeELt').each(function(i, qeElt) {
    qeElt.style.color = '#333';
  });
  document.getElementById("qeElt_"+tag).style.color = '#27ae60';
  


  var myElement = document.getElementById(tag);
  var topPos = myElement.offsetTop;
  document.getElementById('playgroundInnerContent').scrollTop = topPos - 105;
}

