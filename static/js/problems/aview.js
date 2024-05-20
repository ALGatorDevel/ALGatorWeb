/*
To write a new View type:
1) write a class "NewView extends AView" and define methods
    constructor
    getDefaultJSON()
    drawView()
    fillDataAndWireControls() 
    getEditorControls() 
2) in function getViewOfType() an a case sentence for new type
3) in AView add a new type constant in registeredViews
*/

///************  An ALGator View class ************///
class AView {
  static get UNKNOWN_VIEW()    { return "Unknown"; }       // generic
  static get TEXTBOX_VIEW()    { return "TextBox";}        // text box (html content)
  static get GRAPH_VIEW()      { return "Graph";   }       // graph
  static get TABLE_VIEW()      { return "Table";   }       // table

  static get registeredViews()              { return [this.GRAPH_VIEW, this.TABLE_VIEW, this.TEXTBOX_VIEW];}
  static get registeredViewsForPlayground() { return [this.GRAPH_VIEW, this.TABLE_VIEW];}

  constructor(type, presenterName, viewName) {
    this.presenterName = presenterName;
    this.viewName      = viewName;
    this.viewID        = getViewID(presenterName, viewName);     // viewID = presenterName.viewName 
    this.type          = type;

    this.mode          = 0;     // 0 ... view mode, 1 ... edit mode, 2 ... new mode
    this.viewJSON      = {};    // settings to edit if mode != 0, {} otherwise

    // Many views offer a preview mode; however, for certain views such as Textbox, the preview 
    // is identical to the view itself, hence we hide it to avoid redundancy
    this.hasPreview    = true;
   }

   // This method is called after edit-ok (save) button is pressed. Normally, method simply calles 
   // savePresenterFn with given parameters. In some views, however, some precomputing is reguired
   // before saving the presenter. These views override this method.  
   preSavePresenter(savePresenterFn, projectName, presenterName, presenterJSON) {
     savePresenterFn(projectName, presenterName, presenterJSON);
   }

  // preview and controls; this method is not supposed to be overriden
  getEditorHTML() {
    let id       = getViewID(this.presenterName, this.viewName);
    let controls = this.getEditorControls(id); 
    return `
      <div id="preview_${id}" class='box w3-row'></div> 
      <div>${controls}</div>
    `;
  }

  getDefaultJSON() {return {};}

  // control part of view's editor
  getEditorControls() {return "<div>/no editor controls provided/</div>"}

  // fill data in editor controls and wire changes (to change viewJSON accordingly)
  fillDataAndWireControls() {}

  // some controls need to be refiled after the data of a view changes (i.e. X columns of a graph)
  // this function is used only with playground's views (presenter views are never shown together
  // with query, so query changes can not affect shown view's content)
  fillControlsAfterDataChange() {}

  // in overriden method set all html fields values and wire changes
  initEditMode() {
    this.mode = 1;
    this.viewJSON = presenterJSONs.get(this.presenterName)[this.viewName];
  }

  initNewMode() {
    this.mode = 2;
    this.viewJSON = this.getDefaultJSON();
  }

  // ce je mode !=0, potem view izrise v div z id=preview_viewID
  // sicer v div z id=view_viewID
  draw() {
    if (this.mode == 0) { // draw view in a given presenter
      this.drawView(presenterJSONs.get(this.presenterName)[this.viewName], "view_"+this.viewID);
    } else if (this.hasPreview){ // draw view in edit mode in preview 
      this.drawView(this.viewJSON, "preview_"+this.viewID);
    }
  } 

  // some views can refresh content faster than redraw; those views should overrid this method
  repaint() {this.draw()}

  // to be overriden
  drawView(viewJSON, viewDIV) {}

  getCurrentJSON() {return {};}
}

class TextboxView extends AView {
   constructor(presenterName, viewName) {
    super(AView.HTML_VIEW, presenterName, viewName);
    this.hasPreview    = false;
  }
  getDefaultJSON() {
    return {
      "htmltext": ""
    };
  }
  drawView(viewJSON, viewDIV) {
    try {
      let htmltext = viewJSON["htmltext"];
      htmltext     = replaceDolarStaticWithStaticWebuploadLink(htmltext);

      this.drawTextbox(htmltext, viewDIV);          
    } catch {}
  }
  drawTextbox (htmltext, viewDIV) {
    let div = document.getElementById(viewDIV);
    if (div != null) {
      div.innerHTML = `<div style="height:360px; overflow:auto;">
        ${htmltext}
      </div>`;
    }
  }

  fillDataAndWireControls(onChange) {
    let htmlEditor = document.getElementById(`htmltext_${this.viewID}`);
    let htmltext = this.viewJSON["htmltext"];
    htmlEditor.innerHTML = htmltext;            
    const tex = window.tex;
    let self = this;
    tex.init({
      element: htmlEditor,
       buttons: ['html', "divider", ,"undo","redo", "divider", "fontSize", "textColor","textBackColor", "divider", "bold","italic","underline","strikethrough", "divider", "heading1","heading2","divider", "olist","ulist", "divider", "code","line","link","divider","indent","outdent","divider","justifyCenter","justifyFull","justifyLeft","justifyRight", "divider","myUpload", "myResource"],
       paragraphSeparator: 'div',
       cssStyle: true,
       theme: 'light', // or 'dark'
       onChange: (content) => {
         self.viewJSON["htmltext"]=content;
         if (onChange) onChange();
       },
       plugins: [getUploadImagePlugin(this.viewID), getUploadResourcePlugin(this.viewID)],
    });
  }

    
  getEditorControls(id) {
    var cont = `   
      <div class='box'>
        <div class='w3-row'>
            <!--div class='w3-col s12'>
              <label for="htmltext_${id}">HTML text description:</label>
            </div-->
            <div class='w3-col s12'>
              <form id="imageUploadForm">
                <input type="file" id="imageInput_${id}" accept="image/*" style="display: none;" onchange="uploadAndInsertImage('${id}', event)">
                <input type="file" id="resourceInput_${id}" accept="*" style="display: none;" onchange="uploadAndInsertResource('${id}', event)">
              </form>
              <div id="htmltext_${id}"></div>
            </div>

      </div>
    `;
    return cont;
  }  

  // overriding of initEditMode to modify htmltext - change %static{X} to "/static/webupload/projectname/X"
  initEditMode() {
    super.initEditMode();
    this.viewJSON["htmltext"] = replaceDolarStaticWithStaticWebuploadLink(this.viewJSON["htmltext"]);
  }

  preSavePresenter(savePresenterFn, projectName, presenterName, presenterJSON) {
    var self = this;
    moveResources(this.viewID, this.viewJSON["htmltext"], 
      function(id, oldHtml, newHtml) {
        var clonedJSON = JSON.parse(JSON.stringify(self.viewJSON));
        clonedJSON["htmltext"] = newHtml;
        presenterJSON[self.viewName] = clonedJSON;
        savePresenterFn(projectName, presenterName, presenterJSON);
      }, null
    );
  }
}


class GraphView extends AView {
  constructor(presenterName, viewName) {
    super(AView.GRAPH_VIEW, presenterName, viewName);
  }

  getDefaultJSON() {
    return {
      "xAxis": "",
      "yAxes": [],
      "graphTypes": "",
      "xAxisTitle": "",
      "yAxisTitle": "",
      "categoryLabels": false,
      "gridX": false,
      "gridY": false,
      "logScale": false,
      "manData": {},
      "subchart": false,
      "zoom": false
    };
  }

  drawView(viewJSON, viewDIV) {
    try {
      let data = presenterData.get(this.presenterName);
      let xAxis = viewJSON["xAxis"];
      let yAxes = viewJSON["yAxes"]; 

      let grafData = generateXColumns(data, xAxis, yAxes);

      let chart = drawChart(grafData, viewJSON, viewDIV);    
    
      // remember chart only if not in edit mode
      //if (this.mode == 0)
        this.chart = chart;
    } catch {}
  }

  fillControlsAfterDataChange() {
    let data = presenterData.get(this.presenterName);

    let xAxis = this.viewJSON["xAxis"];
    fillSelector(data[0], xAxis, 'selected_x_'+this.viewID, "");  
  }


  fillDataAndWireControls() {
    let data = presenterData.get(this.presenterName);
    let xAxis = this.viewJSON["xAxis"];
    let yAxes = this.viewJSON["yAxes"];
    let yData = addGroupAsterisks(data[0]);
    
    fillSelector(data[0], xAxis, 'selected_x_'+this.viewID, "");
    wireControl(this, "selected_x", "xAxis", "change");


    fillSelector(yData, yAxes, 'selected_y_'+this.viewID, "Select y");
    wireControl(this, "selected_y", "yAxes", "change");

    wireCheckbox(this, "zoom"             , "zoom");
    wireCheckbox(this, "showSubchart"     , "subchart");
    wireCheckbox(this, "showXGridLines"   , "gridX");
    wireCheckbox(this, "showYGridLines"   , "gridY");
    wireCheckbox(this, "logarithmicScale" , "logScale");
    wireCheckbox(this, "useCategoryLabels", "categoryLabels");

    wireControl(this, "xAxisTitle", "xAxisTitle", "keyup");
    wireControl(this, "yAxisTitle", "yAxisTitle", "keyup");
    wireControl(this, "graphType",  "graphTypes", "change");

    this.draw();
  }

  repaint() {
    this.chart.flush()
  }
    
  getEditorControls(id) {
    var cont = `   
    <div class='box'>
        <div class='w3-row'>
            <div class='w3-col s6'>
                <div style='margin-left: 5px; margin-right: 5px;'>
                    <label for="selected_x_${id}">X:</label>
                    <select class="w3-select" id="selected_x_${id}" style="width: 100%;">
                    </select>
                </div>
            </div>
            <div class='w3-col s6'>
                <div style='margin-left: 5px; margin-right: 5px;'>
                    <label for="selected_y_${id}">Y:</label>
                    <select id="selected_y_${id}" multiple="multiple" style="width: 100%;">
                    </select>
                </div>
            </div>
        </div>
    </div>
    <div class='w3-col s6'>
        <div class='box'>
            <div class='w3-row'>
                <input class="w3-check"  id='zoom_${id}' type="checkbox">
                <label>Zoom</label>
            </div>
            <div class='w3-row'>
                <input class="w3-check"  id='showSubchart_${id}' type="checkbox" >
                <label>Show subchart</label>
            </div>
            <div class='w3-row'>
                <input class="w3-check"  id='showXGridLines_${id}' type="checkbox" >
                <label>Show x grid lines</label>
            </div>
            <div class='w3-row'>
                <input class="w3-check"  id='showYGridLines_${id}' type="checkbox" >
                <label>Show y grid lines</label>
            </div>
            <div class='w3-row'>
                <input class="w3-check"  id='logarithmicScale_${id}' type="checkbox" >
                <label>Logarithmic scale</label>
            </div>
            <div class='w3-row'>
                <input class="w3-check"  id='useCategoryLabels_${id}' type="checkbox" >
                <label>Use category labels</label>
            </div>
        </div>
    </div>
    <div class='w3-col s6'>
        <div class='box'>
            <div class='w3-row'>
                <label for="graphType">Graph type:</label>
                <select class="w3-select" id="graphType_${id}" name="graphType" style="width: 100%;">
                    <option id="line"   value="line">Line chart</option>
                    <option id="spline" value="spline">Spline chart</option>
                    <option id="bar"    value="bar">Bar chart</option>
                    <option id="area"   value="area">Area chart</option>
                    <option id="pie"    value="pie">Pie chart</option>
                    <option id="donut"  value="donut">Donut chart</option>
                    <option id="other"  value="other">Other...</option>
                  </select>
            </div>
            <div class='w3-row'>
                <label for="xAxisTitle_${id}">X axis label:</label>
                <input id='xAxisTitle_${id}' name='xAxisTitle' class="w3-input w3-border w3-round" type="text" style="width: 100%; height: 30px">
            </div>
            <div class='w3-row'>
                <label for="yAxisTitle_${id}">Y axis label:</label>
                <input id='yAxisTitle_${id}' name='yAxisTitle' class="w3-input w3-border w3-round" type="text" style="width: 100%; height: 30px">
            </div>
        </div>
    </div>`;
  
    return cont;
  }
}

class TableView extends AView {
  constructor(presenterName, viewName) {
    super(AView.TABLE_VIEW, presenterName, viewName);
  }

  getDefaultJSON() {
    return {
      "Columns": []
    };
  }

  drawView(viewJSON, viewDIV) {
    try {
      let data    = presenterData.get(this.presenterName);
      let columns = viewJSON["Columns"]; 

      let tableData = filterColumns(data, columns);
      drawTable(tableData, viewDIV, "370px");    
    } catch {}
  }

  fillControlsAfterDataChange() {
    let data    = presenterData.get(this.presenterName);
    let selectedColumns =  this.viewJSON["Columns"]; 

    let columnValues = addGroupAsterisks(data[0]);
    fillSelector(columnValues, selectedColumns, 'selected_columns_'+this.viewID, "Select columns");
  }


  fillDataAndWireControls() {
    let data    = presenterData.get(this.presenterName);
    let selectedColumns =  this.viewJSON["Columns"]; 

   
    let columnValues = addGroupAsterisks(data[0]);
    fillSelector(columnValues, selectedColumns, 'selected_columns_'+this.viewID, "Select columns");
    wireControl(this, "selected_columns", "Columns", "change");
  
    this.draw();
  }

  getEditorControls(id) {
    var cont = `    
        <div class='box'>
            <div class='w3-row'>
                <div class='w3-col s12'>
                    <label for='selected_columns'>Columns:</label>
                    <select name="selected_columns" id="selected_columns_${id}" multiple="multiple" style="width: 100%;">
                    </select> 
                </div>
            </div>
        </div>`;
  
    return cont;
  }
}

class ALayout {
  constructor() {
    this.views = new Map();
  }
}
let aLayout = new ALayout();

function getViewID(presenterName, viewName) {
  return presenterName + "_" + viewName;
}

function getViewOfType(type, presenterName, viewName) {
  var view   = new AView(AView.UNKNOWN_VIEW, presenterName, viewName);
  switch(type) {
    case AView.GRAPH_VIEW:
      view = new GraphView(presenterName, viewName);
      break;
    case AView.TABLE_VIEW:
      view = new TableView(presenterName, viewName);
      break;
    case AView.TEXTBOX_VIEW:
      view = new TextboxView(presenterName, viewName);
      break;
  }
  return view;
}


// creates a new view to given presenter  and adds it to aLayout
function createNewView(presenterName, viewName) {
  let viewType = viewName.split("_")[0];
  let view     = getViewOfType(viewType, presenterName, viewName);
  var viewID   = getViewID(presenterName, viewName);
  aLayout.views.set(viewID, view);
}

function getView(presenterName, viewName) {
  var viewID = getViewID(presenterName, viewName);
  return aLayout.views.has(viewID) ?  aLayout.views.get(viewID) : new AView(AView.UNKNOWN_VIEW, viewID);
}

function editView(presenter, viewName, mode, aView) {
  freezOtherDivs(presenter, '.presenterTab');

  // ko editView klicem z mode == 1 (edit), view ni podan; ko ga 
  // klicem z mode == 2 (new) pa je view ze podan (nov, inicializiran view)
  if (mode == 1) {
    aView = getView(presenter, viewName);
    aView.initEditMode();
  }
  var contDiv = document.getElementById("viewCont_edit_"+presenter);
  contDiv.setAttribute("viewname", viewName);
  contDiv.setAttribute("viewmode", mode);
  contDiv.innerHTML = aView.getEditorHTML();

  aView.fillDataAndWireControls();   

  document.getElementById(`views_${presenter}`).style.display = 'none';
  document.getElementById(`editView_${presenter}`).style.display = 'block';

  wireButton(presenter+"_cancel", editViewCancel, presenter);
  wireButton(presenter+"_ok",     editViewOK,     presenter);

  document.getElementById(`presenterEditButtons_${presenter}`).style.display = 'none';
  document.getElementById(`OKCancelButtons_${presenter}`).style.display = 'flex';
  

  scrollToPresenter(presenter);
  aView.draw();
}

function hideViewEdit(presenter) {
  unfreezDivs('.presenterTab');
  document.getElementById(`views_${presenter}`).style.display = 'block';
  document.getElementById(`editView_${presenter}`).style.display = 'none';

  document.getElementById(`presenterEditButtons_${presenter}`).style.display = 'block';
  document.getElementById(`OKCancelButtons_${presenter}`).style.display = 'none';

  repaintViews();
}

function editViewCancel(event) {
  let presenterName = event.data.param1;
  hideViewEdit(presenterName);
}

function editViewOK(event) {
  let presenterName = event.data.param1;  
  hideViewEdit(presenterName);

  var contDiv  = document.getElementById("viewCont_edit_"+presenterName);
  var viewName = contDiv.getAttribute("viewname"); 
  var mode     = contDiv.getAttribute("viewmode"); 
  
  let presenterJSON = presenterJSONs.get(presenterName);

  let view;
  if (mode == "1") {
    view          = getView(presenterName, viewName);    
  } else if (mode == "2") {
    view = newViewObject;    
    if (!("Layout" in presenterJSON)) presenterJSON["Layout"] = [];
    presenterJSON.Layout.push([viewName]);
    aLayout.views.set(view.viewID, view);
    addViewHtmlToPresenter(presenterName, viewName);
    makeDraggable();
  }
  view.mode = 0;  
  presenterJSON[viewName] = view.viewJSON;
  view.preSavePresenter(savePresenter, projectName, presenterName, presenterJSON);
  view.draw(); 
}

function getViewsDropDownItems(pName) {
  let result = "";
  let views = AView.registeredViews;
  for (let i = 0; i < views.length; i++)
    result += `<div class="newviewitem" onclick="startNewView('${views[i]}', '${pName}');">${views[i]}</div>`;
  return result;
}

function savePresenter(projectName, presenterName, presenterJSON, actionPhase2) {
  let json = JSON.stringify(presenterJSON);
  askServer(actionPhase2, projectName, "savePresenter", 
     `alter {'Action':'SavePresenter', 'ProjectName':'${projectName}', 'PresenterName':'${presenterName}', 'PresenterData':${json}}` );
}


// uporabljam v layout.html (za postavitev obstoječih) in tu (za nov) view
function getViewOuterHtml(presenterName, viewName) {
  return `
    <div class="w3-col" name="${presenterName}_${viewName}_outer">
      <div class='drop-target presenterBox' data-presenter-name="${presenterName}">
        <div class='draggable' data-presenter-name="${presenterName}"> 
          <div>
            <div class='icons-container'>
              <div class='editMode'>
                <i class="fa-solid fa-pen-to-square icon " 
                  onclick="editView('${presenterName}', '${viewName}', 1)"></i>
                <i class="fa-solid fa-times icon"
                  onclick="deletePresenterView('${presenterName}', '${viewName}')"></i>
              </div>
            </div>
            <div id="view_${presenterName}_${viewName}"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function addViewHtmlToPresenter(presenterName, viewName) {
    var newViewHTML = '<div class="w3-row">' + getViewOuterHtml(presenterName, viewName) + '</div>';
    var container = $('.' + presenterName);
    container.append(newViewHTML);
}

function startNewView(viewType, presenterName) {
    let number = getNextViewNumber(presenterJSONs.get(presenterName), viewType);
    let viewName = viewType + "_" + number;
    newViewObject = getViewOfType(viewType, presenterName, viewName); 
    newViewObject.initNewMode();
    editView(presenterName, viewName, 2, newViewObject);
}

