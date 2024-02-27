select2Options = {
      placeholder: " Choose ...",      
      tags: true,
      tokenSeparators: [',']
};

class PageProject {
  constructor() {
    this.parameters = new Set();
    this.timers     = new Set();
    this.indicators = new Set();
    this.counters   = new Set();
    this.generators = new Set();
    this.testsets = new Set();
  }
  addElt(key, eltMap, eltID, linkID, eltList) {
    eltMap.add(key);
    var newListElement = document.createElement('span'); 
    newListElement.innerHTML = `| <a href='#${eltID}-${key}'>${key}</a> |`;
    newListElement.id = `${linkID}_${key}`;
    document.getElementById(eltList).appendChild(newListElement);
  }
  removeElt(key, eltMap, linkID) {
    eltMap.delete(key);

    var element = document.getElementById(`${linkID}_${key}`);
    if (element) element.parentNode.removeChild(element);
  }
  addParameter(key) {
    this.addElt(key, this.parameters, "parameterElt", "parameterlink", "parameters-list_panel");
    
    // add parameter to newGenParam multiselect
    addOption(document.getElementById("newgenparam"), key, false);
  }
  removeParameter(key) {
    this.removeElt(key, this.parameters, "parameterlink");

    // remove parameter from newGenParam multiselect
    $(`#newgenparam option[value="${key}"]`).remove();
  }

  addTimer(key) {
    this.addElt(key, this.timers, "timerElt", "timerlink", "timers-list_panel");
  }
  removeTimer(key) {
    this.removeElt(key,this.timers, "timerlink");
  }
  addIndicator(key) {
    this.addElt(key, this.indicators, "indicatorElt", "indicatorlink", "indicators-list_panel");
  }
  removeIndicator(key) {
    this.removeElt(key,this.indicators, "indicatorlink");
  }
  addCounter(key) {
    this.addElt(key, this.counters, "counterElt", "counterlink", "counters-list_panel");
  }
  removeCounter(key) {
    this.removeElt(key, this.counters, "counterlink");
  }
  addGenerator(key) {
    this.addElt(key, this.generators, "generatorElt", "generatorlink", "generators-list_panel");
  }
  removeGenerator(key) {
    this.removeElt(key, this.generators, "generatorlink");
  }
  addTestset(key) {
    this.addElt(key, this.testsets, "testsetElt", "testsetlink", "testsets-list_panel");
  }
  removeTestset(key) {
    this.removeElt(key, this.testsets, "testsetlink");
  }

}
pageProject = new PageProject();

// saves all changes to entities so that they can be saved
class Changes {
    constructor() {
        this.parameters = new Set();
        this.generators = new Set();
        this.testsets   = new Set(); 
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
editors = new Map();

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


   function initCodeMirrorEditor(cmDiv, hiddenDiv, content, entity, key) {
     var editor = CodeMirror(document.getElementById(cmDiv), {
       mode: "text/x-java",
       lineNumbers: true,
       matchBrackets: true,
       theme: "abcdef"
     });
     editors.set(cmDiv,editor);     
     editor.getDoc().setValue(content);
     editor.on("change", function() {
       var code = editor.getValue(hiddenDiv);
       document.getElementById(hiddenDiv).value = code;
       contentChanged(entity, key);
     });
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


// ************************************* General ***************************************** //
function getGeneralHTML(projectName, projDesc, author, date, algorithms, testsets) {
  var generalHTML = `
    <table style="width:100%; padding: 15px;">
      <tr><td class="gentd"><label for="namegrl">Name:</label></td>
          <td><input style="width:100%;" type="text" id="namegrl" onchange="contentChanged(changes.other, 'general')" readonly value="${projectName}">
      </td></tr>
      <tr><td class="gentd"><label for="descgrl">Description:</label></td>
          <td><input style="width:100%;" type="text" id="descgrl" onchange="contentChanged(changes.other, 'general')" value="${projDesc}">
      </td></tr>
      <tr><td class="gentd"><label for="authorgrl">Author:</label></td>
          <td><input style="width:100%; "type="text" id="authorgrl" onchange="contentChanged(changes.other, 'general')" value="${author}">
      </td></tr>
      <tr><td class="gentd"><label for="dategrl">Date:</label></td>
          <td><span><input style="width:calc(100% - 35px);" type="text" id="dategrl" onchange="contentChanged(changes.other, 'general')" value="${date}">
              <button onclick="setToday()">...</button></span>
      </td></tr>
      <tr><td class="gentd"><label for="algorithmsgrl">Algorithms:</label></td>
          <td><input style="width:100%; "type="text" id="algorithmsgrl" readonly value="${algorithms}">
      </td></tr>
      <tr><td class="gentd"><label for="testsetsgrl">Testsets:</label></td>
          <td><input style="width:100%; "type="text" id="testsetsgrl" readonly value="${testsets}">
      </td></tr>
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

// ************************************* Input  ***************************************** //


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
    <a name="parameterElt-__key__"></a>
    <table style="width:100%; padding: 15px;">
    <tr><td class="gentd"><label for="namep-__key__">Name:</label></td>
        <td><input style="width:100%;" type="text" id="namep-__key__" onchange="contentChanged(changes.parameters, '__key__')" readonly value="${key}">
    </td></tr>
    <tr><td class="gentd"><label for="descp-__key__">Description:</label></td>
        <td><input style="width:100%;" type="text" id="descp-__key__" onchange="contentChanged(changes.parameters, '__key__')" value="${valueDescription}">
    </td></tr>
    <tr><td class="gentd"><label for="typep-__key__">Type:</label></td>
      <td><select id="typep-__key__" name="typep-__key__" onchange="showAdditionalParametersControls('__key__'); contentChanged(changes.parameters, '__key__')">
        <option id="opstr-__key__" value="string">string</option><option id="opint-__key__" value="int">int</option><option id="opdbl-__key__" value="double">double</option><option id="openu-__key__" value="enum">enum</option>
      </select><br>
    </td></tr>
    <tr><td class="gentd"></td>
      <td><table id="idmeta-controls-p-__key__" class="hidden-controls">
        <tr><td class=metatd><label for="minp-__key__">Min:</label>    </td><td><input id="minp-__key__"  name="min-__key__"  value="${minv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd><label for="maxp-__key__">Max:</label>    </td><td><input id="maxp-__key__"  name="max-__key__"  value="${maxv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd><label for="stepp-__key__">Step:</label>  </td><td><input id="stepp-__key__" name="step-__key__" value="${stepv}" onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd><label for="defp-__key__">Default:</label></td><td><input id="defp-__key__"  name="defp-__key__" value="${defv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
      </table>
    </td></tr>
    <tr><td class="gentd""></td>
      <td><table id="emeta-controls-p-__key__" class="hidden-controls">
        <tr><td class=metatd><label for="valuesp-__key__">Values:</label></td>
            <td><select class="multiselect" id="valuesms-__key__" multiple style="width: 200px;" array="${evalue}" onchange="contentChanged(changes.parameters, '__key__')"></select>  
        </td></tr>
        <tr><td class=metatd><label for="edefaultp-__key__">Default:</label></td><td><input type="text" id="edefaultp-__key__" name="edefaultp" value="${defv}" onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
      </table>
    </td></tr>
    <tr><td></td><td style="text-align: right;"><button onclick="removeParameter('${projectName}', '__key__')">Remove</button></td></tr>
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
                    
  document.getElementById(parDivID).appendChild(newParDiv);
  selectOptionByValue("typep-"+key, vType);
  $("#valuesms-"+key).select2(select2Options);
  showAdditionalParametersControls(key);

  return newParDiv;
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
}


function removeParameter(projectName, parameterName) {
  pageProject.removeParameter(parameterName);  
  changes.delete(changes.parameters, parameterName);

  var element = document.getElementById("paramdiv-"+parameterName);
  if (element) element.parentNode.remove();
  showHideParametersTitles();
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
    changes.delete(changes.parameters, parameter);    
    var typep = document.getElementById("typep-"+parameter).value;    
    parameterJSON = {
      "Name"           : parameter,
      "Description"    : document.getElementById("descp-"+parameter).value,
      "Type"           : typep,
    };
    if (typep == "enum") {
      parameterJSON["Values"]  = getValueOfMultiselectAsJSON("valuesms-"+parameter);
      parameterJSON["Default"] = document.getElementById("edefaultp-"+parameter).value;
    } else if (typep == "int" || typep == "double") {
      parameterJSON["Meta"] = {
        'Min':     document.getElementById("minp-"+parameter).value,
        'Max':     document.getElementById("maxp-"+parameter).value,
        'Step':    document.getElementById("stepp-"+parameter).value, 
        'Default': document.getElementById("defp-"+parameter).value,
      }
    }

    paramJSONS = JSON.stringify(parameterJSON);
    askServer(null, projectName, parameter, 
       `alter {'Action':'SaveParameter', 'ProjectName':'${projectName}', 'ParameterName':'${parameter}', 'Parameter':${paramJSONS}}` );
  });
}

// ************************************* GENERATORS ***************************************** //


function getGeneratorHTML(projectName, key, desc,genpar) {
  var genHTML = `
     <div id="generatordiv-__key__">
     <a name="generatorElt-__key__"></a>  
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="typeg-__key__">Type:</label></td>
         <td><input style="width:100%;" type="text" id="typeg-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="descg-__key__">Description:</label></td>
         <td><input style="width:100%;" type="text" id="descg-__key__" onchange="contentChanged(changes.generators, '__key__')" value="${desc}">
     </td></tr>
     <tr><td class="gentd"><label for="¸genpars-__key__">Generating parameters:</label></td>
         <td><select class="multiselect" id="genpars-__key__" multiple style="width: 400px; top: 0px;"  array="${genpar}" onchange="contentChanged(changes.generators, '__key__')"></select>  
     </td></tr>
     <tr><td class="gentd" style="vertical-align: top;"><label for="gencode-__key__">Code:</label></td>
         <td><textarea id="genhcode-__key__" style="display: none;" onchange="contentChanged(changes.generators, '__key__')"></textarea>
             <div class="CodeMirror" id="gencode-__key__"></div>
     </td></tr>
     <tr><td></td><td style="text-align: right;"><button onclick="removeGenerator('${projectName}', '__key__')">Remove</button></td></tr>                 
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
  var generatorName = document.getElementById("newgenname").value;
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
  parameters = "[]";
  var newDiv = addGeneratorOnForm(projectName, generatorName, "", parameters, " ", true);
  // da zaskrola, moram malo počakati!
  setTimeout(() => {
    newDiv.scrollIntoView({ behavior: 'smooth' });
  }, 500); 
}

function removeGenerator(projectName, generatorName) {
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
        changes.delete(changes.generators, generator);
        indJSON = JSON.stringify( {
           "Type"                 : generator,
           "Description"          : document.getElementById("descg-"+generator).value,
           "GeneratingParameters" : getValueOfMultiselectAsJSON("genpars-"+generator),
           "Code"                 : editors.get("gencode-"+generator).getValue(),
        });
        alert(indJSON);
       //askServer(showAnswer, projectName, indicator, 
       //   `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'indicator', 'Indicator':${indJSON}}` );
   });
}


// ************************************* TESTSETS ***************************************** //
function getTestsetHTML(projectName, key, desc) {
  var testsetHTML = `
     <div id="testsetdiv-__key__">
     <a name="testsetElt-__key__"></a>  
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namets-__key__">Name:</label></td>
         <td><input style="width:100%;" type="text" id="namets-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="descts-__key__">Description:</label></td>
         <td><input style="width:100%;" type="text" id="descts-__key__" onchange="contentChanged(changes.testsets, '__key__')" value="${desc}">
     </td></tr>
     <tr><td></td><td style="text-align: right;"><button onclick="removeTestset('${projectName}', '__key__')">Remove</button></td></tr>                 
     </table>
     <hr>
     </div>
  `;
  return testsetHTML.replace(/__key__/g, key); 
}
function addTestsetOnForm(projectName, testsetName, description) {
  pageProject.addTestset(testsetName);

  var newDiv = document.createElement('div');
  newDiv.innerHTML = getTestsetHTML(projectName, testsetName, description);
  document.getElementById("testsets-div").appendChild(newDiv);

  return newDiv;
}

function newTestset(projectName) {
    var testsetName = document.getElementById("newtestsetname").value;

    if (!checkName(testsetName, pageProject.testsets, "testset")) return;

    //askServer(newTimerPhase2, projectName, timerName, 
    //  `alter {'Action':'NewIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${timerName}', 'IndicatorType':'timer', 'Meta':{'ID':0, 'STAT':'MIN'}}`);    
    newTestsetPhase2(projectName, testsetName, '{"Status":0}');
}
function newTestsetPhase2(projectName, testsetName, response) {
  addTestsetOnForm(projectName, testsetName, "");

  document.getElementById(`namets-${testsetName}`).scrollIntoView({ behavior: 'smooth' });
}
function removeTestset(projectName, testsetName) {
//  askServer(removeTimerPhase2, projectName, timerName, 
//      `alter {'Action':'RemoveIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${timerName}', 'IndicatorType':'timer'}`);
  removeTestsetPhase2(projectName, testsetName, '{"Status":0, "Answer":"Test set removed"}');
}

function removeTestsetPhase2(projectName, testsetName, response) {
  pageProject.removeTestset(testsetName);
  changes.delete(changes.testsets, testsetName);

  var element = document.getElementById("testsetdiv-"+testsetName);
  if (element) element.parentNode.removeChild(element);

  showPopup(jResp.Answer);
}

function saveTestsets(projectName) {
    changes.testsets.forEach(function (testset) {                
        changes.delete(changes.testsets, testset);

        tsJSON = JSON.stringify( {
           "Name"                 : testset,
           "Description"          : document.getElementById("descts-"+testset).value,
           //...
        });
        alert(tsJSON);
       //askServer(showAnswer, projectName, indicator, 
       //   `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'indicator', 'Indicator':${indJSON}}` );
   });
}


// ************************************* Output ***************************************** //

function saveOutput(projectName) {
  outputJSON = JSON.stringify( {
    "Code"        : editors.get("output-code-editor").getValue()
  });
  alert(outputJSON);
  //askServer(showAnswer, projectName, indicator, 
  //   `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'indicator', 'Indicator':${indJSON}}` );
  changes.other.delete("output");
}

// ************************************* TIMERS ***************************************** //

function getTimerHTML(projectName, key, desc,timerid) {
  var timHTML = `
     <a name="timerElt-__key__"></a>
     <div id="timerdiv-__key__">
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namet-__key__">Name:</label></td>
         <td><input style="width:100%;" type="text" id="namet-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="desct-__key__">Description:</label></td>
         <td><input style="width:100%;" type="text" id="desct-__key__" onchange="contentChanged(changes.timers, '__key__','desct-','Desc')" value="${desc}">
     </td></tr>
     <tr><td class="gentd"><label for="timid-__key__">Timer ID:</label></td>
         <td><input style="width:100%;" type="text" id="timid-__key__" onchange="contentChanged(changes.timers, '__key__', 'timid-', 'TimerID')" value="${timerid}">
     </td></tr>
     <tr><td class="gentd"><label for="statf-__key__">Statistics:</label></td>
       <td><select id="statf-__key__" name="statf-__key__" onchange="contentChanged(changes.timers, '__key__', 'statf-', 'Stat')">
         <option id="statmin-__key__" value="MIN">MIN</option><option id="statmax-__key__" value="MAX">MAX</option>
         <option id="statfirst-__key__" value="FIRST">FIRST</option><option id="statlast-__key__" value="LAST">LAST</option>
         <option id="statsum-__key__" value="SUM">SUM</option><option id="statavg-__key__" value="AVG">AVG</option>
         <option id="statmed-__key__" value="MED">MED</option><option id="statall-__key__" value="ALL">ALL</option>
       </select><br>
     </td></tr>

     <tr><td></td><td style="text-align: right;"><button onclick="removeTimer('${projectName}', '__key__')">Remove</button></td></tr>                 
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

  showPopup(jResp.Answer);
}

function saveTimers(projectName) {
    changes.timers.forEach(function (timer) {                
        changes.delete(changes.timers, timer);        
        timerJSON = JSON.stringify( {
           "Name"                 : timer,
           "Description"          : document.getElementById("desct-"+timer).value,
           //...
        });
        alert(timerJSON);
       //askServer(showAnswer, projectName, indicator, 
       //   `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'indicator', 'Indicator':${indJSON}}` );
   });
}


// ************************************* INDICATOR ***************************************** //

function getIndicatorHTML(projectName, key, desc) {
  var timHTML = `
     <a name="indicatorElt-__key__"></a>
     <div id="indicatordiv-__key__">
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namei-__key__">Name:</label></td>
         <td><input style="width:100%;" type="text" id="namei-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="desci-__key__">Description:</label></td>
         <td><input style="width:100%;" type="text" id="desci-__key__" onchange="contentChanged(changes.indicators, '__key__')" value="${desc}">
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
             <div class="CodeMirror" id="indcode-__key__"></div>
     </td></tr>     
     <tr><td></td><td style="text-align: right;"><button onclick="removeIndicator('${projectName}', '__key__')">Remove</button></td></tr>                 
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
  var newDiv = addIndicatorOnForm(projectName, indicatorName, "", atob(jResp.Answer));
  newDiv.scrollIntoView({ behavior: 'smooth' });
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
  showPopup(jResp.Answer);
}

function saveIndicators(projectName) {
    changes.indicators.forEach(function (indicator) {                
        changes.delete(changes.indicators, indicator);

        indJSON = JSON.stringify( {
           "Name"        : indicator,
           "Description" : document.getElementById("desci-"+indicator).value,
           "Type"        : document.getElementById("itype-"+indicator).value,
           "Code"        : btoa(editors.get("indcode-"+indicator).getValue())
        });
       askServer(showAnswer, projectName, indicator, 
          `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'indicator', 'Indicator':${indJSON}}` );
   });
}



function getCounterHTML(projectName, key, desc) {
  var cntHTML = `
     <a name="counterElt-__key__"></a>  
     <div id="counterdiv-__key__">
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namec-__key__">Name:</label></td>
         <td><input style="width:100%;" type="text" id="namec-__key__" readonly value="${key}">
     </td></tr>
     <tr><td class="gentd"><label for="descc-__key__">Description:</label></td>
         <td><input style="width:100%;" type="text" id="descc-__key__" onchange="contentChanged(changes.counters, '__key__')" value="${desc}">
     </td></tr>
     <tr><td></td><td style="text-align: right;"><button onclick="removeCounter('${projectName}', '__key__')">Remove</button></td></tr>                 
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
  showPopup(jResp.Answer);
}

function saveCounters(projectName) {
    changes.counters.forEach(function (counter) {                
      changes.delete(changes.counters, counter);
        indJSON = JSON.stringify( {
           "Name"        : counter,
           "Description" : document.getElementById("descc-"+counter).value,
           "Type"        : "counter"
        });
       askServer(showAnswer, projectName, counter, 
          `alter {'Action':'SaveIndicator', 'ProjectName':'${projectName}', 'IndicatorType':'counter', 'Indicator':${indJSON}}` );
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

