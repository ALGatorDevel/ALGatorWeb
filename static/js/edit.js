function getValue(dict, key, defValue) {
  try {
    if (dict[key]) return dict[key]; else return defValue;
  } catch (e) {return defValue;}
}
function defined(value) {
  return (typeof value !== 'undefined' && value !== null);
}

function scrollIntoView(id) {
  var elt = document.getElementById(id);
  if (elt) elt.scrollIntoView({ behavior: "smooth"});
}

class ComputerFamilies {
  constructor(value) {
    this.setProps(value);
  }
  setProps(value) {
    this.families = value;
  }
}

class GeneralData {
  constructor(projectName, eid, shortTitle, projDesc, author, date, projectJARs, lastModified, execFamily, tags) {
    this.author = "algator";     // default (unknown) author
    this.date   = "00/00/0000";  // default (unknown) date    
    this.setProps(projectName, eid, shortTitle, projDesc, author, date, projectJARs, lastModified, execFamily, tags);
  }
  setProps(projectName, eid, shortTitle, projDesc, author, date, projectJARs, lastModified, execFamily, tags) {
    this.name       = projectName; 
    if (defined(eid)        )  this.eid          = eid; 
    if (defined(shortTitle) )  this.shortTitle   = shortTitle;
    if (defined(projDesc)   )  this.projDesc     = projDesc;
    if (defined(author)     )  this.author       = author;
    if (defined(date       ))  this.date         = date;
    if (defined(projectJARs))  this.projectJARs  = projectJARs;
    if (defined(lastModified)) this.lastModified = lastModified;
    if (defined(execFamily))   this.execFamily   = execFamily;
    if (defined(tags))         this.tags         = tags;
  }
}
class Parameter {
  constructor(parameterName, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType) {
    this.setProps(parameterName, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType);
  }
  setProps(parameterName, isInput, desc, defValue, metaMin, metaMax, metaStep, metaValues, vType) {
    this.name        = parameterName; 
    if (defined(isInput)   ) this.isInput     = isInput;
    if (defined(desc)      ) this.desc        = desc;
    if (defined(defValue)  ) this.defValue    = defValue;
    if (defined(metaMin)   ) this.metaMin     = metaMin;
    if (defined(metaMax)   ) this.metaMax     = metaMax;
    if (defined(metaStep)  ) this.metaStep    = metaStep;
    if (defined(metaValues)) this.metaValues  = metaValues;
    if (defined(vType)     ) this.vType       = vType;
  }
}
class Generator {
  constructor(generatorName, description, parameters, sourcecode) {
    this.setProps(generatorName, description, parameters, sourcecode);
  }
  setProps(generatorName, description, parameters, sourcecode) {
    this.name        = generatorName; 
    if (defined(description)) this.description = description;
    if (defined(parameters) ) this.parameters  = parameters;
    if (defined(sourcecode) ) this.sourcecode  = sourcecode;
  }
}
class Testset {
  constructor(testsetName, author, date, testsetEID, description, shortname, n, repeat, limit, fileContent, filesList, lastModified) {
    this.author = "algator";     // default (unknown) author
    this.date   = "00/00/0000";  // default (unknown) date
    this.setProps(testsetName, author, date, testsetEID, description, shortname, n, repeat, limit, fileContent, filesList, lastModified);
  }
  setProps(testsetName, author, date, testsetEID, description, shortname, n, repeat, limit, fileContent, filesList, lastModified) {
    this.name        = testsetName; 
    if (defined(testsetEID) )  this.eid          = testsetEID;
    if (defined(author)     )  this.author       = author;
    if (defined(date)       )  this.date         = date;
    if (defined(description))  this.description  = description;
    if (defined(shortname)  )  this.shortname    = shortname;
    if (defined(n)          )  this.n            = n;
    if (defined(repeat)     )  this.repeat       = repeat;
    if (defined(limit)      )  this.limit        = limit;
    if (defined(fileContent))  this.fileContent  = fileContent;
    if (defined(filesList))    this.filesList    = filesList;    
    if (defined(lastModified)) this.lastModified = lastModified;
  }
}
class Timer {
  constructor(timerName, desc, timerID, timerSTAT) {
    this.setProps(timerName, desc, timerID, timerSTAT);
  }
  setProps(timerName, desc, timerID, timerSTAT) {
    this.name      = timerName; 
    if (defined(desc)     ) this.desc      = desc;
    if (defined(timerID)  ) this.timerID   = timerID;
    if (defined(timerSTAT)) this.timerSTAT = timerSTAT;
  }
}
class Indicator {
  constructor(indicatorName, desc, type, code) {
    this.setProps(indicatorName, desc, type, code);
  }
  setProps(indicatorName, desc, type, code) {
    this.name = indicatorName; 
    if (defined(desc)) this.desc = desc;
    if (defined(type)) this.type = type;
    if (defined(code)) this.code = code;
  }
}
class Counter {
  constructor(counterName, desc) {
    this.setProps(counterName, desc);
  }
  setProps(counterName, desc) {
    this.name = counterName; 
    if (defined(desc)) this.desc = desc;
  }
}
class Algorithm {
  constructor(name, eid, description, shortname, date, author, language, fileContent, htmlContent, lastModified, color) {
    this.author = "algator";     // default (unknown) author
    this.date   = "00/00/0000";  // default (unknown) date    
    this.setProps(name, eid, description, shortname, date, author, language, fileContent, htmlContent, lastModified, color)
  }
  setProps(name, eid, description, shortname, date, author, language, fileContent, htmlContent, lastModified, color) {
    this.name                                    = name;
    if (defined(eid)        )  this.eid          = eid;
    if (defined(author)     )  this.author       = author;
    if (defined(date)       )  this.date         = date;
    if (defined(shortname)  )  this.shortname    = shortname;
    if (defined(description))  this.description  = description;
    if (defined(language)   )  this.language     = language;
    if (defined(fileContent))  this.fileContent  = fileContent;
    if (defined(htmlContent))  this.htmlContent  = htmlContent;    
    if (defined(lastModified)) this.lastModified = lastModified;
            
    this.color        = defined(color) ? color : -1;
  }
}

class PageProject extends PageData {
  services = {
    
    'get_computer_familes': {
      'endpoint': '/projects/get_computer_familes',
      'method'  : 'GET',
      'params'  : [],
      'comment' : 'Get list of registered computer families.'
    },

    'get_project_html_description': {
      'endpoint': '/projects/get_project_html_description',
      'method'  : 'GET',
      'params'  : ["ProjectName"],
      'comment' : ''
    },
    
    'get_project_general_data': {
      'endpoint': '/projects/get_project_general_data',
      'method'  : 'GET',
      'params'  : ["ProjectName"],
      'comment' : ''
    },

    'get_project_properties': {
      'endpoint': '/projects/get_project_properties',
      'method'  : 'GET',
      'params'  : ["ProjectName"],
      'comment' : ''
    },    

    'get_testset': { // get one testset
      'endpoint': '/projects/get_testset',
      'method'  : 'GET',
      'params'  : ["ProjectName", "EntityName"],
      'comment' : ''
    }, 

    'get_testsets': { // get all testsets
      'endpoint': '/projects/get_testsets',
      'method'  : 'GET',
      'params'  : ["ProjectName"],
      'comment' : ''
    }, 

    'get_testset_files': {
      'endpoint': '/projects/get_testset_files',
      'method'  : 'GET',
      'params'  : ["ProjectName", "TestsetName"],
      'comment' : ''
    },

    'get_testsets_common_files': {
      'endpoint': '/projects/get_testsets_common_files',
      'method'  : 'GET',
      'params'  : ["ProjectName"],
      'comment' : ''
    },

    'get_testset_file': {
      'endpoint': '/projects/get_testset_file',
      'method'  : 'GET',
      'params'  : ["ProjectName", "TestsetName", "FileName"],
      'comment' : ''
    },

    'get_algorithm': { // get one algorithm
      'endpoint': '/projects/get_algorithm',
      'method'  : 'GET',
      'params'  : ["ProjectName", "EntityName"],
      'comment' : ''
    }, 
    
    'get_algorithms': { // get all algorithms
      'endpoint': '/projects/get_algorithms',
      'method'  : 'GET',
      'params'  : ["ProjectName"],
      'comment' : ''
    }

  };

  constructor() {
      super();

      this.generalData   = new GeneralData();
      this.srcFiles      = new Map();
      this.parameters    = new Map();
      this.timers        = new Map();
      this.indicators    = new Map();
      this.counters      = new Map();
      this.generators    = new Map();
      this.testsets      = new Map();
      this.tsCommonFiles = {};
      this.algorithms    = new Map(); 
      this.colors        = [];

      this.project_html_descriptions = {}   // html content for "Problem overview" page
  }

  
  setVar(type, value, params) {
    switch (type) {
      case "get_computer_familes":                  this.storeComputerFamilies(value);      break;         
      case "get_project_html_description":          this.project_html_descriptions = value; break;  
      case "get_project_general_data":              this.storeGeneralData(value);           break; 
      case "get_project_properties":                this.storeProjectProperties(value);     break 
      case "get_testset":                           this.storeTestset (value, params);      break;     
      case "get_testsets":                          this.storeTestsets(value);              break;     
      case "get_testsets_common_files":             this.storeTestsetsCommonFiles(value);   break;             
      case "get_algorithm":                         this.storeAlgorithm (value, params);    break;             
      case "get_algorithms":                        this.storeAlgorithms(value);            break;             
    }
  }

  storeComputerFamilies(value) {
    pageProject.computerFamilies = new ComputerFamilies(value);
  }


  storeGeneralData(value) {
    setGeneralData(projectName, value.eid, value.ShortTitle, value.Description, value.Author, value.Date, value.ProjectJARs, value.LastModified, value.EMExecFamily, value.Tags);
  }

  storeProjectProperties(value) {
    setFileContent("input",  value.Sources.Input);  
    setFileContent("output", value.Sources.Output); 
    setFileContent("tools",  value.Sources.Tools);  

    value.Props.Algorithms.forEach(alg => this.algorithms.set(alg, null));
    value.Props.TestSets  .forEach(tst => this.testsets  .set(tst, null));

    // tabela barv istoležnega (v množici this.algorithms) algoritma
    this.colors = value.Props.AlgorithmColors;

    Object.keys(value.Props.Parameters).sort((k1,k2)=>{ // first list input then other parameters
        let o1 = 0+getValue(value.Props.Parameters[k1], "IsInputParameter", false);
        let o2 = 0+getValue(value.Props.Parameters[k2], "IsInputParameter", false);
        return o2-o1}).forEach(k=>{
      let par = value.Props.Parameters[k];
      let meta = getValue(par, "Meta", {});
      this.addParameter(k, getValue(par, "IsInputParameter", false), getValue(par, "Description", ""), getValue(meta, "Default",""),
          getValue(meta, "Min", 0), getValue(meta, "Max", 0), getValue(meta, "Step", 0), 
          JSON.stringify(getValue(meta, "Values", [])), getValue(par, "Type", "int")
      );
    });

    Object.keys(value.Props.Generators).sort().forEach(k=>{
      try {
        let gen = value.Props.Generators[k];
        let genPar = JSON.stringify(getValue(gen, "GeneratingParameters", []));
        let source = value.Sources.Generators[k];
        this.addGenerator(k,getValue(gen, "Description", ""), genPar, source);
      } catch(e){}
    });


    Object.keys(value.Props["EM indicators"]).forEach(k => {
      try {
        let ind = value.Props["EM indicators"][k];
        let typ = getValue(ind, "Type", "int");
        if (typ == "timer") {
          let meta = getValue(ind, "Meta", {});
          this.addTimer(k, getValue(ind, "Description", ""), getValue(meta, "ID", 0), getValue(meta, "STAT", "MIN"));
        } else {
            let source = value.Sources.Indicators[k];
           this.addIndicator(k, getValue(ind, "Description", ""), typ, source);
        }
      } catch(e){}
    });

    Object.keys(value.Props["CNT indicators"]).forEach(k => {
      try {
        let cnt = value.Props["CNT indicators"][k];
        this.addCounter(k, getValue(cnt, "Description", ""));              
      } catch (e) {}
    });
  }

  storeTestset(value, params) {
    try {
      let ts = value.Properties;
      this.addTestset(params.EntityName, ts.Author, ts.Date, ts.eid, ts.Description, ts.ShortName, ts.N, ts.TestRepeat, ts.TimeLimit, value.FileContent, value.FilesList, ts.LastModified);
    } catch (e) {}
  }
  storeTestsets(value) {
    try {
      Object.keys(value).forEach(t => {
        this.storeTestset(value[t], {'EntityName': t})
      })
    } catch (e) {}
  }

  storeTestsetsCommonFiles(value) {
    try {
      Object.keys(value).forEach(tf => {
        this.tsCommonFiles[tf]=value[tf];
      })
    } catch (e) {}
  }
  storeAlgorithm(value, params) {
    try {
      let al = value.Properties;
      this.addAlgorithm(params.EntityName, al.eid, al.Description, al.ShortName, al.Date, al.Author, al.Language, value.FileContent, value.HtmlFileContent, al.LastModified, al.Color);
    } catch (e) {}
  }
  storeAlgorithms(value) {
    try {
      Object.keys(value).forEach(a => {
        this.storeAlgorithm(value[a], {'EntityName': a}); 
      });
    } catch (e) {}
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
  addTestset(testsetName, author, date, testsetEID, description, shortname, n, repeat, limit, fileContent, filesList, lastModified) {
    var testset = new Testset(testsetName, author, date, testsetEID, description, shortname, n, repeat, limit, fileContent, filesList, lastModified);
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
  addAlgorithm(algorithmName, algorithmEID, description, shortname, date, author, language, fileContent, htmlContent, lastModified, color) {
    var algorithm = new Algorithm(algorithmName, algorithmEID, description, shortname, date, author, language, fileContent, htmlContent, lastModified, color);
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

    clearAll() {
      this.parameters .clear();
      this.generators .clear();
      this.timers     .clear();    
      this.indicators .clear();      
      this.counters   .clear();
      this.other      .clear(); 
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
      var values = JSON.parse(valuesString.replaceAll("'", "\""));
      setValueOfMultiSelectFromArray(multiSelectId, values);
  } catch (error) {}
}
function setValueOfMultiSelectFromArray(multiSelectId, valuesArray) {
  if (valuesArray) {
    var multiSelectElt = document.getElementById(multiSelectId);
    valuesArray.forEach(function(val){
      addOption(multiSelectElt, val, true);
    });  
  }
}

function initCodeMirrorEditor(cmDiv, hiddenDiv, content, entity=null, key, theme="eclipse", mode="text/x-java", height="", readOnly=false) {
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
 
  if (content) editor.getDoc().setValue(content);
  editor.on("change", function() {
    var code = editor.getValue();

    var hiddenElt = document.getElementById(hiddenDiv);
    hiddenElt.value = code;
    hiddenElt.dispatchEvent(new Event("change", { bubbles: true }));

    if (entity) contentChanged(entity, key);
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
        idmetaControls.style.display = "contents";
    } else if (typeSelect.value === "enum") {
        emetaControls.style.display = "contents";
    }
  }   

function checkName(name, dict, entityName) {
  if (!name) {
    showPopup(`Enter the name of the ${entityName} to be added.`);
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



function removeElementFromDOM(prefix, key) {
  var element = document.getElementById(`${prefix}${key}`);
  if (element) element.remove();
}


function getFamilySelectElement() {
  let selectElement = document.createElement('select');
  pageProject.computerFamilies.families./*filter(f => f.FamilyID != "F0").*/
    forEach(cf => {addOptionToSelect(selectElement, cf.FamilyID, `${cf.Description} (${cf.FamilyID})`)});
    return selectElement;
}

// ********************************* Implementation (tab switching logic)
const editProjectTabsIDs = ["general", "input", "output", "parameters", "generators", "timers", "indicators", "counters", "tools"];
const editProjectTabs    = ["General", "Input", "Output", "Parameters", "Generators", "Timers", "Indicators", "Counters", "Tools"];

function initImplementationTabs() {
  const tTabs = "editProject";
  addTabPane(tTabs);  
  for(var i=0; i<editProjectTabsIDs.length; i++) 
    addTab(tTabs, editProjectTabsIDs[i], editProjectTabs[i], implementationSelectTab);
  
  wireTabs(tTabs);
  implementationSelectTab(tTabs, "general");
}


function implementationSelectTab(paneID, tabID) {
  editProjectSelectedItem = tabID;
  selectTab(paneID, tabID);

  document.querySelectorAll('.content-div, .submenuitem').forEach(div => {div.style.display = 'none';});
  document.getElementById(tabID+"-list").style.display="block";
  const thisDiv = document.getElementById(tabID+"-div"); thisDiv.style.display="block";
  var allElements = thisDiv.querySelectorAll('[id]');
    allElements.forEach(function(element) {
      if (editors.get(element.id)) editors.get(element.id).refresh();
  });
}


// ************************************* General ***************************************** //
function getGeneralHTML(projectName, shortTitle, projDesc, author, date, projectJARs, execFamily) {
  let upload    = getUploadComponet("projectjars", projectName); 

  var generalHTML = `
    <table style="width:100%; padding: 15px;">
      <tr><td class="gentd"><label for="namegrl">Project Name:</label></td>
          <td><input class="almostW pEdit" disabled type="text" id="namegrl" onchange="contentChanged(changes.other, 'general')" readonly value="${projectName}">
      </td></tr>
      <tr><td class="gentd"><label for="authorgrl">Author Name:</label></td>
          <td><input class="almostW pEdit" disabled type="text" id="authorgrl" onchange="contentChanged(changes.other, 'general')" readonly value="${author}">
      </td></tr>
      <tr><td class="gentd"><label for="dategrl">Creation Date:</label></td>
          <td><span><input class="almostW" disabled type="text" id="dategrl" onchange="contentChanged(changes.other, 'general')" value="${date}">
      </td></tr>
      <tr><td class="gentd" disabled style="vertical-align: top;"><label for="stitgrl">Short title:</label></td>
          <td><span><input class="almostW pEditE" disabled type="text" id="stitgrl" onchange="contentChanged(changes.other, 'general')" value="${shortTitle}">    
      </td></tr>
      <tr><td class="gentd" disabled style="vertical-align: top;"><label for="descgrl">Short Description:</label></td>
          <td><textarea class="descTA almostW pEditE" disabled id="descgrl" onchange="contentChanged(changes.other, 'general')">${projDesc}</textarea>
      </td></tr>
      <tr><td class="gentd" disabled style="vertical-align: top;"><label for="tagsgrl">Tags:</label></td>
          <td><select id="tagsgrl" class="pEditE" multiple disabled style="width:99%" onchange="contentChanged(changes.other, 'general')"></td>
      </td></tr>      
      <tr><td class="gentd" disabled style="vertical-align: top;"><label for="family_select">Computing family:</label>
            ${infoButton('assigned_computers')}
          </td>
          <td><select id="family_select" class="almostW pEditE" disabled onchange="contentChanged(changes.other, 'general')" style="margin-top: 10px"></select>
      </td></tr>      
      <tr><td class="gentd" disabled style="vertical-align: top;"><label for="jarsgrl">Project JARs:</label>
             ${infoButton('project_jars')}
          </td>
          <td><div id="projectjars_${projectName}" class="container-box sEdit almostW" own='${projectName}' disabled style="padding: 0px;">... no JARs are used in this project</div>
             ${upload}
         </td>
      </tr>
      <tr><td colspan="2"><hr style="margin: 15px 0px 15px 0px;"></td></tr>
      <tr id="compile_project_tr" class="editMode pEditNV" w="${projectEID} cw"><td>Compiling</td>
          <td>
            <input type=button value="Compile project" onclick="compileProject()">
          </td>
    </table>    
  `;
  return generalHTML; 
}

function getProjectJARsListItemHTML(filename, disabledRemoving=true) {
  return `
  <li id="jar_${filename}">
    <span class="framed-span"> 
      <span class="clickable-span" onclick="showJARFile('${filename}')">${filename}</span> 
      <i class='fas fa-times icon sEdit' own='${projectName}' ${disabledRemoving ? 'disabled' : ''} onclick='removeProjectJAR(event, "${filename}")'></i>
    </span>
  </li>  
  `;
}


function showProjectJARs(disabledRemoving=true) {
  let projectJARsDiv = document.getElementById("projectjars_" + projectName);
  if (projectJARsDiv) {
    let fileList = "";
    let JARFiles = []; try {
      JARFiles = pageProject.generalData["projectJARs"];
    } catch (e) {}
    JARFiles.forEach(file => {          
      fileList += getProjectJARsListItemHTML(file, disabledRemoving);
    });
    projectJARsDiv.innerHTML = "<ul>"+fileList+"</ul>";
  }
}
function removeProjectJAR(event, filename) {
  let fileDiv = document.getElementById(`jar_${filename}`);
  if (fileDiv) {    
    jarRemovedFiles.push(filename);
    pageProject.generalData["projectJARs"] = pageProject.generalData["projectJARs"].filter(item => item !== filename);
    fileDiv.remove();

    contentChanged(changes.other, "general");
  }
}
async function fixJARsOnCancel() {
  const promises = jarAddedFiles.map((file, index) =>
    new Promise((resolve) => {
      askServer((pName, filename, response) => {
        if (response.Status == 0) {
          pageProject.generalData["projectJARs"] = pageProject.generalData["projectJARs"].filter(item => item !== filename);
        }
        resolve(); // Resolve this promise after askServer completes
      }, projectName, file,
         `alter {'Action':'RemoveJARFile', 'ProjectName':'${projectName}', 'FileName':'${file}'}` // Use 'file' from the array
      );
    })
  );
  await Promise.all(promises);

  jarRemovedFiles.forEach((key) => {
    if (!(key in jarAddedFiles)) {
      pageProject.generalData["projectJARs"].push(key);
    }
  });
}
async function removeRemovedJARFiles() {
  const promises = jarRemovedFiles.map((key) =>
    new Promise((resolve) => {
      askServer(() => {resolve();}, projectName, key, 
        `alter {'Action':'RemoveJARFile', 'ProjectName':'${projectName}', 'FileName':'${key}'}`
      );         
    })
  );
  await Promise.all(promises);
}

function showJARFile(fileName) {
  askServer((projectName, fileName, jResp) => {
    if (jResp.Status == 0 ) {
      let content = atob(jResp.Answer);
      showModalDisplay(fileName, content, 1);
    } else {
      showPopup(jResp.Answer);
    }
  }, projectName, fileName, 
    `getData {'Type':'JarFileContent', 'ProjectName':'${projectName}', 'FileName':'${fileName}'}`
  );         
}


function setGeneralData(projectName, eid, shortTitle, projDesc, author, date, projectJARs, lastModified, execFamily, tags) {
  pageProject.generalData = new GeneralData(projectName, eid, shortTitle, projDesc, author, date, projectJARs, lastModified, execFamily, tags);
}
function showGeneralData() {
  var gd = pageProject.generalData;
  document.getElementById("general-div").innerHTML = getGeneralHTML(
    gd.name, gd.shortTitle, gd.projDesc, gd.author, gd.date, gd.projectJARs, gd.execFamily
  );

  setValueOfMultiSelectFromArray("tagsgrl", gd.tags);
  $("#tagsgrl").select2({placeholder: "",  tags: true, tokenSeparators: [','], createTag: function (params) {
    // this function prevents empty and too long tags
    let term = params.term.trim();   
    if (term.length === 0) return null;
    if (term.includes(" ")) {
        showPopup("Tag cannot contain spaces!");
        return null; 
    } 
    if (term.length > 20) {
        showPopup("Tag cannot be longer than 20 characters!");
        return null; 
    }
    return {id: term, text: term};
  }});  

  const selectElement = document.getElementById(`family_select`);
  selectElement.innerHTML = "";
  addOptionToSelect(selectElement, '', `not set (ALGator will use the most appropriate family)`);
  pageProject.computerFamilies.families./*filter(f => f.FamilyID != "F0").*/
    forEach(cf => {addOptionToSelect(selectElement, cf.FamilyID, `${cf.Description} (${cf.FamilyID})`)});
  selectElement.value = gd.execFamily;


  registerUploadPanel("projectjars", new Map([["type", "jar"],[]]), file=>{
      jarAddedFiles.push(file.name);
      pageProject.generalData.projectJARs.push(file.name);
      showProjectJARs(false);
      contentChanged(changes.other, "general");
  });
  showProjectJARs(true);
}

function saveGeneral(projectName) {
  genJSON =  {
    "ShortTitle"    : document.getElementById("stitgrl").value,    
    "Description"   : document.getElementById("descgrl").value,    
    "Author"        : document.getElementById("authorgrl").value,
    "Date"          : document.getElementById("dategrl").value,
    "ProjectJARs"   : pageProject.generalData["projectJARs"],
    "EMExecFamily"  : document.getElementById("family_select").value,
    "Tags"          : getValueOfMultiselectAsJSON("tagsgrl"),
  };
  genJSONS = JSON.stringify(genJSON);

  var gen = pageProject.generalData;
  if (gen) gen.setProps(projectName, undefined, genJSON.Description, genJSON.Author, undefined, genJSON.ProjectJARs, Math.floor(Date.now() / 1000), genJSON.EMExecFamily, genJSON.Tags);

  askServer(saveGeneralPhase2, projectName, "general", 
     `alter {'Action':'SaveProjectGeneral', 'ProjectName':'${projectName}', 'Data':${genJSONS}}`);
}

function saveGeneralPhase2(projectName, key, response) {
  changes.other.delete("general");
}


function compileProject() {
  runTaskAndShowResults(`addTask {"Project":"${projectName}", "TaskType":"CompileProject"}`, "Compile project");
}

function runTestset() {
  runTaskAndShowResults('addTask {"Project":"BasicSort", "Family":"F0", "Algorithm":"QuickSort", "Testset":"TestSet3", "MType":"em", "Priority":5}', "Execute");
}

// ****************************** Files (input, output, tools)  ***************************************** //

function setFileContent(key, content) {
  pageProject.srcFiles.set(key, content);
}
function showFileContent(key) {
  var editor = editors.get(key + "-code-editor");
  if (editor) {
    editor.getDoc().setValue(pageProject.srcFiles.get(key)); 
    changes.delete(changes.other, key);   
  }
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



//////////////// common logic for MultiEntities (Parameters, Generators, Timers, Indicators, Counters) //////////////////

const meNames   = new Map([["parameters", "parameter"],                ["generators", "generator"],                 ["timers", "timer"],                ["indicators", "indicator"],                ["counters", "counter"]]);
const meList    = new Map([["parameters", pageProject.parameters],     ["generators", pageProject.generators],      ["timers", pageProject.timers],     ["indicators", pageProject.indicators],     ["counters", pageProject.counters]]);
const meChanges = new Map([["parameters", changes.parameters],         ["generators", changes.generators],          ["timers", changes.timers],         ["indicators", changes.indicators],         ["counters", changes.counters]]);
const meContent = new Map([["parameters", meParameterContent],         ["generators", meGeneratorContent],          ["timers", meTimerContent],         ["indicators", meIndicatorContent],         ["counters", meCounterContent]]);
const meAdd     = new Map([["parameters", meAddParameter],             ["generators", meAddGenerator],              ["timers", meAddTimer],             ["indicators", meAddIndicator],             ["counters", meAddCounter]]);
const meRemove  = new Map([["parameters", meRmParameter],              ["generators", meRmGenerator],               ["timers", meRmTimer],              ["indicators", meRmIndicator],              ["counters", meRmCounter]]);
const meAsk     = new Map([["parameters", askForNewMEName],            ["generators", askForGeneratorParameters],   ["timers", askForNewMEName],        ["indicators", askForNewMEName],            ["counters", askForNewMEName]]);
const rmMEntity = new Map([["parameters", pageProject.removeParameter],["generators", pageProject.removeGenerator], ["timers", pageProject.removeTimer],["indicators", pageProject.removeIndicator],["counters", pageProject.removeCounter]]);


function askForNewMEName(x, callback, sectId) {
  openDialog('Enter the name of the '+ x +' to be created:', preventNonAlphaNumKeys).then((result) => {
    if (result != null) {
      callback(result,sectId);
    } 
  });
}
function showCorXDiv(x, hasEntities) {
  document.getElementById(`cont_${x}-div`)    .style.display =  hasEntities ? ""     : "none";
  document.getElementById(`no_${x}-div`)      .style.display =  hasEntities ? "none" : "";
  document.getElementById(`loading_${x}-div`) .style.display =  "none";
}



let mEntityShown = new Set();
let currentMEntity = new Map();
function showMEntities(sectId) {
  const mEntityList = meList.get(sectId);
  if (!mEntityShown.has(sectId)) {

    addTabPane(sectId);

    const newButton = addTab(sectId, "new_"+sectId, "＋ New ", ()=>{meAsk.get(sectId)(meNames.get(sectId), newXEntityByName, sectId)}, 1);
    newButton.classList.add('editMode');    newButton.classList.add('pEditNV');
    newButton.setAttribute('w', `${projectEID} cw`); 

    mEntityList.forEach(function(value, key, map) {
      addTab(sectId, key, key, showMEntity);
    });

    wireTabs(sectId);
    enableEditMode(isEditMode);
    updateMarkers(sectId);

    mEntityShown.add(sectId);
  }

  if (mEntityList.size == 0) currentMEntity.set(sectId, "");
  let hasMEntity = mEntityList.size > 0;
  if (!currentMEntity.get(sectId) && hasMEntity) currentMEntity.set(sectId, mEntityList.keys().next().value);
  if (currentMEntity.get(sectId))
    showMEntity(sectId, currentMEntity.get(sectId));

  showCorXDiv(sectId, hasMEntity);
  recolorParameterTabs();
}

function showMEntity(sectId, pID) {
  if (meChanges.get(sectId).size > 0)
    showYesNoDialog(`Do you want to save changes in ${meNames.get(sectId)} '${currentMEntity.get(sectID)}'?`, showMEntityPhase2, sectId, pID, null, null, null, true);
  else showMEntityPhase2(3,sectId, pID);
}
function showMEntityPhase2(answer, sectId, pID) {
  switch (answer) {
    case 0:editProjectSectionSave();break;
    case 1:editProjectSectionCancel(); break;
    case 2: return;
  }

  currentMEntity.set(sectId, pID);
  selectTab(sectId, pID);

  const mentity = meList.get(sectId).get(pID);  if (!mentity) return; 

  var parDiv  = document.getElementById(`cont_${sectId}-div`);
  meContent.get(sectId)(pID, parDiv, mentity);

  enableProjectEditMode(projectEditMode, parDiv);
  enableEditMode       (isEditMode, parDiv);

  if (answer < 2) // we came to showXPhase2 from edit mode
    editSection();
}

function newXEntityByName(meName, sectId, params) {
    if (!checkName(meName, meList.get(sectId), meNames.get(sectId))) return;    

    editSection();

    let addStst = meAdd.get(sectId)(meName, params);
    if (addStst == -1) return; // -1 denotes error in adding stage

    addTab(sectId, meName, meName, showMEntity);
    showMEntity(sectId, meName);

    showCorXDiv(sectId, true);

    // to hide "x" button
    setTimeout(() => {
      enableProjectEditMode(projectEditMode, document.getElementById(meNames.get(sectId) + "div-"+meName));
    }, 300);
}


function removeMEntity(sectId, projectName, meName) {
  showYesNoDialog(`Do you want to remove '${meName}'?`, removeMEntityPhase1, projectName, meName, sectId);
}
function removeMEntityPhase1(answer, projectName, meName, sectId) {
  if (answer == 0) 
    meRemove.get(sectId)(sectId, meName);
}

function removeMEntityPhase2(projectName, meName, response, sectId) {
  rmMEntity.get(sectId).bind(pageProject)(meName);      
  let nextTabID = removeTab(sectId, meName);

  document.getElementById(meNames.get(sectId) + "div-"+meName).innerHTML = "";

  if (meList.get(sectId).size > 0)
    showMEntity(sectId, nextTabID);
  else
    showCorXDiv(sectId, false);
}



////////////////////////////////


// ************************************* PARAMETERS ***************************************** //

function getParameterHTML(projectName, key, valueDescription, minv, maxv, stepv, defv, evalue, isInput) {
  var paramHTML = `
    <div id="parameterdiv-__key__">
    <span id="parameterElt-__key__"></span>
    <table style="width:100%; padding: 15px;">
    <tr><td class="gentd">
           <label for="namep-__key__">Name: </label>            
        </td>
        <td><input class="almostW" disabled type="text" id="namep-__key__" onchange="contentChanged(changes.parameters, '__key__')" readonly value="${key}" style="margin-bottom:2px"></td>
        <td style="align-content: start;"><i id="remove_parameter_${key}" class="fas fa-times icon editMode pEditNV" w="${projectEID} cw" onclick="removeMEntity('parameters', '${projectName}', '__key__')" style="display: inline;"></i></td>
    </tr>
    <tr><td class="gentd"><label for="descp-__key__">Description:</label></td>
        <td><textarea class="descTA almostW pEditE" disabled type="text" id="descp-__key__" onchange="contentChanged(changes.parameters, '__key__')" style="margin-bottom:-10px">${valueDescription ? valueDescription : ""}</textarea>
    </td></tr>
    <tr><td class="gentd"><label for="iinputp-__key__">Is input parameter?</label></td>
        <td><input class="pEditE" disabled ${isInput ? "checked" : ""} type="checkbox" id="iinputp-__key__" onchange="contentChanged(changes.parameters, '__key__')">
    </td></tr>
    <hr>
    <tr><td class="gentd"><label for="typep-__key__">Parameter type:</label></td>
      <td><select id="typep-__key__" class="pEditE" disabled name="typep-__key__" onchange="showAdditionalParametersControls('__key__'); contentChanged(changes.parameters, '__key__')" style="margin-top:12px; width:110px">
        <option id="opstr-__key__" value="string">string</option><option id="opint-__key__" value="int">int</option><option id="opdbl-__key__" value="double">double</option><option id="openu-__key__" value="enum">enum</option>
      </select><br>
    </td></tr>
    <tr id="idmeta-controls-p-__key__" class="hidden-controls" style="display: contents;"><td class="gentd"></td>
      <td><table>
        <tr><td class=metatd style="width: 110px"><label for="minp-__key__">Min:</label>    </td><td><input class="pEditE" disabled style="width: 400px;" type="text" id="minp-__key__"  name="min-__key__"  value="${minv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd style="width: 110px"><label for="maxp-__key__">Max:</label>    </td><td><input class="pEditE" disabled style="width: 400px;" type="text" id="maxp-__key__"  name="max-__key__"  value="${maxv}"  onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        <tr><td class=metatd style="width: 110px"><label for="stepp-__key__">Step:</label>  </td><td><input class="pEditE" disabled style="width: 400px;" type="text" id="stepp-__key__" name="step-__key__" value="${stepv}" onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
      </table>
    </td></tr>
    <tr id="emeta-controls-p-__key__" class="hidden-controls" style="display: contents;"><td class="gentd""></td>
      <td>
        <table>
        <tr><td class=metatd style="width: 110px"><label for="valuesp-__key__">Values:</label></td>
            <td><select class="multiselect pEditE" disabled id="valuesms-__key__" multiple style="width: 400px; top: 0px;" array='${evalue}'' onchange="contentChanged(changes.parameters, '__key__')"></select>  
        </td></tr>
        </table>
    </td></tr>

    <tr><td class="gentd""></td>
      <td>
        <table>
        <tr><td class=metatd style="width: 110px"><label for="edefaultp-__key__">Default value:</label></td><td><input class="pEditE" disabled type="text" style="width: 400px; margin-top: 0px;" id="edefaultp-__key__" name="edefaultp" value="${defv ? defv : ""}" onchange="contentChanged(changes.parameters, '__key__')"></td></tr>
        </table>
    </td></tr>

    </table>
    <hr>
    </div>
  `;
  return paramHTML.replace(/__key__/g, key); 
}


// change color of "IsInput" parameters (to "firebrick"); other parameters have "default" color
function recolorParameterTabs() {
  pageProject.parameters.forEach(par => {
    recolorTab("parameters", par.name, par.isInput ? "firebrick" : "");
  });
}

function meParameterContent(pID, parDiv, mentity) {
  parDiv.innerHTML = getParameterHTML(projectName, pID, mentity.desc, mentity.metaMin, mentity.metaMax, mentity.metaStep, mentity.defValue, mentity.metaValues, mentity.isInput);

  selectOptionByValue("typep-"+pID, mentity.vType);
  showAdditionalParametersControls(pID);
  setTimeout(() => {  applySelect2Options($("#valuesms-"+pID)); }, 50); 
 
}

function meAddParameter(parName) {
  askServer(null, projectName, parName, 
      `alter {'Action':'NewParameter', 'ProjectName':'${projectName}', 'ParameterName':'${parName}', 'IsInput':false}` );

  pageProject.addParameter(parName, false, "", "", 0, 0, 0, "", "");
}

function meRmParameter(sectId, parName) {
    askServer(removeMEntityPhase2, projectName, parName, 
      `alter {'Action':'RemoveParameter', 'ProjectName':'${projectName}', 'ParameterName':'${parName}'}`, null, sectId);    
}

function saveParameters(projectName) {
  changes.parameters.forEach(function (parameter) {                
    var typep      = document.getElementById("typep-"+parameter).value;  
    var defValue   = document.getElementById("edefaultp-"+parameter).value;
    var desc       = document.getElementById("descp-"+parameter).value;
    var metaMin    = document.getElementById("minp-"+parameter).value; 
    var metaMax    = document.getElementById("maxp-"+parameter).value;
    var metaStep   = document.getElementById("stepp-"+parameter).value;
    var metaValues = getValueOfMultiselectAsJSON("valuesms-"+parameter);
    var isInputPar = document.getElementById("iinputp-"+parameter).checked;
    var parameterJSON  = {
      "Name"           : parameter,
      "Description"    : desc,
      "Type"           : typep,
      "IsInput"        : isInputPar,
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
    if (typeof metaValues == 'object') metaValues = JSON.stringify(metaValues); // to store metaValues of parameter, i need string (and not, for example, array)
    if (par) par.setProps(parameter, isInputPar, parameterJSON.Description, defValue, metaMin, metaMax, metaStep, metaValues, parameterJSON.Type);

    askServer(saveParametersPhase2, projectName, parameter, 
       `alter {'Action':'SaveParameter', 'ProjectName':'${projectName}', 'ParameterName':'${parameter}', 'Parameter':${paramJSONS}}` );
    
  });
  recolorParameterTabs();
}
function saveParametersPhase2(projectName, parameter, response) {
  changes.delete(changes.parameters, parameter);    
}



// ************************************* GENERATORS ***************************************** //
function getGeneratorHTML(projectName, key, desc,genpar) {
  var gLinePrefix=`${key}::`;
  var genHTML = `
     <div id="generatordiv-__key__">
     <span id="generatorElt-__key__"></span>  
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="typeg-__key__">Name:</label></td>
         <td><input class="almostW" type="text" disabled id="typeg-__key__" readonly value="${key}">
         <td style="align-content: start;"><i id="remove_generator_${key}" class="fas fa-times icon editMode pEditNV" w="${projectEID} cw" onclick="removeMEntity('generators', '${projectName}', '__key__')" style="display: inline;"></i></td>
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
     <tr id="run_generator_tr" class="editMode pEditNV" w="${projectEID} cw"><td style="vertical-align:top" class="gentd"></td>
       <td>              
         <span class="editMode pEditNV" w="${projectEID} cw" style="float: right; margin-right: 11px;"> 
           Generating line: "<input id='generatingLine_${key}' type=text style='border: none;border-bottom: 1px solid gray;background: white;' value='${gLinePrefix}'>"
           <input type=button value="Generate test case"   onclick="generateTestcase('${key}')" >
         </span>
     </td></tr>
     </table>
     <hr>
     </div>
  `;
  return genHTML.replace(/__key__/g, key); 
}

function generateTestcase(gName) {
  let generatingLine = document.getElementById(`generatingLine_${gName}`).value;
  runTaskAndShowResults(`addTask {"Project":"${projectName}", "Msg":"${generatingLine}", "TaskType":"GenerateTestCase"}`, `Generate testcase with '${generatingLine}'`);
}

function findNextGeneratorName() {
  const used = new Set(Array.from(pageProject.generators.keys()).map(k => Number(k.replace("Type", ""))).filter(Number.isInteger));
  let i = 0; while (used.has(i)) i++;
  return `Type${i}`;
}

function setNewGenParamValue(selectID="newgenparam") {
  var multiSelectElt = document.getElementById(selectID);
  pageProject.parameters.forEach(function(param) {
    addOption(multiSelectElt, param.name, false);
  })
}

// do the formating of the "generating parameters" select box
function formatParametersSelect() {
  setNewGenParamValue("new_gen_parameters");
  $(`#new_gen_parameters`).select2({placeholder: "Generating parameters...", allowClear: true, tags:true});
}
function getValueFromParameterSelect(selectElement) {
  // parameter selectElement is here not used, because getValueOfMultiselectAsStringArray requires id (and not element)
  return getValueOfMultiselectAsStringArray("new_gen_parameters");
}
function askForGeneratorParameters(x, callback, sectId) {
  let generatorName = findNextGeneratorName();

  let qDiv = document.createElement("div"); 
  qDiv.innerHTML = `<div style="padding: 10px 0px 20px 10px;"><select class="multiselect" id="new_gen_parameters" multiple style="width: 500px;"></select></div>`;

  openDialog(`Select generating parameters and press OK to create a new generator (${generatorName}).`, preventNonAlphaNumKeys, qDiv, formatParametersSelect, getValueFromParameterSelect).then((result) => {
    if (result != null) {
      callback(generatorName, sectId, result);
    } 
  });
}

function meGeneratorContent(generatorName, parDiv, generator) {
  parDiv.innerHTML = getGeneratorHTML(projectName, generatorName, generator.description, generator.parameters.replaceAll("\"", "'"));

  var cmDiv=`gencode-${generatorName}`;  
  initCodeMirrorEditor(cmDiv, `genhcode-${generatorName}`, generator.sourcecode, changes.generators, generatorName, undefined,undefined,undefined, false);
  disabableEditors.set(cmDiv,editors.get(cmDiv));
  setTimeout(() => editors.get(cmDiv).refresh(), 0);

  let doTrigger = false; //?
  setMultiselectValuesFromArrray("genpars-", generatorName);
  if (doTrigger) $("#genpars-"+generatorName).trigger('change');
  applySelect2Options($("#genpars-"+generatorName));   
}

function meAddGenerator(generatorName, parameters) {
  if (parameters == "[]") {
    showPopup(`At least one parameter is required`);
    return -1;
  }

  askServer(newGeneratorPhase2, projectName, generatorName, 
    `alter {'Action':'NewGenerator', 'ProjectName':'${projectName}', 'GeneratorName':'${generatorName}', 'GeneratorParameters':${parameters}}` );

  pageProject.addGenerator(generatorName, "", parameters, "");
}

function newGeneratorPhase2(projectName, generatorName, response) {
  let parameters = "[]", sourcecode="";
  try {
    parameters = JSON.stringify(response.Answer.Parameters);
    sourcecode = atob(response.Answer.Code); 
  } catch (error) {};

  pageProject.addGenerator(generatorName, "", parameters, sourcecode);
  showMEntity("generators", generatorName);
}


function meRmGenerator(sectId, generatorName) {
  askServer(removeMEntityPhase2, projectName, generatorName, 
      `alter {'Action':'RemoveGenerator', 'ProjectName':'${projectName}', 'GeneratorName':'${generatorName}'}`, null, sectId);
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


// ************************************* TIMERS ***************************************** //
function getTimerHTML(projectName, key, desc,timerid) {
  var timHTML = `
     <span id="timerElt-__key__"></span>
     <div id="timerdiv-__key__">
     <table style="width:100%; padding: 15px;">
     <tr><td class="gentd"><label for="namet-__key__">Name:</label></td>
         <td><input class="almostW" disabled type="text" id="namet-__key__" readonly value="${key}">
         <td style="align-content: start;"><i id="remove_timer_${key}" class="fas fa-times icon editMode pEditNV" w="${projectEID} cw" onclick="removeMEntity('timers', '${projectName}', '__key__')" style="display: inline;"></i></td>
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


function meTimerContent(pID, parDiv, timer) {
  parDiv.innerHTML = getTimerHTML(projectName, pID, timer.desc, timer.timerID);
  selectOptionByValue("statf-"+pID, timer.timerSTAT);                
}

function meAddTimer(timerName) {
  askServer(null, projectName, timerName, 
      `alter {'Action':'NewIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${timerName}', 'IndicatorType':'timer', 'Meta':{'ID':0, 'STAT':'MIN'}}`);    

  pageProject.addTimer(timerName, "", 0, "MIN");
}

function meRmTimer(sectId, timerName) {
  askServer(removeMEntityPhase2, projectName, timerName, 
      `alter {'Action':'RemoveIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${timerName}', 'IndicatorType':'timer'}`, null, sectId);    
}

async function saveTimers(projectName) {
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
     <tr><td class="gentd"><label for="namei-__key__">Name:</label></td>
        <td><input class="almostW" disabled type="text" id="namei-__key__" readonly value="${key}">
        <td style="align-content: start;"><i id="remove_indicator_${key}" class="fas fa-times icon editMode pEditNV" w="${projectEID} cw" onclick="removeMEntity('indicators', '${projectName}', '__key__')" style="display: inline;"></i></td>    
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

function meIndicatorContent(indicatorName, parDiv, ind) {
  parDiv.innerHTML = getIndicatorHTML(projectName, indicatorName, ind.desc);

  var cmDiv = `indcode-${indicatorName}`;
  initCodeMirrorEditor(cmDiv, `indhcode-${indicatorName}`, ind.code, changes.indicators, indicatorName, undefined, undefined, undefined, true);
  var indEditor = editors.get(cmDiv);
  disabableEditors.set(cmDiv,indEditor);

  selectOptionByValue("itype-"+indicatorName, ind.type);
}

function meAddIndicator(indicatorName) {
  askServer(meAddIndicatorPhase2, projectName, indicatorName, 
      `alter {'Action':'NewIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${indicatorName}', 'IndicatorType':'indicator'}`);
  
  // add "fake" indicator (it will be repaired (and repainted) in phase2) to prevent null pointers in rendering
  pageProject.addIndicator(indicatorName, "", "int", atob(""));
}
function meAddIndicatorPhase2(projectName, indicatorName, response) {
  // repair indicator values (in phase0 code was set to "")
  pageProject.addIndicator(indicatorName, "", "int", atob(response.Answer));
  showMEntity("indicators", indicatorName);
}

function meRmIndicator(sectId, indicatorName) {
  askServer(removeMEntityPhase2, projectName, indicatorName, 
      `alter {'Action':'RemoveIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${indicatorName}', 'IndicatorType':'indicator'}`,  null, sectId);
}


function saveIndicators(projectName) {
  changes.indicators.forEach(function (indicator) {                
    var code = editors.get("indcode-"+indicator).getValue();
    var indJSON =  {
       "Name"        : indicator,
       "Description" : document.getElementById("desci-"+indicator).value,
       "Type"        : document.getElementById("itype-"+indicator).value,
       "Code"        : Base64.encode(code)
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
     <tr><td class="gentd"><label for="namec-__key__">Name:</label></td>
         <td><input class="almostW" disabled type="text" id="namec-__key__" value="${key}">
         <td style="align-content: start;"><i id="remove_counter_${key}" class="fas fa-times icon editMode pEditNV" w="${projectEID} cw" onclick="removeMEntity('counters', '${projectName}', '__key__')" style="display: inline;"></i></td>    
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

function meCounterContent(counterName, parDiv, cnt) {
  parDiv.innerHTML = getCounterHTML(projectName, counterName, cnt.desc);
}

function meAddCounter(counterName) {
  askServer(null, projectName, counterName, 
        `alter {'Action':'NewIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${counterName}', 'IndicatorType':'counter'}`);
  pageProject.addCounter(counterName, "");
}

function meRmCounter(sectId, counterName) {
  askServer(removeMEntityPhase2, projectName, counterName, 
      `alter {'Action':'RemoveIndicator', 'ProjectName':'${projectName}', 'IndicatorName':'${counterName}', 'IndicatorType':'counter'}`, null, sectId);
}

async function saveCounters(projectName) {
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
  changes.delete(changes.counters, counter);
}

// ************************************* TESTSETS ***************************************** //
function getTestsetHTML(projectName, key, author, date, eid, desc, shortname, n, repeat, timelimit) {
  let okCancelB = getOkCancelButtonsHTML(key, false, "margin-bottom:-7px; margin-right:-20px;");  
  let upload    = getUploadComponet("testset-"+key, key); 
  let testsetHTML = `
     <div id="testsetChangesDot" class="smallDot" style="top:57px; right:5px;"></div>

     <div id="testsetdiv-__key__" style="margin:10px;">
        <div style="height:35px;"></div>

        <div id="testsetOkCancelPanel">
          <div id="testsetEditButtons" class="editMode" w="${eid} cw" style="display: flex;flex-direction: row-reverse;margin-right: 10px; padding-top: 5px;">
            <div id="editButtons_${key}">
              <span name="privateness_span_holder" key="${eid}" ename="${key}" style="margin-right:5px"></span>
              <span>
                <i class="far fa-edit icon"  title="Edit testset" onclick="editSelectedTestset('${key}')"></i>
                <i class="fas fa-times icon" title="Remove testset" onclick="removeTestset('${projectName}', '__key__')"></i>
              </span>
            </div>
            ${okCancelB}
          </div>
        </div>
      <div id="testset_container_div" style="border: 1px solid #cccccc;margin: 0px; height: calc(100vh - 150px); display: flex; flex-direction: column; overflow: auto;">
       <span id="testsetElt-__key__"></span> 
       <table style="width:100%; padding: 15px;">
         <!--div class="submenuitem" style="display: block;">
           <hi>Testset '${key}' properties</hi>
         </div-->
         <tr><td class="gentd"><label for="tsname-__key__">Testset name</label></td>
             <td><input class="almostW pEdit"  disabled readonly type="text" id="tsname-__key__" value="${key}" own='${key}'>
         </td></tr>         
         <tr><td class="gentd"><label for="tsauthor-__key__">Author of testset</label></td>
             <td><input class="almostW pEdit"  disabled readonly type="text" id="tsauthor-__key__" value="${author}" own='${key}'>
         </td></tr>         
         <tr><td class="gentd"><label for="tsdate-__key__">Creation Date</label></td>
             <td><input class="almostW pEdit"  disabled readonly type="text" id="tsdate-__key__" value="${date}" own='${key}'>
         </td></tr>
         <tr><td class="gentd"><label for="tsshort-__key__">Short name</label></td>
             <td><input class="almostW sEdit" disabled type="text" id="tsshort-__key__" value="${shortname}"  own='${key}' oninput="setTestsetChanged(true);">
         </td></tr>
         <tr><td class="gentd"><label for="descts-__key__">Description:</label></td>
             <td><textarea class="descTA almostW sEdit" disabled class="almostW" type="text" id="descts-__key__"  own='${key}' oninput="setTestsetChanged(true);">${desc}</textarea>
         </td></tr>
         <tr><td class="gentd"><label for="tsnum-__key__">Number of tests</label></td>
             <td><input class="almostW sEdit" disabled type="number" id="tsnum-__key__" value="${n}"  own='${key}' oninput="setTestsetChanged(true);">
         </td></tr>
         <tr><td class="gentd"><label for="tsrepeated-__key__">Test repeat</label></td>
             <td><input class="almostW sEdit" disabled type="number" id="tsrepeat-__key__" value="${repeat}"  own='${key}' oninput="setTestsetChanged(true);">
         </td></tr>
         <tr><td class="gentd"><label for="tstimelimit-__key__">Time limit</label></td>
             <td><input class="almostW sEdit" disabled type="number" id="tstimelimit-__key__" value="${timelimit}" own='${key}' oninput="setTestsetChanged(true);">
         </td></tr>
         <tr><td style="vertical-align:top" class="gentd"><label for="tsfilecont-__key__">Tests</labekeyl>${infoButton('tests')}</td>
             <td><textarea style="display:none;" class="almostW" id="tsfilecontTA-__key__" onchange="setTestsetChanged(true);"></textarea>
             <div class="CodeMirror almostW" id="tsfilecontCM-__key__"></div>
         </td></tr>
         
         <tr class="separator"><td colspan="2"></td></tr> 
         
         <tr><td style="vertical-align:top;" class="gentd"><label for="tstfiles-__key__">Testset files</label> 
             ${infoButton('testset_files', key)}
             </td>
         <td><div id="testsetfiles_${key}" class="container-box sEdit almostW" own='${key}' disabled>... no files added for this testset</div>
             ${upload}
         </td>
         </td></tr>

        <tr class="separator"><td colspan="2"></td></tr> 
        <tr id="run_algts_tr" class="editMode pEditNV" w="${eid} cw"><td style="vertical-align:top; padding-top:10px" class="gentd"><label for="running-__key__">Run</label></td>
         <td style="padding-top:10px">
           Run testset with algorithm <select id="run_testsetalgorithm_select"></select> <input type=button value="Run" onclick="runAlgorithmWithTestset('${key}')">
         </td>
         </td></tr>
       </table>
      </div>
     </div>
  `;
  return testsetHTML.replace(/__key__/g, key); 
}

function getTestsetFilesListItemHTML(testsetName, filename, size, disabledRemoving=true) {
  return `
  <span id="file_${testsetName}_${filename}" class="framed-span"> 
      <span class="clickable-span" onclick="showTestsetResourceFile('${testsetName}', '${filename}')">${filename}</span> (${formatFileSize(size)})
      <i class='fas fa-times icon sEdit' own='${testsetName}' ${disabledRemoving ? 'disabled' : ''} onclick='removeTestsetFile(event, "${testsetName}",  "${filename}")'></i>
    </span>
  `;
}

function getTestsetFilesHTML(projectName, key, eid) {
  let okCancelB = getOkCancelButtonsHTML(key, false, "margin: -5px -10px;");
  let upload    = getUploadComponet("testset-"+key, key); 
  let testsetHTML = `
     <div id="testsetsdiv-__key__" style="margin:5px 0;">
        <div style="display:flex;justify-content:flex-end;align-items: end; padding-right: 12px;">
          <div id="editButtons_${key}" class="editMode" w="${eid} cw" style="display:flex;gap:10px; display:none;">
            <i class="far fa-edit icon"  title="Edit testset" onclick="editTestsetsCommonFiles()"></i>
          </div>
          ${okCancelB}
        </div>
      <div id="testsets_container_div" style="border: 1px solid #cccccc;margin: 0px 10px 10px 10px; height: calc(100vh - 90px); display: flex; flex-direction: column; overflow: auto;">
       <table style="width:100%; padding: 15px;">         
         <tr><td style="vertical-align:top;" class="gentd"><label for="tstfiles-__key__">Testsets common files</label>
               ${infoButton('testsets_common_files', key)}
             </td>
         <td><div id="testsetfiles_${key}" class="container-box sEdit almostW" own='${key}' disabled>... no files added for this testset</div>
             ${upload}
         </td>
         </td></tr>
       </table>
      </div>
     </div>
  `;
  return testsetHTML.replace(/__key__/g, key); 
}

async function showTestsetFiles(testsetName, disabledRemoving=true) {
  let testsetFilesDiv = document.getElementById("testsetfiles_" + testsetName);
  if (testsetFilesDiv) {
    let fileList = "";
    let testsetFiles = {}; try {
      testsetFiles = (testsetName != commonTestsetName) ? pageProject.testsets.get(testsetName).filesList : pageProject.tsCommonFiles;
    } catch (e) {}
    Object.keys(testsetFiles).forEach(key => {          
      fileList += getTestsetFilesListItemHTML(testsetName, key, testsetFiles[key], disabledRemoving);
    });
    testsetFilesDiv.innerHTML = fileList;
  }
}

function removeTestsetFile(event, testsetName, filename) {
  let fileDiv = document.getElementById(`file_${testsetName}_${filename}`);
  if (fileDiv) {    
    setTestsetChanged(true);
    let list = pageProject.tsCommonFiles;          // ... to ensure this function to work on both (testsetand commonFiles)
    let removedList = testsetsCommonRemovedFiles;   
    if (testsetName != commonTestsetName) {
      list        = pageProject.testsets.get(testsetName).filesList;
      removedList = testsetRemovedFiles;
    }
    let size = list[filename];
    removedList[filename] = size;
    delete list[filename];
    fileDiv.remove();
  }
}

function showTestsetResourceFile(testsetName, fileName) {
  let service = pageProject.services["get_testset_file"];
  sendRequest(service.endpoint, {'ProjectName':projectName, 'TestsetName':testsetName,'FileName':fileName}, service.method).then((response) =>{
    let jResp = JSON.parse(response);
    if (jResp.Status == 0 ) {
      let content = atob(jResp.Answer);
      showModalDisplay(fileName, content);
    }
  }). catch((error) => {
    alert("File does not exist");
  }); 
}

async function showEntity(paneID, tabID) {
  selectTab(paneID, tabID);

  // special tab - to show testsets common files
  let testsetsfilespanel = document.getElementById("testset_files_panel");
  if (tabID == 'e_000000_tsf') {
    await fillTestsetsFilesPanel();
    if (testsetsfilespanel) testsetsfilespanel.style.display = "";

    let  testsetpaneldetail= document.getElementById("testset_panel_detail");
    if (testsetpaneldetail) testsetpaneldetail.style.display = "none";
    return;

  } else if (testsetsfilespanel) testsetsfilespanel.style.display = "none";

  let eMap = paneID=="testsets" ? pageProject.testsets : pageProject.algorithms;
  if (!eMap.get(tabID)) 
    await pageProject.waitForDataToLoad(["get_"+paneID.slice(0, -1)], true, {'ProjectName':projectName, 'EntityName':tabID});

  if (paneID=="testsets") {
    let  testsetpaneldetail= document.getElementById("testset_panel_detail");
    if (testsetpaneldetail) testsetpaneldetail.style.display = "";

    showSelectedTestset(tabID);
  }
  else 
    showSelectedAlgorithm(tabID);
}

function showEntitiesTabMenu(entityName, entitiesList) {
  addTabPane(entityName+"s");

  const newButton = addTab(entityName+"s", "new"+entityName, "＋ New ", entityName=="testset" ? askForNewTestsetName : askForNewAlgorithmName, 1);
  newButton.classList.add('editMode');
  newButton.setAttribute('w', `${projectEID} ca${entityName[0]}`); // "caa" for can_add_algorithm and "cat" for can_add_testset

  entitiesList.forEach((key, value) => {
    addTab(entityName+"s", value.replace(/\s+/g, "_"), value, showEntity)});

  if (entityName=="testset") addTab(entityName+"s", "e_000000_tsf", "Testsets common files", showEntity);

  enableEditMode(isEditMode);
  wireTabs(entityName);
  updateMarkers(entityName+"s");
}

// show a page with "tab panel" for all entities (testsets or algorithms) + information about the selected entity
async function showEntitiesPage(entityName, entitiesList) {
  await pageProject.waitForDataToLoad(["get_project_general_data"], false, {'ProjectName': projectName}); 

  showEntitiesTabMenu(entityName, entitiesList);
  
  let hasEntities = (entitiesList.size > 0);
  showCorDiv(entityName, hasEntities);

  if (hasEntities) 
    showEntity(entityName+"s", entitiesList.keys().next().value.replace(/\s+/g, "_"));
}

// first the "loading" div is displayed. After load, "entities" div is displayed (if there are entities) or "no entities" otherwise 
function showCorDiv(entityName, hasEntities) {
  document.getElementById(`loading_${entityName}s_div`).style.display =  "none";
  document.getElementById(`no_${entityName}s_div`).style.display      =  hasEntities ? "none" : "";
  document.getElementById(`${entityName}s_div`)   .style.display      =  hasEntities ? ""     : "none";
}


function addOptionToSelect(selectElement, value, text=value) {
  const optionElement = document.createElement('option');
  optionElement.value = value;
  optionElement.textContent = text;
  selectElement.appendChild(optionElement);
}


/////// Testsets Files Panel logic /////////////////////
var commonTestsetName = "testsets_common"; // generic name for "testset" which represent common testset files
var testsetsCommonAddedFiles = {};
var testsetsCommonRemovedFiles = {};
let filledTestsetsFilesPanel = false;      // FilesPanel is rendered only once
async function fillTestsetsFilesPanel() {
  if (!filledTestsetsFilesPanel) {
    let testsetsfilespanel = document.getElementById("testset_files_panel");
    if (testsetsfilespanel && testsetsfilespanel.childElementCount == 0) { // only fill div once
      await pageProject.waitForDataToLoad(["get_testsets_common_files"], false, {'ProjectName':projectName});
      testsetsfilespanel.innerHTML = getTestsetFilesHTML(projectName, commonTestsetName, projectEID);
      wireButton(commonTestsetName+"_cancel", cancelTestsetCommonFiles, commonTestsetName);
      wireButton(commonTestsetName+"_ok",     saveTestsetCommonFiles,   commonTestsetName);
      registerUploadPanel("testset-"+commonTestsetName, new Map([["type", commonTestsetName]]), file=>{
        testsetsCommonAddedFiles[file.name] = file.size;
        pageProject.tsCommonFiles[file.name]=file.size;
        showTestsetFiles(commonTestsetName, false);
      });
      showTestsetFiles(commonTestsetName);
      enableEditMode(isEditMode);
    }
    filledTestsetsFilesPanel = true;
  }
}
////////////////////////////


function editTestsetsCommonFiles() {
  testsetsCommonAddedFiles = {};
  testsetsCommonRemovedFiles = {};

  enableEEditElementsWithOwn(commonTestsetName, true);
  showHideTestSetEditPanel(commonTestsetName, false); 
  updateUploadButtonState("testset-"+commonTestsetName);
}
async function cancelTestsetCommonFiles() {
  setTestsetChanged(false);
  showHideTestSetEditPanel(commonTestsetName, true);  
  enableEEditElementsWithOwn(commonTestsetName, false);

  await fixFilesOnCancel(testsetsCommonAddedFiles, testsetsCommonRemovedFiles, pageProject.tsCommonFiles, commonTestsetName);
  showTestsetFiles(commonTestsetName);
}
async function saveTestsetCommonFiles() {
  showHideTestSetEditPanel(commonTestsetName, true); 
  enableEEditElementsWithOwn(commonTestsetName, false); 

  await removeRemovedFiles(testsetsCommonRemovedFiles, commonTestsetName);
}

function showTestsetsSubpage(elt) {
  document.getElementsByName("mx").forEach(function(title) {
      title.style.color = '#333';
  });
  document.getElementById('testsets_main_panel').querySelectorAll(':scope > div')
    .forEach(div => {
      div.style.display = 'none';
  });

  elt.style.color = "var(--submenu_color)";
  document.getElementById(elt.getAttribute("href")).style.display="";  
}  

async function showSelectedTestset(testsetName) {
//  const selectElement = document.getElementById('select_testset_element');
  //var testsetName = selectElement.value;
  var ts = pageProject.testsets.get(testsetName);

  // if testset exists, show its data on page
  if (ts) {
    let newContentPanel = document.getElementById("testset_panel_detail");
    newContentPanel.innerHTML = getTestsetHTML(
      projectName, testsetName, ts.author, ts.date, ts.eid, ts.description, ts.shortname, ts.n, ts.repeat, ts.limit);
    enableEditMode(isEditMode, newContentPanel);
    wireButton(testsetName+"_cancel", cancelSelectedTestset, testsetName);
    wireButton(testsetName+"_ok",     saveSelectedTestset,   testsetName);
    registerUploadPanel("testset-"+testsetName, new Map([["type", "testset"],["name", testsetName]]), file=>{
      // alert for each uploaded file
      testsetAddedFiles[file.name] = file.size;
      pageProject.testsets.get(testsetName).filesList[file.name] = file.size;
      showTestsetFiles(testsetName, false);
      setTestsetChanged(true);
    });
    showTestsetFiles(testsetName);

    await populatePrivatnessSpans("testset");
    showHidePrivatenessIcons();

    var cmDiv = "tsfilecontCM-"+testsetName;
    initCodeMirrorEditor(cmDiv, "tsfilecontTA-"+testsetName, ts.fileContent, changes.testsets, testsetName, "light", undefined, "240px", true);
    var tsEditor = editors.get(cmDiv);
    setTimeout(() => {tsEditor.refresh();}, 100); // to render properly
    disabableEditors.set(cmDiv,tsEditor);

    const selectElement = document.getElementById(`run_testsetalgorithm_select`);
    if (selectElement) {
      selectElement.innerHTML = "";
      pageProject.algorithms.forEach((key, value) => {addOptionToSelect(selectElement, value)});
      selectElement.selectedIndex = 0;
      //if (fireChange) selectElement.dispatchEvent(new Event("change"));
    }
  } else {
    document.getElementById("testset_panel_detail").innerHTML = "";
  }
}

function askForNewTestsetName() {
  openDialog('Enter the name of the testset to be created:', preventNonAlphaNumKeys).then((result) => {
    if (result != null) {
      newTestsetByName(result);
    } 
  });
}

function newTestset() {
  var testsetName = document.getElementById("newtestsettextfield").value;
  newTestsetByName(testsetName);
}

function newTestsetByName(testsetName) {
    if (!checkName(testsetName, pageProject.testsets, "testset")) return;

    askServer(newTestsetPhase2, projectName, testsetName, 
       `alter {'Action':'NewTestset', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}', 'Author':'${current_user_username}', 'Date':'${getCurrentFormattedDate()}'}`);    
}
function newTestsetPhase2(projectName, testsetName, response) {
  if (response.Status == 0)
    askServer(newTestsetPhase3, projectName, testsetName, 
       `getData {'Type':'Testset', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}', 'Deep':true}`);      
  else 
    showPopup(response.Message);
}
async function newTestsetPhase3(projectName, testsetName, response) {
  if (response.Status == 0) {
    let prop = response.Answer.Properties;
    if (!pageProject.testsets.has(testsetName))
      pageProject.addTestset(testsetName, prop.Author, prop.Date, prop.eid, prop.Description, prop.ShortName, prop.N, prop.TestRepeat, prop.TimeLimit, response.Answer.FileContent, [], prop.LastModified);

    add_entity('et3', prop.eid, testsetName, true);

    var tsID = testsetName.replace(/\s+/g, "_");
    addTab("testsets", tsID, testsetName, showEntity, -1);
    showEntity("testsets", tsID);
    showCorDiv("testset", true);

    setTimeout(() => {editSelectedTestset(testsetName);}, 200);
  }
}


function removeTestset(projectName, testsetName) {
  showYesNoDialog(`Do you want to remove '${testsetName}'?`, removeTestsetPhase1, projectName, testsetName);
}
function removeTestsetPhase1(answer, projectName, testsetName) {
  if (answer != 0) return;
  askServer(removeTestsetPhase2, projectName, testsetName, 
      `alter {'Action':'RemoveTestset', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}'}`);
}
function removeTestsetPhase2(projectName, testsetName, response) {
  pageProject.removeTestset(testsetName);
  let nextTabID = removeTab("testsets", testsetName);

  let testsetContentPanel = document.getElementById("testset_panel_detail");
  testsetContentPanel.innerHTML = "";

  if (pageProject.testsets.size > 0)
    showEntity("testsets", nextTabID);
  else
    showCorDiv("testset", false);
}

function nonCommentLines(id) {
  let content=document.getElementById("tsfilecontTA-"+id).value;
  let n = content.split('\n').filter(line => { 
    const  trimmedLine = line.trim();
    return trimmedLine.length > 0 && !trimmedLine.startsWith('#');
  }).length;
  document.getElementById("tsnum-"+id).value=n
}


function showHideTestSetEditPanel(tsName, show) {
  var editButtons = document.getElementById("editButtons_" + tsName);
  var okcaButtons = document.getElementById("OKCancelButtons_" + tsName);

  if (editButtons) editButtons.style.display =  show ? ""     : "none";
  if (okcaButtons) okcaButtons.style.display = !show ? "flex" : "none";

  showHidePrivatenessIcons();
  setEditPageHeight();
}


// if cancel is called from "outside", the name of editing testset is read from this currentEditingTestset
currentEditingTestset = "";  
testsetEditMode       = false;
savedTestsetValues    = new Map();

let testsetAddedFiles   = {};  // resource files removed during edit session
let testsetRemovedFiles = {};  // resource files added during edit session

testsetChanged        = false;
function setTestsetChanged(changed) {
  testsetChanged = changed;
  let elt = document.getElementById("testsetChangesDot");
  if (elt) elt.style.backgroundColor=testsetChanged ? "red" : "green";
}

function editSelectedTestset(tsName) {
   testsetAddedFiles   = {};
   testsetRemovedFiles = {};
   setTestsetChanged(false);

   currentEditingTestset = tsName;
   testsetEditMode       = true;

   showHideTestSetEditPanel(tsName, false); 
   enableEEditElementsWithOwn(tsName, true, ["tsfilecontCM-"]);  
   enableProjectEditMode(true);
 }

async function fixFilesOnCancel(addedFiles, removedFiles, filesList, testsetName) {
  const promises = Object.keys(addedFiles).map((key) =>
    new Promise((resolve) => {
      askServer((pName, tsName, response) => {
        if (response.Status == 0) {
          delete filesList[key];
        }
        resolve(); // Resolve this promise after askServer completes
      }, projectName, testsetName, 
         `alter {'Action':'RemoveTestsetFile', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}', 'FileName':'${key}'}`
      );
    })
  );

  // Wait for all askServer calls to finish
  await Promise.all(promises);

  Object.keys(removedFiles).forEach((key) => {
    if (!(key in addedFiles)) {
      filesList[key] = removedFiles[key];
    }
  });
}


async function cancelSelectedTestset(event) {
  setTestsetChanged(false);

  testsetEditMode       = false;

  var tsName = event ? event.data.param1 : currentEditingTestset;
  showHideTestSetEditPanel(tsName, true); 
  enableEEditElementsWithOwn(tsName, false, ["tsfilecontCM-"]);
  
  await fixFilesOnCancel(testsetAddedFiles, testsetRemovedFiles, pageProject.testsets.get(tsName).filesList, tsName);

  showSelectedTestset(tsName);
}

async function removeRemovedFiles(removedFiles, testsetName) {
  const promises = Object.keys(removedFiles).map((key) =>
    new Promise((resolve) => {
      askServer(() => {resolve();}, projectName, testsetName, 
        `alter {'Action':'RemoveTestsetFile', 'ProjectName':'${projectName}', 'TestsetName':'${testsetName}', 'FileName':'${key}'}`
      );         
    })
  );
  await Promise.all(promises);
}

async function saveSelectedTestset(event) {
  setTestsetChanged(false);

  testsetEditMode       = false;

  var tsName = event.data.param1;

  await removeRemovedFiles(testsetRemovedFiles, tsName);

  showHideTestSetEditPanel(tsName, true); 
  enableEEditElementsWithOwn(tsName, false, ["tsfilecontCM-"]);

  saveTestset(tsName);
  enableProjectEditMode(false);
}

function saveTestset(testset) {
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
  let tests = document.getElementById("tsfilecontTA-"+testset).value;

  if (ts) ts.setProps(tsJSON.Name, undefined, undefined, tsJSON.eid, tsJSON.Description, tsJSON.ShortName, tsJSON.N, tsJSON.TestRepeat, tsJSON.TimeLimit, tests, undefined, Math.floor(Date.now() / 1000));

  let dataJSON = {
    "Properties" : tsJSON,
    "FileContent": tests
  };

  askServer(saveTestsetsPhase2, projectName, testset, 
     `alter {'Action':'SaveTestset', 'ProjectName':'${projectName}', 'TestsetName':'${testset}', 'Testset':${JSON.stringify(dataJSON)}}` );
  testsetChanged = false;
}
function saveTestsetsPhase2(projectName, testsetName, response) {
  showPopup("Testset saved.");
}

function enableEEditElementsWithOwn(own, enabled, editorList) {
  // enable/diable inputs ...
//  document.querySelectorAll(`.sEdit[own="${own}"]`).forEach(function(element) {
//    element.disabled = !enabled;
//  });
// spodnja koda doda/odstrani disabled na vseh elementih (ne samo na elementih tipa input, kot to naredi zgornja koda)
document.querySelectorAll(`.sEdit[own="${own}"]`).forEach(function(element) {
    if ("disabled" in element) {
        // If the element supports the disabled property (e.g., <input>, <button>)
        element.disabled = enabled ? false : true;
    } else {
        // For elements that do not support the disabled property (e.g., <div>)
        if (enabled) {
            element.removeAttribute("disabled");
        } else {
            element.setAttribute("disabled", "");
        }
    }
});


  //  and editors ...
  if (editorList) editorList.forEach(editor => {
    var tsEditor = editors.get(editor+own);
    if (tsEditor) {
      tsEditor.setOption("readOnly", !enabled);
      tsEditor.getWrapperElement().style.backgroundColor = (enabled ? "#FBFFFB" : "#f5f5f5"); 
    }
  });
  // and show/hide TextBox views and their previews
  document.querySelectorAll(`.sEditV[own="${own}"]`).forEach(function(element) {
    element.style.display = enabled ^ element.classList.contains("not") ? "" : "none";
  });

}


// ************************************* Algorithms ***************************************** //
function getAlgorithmHTML(projectName, key, eid, desc, shortname, date, author, language, htmlContent, color) {
  var okCancelB = getOkCancelButtonsHTML(key, false, "margin-bottom:-5px;margin-right:-11px;");
  var colors    = createColorSelect(key, getUsedColors(), "colors_"+key, color);

  var algorithmHTML = `
     <div id="algorithmChangesDot" class="smallDot" style="top:57px; right:5px;"></div>

     <div id="algorithmdiv-__key__" style="margin:10px;">
       <div style="height:35px;"></div>
       <div id="algorithmOkCancelPanel">
         <div id="algorithmEditButtons" class="editMode" w="${eid} cw" style="display: flex;flex-direction: row-reverse;margin-right: 10px; padding-top: 5px;">
            <div id="editButtons_${key}">
              <span name="privateness_span_holder" key="${eid}" ename="${key}" style="margin-right:5px"></span>
              <span>
               <i class="far fa-edit icon"  title="Edit algorithm" onclick="editSelectedAlgorithm('${key}')"></i>
               <i class="fas fa-times icon" title="Remove algorithm" onclick="removeAlgorithm('${projectName}', '__key__')"></i>
              </span>
            </div>
            ${okCancelB}
          </div>
       </div>
       
       <div id="algorithm_container_div" style="border: 1px solid #cccccc; height: calc(100vh - 150px); display: flex; flex-direction: column; overflow: auto;">
         <span id="algorithmElt-__key__"></span>  
         <table style="width:100%; padding: 15px;">
           <tr><td class="gentd"><label for="alname-__key__">Algorithm nameX</label></td>
               <td><input class="almostW pEdit" disabled disabled readonly type="text" id="alname-__key__" value="${key}" own='${key}'>
               <td class="gentd"><label for="alcolor-__key__">Color:</label></td> 
               <td>${colors}</td>
           </td></tr>
           <tr><td class="gentd"><label for="alauthor-__key__">Author of implementation</label></td>
               <td><input class="almostW pEdit" disabled disabled readonly type="text" id="alauthor-__key__" value="${author}" own='${key}'>
               <td class="gentd"><label for="aldate-__key__">Creation Date</label>
               <td><input class="almostW pEdit" disabled disabled readonly type="text" id="aldate-__key__" value="${date}" own='${key}'>
           </td></tr>
           <tr><td class="gentd"><label for="alshort-__key__">Short name</label></td>
               <td><input class="almostW sEdit" disabled type="text" id="alshort-__key__" value="${shortname}" own='${key}' oninput="setAlgorithmChanged(true);">               
               <td class="gentd"><label for="allang-__key__">Language</label>
               <td colspan=3><input class="almostW sEdit" disabled type="text" id="allang-__key__" value="${language}" own='${key}' oninput="setAlgorithmChanged(true);">
           </td></tr>
           <tr><td class="gentd"><label for="descal-__key__">Short description:</label></td>
               <td colspan=3><textarea class="descTA almostW sEdit" disabled class="almostW" type="text" id="descal-__key__" own='${key}' oninput="setAlgorithmChanged(true);">${desc}</textarea>
           </tr>
           <tr><td style="vertical-align:top" class="gentd"><label for="alghtml-__key__">Detailed description</label></td>
               <td colspan=3><div class="almostW not sEditV" style="background:#f5f5f5; border:1px solid lightgray; margin-bottom:10px;padding:10px;" id="alghtml_prev-algorithmDescription___key__" own='${key}' onchange="setAlgorithmChanged(true);">${htmlContent}</div>
                   <div class="almostW     sEditV"  style="display:none"       id="alghtml-__key__" own='${key}' oninput="setAlgorithmChanged(true);"></div>
           </td></tr>
           <tr><td style="vertical-align:top" class="gentd"><label for="algsrcCM-__key__">Source code</label></td>
               <td colspan=3><textarea style="display:none;" class="almostW" id="algsrcTA-__key__" onchange="setAlgorithmChanged(true)"></textarea>
               <div class="CodeMirror almostW" id="algsrcCM-__key__"></div>
           </td></tr>
           <tr id="compile_alg_tr" class="editMode pEditNV" w="${eid} cw"><td style="vertical-align:top" class="gentd"></td>
               <td  colspan=3>              
                 <input type=button value="Compile" style="float: right; margin-right: 11px;" onclick="compileAlgorithm('${key}')">
           </td></tr>
         </table>
       </div>
     </div>
  `;
  return algorithmHTML.replace(/__key__/g, key); 
}

// show algorithm by name or (if name is not given) by selected element in "select_algorithm_element"
async function showSelectedAlgorithm(algorithmName) { 
  //const selectElement = document.getElementById('select_algorithm_element');
  //let   algorithmName = selectElement.value;
  var   alg           = pageProject.algorithms.get(algorithmName);

  // if algorithm exists, show its data on page
  if (alg) {
    let newContentPanel = document.getElementById("algorithm_panel_detail");
    newContentPanel.innerHTML = 
      getAlgorithmHTML(projectName, algorithmName, alg.eid, alg.description, alg.shortname, alg.date, alg.author, alg.language, alg.htmlContent, alg.color);

    // adopt select color according to selected value
    const selectID = "colors_"+algorithmName;
    const select   = document.getElementById(selectID);
    select.addEventListener("change", function() {
      updateColorSelectPreview(selectID);
    });    
    updateColorSelectPreview(selectID);

    enableEditMode(isEditMode, newContentPanel);
    wireButton(algorithmName+"_cancel", cancelSelectedAlgorithm, algorithmName);
    wireButton(algorithmName+"_ok",     saveSelectedAlgorithm,   algorithmName);

    await populatePrivatnessSpans("algorithm");
    showHidePrivatenessIcons();

    var cmDiv = "algsrcCM-"+algorithmName;
    initCodeMirrorEditor(cmDiv, "algsrcTA-"+algorithmName, alg.fileContent, changes.algorithms, algorithmName, undefined, undefined, undefined, true);
    var alEditor = editors.get(cmDiv);
    setTimeout(() => {alEditor.refresh();}, 100); // to render properly


    let view = getViewOfType("TextBox", "algorithmDescription", algorithmName);
    document.getElementById("alghtml-"+algorithmName).innerHTML = view.getEditorHTML();  
    document.getElementById("htmlEditorView_algorithmDescription_"+algorithmName).style.margin = "0px 0px 20px 0px";
    view.initNewMode();
    view.viewJSON["htmltext"]=alg.htmlContent;
    view.fillDataAndWireControls();
    htmlViews.set(algorithmName, view);

    let algDescDiv = document.getElementById(`alghtml_prev-algorithmDescription_${algorithmName}`);
    formatMath(algDescDiv);
  } else {
    document.getElementById("algorithm_panel_detail").innerHTML = "";
  }
}

function showHideAlgorithmEditPanel(alName, show) {
  var editButtons = document.getElementById("editButtons_"     + alName);
  var okcaButtons = document.getElementById("OKCancelButtons_" + alName);

  if (editButtons) editButtons.style.display =  show ? ""     : "none";
  if (okcaButtons) okcaButtons.style.display = !show ? "flex" : "none";
}


// if cancel is called from "outside", the name of editing testset is read from this currentEditingTestset
currentEditingAlgorithm = "";  
algorithmEditMode       = false;
savedAlgorithmValues    = new Map();
algorithmChanged        = false;
function setAlgorithmChanged(changed) {
  algorithmChanged = changed;
  let elt = document.getElementById("algorithmChangesDot");
  if (elt) elt.style.backgroundColor=algorithmChanged ? "red" : "green";
}
function editSelectedAlgorithm(alName) {
   setAlgorithmChanged(false);
   enableProjectEditMode(true);
   currentEditingAlgorithm = alName;
   algorithmEditMode       = true;

   showHideAlgorithmEditPanel(alName, false); 
   enableEEditElementsWithOwn(alName, true, ["algsrcCM-"]);

   document.getElementById("alshort-"+alName).focus();
   document.getElementById("alshort-"+alName).select();

   setEditPageHeight();
 }

function cancelSelectedAlgorithm(event) {
  setAlgorithmChanged(false);

  algorithmEditMode       = false;

  var alName = event ? event.data.param1 : currentEditingAlgorithm;
  showHideAlgorithmEditPanel(alName, true); 
  enableEEditElementsWithOwn(alName, false, ["algsrcCM-"]);

  showSelectedAlgorithm(alName);
}
function saveSelectedAlgorithm(event) {
  setAlgorithmChanged(false);

  algorithmEditMode       = false;

  var alName = event ? event.data.param1 : currentEditingAlgorithm;
  showHideAlgorithmEditPanel(alName, true); 
  enableEEditElementsWithOwn(alName, false, ["algsrcCM-"]);

  // transfer content from editor to preview panel
  let algDescDiv = document.getElementById(`alghtml_prev-algorithmDescription_${alName}`);
  algDescDiv.innerHTML = htmlViews.get(alName).viewJSON["htmltext"];
  formatMath(algDescDiv);

  saveAlgorithm(alName, true);
  enableProjectEditMode(false);
}

// save algorithm and (optionally) move resources
function saveAlgorithm(alName, moveRes=false) {
  let htmlContent = htmlViews.get(alName).viewJSON["htmltext"];

  if (moveRes)
    moveResources(alName, htmlContent, saveAlgorithmPhase2);
  else 
    saveAlgorithmPhase2(alName, htmlContent, htmlContent);
}


function saveAlgorithmPhase2(alName, htmlContent, newHtmlText) {
  let al = pageProject.algorithms.get(alName);
  let alEID = ""; if (al) alEID = al.eid; 

  let alJSON = {
    "eid"                  : alEID,     
    "Description"          : document.getElementById("descal-"  +alName).value,        
    "ShortName"            : document.getElementById("alshort-" +alName).value,
    "Date"                 : document.getElementById("aldate-"  +alName).value,
    "Author"               : document.getElementById("alauthor-"+alName).value,
    "Language"             : document.getElementById("allang-"  +alName).value,
    "Color"                : document.getElementById("colors_"  +alName).value
  };
  let srcEditor = editors.get("algsrcCM-"+alName);
  let algsrc      = srcEditor ? srcEditor.doc.getValue() : (al ? al.fileContent : "");

  if (al) al.setProps(alName, alEID, alJSON.Description, alJSON.ShortName, alJSON.Date, alJSON.Author, alJSON.language, algsrc, newHtmlText, Math.floor(Date.now() / 1000), alJSON.Color);

  let dataJSON = {
    "Properties" : alJSON,
    "FileContent": algsrc,
    "HtmlFileContent" : replaceStaticProjDocLinkWithDolarStatic(newHtmlText)
  };
  askServer(saveAlgorithmsPhase2, projectName, alName, 
     `alter {'Action':'SaveAlgorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${alName}', 'Algorithm':${JSON.stringify(dataJSON)}}` );  
  algorithmChanged = false;
}

function saveAlgorithmsPhase2(projectName, algorithmName, response) {
  showPopup("Algorithm saved.")
}

function askForNewAlgorithmName() {
  openDialog('Enter the name of the algorithm to be created:', preventNonAlphaNumKeys).then((result) => {
    if (result != null) {
      newAlgorithmByName(result);
    } 
  });
}

function newAlgorithm() {
  var algorithmName = document.getElementById("newalgorithmtextfield").value;
  newAlgorithmByName(algorithmName);
}
function newAlgorithmByName(algorithmName) {
  if (!checkName(algorithmName, pageProject.algorithms, "algorithm")) return;

  askServer(newAlgorithmPhase2, projectName, algorithmName, 
    `alter {'Action':'NewAlgorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithmName}', 'Author':'${current_user_username}', 'Date':'${getCurrentFormattedDate()}'}`);    
}
function newAlgorithmPhase2(projectName, algorithmName, response) {
  if (response.Status == 0)  
    askServer(newAlgorithmPhase3, projectName, algorithmName, 
       `getData {'Type':'Algorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithmName}', 'Deep':true}`);      
  else 
    showPopup(response.Message);
}
async function newAlgorithmPhase3(projectName, algorithmName, response) {
  if (response.Status == 0) {
    let prop = response.Answer.Properties;
    if (!pageProject.algorithms.has(algorithmName)) 
      pageProject.addAlgorithm(algorithmName, prop.eid, prop.Description, prop.ShortName, prop.Date, prop.Author, prop.Language, response.Answer.FileContent, response.Answer.HtmlFileContent, prop.LastModified, prop.Color);

    add_entity('et2', prop.eid, algorithmName, true);

    var alID = algorithmName.replace(/\s+/g, "_");
    addTab("algorithms", alID, algorithmName, showEntity, 0);
    showEntity("algorithms", alID);
    showCorDiv("algorithm", true);

    setTimeout(() => {editSelectedAlgorithm(algorithmName);}, 200);
  }
}


function removeAlgorithm(projectName, algorithmName) {
  showYesNoDialog(`Do you want to remove '${algorithmName}'?`, removeAlgorithmPhase1, projectName, algorithmName);
}
function removeAlgorithmPhase1(answer, projectName, algorithmName) {
  if (answer != 0) return;

  askServer(removeAlgorithmPhase2, projectName, algorithmName, 
      `alter {'Action':'RemoveAlgorithm', 'ProjectName':'${projectName}', 'AlgorithmName':'${algorithmName}'}`);
}
function removeAlgorithmPhase2(projectName, algorithmName, response) {
  pageProject.removeAlgorithm(algorithmName);
  let nextTabID = removeTab("algorithms", algorithmName);

  let algorithmContentPanel = document.getElementById("algorithm_panel_detail");
  algorithmContentPanel.innerHTML = "";

  if (pageProject.algorithms.size > 0)
    showEntity("algorithms", nextTabID);
  else
    showCorDiv("algorithm", false);
}

function compileAlgorithm(algName) {
  if (algorithmChanged) saveAlgorithm(algName);
  runTaskAndShowResults(`addTask {"Project":"${projectName}", "Algorithm":"${algName}", "TaskType":"CompileAlgorithm"}`, "Compile algorithm");
}


function runAlgorithmWithTestset(tstName) {
  if (testsetChanged) saveTestset(tstName); 
  let algName = document.getElementById("run_testsetalgorithm_select").value;
  runTaskAndShowResults(`addTask {"Project":"${projectName}", "Family":"", "Algorithm":"${algName}", "Testset":"${tstName}", "MType":"em", "Priority":5}`, "Execute");
}


function getAlgorithmIndex(algName) {
  let i = 0;
  for (const key of pageProject.algorithms.keys()) {
    if (key === algName) return i;
    i++;
  }
  return -1;
}

// returns a number of algorithms in pageProject.algorithms (with index < idx) that uses default color
function getNumberOfNonDefaultsBefore(idx) {
  let noOfDef=0, i = 0;
    // count algorithms "before" a given algorithm that use default color
    pageProject.algorithms.forEach((alg,key) => {
      if (i < idx) {
        if (getDefinedAlgorithmColor(key) != -1) noOfDef++;
      } i++;
    });
  return noOfDef;
}


// return a color of algorihm (color defined by algorithm or corresponding deafult color if alg.color=-1)
function getAlgorithmColor(algName) {
   let al = pageProject.algorithms.get(algName);
   let aIdx = getAlgorithmIndex(algName);
   let defaultColor = getDefaultColorByIndex(aIdx - getNumberOfNonDefaultsBefore(aIdx), getUsedColors());

   return (al && (al.color != -1)) ? al.color : defaultColor; 
}


// returns a color defined for this algorithm. It can be a color or -1 for default color.
// To detect this color, function uses algorithm.color (for already loaded algorithms) else pageProject.colors (colors loaded with get_project_properties)
function getDefinedAlgorithmColor(algName) {
  let alg = pageProject.algorithms.get(algName);
  if(alg && alg.color) // če je algoritem ze prebran (in je zato alg objekt), uporabim njegovo barvo ...
    return alg.color;
  else { // ... sicer pa uporabimo barvo algoritma, kot je zapisana v algorithm.json (in je bila prebrana ob "get_project_properties")
    const index = [...pageProject.algorithms.keys()].indexOf(algName);
    if (index >= 0)
      return pageProject.colors[index];
    else
      return -1;
  }
}

// returns a set of colors used by algorithms (not default colors)
function getUsedColors() {
  let colors = new Set(); let color;
  pageProject.algorithms.forEach((alg, key) => {
    let color = getDefinedAlgorithmColor(key);
    if (color != -1) colors.add(color);  
  });
  return colors;
}


/////////////   editProject logic  /////////////////////////////

var contentModified = false;
var projectEditMode = false;


async function showImplementation() {
  await pageProject.waitForDataToLoad(["get_project_general_data", "get_project_properties"], false, {'ProjectName': projectName}); 

  showGeneralData(); 

  showFileContent("input");
  showFileContent("output");
  showFileContent("tools");

  // show pages Parameters, Generators, Indicators, Timers and Counters
  meNames.forEach((value, key)=>{showMEntities(key);});    

  setEditPageHeight();
}


function enableProjectEditMode(enabled, where=document){
  //if (where == null) where = document;
  projectEditMode = enabled;

  // show/hide elements
  where.querySelectorAll('.pEditV').forEach(function(element) {
    var shw = element.classList.contains("blck") ? "block" : (flexEditButtons.has(element.id) ? flexEditButtons.get(element.id) : "inline");
    if (projectEditMode) 
      element.style.display = shw; 
    else 
      element.style.display = 'none'; 
  });
  where.querySelectorAll('.pEditNV').forEach(function(element) {
    var shw = element.classList.contains("blck") ? "block" : (flexEditButtons.has(element.id) ? flexEditButtons.get(element.id) : "inline");
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
  document.getElementById(`${eltID}_${key}_mi`).style.color = "var(--submenu_color)";;

  if (document.activeElement) document.activeElement.blur();

  document.getElementById(eltID+'-'+key).scrollIntoView({ behavior: 'smooth',  block: 'center', inline: 'nearest' });  
}

function updateDotColor(color) {
    var dot = document.getElementById('menu-dot');
    if (dot) {
      dot.style.backgroundColor = color;
      if (color == 'red') {
        dot.style.cursor ='pointer';
        dot.classList.add("menu-dot-tosave");
      } else {
        dot.style.cursor ='auto';
        dot.classList.remove("menu-dot-tosave");
      }
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
    if (projectEditMode || testsetEditMode) 
      if (contentModified)
        showYesNoDialog("Action will discard changes on tab. Continue?" , selectMenuItemPhase2, "", "", clickedItem);
      else
        selectMenuItemPhase2(0, "", "", clickedItem);      
    else
      selectMenuItemPhase2(2, "", "", clickedItem);
}

// action: 0 ...cancel Edit and selectItem,  1 ... do not selectItem - stay on page, 2 ... just selectItem
function selectMenuItemPhase2(action, s1, s2, clickedItem) {
    if (action == 1) return;

    if (action==0) {
      if (projectEditMode)
        editProjectSectionCancel();
      else if (testsetEditMode)  
        cancelSelectedTestset();

    }

    editProjectSelectedItem = clickedItem.innerText.toLowerCase();

    document.getElementsByName("mi").forEach(function(title) {
      title.style.color = '#333';
    });
    clickedItem.style.color = "var(--submenu_color)";
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

    var editOKCAPanel = document.getElementById("editOkCancelPanel");
    editOKCAPanel.style.display = (clickedItem.innerHTML == 'TestSets') ? "none" : "";

    // Reset the contentModified flag
    setContentModified(false);       
}
function contentChanged(entity, key) {  
  setContentModified(true);
  entity.add(key);
}

function saveContent() {
  if (changes.other.has("general"))    saveGeneral(projectName);

  if (changes.other.has("input"))      saveFile(projectName, "proj/src/Input.java", editors.get("input-code-editor").getValue(), "input");
  if (changes.other.has("output"))     saveFile(projectName, "proj/src/Output.java", editors.get("output-code-editor").getValue(), "output");
  if (changes.other.has("tools"))      saveFile(projectName, "proj/src/Tools.java", editors.get("tools-code-editor").getValue(), "tools");

  if (changes.parameters.size > 0) saveParameters(projectName);
  if (changes.generators.size > 0) saveGenerators(projectName);
  if (changes.timers.size > 0)     saveTimers(projectName);            
  if (changes.indicators.size > 0) saveIndicators(projectName);            
  if (changes.counters.size > 0)   saveCounters(projectName);
  
  setContentModified(false);  
}

function cancelContentChanges() {
  changes.clearAll();
  setContentModified(false);  

  switch(editProjectSelectedItem) {
    case "general":
      showGeneralData(); break; 
    case "input":case "output": case "tools":
      showFileContent(editProjectSelectedItem); break;  
    case "parameters":
    case "generators":
    case "timers":
    case "indicators":
    case "counters":      
      showMEntities(editProjectSelectedItem);break;  
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
    document.getElementById('lower-section').style.height = (bodyDivHeight-90) + 'px';
    
    var testset_container_div = document.getElementById('testset_container_div');    
    if (testset_container_div) {
      var testsetDivHeight = windowHeight - testset_container_div.offsetTop;
      testset_container_div.style.height = (testsetDivHeight-5) + 'px';
    }

    var algorithm_container_div = document.getElementById('algorithm_container_div');
    if (algorithm_container_div) {
      var algorithmDivHeight = windowHeight - algorithm_container_div.offsetTop;
      algorithm_container_div.style.height = (algorithmDivHeight-5) + 'px';
    }
}


function showHideSaveCancelButtons(show) {
  document.getElementById("OKCancelButtons_editProjectSection").style.display = (show ? "flex" : "none");
  document.getElementById("edit_editProjectSection")           .style.display = (show ? "none" : "flex");
  setEditPageHeight();
}

function editSection() {  
  enableProjectEditMode(true);
  showHideSaveCancelButtons(true); 

  // before editing "General" some preparations for JAR files upload panel
  if (editProjectSelectedItem == 'general') {
    jarAddedFiles   = [];
    jarRemovedFiles = [];
    enableEEditElementsWithOwn(projectName, true);
    updateUploadButtonState("projectjars");
  }
}

async function editProjectSectionCancel() {
  cancelContentChanges();

  enableProjectEditMode(false);
  showHideSaveCancelButtons(false);

  if (editProjectSelectedItem == 'general') {
    await fixJARsOnCancel();
    showProjectJARs();
    enableEEditElementsWithOwn(projectName, false);
  }
}
async function editProjectSectionSave() {
  saveContent();

  enableProjectEditMode(false);
  showHideSaveCancelButtons(false);

  if (editProjectSelectedItem == 'general') {
    await removeRemovedJARFiles();
    enableEEditElementsWithOwn(projectName, false);
  }  
}





////////////// project ////////////////////////
function newProject() {
  openDialog('Enter the name of the project to be created:', preventNonAlphaNumKeys).then((result) => {
    if (result != null) {
      newProjectWithName(result);
    } 
  });
}
function newProjectWithName(projectName) {
  askServer(newProjectPhase2, projectName, "newproject", 
     `alter {'Action':'NewProject', 'ProjectName':'${projectName}', 'Author':'${current_user_username}', 'Date':'${getCurrentFormattedDate()}'}`);
}

function newProjectPhase2(projectName, key, response) {
  showPopup(response.Answer);
  redirectToUrlWithParams(`/project/${projectName}`, {homepoint: true });
}



async function openImportFileDialog() {
  let fileInput = document.getElementById('fileInput');
  fileInput.click();
  fileInput.onchange = async () => {
      document.body.style.cursor = "wait";
      if (fileInput.files.length > 0)  {
        let uploadResult = await uploadFiles([fileInput.files[0]], new Map([["type", "importProject"],[]]));
        if (uploadResult.Status == 0) {
          let path     = uploadResult.Answer.Location;
          let filename = fileInput.files[0].name;
          askServer(importProjectPhase2, projectName, "import", `alter {'Action':'ImportProject', 'Path':'${path}', 'Filename':'${filename}', 'ProjectName':'?'}`); 
        } else  {
          document.body.style.cursor = "default";
          showPopup(uploadResult.Answer);
        }
      }      
  };
}


function importProjectPhase2(p1, p2, response) {
  document.body.style.cursor = "default";

  if (response.Status==0) {
    // response.Answer = "Project 'BasicSort04' imported successfully."
    const match = response.Answer.match(/'([^']+)'/);
    if (match) {
      // redirect to the imported project
      window.location.href = "/project/" + match[1];
    }
  } else {
    showPopup(response.Answer);
  }  
}




//////////////********** PRIVATENESS icons **************/////////////////
function getPrivatenessIconsHTML(key, ename, entity='it', callback) {
  let cbname = callback?.name;
  //${cbname ? cbname + "('" + key  + "');" : ''}
  return `
    <span name="entity_privateness_span" key="${key}" ename="${ename}" onclick="changeLockState(event, '${key}', '${ename}'${cbname? ', '+cbname : ''});">
        <i id="entity_locked_${key}_${ename}"   style="display: none; color:crimson" title="Make ${entity} public (open access)" class="fas fa-lock icon"></i>
        <i id="entity_unlocked_${key}_${ename}" style="display: none; color:green" title="Make ${entity} private (restrict access)" class="fas fa-lock-open icon"></i>
    </span>
  `;
}

async function populatePrivatnessSpans(entity, rootElt = document, callback=null) {
  const elts = [...rootElt.querySelectorAll('[name="privateness_span_holder"]')];

  await Promise.all(
    elts.map(async elt => {
      const key   = elt.getAttribute("key");
      const ename = elt.getAttribute("ename");

      const showLockers = await can(key, "can_write");

      if (showLockers) {
        elt.innerHTML = getPrivatenessIconsHTML(key, ename, entity, callback);
      }
    })
  );
}





function showHidePrivatenessIcons(rootElt=document) {
//  document.getElementsByName("entity_privateness_span").forEach(async function(elt) {        
  rootElt.querySelectorAll('[name="entity_privateness_span"]').forEach(async function(elt) {
    let key = elt.getAttribute("key");
    let ename = elt.getAttribute("ename");
    let is_private = await isPrivate(key);
    showHidePrivatenessIcon(key, ename, is_private);
  });            
}

function showHidePrivatenessIcon(key, ename, is_private) {
  let lockElement   = document.getElementById("entity_locked_"   + key + "_" + ename);
  let unlockElement = document.getElementById("entity_unlocked_" + key + "_" + ename);
  lockElement.classList.remove("grayed-icon");unlockElement.classList.remove("grayed-icon");

  let is_entity = (find_entity(ausers.entities, key) != null);
  lockElement.  style.display = is_private ? ""     : "none";
  unlockElement.style.display = is_private ? "none" : "";
  
  lockElement.classList.  toggle("grayed-icon", !is_entity); lockElement.classList.  toggle("icon", is_entity); 
  unlockElement.classList.toggle("grayed-icon", !is_entity); unlockElement.classList.toggle("icon", is_entity);
}

function changeLockState(event, key, ename, callback) {
  let entity = find_entity(ausers.entities, key);
  if (entity) {
    let is_private = !entity.is_private;
    runNamedService(ausers.services, "set_private", {'eid':key, 'private': is_private ? "True" : "False"}, (result)=>{
      if (result.Answer.startsWith("Error:")) {
        showPopup(result.Answer);
      } else {
        entity.is_private = is_private;
        showHidePrivatenessIcon(key, ename, is_private);

        if (callback) callback(entity, is_private);
      }
    });
  } 
  event.stopPropagation();
}
