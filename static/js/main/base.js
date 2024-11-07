var debugPrint = false;

document.addEventListener("DOMContentLoaded", function() {
  showOptionalUsermenuButtons();
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
      editButtonPanel.style.display = await can(projectEID, "can_write") ? "" : "none";
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
}


flexEditButtons = new Set();
flexEditButtons.add("navBarElNewPresenter");
flexEditButtons.add("editProjectButtons");

function enableEditMode(isEditMode){
    var slimElements = document.querySelectorAll('.editMode');

    slimElements.forEach(function(element) {
        if (isEditMode) {
            if (flexEditButtons.has(element.id))
              element.style.display = 'flex'; 
            else
              element.style.display = 'inline'; 
        } else {
            element.style.display = 'none'; 
        }
    });

    // height depends on mode
    try {setEditPageHeight();} catch {}
}


// unhides div for 3 sec and shows message in it
function showPopup(text) {
    var messageDiv = document.getElementById("popupDiv");
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    setTimeout(function() {messageDiv.style.display = 'none';}, 3000);
}

// ALGator server communication
function askServer(callback, projectName, key, request='', callbackError=null) {  
  var data = {
      csrfmiddlewaretoken : getCookie('csrftoken'),
      q : request,
  };
  $.ajax({
      url: askServerURL,
      type: "POST",
      data: data,          
      success: function (response) {  
        serverAnswerPhase2(callback, projectName, key, response.answer, callbackError);
      },
      error: function(response) {
        if (callbackError)
          callbackError(response);
      } 
    }
  );
}
function serverAnswerPhase2(callback, projectName, key, response, callbackError) {
  try {
    var jResp = JSON.parse(response);
    if (jResp.Status == 0) {
      if (callback != null) callback(projectName, key, jResp);
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
