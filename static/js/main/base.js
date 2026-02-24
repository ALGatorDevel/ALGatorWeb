var printEID = false;

document.addEventListener("DOMContentLoaded", function() {
  showOptionalUsermenuButtons();
}); 

const unloadActions = [];
function addUnloadAction(func) {
  if (typeof func === 'function') unloadActions.push(func);
}
window.addEventListener('beforeunload', () => {
  unloadActions.forEach((func, index) => {
    try {func(); } catch (error) {}
  });
});


// autocomplete shortcut for codemirror
var mac = CodeMirror.keyMap.default == CodeMirror.keyMap.macDefault;
CodeMirror.keyMap.default[(mac ? "Cmd" : "Ctrl") + "-Space"] = "autocomplete";


// show Edit button and User menu, depending on user rights:
//   - Edit button is shown if user can_write Projects, 
//   - User menu is shown if system is not running in anonymous mode
async function showOptionalUsermenuButtons() {
    // Edit button
    var editButtonPanel = document.getElementById('edit_button_panel');
    if (editButtonPanel) {
      editButtonPanel.style.display = /*await can(projectEID, "can_write")*/ true ? "" : "none";
      var editCB = document.getElementById('isEditCheckbox');
      if( editCB != null) editCB.checked = isEditMode;
      enableEditMode(isEditMode);
    }

    // User menu
    var userMenuPanel = document.getElementById('user_menu_panel');
    if (userMenuPanel)
      userMenuPanel.style.display = isDBMode ? "block" : "none";
} 

function toggleEditModeBoolean(){
    isEditMode = !isEditMode;
    enableEditMode(isEditMode);
    makeDraggable();

    showHidePrivatenessIcons();
}


flexEditButtons = new Map();
flexEditButtons.set("editProjectButtons", "flex");
flexEditButtons.set("editButtons_testsets_common", "flex");
flexEditButtons.set("testsetEditButtons", "flex");
flexEditButtons.set("algorithmEditButtons", "flex");
flexEditButtons.set("tab-presenters_newpresenter", "flex");
flexEditButtons.set("tab-algorithms_newalgorithm", "flex");
flexEditButtons.set("tab-testsets_newtestset", "flex");
flexEditButtons.set("compile_project_tr", "");
flexEditButtons.set("run_algts_tr", "");
flexEditButtons.set("compile_alg_tr", "");
flexEditButtons.set("run_generator_tr", "");


function enableEditMode(isEditMode, context=document){
    var editElements = context.querySelectorAll('.editMode');

    editElements.forEach(async function(element) {
      let canEdit = false;
      try {
        let w = element.getAttribute("w").split(" ");
        canEdit = await can(w[0], pShorts.get(w[1]));
        // console.log(w[0] + "," + w[1] + ": " + pShorts.get(w[1]) + "=" + canEdit);
      } catch (e) {}
      if (isEditMode && canEdit) {
        if (flexEditButtons.has(element.id))
          element.style.display = flexEditButtons.get(element.id); 
        else
          element.style.display = 'inline'; 
      } else {
          element.style.display = 'none'; 
      }
    });

    // height depends on mode
    try {setTimeout(() => {
      setEditPageHeight(); }, 100);
    } catch {}
}


// unhides div for 3 sec and shows message in it
function showPopup(text) {
    var messageDiv = document.getElementById("popupDiv");
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    setTimeout(function() {messageDiv.style.display = 'none';}, 3000);
}

// ALGator server communication
function askServer(callback, projectName, key, request='', callbackError=null, param1=null, param2=null) {  
  var data = {
      csrfmiddlewaretoken : getCookie('csrftoken'),
      q : request,
  };
  $.ajax({
      url: askServerURL,
      type: "POST",
      data: data,          
      success: function (response) {  
        serverAnswerPhase2(callback, projectName, key, response.answer, callbackError, param1, param2);
      },
      error: function(response) {
        if (callbackError)
          callbackError(response);
      },     
      complete: function(response, status) {
        if (status !== "success" && callbackError)
            callbackError(response);
      }
    }
  );
}
function serverAnswerPhase2(callback, projectName, key, response, callbackError, param1, param2) {
  try {
    var jResp = JSON.parse(response);
    if (jResp.Status == 0) {
      if (callback != null) callback(projectName, key, jResp, param1, param2);
    } else {
      if (callbackError)
        callbackError(response);
      else
        showPopup(response);
    }
  } catch (error) {
    if (callbackError)
      callbackError(response);
    else
      showPopup(error);
  }
}


function getCurrentFormattedDate() {
  const now = new Date();
  // Extract date components
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()); 
  // Extract time components
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  // Format as MM/DD/YYYY, HH:mm
  return `${month}/${day}/${year}, ${hours}:${minutes}`;
}



// The function waits for an observed variable to become 0. The parameter i is a 
// function that returns the current value of the variable being observed.
// Usage example: const result = await waitForZero(() => cnt, 2000); 
async function waitForZero(i, maxWaitTime) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (i() === 0) {
          clearInterval(interval);
          resolve("ZERO");
      } else if (Date.now() - startTime >= maxWaitTime) {
          clearInterval(interval);
          resolve("TIMEOUT");
      }
    }, 50); // Check every 50ms
  });
}



function registerClickOnEnter(textfieldID, buttonID) {
  var textfield = document.getElementById(textfieldID);
  var button    = document.getElementById(buttonID);
  if (textfield==null || button==null) return;

  textfield.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();  
      button.click();         
    }
  });
}


function formatFileSize(size) {
    if (size < 1024) {
        return `${size} bytes`;
    } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    } else if (size < 1024 * 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    } else {
        return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
}


/********  TASKS ..... runing tasks and showing results in modal window ********/
/*******************************************************************************/
var taskErrorCodes = {'Error code: 2':"Error compiling project."};

function runTaskAndShowResults(taskRequest, taskType) {
  askServer((projectName, taskType, response)=>{
    if (response.Status == 0) {
      let eid = response.Answer.eid;
      if (eid > 0) // v nekih cudnih primerih dobim eid=0; takrat vse skupaj prekinem!
        showTaskResults(projectName, taskType, eid);
      else {
        showPopup(`Can not execute this task (eid=${eid}).`);
        cancelShowTaskTask(eid);
      }
    }
  }, projectName, taskType, taskRequest);  
}
function getTaskResultHTML(eid) {
  let html = `
  <div style="display: flex;justify-content: space-between;align-items: center;"><span id="task_status_${eid}"></span> 
       <input id="cancel_buttton_${eid}" type=button value="Cancel task" onclick="cancelShowTaskTask(${eid})"> 
  </div>
  <hr style="margin:15px 0px 15px 0px;">
  <pre id="task_result_${eid}" style=""></pre>
  `;
  return html;
}
function cancelShowTaskTask(eid) {
  askServer(null, projectName, "Cancel", `cancelTask {"eid": ${eid}}`, ()=>{}); // last parameter: ignore error message (Task not found)
}
function showTaskResults(projectName, taskType, eid) {
  let modal = showModalDisplay(projectName + ": " + taskType, "... fetching task results", 0);
  modal.style.whiteSpace = "normal";
  modal.innerHTML = getTaskResultHTML(eid);
  let statusDiv = document.getElementById(`task_status_${eid}`);
  let resultDiv = document.getElementById(`task_result_${eid}`);
  let cancelBut = document.getElementById(`cancel_buttton_${eid}`);

  modal.parentElement.style.padding = "20px 20px 0px 20px";
  resultDiv.style.height   = "calc(100% - 154px)";  //  resultDiv.style.height   = (modal.parentElement.offsetHeight - 154) + "px";
  resultDiv.style.overflow = "auto";

  // stop executing task if page is unload
  addUnloadAction(()=>{cancelShowTaskTask(eid)});

  let statusQ  = `TASKSTATUS  {"eid":${eid}}`;  
  let resultsQ = `GETTASKRESULT {"eid":${eid}}`;  

  let lastStatus = "Pending";  
  statusDiv.innerHTML = `Task status: ?`
  resultDiv.innerHTML = "... waiting for content"

  const timer = setInterval(() => {
    console.log("... still looping " + (i++));
    // do  
    if (modal.offsetParent == null) {
      clearInterval(timer); // stop loop if modal window is not visible
      cancelShowTaskTask(eid);
    } else {
      if (lastStatus != "COMPLETED" && lastStatus != "CANCELED") {
        askServer((projectName, statusID, jResp)=>{
          if (jResp.Status==0) {
            let ans = jResp.Answer;
            statusDiv.innerHTML = `Task status: ` + ans.Status + `; eid: ${eid}`;   
            if (ans.Status == "INPROGRESS" && ans.Progress) statusDiv.innerHTML += " (" + ans.Progress + ")"  ;
            if (ans.Status == "CANCELED" && ans.Msg) {
              var msg = ans.Msg; if (taskErrorCodes.hasOwnProperty(msg)) msg = taskErrorCodes[msg];
              statusDiv.innerHTML += " (" + msg + ")"  ;
            }
            if (ans.Status=="COMPLETED" || ans.Status=="CANCELED") 
              cancelBut.remove(); // remove "Cancel task" button

            //if (ans.Status=="COMPLETED" || ans.Status=="INPROGRESS")
              askServer((pName, resID, jResp)=>{
                let ans = jResp.Answer;
                if (ans && ((typeof ans != "object") || ans.FileContent)) { // only print if content is not empty
                  resultDiv.innerHTML = (typeof ans === "object") ? tryJSONIFY(ans.FileContent) : ans;
                  resultDiv.scrollTop = resultDiv.scrollHeight; // scroll to end of printed text
                }
              }, projectName, "Results", resultsQ);
            lastStatus = ans.Status;
          }
        }, projectName,"Status", statusQ, (response)=>{clearInterval(timer); cancelBut.remove(); resultDiv.innerHTML=response});
      }
    };
  }, 1000);
}


// pogleda, če se niz začne z "{" -> v tem primeru gre ajbrž za JSNO object (v string obliki), zato poskusi
// ustvariti objekt in ga izpisati v string obliki (poravnano na dva presledka)
function tryJSONIFY(text) {
  if (text[0]="{") {
    try {
      const andO = JSON.parse(text);
      text = JSON.stringify(andO, null, 2);
    } catch (e) {}
  }
  return text;
}

// misc

function getArrayOfSelectedElements(selectID) {
  return Array.from(document.getElementById(selectID).options).filter(option => option.selected).map(option => option.text);
}
