async function getData(url, projectName, presenterJSON) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5000);

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
    var newArray = array.map(function (arr) {
      return arr.slice();
    });
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
  try {
    let XSelector = $('#'+selectroId);
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
  $('#'+selectroId).val(selected);
  if (ePrompt != "") {    
      // $(`#${selectroId}`).select2({placeholder: ePrompt,allowClear: true, tags:true});
      applySelect2Options($(`#${selectroId}`), {placeholder: ePrompt,allowClear: true, tags:true});
  }
}

// wire checkbox to view property: set the value of checkbox and
// react on "checked" change (set the view's property and redraw)
function wireCheckbox(view, selector, property) {
  const $checkbox = $("#"+selector+"_"+view.viewID);
  $checkbox.prop("checked", view.viewJSON[property]).change(function() {
    let isChecked = $(this).prop("checked");
    view.viewJSON[property] = isChecked;
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
      for (var i = 0; i < newData.length; i++) {
          for(var j=0; j < newData[i].length; j++) {
            if (newData[i][j].includes(","))
                newData[i][j] = newData[i][j].split(",");
          }
      }
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


  // if filterX is given, filter out all rows that do not satisfy filterX condition
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
  let xes = data[0].map(item => item.split('.')[0].trim()); // seznam algoritmov
  xes.forEach(alg =>{
    // ce algoritem nima določene barve (ali je bila že uporabljena), nastavim -1 (bom zamenjal kasneje)
    colorPattern.push(usedAlgs.has(alg) ? -1 : getAlgorithmColor(alg));
    
    // če sem algoritem Z DOLOČENO barvo že porabil, označim, da ne uporabim še enkrat
    if (!settings.reuseColors)
      usedAlgs.add(alg);
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
   if (elt != null){
     elt.style.height = "350px";
   }
   
   chart = c3.generate({
     data: {
         x: xAxis,                          
         rows: data,
         type: settings.graphTypes
     },

     bindto: '#'+divId,
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
    for (var i = 0; i < newData.length; i++) {
        for(var j=0; j < newData[i].length; j++) {
          if (newData[i][j].includes(","))
              newData[i][j] = newData[i][j].split(",");
        }
    }
  
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
  tableContainer.style.maxHeight = height;
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