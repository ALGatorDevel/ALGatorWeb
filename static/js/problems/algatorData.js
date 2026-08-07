async function getData(url, projectName, presenterJSON) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 60000); // TODO - popravi na normalno vrednost!

  const param = new URLSearchParams({
    csrfmiddlewaretoken: window.CSRF_TOKEN,
    q: `query {"ProjectName":"${projectName}", "Query":${JSON.stringify(presenterJSON.Query)}}}`
  });

  const response = await fetch(url, {
    method: "POST",
    body: param,
    signal: controller.signal
  });

  const json = await response.json();
  return parseResponse(json.answer);
}

// ******************* data manipuilation *************************


function parseResponse (response) {        
  let rawData = response.split('\n')
  let newData = [];
  for (let index = 0; index < rawData.length; index++) {
    if(index === 0){
        newData.push(rawData[index].split('"Answer": "')[1].split(';'));
    }
    else{
        newData.push(rawData[index].split(';'));            
    }
  }

  // remove trailing "} from the last element
  let i = newData.length-1;
  let j = newData[newData.length-1].length-1;
  if (newData[i][j].substring(newData[i][j].length-2) == '"}') 
    newData[i][j] = newData[i][j].slice(0,-2);

  return newData;
}


// Function to check if an array or Set contains a string
function containsString(data, str) {
    if (Array.isArray(data)) {
        return data.includes(str);
    } else if (data instanceof Set) {
        return data.has(str);
    } else {
        // Handle other data types if needed
        return false;
    }
}


function transpose(tabela) {
  return tabela[0].map(function(col, i) { 
      return tabela.map(function(row) { 
        return row[i]; 
      });
    });    
}
function contains(tab, value) {                
  for(var i=0; i<tab.length; i++) {
      var dvaVal = tab[i].split(".");
      if (tab[i] == value)
          return true;
      if (dvaVal.length == 2) {
          if ((dvaVal[0] == "*") && strEndsWith(value, "."+dvaVal[1]))
            return true;
          if ((dvaVal[1] == "*") && strStartsWith(value, dvaVal[0]+"."))
              return true;
      }
  }
  return false;
}
function strEndsWith(str, suffix) {
  return str.match(suffix+"$")==suffix;
}
function copyArray (array) {
  if (typeof array !== 'undefined') {
    const newArray = array.slice();;
//    var newArray = array.map(function (arr) {
//      return arr.slice();
//    });
    return newArray;
  } else 
    return null;
};


function addGroupAsterisks(data) {
    let suffixes = new Set();
    data.forEach(function(item) {
      if (item.includes(".")) {
        let pieces = item.split(/[.]/);
        let suffix = pieces[pieces.length-1];
        suffixes.add('*.'+suffix);
      }
    });
    data.forEach(function(item) {suffixes.add(item);});
    return suffixes;
  }


function removeElementFromArray(arr, value) {
  for (let i = 0; i < arr.length; i++) {
    let index = arr[i].indexOf(value);
    if (index !== -1) {
      arr[i].splice(index, 1);
      if (arr[i].length === 0) 
        arr.splice(i--, 1);
    }
  }
  return arr;
}


// *********************** HTML components **************************

// fills the values in data ([...])  to select control and sets selected value
function fillSelector(data, selected, selectroId, ePrompt){
  let wasSelect2 = false; let XSelector;

  try {
    XSelector = $('#'+selectroId);
    if (!XSelector || !XSelector.length) return;

    // do this only once (not after each empty()....)
    if (ePrompt != "" && !XSelector.data('select2')) {
      applySelect2Options(XSelector, {placeholder: ePrompt,allowClear: true, tags:true});
    }    
    
    XSelector.empty();
    
    // if data is a map, use only keys 
    if (data instanceof Map) 
      data = Array.from(data.keys());

    data.forEach(function(item) {
        XSelector.append(new Option(item, item)); 
    });
    selected.forEach(function(sitem) {
        if (!containsString(data,sitem)) 
          XSelector.append(new Option(sitem, sitem)); 
    });
  } catch (e) {}

  XSelector.val(selected);
  XSelector.trigger('change.select2');
}


// wire checkbox to view property: set the value of checkbox and
// react on "checked" change (set the view's property and redraw)
function wireCheckbox(view, selector, property) {
  const $checkbox = $("#"+selector+"_"+view.viewID);
  $checkbox.prop("checked", view.viewJSON[property]).change(function() {
    let isChecked = $(this).prop("checked");
    view.viewJSON[property] = isChecked;
    window._presenterViewDirty = true;
    view.draw();
  });
}

// wire control to view's property: set the value of control and
// react on control change (set the view's property and redraw)
function wireControl(view, selector, property, action) {
  let val = view.viewJSON[property]
  $(`#${selector}_${view.viewID}`).val(val);
  $(`#${selector}_${view.viewID}`).on(action, function() {
      view.viewJSON[property] = $(this).val();
      window._presenterViewDirty = true;
      view.draw();
  });
}



// ************************ GRAPH ***********************************

  /**
   * Iz tabele odstranim vse vrstice, ki nimajo enako  
   * Iz tabele data odstranim vse stolpce, ki niso navedeni v seznamu yAxes. 
   * Na koncu doda še stolpec, v katerem je X os.
   * Vhod: data (tabela, ki jo vrne ALGator: prva vrstica je header, ostale vrstice
   * so podatki ločeni s podpičjem), x (ime X osi, npr "N"), yAxes (seznam y osi, 
   * na primer "Java7.TMin, *.TMax"
   */
   function generateXColumns(data, x, yAxes) { 
    try {
      // razsirim vse vrstice, do imajo toliko stolpcev, kot jih ima prva vrstica
      var prvaVrsticaLen = data[0].length;
      for (var i=0; i < data.length; i++) {
        if (data[i].length < prvaVrsticaLen) {
          var taVrsticaLen = data[i].length;
          data[i].length = prvaVrsticaLen;  
          for(var j=taVrsticaLen; j<prvaVrsticaLen; j++) {
            data[i][j] = "0";
          }  
        }
        
      }
      
      // v x je ime x osi (npr. "N");
      if (!x) x="ID";
      var xIndex = data[0].indexOf(x);
      
      // "transponiram" tabelo ...
      var transData = transpose(data);
    
      var resData = [[]];     
      var novIdx = 0;
      for (var i=0; i < data[0].length; i++) {
        if (contains(yAxes, data[0][i])) {
          resData[novIdx++]  = copyArray(transData[i]);
        }    
      }
      
      resData[novIdx]     = copyArray(transData[xIndex]);
      resData[novIdx][0] += " ";
      
      var newData = transpose(resData);
  
      // vse celice, ki vsebujejo podatke, ločene z vejico pretvorim v tabelo ("1,2,3" -> [1,2,3])
      valuesToArray(newData);
  
      return newData; 
    } catch (err) {
        return data;
    }  
  } 


// Determine and remove common prefix of strings, ignoring the one with index xAxisIDX 
// ["[F0.C0]_BasicSort", "[F0.C0]_QuickSort", "[F0.C0]_JavaSort", "N"], xAxisIDX=3  --> ["BasicSort", "QuickSort", "JavaSort", "N"]
function stripPrefix(data, xAxisIDX) {
  if (data.length === 0 || (data.length === 1 && xAxisIDX === 0)) return;

  let prefix = xAxisIDX != 0 ? data[0][0] : data[0][1];
  for (let i = 1; i < data[0].length; i++) {
    if (i === xAxisIDX) continue; 
    while (!data[0][i].startsWith(prefix) && prefix) {
      prefix = prefix.slice(0, -1);
    }
  }
  const lastDelimiter = Math.max(prefix.lastIndexOf("_"), prefix.lastIndexOf("."));
  prefix = lastDelimiter >= 0 ? prefix.slice(0, lastDelimiter + 1) : "";

  data[0] = data[0].map((s, i) =>
    i === xAxisIDX ? s : s.startsWith(prefix) ? s.slice(prefix.length) : s
  );
}

function stripSuffix(data, xAxisIDX) {
  if (data.length === 0 || (data.length === 1 && xAxisIDX === 0)) return;
  
  let suffix = xAxisIDX != 0 ? data[0][0] : data[0][1]; 
  let revSuffix = [...suffix].reverse().join("");
  for (let i = 1; i < data[0].length; i++) {
    if (i === xAxisIDX) continue; 
    const revStr = [...data[0][i]].reverse().join("");
    while (!revStr.startsWith(revSuffix) && revSuffix) {
      revSuffix = revSuffix.slice(0, -1);
    }
  }  
  // now revSuffix is the reversed common suffix
  suffix = [...revSuffix].reverse().join("");
  const lastDelimiter = Math.max(suffix.indexOf("_"), suffix.indexOf("."));
  suffix = lastDelimiter >= 0 ? suffix.slice(lastDelimiter, suffix.length) : "";

  data[0] = data[0].map((s, i) => 
    i === xAxisIDX ? s : s.endsWith(suffix) ? s.slice(0, s.length - suffix.length) : s
  );
}

function drawChart(data, settings, divId) {   
  if (!settings.xAxis === '') xAxis = "ID";
  
  let xAxis = ''; let xAxisIDX = data[0].indexOf(settings.xAxis+' ');
  if (xAxisIDX !== -1) {
    xAxis = settings.xAxis + ' '; 
  }

  if (settings.stripPrefix) stripPrefix(data, xAxisIDX);
  if (settings.stripSuffix) stripSuffix(data, xAxisIDX);

  if (settings.logXScale || settings.logYScale) {
   let xBase = Number(settings.logXbase); if (Number.isNaN(xBase)) xBase= Math.E;
   let yBase = Number(settings.logYbase); if (Number.isNaN(yBase)) yBase= Math.E;
   var val = 0;
   for(var i=1; i<data.length; i++) {
      for(var j=0; j<data[i].length; j++) {
         if ((data[0][j]==xAxis && settings.logXScale) || (data[0][j]!=xAxis && settings.logYScale))  {
           try {
             val = Math.log(data[i][j]) / Math.log(data[0][j]==xAxis ? xBase : yBase);                  
           } catch (e) {
             val = "0";
           }  
           data[i][j] = val;//.toFixed(2);
         }
      }
   }
  } 


  // ce zelimo filtrirati po vseh stolpcih (tudi tistih, ki jih graf ne prikazuje eksplicitno),
  // moramo fltriranje opraviti prej (preden se tisti stolpci izločijo iz data)
  // if filterX is given, filter out all rows that do not satisfy filterX condition
  /*
  if (settings.filterX && xAxisIDX !== -1) {
    let filter = settings.filterX;
    let xAxisName = xAxis.trim();
    for(let i=data.length-1; i>0; i--) {
        let scope = { [xAxisName] : data[i][xAxisIDX] };
        try {
          let validRow = math.evaluate(filter, scope);  
          if (!validRow)  data.splice(i, 1);
        } catch (e) {}
    }
  }
  */

  if (!settings.labelsXTrfs) settings.labelsXTrfs="";
  if ((settings.labelsXTrfs.startsWith("=") || settings.categoryLabels) && (xAxisIDX >= 0)) {
    for(let i=1; i<data.length; i++) {
      let x   = data[i][xAxisIDX];
      let idx = i-1;

      if (settings.labelsXTrfs.startsWith("=")) {
        const expr  = settings.labelsXTrfs.substring(1);
        const scope = { idx: idx, x:x};
        const result = math.evaluate(expr, scope);  
        data[i][xAxisIDX] = result;
      } else {
        let ll = settings.labelsXTrfs.split(";");
        if (ll.length > idx && ll[idx])
          data[i][xAxisIDX] = ll[idx];
      }
    }
  }

  let colorPattern = []; // colors for graph series
  let usedAlgs = new Set(); // algorithm, that already appeared in this graph
  
  //let xes = data[0].map(item => item.split('.')[0].trim()); // seznam algoritmov
  let xes = data[0].map(item => { // to naredim tako, ker je item lahko "F0.C0_Quicksort.Tmin"
    const lastDot = item.lastIndexOf('.');
    return lastDot === -1 ? item.trim() : item.substring(0, lastDot).trim();
  });
  xes.forEach(alg =>{
    const pureAlgName = pureAlgorithmName(alg); // get rid of optional "[computer_]" part of algorithm name
    // ce algoritem nima določene barve (ali je bila že uporabljena), nastavim -1 (bom zamenjal kasneje)
    colorPattern.push(usedAlgs.has(pureAlgName) ? -1 : getAlgorithmColor(pureAlgName));
    
    // če sem algoritem Z DOLOČENO barvo že porabil, označim, da ne uporabim še enkrat
    if (!settings.reuseColors)
      usedAlgs.add(pureAlgName);
  });

  // katere barve so še na razpolago 
  let availableColors = c3_series_colors.filter(item => !colorPattern.includes(item.hex)).map(item => item.hex);
  // če ni nobene, dodam črno kot default ¸barva za vse nedoločene barve
  if (availableColors.length == 0) availableColors.push("black");
  // vse -1, -2, -3, ... spremenim v prosto barvo (ciklično)
  let ix=0;
  colorPattern = colorPattern.map(item => 
    (item != -1) ? item : (availableColors[(ix++)%availableColors.length])
  );
  

  var xAxisType = '';
  if (settings.categoryLabels)  xAxisType = 'category';

  var chart;

  if (settings.graphType=="other") {
   // implementacija "posebnih tipov" grafov
     chart = c3.generate({
     bindto: '#'+divId,
     
     data: {
       columns: [
         ['data1', 30, 200, 100, 400, 150, 250],
         ['data2', 130, 100, 140, 200, 150, 50]
       ],
       type: 'spline'
     }
   });
  } 
  else{
   var elt = document.getElementById(divId);
   elt.innerHTML='';
   if (elt != null && !elt.style.height){
     elt.style.height = "350px";
   }
   
   chart = c3.generate({
     data: {
         x: xAxis,                          
         rows: data,
         type: settings.graphTypes
     },

     bindto: '#'+divId,

     /* // this adds padding so that x-axis title is printed in preview
        // but: it ads additional padding on normal graphs, which is not OK
     padding: {
        bottom: 20 
     },
     */

     zoom: {
         enabled: settings.zoom, 
         rescale: true  // Optional: rescale after zooming
     },
     
     subchart: {
         show: settings.subchart
     },
     legend: {
       show: true,
       position: 'right'
     },
     grid: {
         x: {
             show: settings.gridX
         },
         y: {
           show: settings.gridY
         }
     },
     transition : {
         duration: 500
     },
     axis : {                
       x: {
         zoom: { enabled: true }, 
         label: {
             text: settings.xAxisTitle,
             position: 'outer-center'
         },
         type: xAxisType,
         tick: {
             fit: settings.categoryLabels
         },
         height: 50
       },
       y: {
         zoom: { enabled: true }, // to ne dela ... verjetno zaradi stare verzije c3
         label: {
           text: settings.yAxisTitle,
           position: 'outer-middle'
         },
         tick: {
          format: function(y) {
            if (settings.labelsYTrfs && settings.labelsYTrfs.startsWith("=")) {
               const expr  = settings.labelsYTrfs.substring(1);
               const scope = { y: y };
               const result = math.evaluate(expr, scope);  
               return result;
            } else
             return y;
          }
         }
       }
     },
     color: {
       pattern: colorPattern
     }
   });
   d3.select(".c3-axis-x-label").attr("transform", "translate(0,7)"); // premik labele gor (da se cela vidi)
   d3.select(".c3-axis-x-label").style("font-family", "sans-serif").style("font-size", "18px");
   d3.select(".c3-axis-y-label").style("font-family", "sans-serif").style("font-size", "18px");

  }
  settings.chart = chart;
  return chart;
} 





// ******************** TABLE ************************************
function filterColumns(data, columns) {
  try {
    // razsirim vse vrstice, do imajo toliko stolpcev, kot jih ima prva vrstica
    var prvaVrsticaLen = data[0].length;
    for (var i=0; i < data.length; i++) {
      if (data[i].length < prvaVrsticaLen) {
        var taVrsticaLen = data[i].length;
        data[i].length = prvaVrsticaLen;  
        for(var j=taVrsticaLen; j<prvaVrsticaLen; j++) {
          data[i][j] = "0";
        }  
      }
      
    }
  
    // "transponiram" tabelo ...
    var transData = transpose(data);
      
    var resData = [[]];     
    var novIdx = 0;
    if(columns.length > 0){
      for (var i=0; i < data[0].length; i++) {
        if (contains(columns, data[0][i])) {
          resData[novIdx++]  = copyArray(transData[i]);
        }    
      }
    }
    else{
      resData = transData;
    }
    var newData = transpose(resData);
    
    
    // vse celice, ki vsebujejo podatke, ločene z vejico pretvorim v tabelo ("1,2,3" -> [1,2,3])
    valuesToArray(newData);
  
    return newData; 
  } catch (err) {
      return data;
  } 
}

function addCol(colTag, content, row, cellClass) {
  const col = document.createElement(colTag);
  if (cellClass) col.classList.add(cellClass);
  col.textContent = content;
  row.appendChild(col);
  return col;
}

function addStatistics(tbody, statLabel, stat) {
  const avgTr = document.createElement('tr');
  avgTr.style = "border-top:4px double lightgray; border-bottom: 4px double lightgray; background: #f5fff5  ;"
  addCol('td', statLabel, avgTr,'hiddenCell');
  stat.forEach(a => {
    addCol('td', a, avgTr)
  });
  tbody.appendChild(avgTr);
}

function drawTable(data, divId, height, hasStat) {
  const table = document.createElement('table');
  table.className = 'w3-table w3-bordered w3-striped w3-border prestab';
  table.id = divId+'Table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style = "background: #606060; color: white;"

  if (hasStat) addCol('th','',headerRow, 'hiddenCell');
  data[0].forEach(headerText => {
    addCol('th', headerText, headerRow);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (hasStat) {
    let stat = getColumnStatistics(data);

    addStatistics(tbody, 'AVG',    stat[0]);
    addStatistics(tbody, 'STDEV',  stat[1]);
    addStatistics(tbody, 'CV(%)', stat[2]);
  }

  data.slice(1).forEach(rowData => {
    const tr = document.createElement('tr');
    if (hasStat) addCol('td','',tr, 'hiddenCell');
    rowData.forEach(cellText => {
      let coll = addCol('td',cellText, tr);
      if (isNaN(cellText)) coll.setAttribute("data-type", "text");
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const tableContainer = document.createElement('div');
  tableContainer.style.height = height;
  tableContainer.style.overflowY = 'auto';
  tableContainer.appendChild(table);

  const existingContainer = document.getElementById(divId);
  if (existingContainer) {
    existingContainer.innerHTML = ''; 
    existingContainer.appendChild(tableContainer);
  }

  return tableContainer;
}


function getColumnStatistics(tableData) {
  if (!Array.isArray(tableData) || tableData.length < 2) return [];

  const headers = tableData[0];
  const dataRows = tableData.slice(1);

  const sums          = new Array(headers.length).fill(0);
  const sumsOfSquares = new Array(headers.length).fill(0);
  const counts        = new Array(headers.length).fill(0);

  for (const row of dataRows) {
    row.forEach((cell, colIndex) => {
      const value = parseFloat(cell);
      if (!isNaN(value)) {
        sums[colIndex]           += value;
        sumsOfSquares[colIndex]  += value*value;
        counts[colIndex]         += 1;
      }
    });
  }

  const averages = sums.map((sum, i) =>
    counts[i] > 0 ? (sum / counts[i]).toFixed(2) : ""
  );
  const stddevs = sums.map((sum, i) =>     
    counts[i] > 0 ?  (Math.sqrt((sumsOfSquares[i] - sum*sum / counts[i]) / (counts[i] - 1))).toFixed(2) : ""
  );
  const cvs = stddevs.map((sd, i) => 
    (sd !== "" && counts[i] > 0) ? (100 * sd / (sums[i] / counts[i])).toFixed(2) : ""
  );

  return [averages, stddevs, cvs];
}


//////////////////////// ajax to django, json response //////////////

function callDjangoWithAjax(props, url, popupQ, successF, errorF) {
  var formData = new FormData();
  for (const [key, value] of Object.entries(props)) 
    formData.append(key, value);  
  $.ajax({
    url: url,
    type: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    success: function(response) {
      if (popupQ) showPopup(response.Answer);
      if (successF != null) successF(response);
    },
    error: function(xhr, status, error) {
      if (popupQ) showPopup(error);
      if (errorF != null) errorF(error);
    }
  });
}

function replaceStaticProjDocLinkWithDolarStatic(htmlText) {
  var regex = new RegExp("/static/ProjectDocs/" + projectName + "/([^\"]+)", "g");

  // Replace all occurrences of the matched pattern with "%static{X}"
  return  htmlText.replaceAll(regex, "%static{$1}");
}

function replaceDolarStaticWithStaticWebuploadLink(htmlText) {
  var regex = /%static\{([^}]*)\}/g;

  // Replace all occurrences of the matched pattern with "%static{X}"
  return  htmlText.replace(regex, "\"/static/webupload/$1\"");
}


function moveResources(id, htmlContent, successF, errorF) {
  callDjangoWithAjax(
    {"htmltext":htmlContent, "projectName":projectName}, 
    "/moveimages", true, 
    function(response) {
      if (successF != null && response.Status == 0)
        successF(id, htmlContent, response.newHtml);    
    }, errorF
  );
}

//////////////////////// TextBox //////////////////////
function getUploadImagePlugin(id) {
  return {
    name: 'myUpload',
    icon: 'Image',
    title: id,
    result: function(res) {
      document.getElementById("imageInput_"+id).click(); 
    }
  };
}
function uploadAndInsertImage(id, event) {
  var file = event.target.files[0];
  event.target.value = null;

  callDjangoWithAjax(
    {"image":file, "filename":id}, 
    "/uploadimage", true, 
    function(response) {
         let path = "/" + response.Answer;     
         tex.exec('insertImage', path);    
    }, null
  );
}
function getUploadResourcePlugin(id) {
  return {
    name: 'myResource',
    icon: 'Resource',
    title: id,
    result: function(res) {
      document.getElementById("resourceInput_"+id).click(); 
    }
  };
}
// Vertical-alignment toolbar plugin for TextboxView.
// viewObject must be the TextboxView instance so the plugin can read/write viewJSON
// and call draw() to refresh the preview.
function getVerticalAlignPlugin(viewObject) {
  return {
    name: 'myVerticalAlign',
    icon: '↕',
    title: 'Vertical alignment',
    result: function({action, content, button}) {
      const popupId = 'valign-popup-' + viewObject.viewID;

      // Toggle off if already open
      const existing = document.getElementById(popupId);
      if (existing) { existing.remove(); return false; }

      const popup = document.createElement('div');
      popup.id = popupId;

      // Position relative to the button in viewport coords.
      // Must use position:fixed on document.body — the tex-container has
      // overflow:hidden which clips any popup appended inside it.
      const rect = button.getBoundingClientRect();
      popup.style.cssText = [
        'position:fixed',
        `top:${rect.bottom + 2}px`,
        `left:${rect.left}px`,
        'background:#fff', 'border:1px solid #ccc', 'border-radius:4px',
        'box-shadow:0 2px 8px rgba(0,0,0,.18)', 'z-index:10000',
        'padding:4px 0', 'min-width:80px', 'white-space:nowrap'
      ].join(';');

      const current = viewObject.viewJSON['verticalAlignment'] || 'top';
      ['Top', 'Center', 'Bottom'].forEach(label => {
        const val = label.toLowerCase();
        const item = document.createElement('div');
        item.textContent = label;
        item.style.cssText = 'padding:5px 14px; cursor:pointer; font-size:13px;'
          + (current === val ? 'font-weight:bold; background:#f0f4ff;' : '');
        item.addEventListener('mouseenter', () => { item.style.background = '#f0f0f0'; });
        item.addEventListener('mouseleave', () => { item.style.background = current === val ? '#f0f4ff' : ''; });
        item.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          viewObject.viewJSON['verticalAlignment'] = val;
          popup.remove();
          viewObject.draw();
        });
        popup.appendChild(item);
      });

      document.body.appendChild(popup);

      // Close on the next outside click
      setTimeout(() => {
        document.addEventListener('click', function handler() {
          popup.remove();
          document.removeEventListener('click', handler);
        }, { once: true });
      }, 0);

      return false;
    }
  };
}

function uploadAndInsertResource(id, event) {
  var file = event.target.files[0];
  event.target.value = null;

  callDjangoWithAjax(
    {"image":file, "filename":id}, 
    "/uploadimage", true, 
    function(response) {
         let path = "/" + response.Answer;    
         let name = path.split("/").pop();          
         document.execCommand('insertHTML', false, `<a href="${path}" target="_blank">${name}</a>`);    
    }, null
  );
}


//////////////////////// MISC //////////////////////

// returns the first available number for given viewType in a given presenter
function getNextViewNumber(presenterJSON, viewType) {
  let max=0;
  try {
    presenterJSON.Layout.forEach(function(row) {
      row.forEach(function(col) {
        if (col.startsWith(viewType+"_")) {
          let number = parseInt(col.split("_")[1]);
          if (number > max) max = number;
        }
      });
    });
  } catch (e) {}
  return max + 1;
}



//////////////************ SELECT2 options *****************//////

var select2Options = {
      placeholder: " Choose ...",      
      tags: true,
      tokenSeparators: [','],
};
var selectionOrder = [];


function applySelect2Options(selectElement, options=select2Options) {
  $(selectElement).select2(options)
    .on('change', function() {
        reorderOptions(this);
    }); 
}

function reorderOptions(selectElement) {
  var selectedOptions = $(selectElement).val();
  if (selectedOptions == null) return;

  var options = $(selectElement).find('option');
  // Reorder options based on the selected values order
  options.sort(function(a, b) {
    var aIndex = selectedOptions.indexOf(a.value);
    var bIndex = selectedOptions.indexOf(b.value);
    // If both are selected, order by selection order
    if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
    if (aIndex > -1) return -1;
    if (bIndex > -1) return 1;
    return 0;
  });
  $(selectElement).html(options);//.trigger('change');
}


// ======================== DATA INTERPOLATION ========================

/**
 * Convert a glob pattern containing * wildcards to a RegExp.
 * Literal dots are escaped first, so "*.Tmin" → /^.*\.Tmin$/.
 */
function pdeGlobToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
}

/**
 * Resolve a data reference string against the active PDE.
 *
 * Both single and double quotes are accepted for string selectors.
 *
 * Supported forms:
 *   boxName                      → S box: scalar value; array box: full 2-D array
 *   boxName[n]                   → row n (0-based; row 0 = header) as 1-D array
 *   boxName[n][m]                → cell at row n, column index m
 *   boxName[n]["col"]            → cell at row n, named column
 *   boxName[n, "col"]            → same — shorthand comma form
 *   boxName["col"]               → whole column as 1-D array (data rows only)
 *   boxName["col"][n]            → cell in column at row n of full 2-D array
 *   boxName["*.Tmin"]            → 2-D sub-array keeping only glob-matching columns
 *   boxName[#n]                  → same as boxName[n] (semantic sugar for V-box rows)
 *   boxName["entryName"]         → V-box named-entry: value where name == "entryName"
 *
 * Returns the resolved value (primitive, 1-D array, or 2-D array). Returns null on error.
 */
function resolveRef(refStr, activePde) {
  if (!refStr || !activePde || !activePde.boxes) return null;
  refStr = refStr.trim();

  // ── split box name from selector chain ──────────────────────────────────
  const bracketIdx  = refStr.indexOf('[');
  const boxName     = bracketIdx === -1 ? refStr : refStr.substring(0, bracketIdx);
  let   selectorStr = bracketIdx === -1 ? '' : refStr.substring(bracketIdx);

  const box = activePde.boxes.find(b => b.name === boxName || b.id === boxName);
  if (!box) return null;

  const data     = box.data;
  const isScalar = box.type === 'S';

  // ── no selector ─────────────────────────────────────────────────────────
  if (!selectorStr) {
    if (isScalar) {
      if (!Array.isArray(data)) return data;
      if (!Array.isArray(data[0])) return data.length > 1 ? data[1] : data[0];
      return data.length > 1 ? data[1][0] : (data[0][0] !== undefined ? data[0][0] : null);
    }
    return Array.isArray(data) ? data : null;
  }

  if (!Array.isArray(data)) return null;

  // ── pre-process comma form: [n, "col"] or [n, 'col'] → [n]["col"] ───────
  selectorStr = selectorStr.replace(
    /\[\s*(#?\d+)\s*,\s*(['"]?)([^'"\]\[]+?)\2\s*\]/g,
    (_, idx, _q, col) => `[${idx}]["${col}"]`
  );

  // ── parse selector chain ─────────────────────────────────────────────────
  // Matches: ["col"], ['col'], [n], [#n]
  const selectorRe = /\[(?:"([^"]*)"|'([^']*)'|(#?\d+))\]/g;
  const selectors  = [];
  let m;
  while ((m = selectorRe.exec(selectorStr)) !== null) {
    if      (m[1] !== undefined) selectors.push({ type: 'col', value: m[1] });
    else if (m[2] !== undefined) selectors.push({ type: 'col', value: m[2] });
    else {
      const raw  = m[3];
      const hash = raw.startsWith('#');
      selectors.push({ type: 'idx', value: parseInt(raw.replace(/^#/, ''), 10), hash });
    }
  }
  if (selectors.length === 0) return null;

  // ── traverse selectors ───────────────────────────────────────────────────
  let current    = data;
  // lastHdrs: headers of the most-recent 2-D context, used when a col selector
  // follows a row-index selector (box[n]["col"] chaining).
  let lastHdrs   = (Array.isArray(data) && Array.isArray(data[0])) ? data[0] : null;

  for (let i = 0; i < selectors.length; i++) {
    const sel = selectors[i];

    if (sel.type === 'col') {
      const colName = sel.value;

      // ── 2-D context ────────────────────────────────────────────────────
      if (Array.isArray(current) && Array.isArray(current[0])) {
        const hdrs = current[0];

        // Wildcard column pattern → 2-D sub-array
        if (colName.includes('*')) {
          const re       = pdeGlobToRegex(colName);
          const matchIdxs = hdrs
            .map((h, ci) => ({ h, ci }))
            .filter(({ h }) => re.test(String(h)))
            .map(({ ci }) => ci);
          if (matchIdxs.length === 0) return null;
          current  = current.map(row => matchIdxs.map(ci => row[ci]));
          lastHdrs = current[0];
          continue;
        }

        // Exact column name
        const colIdx = hdrs.indexOf(colName);
        if (colIdx !== -1) {
          // Peek: ["col"][n] → one cell
          if (i + 1 < selectors.length && selectors[i + 1].type === 'idx') {
            const rowIdx = selectors[++i].value;
            const row    = current[rowIdx];
            current  = Array.isArray(row) ? row[colIdx] : null;
            lastHdrs = null;
          } else {
            // Whole column (data rows only)
            current  = current.slice(1).map(r => Array.isArray(r) ? r[colIdx] : r);
            lastHdrs = null;
          }
          continue;
        }

        // Named V-box entry lookup (box has '#', 'name', 'value' columns)
        const nameIdx  = hdrs.indexOf('name');
        const valueIdx = hdrs.indexOf('value');
        if (nameIdx !== -1 && valueIdx !== -1) {
          const row = current.slice(1).find(r => String(r[nameIdx]) === colName);
          if (row) { current = row[valueIdx]; lastHdrs = null; continue; }
        }

        return null;
      }

      // ── 1-D row context (following a [n] selector) ──────────────────────
      if (Array.isArray(current) && !Array.isArray(current[0]) && lastHdrs) {
        // Wildcard: return a 1-D array of values from all matching columns in this row
        if (colName.includes('*')) {
          const re        = pdeGlobToRegex(colName);
          const matchVals = lastHdrs
            .map((h, ci) => ({ h, ci }))
            .filter(({ h }) => re.test(String(h)))
            .map(({ ci }) => current[ci]);
          if (matchVals.length === 0) return null;
          current  = matchVals;
          lastHdrs = null;
          continue;
        }
        // Exact column name
        const colIdx = lastHdrs.indexOf(colName);
        if (colIdx !== -1 && colIdx < current.length) {
          current = current[colIdx];
          lastHdrs = null;
          continue;
        }
        return null;
      }

      return null;

    } else {
      // ── numeric index ────────────────────────────────────────────────────
      if (!Array.isArray(current)) return null;

      if (sel.hash) {
        // [#n] — V-box entry-value lookup: only valid on a 2-D array that has
        // a 'value' column (i.e. a V-box output).  Returns a scalar directly.
        if (!Array.isArray(current[0])) return null;
        const valueIdx = current[0].indexOf('value');
        if (valueIdx === -1) return null;          // not a V box
        const row = current[sel.value];
        return (Array.isArray(row) ? row[valueIdx] : null) ?? null;
      }

      // Plain [n]: save headers for a potential subsequent ["col"] lookup
      lastHdrs = (Array.isArray(current[0])) ? current[0] : null;
      current  = current[sel.value];
      if (current === undefined) return null;
    }
  }

  return current !== undefined ? current : null;
}


/**
 * Replace all $type{...} tokens in an HTML string with their resolved values.
 *
 * resolveRef() always returns the actual data:
 *   scalar box  → primitive value
 *   array box   → full 2-D data array  (row 0 = header, rows 1+ = data)
 *   data_1[i]   → row i as 1-D array
 *   data_1[i][j]→ single cell value
 *
 * Token semantics by type:
 *   $int{ref}               → scalar: round to int
 *                             1-D array: number of elements
 *                             2-D array: number of data rows  (length − 1, header excluded)
 *   $double{ref, decimals}  → same as $int but formatted as float (default 2 decimals)
 *   $array{ref, n, m}       → HTML representation: 1-D shows ≤ n elements,
 *                             2-D shows header + ≤ n data rows, ≤ m cols  (n default 10)
 *
 * Tokens that cannot be resolved are left unchanged.
 */
/** Escape a string for safe use inside an HTML attribute value (double-quoted). */
function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveTextboxTemplate(html, activePde) {
  if (!html || !activePde) return html;
  return html.replace(/\$(\w+)\{([^}]*)\}/g, function(match, type, args) {
    try {
      const parts = args.split(',').map(s => s.trim());
      const ref   = parts[0];
      if (!ref) return match;

      const val = resolveRef(ref, activePde);
      if (val === null || val === undefined) return match;

      // --- helpers ---
      const is1D = Array.isArray(val) && !Array.isArray(val[0]);
      const is2D = Array.isArray(val) &&  Array.isArray(val[0]);

      // "size" of a resolved value for $int / $double:
      //   scalar  → numeric value itself
      //   1-D     → element count
      //   2-D     → data row count (header row excluded)
      const numericSize = is2D ? Math.max(0, val.length - 1)
                        : is1D ? val.length
                        : Number(val);

      // first scalar value buried inside an array:
      const firstScalar = is2D ? (val.length > 1 ? val[1][0] : (val[0] || [null])[0])
                        : is1D ? val[0]
                        : val;

      const t = type.toLowerCase();
      switch (t) {
        case 'int': {
          const text = String(Math.round(numericSize));
          return `<span class="pde-value pde-value-int" title="${escAttr(match)}">${text}</span>`;
        }

        case 'double': {
          const decimals = parts[1] !== undefined ? parseInt(parts[1], 10) : 2;
          const text = numericSize.toFixed(isNaN(decimals) ? 2 : decimals);
          return `<span class="pde-value pde-value-double" title="${escAttr(match)}">${text}</span>`;
        }

        case 'array': {
          // If the reference resolved to a scalar (e.g. data_1[0][0] or data_1["ID"][1]),
          // display it with pde-value-scalar instead of the array styling.
          if (!Array.isArray(val)) {
            return `<span class="pde-value pde-value-scalar" title="${escAttr(match)}">${val}</span>`;
          }
          const maxRows = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;
          const maxCols = parts[2] !== undefined ? parseInt(parts[2], 10) : 0;
          const inner = formatArray(val, maxRows, maxCols);
          return `<span class="pde-value pde-value-array" title="${escAttr(match)}">${inner}</span>`;
        }

        default:
          return match;
      }
    } catch (e) {
      return match;
    }
  });
}


/**
 * Format a value (primitive, 1-D array, or 2-D array) as an inline HTML snippet.
 * maxRows / maxCols: 0 = unlimited.
 */
function formatArray(data, maxRows, maxCols) {
  maxRows = maxRows || 0;
  maxCols = maxCols || 0;

  if (!Array.isArray(data)) return String(data !== null && data !== undefined ? data : '');

  // 1-D array
  if (!Array.isArray(data[0])) {
    const rows      = maxRows > 0 ? data.slice(0, maxRows) : data;
    const truncated = maxRows > 0 && data.length > maxRows;
    return '<span class="data-inline">{' + rows.join(', ') + (truncated ? ', …' : '') + '}</span>';
  }

  // 2-D array: include header row in the count
  const allRows        = maxRows > 0 ? data.slice(0, maxRows + 1) : data;
  const truncatedRows  = maxRows > 0 && data.length > maxRows + 1;

  const parts = ['<table class="data-inline-table" style="display:inline-table; border-collapse:collapse; font-size:0.9em; margin:2px;">'];
  allRows.forEach((row, rIdx) => {
    const cols         = maxCols > 0 ? row.slice(0, maxCols) : row;
    const truncatedCols = maxCols > 0 && row.length > maxCols;
    const tag   = rIdx === 0 ? 'th' : 'td';
    const style = rIdx === 0
      ? 'style="border:1px solid #aaa; padding:1px 4px; background:#f0f0f0; text-align:center;"'
      : 'style="border:1px solid #ddd; padding:1px 4px; text-align:right;"';
    parts.push('<tr>');
    cols.forEach(cell => parts.push(`<${tag} ${style}>${cell !== null && cell !== undefined ? cell : ''}</${tag}>`));
    if (truncatedCols) parts.push(`<${tag} ${style}>…</${tag}>`);
    parts.push('</tr>');
  });
  if (truncatedRows) {
    parts.push('<tr><td colspan="99" style="text-align:center; padding:1px 4px; border:1px solid #ddd;">…</td></tr>');
  }
  parts.push('</table>');
  return parts.join('');
}


/**
 * tex.js toolbar plugin that lets the user insert a $type{ref} token into the textbox.
 *
 * Shows a popup listing all PDE boxes.
 * For scalar boxes (type S): int / double / str buttons.
 * For array boxes: int (= row count) / array buttons for the whole box,
 *   plus per-column int / double / str / array buttons.
 */
function getInsertDataPlugin(viewObject) {
  return {
    name:  'myInsertData',
    icon:  'Σ',          // Σ
    title: 'Insert data value',
    result: function({action, content, button}) {
      const popupId = 'insertdata-popup-' + viewObject.viewID;

      // Toggle: close if already open
      const existing = document.getElementById(popupId);
      if (existing) { existing.remove(); return false; }

      const activePde = (typeof playgroundID !== 'undefined' && viewObject.presenterName === playgroundID)
                        ? playgroundPde : (typeof pde !== 'undefined' ? pde : null);
      if (!activePde || !activePde.boxes) return false;

      const popup = document.createElement('div');
      popup.id = popupId;

      const rect = button.getBoundingClientRect();
      popup.style.cssText = [
        'position:fixed',
        `top:${rect.bottom + 2}px`,
        `left:${Math.min(rect.left, window.innerWidth - 320)}px`,
        'background:#fff', 'border:1px solid #ccc', 'border-radius:4px',
        'box-shadow:0 2px 8px rgba(0,0,0,.2)', 'z-index:10000',
        'padding:6px 8px', 'max-height:420px', 'overflow-y:auto',
        'min-width:300px', 'font-size:13px', 'line-height:1.4'
      ].join(';');

      function makeBtn(label, token) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.title = token;
        btn.style.cssText = 'font-size:11px; padding:1px 5px; margin:1px; border:1px solid #bbb; border-radius:3px; cursor:pointer; background:#f5f5f5; white-space:nowrap;';
        btn.addEventListener('mouseover', () => { btn.style.background = '#ddeeff'; });
        btn.addEventListener('mouseout',  () => { btn.style.background = '#f5f5f5'; });
        btn.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          popup.remove();
          document.execCommand('insertHTML', false, token);
        });
        return btn;
      }

      const boxesWithData = activePde.boxes.filter(b => b.data !== undefined && b.data !== null);
      if (boxesWithData.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'No data available';
        empty.style.cssText = 'padding:8px; color:#888;';
        popup.appendChild(empty);
      }

      boxesWithData.forEach((box, bIdx) => {
        const isScalar = box.type === 'S';
        const ref      = box.name || box.id;

        const section = document.createElement('div');
        section.style.cssText = 'padding:4px 0;'
          + (bIdx < boxesWithData.length - 1 ? 'border-bottom:1px solid #eee; margin-bottom:4px;' : '');

        // --- Box header line ---
        const headerLine = document.createElement('div');
        headerLine.style.cssText = 'display:flex; align-items:center; gap:5px; flex-wrap:wrap; margin-bottom:3px;';

        const nameEl = document.createElement('span');
        nameEl.textContent = ref;
        nameEl.style.cssText = 'font-weight:bold; color:#222;';

        const typeEl = document.createElement('span');
        typeEl.textContent = box.type;
        typeEl.style.cssText = 'background:#e0e0e0; border-radius:3px; padding:0 4px; color:#555; font-size:11px;';

        headerLine.appendChild(nameEl);
        headerLine.appendChild(typeEl);

        if (isScalar) {
          headerLine.appendChild(makeBtn('int',    `$int{${ref}}`));
          headerLine.appendChild(makeBtn('double', `$double{${ref}, 2}`));
        } else {
          // For arrays: whole-box buttons (int = row count, array = all data)
          headerLine.appendChild(makeBtn('int (len)',  `$int{${ref}}`));
          headerLine.appendChild(makeBtn('array',      `$array{${ref}, 10}`));
        }
        section.appendChild(headerLine);

        // --- Per-entry rows for V boxes ---
        if (box.type === 'V' && Array.isArray(box.data) && box.data.length > 1) {
          const entLabel = document.createElement('div');
          entLabel.textContent = 'Entries:';
          entLabel.style.cssText = 'color:#888; font-size:11px; margin:2px 0 2px 4px;';
          section.appendChild(entLabel);

          box.data.slice(1).forEach(row => {
            const seqNum     = row[0];                            // '#' column (1-based)
            const entryName  = row[1];                            // 'name' column
            const display    = entryName || `#${seqNum}`;
            const entryRef   = entryName ? `${ref}["${entryName}"]` : `${ref}[#${seqNum}]`;

            const entRow = document.createElement('div');
            entRow.style.cssText = 'display:flex; align-items:center; gap:3px; flex-wrap:wrap; margin:1px 0 1px 10px;';

            const nameEl = document.createElement('span');
            nameEl.textContent = display;
            nameEl.style.cssText = 'color:#444; font-size:12px; min-width:110px; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
            nameEl.title = display;
            entRow.appendChild(nameEl);

            entRow.appendChild(makeBtn('int',    `$int{${entryRef}}`));
            entRow.appendChild(makeBtn('double', `$double{${entryRef}, 2}`));
            section.appendChild(entRow);
          });

        // --- Per-column rows for other array boxes ---
        } else if (!isScalar && Array.isArray(box.data) && Array.isArray(box.data[0])) {
          const colLabel = document.createElement('div');
          colLabel.textContent = 'Columns:';
          colLabel.style.cssText = 'color:#888; font-size:11px; margin:2px 0 2px 4px;';
          section.appendChild(colLabel);

          box.data[0].forEach(colName => {
            const colRef  = `${ref}["${colName}"]`;
            const colRow  = document.createElement('div');
            colRow.style.cssText = 'display:flex; align-items:center; gap:3px; flex-wrap:wrap; margin:1px 0 1px 10px;';

            const colNameEl = document.createElement('span');
            colNameEl.textContent = colName;
            colNameEl.style.cssText = 'color:#444; font-size:12px; min-width:110px; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
            colNameEl.title = colName;
            colRow.appendChild(colNameEl);

            colRow.appendChild(makeBtn('int',    `$int{${colRef}[1]}`));
            colRow.appendChild(makeBtn('double', `$double{${colRef}[1], 2}`));
            colRow.appendChild(makeBtn('array',  `$array{${colRef}}`));
            section.appendChild(colRow);
          });
        }

        popup.appendChild(section);
      });

      document.body.appendChild(popup);

      // Close on the next outside click
      setTimeout(() => {
        document.addEventListener('click', function handler() {
          popup.remove();
          document.removeEventListener('click', handler);
        }, { once: true });
      }, 0);

      return false;
    }
  };
}