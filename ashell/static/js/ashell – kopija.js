///************
///************
///************
///************
///************  Definitons and constants  ************///
const helpMessage = `
ALGatorShell supports 4 types of questions:

  - shell internal commands 
      - help    ... print this help message
      - version ... display ALGator version
      - setproject ... set default project
      - file    ... open an editor
      - project ... edit files of a project
      - results ... show results for selected project

  - commands send to server (prefix: >)
      - >who, >list, >status, ... 
      - >command run, >command list, >command stop, >command output
      - ...

  - data manipulation (prefix %)
      - %1 table
      - %5 data odd table plot
      - %1 decode ... decodes base64 text in Answer property

  - $ commands
      - this is shortcut for ">command" + it displays output  
      - $Version = >command run Version + >command output 1
      - $Execute BasicSort -a QuickSort -t TestSet 1 -v 2 - e 
`


const onresize = (dom_elem, callback) => {
  const resizeObserver = new ResizeObserver(() => callback() );
  resizeObserver.observe(dom_elem);
};


///************
///************
///************
///************
///************         Tools         ************///

function askServer(question, blockID, callback) {  
  callDjango("/cpanel/askServer?q=" + question, blockID, callback, question);
}

function callDjango(url, blockID, callback, question='') {  
  var data = {
      csrfmiddlewaretoken : window.CSRF_TOKEN,
      q : question,
  };

  // vedno, ko vprašam server, prižgem rdečo luč; 
  $("#cmdStatusB-" + blockID).css("background","red");

  $.ajax({
    url: url,
    type: "POST",
    data: data,

    error: function(xhr, status, error) {
      try {
        var err = eval("(" + xhr.responseText + ")");
        alert("Ajax askServer error: " + err.Message); 
      } catch (error) {
        alert(xhr.responseText)
      }

      // rdečo luč ugasnem tudi ob napaki (komunikacije s strežnikom ni več)
      $("#cmdStatusB-" + blockID).css("background","green");
    }, 

     
    success: function(result) {
      // ... and answer
      $("#cmdStatusB-" + blockID).css("background","green");
      callback(blockID, result.answer)
    }        
  });  
}

function json2csv(json) {
  var i; // local loop variable 

  var vrstice = json.split("\n");

  // find the names of all columns
  var allKeys = [];
  for(i=0; i<vrstice.length;i++) {
    try {
      var vrstica = JSON.parse(vrstice[i]);
    } catch (e) {vrstica=null;}
    if (vrstica!=null)
      Object.keys(vrstica).forEach(k => 
        {if (!allKeys.includes(k)) allKeys.push(k); });
  }

  var result = "";
  // the header ...
  allKeys.forEach(k => {result += (result ? ";" : "") + k;})
  // ... and the content
  vrstice.forEach(vr => {
    try {
      vrstica = JSON.parse(vr);
    } catch (e) {vrstica=null;}
    if (vrstica != null) {
      var trRes="";
      allKeys.forEach(k => {
        trRes += (trRes ? ";" : "") + (vrstica[k] ? vrstica[k] : "?");
      });
      result += (result ? "\n" : "") + trRes;
    }
  });
  
  return result;
}

function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function toJSON(jsonText, changeQuotes, removeNL, removeBackslash) {
  if (!jsonText) return JSON.parse('{"Status":1,"Message":"Empty or invalid JSON string"}');

  if (changeQuotes) {
    jsonText = jsonText.replace(/"/g,    '_aa_');
    jsonText = jsonText.replace(/'/g,    '"');   
    jsonText = jsonText.replace(/_aa_/g, "'");
  }
  if (removeNL)
    jsonText = jsonText.replace(/\n/g, " ");
  if (removeBackslash)
    jsonText = jsonText.replace(/\\/g, "/");

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    return JSON.parse('{"Status":2, "Message":"' + error.toString().replace(/"/g,"") + '"}');
  }
}

// returns file type according to file extension
function getFileType(fileName) {
  var p = fileName.lastIndexOf('.');
  if (p == -1)
    return "text"; // no extension ... txt file

  var extension = fileName.substring(p+1);
  switch (extension) {
    case 'java':
    case 'html':
      return extension;
    case 'txt':
      return 'text';
  }
  if (extension.startsWith('at'))
    return 'json';

  return 'text';
}

const isElementXPercentInViewport = function(el, percentVisible) {
  let
    rect = el.getBoundingClientRect(),
    windowHeight = (window.innerHeight || document.documentElement.clientHeight);

  return !(
    Math.floor(100 - (((rect.top >= 0 ? 0 : rect.top) / +-rect.height) * 100)) < percentVisible ||
    Math.floor(100 - ((rect.bottom - windowHeight) / rect.height) * 100) < percentVisible
  )
};

// https://www.javascripttutorial.net/dom/css/check-if-an-element-is-visible-in-the-viewport/
function isInViewport(element) {
  if (element == null) return false;
  const rect = element.getBoundingClientRect();
  return (
        rect.top + rect.left + rect.bottom + rect.right != 0 &&
        (rect.top >= 0 && rect.left >= 0) ||
        ( (rect.bottom > 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)) &&
          (rect.right  > 0 && rect.right  <= (window.innerWidth  || document.documentElement.clientWidth))  )
  );
}

///************
///************
///************
///************
///************  Environment class  ************///
class Environment {
  constructor() {
    this.blockID          =0;    // teh number of next created block 
    this.commands    = new Map();   // mapping (blockID, commandID)
    this.data        = new Map();   // mapping (blockID, data)
    this.deps        = new Map();   // mapping (blockID, parent) ... blockID depends on parent (if parent changes, blockID must change too)
    this.clockTimer  = new Map();   // a timer for a block's clock - to refresh the content every minute
    this.timers      = new Map();   // s set of all other timers of a block (excluding clockTimer)

    this.lastSelectedBlock=0;    // block with focus

    this.history  = [""];        // history of user inputs
    this.currentH = 1;           // current history entry

    // !!! debug; default: ""
    this.currentProject = "BasicMatrixMul";
  }

  addTimer(blockID, timer) {
    var tTimers = this.timers.get(blockID);
    if (!tTimers) {
      tTimers = new Set();
      this.timers.set(blockID, tTimers);
    }
    tTimers.add(timer);
  }

  clearTimers(blockID) {
    var tTimers = this.timers.get(blockID);
    if (tTimers) {
      tTimers.forEach((timer)=>{clearInterval(timer); tTimers.delete(timer);});
    }
  }

}
env = new Environment();


///************
///************
///************
///************
///************  Data class and subclasses ************///
class Data {
  static get TEXT_DATA()    { return "TextData"; }          // tekstovni podatki
  static get ERROR_DATA()   { return "ErrorData"; }         // sporočilo o napaki
  static get TABLE_DATA()   { return "TableData"; }         // tabela podatkov
  static get PLOT_DATA()    { return "PlotData"; }          // tabela podatkov
  static get EDITOR_DATA()  { return "EditorData"; }        // urejevalnik podatkov
  static get FILES_DATA()   { return "FilesData"; }         // list of files
  static get PLIST_DATA()   { return "ProjectListData"; }   // list of projects
  static get RESULTS_DATA() { return "ResultsData"; }       // results (status, files, ...)

  constructor(type) {
    this.type    = type;    
  }

  toHtml() {
    return "Type: " + this.type;
  }

  // action that is executed after the data div is inserted into document
  // at the moment only the PlotData requires postProcessing; other classes
  // provide all the information in the toHtml() method
  postProcess() {}

  // if data-object shown on the page contains some unsaved data, this method
  // should return true to prevent leaving web-page
  hasChanges() {
    return false;
  }

  // to perform some cleaning (if required)
  destroy() {
    if (this.blockID) {
      env.clearTimers(this.blockID);
      clearInterval(env.clockTimer.get(this.blockID));
    }
  }


  show(blockID) {
    this.blockID = blockID;

    $("#cmdAnswer-" + blockID).html(this.toHtml());

    this.postProcess();
  }
}

// V objektih TextData hranim tekstovne podatke (besedilo v več vrsticah).
// Primer tekstovnih podatkov: odgovor serverja, vsebina datoteke, ...
// Tekstovmne podatke prikažem v <pre> odseku, pred tem pa označim (<b>) vse  
// vrstice, ki se začenjajo z dogovorjenim znakom '~'.
class TextData extends Data {
  constructor(textData, blockID) {
    super(Data.TEXT_DATA);
    this.textData = textData;
    this.blockID = blockID;
  }

  getTextData() {
    return this.textData;
  }

  toHtml() {
    var escaped = escapeHtml(this.textData)
    var preText = '<pre class="panel" style="padding-left: 0px;padding-top: 0px;">'  +
                      escaped.replace(/(~.*\n)/g, "<b>$1</b>")        +
                  '</pre>';
    return preText;
  }
  postProcess() {
    var divID = "cmdQuestion-" + this.blockID;
    //document.getElementById(divID).style.backgroundColor = "#00FF00";
  }  
}

class ErrorData extends TextData {
  constructor(errorMsg) {
    super("Error: " + errorMsg);
    this.type = Data.ERROR_DATA;
  }
}

class TableData extends Data {
  constructor(rawData) {
    super(Data.TABLE_DATA);
    this.rawData = rawData;
    this.data = this.parseRawData(rawData);
  }

  parseRawData(rawData) {
    var data = [], i, j;
    var vrstice = this.rawData.split("\n");

    var header = ["ID"];
    for(i=0; i<vrstice[0].split(";").length;i++)
      header.push("H"+i);
    data.push(header);   

    for(i=0; i<vrstice.length; i++) {
      var vData  = [i+""];
      var vParts = vrstice[i].split(";");

      var allEmpty=1;
      for(j=0; j < vParts.length; j++) {
        if (vParts[j]) {
          vData.push(vParts[j]); allEmpty=0;
        } else
          vData.push("");
      }
      if (allEmpty != 1)
        data.push(vData);
    }
    return data;
  }

  // iz sebe naredi novo tabelo s stolpci, ki so nasteti v tabeli params
  cols(params) {
    var i, j, newRaw = "";
    var vrstice = this.rawData.split("\n");
    for(i=0; i<vrstice.length; i++) {
      var nVrstica  = "";
      var vParts = vrstice[i].split(";");
      for(j=0; j < vParts.length; j++) {
        if (params.includes(j+""))
          nVrstica += (nVrstica==="" ? "" : ";") + vParts[j];
      }    
      newRaw += (newRaw==="" ? "" : "\n") + nVrstica;
    }
    return new TableData(newRaw);
  }

  toHtml() {
    var i, j, tableContent = "";
    for(i=0; i<this.data.length; i++) {
      tableContent += "<tr>\n";
      for(j=0; j<this.data[i].length; j++) {
        tableContent += "  <td align='center' style='border-right: solid 1px #CCC; border-left: solid 1px #CCC;'>" 
                              + this.data[i][j] 
                        + "</td>\n"
      }
      tableContent+="</tr>\n";
    }
    var preText = '<table class="table table-hover table-condensed">'  +
                      tableContent           + 
                  '</table>';
    return preText;
  }
}

class PlotData extends Data {
  constructor(data, params, blockID) {
    super(Data.PLOT_DATA);
    this.data   = data;
    this.params = params;
    this.blockID = blockID;
  }
  toHtml() {
    var divID = "graph-" + this.blockID;
    var graphDiv = '<div id="'+divID+'" class="chart c3" style="height: 320px; position: relative;"></div>';
    return graphDiv;
  }

  postProcess() {
    var divID = "graph-" + this.blockID;
    
    var prms = Array.from(this.params);
    if (!prms.length != 0) prms = Array.from(this.data[0]);

    var settings = chartEditor.getDefaultSettings();
    settings.xAxis = settings.xAxisTitle = prms[0];
    prms.shift();
    settings.yAxes = prms;


    chartEditor.drawChart(this.data, "#"+divID, settings);
  }  
}

class ProjectListData extends Data {

  constructor(blockID) {
    super(Data.PLIST_DATA);
    this.blockID = blockID;
  }
  
  toHtml() {
    var div = '<div style="width: 100%; height:100%;"  id="projectListDiv-'+this.blockID+'"></div>';
    return div; 
  }

  postProcess() {
    var vrsTR = document.getElementById("projectListDiv-" + this.blockID);
    askServer("getProjectList", this.blockID, (blockID, answer)=>{
      var resp = toJSON(answer, true, true, true)
      if (resp.Status==0) {
        var prjs = toJSON(atob(resp.Answer));
        var prjHtml = "<b>Select project:</b> ";
        for(var i=0; i<prjs.Projects.length; i++)
          prjHtml += "<span class='projectname' onclick='selectProject("+blockID+", \""+prjs.Projects[i]+"\")'>" + prjs.Projects[i]+"</span> | ";  
        vrsTR.innerHTML = prjHtml;
      } else
        alert(resp.Message)
    });  
  }  
}

class EditorData extends Data {

  constructor(data, blockID) {
    super(Data.EDITOR_DATA);
    this.blockID = blockID;
    this.data    = data;
  }
  
  toHtml() {
    var div = '<div style="width: 100%; height:100%;"  id="editor-'+this.blockID+'"></div>';
    return div; 
  }

  postProcess() {
    var bb = document.getElementById("cmdAnswer-"+this.blockID);
    bb.style.height="300px";

    var editor = ace.edit("editor-" + this.blockID);
    this.editor = editor;
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/json");
    editor.setValue(this.data);
    editor.setOptions({fontSize: "2rem"}); 

    onresize(bb, function() {editor.resize()})    
  }  
}


// information about one file that is opened in editor of a FilesData object
class FileData {
  constructor(fileName, editor, lihElement, licElement, closeX) {
    this.fileName    = fileName;
    this.hasChanges  = false;
    this.editor      = editor;
    this.lihElement  = lihElement;
    this.licElement  = licElement;
    this.closeX      = closeX;
  }
}
class FilesData extends Data {

  constructor(projectName, blockID) {
    super(Data.FILES_DATA);
    this.projectName   = projectName;
    this.blockID       = blockID;
    this.openedFiles   = [];
  }

  hasChanges() {
    for(let i=0; i < this.openedFiles.length; i++) {
      if (this.openedFiles[i].hasChanges) return true;
    }
    return false;
  }

  findFile(fileName) {
    for (let i = 0; i < this.openedFiles.length; i++) {
      if (this.openedFiles[i].fileName == fileName) return i;
    }
    return -1;
  }

  toHtml() {
    var div = 
      '<table style="width:100%; height:inherit; table-layout: fixed; background:#272822;">\
      <!--tr><td style="height:30px;border-bottom:1px solid #777;" colspan="2">test</td></tr-->\
         <tr><td id="explorer-'+this.blockID+'" style="width:250px; overflow:auto; margin:5px; vertical-align:top;"></td>\
             <td style="vertical-align:top;">\
                 <ul id="tabsh-'+this.blockID+'" class="tabs" style="height: 24px;"></ul>\
                 <ul id="tabsc-'+this.blockID+'" class="tabs-content" style="height: calc(100% - 32px);"></ul>\
             </td>\
       </table>';
    return div;   
  }

  removeTabElement(fileName) {
    var pos = this.findFile(fileName);
    if (pos != -1) {
      alert("Removing tab " + pos);
    }
  }

  saveThisFile(fileName, afterSave) {
    var pos = this.findFile(fileName);
    if (pos != -1) {
      var content = btoa(this.openedFiles[pos].editor.getValue());
      var msg = 'saveFile {"Project":"'+this.projectName+'","File":"'+this.openedFiles[pos].fileName+'","Length":'+content.length+',"Content":"'+content+'"}';  
      askServer(msg, this.blockID, (blockID, response) => {
        var resp = toJSON(response, true, true, true);
        if (resp.Status != 0) alert(resp.Message);        
        afterSave(resp);
      });
    }
  }

  setHasChanges(fileName, hasChanges) {
    var pos  = this.findFile(fileName);
    if (pos != -1) {
      this.openedFiles[pos].hasChanges = hasChanges;    
      this.openedFiles[pos].closeX.innerHTML = hasChanges ? "<span>&#9679;</span>" : "<span>x</span>";
      if (hasChanges) 
        this.openedFiles[pos].closeX.classList.add("closeTabO"); 
      else 
        this.openedFiles[pos].closeX.classList.remove("closeTabO"); 
    }
  }

  addTabElement(blockID, fileName, content) {
    // add TabTitle
    var ulh = document.getElementById("tabsh-"+blockID);
    var lih = document.createElement("li");
    // '<div class="tooltip">'+fileName.split("/").pop()+'<span class="tooltiptext">'+fileName+'</span></div>'
    var tabTitle = fileName.split("/").pop();
    lih.appendChild(document.createTextNode(tabTitle));

    var closeX = document.createElement("span");
    closeX.classList.add("closeTab");
    closeX.id = "x-" + fileName;
    closeX.innerHTML = "<span>x</span>";
    lih.appendChild(closeX); 

    ulh.appendChild(lih);

    let self = this;

    // add TabContent div ...
    var ulc = document.getElementById("tabsc-"+blockID);
    var lic = document.createElement("li");
    lic.classList.add("tabli-cont");
    lic.innerHTML = '<div style="width: 100%; height:100%;"  id="editor-' + blockID + "-" + fileName +'"></div>';
    ulc.appendChild(lic);
    // ... and editor in div
    var editor = ace.edit("editor-" + blockID + "-" + fileName);
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/" + getFileType(fileName));
    editor.setOptions({fontSize: "2rem"});
    editor.setValue(content);
    editor.clearSelection();
    editor.getSession().on('change', function() {
      self.setHasChanges(fileName, true);
    });

    // Ctrl-S ... save file
    editor.commands.addCommand({
      name: 'Save', readOnly: true, bindKey: {
        win: 'Ctrl-S',
        mac: 'Command-S'
      }, exec: function(editor) {
        self.saveThisFile(fileName, (jResponse)=>{
          if (jResponse.Status==0) 
            self.setHasChanges(fileName, false);
        });
      }
    });   

    var bb = document.getElementById("cmdAnswer-"+blockID);
    onresize(bb, function() {
      var tabsDiv = document.getElementById("tabsh-"+blockID),
          contDiv = document.getElementById("tabsc-"+blockID),
          newHeight = "calc(100% - 3px - " + tabsDiv.offsetHeight + "px)";

      contDiv.style.height = newHeight;
      editor.resize();      
    })    

    
    // register click-listener on tab title (action: make current tab active and other tabs non-active)
    lih.addEventListener("click", function(e) {
      var $tabslis = $('#tabsh-'+blockID+' li');
      $tabslis.removeClass('active-tab');
      lih.classList.add('active-tab');

      var $contentlis = $('#tabsc-'+blockID+' li');
      var index = $(lic).index();
      $contentlis.hide().eq(index).show();

      if (e.target.id.startsWith("x-")) {
        self.removeTabElement(fileName);
      }
    });

    // activate current tab by clicking on it
    lih.click();  

    return new FileData(fileName, editor, lih, lic, closeX);   
  }

  removeTabElement(fileName) {
    var pos = this.findFile(fileName);
    if (pos != -1) {

      if (this.openedFiles[pos].hasChanges) 
        showConfirmBox(fileName + " has been modified, save changes?", jQuery.proxy(this.removeTabElementPhase2, this), pos);
      else this.removeTabElementPhase3(pos); // close tab, saving in not needed
    }
  }
  // this method is called from callback of confirmation dialog 
  // confirmAnswer (0 ... do not close, 1 ... save & close, 2 ... don't save, just close)
  removeTabElementPhase2(confirmAnswer, pos) {
      if (confirmAnswer == 0) return;

      if (confirmAnswer == 1) {
        this.saveThisFile(this.openedFiles[pos].fileName, (jResponse)=>{
          if (jResponse.Status==0) 
            this.removeTabElementPhase3(pos);
        });
      } else if (confirmAnswer == 2)
        this.removeTabElementPhase3(pos);
  }
  // close tab and clear all resources (saving (if requested) was already done) 
  removeTabElementPhase3(pos) {
    // remove file (tab and content) from DOM ... 
    this.openedFiles[pos].lihElement.remove(); 
    this.openedFiles[pos].licElement.remove(); 
    // ... and from openedFiles array
    this.openedFiles = this.openedFiles.slice(0,pos).concat(this.openedFiles.slice(pos+1));
    if (this.openedFiles.length > 0)
      this.openedFiles[0].lihElement.click();
  }


  showFileInEditor(projectName, fileName) {
    var fp = this.findFile(fileName);
    if (fp != -1) {
      this.openedFiles[fp].lihElement.click();
    } else {
      askServer('getfile {"Project":"'+projectName+'", "File":"'+fileName+'"}', this.blockID, (blockID, content) => {
          var response = toJSON(content, true, true, true);
          if (response.Status == 0) {
            this.openedFiles.push(this.addTabElement(blockID, fileName, atob(response.Answer)));
          } else 
            alert(response.Message);
      }); 
    }
  }

  loadTree(blockID, content) { 
    content = toJSON(content, true, true, true);
    if (content.Status == 0) {
      content.Answer = atob(content.Answer)      
      content = content.Answer.replace(/_hID_/g, blockID);  
      document.getElementById("explorer-"+blockID).innerHTML = content;

      // na nivoje drevesa (ne liste) dodam poslušalce - ki "odpirajo" in "zapirajo" nivoje drevesa 
      var i;
      var toggler = document.getElementsByClassName("treeNLI-"+blockID); 
      for (i = 0; i < toggler.length; i++) {
        toggler[i].addEventListener("click", function() {
          this.parentElement.querySelector(".treeNested").classList.toggle("treeActive");
          this.classList.toggle("treeCaret-down");
        });
        toggler[i].addEventListener("contextmenu", function(e) {
          e.preventDefault();
          alert("cm-drevo"); // tu bi moral odpreti contex-menu (Delete, properties, ...)
        });
      }
      // dodam še poslušalce na datoteke - ki datoteko odprejo v editorju
      toggler = document.getElementsByClassName("treeALI-"+blockID); 
      let self = this;
      for (i = 0; i < toggler.length; i++) {        
        toggler[i].addEventListener("click", function(e) {
          self.showFileInEditor(self.projectName, this.getAttribute("dat"));
        });
        toggler[i].addEventListener("contextmenu", function(e) {
          e.preventDefault();
          alert("cm-datoteka"); // tu bi moral odpreti contex-menu (Delete, properties, ...)
        });        
      }

      $("#cmdQuestion-" + this.blockID).prop('disabled', true);        // if enabled, disable

    } else {
      showAnswer(blockID, new ErrorData(content.Message));
    }
  }

  postProcess() {
    var bb = document.getElementById("cmdAnswer-"+this.blockID);
    bb.style.height="300px";    

    askServer('getPFIles {"Project":"'+this.projectName+'"}', this.blockID, jQuery.proxy(this.loadTree, this));
  }  
}


class ResultsData extends Data {
  constructor(blockID, resultData) {
    super(Data.RESULTS_DATA);
    this.blockID    = blockID;
    this.refreshResultsTimer;

    this.data = toJSON('{"Project":"", "MType":[], "Results":[], "AnswerID":0}');
    try {this.data = toJSON(resultData);} catch (e) {}
    this.setData();

    // disable system timer to prevent collisions with my own timer
    disableClock(this.blockID);
  }

  destroy() {
    super.destroy();
    clearInterval(this.refreshResultsTimer);
  }

  setData() {
    this.answerID = this.data.AnswerID;
    
    this.mtypes     = new Map();
    this.algorithms = new Map();
    this.testsets   = new Map();

    if (this.data.Results)
      for(var i=0; i<this.data.Results.length; i++) {
        this.algorithms.set(this.data.Results[i].Algorithm, true);
        this.testsets  .set(this.data.Results[i].TestSet, true);
        this.mtypes    .set(this.data.Results[i].MType, true);
      }    
  }

  cbALLItem(tag) {
    return `<input type="checkbox" id="${tag}All-${this.blockID}" name="${tag}All" value="${tag}All" onChange="allcbChanged('${this.blockID}','${tag}');">`;
  }
  cbItem(key, value, tag, map) {
    var chk = value==true ? 'checked="true"' : '';
    return `<input ${chk}class="${tag}CB-${this.blockID}" type="checkbox" id="${tag}${key}-${this.blockID}" value="${key}" onChange="cbChanged('${this.blockID}', '${tag}', '${key}');">${key}&nbsp;&nbsp;&nbsp;`;
  }

  toHtml() {
    if (!this.data.Results) {
      return `<div id="rError-${this.blockID}">Results not available.</div>`;
    }

    var project = `Project: ${this.data.Project}`;
    
    var algorithmsH = this.cbALLItem("algs") + " Algorithms ";
    var algorithmsB = "";
    for (let [key, value] of this.algorithms) 
      algorithmsB += this.cbItem(key,value,"algs", "algorithms");
    allCheck(this.blockID, "algs");

    var testsetsH = this.cbALLItem("tsts") + " TestSets ";
    var testsetsB = "";
    for (let [key, value] of this.testsets) 
      testsetsB += this.cbItem(key,value,"tsts", "testsets");

    var mtypesH = this.cbALLItem("mtype") + " MTypes ";
    var mtypesB = "";
    for(let [key, value] of this.mtypes)
      mtypesB += this.cbItem(key,value,"mtype", "mtypes");

    var div = project + `<table><tr><td class="tdResUp">${algorithmsH}</td><td>:&nbsp;</td><td>${algorithmsB}</td></tr><tr><td class=tdRes>${testsetsH}</td><td>:&nbsp;</td><td>${testsetsB}</td></tr><tr><td class=tdRes>${mtypesH}</td><td>:&nbsp;</td><td>${mtypesB}</td></tr></table>`;
    div +=  '<table style="border:1px solid; width:100%;   padding: 15px; background:white;">';
    for(var i=0; i<this.data.Results.length; i++)  
      if (this.algorithms.get(this.data.Results[i].Algorithm) && this.testsets.get(this.data.Results[i].TestSet) && this.mtypes.get(this.data.Results[i].MType))  
        //div += `<tr class="trRes"><td class="tdRes">${this.data.Results[i].Algorithm}</td><td class="tdRes">${this.data.Results[i].TestSet}</td><td class="tdRes">${this.data.Results[i].MType}</td><td class="tdResLast"><div class="rStatus-${this.blockID}" id="rStatus-${this.blockID}-${i}" idx="${i}"></div></td></tr>`;
        div += `<tr id="rStatus-${this.blockID}-${i}" idx="${i}" class="rStatus-${this.blockID} trRes"></div></td></tr>`;
    div += '</table>';
    return div;   
  }

  
  // prikaz statusa elementa 
  displayStatus(index, element) {
    var idx = $(element).attr("idx");
    var results = this.data.Results[idx];

    if (!(element && results))  return;


    var eCont = `<td class="tdRes">${results.Algorithm}</td><td class="tdRes">${results.TestSet}</td><td class="tdRes">${results.MType}</td><td class="tdResLast"><div class="rStatus-${this.blockID}">`;
    for(var famKey in results.Status) {
      var runTaskB = `<img class="rFile" title="Add task" src="/static/images/run24.png" onclick="addTask(this);" project="${this.data.Project}" algorithm="${results.Algorithm}" testset="${results.TestSet}" family="${famKey}" mt="${results.MType}" />`;
      eCont += `<b>${famKey}</b> ${runTaskB} <br><ul>`;
      var compL = results.Status[famKey];
      for (var comp=0; comp < compL.length; comp++) {
        var fileName = (compL[comp].FN == 0) ? "" : `<span class="rFile" onclick="editFile(this);" project="${this.data.Project}"fName="results/${famKey}.${compL[comp].Cmp}/${results.Algorithm}-${results.TestSet}.${results.MType}">(Edit file)</span>`;
        eCont += "<li>"+ JSON.stringify(compL[comp]) + fileName + "</li>";
      }
      eCont += "</ul>";
    }
    eCont +="</div>";


    // set content ...
    element.innerHTML = eCont;

    // ... and highlight cell for a second
    element.classList.add("highlightedRow");
    var rrTimer = setTimeout(function() {
      clearInterval(rrTimer);
      element.classList.remove("highlightedRow");
    }, 1000);    
  }

  displayAllData() {
    allCheck(this.blockID, "algs");
    allCheck(this.blockID, "tsts");
    allCheck(this.blockID, "mtype");
  
    var self = this;
    $( `.rStatus-${self.blockID}` ).each(function( index,element )  {
      self.displayStatus(index,element);
    });
  }

  

  postProcess() {
    this.displayAllData();

    if (this.refreshResultsTimer) return;

    // če div z id=rError-id obstaja, potem je prišlo do napake in ne smemo osvezevati ....
    var resultError = document.getElementById("rError-"+this.blockID);
    if (resultError) return;

    // ... sicer sprožimo osveževanje
    var self = this;
    var resultElement = document.getElementById("ansTR-"+this.blockID);
    var resTimer = setInterval(function() {
      if (!document.hidden && isElementXPercentInViewport(resultElement, 1))
        askServer(`getResultUpdate {"ID":${self.answerID}}`, self.blockID, function(dID, ans) {
          console.log(`Result update (block ${self.blockID}): ${ans}`);

          var response = toJSON(ans, true, true, true);
          var status = -1; try {status = response.Status;} catch (e) {}
          if (status != 0) { 
            $("#cmdAnswer-" + self.blockID).html(ans);
            clearInterval(self.refreshResultsTimer);
            self.refreshResultsTimer = null;
          } else { // status==0 -> treba bo osvežiti mesta v tabeli
            var answer = toJSON(response.Answer, true, true, true);
            if (response.Message == 'Minor') { // Minor change: replace changed lines
              for(var i=0; i<answer.length;i++) {
                var line  = answer[i].Line;
                var value = answer[i].Value;

                self.data.Results[line]=value;
                var divElement = document.getElementById(`rStatus-${self.blockID}-${line}`);
                self.displayStatus(line,divElement);
              }
              console.log("Answer: " + answer.length);
            } else { // Major change; replace all data!
              self.data = answer;
              self.setData();
              $("#cmdAnswer-" + self.blockID).html(self.toHtml());
              self.displayAllData();
            }
          }
        });
    }, 1000);
    this.refreshResultsTimer = resTimer; 
  }
}


///************
///************
///************
///************
///************  AShell user interface ************///
function gotFocus(event, blockID) {
  env.lastSelectedBlock = blockID;
}

function keyDown(event, blockID) {
  if (event.key == 'ArrowUp' || event.key == 'ArrowDown') {
    var inp = document.getElementById("cmdQuestion-"+blockID);
    if (inp != null) {
      if (event.key == 'ArrowDown'   && env.currentH < env.history.length) env.currentH++; 
      if (event.key == 'ArrowUp'     && env.currentH > 0)                    env.currentH--; 
      if (env.currentH < env.history.length)
        inp.value = env.history[env.currentH]; 
      else
        inp.value = "";
    }
    event.preventDefault();
  }
}

function processKey(event, blockID) {
  var chCode = ('charCode' in event) ? event.charCode : event.keyCode;
  if (chCode == 13) {
    processQuestion(blockID);
  } else if (chCode== 32) { // on space ... check the content and auto-complete if possible
    var input = document.getElementById("cmdQuestion-"+blockID);
    var cont = input.value.toLowerCase();
    if (cont === ">addtask") {
      input.value += ' {"Project":"", "Algorithm":"", "Testset":"", "MType":"em", "Priority":5}';
      input.selectionEnd = 21;
    } else  if (cont === ">gettasks") {
      input.value += ' {"Type":"active"}';
      input.setSelectionRange(19,25);
      event.preventDefault();
    } else  if (cont === ">pausetask" || cont === ">canceltask" || cont === ">resumetask") {
      input.value += ' {"TaskID": }';
      input.setSelectionRange(22,22);
      event.preventDefault();
    } else  if (cont === "results" || cont === ">getresultstatus") {
      input.value += ' {"Project": ""}';
      input.setSelectionRange(21,21);
      event.preventDefault();
    }    
  }
}


function showAnswer(blockID, data) {  
  env.data.set(blockID+"", data);

   var vrsTR = document.getElementById("ansTR-" + blockID);
  // če je vrstica za odgovor še skrita, jo prikažem ...
  vrsTR.style.display = "table-row";      
  // ... in prikazem podatke
  data.show(blockID);

  //if (env.lastBlockAction == blockID) {
  $("#cmdAnswer-" + blockID).scrollTop($("#cmdAnswer-" + blockID)[0].scrollHeight);
    // ... and show whole block
  //  vrsTR.scrollIntoView();
  //}

  // moved to show()
  // data.postProcess();

  // refresh all blocks that depend on blockID
  Object.keys(env.deps).forEach(k=>{
    if (env.deps[k] == blockID) processQuestion(k);
  })
}


// show answer 
function showServerAnswer(blockID, serverAnswer) {  
  // pri ankcijah, ki se niso zapisale v env.command (npr. >list, >status, ...) po odgovoru
  // ugasnem rdeči gumb (saj je to "enkratna akcija")
  if (!env.commands.get(blockID)) $("#cmdStatusB-" + blockID).css("background","green");

  var answer = "<undefined answer>";
  try {answer = serverAnswer.replace(/<br>/g, "\n")} catch (error) {}
  var data = new TextData(answer, blockID);
  showAnswer(blockID, data);
}

function waitForServerAnswer(blockID, commandID) {
  // najprej ustavim morebitno akcijo, ki se je izvajal od prej (da ne pride do zombi akcij)
  stopCMD(blockID);

  if (commandID === "?") {
    $("#cmdStatusB-" + blockID).css("background","green");
    showServerAnswer(blockID, "Not available.");
    return;
  }
  
  env.commands.set(blockID, commandID);
  $("#cmdStatusB-"+blockID).attr('title', commandID);

  var timer = setInterval(function() {
      askServer("command output " + commandID, blockID, function(dID, ans) {
        if (ans.startsWith("_NO_OUTPUT_AVAILABLE_")) {
          clearInterval(timer);          
          $("#cmdStatusB-" + blockID).css("background","green");
        } else {
          $("#cmdStatusB-" + blockID).css("background","red");

          if (ans.trim() != "OUTPUT_NOT_CHANGED")
            showServerAnswer(dID, ans)
        }
      });
    }, 500);  
    env.addTimer(blockID, timer);        
}

function novElement() {
  env.blockID++;

  var cont = '                                                                                    \
    <div class="elt panel" id="cmdDiv-_hID_" style="border-style: solid; border-color: #eeeeee;">\
      <table class="panel" id="cmdTable-_hID_" width=100% style="table-layout:fixed">                                                      \
        <tr>                                                                                    \
            <td align=right style="width: 80px; min-width:80px">\
              <input id="cmdStatusB-_hID_" type="button" style="background-color: green; height: 9px; width: 9px;" value="" class="myBtn" onclick="stopCMD(_hID_);">\
              [%_hID_]:\
            </td>                                            \
            <td><input class="vpis" id="cmdQuestion-_hID_" type="text" style="width: calc(100% - 60px);" onKeyDown="keyDown(event, _hID_);" onKeyPress="processKey(event, _hID_)"; onFocus="gotFocus(event, _hID_);"/>\
                <!--namesto zgornjega inputa bi lahko dal textarea, da preprečim hint: textarea class="vpis" id="cmdQuestion-_hID_" type="text" rows=1 style="padding: 9px 0 0 5px;overflow:hidden; resize:none; min-height:fit-content; width: calc(100% - 60px);" onKeyDown="keyDown(event, _hID_);" onKeyPress="processKey(event, _hID_);" oninput="this.value=this.value.replace(/\n/g,\"\");"></textarea-->\
                <img id="clockOn-_hID_"   onclick="clockOnOff(_hID_,0);" src="/static/images/clock16_active.png" style="float: right; margin: 5px;   display: none;">\
                <img id="clockOf-_hID_"   onclick="clockOnOff(_hID_,1);" src="/static/images/clock16_inactive.png" style="float: right; margin: 5px; display: inline;">\
            <td width="30"><input id="cmdDeleteB-_hID_" type="button" style="background-color: #eeeeee;" value="x" class="myBtn" onclick="deleteCMD(_hID_);"> \
            </td> \
        </tr> \
        <tr id="ansTR-_hID_" style="display: none;"> \
            <td valign=top align=right style="padding-top:7px;">└──>\
            </td> \
            <td style="border-top: 2px solid lightblue; padding-top:7px;">\
                <div id="cmdAnswer-_hID_" style="max-height: 350px; overflow: auto;"></div>   \
            </td>\
            <td valign=bottom>\
                <div id="trikotnik-_hID_" style="height:12px; width: 100%; text-align: center;" draggable="true"\
                  ondragstart="dragStart(event)" ondrag="doDrag(event, _hID_)">▲</p>\
            </td>\
        </tr>\
        <tr><td></td><td><div id="mydragbar" ondragstart="dragStart(event)" ondrag="doDrag(event, _hID_)"></div></td></tr>\
      </table>\
    </div>\
  ';

  cont = cont.replace(/_hID_/g, env.blockID);
  $("#vsebina").append(cont);

  var vpis = document.getElementById("cmdQuestion-" + env.blockID);
  vpis.focus();
}


function deleteCMD(blockID) {
  blockID = "" + blockID; // int -> String
  var data = env.data.get(blockID);
  if (data && data.hasChanges()) 
    showConfirmBox("The data in this block has been modified. Close anyway?", jQuery.proxy(this.deleteCMDPhase2, this), blockID);
  else
    this.deleteCMDPhase2(1, blockID);
}
function deleteCMDPhase2(confirmAnswer, blockID) {
  if (confirmAnswer==1) {
    var element = document.getElementById("cmdDiv-"+blockID);
    element.parentNode.removeChild(element);

    env.data.get(blockID).destroy();

    env.commands.delete(blockID);
    env.data.delete(blockID);    
    env.deps.delete(blockID);    
    env.clearTimers(blockID);
  }
}

function stopCMD(blockID) {
  var commandId = env.commands.get(blockID);
  if (commandId != null) {
    askServer("command stop " + commandId, blockID, function(dID, ans){      
      console.log("Stoping command "+dID+" answer: " + ans);
    });
  }
}

function dragStart(event) {
  lastDragY = event.clientY;
}
function doDrag(event, blockID) {
  var curY = event.clientY;
  var divID = "cmdAnswer-"+blockID;
  
  var height    = document.getElementById(divID).clientHeight; //document.getElementById(divID).style.height;
  var heightDif = (curY - lastDragY);
  document.getElementById(divID).style.maxHeight = (height + heightDif)+"px";
  document.getElementById(divID).style.height    = (height + heightDif)+"px";

  lastDragY = curY;
}



// Questions and Answers
// for help about questions - see helpMessage defined above
function processQuestion(blockID) {
  env.lastBlockAction = blockID;

  // če je to vprašanje iz zadnjega taba, pred odgovorom ustvarim nov tab
  if (blockID == env.blockID) novElement();

  // pridobim cmdQuestion vpisno polje ...
  inp = document.getElementById("cmdQuestion-"+blockID);
  if (inp == null) return;
  // ... in preberem vprašanje
  vpr=inp.value.trim(); 

  // preklicem morebitne timerje prejšnjega odgovora ...
  var curData = env.data.get(""+blockID); 
  if (curData) 
    curData.destroy();
  // ... in obnovim delovanje morebitnega časovnega timerja za osveževanje (destroy ga je odstranil)
  if (env.clockTimer.get(blockID))
    env.clockTimer.set(blockID, setInterval(function() {processQuestion(blockID);}, 1000));


  

  // history maintain: če sem uporabil prejšnji ukaz, ga odstranim, da ga bom dodal na konec
  if (env.currentH < env.history.length && env.history[env.currentH] == vpr) 
    env.history.splice(env.currentH,1);
  // ... in nov ukaz dodam na konec
  env.history.push(vpr);
  env.currentH = env.history.length;   
  
  // I dont depend on any other block; if this is "percentQuestion", 
  // denendency will be (re)added in "processPercent" method
  env.deps[blockID] = 0; 

  var indicator = vpr[0];
  switch (indicator) {
    case '%': // i.e. %1 table
      processPercent(blockID, vpr);
      break;
    case '$': // $Execute == > command run Execute;  $$list == > command list
      processCommand(blockID, vpr);
      break;
    case '>':
      askServer(vpr.substring(1).trim(), blockID, showServerAnswer);
      break;
    default:
      processShellCommand(blockID, vpr);
  }
}

// prejel sem ukaz (command)
//$execute, $analyse, $admin, $version, $users ali $$list, $$stop ID, $$status ID, $$output ID
function processCommand(blockID, vpr) {
  var cmd = vpr.substring(1);

  if (cmd.startsWith("$")) { // ukazi list, status in stop se začnejo z $
    // ti ukazi vrnejo enkraten odgovor, zato uporabim "showServerAnswer"
    askServer("command " + cmd.substring(1), blockID, showServerAnswer);    
  } else { // ostali ukazi (Execute, Analyse, ...)
    askServer("command run " + cmd, blockID, waitForServerAnswer);  
  }
}

// prejel sem ukaz, ki vsebuje % (torej sklic na prejšnji odgovor)
// primer: %3 trim table
// najprej pridobim prejšnji odgovor (vsebino %3), nato nad tem izvedem trim in table
function processPercent(blockID, vpr) {
  var params = [];
  var parts  = vpr.substring(1).split(" ");
  var data   = env.data.get(parts[0]);

  // references are only alowed to previously defined blocks
  // (this prevents cyclic references) 
  if (parts[0] >= blockID) {
    showAnswer(blockID, new ErrorData("Command can not refere to " +
      (parts[0] == blockID ? "itself." : "an answer with higher id.")));
    reutrn;
  }
  env.deps[blockID] = parts[0];

  for(i=1; i<parts.length; i++) {
    switch (parts[i]) {
      case "even": 
        if (data.type === Data.TEXT_DATA) {       
          var vrstice = data.getTextData().split("\n");
          var ans="";
          for(j=0; j<vrstice.length; j++) 
            if (j%2 == 0) ans += vrstice[j] + "\n";
          data = new TextData(ans, blockID);
        } else {
          data = new ErrorData("Invalid argument to 'even': " + data.type);
        }  
        break;  

      case "odd": 
        if (data.type === Data.TEXT_DATA) {       
          var vrstice = data.getTextData().split("\n");
          var ans="";
          for(j=0; j<vrstice.length; j++) 
            if (j%2 != 0) ans += vrstice[j] + "\n";
          data = new TextData(ans, blockID);
        } else {
          data = new ErrorData("Invalid argument to 'odd': " + data.type);
        }  
        break;

      case "data": 
        if (data.type === Data.TEXT_DATA) {       
          var vrstice = data.getTextData().split("\n");
          var ans="";
          // v odgovor so vključene samo vrstice, ki se začnejo z "nevidnim-belim-znakom"; ostale podatke, ki se izpišejo, ignoriram
          for(j=0; j<vrstice.length; j++)
            if (vrstice[j].trim().startsWith("~")) ans += vrstice[j].substring(1) + "\n";
          data = new TextData(ans, blockID);
        } else {
          data = new ErrorData("Invalid argument to 'data': " + data.type);
        }  
        break;

      case "table":
        if (data.type === Data.TEXT_DATA) {             
          data = new TableData(data.getTextData());
        } else if (data.type === Data.EDITOR_DATA) {             
          data = new TableData(data.editor.getValue());
        } else {
          data = new ErrorData("Invalid argument to 'table': " + data.type);
        }
        break;

      case "cols":
        if (data.type === Data.TABLE_DATA) { 
          data = data.cols(params);         
          params = [];   
        } else {
          data = new ErrorData("Invalid argument to 'cols': " + data.type); 
        }
        break;  

      case "plot":
        if (data.type === Data.TABLE_DATA) { 
          data = new PlotData(data.data, params, blockID);
          params = [];
        } else {
          data = new ErrorData("Invalid argument to 'plot': " + data.type); 
        }
        break;

      case "j2c":
        if (data.type === Data.TEXT_DATA) {
          data = new TextData(json2csv(data.getTextData()), blockID);
        } else {
          data = new ErrorData("Invalid argument to 'json2csv': " + data.type); 
        }
        break;

      case "decode":
        if (data.type === Data.TEXT_DATA) {
          try {
            data = new TextData(
              atob(toJSON(data.getTextData(), true, true, true).Answer), blockID);
          } catch (e) {
            data = new ErrorData(e);  
          }
        } else {
          data = new ErrorData("Invalid argument to 'decode': " + data.type); 
        }
        break;


      default:
        params.push(parts[i]);
    }
  }
  showAnswer(blockID, data);
}

function processShellCommand(blockID, vpr) {
  var vprParts = vpr.split(/ +/);
  var scomm    = vprParts[0];
  var params   = vprParts.splice(1); // array
  var allPars  = vpr.substr(vpr.indexOf(" ") + 1); // everything without scomm (String)

  switch (scomm.toLowerCase()) {
    case "version":
      callDjango("/ashell/getWebpageVersion", blockID, showServerAnswer);
      break;
    case "file": 
      if (params.length != 2)
        showAnswer(blockID, new ErrorData("Two paramesters required. Example: file BasicSort proj/BasicSort.atp"));
      else 
        getFileAndEdit(blockID, params);
      break;
    case "project":
      if (params.length != 1)
        showAnswer(blockID, new ErrorData("One paramester required. Example: project BasicSort"));
      else     
        showAnswer(blockID, new FilesData(params[0], blockID));
      break; 
    case "setproject":
      if (params.length == 1) {
        selectProject(blockID, params[0]);
        showAnswer(blockID, new TextData("Project " + params[0] +" selected."));
      } else {
        showAnswer(blockID, new ProjectListData(blockID));
      }
      break;  

    // show project results   
    case "results":
        askServer("getresultstatus " + allPars, blockID, showResultStatus);
      break; 

    case "help":
      showAnswer(blockID, new TextData(helpMessage), blockID);
      showHideMenu('block');
      break;
    default:
      showAnswer(blockID, new ErrorData("Command not defined"));
  }
}


// to se za enkrat uporablja v testne namene; primer klica: edit TestSet1 txt
function getFileAndEdit(blockID, params) {  
  askServer('getfile {"Project":"'+params[0]+'", "File":"'+params[1]+'"}', blockID, edit);
}

function edit(blockID, content) {
  var response = toJSON(content, true, true, true);
  if (response.Status == 0)
    showAnswer(blockID, new EditorData(atob(response.Answer), blockID));
  else
    showAnswer(blockID, new ErrorData(response.Answer));
}

function showResultStatus(blockID, answer) {
  var response = toJSON(answer, true, true, true);
  // try to decode answer; if cant decode, show encoded
  try {response.Answer = atob(response.Answer)} catch (e) {}
  showAnswer(blockID, new ResultsData(blockID, response.Answer))
}


function clockOnOff(blockID, kaj) {
  var id1 = (kaj==0 ? "clockOn-" : "clockOf-") + blockID; 
  var id2 = (kaj==1 ? "clockOn-" : "clockOf-") + blockID; 

  document.getElementById(id1).style.display = "none";
  document.getElementById(id2).style.display = "inline";

  if (kaj == 1) { // turn timer on
    env.clockTimer.set(blockID, setInterval(function() {processQuestion(blockID);}, 1000));
  } else {
    clearInterval(env.clockTimer.get(blockID));
  }
}

// Function hides clock buttons and stops timer (if enabled). Tsis function is used for 
// blocks that control their own content with other timers (like ResultData) to prevent 
// multiple timers collicion.
function disableClock(blockID) {
  document.getElementById("clockOn-" + blockID).style.display = "none";
  document.getElementById("clockOf-" + blockID).style.display = "none";
  clearInterval(env.clockTimer.get(blockID)); 
}


window.onbeforeunload = function() {
    var hasChanges = false;

    try {
      for (let iterator = env.data.values(), r; !(r = iterator.next()).done; ) {
        hasChanges |= r.value.hasChanges();
      }
    } catch (error) {
      console.error(error);
    }
    return hasChanges ? "If you leave this page you will lose your unsaved changes." : null;
}

/************** ResultsData - checkboxes and other ******************/

// function checks if all checkboxes of one kind are checked and 
// checks/unchecks the corresponding all-checkbox
function allCheck(blockID, tag) {
  var allChecked = true;
  $(`.${tag}CB-${blockID}`).each(function() {
    allChecked &= $( this ).prop("checked");
  });
  $(`#${tag}All-${blockID}`).prop("checked", allChecked);
}

// this function is called when checkbox (algorithms, testsets, mtype) is changed
function cbChanged(blockID, tag, key) {
  // check or uncheck the "ALL"-checkBox
  allCheck(blockID, tag);

  //  alter the value in a algorithm-, testset- mtype- map and repaint 
  var data      = env.data.get(blockID);
  var meChecked = $(`#${tag}${key}-${blockID}`).prop("checked");
  var map = tag=="algs" ? data.algorithms : tag=="tsts" ? data.testsets : data.mtypes;
  map.set(key,meChecked);
  
  data.show(blockID);  
}

function allcbChanged(blockID, tag) {
  var data      = env.data.get(blockID);
  var checked = $(`#${tag}All-${blockID}`).prop("checked");  
  var map = tag=="algs" ? data.algorithms : tag=="tsts" ? data.testsets : data.mtypes;

  $(`.${tag}CB-${blockID}`).prop("checked", checked);
  for (let [key, value] of map) map.set(key,checked);
  data.show(blockID);
}

function editFile(element) {
  novElement();
  var inputElt = document.getElementById("cmdQuestion-"+env.lastSelectedBlock);
  inputElt.value = "file " + $(element).attr("project") + " " + $(element).attr("fName");
  processQuestion(env.lastSelectedBlock);
}

function addTask(element) {
  var prj = $(element).attr("project");
  var alg = $(element).attr("algorithm");
  var tst = $(element).attr("testset");
  var fam = $(element).attr("family");
  var mt  = $(element).attr("mt");

  var newTask = `{"Project":"${prj}", "Algorithm":"${alg}", "Testset":"${tst}", "MType":"${mt}", "Family":"${fam}",  "Priority":5}`;
  askServer("addTask " + newTask.toString(), 0, function (blockID, ans) {
    alert(ans);
  });
  
}


/************** ResultsData - checkboxes and other ******************/

1;