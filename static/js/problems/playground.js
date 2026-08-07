let playgroundID = "playground";
let numberOfViews = 1;
let playgroundViews = new Map();
let playgroundPde = null;

async function fillPlaygroundDiv() {
  playgroundPde = createPde('playground_pde');
  await playgroundPde.init();  // always fresh — no saved state

  // prevent playground from ever overwriting the project's PDE state on the server
  clearInterval(playgroundPde._autosaveInterval);
  playgroundPde._autosaveInterval = null;
  playgroundPde.savePdeState = () => {};

  // refresh all views after any PDE structural or data change
  ['saveEdit', 'confirmRemove'].forEach(method => {
    const orig = playgroundPde[method].bind(playgroundPde);
    playgroundPde[method] = async function(...args) {
      await orig(...args);
      refreshPlaygroundViews();
    };
  });
  const origRenderBox = playgroundPde.renderBox.bind(playgroundPde);
  playgroundPde.renderBox = function(...args) {
    origRenderBox(...args);
    refreshPlaygroundViews();
  };

  // add default Q box (safe now — autosave is disabled above)
  await playgroundPde.addFirstClassBox(false);

  document.getElementById("playgroundViewsDropdown").innerHTML += getQueryViewsDropItems();
  setTimeout(() => { addNewPlaygroundView("Table"); }, 1000);
}

function refreshPlaygroundViews() {
  for (const [, view] of playgroundViews) {
    fillDataSourceSelector('data_source_' + view.viewID, view.viewJSON["data_source"], playgroundPde);
    view.fillControlsAfterDataChange();
    view.draw();
  }
  playgroundPde.updateUsageBadges();
}

function getQueryViewsDropItems(pName) {
  let result = "";
  let views = AView.registeredViewsForPlayground;
  for (let i = 0; i < views.length; i++)
    result += `<div class="newviewitem" onclick="addNewPlaygroundView('${views[i]}');">${views[i]}</div>`;
  return result;
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
  playgroundPde.updateUsageBadges();
}


function scrollToQueryView(tag) {
  $('.qeELt').each(function(i, qeElt) {
    qeElt.style.color = '#333';
  });
  document.getElementById("qeElt_"+tag).style.color = "var(--submenu_color)";

  var myElement = document.getElementById(tag);
  var topPos = myElement.offsetTop;
  document.getElementById('playgroundInnerContent').scrollTop = topPos - 105;
}

