let yesnoaction = null;


// user can define up to three parameters that will be passed to the "action" function
function showYesNoDialog(question, action, param1, param2, param3) {
  let dialogHTML =`
    <div id="yesnodialog" class="yesnodialog">
      <div class="yesnodialog-content">
        <p id="dialogQuestion" style="width:200px;"></p>
        <button onclick="buttonClicked(0, '${param1}','${param2}', '${param3}')">Yes</button>
        <button onclick="buttonClicked(1, '${param1}','${param2}', '${param3}')">No</button>
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

function buttonClicked(answer, param1, param2, param3) {
  document.getElementById("dialogQuestion").style.display = "none";
  $("#yesnodialog").remove();
  if (yesnoaction != null)
    yesnoaction(answer, param1, param2, param3);
}