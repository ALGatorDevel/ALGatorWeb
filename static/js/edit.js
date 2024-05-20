select2Options = {
      placeholder: " Choose ...",      
      tags: true,
      tokenSeparators: [','],
  };

function scrollIntoView(id) {
  var elt = document.getElementById(id);
  if (elt) elt.scrollIntoView({ behavior: "smooth"});
}

class Testset {
  constructor(testsetName, description, shortname, n, repeat, limit, fileContent) {
    this.setProps(testsetName, description, shortname, n, repeat, limit, fileContent);
  }
  setProps(testsetName, description, shortname, n, repeat, limit, fileContent) {
    this.name        = testsetName; 
    this.description = description;
    this.shortname   = shortname;
    this.n           = n;
    this.repeat      = repeat;
    this.limit       = limit;
    this.fileContent = fileContent;
  }
}

class Algorithm {
  constructor(name, description, shortname, date, author, language, fileContent) {
    this.setProps(name, description, shortname, date, author, language, fileContent)
  }
  setProps(name, description, shortname, date, author, language, fileContent) {
    this.name        = name;
    this.author      = author;
    this.date        = date;
    this.shortname   = shortname;
    this.description = description;
    this.language    = language;
    this.fileContent = fileContent;
  }
}

class PageProject {
  constructor() {
    this.parameters = new Set();
    this.timers     = new Set();
    this.indicators = new Set();
    this.counters   = new Set();
    this.generators = new Set();
    this.testsets   = new Set();
    this.algorithms = new Set(); 
  }
  addElt(key, elt, eltMap, eltID, linkID, eltList) {
    eltMap.add(elt);

    var newListElement = document.createElement('span'); 
    newListElement.innerHTML = `<span class="navBarEl bw cb" onclick="document.getElementById('${eltID}-${key}').scrollIntoView({ behavior: 'smooth' });">${key}</span>`;
    newListElement.id = `${linkID}_${key}`;
    document.getElementById(eltList).appendChild(newListElement);
  }
  removeElt(key, elt, eltMap, linkID) {
    eltMap.delete(elt);

    var element = document.getElementById(`${linkID}_${key}`);
    if (element) element.parentNode.removeChild(element);
  }
  addParameter(key) {
    this.addElt(key, key, this.parameters, "parameterElt", "parameterlink", "parameters-list_panel");
    
    // add parameter to newGenParam multiselect
    addOption(document.getElementById("newgenparam"), key, false);
  }
  removeParameter(key) {
    this.removeElt(key, key, this.parameters, "parameterlink");

    // remove parameter from newGenParam multiselect
    $(`#newgenparam option[value="${key}"]`).remove();
  }

  addTimer(key) {
    this.addElt(key, key, this.timers, "timerElt", "timerlink", "timers-list_panel");
  }
  removeTimer(key) {
    this.removeElt(key, key, this.timers, "timerlink");
  }
  addIndicator(key) {
    this.addElt(key, key, this.indicators, "indicatorElt", "indicatorlink", "indicators-list_panel");
  }
  removeIndicator(key) {
    this.removeElt(key, key, this.indicators, "indicatorlink");
  }
  addCounter(key) {
    this.addElt(key, key, this.counters, "counterElt", "counterlink", "counters-list_panel");
  }
  removeCounter(key) {
    this.removeElt(key, key, this.counters, "counterlink");
  }
  addGenerator(key) {
    this.addElt(key, key, this.generators, "generatorElt", "generatorlink", "generators-list_panel");
  }
  removeGenerator(key) {
    this.removeElt(key, key, this.generators, "generatorlink");
  }
  addTestset(elt) {
    this.addElt(elt.name, elt, this.testsets, "testsetElt", "testsetlink", "testsets-list_panel");
  }
  removeTestset(key) {
    let ts = elementWithName(this.testsets, key);
    if (ts) this.removeElt(key, ts, this.testsets, "testsetlink");
  }
  addAlgorithm(elt) {
    this.addElt(elt.name, elt, this.algorithms, "algorithmElt", "algorithmlink", "algorithms-list_panel");
  }
  removeAlgorithm(key) {
    let ts = elementWithName(this.algorithms, key);
    if (ts) this.removeElt(key, ts, this.algorithms, "algorithmlink");
  }


}
pageProject = new PageProject();


function getNamesOfElements(elements) {
  var names = new Set();
  elements.forEach(element=>{names.add(element.name);})
  return names;
}
function elementWithName(elements, name) {
  for (let element of elements) if (element.name === name) return element;    
  return null; 
}

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
}
changes = new Changes();

// all CoreMirror editors on page; key=id of a div thet editor is placed on
editors   = new Map();

// this is used to save Algorithms HTML views
htmlViews = new Map();

function askServer(callback, projectName, key, request='') {  
  var data = {
      csrfmiddlewaretoken : window.CSRF_TOKEN,
      q : request,
  };
  $.ajax({
      url: askServerURL,
      type: "POST",
      data: data,          
      success: function (response) {  
        serverAnswerPhase2(callback, projectName, key, response.answer);
      }
    }
  );
}
function serverAnswerPhase2(callback, projectName, key, response) {
  try {
    var jResp = JSON.parse(response);
    if (jResp.Status == 0) {
      if (callback != null) callback(projectName, key, jResp);
    } else {
      showPopup(response);
    }
  } catch (error) {
    showPopup(error);
  }
}

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



// unhides div for 3 sec and shows message in it
function showPopup(text) {
    var messageDiv = document.getElementById("popupDiv");
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    setTimeout(function() {messageDiv.style.display = 'none';}, 3000);
}


function initCodeMirrorEditor(cmDiv, hiddenDiv, content, entity, key, theme="abcdef", mode="text/x-java", height="") {
 var editor = CodeMirror(document.getElementById(cmDiv), {
   mode: mode,
   lineNumbers: true,
   matchBrackets: true,
   theme: theme
 });
 editors.set(cmDiv,editor);     
 editor.getDoc().setValue(content);
 editor.on("change", function() {
   var code = editor.getValue();
   document.getElementById(hiddenDiv).value = code;
   contentChanged(entity, key);
 });
 if (height!="") editor.setSize(null, height);
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
          <td><input class="almostW" type="text" id="namegrl" onchange="contentChanged(changes.other, 'general')" readonly value="${projectName}">
      </td></tr>
      <tr><td class="gentd" style="vertical-align: top;"><label for="descgrl">Description:</label></td>
          <td><textarea class="descTA almostW"  id="descgrl" onchange="contentChanged(changes.other, 'general')">${projDesc}</textarea>
      </td></tr>
      <tr><td class="gentd"><label for="authorgrl">Author:</label></td>
          <td><input class="almostW" type="text" id="authorgrl" onchange="contentChanged(changes.other, 'general')" value="${author}">
      </td></tr>
      <tr><td class="gentd"><label for="dategrl">Date:</label></td>
          <td><span><input style="width:calc(100% - 35px);" type="text" id="dategrl" onchange="contentChanged(changes.other, 'general')" value="${date}">
              <button onclick="setToday()">...</button></span>
      </td></tr>
      <!--tr><td class="gentd"><label for="algorithmsgrl">Algorithms:</label></td>
          <td><input class="almostW" type="text" id="algorithmsgrl" readonly value="${algorithms}">
      </td></tr>
      <tr><td class="gentd"><label for="testsetsgrl">Testsets:</label></td>
          <td><input class="almostW" "type="text" id="testsetsgrl" readonly value="${testsets}">
      </td></tr-->
    </table>    
  `;
  return generalHTML; 
}

function saveGeneral(projectName) {
  genJSON = JSON.stringify( {
    "Description"   : document.getElementById("descgrl").value,
    "Author"        : document.getElementById("authorgrl").value,
    "Date"          : document.getElementById("dategrl").value,
  });
  
  askServer(saveGeneralPhase2, projectName, "general", 
     `alter {'Action':'SaveProjectGeneral', 'ProjectName':'${projectName}', 'Data':${genJSON}}` );
}

function saveGeneralPhase2(projectName, key, response) {
  changes.other.delete("general");
}

// ************************************* Save file (input, output)  ***************************************** //
function saveFile(projectName, fileName, content, key) {
  var bContent    = Base64.encode(content);
  var contentLen = bContent.length; 

  askServer(saveFilePhase2, projectName, key, 
     `SaveFile {'Project':'${projectName}', 'File':'${fileName}', 'Length':${contentLen}, 'Content':'${bContent}'}` );
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
          <span class="tooltip-button" data-tooltip="Delete" onclick="removeParameter('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
        </td>
        <td><input class="almostW" type="text" id="namep-__key__" onchange="contentChanged(changes.parameters, '__key__')" readonly value="${key}">
    </td></tr>
    <tr><td class="gentd"><label for="descp-__key__">Description:</label></td>
        <td><textarea class="descTA almostW" type="text" id="descp-__key__" onchange="contentChanged(changes.parameters, '__key__')">${valueDescription}</textarea>
    </td></tr>
    <tr><td class="gentd"><label for="typep-__key__">Type:</label></td>
      <td><select id="typep-__key__" name="typep-__key__" onchange="showAdditionalParametersControls('__key__'); contentChanged(changes.parameters, '__key__')">
        <option id="opstr-__key__" value="string">string</option><option id="opint-__key__" value="int">int</option><option id="opdbl-__key__" value="double">double</option><option id="openu-__key__" value="enum">enum</option>
      </select><br>
    </td></tr>
    <tr><td class="gentd"></td>
      <td><table id="idmeta-controls-p-__key__" class="hidden-controls">
        <tr><td class=metatd><label for="minp-__key__">Min:</label>    </td><td><input style="width: 400px;" type="text" id="minp-__key__"  name="min-__key__"  value="${minv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd><label for="maxp-__key__">Max:</label>    </td><td><input style="width: 400px;" type="text" id="maxp-__key__"  name="max-__key__"  value="${maxv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd><label for="stepp-__key__">Step:</label>  </td><td><input style="width: 400px;" type="text" id="stepp-__key__" name="step-__key__" value="${stepv}" onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd><label for="defp-__key__">Default:</label></td><td><input style="width: 400px;" type="text" id="defp-__key__"  name="defp-__key__" value="${defv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
      </table>
    </td></tr>
    <tr><td class="gentd""></td>
      <td><table id="emeta-controls-p-__key__" class="hidden-controls">
        <tr><td class=metatd><label for="valuesp-__key__">Values:</label></td>
            <td><select class="multiselect" id="valuesms-__key__" multiple style="width: 400px; top: 0px;" array="${evalue}" onchange="contentChanged(changes.parameters, '__key__')"></select>  
        </td></tr>
        <tr><td class=metatd><label for="edefaultp-__key__">Default:</label></td><td><input type="text" style="width: 400px; margin-top: 10px;" id="edefaultp-__key__" name="edefaultp" value="${defv}" onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
      </table>
    </td></tr>
    </table>
    <hr>
    </div>
  `;
  return paramHTML.replace(/__key__/g, key); 
}

function addParameterOnForm(projectName, key, isInput, desc, metaMin, metaMax, metaStep, metaDef, metaValues, vType) {
  pageProject.addParameter(key);
  var parDivID  = (isInput == "True") ? "inputParameters" : "otherParameters";
  var newParDiv = document.createElement('div');
  newParDiv.innerHTML = getParameterHTML(projectName, key, desc, metaMin, metaMax, metaStep, metaDef, metaValues);
  
  let paramParentDiv = document.getElementById(parDivID);                  
  paramParentDiv.appendChild(newParDiv);
  paramParentDiv.style.display = "block"; // if div is empty, display=none has to be changed to display=block
  selectOptionByValue("typep-"+key, vType);
  $("#valuesms-"+key).select2(select2Options);
  showAdditionalParametersControls(key);

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
    var newDiv = addParameterOnForm(projectName, parameterName, isInput ? "True" : "False", "", 0, 0, 0, 0, "", "");
    newDiv.scrollIntoView({ behavior: 'smooth' });

    document.getElementById("newparname").value   = "";
    document.getElementById("isInputP")  .checked = false;
}


function removeParameter(projectName, parameterName) {
  askServer(removeParameterPhase2, projectName, parameterName, 
      `alter {'Action':'RemoveParameter', 'ProjectName':'${projectName}', 'ParameterName':'${parameterName}'}`);
}
function removeParameterPhase2(projectName, parameterName, response) {
  pageProject.removeParameter(parameterName);  
  changes.delete(changes.parameters, parameterName);

  var element = document.getElementById("paramdiv-"+parameterName);
  if (element) element.parentNode.remove();
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
  changes.parameters.forEach(function (parameter) {                
    var typep = document.getElementById("typep-"+parameter).value;    
    parameterJSON = {
      "Name"           : parameter,
      "Description"    : document.getElementById("descp-"+parameter).value,
      "Type"           : typep,
    };
    if (typep == "enum") {
      parameterJSON["Default"] = document.getElementById("edefaultp-"+parameter).value;
      parameterJSON["Meta"] = {
        'Values':  getValueOfMultiselectAsJSON("valuesms-"+parameter),
      }
    } else if (typep == "int" || typep == "double") {
      parameterJSON["Meta"] = {
        'Min':     document.getElementById("minp-"+parameter).value,
        'Max':     document.getElementById("maxp-"+parameter).value,
        'Step':    document.getElementById("stepp-"+parameter).value, 
        'Default': document.getElementById("defp-"+parameter).value,
      }
    }

    paramJSONS = JSON.stringify(parameterJSON);
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
            <span class="tooltip-button" data-tooltip="Delete" onclick="removeGenerator('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
        </td>
         <td><input class="almostW" type="text" id="typeg-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="descg-__key__">Description:</label></td>
         <td><textarea class="descTA almostW" type="text" id="descg-__key__" onchange="contentChanged(changes.generators, '__key__')">${desc}</textarea>
     </td></tr>
     <tr><td class="gentd"><label for="¸genpars-__key__">Generating parameters:</label></td>
         <td><select class="multiselect" id="genpars-__key__" multiple style="width: 400px; top: 0px;"  array="${genpar}" onchange="contentChanged(changes.generators, '__key__')"></select>  
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

function addGeneratorOnForm(projectName, generatorName, description, parameters, sourcecode, doTrigger) {
  pageProject.addGenerator(generatorName);

  var newDiv = document.createElement('div');
  newDiv.innerHTML = getGeneratorHTML(projectName, generatorName, description, parameters.replaceAll("\"", "'"));
  document.getElementById("generators-div").appendChild(newDiv);
  initCodeMirrorEditor(`gencode-${generatorName}`, `genhcode-${generatorName}`, sourcecode, changes.generators, generatorName);

  $("#genpars-"+generatorName).select2(select2Options);
  setMultiselectValuesFromArrray("genpars-", generatorName);
  if (doTrigger) $("#genpars-"+generatorName).trigger('change');

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
  var newDiv = addGeneratorOnForm(projectName, generatorName, "", parameters, code, true);
  // da zaskrola, moram malo počakati!
  setTimeout(() => {
    newDiv.scrollIntoView({ behavior: 'smooth' });
  }, 500); 

  document.getElementById("newgenname").value   = "";
  $('#newgenparam').val(null).trigger('change');
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
    addOption(multiSelectElt, param, false);
  })
}

function saveGenerators(projectName) {
    changes.generators.forEach(function (generator) {                
        var genJSON = JSON.stringify( {
           "Type"                 : generator,
           "Description"          : document.getElementById("descg-"+generator).value,
           "GeneratingParameters" : getValueOfMultiselectAsJSON("genpars-"+generator),
        });
        var genJSONS = JSON.stringify(genJSON);
        var code = Base64.encode(editors.get("gencode-"+generator).getValue());
        askServer(saveGeneratorsPhase2, projectName, generator, 
          `alter {'Action':'SaveGenerator', 'ProjectName':'${projectName}', 'GeneratorType':'${generator}', 'Generator':${genJSON}, 'Code':'${code}'}` );
   });
}
function saveGeneratorsPhase2(projectName, generator, response) {
  changes.delete(changes.generators, generator);  
}


// ************************************* TESTSETS ***************************************** //
function getTestsetHTML(projectName, key, desc, shortname, n, repeat, timelimit) {
  var testsetHTML = `
     <div id="testsetdiv-__key__">
     <span id="testsetElt-__key__"></span>  
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namets-__key__">Name:</label>
            <span class="tooltip-button" data-tooltip="Delete" onclick="removeTestset('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" type="text" id="namets-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="tsshort-__key__">Short name</label></td>
         <td><input class="almostW" type="text" id="tsshort-__key__" value="${shortname}" onchange="contentChanged(changes.testsets, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="descts-__key__">Description:</label></td>
         <td><textarea class="descTA almostW" class="almostW" type="text" id="descts-__key__" onchange="contentChanged(changes.testsets, '__key__')">${desc}</textarea>
     </td></tr>
     <tr><td class="gentd"><label for="tsnum-__key__">Number of tests</label></td>
         <td><input class="almostW" type="number" id="tsnum-__key__" value="${n}" onchange="contentChanged(changes.testsets, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="tsrepeated-__key__">Test repeat</label></td>
         <td><input class="almostW" type="number" id="tsrepeat-__key__" value="${repeat}" onchange="contentChanged(changes.testsets, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="tstimelimit-__key__">Time limit</label></td>
         <td><input class="almostW" type="number" id="tstimelimit-__key__" value="${timelimit}" onchange="contentChanged(changes.testsets, '__key__')">
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
function addTestsetOnForm(projectName, testsetName, description, shortname, n, repeat, limit, fileContent) {
  pageProject.addTestset(new Testset(testsetName, description, shortname, n, repeat, limit, fileContent));

  var newDiv = document.createElement('div');
  newDiv.innerHTML = getTestsetHTML(projectName, testsetName, description, shortname, n, repeat, limit);
  document.getElementById("testsets-div").appendChild(newDiv);
  document.getElementById("newtestsetname").value   = "";

  initCodeMirrorEditor("tstimelimitCM-"+testsetName, "tstimelimitTA-"+testsetName, 
    fileContent, changes.testsets, testsetName, "light", undefined, "240px");

  return newDiv;
}

function newTestset(projectName) {
    var testsetName = document.getElementById("newtestsetname").value;

    if (!checkName(testsetName, getNamesOfElements(pageProject.testsets), "testset")) return;

    askServer(newTestsetPhase2, projectName, testsetName, 
       `alter {'Action':'NewTestset', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}'}`);    
}
function newTestsetPhase2(projectName, testsetName, response) {
    askServer(newTestsetPhase3, projectName, testsetName, 
       `getData {'Type':'Testset', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}', 'Deep':true}`);      
}
function newTestsetPhase3(projectName, testsetName, response) {
  let prop = response.Answer.Properties;
  addTestsetOnForm(projectName, testsetName, prop.Description, prop.ShortName, 
      prop.N, prop.TestRepeat, prop.TimeLimit, response.Answer.FileContent);

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
      let tsJSON = {
        "Name"                 : testset,
        "ShortName"            : document.getElementById("tsshort-"+testset).value,
        "Description"          : document.getElementById("descts-"+testset).value,
        "N"                    : parseInt(document.getElementById("tsnum-"+testset).value),
        "TestRepeat"           : parseInt(document.getElementById("tsrepeat-"+testset).value),        
        "TimeLimit"            : parseInt(document.getElementById("tstimelimit-"+testset).value),
      };
      let tests = document.getElementById("tstimelimitTA-"+testset).value;

      let ts = elementWithName(pageProject.testsets, testset);
      if (ts) ts.setProps(tsJSON.Name, tsJSON.Description, tsJSON.ShortName, tsJSON.N, tsJSON.TestRepeat, tsJSON.TimeLimit, tests);

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
            <span class="tooltip-button" data-tooltip="Delete" onclick="removeTimer('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" type="text" id="namet-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="desct-__key__">Description:</label></td>
         <td><textarea class="descTA almostW" type="text" id="desct-__key__" onchange="contentChanged(changes.timers, '__key__','desct-','Desc')">${desc}</textarea>
     </td></tr>
     <tr><td class="gentd"><label for="timid-__key__">Timer ID:</label></td>
         <td><input class="almostW" type="text" id="timid-__key__" onchange="contentChanged(changes.timers, '__key__', 'timid-', 'TimerID')" value="${timerid}">
     </td></tr>
     <tr><td class="gentd"><label for="statf-__key__">Statistics:</label></td>
       <td><select id="statf-__key__" name="statf-__key__" onchange="contentChanged(changes.timers, '__key__', 'statf-', 'Stat')">
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

function addTimerOnForm(projectName, timerName, desc, timerID) {
  pageProject.addTimer(timerName);

  var divID = "timers-div";
  var newDiv = document.createElement('div');
  newDiv.innerHTML = getTimerHTML(projectName, timerName, desc, timerID);
  document.getElementById(divID).appendChild(newDiv);

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

        var timerJSON = JSON.stringify({
           "Name"                 : timer,
           "Description"          : document.getElementById("desct-"+timer).value,
           "Type"                 : "timer",
           "Meta"                 : {
              "ID"   : timerId,
              "STAT" : document.getElementById("statf-"+timer).value
           }
        });
       askServer(saveTimerPhase2, projectName, timer, 
          `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'timer', 'Indicator':${timerJSON}}` );
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
           <span class="tooltip-button" data-tooltip="Delete" onclick="removeIndicator('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" type="text" id="namei-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="desci-__key__">Description:</label></td>
         <td><textarea class="descTA almostW" type="text" id="desci-__key__" onchange="contentChanged(changes.indicators, '__key__')">${desc}</textarea>
     </td></tr>
     <tr><td class="gentd"><label for="itype-__key__">Type:</label></td>
       <td><select id="itype-__key__" name="itype-__key__" onchange="contentChanged(changes.indicators, '__key__')">
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

function addIndicatorOnForm(projectName, indicatorName, desc, code) {
  pageProject.addIndicator(indicatorName);
  
  var divID = "indicators-div";
  var newDiv = document.createElement('div');
  newDiv.innerHTML = getIndicatorHTML(projectName, indicatorName, desc);
  document.getElementById(divID).appendChild(newDiv);
  
  initCodeMirrorEditor(`indcode-${indicatorName}`, `indhcode-${indicatorName}`, code, changes.indicators, indicatorName);  
  return newDiv;
}

function newIndicator(projectName) {
    var indicatorName = document.getElementById("newindicator").value;
    if (!checkName(indicatorName, pageProject.indicators, "indicator")) return;

    askServer(newIndicatorPhase2, projectName, indicatorName, 
      `alter {'Action':'NewIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${indicatorName}', 'IndicatorType':'indicator'}`);
}
function newIndicatorPhase2(projectName, indicatorName, response) {
  var newDiv = addIndicatorOnForm(projectName, indicatorName, "", atob(response.Answer));
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

        indJSON = JSON.stringify( {
           "Name"        : indicator,
           "Description" : document.getElementById("desci-"+indicator).value,
           "Type"        : document.getElementById("itype-"+indicator).value,
           "Code"        : btoa(editors.get("indcode-"+indicator).getValue())
        });
       askServer(saveIndicatorPhase2, projectName, indicator, 
          `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'indicator', 'Indicator':${indJSON}}` );
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
            <span class="tooltip-button" data-tooltip="Delete" onclick="removeCounter('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" type="text" id="namec-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="descc-__key__">Description:</label></td>
         <td><textarea class="descTA almostW" type="text" id="descc-__key__" onchange="contentChanged(changes.counters, '__key__')">${desc}</textarea>
     </td></tr>
     </table>
     <hr>
     </div>
  `;
  return cntHTML.replace(/__key__/g, key); 
}

function addCounterOnForm(projectName, counterName, desc) {
  pageProject.addCounter(counterName);    

  var divID = "counters-div";
  var newDiv = document.createElement('div');
  newDiv.innerHTML = getCounterHTML(projectName, counterName, desc);
  document.getElementById(divID).appendChild(newDiv);

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
        indJSON = JSON.stringify( {
           "Name"        : counter,
           "Description" : document.getElementById("descc-"+counter).value,
           "Type"        : "counter"
        });
       askServer(saveCounterPhase2, projectName, counter, 
          `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'counter', 'Indicator':${indJSON}}` );
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
function getAlgorithmHTML(projectName, key, desc, shortname, date, author, language) {
  var algorithmHTML = `
     <div id="algorithmdiv-__key__">
     <span id="algorithmElt-__key__"></span>  
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="nameal-__key__">Name:</label>
            <span class="tooltip-button" data-tooltip="Delete" onclick="removeAlgorithm('${projectName}', '__key__')"><img style="  padding-bottom: 5px; width: 16px" src="${deleteImgPath}"/></span>
         </td>
         <td><input class="almostW" type="text" id="nameal-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="alshort-__key__">Short name</label></td>
         <td><input class="almostW" type="text" id="alshort-__key__" value="${shortname}" onchange="contentChanged(changes.algorithms, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="descal-__key__">Description:</label></td>
         <td><textarea class="descTA almostW" class="almostW" type="text" id="descal-__key__" onchange="contentChanged(changes.algorithms, '__key__')">${desc}</textarea>
     </td></tr>

     <tr><td class="gentd"><label for="aldate-__key__">Date</label></td>
         <td><input class="almostW" type="text" id="aldate-__key__" value="${date}" onchange="contentChanged(changes.algorithms, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="alauthor-__key__">Author</label></td>
         <td><input class="almostW" type="text" id="alauthor-__key__" value="${author}" onchange="contentChanged(changes.algorithms, '__key__')">
     </td></tr>
     <tr><td class="gentd"><label for="allang-__key__">Language</label></td>
         <td><input class="almostW" type="text" id="allang-__key__" value="${language}" onchange="contentChanged(changes.algorithms, '__key__')">
     </td></tr>
     
     <tr><td style="vertical-align:top" class="gentd"><label for="alghtml-__key__">Doc</label></td>
         <td><div id="alghtml-__key__"></div>
     </td></tr>

     <tr><td style="vertical-align:top" class="gentd"><label for="algsrcCM-__key__">Algorithm</label></td>
         <td><textarea style="display:none;" class="almostW" id="algsrcTA-__key__" onchange="contentChanged(changes.algorithms, '__key__');"></textarea>
         <div class="CodeMirror almostW" id="algsrcCM-__key__"></div>
     </td></tr>
      
     </table>
     <hr>
     </div>
  `;
  return algorithmHTML.replace(/__key__/g, key); 
}
function addAlgorithmOnForm(projectName, algorithmName, description, shortname, date, author, language, fileContent, htmlContent) {
  pageProject.addAlgorithm(new Algorithm(algorithmName, description, shortname, date, author, language, fileContent));

  var newDiv = document.createElement('div');
  newDiv.innerHTML = getAlgorithmHTML(projectName, algorithmName, description, shortname, date, author, language);
  document.getElementById("algorithms-div").appendChild(newDiv);
  document.getElementById("newalgorithmname").value   = "";

  initCodeMirrorEditor("algsrcCM-"+algorithmName, "algsrcTA-"+algorithmName, 
    fileContent, changes.algorithms, algorithmName, undefined, undefined, "400px");

  let view = getViewOfType("TextBox", "algorithmDescription", algorithmName); 
  document.getElementById("alghtml-"+algorithmName).innerHTML = view.getEditorHTML();  
  view.initNewMode();
  view.viewJSON["htmltext"]=htmlContent;
  view.fillDataAndWireControls(function(){contentChanged(changes.algorithms, algorithmName)});
  htmlViews.set(algorithmName, view);

  return newDiv;
}

function newAlgorithm(projectName) {
    var algorithmName = document.getElementById("newalgorithmname").value;

    if (!checkName(algorithmName, getNamesOfElements(pageProject.algorithms), "algorithm")) return;

    askServer(newAlgorithmPhase2, projectName, algorithmName, 
       `alter {'Action':'NewAlgorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithmName}'}`);    
}
function newAlgorithmPhase2(projectName, algorithmName, response) {
    askServer(newAlgorithmPhase3, projectName, algorithmName, 
       `getData {'Type':'Algorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithmName}', 'Deep':true}`);      
}
function newAlgorithmPhase3(projectName, algorithmName, response) {
  let prop = response.Answer.Properties;
  addAlgorithmOnForm(projectName, algorithmName, prop.Description, prop.ShortName, 
      prop.Date, prop.Author, prop.Language, response.Answer.FileContent, response.Answer.HtmlFileContent);

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
  let al = elementWithName(pageProject.algorithms, algorithm);
  if (al) al.setProps(alJSON.Name, alJSON.Description, alJSON.ShortName, alJSON.Date, alJSON.Author, alJSON.language, algsrc);

  let dataJSON = {
    "Properties" : alJSON,
    "FileContent": algsrc,
    "HtmlFileContent" : newHtmlText
  };
  askServer(saveAlgorithmsPhase3, projectName, algorithm, 
     `alter {'Action':'SaveAlgorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithm}', 'Algorithm':${JSON.stringify(dataJSON)}}` );  
}

function saveAlgorithmsPhase3(projectName, algorithmName, response) {
  changes.delete(changes.algorithms, algorithmName);  
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

