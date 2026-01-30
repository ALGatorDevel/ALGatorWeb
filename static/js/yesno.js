var yesnoaction = null;


// user can define up to four parameters that will be passed to the "action" function; 
// first two parameters are of type String, and the last two of type Object
var yesnoO1 = null;
var yesnoO2 = null;
function showYesNoDialog(question, action, param1, param2, param3, param4, showCancel=false) {
  yesnoO1 = param3;
  yesnoO2 = param4;

  let cancelButton = showCancel ? `<button onclick="buttonClicked(2, '${param1}','${param2}')">Cancel</button>` : "";

  let dialogHTML =`
    <div id="yesnodialog" class="yesnodialog">
      <div class="yesnodialog-content">
        <p id="dialogQuestion" style="width:200px;"></p>
        <button onclick="buttonClicked(0, '${param1}','${param2}')">Yes</button>
        <button onclick="buttonClicked(1, '${param1}','${param2}')">No</button>
        ${cancelButton} 
      </div>
    </div>
  `;

  $("body").append(dialogHTML);

  yesnoaction = action;

  var dialogQuestionElement = document.getElementById("dialogQuestion");
  dialogQuestionElement.innerText = question;
  
  var dialog = document.getElementById("yesnodialog");
  dialog.style.display = "block";
}

function buttonClicked(answer, param1, param2) {
  document.getElementById("dialogQuestion").style.display = "none";
  $("#yesnodialog").remove();
  if (yesnoaction != null)
    yesnoaction(answer, param1, param2, yesnoO1, yesnoO2);
}