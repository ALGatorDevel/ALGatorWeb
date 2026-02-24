// map with key = pageID, value = [answerID, getQuery(), interval, resultsDiv, getCardHolder]
var activeAWRs      = new Map();

// only one call to this function can be performed at a time
var inShowAWResults = false;

// during askServer call for "GETAWRESULTS" this get value "true" to prevent duplicated calls; next
// call can be performed only after previous is done
var waitingForAWRResponse = false;

// This function is called to establish html environment to show results and to call getAWResults service for
// the first time; all subsequent calls to getAWResults (with the same answerID) will be performed in timer 
// (created with establishRefreshOnTimer).
// This function is called everytime query parameters (requested algorithms or testsets) change.
function showAWResults(pageID, resultsDiv='', getQuery=null,  getCardHolders=null) {
  if (inShowAWResults) return;

  inShowAWResults = true;

  try {
    var currentAWR = activeAWRs.has(pageID) ? activeAWRs.get(pageID) : [0, getQuery, 0, resultsDiv, getCardHolders];
    var query      = currentAWR[1]();
    askServer((projectName, key, response) => {
      if (response.Status == 0) {   
        var answerID = response.Answer.AnswerID;
        activeAWRs.set(pageID, [answerID, currentAWR[1], currentAWR[2], currentAWR[3], currentAWR[4]]);

        var awrDiv = document.getElementById(currentAWR[3]);
        if (awrDiv && currentAWR[4]) 
          awrDiv.innerHTML = currentAWR[4](response.Answer);

        // show content of response
        refreshAWResults(response.Answer);

        // is showAWResults called for the first time?
        if (currentAWR[0] == 0) {
        	establishRefreshOnTimer(pageID);
        }

        inShowAWResults = false;
      }
    }, projectName, "awresults", query, () => inShowAWResults = false);            
  } catch (e) {
    inShowAWResults = false;
  }
}

function establishRefreshOnTimer(pageID) {
  if (!activeAWRs.has(pageID)) return; 

  var cAWR = activeAWRs.get(pageID);

  // clear previous interval ...
  clearInterval(cAWR[2]);

  // ... and set a new one
  cAWR[2] = setInterval(() => {
    if (waitingForAWRResponse) return;
    
    if (!document.hidden && $(`#${pageID}`).is(':visible')) {
   	  var lAWR = activeAWRs.has(pageID) ? activeAWRs.get(pageID) : [0, null, null,'', null];
      if (lAWR[0]) {
        let lQuery = `GETAWRESULTS {'Project':'${projectName}', 'AnswerID': '${lAWR[0]}'}`;
        waitingForAWRResponse = true;
        askServer((projectName, key, response) => {
          waitingForAWRResponse = false;
          if (response.Status == 0)    
            refreshAWResults(response.Answer);
        }, projectName, "awresults", lQuery, (result)=>{                      	 
          waitingForAWRResponse = false;
          // on error with refreshing, start a new 
        	showAWResults(pageID, cAWR[3], cAWR[1],  cAWR[4]);
        });
      }            
    } 
  }, 1000); // refresh AWResults every second 
}

// Inserts results (answer of GETAWRESULTS) into already prepared html containers.
// For each result {alg_#_tst: result} function shows "aw result card" in "alg_#_tst_carddiv" div 
function refreshAWResults(results) {
  Object.keys(results.Results).forEach(k => {
    var cDiv = document.getElementById(k+"_carddiv");
    if (cDiv) cDiv.innerHTML = getAWCard(k, results.Results[k]);
    if (!results.Results[k].ce) document.getElementById(k+"_#_chkbx").remove();
  });
  enableDisableActions();
}


//              not used     not complete     missing or outdated       complete and uptodate
var stsIcon = [ "empty",     "redgreen",      "red",                    "green"];
function getAWCard(alg_tst_key, result) {
    let iIdx      = result.e ? (result.upd ? (result.noi==result.nor ? 3 : 1) : 2) : 2;
    let resIcon   = `<img src="/static/images/${stsIcon[iIdx]}24.png" width=12/>`;

    let runButtno = result.ce ? getDoubleButtonWithMenu(`task_${alg_tst_key}`, '▶', [['Run', 'runTask', alg_tst_key], ['Run with computer ...', 'readFamilyAndRunTask', alg_tst_key]], false, true) : "";      

    let tasks = "";
    for (const key in result.tasks) {
      let task = result.tasks[key];
      let tBut = "";
      if (task.cca) { // obstoječe taske lahko "nadzira" le owner taska in superuser
        let priorityBut = current_user_is_superuser ? ['Set priority', 'setTaskPriority', key, ""] : [];
        if (task.s=='PENDING' || task.s=='INPROGRESS' || task.s=='QUEUED') 
          tBut = getDoubleButtonWithMenu(`task_${key}`, '||', [['Pause', 'changeTaskStatus', key, "pause"],  ['Cancel', 'changeTaskStatus', key, "cancel"], priorityBut]);      
        else if (task.s=='PAUSED')
          tBut = getDoubleButtonWithMenu(`task_${key}`, '▷', [['Resume', 'changeTaskStatus', key, "resume"], ['Cancel', 'changeTaskStatus', key, "cancel"], priorityBut]);            
      }

      let taskStr = `<div style="white-space: nowrap; height:26px" taskID="${key}"><span style="padding-left:23px">${key}@${task.f}(${task.y}): <span id="${key}_status">${task.s}</span></span><span style="float:right; padding-right:3px">${tBut}</span></div> `;
      
      tasks += taskStr;
    }
    if (tasks) 
    	tasks = `<span style="padding-left:15px;">Tasks</span><hr style="margin:0px 55px 0px 15px;">${tasks}`;

    
    let otherResults = "";
    if (result.ar.length > 0) {
        otherResults += `<label class="custom-select"><select class="myselect" onchange="showResultsFile('${alg_tst_key}', this.value); this.value='';">`;
          result.ar.forEach(r => {otherResults += `<option value="${r}">${r}</option>`});
        otherResults += `</select></label>`;
    }

    let resMsg = result.e ? 	
      `Results: <span class="resf" onclick="showResultsFile('${alg_tst_key}')"> ${result.f} (${result.nor}/${result.noi})</span> ${otherResults}` : 
      '<i><span style="white-space:nowrap">(no results available)</span></i>';

	return `
	  <div style="width:300px; display:grid">
	    <div>
	      <span>${resIcon} ${resMsg}</span>
	      <span style="float:right">${runButtno}</span> 
	    </div> 
	    <div style="background-color:beige; margin:5px"> 
	      ${tasks}
	    </div>
	  </div>
	`;
}

function getAllSelectedCBIds(filterOutdeted=false) {
  let checkboxes = Array.from(document.querySelectorAll('.algtstcb input[type="checkbox"]:checked'));
  if (filterOutdeted) checkboxes = checkboxes.filter(checkbox => checkbox.getAttribute('upd')!="3");
  return checkboxes.map(checkbox => checkbox.id);
}

function changeTaskStatus(taskKey, action) {	
	let statusElt = document.getElementById(taskKey + "_status");
	let newStatus = (action=="cancel" ? "cancelling ..." : (action=="pause" ? "pausing ..." : (action == "resume" ? "resuming ..." : action + " ...")));
	statusElt.innerHTML = newStatus;

	let btnElt = document.getElementById("task_" + taskKey + "_stsBtn");
    if (btnElt) btnElt.querySelectorAll('button').forEach(button => {button.setAttribute('disabled', '');});	
	askServer(null, projectName, taskKey, `${action}Task {'eid':${taskKey}}`);
}
function setTaskPriority(taskKey) {
  openDialog('Task priority', preventNonNumKeys).then((priority) => {
    if (priority != null) {
        askServer(null, projectName, taskKey, `setTaskPriority {'eid':${taskKey}, 'Priority':${priority}}`);
    } 
  });
}


function readFamilyAndRunTask(taskKey) {
  openDialog('Enter computer family to be used', preventNonAlphaNumKeys, getFamilySelectElement()).then((result) => {
    if (result != null) {
      runTask(taskKey, result);
    } 
  });
}
function runTask(taskKey, familyID, errorHandling) {
    let family = ""; if (familyID && familyID!='undefined') family = `"Family":"${familyID}",`;	
	
	let algTst = taskKey.split("_#_");
	let query = `addTask {"Project":"${projectName}", "Algorithm":"${algTst[0]}", "Testset":"${algTst[1]}", ${family} "MType":"${algTst[2]}", "Priority":5}`;
	askServer(null, projectName, taskKey, query, errorHandling);
}


function readFamilyAndRunSelectedTasks() {
  openDialog('Enter computer family to be used', preventNonAlphaNumKeys, getFamilySelectElement()).then((result) => {
    if (result != null) {
      runSelectedTasks(result);
    } 
  });
}
function runSelectedTasks(familyID) {
  let selectedCBIds = getAllSelectedCBIds();
  selectedCBIds.forEach(taskKey => runTask(taskKey, familyID));
  showPopup(`Number of queued tasks: ${selectedCBIds.length}`)
}
function runSelectedOutdatedTasks() {
  let selectedOutdatedCBIds = getAllSelectedCBIds(true);
  selectedOutdatedCBIds.forEach(taskKey => runTask(taskKey, undefined, ()=>{})); // third parameter: ignore errors (such as "duplicated task"), don't popup
  showPopup(`Number of outdated tasks: ${selectedOutdatedCBIds.length}.`)
}


function changeSelectedTasksStatus(action) {
  let selectedCBIds = getAllSelectedCBIds();

  let taskIDS = [];
  selectedCBIds.forEach(cbid => {
    let cb = document.getElementById(cbid);
    let algTstTD = cb.parentElement.parentElement;
    let taskDivs = algTstTD.querySelectorAll('div[taskID]');
    let ctid =  Array.from(taskDivs).map(div => div.getAttribute('taskID')); 
    taskIDS = [...taskIDS, ...ctid];
  });
  
  taskIDS.forEach(task => {changeTaskStatus(task, action)});

  action += (action.endsWith('e') ? 'd' : 'ed');
  showPopup(`Number of ${action} tasks: ${taskIDS.length}`);
}

function showResultsFile(alg_tst_key, compID="") {
  let params = alg_tst_key.split("_#_");
  if (params.length < 3) return;

  let compIDS = compID ? `, "compID":"${compID}"` : "";

  let query = `getResultFile {"Project":"${projectName}", "Algorithm":"${params[0]}", "Testset":"${params[1]}", "MType":"${params[2]}"${compIDS}}`;
  askServer((pName, tsName, response)  => {
    if (response.Status == 0) {
      let content = atob(response.Answer.Content);
      let fileName = response.Answer.Filename;
      showModalDisplay(fileName, content);
    }
  }, projectName, alg_tst_key, query); 
}



/////////////  Main page / Testing    ////////////////////////////
async function showTestingResults() {
  // to get algorithms and testsets
  await pageProject.waitForDataToLoad(["get_project_properties"], false, {'ProjectName':projectName});
  $("#awWaiting_panel").css("display", "none");$("#awResults_panel").css("display", "");

  fillSelector(pageProject.algorithms, ["*"], "awr_algorithms", "Select algorithms ...");
  $('#awr_algorithms').on("change", ()=>showAWResults("awr_testing"));

  fillSelector(pageProject.testsets, ["*"], "awr_testsets", "Select testsets ...");
  $('#awr_testsets').on("change", ()=>showAWResults("awr_testing"));

  $('#awr_mtype_em') .on("change", ()=>showAWResults("awr_testing"));
  $('#awr_mtype_cnt').on("change", ()=>showAWResults("awr_testing"));
  
  showAWResults("awr_testing", "awShowResults_panel", getTestingResultsQuery, awrTestingCardHolders);
}

function getTestingResultsQuery() {
  let algs  = getArrayOfSelectedElements("awr_algorithms"); 
  let tsts  = getArrayOfSelectedElements("awr_testsets");   
  let mtype = document.querySelector('input[name="awr_mtype_radio"]:checked')?.value;

  return `GETAWRESULTS {'Project':'${projectName}', 'Algorithms':[${algs.join(', ')}], 'Testsets':[${tsts.join(', ')}], 'MType':'${mtype}'}`;
}

const isChecked = document.querySelector('.rcbc input[type="checkbox"]:checked') !== null;


function awrTestingCardHolders(results) {
  // header line (testsets)
  var cells = `<tr><td style="background-color:white; vertical-align:baseline; border:none;z-index:2; width:150px; height:70px">
                     <div class="rcbc" style="text-align:center;"><input id="allall_chkbx" type="checkbox" onchange="toggleCB('mcb', this.checked)"></div>
                   </td>`;

  //for(let xx=0; xx<3; xx++)               
  results.Testsets.forEach(t =>{cells += `<th class="tsttd" style="border:1px solid white">
    	                                    <div class="rcbc"><input id="${t}_chkbx" type="checkbox" mcb onchange="toggleCB('tstName', this.checked, '${t}')"></div>
    	                                    ${t}
    	                                  </th>`});
  cells += "</tr>\n";

  //for(let xx=0; xx<5; xx++)               
  results.Algorithms.forEach(a => {
    cells += `<tr><td class="algtd" style="background-color: #404040;border:1px solid white"><div class="rcbc"><input id="${a}_chkbx" type="checkbox" mcb onchange="toggleCB('algName', this.checked, '${a}')"></div>
                                                                     <div>${a}</div></td>`;
    
    results.Testsets.forEach(t =>{let ttid   = `${a}_#_${t}_#_${results.MType}`;
                                  let result = results.Results[ttid]; 
                                  let iIdx   = result.e ? (result.upd ? (result.noi==result.nor ? 3 : 1) : 2) : 2;
                                  cells += `<td class="algtsttd">
    	                                      <div class="rcbc algtstcb" style="text-align:center">&nbsp;<input id="${a}_#_${t}_#_${results.MType}_#_chkbx" type="checkbox" mcb algName="${a}" tstName="${t}" upd="${iIdx}" onchange="enableDisableActions('${a}','${t}')">&nbsp;</div>
    	                                      <div style="padding:5px;margin-top:7px;" id="${ttid}_carddiv"></div>
    	                                    </td>`});
    cells += "</tr>\n";
  });
  return `<div class="scr_tab_cont"><table class="alt_color" id="resulttable_${results.AnswerID}">${cells}</table></div>`;
}

function toggleCB(attribute, check, value=undefined) {
  const checkboxes = document.querySelectorAll(`input[type="checkbox"][${attribute}${value?'="'+value+'"':''}]`);
  checkboxes.forEach((checkbox) => {
      checkbox.checked = check;
      checkbox.dispatchEvent(new Event('change')); 

  });
}

function enableDisableActions(a, t) {
  const isChecked = document.querySelector('.rcbc input[type="checkbox"]:checked') !== null;

  document.querySelectorAll('.button-lr-dis').forEach(element => element.disabled = !isChecked);

  let allAlgs=false, allTsts=false;
  if (a) {
    // select/deselect checkbox in first column (at algorithm)
    let selectedAlgs  = document.querySelectorAll(`.rcbc input[type="checkbox"][algName="${a}"]:checked`);
    let allAlgsOnPage = document.querySelectorAll(`.rcbc input[type="checkbox"][algName="${a}"]`);
    allTsts = (selectedAlgs.length == allAlgsOnPage.length);
    document.getElementById(`${a}_chkbx`).checked = allTsts;
  }

  if (t) {
    // select/deselect checkbox in first row (at testset)
    let selectedTsts  = document.querySelectorAll(`.rcbc input[type="checkbox"][tstName="${t}"]:checked`);
    let allTstsOnPage = document.querySelectorAll(`.rcbc input[type="checkbox"][tstName="${t}"]`);
    allAlgs = (selectedTsts.length == allTstsOnPage.length);
    document.getElementById(`${t}_chkbx`).checked = allAlgs;
  }

  if (a && t)
    document.getElementById(`allall_chkbx`).checked = allAlgs && allTsts;
}
