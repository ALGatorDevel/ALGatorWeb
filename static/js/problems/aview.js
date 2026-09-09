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
      <div id="preview_${id}" class='w3-row'></div> 
      <div style="margin-top:20px">${controls}</div>
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
    this.viewJSON = pp.presenterJSONs.get(this.presenterName)[this.viewName];
    // Deep-copy so Cancel can restore the original values even after in-place mutations
    // (e.g. data_source change modifies viewJSON directly before the user clicks Cancel).
    this._viewJSONBackup = JSON.parse(JSON.stringify(this.viewJSON));
  }

  initNewMode() {
    this.mode = 2;
    this.viewJSON = this.getDefaultJSON();
  }

  // ce je mode !=0, potem view izrise v div z id=preview_viewID
  // sicer v div z id=view_viewID
  draw() {
    if (this.mode == 0) { // draw view in a given presenter
      this.drawView(pp.presenterJSONs.get(this.presenterName)[this.viewName], "view_"+this.viewID);
    } else if (this.hasPreview){ // draw view in edit mode in preview 
      this.drawView(this.viewJSON, "preview_"+this.viewID);
    }
  } 

  // some views can refresh content faster than redraw; those views should overrid this method
  repaint() {this.draw()}

  // to be overriden
  drawView(viewJSON, viewDIV) {}

  getCurrentJSON() {return {};}

  getViewData(viewJSON) {
    const activePde = this.presenterName === playgroundID ? playgroundPde : pde;
    return activePde.boxes.find(n => n.id === (viewJSON ?? this.viewJSON)["data_source"])?.data;
  }
}

class TextboxView extends AView {
   constructor(presenterName, viewName) {
    super(AView.HTML_VIEW, presenterName, viewName);
    this.hasPreview    = true;
  }
  getDefaultJSON() {
    return {
      "htmltext": "",
      "height": 450,
      "verticalAlignment": "top",
    };
  }
  drawView(viewJSON, viewDIV) {
    try {
      let htmltext = viewJSON["htmltext"];
      htmltext     = replaceDolarStaticWithStaticWebuploadLink(htmltext);
      const activePde = (typeof playgroundID !== 'undefined' && this.presenterName === playgroundID)
                        ? playgroundPde : pde;
      htmltext = resolveTextboxTemplate(htmltext, activePde);
      const vAlign = viewJSON["verticalAlignment"] || "top";
      this.drawTextbox(htmltext, viewDIV, true, vAlign);
    } catch {}
  }
  drawTextbox(htmltext, viewDIV, format=true, vAlign='top') {
    const justifyMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
    const justify = justifyMap[vAlign] || 'flex-start';
    let div = document.getElementById(viewDIV);
    if (div != null) {
      div.innerHTML = `<div style="height:100%; display:flex; flex-direction:column; justify-content:${justify}; overflow:auto;">
        <div>${htmltext}</div>
      </div>`;
    }
    if (format) formatMath(div);
  }

  // Override base getEditorHTML.
  // Show the live preview pane only when editing inside the Presentation section
  // (where pde data interpolation via $token{} is meaningful and the container has
  // a defined height that makes the flex layout work).
  // In all other sections (Problem Overview, Algorithms, …) fall back to the plain
  // base-class layout so the editor is not squished to zero width.
  getEditorHTML() {
    let id       = getViewID(this.presenterName, this.viewName);
    let controls = this.getEditorControls(id);

    // Detect Presentation section: the presenterName exists in PagePresenters.
    const inPresentation = typeof pp !== 'undefined' && pp.presenterJSONs
                           && pp.presenterJSONs.has(this.presenterName);

    // Keep hasPreview in sync so draw() knows whether to render into the preview div.
    this.hasPreview = inPresentation;

    if (!inPresentation) {
      // Plain layout — identical to base AView.getEditorHTML()
      return `
        <div id="preview_${id}" class='w3-row'></div>
        <div style="margin-top:20px">${controls}</div>
      `;
    }

    // Presentation section: editor on top, live-preview on bottom
    return `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="flex:1; min-height:0;">
          ${controls}
        </div>
        <div style="flex:1; min-height:0; display:flex; flex-direction:column;">
          <div style="font-size:12px; color:#888; margin-bottom:4px; font-style:italic;">Preview</div>
          <div id="preview_${id}" style="border:1px solid #e0e0e0; border-radius:4px; padding:8px; min-height:80px; overflow:auto;"></div>
        </div>
      </div>
    `;
  }

  fillDataAndWireControls(onChange) {
    let htmlEditor = document.getElementById(`htmltext_${this.viewID}`);
    let htmltext = this.viewJSON["htmltext"];
    htmlEditor.innerHTML = htmltext;
    const tex = window.tex;
    let self = this;

    // myVerticalAlign and myInsertData are only meaningful in the Presentation section
    // (where PDE data interpolation is available); hide them everywhere else.
    const inPresentation = this.hasPreview;
    const buttons = [
      'html', "divider", "undo", "redo", "divider",
      "fontSize", "textColor", "textBackColor", "divider",
      "bold", "italic", "underline", "strikethrough", "divider",
      "heading1", "heading2", "divider",
      "olist", "ulist", "divider",
      "code", "line", "link", "divider",
      "indent", "outdent", "divider",
      "justifyCenter", "justifyFull", "justifyLeft", "justifyRight",
      ...(inPresentation ? ["myVerticalAlign", "myInsertData"] : []),
      "divider", "myUpload", "myResource",
    ];
    const plugins = [
      getUploadImagePlugin(this.viewID),
      getUploadResourcePlugin(this.viewID),
      ...(inPresentation ? [getVerticalAlignPlugin(self), getInsertDataPlugin(self)] : []),
    ];

    tex.init({
       element: htmlEditor,
       buttons,
       paragraphSeparator: 'div',
       cssStyle: true,
       theme: 'light', // or 'dark'
       onChange: (content) => {
         self.viewJSON["htmltext"] = content;
         if (onChange) onChange();
         // Debounce preview refresh and PDE usage badges
         clearTimeout(self._previewTimer);
         self._previewTimer = setTimeout(() => {
           self.draw();
           if (typeof pde !== 'undefined' && pde) pde.updateUsageBadges();
         }, 250);
       },
       plugins,
    });
  }

  getEditorControls(id) {
    var cont = `
      <div class='box' id="htmlEditorView_${id}">
        <div class='w3-row'>
            <div class='w3-col s12'>
              <form id="imageUploadForm">
                <input type="file" id="imageInput_${id}" accept="image/*" style="display: none;" onchange="uploadAndInsertImage('${id}', event)">
                <input type="file" id="resourceInput_${id}" accept="*" style="display: none;" onchange="uploadAndInsertResource('${id}', event)">
              </form>
              <div id="htmltext_${id}"></div>
            </div>
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
    const activePde = this.presenterName === playgroundID ? playgroundPde : pde;
    const firstNode = activePde.boxes.find(n => ['Q', 'GF', 'T', 'C'].includes(n.type));

    return {
      "xAxis": "",
      "yAxes": [],
      "filterX": "",
      "countTable":"",
      "graphTypes": "",
      "xAxisTitle": "",
      "yAxisTitle": "",
      "categoryLabels": false,
      "labelsXTrfs":"",
      "labelsYTrfs":"",
      "stripPrefix":false,
      "stripSuffix":false,
      "gridX": false,
      "gridY": false,
      "logXScale": false,
      "logYScale": false,
      "logXbase":"e",
      "logYbase":"e",
      "manData": {},
      "subchart": false,
      "zoom": false,
      "reuseColors": false,
      "data_source": firstNode ? firstNode.id : "",
      "height": 450,
    };
  }

  drawView(viewJSON, viewDIV) {
    try {
      let data = this.getViewData(viewJSON);

      let xAxis = viewJSON["xAxis"];
      let yAxes = viewJSON["yAxes"];

      let grafData = data;

      // filtriranje po kriteriju (npr. "n > 1000 and m < 5") in grupiranje)
      if (viewJSON["filterX"]) {
        const ops = viewJSON["filterX"];
        grafData = groupbyFilterData(grafData, ops);
      }
      if (viewJSON["countTable"]) {
        const ctParts = viewJSON["countTable"].split("@");
        grafData = createCountTable(grafData, ctParts[0], ctParts[1]);
      }
      this.graphData = grafData;
      this.fillControlsAfterDataChange();

      grafData = generateXColumns(grafData, xAxis, yAxes);

      // Read the flex-determined height NOW (before C3 can stamp its own 350px).
      // This is the only moment the container correctly reflects the box size.
      const el = document.getElementById(viewDIV);
      const flexH = el ? el.offsetHeight : 0;
      if (el && flexH > 0) el.style.height = flexH + 'px'; // pre-stamp for C3

      let chart = drawChart(grafData, viewJSON, viewDIV);
      this.chart = chart;

      // Restore flex control and do a final resize so the chart fills the container.
      const self = this;
      const targetH = flexH;
      setTimeout(() => {
        const el2 = document.getElementById(viewDIV);
        if (el2) {
          el2.style.maxHeight = '';   // remove C3's max-height cap
          requestAnimationFrame(() => {
            if (self.chart && el2) {
              const h = el2.offsetHeight;
              self.chart.resize({ height: h > 0 ? h : (targetH || 350) });
            }
          });
        }
      }, 0);
    } catch {}
  }

  fillControlsAfterDataChange() {
    let data = this.graphData ? this.graphData : this.getViewData();

    let xAxis = this.viewJSON["xAxis"];
    fillSelector(data[0], xAxis, 'selected_x_'+this.viewID, "");  

    let yAxes = this.viewJSON["yAxes"];
    let yData = data ? addGroupAsterisks(data[0]) : "";
    fillSelector(yData, yAxes, 'selected_y_'+this.viewID, "Select y");
  }


  fillDataAndWireControls() {
    let data = this.getViewData();
    let xAxis = this.viewJSON["xAxis"];
    let yAxes = this.viewJSON["yAxes"];
    
    let xData = data ? data[0]                    : "";
    let yData = data ? addGroupAsterisks(data[0]) : "";

    let filterX = this.viewJSON["filterX"] || "";
    
    fillSelector(xData, xAxis, 'selected_x_'+this.viewID, "");
    wireControl(this, "selected_x", "xAxis", "change");

    fillSelector(yData, yAxes, 'selected_y_'+this.viewID, "Select y");
    wireControl(this, "selected_y", "yAxes", "change");

    fillSelector(["groupby: ", "filter: "], filterX, 'filter_x_'+this.viewID, "Enter filter and/or groupby");
    wireControl(this, "filter_x", "filterX", "change");

    wireControl (this, "count_table"      ,    "countTable", "change");

    wireCheckbox(this, "zoom"             ,    "zoom");
    wireCheckbox(this, "showSubchart"     ,    "subchart");
    wireCheckbox(this, "showXGridLines"   ,    "gridX");
    wireCheckbox(this, "showYGridLines"   ,    "gridY");
    wireCheckbox(this, "logarithmicXScale" ,   "logXScale");
    wireControl (this, "logXBase", "logXbase", "keyup");
    wireCheckbox(this, "logarithmicYScale" ,   "logYScale");
    wireControl (this, "logYBase", "logYbase", "keyup");
    wireCheckbox(this, "reuseColors",          "reuseColors");


    wireCheckbox(this, "useCategoryLabels",  "categoryLabels");
    wireControl (this, "labelsXTrfs", "labelsXTrfs", "keyup");
    wireControl (this, "labelsYTrfs", "labelsYTrfs", "keyup");

    wireCheckbox(this, "stripSuffix",  "stripSuffix");
    wireCheckbox(this, "stripPrefix",  "stripPrefix");


    wireControl(this, "xAxisTitle", "xAxisTitle", "keyup");
    wireControl(this, "yAxisTitle", "yAxisTitle", "keyup");
    wireControl(this, "graphType",  "graphTypes", "change");
    
    const activePde = this.presenterName === playgroundID ? playgroundPde : pde;
    fillDataSourceSelector('data_source_' + this.viewID, this.viewJSON["data_source"], activePde);
    
    $('#data_source_' + this.viewID).on('change', () => {
      this.viewJSON["data_source"] = $('#data_source_' + this.viewID).val();
      this.viewJSON["xAxis"] = "";
      this.viewJSON["yAxes"] = [];

      this.viewJSON["filterX"] = "";
      $('#filter_x_' + this.viewID).val(null).trigger('change');

      window._presenterViewDirty = true;
      this.draw();
    });

    this.draw();
  }

  repaint() {
    if (this.chart)
      this.chart.flush()
  }

    
  box12() {
    return `
    <div class='box'>
      <div class='w3-row' style="display: flex;align-items: flex-start;">
      
        <div class="w3-col s6">  
          <label for="data_source_${id}" style="padding-right:10px;">Data source:</label>
          <select class="w3-select" id="data_source_${id}" style="width:60%;"></select>
        </div>

        <div class="w3-col s6">  
          <label for="filter_x_${id}" style="padding-right:10px;">Filter and group ${infoButton('filterX')}</label>
          <select id="filter_x_${id}" multiple="multiple" style=""></select>            
          <i class="far fa-list-alt icon" style="padding:6px 5px; cursor:pointer;" onclick="showGraphData('${id}')"></i>
        </div>
      </div>
    </div>      
    
    <div class='box'>
      <div class='w3-row' style="display: flex;align-items: flex-start;">
        <div class='w3-col s6'>
          <div style='margin-left: 5px; margin-right: 5px;'>
            <label for="selected_x_${id}" style="padding-right:10px;">X:</label>
            <select class="w3-select" id="selected_x_${id}" style="width: 90%;"></select>
          </div>
        </div>
        <div class='w3-col s6'>
          <div style='margin-left: 5px; margin-right: 5px;'>
            <label for="selected_y_${id}">Y:</label>
            <select id="selected_y_${id}" multiple="multiple" style="width: 90%;"></select>
          </div>
        </div>        
      </div>
    </div>
    `;
  }

  getEditorControls(id) {
    var cont = `   
    
<div class='box'>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: center; width:100%;">
    <div style="display: flex; align-items: center;">
      <label for="data_source_${id}" style="width:125px; flex-shrink:0;">Data source:</label>
      <div style="flex:1; min-width:0;">
        <select class="w3-select" id="data_source_${id}" style="width:100%;"></select>
      </div>
    </div>
    <div style="display: flex; align-items: center;">
      <label style="width:125px; flex-shrink:0;">Filter and group ${infoButton('filterX')}</label>
      <div style="flex:1; min-width:0;">
        <select id="filter_x_${id}" multiple="multiple" style="width:100%;"></select>
      </div>
      <i class="far fa-list-alt icon" style="padding:6px 5px; cursor:pointer;" onclick="showGraphData('${id}')"></i>
    </div>
  </div>
</div>

<div class='box'>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: center; width:100%;">
    <div style="display: flex; align-items: center;">
      <label for="selected_x_${id}" style="width:125px; flex-shrink:0;">X:</label>
      <div style="flex:1; min-width:0;">
        <select class="w3-select" id="selected_x_${id}" style="width:100%;"></select>
      </div>
    </div>
    <div style="display: flex; align-items: center;">
      <label for="selected_y_${id}" style="width:125px; flex-shrink:0;">Y:</label>
      <div style="flex:1; min-width:0;">
        <select id="selected_y_${id}" multiple="multiple" style="width:100%;"></select>
      </div>
    </div>
  </div>
</div>

    <div class='w3-col s6'>
      <table class="graphset">
        <tr>
          <td> <input class="w3-check"  id='zoom_${id}' type="checkbox">
               <label>Zoom</label>
          <td> <input class="w3-check"  id='showSubchart_${id}' type="checkbox" >
               <label>Subchart</label>
        </tr>
        <tr>
          <td> <input class="w3-check"  id='showXGridLines_${id}' type="checkbox" >
               <label>X grid lines</label>
          <td> <input class="w3-check"  id='showYGridLines_${id}' type="checkbox" >
               <label>Y grid lines</label>
        </tr>
        <tr>
          <td> <input class="w3-check"  id='logarithmicXScale_${id}' type="checkbox" >
               <label>Logarithmic x-axis (base: </label> <input type=text id='logXBase_${id}' style="width:30px;margin-bottom:0px" value="e"><label>)</label> 
          <td> <input class="w3-check"  id='logarithmicYScale_${id}' type="checkbox" >
               <label>Logarithmic y-axis (base: </label> <input type=text id='logYBase_${id}' style="width:30px;margin-bottom:0px" value="e"><label>)</label>
        </tr>
        <tr>
          <td> <input class="w3-check"  id='useCategoryLabels_${id}' type="checkbox" >
               <label>Category labels</label>
          <td> <input class="w3-check"  id='reuseColors_${id}' type="checkbox" >
               <label>Re-use algorithm color</label>

        </tr>
        <tr>        
          <td style="padding-top:10px;"> <label>Transform x labels</label>${infoButton('labels_list_x')}<br>
               <input type=text id='labelsXTrfs_${id}' style="width:220px;">
          <td style="padding-top:10px;"> <label>Transform y labels</label>${infoButton('labels_list_y')}<br>
               <input type=text id='labelsYTrfs_${id}' style="width:220px;">
        </tr>
        <tr>
          <td> <input class="w3-check"  id='stripPrefix_${id}' type="checkbox" >
               <label>Trim shared legend label prefixes</label>
          <td> <input class="w3-check"  id='stripSuffix_${id}' type="checkbox" >
               <label>Trim shared legend label suffixes</label>
        </tr>
        </table>
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
    const activePde = this.presenterName === playgroundID ? playgroundPde : pde;
    const firstNode = activePde.boxes.find(n => ['Q', 'GF', 'T', 'C'].includes(n.type));    
    
    return {
      "Columns": [],
      "HasAverage": false,
      "data_source": firstNode ? firstNode.id : "",
      "height": 450,
    };
  }

  drawView(viewJSON, viewDIV) {
    try {
      let data = this.getViewData(viewJSON);
      let columns = viewJSON["Columns"];
      let avg     = viewJSON["HasAverage"];

      let tableData = filterColumns(data, columns);
      drawTable(tableData, viewDIV, '100%', avg);
    } catch {}
  }

  fillControlsAfterDataChange() {
    let data = this.getViewData();
    let selectedColumns =  this.viewJSON["Columns"]; 

    let columnValues = addGroupAsterisks(data[0]);
    fillSelector(columnValues, selectedColumns, 'selected_columns_'+this.viewID, "Select columns");
  }


  fillDataAndWireControls() {
    let data = this.getViewData();
    let selectedColumns =  this.viewJSON["Columns"]; 

    const activePde = this.presenterName === playgroundID ? playgroundPde : pde;
    fillDataSourceSelector('data_source_' + this.viewID, this.viewJSON["data_source"], activePde);
    
    $('#data_source_' + this.viewID).on('change', () => {
      this.viewJSON["data_source"] = $('#data_source_' + this.viewID).val();
      this.viewJSON["Columns"] = [];
      window._presenterViewDirty = true;
      this.fillControlsAfterDataChange();
      this.draw();
    });

    if (data) {
      let columnValues = addGroupAsterisks(data[0]);
      fillSelector(columnValues, selectedColumns, 'selected_columns_'+this.viewID, "Select columns");
    }

    wireControl(this, "selected_columns", "Columns", "change");
    wireCheckbox(this, "has_average" , "HasAverage");


    this.draw();
  }

  getEditorControls(id) {
    var cont = `    
        <div class='box'>
          <div class='w3-row'>
            <span style="display: inline-block; width:90px"><label for="data_source_${id}">Data source:</label></span>
            <select class="w3-select" id="data_source_${id}" style="width:75%;"></select>
          </div>
        </div>

        <div class='box'>
            <div class='w3-row'>
                <div class='w3-col s12'>
                    <span style="display: inline-block; width:90px"><label for="selected_columns_${id}">Columns:</label></span>
                    <select name="selected_columns" id="selected_columns_${id}" multiple="multiple" style="width: 75%;"></select>
                    <input type=checkbox id="has_average_${id}" style="margin-left:15px"><label for="has_average_${id}"> Statistics</label>
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

  // Reset the dirty flag, then start watching for user-driven changes.
  // setTimeout(0) defers the listener attachment past any init-time events
  // that fillDataAndWireControls() may fire programmatically.
  window._presenterViewDirty = false;
  setTimeout(() => {
    const markDirty = () => { window._presenterViewDirty = true; };
    contDiv.addEventListener('input',  markDirty);
    contDiv.addEventListener('change', markDirty);
    contDiv.addEventListener('click',  e => {
      if (e.target.matches('button,input,select,textarea')) markDirty();
    });
  }, 0);

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
  window._presenterViewDirty = false;
  unfreezDivs('.presenterTab');
  document.getElementById(`views_${presenter}`).style.display = 'block';
  document.getElementById(`editView_${presenter}`).style.display = 'none';

  document.getElementById(`presenterEditButtons_${presenter}`).style.display = 'block';
  document.getElementById(`OKCancelButtons_${presenter}`).style.display = 'none';

  repaintViews();
}

function editViewCancel(event) {
  let presenterName = event.data.param1;
  // Restore viewJSON to the state it was in when the editor opened, so that any
  // in-place mutations (e.g. data_source change) are rolled back on cancel.
  const contDiv = document.getElementById('viewCont_edit_' + presenterName);
  const viewName = contDiv ? contDiv.getAttribute('viewname') : null;
  if (viewName) {
    const view = getView(presenterName, viewName);
    if (view && view._viewJSONBackup) {
      const backup = view._viewJSONBackup;
      // Restore in-place so all existing references remain valid.
      Object.keys(view.viewJSON).forEach(k => { if (!(k in backup)) delete view.viewJSON[k]; });
      Object.assign(view.viewJSON, backup);
      view._viewJSONBackup = null;
    }
  }
  hideViewEdit(presenterName);
}

function editViewOK(event) {
  let presenterName = event.data.param1;  
  hideViewEdit(presenterName);

  var contDiv  = document.getElementById("viewCont_edit_"+presenterName);
  var viewName = contDiv.getAttribute("viewname"); 
  var mode     = contDiv.getAttribute("viewmode"); 
  
  let presenterJSON = pp.presenterJSONs.get(presenterName);

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
  if (typeof pde !== 'undefined' && pde) pde.updateUsageBadges();
}

function getViewsDropDownItems(pName) {
  let result = "";
  let views = AView.registeredViews;
  for (let i = 0; i < views.length; i++)
    result += `<div class="newviewitem" onclick="startNewView('${views[i]}', '${pName}');">${views[i]}</div>`;
  return result;
}

// Returns a Promise that resolves once the save has actually reached the
// server (success or failure) -- callers that need the write to be durable
// before proceeding (e.g. migratePresenterIfNeeded) can now await it, and
// beginPendingSave/endPendingSave keep the beforeunload guard accurate even
// for callers that don't await.
// `reason` is a human-readable description of what triggered this save
// (e.g. "Saving presenter 'X' after resizing view 'Y'") -- shown verbatim in
// the error popup so a rejection is traceable to the action that caused it,
// instead of a bare "Access denied." Falls back to a generic description if
// omitted.
function savePresenter(projectName, presenterName, presenterJSON, actionPhase2, reason) {
  let json = presenterToCleanString(presenterJSON);
  beginPendingSave();
  return new Promise(resolve => {
    askServer(
      (pName, key, jResp, param1, param2) => {
        if (actionPhase2) actionPhase2(pName, key, jResp, param1, param2);
        endPendingSave();
        resolve(jResp);
      },
      projectName, "savePresenter",
      `alter {'Action':'SavePresenter', 'ProjectName':'${projectName}', 'PresenterName':'${presenterName}', 'PresenterData':${json}}`,
      (response) => {   // callbackError
        endPendingSave();
        showSaveError(reason || `Saving presenter '${presenterName}'`, response);
        resolve(null);
      }
    );
  });
}


// uporabljam v results.html (za postavitev obstoječih) in tu (za nov) view
function getViewOuterHtml(presenterName, viewName) {
  let pEID = getPresenterEID(presenterName);
  const vJSON  = (typeof pp !== 'undefined' && pp.presenterJSONs)
                 ? (pp.presenterJSONs.get(presenterName)?.[viewName] ?? {}) : {};
  const height = vJSON.height ?? 450;

  const iconsContainerDivId = "icons_container_" + presenterName + "_" + viewName;
  flexEditButtons.set(iconsContainerDivId, "flex");

  return `
    <div class="w3-col" name="${presenterName}_${viewName}_outer">
      <div class='drop-target presenterBox'
           data-presenter-name="${presenterName}">
        <div class='draggable' style="flex:1; display:flex; flex-direction:column; min-height:0;"
             data-presenter-name="${presenterName}">
          <div class="view-outer-wrap"
               onclick="handleViewClick(event,'${presenterName}','${viewName}')">
            <div id="${iconsContainerDivId}" class='icons-container editMode' w="${pEID} cw">
              <div class='editMode' w="${pEID} cw">
                <i class="far fa-edit icon"
                  onclick="editView('${presenterName}', '${viewName}', 1)"
                  title="Edit view"></i>
                <i class="far fa-copy icon"
                  onclick="duplicatePresenterView('${presenterName}', '${viewName}')"
                  title="Duplicate view"></i>
                <i class="fas fa-times icon"
                  onclick="deletePresenterView('${presenterName}', '${viewName}')"
                  title="Remove view"></i>
              </div>
            </div>
            <div class="viewContainer" id="view_${presenterName}_${viewName}"
                 style="height:${height}px; min-height:0; overflow:hidden;"></div>
          </div>
        </div>
        <div class="editMode view-resize-handle" w="${pEID} cw"
             onmousedown="startViewResize(event,'${presenterName}','${viewName}')"
             title="Drag to resize"></div>
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
    let number = getNextViewNumber(pp.presenterJSONs.get(presenterName), viewType);
    let viewName = viewType + "_" + number;
    newViewObject = getViewOfType(viewType, presenterName, viewName); 
    newViewObject.initNewMode();
    editView(presenterName, viewName, 2, newViewObject);
}


function showGraphData(graphID) {
  let view = graphID.startsWith("playground") ? 
    playgroundViews.get(graphID.replaceAll("playground_","")) : aLayout.views.get(graphID);
  let data = array2DToHTMLTable(view.graphData);
  showModalDisplay("Graph data", data, 1, 95 );
}


/// -------------- Fullscreen view modal ------------------------

// Click anywhere on a view (outside interactive elements) to open fullscreen.
function handleViewClick(event, presenterName, viewName) {
  // In edit mode the user drags/edits — don't trigger fullscreen
  if (typeof isEditMode !== 'undefined' && isEditMode) return;

  // Walk up from the clicked element; bail if we pass through anything interactive
  const SKIP_TAGS    = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);
  const SKIP_CLASSES = [
    'icons-container',     // edit / delete icon bar
    'icon',                // individual icon buttons
    'c3-legend-item',      // C3 graph legend (toggles series visibility)
    'c3-legend-item-event',
  ];

  let el = event.target;
  while (el && el !== event.currentTarget) {
    if (SKIP_TAGS.has(el.tagName)) return;
    if (SKIP_CLASSES.some(cls => el.classList.contains(cls))) return;
    el = el.parentElement;
  }

  openViewFullscreen(presenterName, viewName);
}

function openViewFullscreen(presenterName, viewName) {
  const overlayId = 'aview-fullscreen-overlay';
  if (document.getElementById(overlayId)) return;

  const presJSON  = (typeof pp !== 'undefined' && pp.presenterJSONs)
                    ? (pp.presenterJSONs.get(presenterName) || {}) : {};
  const viewJSON  = presJSON[viewName] || {};
  const shortTitle = presJSON.ShortTitle || presenterName;
  const title = `${shortTitle} — ${viewName}`;
  const contentId = 'aview-fullscreen-content';

  const overlay = document.createElement('div');
  overlay.id        = overlayId;
  overlay.className = 'aview-fullscreen-overlay';
  overlay.innerHTML = `
    <div class="aview-fullscreen-modal">
      <div class="aview-fullscreen-header">
        <span class="aview-fullscreen-title">${title}</span>
        <button class="aview-fullscreen-close" onclick="closeViewFullscreen()" title="Close (Esc)">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="aview-fullscreen-body" id="${contentId}"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Draw view fresh into modal.
  // Table/Textbox fill 100% automatically via CSS; Graph needs chart.resize() after layout.
  const view = getView(presenterName, viewName);
  if (view) {
    view.drawView(viewJSON, contentId);
    if (view instanceof GraphView) {
      setTimeout(() => {
        const body = document.getElementById(contentId);
        if (!body || !view.chart) return;
        view.chart.resize({ width: body.clientWidth, height: body.clientHeight });
      }, 60);
    }
  } else {
    const src = document.getElementById(`view_${presenterName}_${viewName}`);
    if (src) document.getElementById(contentId).innerHTML = src.innerHTML;
  }

  overlay._escHandler = (e) => { if (e.key === 'Escape') closeViewFullscreen(); };
  document.addEventListener('keydown', overlay._escHandler);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeViewFullscreen(); });
}

function closeViewFullscreen() {
  const overlay = document.getElementById('aview-fullscreen-overlay');
  if (!overlay) return;
  document.removeEventListener('keydown', overlay._escHandler);
  overlay.remove();
}
/// -------------- View resize -----------------------------------
function startViewResize(e, presenterName, viewName) {
  e.preventDefault();
  e.stopPropagation();

  const viewEl = document.getElementById(`view_${presenterName}_${viewName}`);
  if (!viewEl) return;

  const startY = e.clientY;
  const startH = viewEl.offsetHeight;   // measure the content div, not the whole box

  document.body.style.userSelect = 'none';

  const onMove = (e) => {
    const newH = Math.max(10, startH + (e.clientY - startY));
    viewEl.style.maxHeight = '';   // remove C3's cap so the box can grow visually
    viewEl.style.height = newH + 'px';
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
    document.body.style.userSelect = '';

    const newH     = viewEl.offsetHeight;   // save content-div height
    const presJSON = (typeof pp !== 'undefined') ? pp.presenterJSONs.get(presenterName) : null;
    if (presJSON?.[viewName]) {
      presJSON[viewName].height = newH;
      savePresenter(projectName, presenterName, presJSON, null,
        `Saving presenter '${presenterName}' after resizing view '${viewName}'`);
    }

    const view = getView(presenterName, viewName);
    if (!view) return;

    if (view instanceof GraphView && view.chart) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!viewEl || !view.chart) return;
          viewEl.style.maxHeight = '';   // remove C3's max-height cap
          const h = viewEl.offsetHeight;
          if (h > 0) view.chart.resize({ height: h });
        });
      });
    } else {
      requestAnimationFrame(() => view.draw());
    }
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
}
/// -------------- PDE integration -------------------------------
function fillDataSourceSelector(selectorId, selectedId, activePde = pde) {
  const $sel = $('#' + selectorId);
  $sel.empty();
  activePde.boxes
    .filter(n => ['Q', 'GF', 'T', 'C'].includes(n.type))
    .forEach(n => $sel.append(new Option(`${n.name} (${n?.creationString ?? n?.type})`, n.id)));
  $sel.val(selectedId);
}
/// -------------- PDE integration -------------------------------
