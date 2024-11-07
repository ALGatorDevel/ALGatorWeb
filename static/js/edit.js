
function scrollIntoView(id) {
  var elt = document.getElementById(id);
  if (elt) elt.scrollIntoView({ behavior: "smooth"});
}

class GeneralData {
  constructor(projectName, eid, projDesc, author, date, algorithms, testsets) {
    this.setProps(projectName, eid, projDesc, author, date, algorithms, testsets);
  }
  setProps(projectName, eid, projDesc, author, date, algorithms, testsets) {
    this.name       = projectName; 
    if (eid)         this.eid        = eid; 
    if (projDesc)    this.projDesc   = projDesc;
    if (author)      this.author     = author;
    if (date       ) this.date       = date;
    if (algorithms ) this.algorithms = algorithms;
    if (testsets   ) this.testsets   = testsets;
  }
}
class Parameter {
  constructor(parameterName, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType) {
    this.setProps(parameterName, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType);
  }
  setProps(parameterName, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType) {
    this.name        = parameterName; 
    if (isInput)    this.isInput     = isInput;
    if (desc)       this.desc        = desc;
    if (defValue)   this.defValue    = defValue;
    if (metaMin)    this.metaMin     = metaMin;
    if (metaMax)    this.metaMax     = metaMax;
    if (metaStep)   this.metaStep    = metaStep;
    if (metaValues) this.metaValues  = metaValues;
    if (vType)      this.vType       = vType;
  }
}
class Generator {
  constructor(generatorName, description, parameters, sourcecode) {
    this.setProps(generatorName, description, parameters, sourcecode);
  }
  setProps(generatorName, description, parameters, sourcecode) {
    this.name        = generatorName; 
    if (description) this.description = description;
    if (parameters)  this.parameters  = parameters;
    if (sourcecode)  this.sourcecode  = sourcecode;
  }
}
class Testset {
  constructor(testsetName, testsetEID, description, shortname, n, repeat, limit, fileContent) {
    this.setProps(testsetName, testsetEID, description, shortname, n, repeat, limit, fileContent);
  }
  setProps(testsetName, testsetEID, description, shortname, n, repeat, limit, fileContent) {
    this.name        = testsetName; 
    if (testsetEID)  this.eid         = testsetEID;
    if (description) this.description = description;
    if (shortname)   this.shortname   = shortname;
    if (n)           this.n           = n;
    if (repeat)      this.repeat      = repeat;
    if (limit)       this.limit       = limit;
    if (fileContent) this.fileContent = fileContent;
  }
}
class Timer {
  constructor(timerName, desc, timerID, timerSTAT) {
    this.setProps(timerName, desc, timerID, timerSTAT);
  }
  setProps(timerName, desc, timerID, timerSTAT) {
    this.name      = timerName; 
    if (desc)      this.desc      = desc;
    if (timerID)   this.timerID   = timerID;
    if (timerSTAT) this.timerSTAT = timerSTAT;
  }
}
class Indicator {
  constructor(indicatorName, desc, type, code) {
    this.setProps(indicatorName, desc, type, code);
  }
  setProps(indicatorName, desc, type, code) {
    this.name = indicatorName; 
    if (desc) this.desc = desc;
    if (type) this.type = type;
    if (code) this.code = code;
  }
}
class Counter {
  constructor(counterName, desc) {
    this.setProps(counterName, desc);
  }
  setProps(counterName, desc) {
    this.name = counterName; 
    if (desc) this.desc = desc;
  }
}
class Algorithm {
  constructor(name, eid, description, shortname, date, author, language, fileContent, htmlContent) {
    this.setProps(name, eid, description, shortname, date, author, language, fileContent, htmlContent)
  }
  setProps(name, eid, description, shortname, date, author, language, fileContent, htmlContent) {
    this.name        = name;
    if (eid)         this.eid         = eid;
    if (author)      this.author      = author;
    if (date)        this.date        = date;
    if (shortname)   this.shortname   = shortname;
    if (description) this.description = description;
    if (language)    this.language    = language;
    if (fileContent) this.fileContent = fileContent;
    if (htmlContent) this.htmlContent = htmlContent;    
  }
}

class PageProject {
  constructor() {
    this.generalData = new GeneralData();
    this.srcFiles    = new Map();
    this.parameters  = new Map();
    this.timers      = new Map();
    this.indicators  = new Map();
    this.counters    = new Map();
    this.generators  = new Map();
    this.testsets    = new Map();
    this.algorithms  = new Map(); 
  }
  getListElement(eltID, key, linkID) {  
    var newListElement = document.createElement('span'); 
    newListElement.innerHTML = `
       <span class="navBarEl bw cb" id="${eltID}_${key}_mi" name="${eltID}_mi" 
       onclick="selectEditProjectMenuItem('${eltID}', '${key}')">${key}</span>
    `;
    newListElement.id = `${linkID}_${key}`;
    return newListElement;    
  }

  addSubmenuItem(key, eltID, linkID, eltList) {
    var newListElement = this.getListElement(eltID, key, linkID);
    document.getElementById(eltList).appendChild(newListElement);
  }
  removeSubmenuItem(key, linkID) {
    var element = document.getElementById(`${linkID}_${key}`);
    if (element) element.parentNode.removeChild(element);
  }

  addElt(key, elt, eltMap) {
    eltMap.set(key, elt);
  }
  removeElt(key, eltMap, linkID) {
    eltMap.delete(key);
  }
  addParameter(parameterName, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType) {
    var parameter = new Parameter(parameterName, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType);
    this.addElt(parameterName, parameter, this.parameters);
    
    // add parameter to newGenParam multiselect
    addOption(document.getElementById("newgenparam"), parameterName, false);
  }
  removeParameter(key) {
    this.removeElt(key, this.parameters, "parameterlink");

    // remove parameter from newGenParam multiselect
    $(`#newgenparam option[value="${key}"]`).remove();
  }

  addGenerator(generatorName, description, parameters, sourcecode) {
    var generator = new Generator(generatorName, description, parameters, sourcecode);
    this.addElt(generatorName, generator, this.generators);
  }
  removeGenerator(key) {
    this.removeElt(key, this.generators, "generatorlink");
  }
  addTestset(testsetName, testsetEID, description, shortname, n, repeat, limit, fileContent) {
    var testset = new Testset(testsetName, testsetEID, description, shortname, n, repeat, limit, fileContent);
    this.addElt(testsetName, testset, this.testsets);
  }
  removeTestset(key) {
    this.removeElt(key, this.testsets, "testsetlink");
  }
  addTimer(key, desc, timerID, timerSTAT) {
    var timer = new Timer(key, desc, timerID, timerSTAT);
    this.addElt(key, timer, this.timers);
  }
  removeTimer(key) {
    this.removeElt(key, this.timers, "timerlink");
  }
  addIndicator(key, desc, type, code) {
    var indicator = new Indicator(key, desc, type, code);
    this.addElt(key, indicator, this.indicators);
  }
  removeIndicator(key) {
    this.removeElt(key, this.indicators, "indicatorlink");
  }
  addCounter(key, desc) {
    var counter = new Counter(key, desc);
    this.addElt(key, counter, this.counters);
  }
  removeCounter(key) {
    this.removeElt(key, this.counters, "counterlink");
  }
  addAlgorithm(algorithmName, algorithmEID, description, shortname, date, author, language, fileContent, htmlContent) {
    var algorithm = new Algorithm(algorithmName, algorithmEID, description, shortname, date, author, language, fileContent, htmlContent);
    this.addElt(algorithmName, algorithm, this.algorithms);
  }
  removeAlgorithm(key) {
    this.removeElt(key, this.algorithms, "algorithmlink");
  }
}
pageProject = new PageProject();


// saves all changes to entities so that they can be saved
class Changes {
    constructor() {
        this.parameters = new Set();
        this.generators = new Set();
        this.testsets   = new Set(); 
        this.algorithms = new Set(); 
        this.timers     = new Set();    
        this.indicators = new Set();
        this.counters   = new Set();   

        // za vse ostale spremembe (general, input, output)
        this.other      = new Set(); 
    }

    // pobrise iz mnozice spremenjenih objektov in prizge zeleno luc, 
    // ce je bil to edini objekt s spremembo
    delete(set, key) {
      set.delete(key);
      if (set.size == 0) {
        setContentModified(false);
      }
    }
    add(set, key) {
      set.add(key);
    }
}
changes = new Changes();

// all CoreMirror editors on page; key=id of a div thet editor is placed on
editors      = new Map();
editorsColor = new Map(); 

// all editors that are togged between enabled/disabled mode on ProjectEdit; 
disabableEditors = new Map();

// this is used to save Algorithms HTML views
htmlViews = new Map();


function showAnswer(projectName, key, response) {
  var jResp = JSON.parse(response);
  if (jResp.Status == 0) {
    showPopup(jResp.Answer);
  } else {
    showPopup(response);
  }
}

function getValueOfMultiselectAsJSON(multiSelectId) {
  var multiSelectElt = document.getElementById(multiSelectId);
  const selectedOptions = [];
  for (const option of multiSelectElt.options) {
    if (option.selected) {
      selectedOptions.push(option.value);
    }
  }
  return selectedOptions;
}
function getValueOfMultiselectAsStringArray(multiSelectId) {
  return JSON.stringify(getValueOfMultiselectAsJSON(multiSelectId));
}

function addOption(multiSelectElt, value, selected) {
  if (multiSelectElt == null) return;
  for(ixi=0; ixi<multiSelectElt.options.length; ixi++) {
    if (multiSelectElt.options[ixi].text == value) return;
  }
  
  var option = document.createElement('option');
  option.value = option.text = value;
  option.selected = selected;
  try {multiSelectElt.append(option);} catch {}
}
function setValueOfMultiSelect(multiSelectId, valuesString) {
  try {
      var multiSelectElt = document.getElementById(multiSelectId);
      var values = JSON.parse(valuesString.replaceAll("'", "\""));
      values.forEach(function(val){
        addOption(multiSelectElt, val, true);
      });
    } catch (error) {}
}



function initCodeMirrorEditor(cmDiv, hiddenDiv, content, entity, key, theme="eclipse", mode="text/x-java", height="", readOnly=false) {
  var editor = CodeMirror(document.getElementById(cmDiv), {
    mode: mode,
    lineNumbers: true,
    matchBrackets: true,
    theme: theme,
    readOnly: readOnly
  });
  editors.set(cmDiv,editor);    
  editorsColor.set(cmDiv, window.getComputedStyle(editor.getWrapperElement()).getPropertyValue("background-color"));
 
  if (readOnly) {
     disabableEditors.set(cmDiv,editor);
     editor.getWrapperElement().style.backgroundColor = "#f5f5f5"; 
  }    
 
  editor.getDoc().setValue(content);
  editor.on("change", function() {
    var code = editor.getValue();
    document.getElementById(hiddenDiv).value = code;
    contentChanged(entity, key);
  });
  if (height!="") editor.setSize(null, height);
  return editor;
}

   // reads the "array" atribute of element with eltID (which is of 
   // form "["op1", "opt2", ...]") and sets the multiselects options opt1, opt2, ...
   function setMultiselectValuesFromArrray(eltId, key) {
     // set value of enum multiselect
     var evalElt = document.getElementById(eltId+key);
     if (evalElt) {
       var evalValue = evalElt.getAttribute("array");
       if (evalValue) setValueOfMultiSelect(eltId+key, evalValue);
     }
   }
  
  function showAdditionalParametersControls(key) {
    setMultiselectValuesFromArrray("valuesms-", key);

    var typeSelect     = document.getElementById("typep-"+key);
    var idmetaControls = document.getElementById("idmeta-controls-p-"+ key);
    var emetaControls  = document.getElementById("emeta-controls-p-" + key);

    // Reset the additional controls
    idmetaControls.style.display = "none";
    emetaControls.style.display  = "none";

    // Show additional controls if type is int or double
    if (typeSelect.value === "int" || typeSelect.value === "double") {
        idmetaControls.style.display = "block";
    } else if (typeSelect.value === "enum") {
        emetaControls.style.display = "block";
    }
  }   

function checkName(name, dict, entityName) {
  if (!name) {
    showPopup(`Enter a name of a ${entityName} to be added.`);
    return false;
  }
  if (dict.has(name)) {
    entityName = entityName.charAt(0).toUpperCase() + entityName.substring(1);
    showPopup(`${entityName} '${name}' already exists.`);
    return false;
  }
  return true;
}

function selectOptionByValue(selectId, optionValue) {
  var selectElement = document.getElementById(selectId);
  if (selectElement) for (var i = 0; i < selectElement.options.length; i++) {
    var option = selectElement.options[i];
    if (option.value === optionValue) {
      //option.selected = true;
      selectElement.selectedIndex = i;
      break;
    }
  }
}




// ************************************* General ***************************************** //
function getGeneralHTML(projectName, projDesc, author, date, algorithms, testsets) {
  var generalHTML = `
    <table style="width:100%; padding: 15px;">
      <tr><td class="gentd"><label for="namegrl">Name:</label></td>
          <td><input class="almostW pEdit" disabled type="text" id="namegrl" onchange="contentChanged(changes.other, 'general')" readonly value="${projectName}">
      </td></tr>
      <tr><td class="gentd" disabled style="vertical-align: top;"><label for="descgrl">Description:</label></td>
          <td><textarea class="descTA almostW pEditE" disabled id="descgrl" onchange="contentChanged(changes.other, 'general')">${projDesc}</textarea>
      </td></tr>
      <tr><td class="gentd"><label for="authorgrl">Author name:</label></td>
          <td><input class="almostW pEditE" disabled type="text" id="authorgrl" onchange="contentChanged(changes.other, 'general')" value="${author}">
      </td></tr>
      <tr><td class="gentd"><label for="dategrl">Created:</label></td>
          <td><span><input class="almostW" disabled type="text" id="dategrl" onchange="contentChanged(changes.other, 'general')" value="${date}">
      </td></tr>
      <tr><td class="gentd"><label for="dategrl">Last Modified:</label></td>
          <td><span><input class="almostW" disabled type="text" id="dategrl" onchange="contentChanged(changes.other, 'general')" value="${date}">
      </td></tr>

      <!--tr><td class="gentd"><label for="algorithmsgrl">Algorithms:</label></td>
          <td><input class="almostW pEdit" disabled type="text" id="algorithmsgrl" readonly value="${algorithms}">
      </td></tr>
      <tr><td class="gentd"><label for="testsetsgrl">Testsets:</label></td>
          <td><input class="almostW pEdit" disabled "type="text" id="testsetsgrl" readonly value="${testsets}">
      </td></tr-->
    </table>    
  `;
  return generalHTML; 
}

function setGeneralData(projectName, eid, projDesc, author, date, algorithms, testsets) {
  pageProject.generalData = new GeneralData(projectName, eid, projDesc, author, date, algorithms, testsets);
}
function showGeneralData() {
  var gd = pageProject.generalData;
  document.getElementById("general-div").innerHTML = getGeneralHTML(
    `${gd.name} [${gd.eid}]`, gd.projDesc, gd.author, gd.date, gd.algorithms, gd.testsets, gd.isPrivate
  );
}

function saveGeneral(projectName) {
  genJSON =  {
    "Description"   : document.getElementById("descgrl").value,
    "Author"        : document.getElementById("authorgrl").value,
    "Date"          : document.getElementById("dategrl").value,
  };
  genJSONS = JSON.stringify(genJSON);

  var gen = pageProject.generalData;
  if (gen) gen.setProps(projectName, undefined, genJSON.Description, genJSON.Author);

  askServer(saveGeneralPhase2, projectName, "general", 
     `alter {'Action':'SaveProjectGeneral', 'ProjectName':'${projectName}', 'Data':${genJSONS}}` );
}

function saveGeneralPhase2(projectName, key, response) {
  changes.other.delete("general");
}

// ****************************** Files (input, output, tools)  ***************************************** //

function setFileContent(key, content) {
  pageProject.srcFiles.set(key, content);
}
function showFileContent(key) {
  var editor = editors.get(key + "-code-editor");
  if (editor)
    editor.getDoc().setValue(pageProject.srcFiles.get(key));    
}


function saveFile(projectName, fileName, content, key) {
  var bContent    = Base64.encode(content);
  var contentLen = bContent.length; 

  askServer(saveFilePhase2, projectName, key, 
     `SaveFile {'Project':'${projectName}', 'File':'${fileName}', 'Length':${contentLen}, 'Content':'${bContent}'}` );

  setFileContent(key,content);
}
function saveFilePhase2(projectName, key, resp) {
  if (key != null)
    changes.other.delete(key);
}


// ************************************* PARAMETERS ***************************************** //

function getParameterHTML(projectName, key, valueDescription, minv, maxv, stepv, defv, evalue) {
  var paramHTML = `
    <div id="paramdiv-__key__">
    <span id="parameterElt-__key__"></span>
    <table style="width:100%; padding: 15px;">
    <tr><td class="gentd"><label for="namep-__key__">Name: </label>            
           <span class="tooltip-button pEditV" style="display: none;" data-tooltip="Delete" onclick="removeParameter('${projectName}', '__key__')"><img style="padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
        </td>
        <td><input class=3"almostW" disabled type="text" id="namep-__key__" onchange="contentChanged(changes.parameters, '__key__')" readonly value="${key}">
    </td></tr>
    <tr><td class="gentd"><label for="descp-__key__">Description:</label></td>
        <td><textarea class="descTA almostW pEditE" disabled type="text" id="descp-__key__" onchange="contentChanged(changes.parameters, '__key__')">${valueDescription ? valueDescription : ""}</textarea>
    </td></tr>
    <tr><td class="gentd"><label for="typep-__key__">Type:</label></td>
      <td><select id="typep-__key__" class="pEditE" disabled name="typep-__key__" onchange="showAdditionalParametersControls('__key__'); contentChanged(changes.parameters, '__key__')">
        <option id="opstr-__key__" value="string">string</option><option id="opint-__key__" value="int">int</option><option id="opdbl-__key__" value="double">double</option><option id="openu-__key__" value="enum">enum</option>
      </select><br>
    </td></tr>
    <tr><td class="gentd"></td>
      <td><table id="idmeta-controls-p-__key__" class="hidden-controls">
        <tr><td class=metatd><label for="minp-__key__">Min:</label>    </td><td><input class="pEditE" disabled style="width: 400px;" type="text" id="minp-__key__"  name="min-__key__"  value="${minv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd><label for="maxp-__key__">Max:</label>    </td><td><input class="pEditE" disabled style="width: 400px;" type="text" id="maxp-__key__"  name="max-__key__"  value="${maxv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd><label for="stepp-__key__">Step:</label>  </td><td><input class="pEditE" disabled style="width: 400px;" type="text" id="stepp-__key__" name="step-__key__" value="${stepv}" onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
      </table>
    </td></tr>
    <tr><td class="gentd""></td>
      <td>
        <table id="emeta-controls-p-__key__" class="hidden-controls">
        <tr><td class=metatd><label for="valuesp-__key__">Values:</label></td>
            <td><select class="multiselect pEditE" disabled id="valuesms-__key__" multiple style="width: 400px; top: 0px;" array="${evalue}" onchange="contentChanged(changes.parameters, '__key__')"></select>  
        </td></tr>
        </table>
    </td></tr>

    <tr><td class="gentd""></td>
      <td>
        <table>
        <tr><td class=metatd><label for="edefaultp-__key__">Default:</label></td><td><input class="pEditE" disabled type="text" style="width: 400px; margin-top: 10px;" id="edefaultp-__key__" name="edefaultp" value="${defv ? defv : ""}" onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        </table>
    </td></tr>

    </table>
    <hr>
    </div>
  `;
  return paramHTML.replace(/__key__/g, key); 
}

function showParameters() {
  document.getElementById("parameters-list_panel").innerHTML = ""; 
  document.querySelectorAll('.paramDiv').forEach(e => e.remove());

  pageProject.parameters.forEach(function(value, key, map){
    var param = pageProject.parameters.get(key);
    addParameterOnForm(projectName, key, param.isInput, param.desc, param.defValue, param.metaMin, param.metaMax, param.metaStep, param.metaValues, param.vType);
  });
  showHideParametersTitles();
}

function addParameterOnForm(projectName, key, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType) {
  if (!pageProject.parameters.has(key))
    pageProject.addParameter(key, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType);
  
  var parDivID  = (isInput == "True") ? "inputParameters" : "otherParameters";
  var newParDiv = document.createElement('div');newParDiv.classList.add("paramDiv");
  newParDiv.innerHTML = getParameterHTML(projectName, key, desc, metaMin, metaMax, metaStep, defValue, metaValues);

  pageProject.addSubmenuItem(key, "parameterElt", "parameterlink", "parameters-list_panel");
  
  let paramParentDiv = document.getElementById(parDivID);                  
  paramParentDiv.appendChild(newParDiv);
  paramParentDiv.style.display = "block"; // if div is empty, display=none has to be changed to display=block
  selectOptionByValue("typep-"+key, vType);
  showAdditionalParametersControls(key);
  setTimeout(() => {  applySelect2Options($("#valuesms-"+key)); }, 200);   // $("#valuesms-"+key).select2(select2Options);

  return newParDiv;
}

function newParameter(projectName) {
    var parameterName = document.getElementById("newparname").value;
    var isInput = document.getElementById("isInputP").checked;
  
    if (!checkName(parameterName, pageProject.parameters, "parameter")) return;

    askServer(newParameterPhase2, projectName, parameterName, 
        `alter {'Action':'NewParameter', 'ProjectName':'${projectName}', 'ParameterName':'${parameterName}', 'IsInput':${isInput}}` );
}
function newParameterPhase2(projectName, parameterName, response) {
    var isInput = document.getElementById("isInputP").checked;
    var newDiv = addParameterOnForm(projectName, parameterName, isInput ? "True" : "False", "", "", 0, 0, 0, "", "");
    enableProjectEditMode(true, newDiv);

    newDiv.scrollIntoView({ behavior: 'smooth' });

    document.getElementById("newparname").value   = "";
    document.getElementById("isInputP")  .checked = false;
}


function removeParameter(projectName, parameterName) {
  /* 
    askServer(removeParameterPhase2, projectName, parameterName, 
      `alter {'Action':'RemoveParameter', 'ProjectName':'${projectName}', 'ParameterName':'${parameterName}'}`);
  */
  
  removeParameterPhase2(projectName, parameterName, null);
}
function removeParameterPhase2(projectName, parameterName, response) {
  removedItems.push(parameterName);
  contentChanged(changes.parameters, parameterName);

  var element = document.getElementById("paramdiv-"+parameterName);
  if (element) element.parentNode.remove();
  pageProject.removeSubmenuItem(parameterName, "parameterlink");

  showHideParametersTitles();
}

// counts number of Input parameters and number of Other parameters and 
// hide Title of corresponding div if number equals to 0
function showHideParametersTitles() {
  document.getElementById("inputParameters").style.display = 
    (document.getElementById("inputParameters").children.length < 2) ? 'none' : 'block'; 
  document.getElementById("otherParameters").style.display =
    (document.getElementById("otherParameters").children.length < 2) ? 'none' : 'block';     
}

function saveParameters(projectName) {
  removedItems.forEach(function(parameterName) {
    askServer(null, projectName, parameterName, 
      `alter {'Action':'RemoveParameter', 'ProjectName':'${projectName}', 'ParameterName':'${parameterName}'}`);    
    pageProject.removeParameter(parameterName);      
    changes.delete(changes.parameters, parameterName);
  });

  changes.parameters.forEach(function (parameter) {                
    var typep      = document.getElementById("typep-"+parameter).value;  
    var defValue   = document.getElementById("edefaultp-"+parameter).value;
    var desc       = document.getElementById("descp-"+parameter).value;
    var metaMin    = document.getElementById("minp-"+parameter).value; 
    var metaMax    = document.getElementById("maxp-"+parameter).value;
    var metaStep   = document.getElementById("stepp-"+parameter).value;
    var metaValues = getValueOfMultiselectAsJSON("valuesms-"+parameter);
    var parameterJSON  = {
      "Name"           : parameter,
      "Description"    : desc,
      "Type"           : typep,
    };
    if (typep == "enum") {
      parameterJSON["Meta"] = {
        'Values':  metaValues,
        'Default': defValue,
      }
    } else if (typep == "int" || typep == "double") {
      parameterJSON["Meta"] = {
        'Min':     metaMin,
        'Max':     metaMax,
        'Step':    metaStep, 
        'Default': defValue,
      }
    } else {
      parameterJSON["Meta"] = {
        "Default" : defValue,
      }
    }
    var paramJSONS = JSON.stringify(parameterJSON);

    var par = pageProject.parameters.get(parameter);
    if (par) par.setProps(parameter, undefined, parameterJSON.Description, defValue, metaMin, metaMax, metaStep, metaValues, parameterJSON.Type);

    askServer(saveParametersPhase2, projectName, parameter, 
       `alter {'Action':'SaveParameter', 'ProjectName':'${projectName}', 'ParameterName':'${parameter}', 'Parameter':${paramJSONS}}` );

    
  });
}
function saveParametersPhase2(projectName, parameter, response) {
  changes.delete(changes.parameters, parameter);    
}



// ************************************* GENERATORS ***************************************** //
function getGeneratorHTML(projectName, key, desc,genpar) {
  var genHTML = `
     <div id="generatordiv-__key__">
     <span id="generatorElt-__key__"></span>  
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="typeg-__key__">Type:</label>
            <span class="tooltip-button pEditV" style="display:none;" data-tooltip="Delete" onclick="removeGenerator('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
        </td>
         <td><input class="almostW" type="text" disabled id="typeg-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="descg-__key__">Description:</label></td>
         <td><textarea class="descTA almostW pEditE" disabled type="text" id="descg-__key__" onchange="contentChanged(changes.generators, '__key__')">${desc ? desc : ""}</textarea>
     </td></tr>
     <tr><td class="gentd"><label for="¸genpars-__key__">Generating parameters:</label></td>
         <td><select class="multiselect pEditE" disabled id="genpars-__key__" multiple style="width: 400px; top: 0px;"  array="${genpar}" onchange="contentChanged(changes.generators, '__key__')"></select>  
     </td></tr>
     <tr><td class="gentd" style="vertical-align: top;"><label for="gencode-__key__">Code:</label></td>
         <td><textarea id="genhcode-__key__" style="display: none;" onchange="contentChanged(changes.generators, '__key__')"></textarea>
             <div class="CodeMirror almostW" id="gencode-__key__"></div>
     </td></tr>
     </table>
     <hr>
     </div>
  `;
  return genHTML.replace(/__key__/g, key); 
}

function showGenerators() {
  document.getElementById("generators-list_panel").innerHTML = ""; 
  document.querySelectorAll('.generatorDiv').forEach(e => e.remove());

  pageProject.generators.forEach(function(value, key, map){
    var g = pageProject.generators.get(key);
    addGeneratorOnForm(projectName, key, g.description, g.parameters, g.sourcecode, false, true);
  });
}


function addGeneratorOnForm(projectName, generatorName, description, parameters, sourcecode, doTrigger, readOnly) {
  if (!pageProject.generators.has(generatorName))
    pageProject.addGenerator(generatorName, description, parameters, sourcecode);

  var newDiv = document.createElement('div');newDiv.classList.add("generatorDiv");
  newDiv.innerHTML = getGeneratorHTML(projectName, generatorName, description, parameters.replaceAll("\"", "'"));
  document.getElementById("generators-div").appendChild(newDiv);
  var cmDiv=`gencode-${generatorName}`;  
  initCodeMirrorEditor(cmDiv, `genhcode-${generatorName}`, sourcecode, changes.generators, generatorName, undefined,undefined,undefined, readOnly);
  disabableEditors.set(cmDiv,editors.get(cmDiv));

  pageProject.addSubmenuItem(generatorName, "generatorElt", "generatorlink", "generators-list_panel");

  setMultiselectValuesFromArrray("genpars-", generatorName);
  if (doTrigger) $("#genpars-"+generatorName).trigger('change');

  applySelect2Options($("#genpars-"+generatorName));  // $("#genpars-"+generatorName).select2(select2Options);

  return newDiv;
}

function newGenerator(projectName) {
  var generatorName = "Type" + document.getElementById("newgenname").value;
  if (generatorName == "Type") {
        showPopup("Enter a valid generator type (field cannot be empty).");
        return;
  }

  if (!checkName(generatorName, pageProject.generators, "generator")) return;

  var parameters    = getValueOfMultiselectAsStringArray("newgenparam");
  if (parameters =="[]") {
    showPopup(`At least one parameter is required`);
    return;
  }
    
  askServer(newGeneratorPhase2, projectName, generatorName, 
    `alter {'Action':'NewGenerator', 'ProjectName':'${projectName}', 'GeneratorName':'${generatorName}', 'GeneratorParameters':${parameters}}` );
}
function newGeneratorPhase2(projectName, generatorName, response) {
  try {
    parameters = JSON.stringify(response.Answer.Parameters);
    code       = atob(response.Answer.Code); 
  } catch (error) {};
  var newDiv = addGeneratorOnForm(projectName, generatorName, "", parameters, code, true, false);
  enableProjectEditMode(true, newDiv);

  // da zaskrola, moram malo počakati!
  setTimeout(() => {
    newDiv.scrollIntoView({ behavior: 'smooth' });
  }, 500); 

  // document.getElementById("newgenname").value   = "";
  $('#newgenparam').select2('val', null);
}

function removeGenerator(projectName, generatorName) {
  
}

function removeGenerator(projectName, generatorName) {
  askServer(removeGeneratorPhase2, projectName, generatorName, 
      `alter {'Action':'RemoveGenerator', 'ProjectName':'${projectName}', 'GeneratorName':'${generatorName}'}`);
}
function removeGeneratorPhase2(projectName, generatorName, response) {
  pageProject.removeGenerator(generatorName);  
  changes.delete(changes.generators, generatorName);

  var element = document.getElementById("generatordiv-"+generatorName);
  if (element) element.parentNode.removeChild(element);
}


function setNewGenParamValue() {
  var multiSelectElt = document.getElementById("newgenparam");
  pageProject.parameters.forEach(function(param) {
    addOption(multiSelectElt, param.name, false);
  })
}

function saveGenerators(projectName) {
    changes.generators.forEach(function (generator) {                
        var genJSON = {
           "Type"                 : generator,
           "Description"          : document.getElementById("descg-"+generator).value,
           "GeneratingParameters" : getValueOfMultiselectAsJSON("genpars-"+generator),
        };
        var genJSONS = JSON.stringify(genJSON);
        var code = editors.get("gencode-"+generator).getValue();
        var codes = Base64.encode(code);
        askServer(saveGeneratorsPhase2, projectName, generator, 
          `alter {'Action':'SaveGenerator', 'ProjectName':'${projectName}', 'GeneratorType':'${generator}', 'Generator':${genJSONS}, 'Code':'${codes}'}` );

        var gen = pageProject.generators.get(generator);
        if (gen) gen.setProps(generator, genJSON.Description, JSON.stringify(genJSON.GeneratingParameters), code);
   });
}
function saveGeneratorsPhase2(projectName, generator, response) {
  changes.delete(changes.generators, generator);  
}


// ************************************* TESTSETS ***************************************** //
function getTestsetHTML(projectName, key, eid, desc, shortname, n, repeat, timelimit) {
  var testsetHTML = `
     <div id="testsetdiv-__key__">
     <span id="testsetElt-__key__"></span>  
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namets-__key__">Name:</label>
            <span class="tooltip-button pEditV" style="display:none" data-tooltip="Delete" onclick="removeTestset('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" disabled type="text" id="namets-__key__" readonly value="${key} [${eid}]">
     </td></tr>
     <tr><td class="gentd"><label for="tsshort-__key__">Short name</label></td>
         <td><input class="almostW pEditE" disabled type="text" id="tsshort-__key__" value="${shortname}" onchange="contentChanged(changes.testsets, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="descts-__key__">Description:</label></td>
         <td><textarea class="descTA almostW pEditE" disabled class="almostW" type="text" id="descts-__key__" onchange="contentChanged(changes.testsets, '__key__')">${desc}</textarea>
     </td></tr>
     <tr><td class="gentd"><label for="tsnum-__key__">Number of tests</label></td>
         <td><input class="almostW pEditE" disabled type="number" id="tsnum-__key__" value="${n}" onchange="contentChanged(changes.testsets, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="tsrepeated-__key__">Test repeat</label></td>
         <td><input class="almostW pEditE" disabled type="number" id="tsrepeat-__key__" value="${repeat}" onchange="contentChanged(changes.testsets, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="tstimelimit-__key__">Time limit</label></td>
         <td><input class="almostW pEditE" disabled type="number" id="tstimelimit-__key__" value="${timelimit}" onchange="contentChanged(changes.testsets, '__key__')">
     </td></tr>
     <tr><td style="vertical-align:top" class="gentd"><label for="tsfilecont-__key__">Tests</label></td>
         <td><textarea style="display:none;" class="almostW" id="tstimelimitTA-__key__" onchange="contentChanged(changes.testsets, '__key__');"></textarea>
         <div class="CodeMirror almostW" id="tstimelimitCM-__key__"></div>
     </td></tr>

     </table>
     <hr>
     </div>
  `;
  return testsetHTML.replace(/__key__/g, key); 
}

function showTestsets() {
  document.getElementById("testsets-list_panel").innerHTML = ""; 
  document.querySelectorAll('.testsetDiv').forEach(e => e.remove());

  pageProject.testsets.forEach(function(value, key, map){
    var ts = pageProject.testsets.get(key);
    addTestsetOnForm(projectName, key, ts.eid, ts.description, ts.shortname, ts.n, ts.repeat, ts.limit, ts.fileContent, true);
  });
}

function addTestsetOnForm(projectName, testsetName, testsetEID, description, shortname, n, repeat, limit, fileContent, readOnly) {
  if (!pageProject.testsets.has(testsetName))
    pageProject.addTestset(testsetName, testsetEID, description, shortname, n, repeat, limit, fileContent);

  var newDiv = document.createElement('div');newDiv.classList.add("testsetDiv");
  newDiv.innerHTML = getTestsetHTML(projectName, testsetName, testsetEID, description, shortname, n, repeat, limit);
  document.getElementById("testsets-div").appendChild(newDiv);
  document.getElementById("newtestsetname").value   = "";

  pageProject.addSubmenuItem(testsetName, "testsetElt", "testsetlink", "testsets-list_panel");


  var cmDiv = "tstimelimitCM-"+testsetName;
  initCodeMirrorEditor(cmDiv, "tstimelimitTA-"+testsetName, fileContent, changes.testsets, testsetName, "light", undefined, "240px", readOnly);
  var tsEditor = editors.get(cmDiv);
  disabableEditors.set(cmDiv,tsEditor);

  return newDiv;
}

function newTestset(projectName) {
    var testsetName = document.getElementById("newtestsetname").value;

    if (!checkName(testsetName, pageProject.testsets, "testset")) return;

    askServer(newTestsetPhase2, projectName, testsetName, 
       `alter {'Action':'NewTestset', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}'}`);    
}
function newTestsetPhase2(projectName, testsetName, response) {
    askServer(newTestsetPhase3, projectName, testsetName, 
       `getData {'Type':'Testset', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}', 'Deep':true}`);      
}
function newTestsetPhase3(projectName, testsetName, response) {
  let prop = response.Answer.Properties;
  var tsDiv = addTestsetOnForm(projectName, testsetName, prop.eid, prop.Description, prop.ShortName, 
      prop.N, prop.TestRepeat, prop.TimeLimit, response.Answer.FileContent, false);
  enableProjectEditMode(true, tsDiv);

  document.getElementById(`namets-${testsetName}`).scrollIntoView({ behavior: 'smooth' });
}
function removeTestset(projectName, testsetName) {
  askServer(removeTestsetPhase2, projectName, testsetName, 
      `alter {'Action':'RemoveTestset', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}'}`);
}

function removeTestsetPhase2(projectName, testsetName, response) {
  pageProject.removeTestset(testsetName);
  changes.delete(changes.testsets, testsetName);

  var element = document.getElementById("testsetdiv-"+testsetName);
  if (element) element.parentNode.removeChild(element);
}

function saveTestsets(projectName) {
    changes.testsets.forEach(function (testset) {                        
      let ts = pageProject.testsets.get(testset);
      let tsEID = ""; if (ts) tsEID = ts.eid; 

      let tsJSON = {
        "Name"                 : testset,
        "eid"                  : tsEID, 
        "ShortName"            : document.getElementById("tsshort-"+testset).value,
        "Description"          : document.getElementById("descts-"+testset).value,
        "N"                    : parseInt(document.getElementById("tsnum-"+testset).value),
        "TestRepeat"           : parseInt(document.getElementById("tsrepeat-"+testset).value),        
        "TimeLimit"            : parseInt(document.getElementById("tstimelimit-"+testset).value),
      };
      let tests = document.getElementById("tstimelimitTA-"+testset).value;

      if (ts) ts.setProps(tsJSON.Name, tsJSON.eid, tsJSON.Description, tsJSON.ShortName, tsJSON.N, tsJSON.TestRepeat, tsJSON.TimeLimit, tests);

      let dataJSON = {
        "Properties" : tsJSON,
        "FileContent": tests
      };

      askServer(saveTestsetsPhase2, projectName, testset, 
         `alter {'Action':'SaveTestset', 'ProjectName':'${projectName}', 'TestsetName':'${testset}', 'Testset':${JSON.stringify(dataJSON)}}` );
   });
}
function saveTestsetsPhase2(projectName, testsetName, response) {
  changes.delete(changes.testsets, testsetName);  
}

function nonCommentLines(id) {
  let content=document.getElementById("tstimelimitTA-"+id).value;
  let n = content.split('\n').filter(line => { 
    const  trimmedLine = line.trim();
    return trimmedLine.length > 0 && !trimmedLine.startsWith('#');
  }).length;
  document.getElementById("tsnum-"+id).value=n
}


// ************************************* TIMERS ***************************************** //
function getTimerHTML(projectName, key, desc,timerid) {
  var timHTML = `
     <span id="timerElt-__key__"></span>
     <div id="timerdiv-__key__">
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namet-__key__">Name:</label>
            <span class="tooltip-button pEditV" style="display:none" data-tooltip="Delete" onclick="removeTimer('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" disabled type="text" id="namet-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="desct-__key__">Description:</label></td>
         <td><textarea class="descTA almostW pEditE" disabled type="text" id="desct-__key__" onchange="contentChanged(changes.timers, '__key__','desct-','Desc')">${desc ? desc : ""}</textarea>
     </td></tr>
     <tr><td class="gentd"><label for="timid-__key__">Timer ID:</label></td>
         <td><input class="almostW pEditE" disabled type="text" id="timid-__key__" onchange="contentChanged(changes.timers, '__key__', 'timid-', 'TimerID')" value="${timerid}">
     </td></tr>
     <tr><td class="gentd"><label for="statf-__key__">Statistics:</label></td>
       <td><select class=" pEditE" disabled id="statf-__key__" name="statf-__key__" onchange="contentChanged(changes.timers, '__key__', 'statf-', 'Stat')">
         <option id="statmin-__key__" value="MIN">MIN</option><option id="statmax-__key__" value="MAX">MAX</option>
         <option id="statfirst-__key__" value="FIRST">FIRST</option><option id="statlast-__key__" value="LAST">LAST</option>
         <option id="statsum-__key__" value="SUM">SUM</option><option id="statavg-__key__" value="AVG">AVG</option>
         <option id="statmed-__key__" value="MED">MED</option><option id="statall-__key__" value="ALL">ALL</option>
       </select><br>
     </td></tr>
     </table>
     <hr>
     </div>
  `;
  return timHTML.replace(/__key__/g, key); 
}

function showTimers() {
  document.getElementById("timers-list_panel").innerHTML = ""; 
  document.querySelectorAll('.timerDiv').forEach(e => e.remove());

  pageProject.timers.forEach(function(value, key, map){
    var tm = pageProject.timers.get(key);
    addTimerOnForm(projectName, key, tm.desc, tm.timerID, tm.timerSTAT);
  });
}

function addTimerOnForm(projectName, timerName, desc, timerID, timerSTAT) {
  if (!pageProject.timers.has(timerName))
    pageProject.addTimer(timerName, desc, timerID, timerSTAT);

  var divID = "timers-div";
  var newDiv = document.createElement('div');newDiv.classList.add("timerDiv");
  newDiv.innerHTML = getTimerHTML(projectName, timerName, desc, timerID);
  document.getElementById(divID).appendChild(newDiv);

  selectOptionByValue("statf-"+timerName, timerSTAT);                

  pageProject.addSubmenuItem(timerName, "timerElt", "timerlink", "timers-list_panel");

  return newDiv;
}


function newTimer(projectName) {
    var timerName = document.getElementById("newtimer").value;
    if (!checkName(timerName, pageProject.timers, "timer")) return;

    askServer(newTimerPhase2, projectName, timerName, 
      `alter {'Action':'NewIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${timerName}', 'IndicatorType':'timer', 'Meta':{'ID':0, 'STAT':'MIN'}}`);    
}
function newTimerPhase2(projectName, timerName, response) {
  var newDiv = addTimerOnForm(projectName, timerName, "", 0);
  enableProjectEditMode(true, newDiv);

  newDiv.scrollIntoView({ behavior: 'smooth' });

  document.getElementById("newtimer").value   = "";
}

function removeTimer(projectName, timerName) {
  askServer(removeTimerPhase2, projectName, timerName, 
      `alter {'Action':'RemoveIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${timerName}', 'IndicatorType':'timer'}`);
}
function removeTimerPhase2(projectName, timerName, response) {
  pageProject.removeTimer(timerName);
  changes.delete(changes.timers, timerName);
  
  var element = document.getElementById("timerdiv-"+timerName);
  if (element) element.parentNode.removeChild(element);
}

function saveTimers(projectName) {
    changes.timers.forEach(function (timer) {                
        
        timerId = parseInt(document.getElementById("timid-"+timer).value, 10); 
        if (isNaN(timerId)) timerId = 0;
        document.getElementById("timid-"+timer).value = timerId;

        var timerJSON = {
           "Name"                 : timer,
           "Description"          : document.getElementById("desct-"+timer).value,
           "Type"                 : "timer",
           "Meta"                 : {
              "ID"   : timerId,
              "STAT" : document.getElementById("statf-"+timer).value
           }
        };
        var timerJSONS= JSON.stringify(timerJSON);

        var tm = pageProject.timers.get(timer);
        if (tm) tm.setProps(timer, timerJSON.Description, timerJSON.Meta.ID, timerJSON.Meta.STAT);

       askServer(saveTimerPhase2, projectName, timer, 
          `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'timer', 'Indicator':${timerJSONS}}` );
   });
}
function saveTimerPhase2(projectName, timer, response) {  
  changes.delete(changes.timers, timer);        
}



// ************************************* INDICATOR ***************************************** //
function getIndicatorHTML(projectName, key, desc) {
  var timHTML = `
     <span id="indicatorElt-__key__"></span>
     <div id="indicatordiv-__key__">
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namei-__key__">Name:</label>           
           <span class="tooltip-button pEditV" style="display:none" data-tooltip="Delete" onclick="removeIndicator('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" disabled type="text" id="namei-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="desci-__key__">Description:</label></td>
         <td><textarea class="descTA almostW pEditE" disabled type="text" id="desci-__key__" onchange="contentChanged(changes.indicators, '__key__')">${desc ? desc : ""}</textarea>
     </td></tr>
     <tr><td class="gentd"><label for="itype-__key__">Type:</label></td>
       <td><select class="pEditE" disabled id="itype-__key__" name="itype-__key__" onchange="contentChanged(changes.indicators, '__key__')">
         <option id="typeint-__key__" value="int">int</option>
         <option id="typedouble-__key__" value="double">double</option>
         <option id="typestring-__key__" value="string">string</option>
       </select><br>
     </td></tr>
     <tr><td class="gentd" style="vertical-align: top;"><label for="indcode-__key__">Code:</label></td>
         <td><textarea id="indhcode-__key__" style="display: none;" onchange="contentChanged(changes.indicators, '__key__')"></textarea>
             <div class="CodeMirror almostW" id="indcode-__key__"></div>
     </td></tr>     
     </table>
     <hr>
     </div>
  `;
  return timHTML.replace(/__key__/g, key); 
}

function showIndicators() {
  document.getElementById("indicators-list_panel").innerHTML = ""; 
  document.querySelectorAll('.indicatorDiv').forEach(e => e.remove());

  pageProject.indicators.forEach(function(value, key, map){
    var ind = pageProject.indicators.get(key);
    addIndicatorOnForm(projectName, key, ind.desc, ind.type, ind.code, true);
  });
}


function addIndicatorOnForm(projectName, indicatorName, desc, type, code, readOnly) {
  if (!pageProject.indicators.has(indicatorName))
    pageProject.addIndicator(indicatorName, desc, type, code);
  
  var divID = "indicators-div";
  var newDiv = document.createElement('div');newDiv.classList.add("indicatorDiv");
  newDiv.innerHTML = getIndicatorHTML(projectName, indicatorName, desc);
  document.getElementById(divID).appendChild(newDiv);
  
  var cmDiv = `indcode-${indicatorName}`;
  initCodeMirrorEditor(cmDiv, `indhcode-${indicatorName}`, code, changes.indicators, indicatorName, undefined, undefined, undefined, readOnly);
  var indEditor = editors.get(cmDiv);
  disabableEditors.set(cmDiv,indEditor);

  selectOptionByValue("itype-"+indicatorName, type);

  pageProject.addSubmenuItem(indicatorName, "indicatorElt", "indicatorlink", "indicators-list_panel");
  
  return newDiv;
}

function newIndicator(projectName) {
    var indicatorName = document.getElementById("newindicator").value;
    if (!checkName(indicatorName, pageProject.indicators, "indicator")) return;

    askServer(newIndicatorPhase2, projectName, indicatorName, 
      `alter {'Action':'NewIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${indicatorName}', 'IndicatorType':'indicator'}`);
}
function newIndicatorPhase2(projectName, indicatorName, response) {
  var newDiv = addIndicatorOnForm(projectName, indicatorName, "", "int", atob(response.Answer), false);
  enableProjectEditMode(true, newDiv);  
  newDiv.scrollIntoView({ behavior: 'smooth' });

  document.getElementById("newindicator").value   = "";  
}

function removeIndicator(projectName, indicatorName, response) {
  var indicatorName = document.getElementById("namei-"+indicatorName).value; 

  askServer(removeIndicatorPhase2, projectName, indicatorName, 
      `alter {'Action':'RemoveIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${indicatorName}', 'IndicatorType':'indicator'}`);
}

function removeIndicatorPhase2(projectName, indicatorName, response) {
  pageProject.removeIndicator(indicatorName);

  changes.delete(changes.indicators, indicatorName);

  var element = document.getElementById("indicatordiv-"+indicatorName);
  if (element) element.parentNode.removeChild(element);
}

function saveIndicators(projectName) {
    changes.indicators.forEach(function (indicator) {                

        var code = editors.get("indcode-"+indicator).getValue();
        var indJSON =  {
           "Name"        : indicator,
           "Description" : document.getElementById("desci-"+indicator).value,
           "Type"        : document.getElementById("itype-"+indicator).value,
           "Code"        : btoa(code)
        };
        var indJSONS = JSON.stringify(indJSON);

        var ind = pageProject.indicators.get(indicator);
        if (ind) ind.setProps(indicator, indJSON.Description, indJSON.Type, code);

       askServer(saveIndicatorPhase2, projectName, indicator, 
          `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'indicator', 'Indicator':${indJSONS}}` );
   });
}
function saveIndicatorPhase2(projectName, indicator, response) {
  changes.delete(changes.indicators, indicator);
}


// *************************************  COUNTERS  ***************************************** //
function getCounterHTML(projectName, key, desc) {
  var cntHTML = `
     <span id="counterElt-__key__"></span>  
     <div id="counterdiv-__key__">
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namec-__key__">Name:</label>
            <span class="tooltip-button pEditV" style="display:none" data-tooltip="Delete" onclick="removeCounter('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" disabled type="text" id="namec-__key__" value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="descc-__key__">Description:</label></td>
         <td><textarea class="descTA almostW pEditE" disabled type="text" id="descc-__key__" onchange="contentChanged(changes.counters, '__key__')">${desc ? desc : ""}</textarea>
     </td></tr>
     </table>
     <hr>
     </div>
  `;
  return cntHTML.replace(/__key__/g, key); 
}

function showCounters() {
  document.getElementById("counters-list_panel").innerHTML = ""; 
  document.querySelectorAll('.counterDiv').forEach(e => e.remove());

  pageProject.counters.forEach(function(value, key, map){
    var cnt = pageProject.counters.get(key);
    addCounterOnForm(projectName, key, cnt.desc);
  });
}

function addCounterOnForm(projectName, counterName, desc) {
  if (!pageProject.counters.has(counterName))  
    pageProject.addCounter(counterName, desc);    

  var divID = "counters-div";
  var newDiv = document.createElement('div');newDiv.classList.add("counterDiv");
  newDiv.innerHTML = getCounterHTML(projectName, counterName, desc);
  document.getElementById(divID).appendChild(newDiv);

  pageProject.addSubmenuItem(counterName, "counterElt", "counterlink", "counters-list_panel");

  return newDiv;
}

function newCounter(projectName) {
    var counterName = document.getElementById("newcounter").value;
    if (!checkName(counterName, pageProject.counters, "counter")) return;

    askServer(newCounterPhase2, projectName, counterName, 
      `alter {'Action':'NewIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${counterName}', 'IndicatorType':'counter'}`);
}
function newCounterPhase2(projectName, counterName, response) {
  var newDiv = addCounterOnForm(projectName, counterName,"");
  enableProjectEditMode(true, newDiv);  
  newDiv.scrollIntoView({ behavior: 'smooth' });

  document.getElementById("newcounter").value   = "";  
}

function removeCounter(projectName, counterName, response) {
  var counterName = document.getElementById("namec-"+counterName).value; 

  askServer(removeCounterPhase2, projectName, counterName, 
      `alter {'Action':'RemoveIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${counterName}', 'IndicatorType':'counter'}`);
}

function removeCounterPhase2(projectName, counterName, response) {
  pageProject.removeCounter(counterName);
  changes.delete(changes.counters, counterName);

  var element = document.getElementById("counterdiv-"+counterName);
  if (element) element.parentNode.removeChild(element);
}

function saveCounters(projectName) {
    changes.counters.forEach(function (counter) {                
      changes.delete(changes.counters, counter);
        var indJSON = {
           "Name"        : counter,
           "Description" : document.getElementById("descc-"+counter).value,
           "Type"        : "counter"
        };
        var indJSONS = JSON.stringify(indJSON);

        var cnt = pageProject.counters.get(counter);
        if (cnt) cnt.setProps(counter, indJSON.Description);

       askServer(saveCounterPhase2, projectName, counter, 
          `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'counter', 'Indicator':${indJSONS}}` );
   });
}
function saveCounterPhase2(projectName, counter, response) {
  changes.delete(changes.indicators, counter);
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


// ************************************* TESTSETS ***************************************** //
function getAlgorithmHTML(projectName, key, eid, desc, shortname, date, author, language, htmlContent) {
  var algorithmHTML = `
     <div id="algorithmdiv-__key__">
     <span id="algorithmElt-__key__"></span>  
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="nameal-__key__">Name:</label>
            <span class="tooltip-button pEditV" style="display: none;" data-tooltip="Delete" onclick="removeAlgorithm('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" type="text" id="nameal-__key__" disabled readonly value="${key} [${eid}]">
     </td></tr>
     <tr><td class="gentd"><label for="alshort-__key__">Short name</label></td>
         <td><input class="almostW pEditE" disabled type="text" id="alshort-__key__" value="${shortname}" onchange="contentChanged(changes.algorithms, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="descal-__key__">Short description:</label></td>
         <td><textarea class="descTA almostW pEditE" disabled class="almostW" type="text" id="descal-__key__" onchange="contentChanged(changes.algorithms, '__key__')">${desc}</textarea>
     </td></tr>

     <tr><td class="gentd"><label for="aldate-__key__">Date</label></td>
         <td><input class="almostW pEditE" disabled type="text" id="aldate-__key__" value="${date}" onchange="contentChanged(changes.algorithms, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="alauthor-__key__">Author</label></td>
         <td><input class="almostW pEditE" disabled type="text" id="alauthor-__key__" value="${author}" onchange="contentChanged(changes.algorithms, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="allang-__key__">Language</label></td>
         <td><input class="almostW pEditE" disabled type="text" id="allang-__key__" value="${language}" onchange="contentChanged(changes.algorithms, '__key__')">
     </td></tr>
     
     <tr><td style="vertical-align:top" class="gentd"><label for="alghtml-__key__">Detailed description</label></td>
         <td><div class="almostW pEditNV blck" style="background:#f5f5f5; border:1px solid lightgray; margin-bottom:10px;padding:10px;" id="alghtml_prev-algorithmDescription___key__" >${htmlContent}</div>
             <div class="almostW pEditV blck"  style="display:none"       id="alghtml-__key__" ></div>
     </td></tr>

     <tr><td style="vertical-align:top" class="gentd"><label for="algsrcCM-__key__">Source code</label></td>
         <td><textarea style="display:none;" class="almostW" id="algsrcTA-__key__" onchange="contentChanged(changes.algorithms, '__key__');"></textarea>
         <div class="CodeMirror almostW" id="algsrcCM-__key__"></div>
     </td></tr>
      
     </table>
     <hr>
     </div>
  `;
  return algorithmHTML.replace(/__key__/g, key); 
}

function showAlgorithms() {
  document.getElementById("algorithms-list_panel").innerHTML = ""; 
  document.querySelectorAll('.algorithmDiv').forEach(e => e.remove());

  pageProject.algorithms.forEach(function(value, key, map){
    var alg = pageProject.algorithms.get(key);
    addAlgorithmOnForm(projectName, key, alg.eid, alg.description, alg.shortname, 
      alg.date, alg.author, alg.language, alg.fileContent, alg.htmlContent, true);
  });
}

function addAlgorithmOnForm(projectName, algorithmName, algorithmEID, description, shortname, date, author, language, fileContent, htmlContent, readOnly) {
  if (!pageProject.algorithms.has(algorithmName))  
    pageProject.addAlgorithm(algorithmName, algorithmEID, description, shortname, date, author, language, fileContent, htmlContent );

  var newDiv = document.createElement('div');newDiv.classList.add("algorithmDiv");
  newDiv.innerHTML = getAlgorithmHTML(projectName, algorithmName, algorithmEID, description, shortname, date, author, language, htmlContent);
  document.getElementById("algorithms-div").appendChild(newDiv);
  document.getElementById("newalgorithmname").value   = "";

  var editor = initCodeMirrorEditor("algsrcCM-"+algorithmName, "algsrcTA-"+algorithmName, 
    fileContent, changes.algorithms, algorithmName, undefined, undefined, "400px", readOnly);
  disabableEditors.set("algsrcCM-"+algorithmName, editor);  // vsi urejevalniki algoritmov so disabable

  let view = getViewOfType("TextBox", "algorithmDescription", algorithmName);
  document.getElementById("alghtml-"+algorithmName).innerHTML = view.getEditorHTML();  
  document.getElementById("htmlEditorView_algorithmDescription_"+algorithmName).style.margin = "0px 0px 20px 0px";
  view.initNewMode();
  view.viewJSON["htmltext"]=htmlContent;
  view.fillDataAndWireControls(function(){
     contentChanged(changes.algorithms, algorithmName);          
     document.getElementById(`alghtml_prev-${view.viewID}`).innerHTML = view.viewJSON["htmltext"];
  });
  htmlViews.set(algorithmName, view);

  pageProject.addSubmenuItem(algorithmName, "algorithmElt", "algorithmlink", "algorithms-list_panel");


  return newDiv;
}

function newAlgorithm(projectName) {
    var algorithmName = document.getElementById("newalgorithmname").value;

    if (!checkName(algorithmName, pageProject.algorithms, "algorithm")) return;

    askServer(newAlgorithmPhase2, projectName, algorithmName, 
       `alter {'Action':'NewAlgorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithmName}'}`);    
}
function newAlgorithmPhase2(projectName, algorithmName, response) {
    askServer(newAlgorithmPhase3, projectName, algorithmName, 
       `getData {'Type':'Algorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithmName}', 'Deep':true}`);      
}
function newAlgorithmPhase3(projectName, algorithmName, response) {
  let prop = response.Answer.Properties;
  let newDiv = addAlgorithmOnForm(projectName, algorithmName, prop.eid, prop.Description, prop.ShortName, 
      prop.Date, prop.Author, prop.Language, response.Answer.FileContent, response.Answer.HtmlFileContent, false);
  let editor = disabableEditors.get("algsrcCM-"+algorithmName);
  if (editor) editor.getWrapperElement().style.backgroundColor = "#FBFFFB"; // nov editor takoj postane zelen

  enableProjectEditMode(true, newDiv);

  document.getElementById(`nameal-${algorithmName}`).scrollIntoView({ behavior: 'smooth' });
}
function removeAlgorithm(projectName, algorithmName) {
  askServer(removeAlgorithmPhase2, projectName, algorithmName, 
      `alter {'Action':'RemoveAlgorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithmName}'}`);
}

function removeAlgorithmPhase2(projectName, algorithmName, response) {
  pageProject.removeAlgorithm(algorithmName);
  changes.delete(changes.algorithms, algorithmName);

  var element = document.getElementById("algorithmdiv-"+algorithmName);
  if (element) element.parentNode.removeChild(element);
  showPopup(response.Message);
}

function saveAlgorithms(projectName) {
    changes.algorithms.forEach(function (algorithm) {   
      let view = htmlViews.get(algorithm);
      moveResources(algorithm, view.viewJSON["htmltext"], saveAlgorithmsPhase2);
   });
}
function saveAlgorithmsPhase2(algorithm, htmlContent, newHtmlText) {
  let alJSON = {
    "Name"                 : algorithm,
    "Description"          : document.getElementById("descal-"+algorithm).value,        
    "ShortName"            : document.getElementById("alshort-"+algorithm).value,
    "Date"                 : document.getElementById("aldate-"+algorithm).value,
    "Author"               : document.getElementById("alauthor-"+algorithm).value,
    "Language"             : document.getElementById("allang-"+algorithm).value,
  };
  let algsrc = document.getElementById("algsrcTA-"+algorithm).value;

  let al = pageProject.algorithms.get(algorithm);
  if (al) al.setProps(alJSON.Name, alJSON.Description, alJSON.ShortName, alJSON.Date, alJSON.Author, alJSON.language, algsrc);

  let dataJSON = {
    "Properties" : alJSON,
    "FileContent": algsrc,
    "HtmlFileContent" : replaceStaticProjDocLinkWithDolarStatic(newHtmlText)
  };
  askServer(saveAlgorithmsPhase3, projectName, algorithm, 
     `alter {'Action':'SaveAlgorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithm}', 'Algorithm':${JSON.stringify(dataJSON)}}` );  
}

function saveAlgorithmsPhase3(projectName, algorithmName, response) {
  changes.delete(changes.algorithms, algorithmName);  
}


/////////////   editProject logic  /////////////////////////////

var contentModified = false;
var projectEditMode = false;


function enableProjectEditMode(enabled, where=document){
  projectEditMode = enabled;

  // show/hide elements
  where.querySelectorAll('.pEditV').forEach(function(element) {
    var shw = element.classList.contains("blck") ? "block" : "inline";
    if (projectEditMode) 
      element.style.display = shw; 
    else 
      element.style.display = 'none'; 
  });
  where.querySelectorAll('.pEditNV').forEach(function(element) {
    var shw = element.classList.contains("blck") ? "block" : "inline";    
    if (projectEditMode) 
      element.style.display = 'none'; 
    else 
      element.style.display = shw; 
  });
  

  // enable/disable edit fields
  where.querySelectorAll('.pEditE').forEach(function(element) {
    element.disabled = !enabled;
    if (element.classList.contains('multiselect')) {
      updateSelect2Styles(element);
    }
  });

  disabableEditors.forEach(function(editor){
    editor.setOption("readOnly", !enabled);
    editor.getWrapperElement().style.backgroundColor = (enabled ? "#FBFFFB" : "#f5f5f5"); 
  });
}

function updateSelect2Styles(selectElement) {
    var $select = $(selectElement);
    if ($select.prop('disabled')) {
        $select.next('.select2-container').addClass('select2-container--disabled').removeClass('select2-container--enabled');
    } else {
        $select.next('.select2-container').addClass('select2-container--enabled').removeClass('select2-container--disabled');
    }
}

function insertNewSubNavbarItem(id, link, panel) {
  var newListElement = pageProject.getListElement(id, "(New)", link);
  newListElement.classList.add('pEditV');newListElement.style.display="none";
  document.getElementById(panel).appendChild(newListElement);  
}

function selectEditProjectMenuItem(eltID, key) {
  document.getElementsByName(eltID + "_mi").forEach(function(title) {
    title.style.color = '#333';
  });
  document.getElementById(`${eltID}_${key}_mi`).style.color = '#27ae60';

  if (document.activeElement) document.activeElement.blur();

  document.getElementById(eltID+'-'+key).scrollIntoView({ behavior: 'smooth',  block: 'center', inline: 'nearest' });  
}

function updateDotColor(color) {
    var dot = document.getElementById('menu-dot');
    dot.style.backgroundColor = color;
    if (color == 'red') {
      dot.style.cursor ='pointer';
      dot.classList.add("menu-dot-tosave");
    } else {
      dot.style.cursor ='auto';
      dot.classList.remove("menu-dot-tosave");
    }
}
function setContentModified(modified) {
  contentModified = modified;
  updateDotColor(contentModified ? 'red' : 'green');
}


function hideAllShowOne(clickedItem, className, divIdSuffix) {
    var contentDivId = clickedItem.getAttribute('href').substring(1) + divIdSuffix;
    var contentDivs = document.querySelectorAll(className);
    contentDivs.forEach(function (div) {
        div.style.display = 'none';
    });
    var thisDiv = document.getElementById(contentDivId);
    if (thisDiv) thisDiv.style.display = 'block'; 
    return thisDiv;
}
function selectMenuItem(clickedItem) {
    if (projectEditMode) 
      if (contentModified)
        showYesNoDialog("Action will discard changes on '" +editProjectSelectedItem+"' tab. Continue?" , selectMenuItemPhase2, "", "", clickedItem);
      else
        selectMenuItemPhase2(0, "", "", clickedItem);      
    else
      selectMenuItemPhase2(2, "", "", clickedItem);
}

// action: 0 ...cancel Edit and selectItem,  1 ... do not selectItem - stay on page, 2 ... just selectItem
function selectMenuItemPhase2(action, s1, s2, clickedItem) {
    if (action == 1) return;

    if (action==0) {
      editProjectSectionCancel();
    }

    editProjectSelectedItem = clickedItem.innerText;

    document.getElementsByName("mi").forEach(function(title) {
      title.style.color = '#333';
    });
    clickedItem.style.color = '#27ae60';
    if (contentModified) saveContent();
    // Remove 'selected' class from all menu items
    var menuItems = document.querySelectorAll('#menu span');
    menuItems.forEach(function (item) {
        item.classList.remove('selected');
    });
    // Add 'selected' class to the clicked menu item
    clickedItem.classList.add('selected');
    var thisDiv = hideAllShowOne(clickedItem, '.content-div', '-div');
    
    hideAllShowOne(clickedItem, '.submenuitem', '-list');
    // refresh the height of all editors on this div
    var allElements = thisDiv.querySelectorAll('[id]');
    allElements.forEach(function(element) {
      if (editors.get(element.id)) editors.get(element.id).refresh();
    });
    thisDiv.offsetHeight;

    // Reset the contentModified flag
    setContentModified(false);       
}
function contentChanged(entity, key) {
  setContentModified(true);
  entity.add(key);
}

function saveContent() {
  if (changes.other.has("general")) 
    saveGeneral(projectName);
  if (changes.other.has("input")) 
    saveFile(projectName, "proj/src/Input.java", editors.get("input-code-editor").getValue(), "input");
  if (changes.other.has("output")) 
    saveFile(projectName, "proj/src/Output.java", editors.get("output-code-editor").getValue(), "output");
  if (changes.other.has("tools")) 
    saveFile(projectName, "proj/src/Tools.java", editors.get("tools-code-editor").getValue(), "tools");
  if (changes.other.has("algorithms")) 
    saveFile(projectName, "proj/src/Tools.java", editors.get("tools-code-editor").getValue(), "tools");
  if (changes.parameters.size > 0)
    saveParameters(projectName);
  
  saveGenerators(projectName);
  saveTestsets(projectName);
  saveAlgorithms(projectName);
  saveTimers(projectName);            
  saveIndicators(projectName);            
  saveCounters(projectName);
  
  setContentModified(false);  
}

function cancelContentChanges() {
  changes = new Changes();
  setContentModified(false);  

  switch(editProjectSelectedItem) {
    case "General":
      showGeneralData(); break; 
    case "Input":case "Output": case "Tools":
      showFileContent(editProjectSelectedItem.toLowerCase()); break;  
    case "Parameters":
      showParameters(); break;  
    case "Generators":
      showGenerators(); break;  
    case "TestSets":
      showTestsets(); break;  
    case "Timers":
      showTimers(); break;  
    case "Indicators":
      showIndicators(); break;  
    case "Counters":
      showCounters(); break;  
    case "Algorithms":
      showAlgorithms(); break;  
  }
}

function setToday() {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
  var yyyy = today.getFullYear();
  var formattedDate = yyyy + '-' + mm + '-' + dd;
  document.getElementById('dategrl').value = formattedDate;
  contentChanged(changes.other, "general");
}
function setEditPageHeight() {
    var windowHeight = window.innerHeight;
    var contentDiv = document.getElementById('bodydiv');
    var bodyDivHeight = windowHeight - contentDiv.offsetTop - 10;;
    contentDiv.style.height = bodyDivHeight + 'px';
    document.getElementById('lower-section').style.height = (bodyDivHeight-48) + 'px';
}


function showHideSaveCancelButtons(show) {
  document.getElementById("OKCancelButtons_editProjectSection").style.display = (show ? "flex" : "none");
  document.getElementById("Edit_editProjectSection")           .style.display = (show ? "none" : "flex");
  setEditPageHeight();
}

function editSection() {
  // during edit some items (parameters, generators, ...) can be 
  // deleted or added: here we store all such items to be properly
  // processed when Save is pressed
  removedItems = [];
  addedItems   = [];
  
  enableProjectEditMode(true);
  showHideSaveCancelButtons(true); 
}

function editProjectSectionCancel() {
  cancelContentChanges();

  enableProjectEditMode(false);
  showHideSaveCancelButtons(false);
}
function editProjectSectionSave() {
  saveContent();

  enableProjectEditMode(false);
  showHideSaveCancelButtons(false);
}





////////////// project ////////////////////////
function newProject() {
  let projectName=document.getElementById("newprojecttextfield").value;
  askServer(newProjectPhase2, projectName, "newproject", 
     `alter {'Action':'NewProject', 'ProjectName':'${projectName}'}` );
}

function newProjectPhase2(projectName, key, response) {
  showPopup(response.Answer);
  redirectToUrlWithParams(`/problem/${projectName}`, {homepoint: true });
}