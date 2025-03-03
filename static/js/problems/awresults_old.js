// returns an array of strings of elements selected in multiselect with id=selectID
function getArrayOfSelectedElements(selectID) {
  return Array.from(document.getElementById(selectID).options).filter(option => option.selected).map(option => option.text);
}

let activeAnswerID = new Map();
function startLoopingResultRefresh(pageID) {
  const interval = setInterval(() => {
    if ($(`#${pageID}`).is(':visible')) {
      let answerID = activeAnswerID(pageID);
      getAndShowAWResults(1, answerID);
    } 
  }, 1000); 
}




// Inserts results (answer of GETAWRESULTS) into already prepared html containers.
// For each result {alg_tst: result} function shows "aw result card" in "alg_tst_carddiv" div 
function insertAWResults(results) {
  Object.keys(results.Results).forEach(k => {
    var cDiv = document.getElementById(k+"_carddiv");
    cDiv.innerHTML = results.Results[k];
  });
}

function refreshResultsLoop(answerID) {
  const interval = setInterval(() => {
    if ($(`#resulttable_${answerID}`).is(':visible')) {
      getAndShowAWResults(1, answerID);
    } else clearInterval(interval); 
  }, 1000); 
}

// html code with divs for each alg_tst pair; results for these pairs will be inserted by insertAWResults() in a loop
function getCardHolders(results) {
  // header line (testsets)
  var cells = '<tr><td></td>';
    results.Testsets.forEach(t =>{cells += `<td class="tsttd">${t}</td>`});
  cells += "</tr>\n";

  results.Algorithms.forEach(a => {
    cells += `<tr><td class=algtd>${a}</td>`;
    results.Testsets.forEach(t =>{cells += `<td><div id="${a}_${t}_carddiv"></div></td>`});
    cells += "</tr>\n";
  });
  return `<table id="resulttable_${results.AnswerID}">${cells}</table>`;
}

// 
// how=0 ... show both, card holders and content (show action), 
// how=1 ... show only content (refresh action)
function getAndShowAWResults(how=0, answerID=0) {
  let algs  = getArrayOfSelectedElements("awr_algorithms"); 
  let tsts  = getArrayOfSelectedElements("awr_testsets");   
  var query = `GETAWRESULTS {'Project':'${projectName}', 'Algorithms':[${algs.join(', ')}], 'Testsets':[${tsts.join(', ')}], 'AnswerID': '${answerID}'}`;

  askServer((projectName, key, response) => {
    if (response.Status == 0) {      
      if (how==0) {
        var awrDiv = document.getElementById("awShowResults_panel");
        awrDiv.innerHTML = getCardHolders(response.Answer);
      }      
      insertAWResults(response.Answer);

      answerID = response.Answer.AnswerID;
      if (how==0)
        refreshResultsLoop(answerID);
    }
  }, projectName, "awresults", query);         
}


async function showAWResults() {
  // to potrebujem za algorithms in testsets
  await pageProject.waitForDataToLoad(["get_project_properties"], false, {'ProjectName':projectName});
  $("#awWaiting_panel").css("display", "none");$("#awResults_panel").css("display", "");


  fillSelector(pageProject.algorithms, ["*"], "awr_algorithms", "Select algorithms ...");
  $('#awr_algorithms').on("change", getAndShowAWResults);

  fillSelector(pageProject.testsets, ["*"], "awr_testsets", "Select testsets ...");
  $('#awr_testsets').on("change", getAndShowAWResults);

  getAndShowAWResults();
}