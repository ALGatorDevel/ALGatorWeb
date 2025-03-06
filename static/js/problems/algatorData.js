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


function getData(url, projectName, presenterJSON) {
  return new Promise((resolve, reject) => {
      
    var param = {
        csrfmiddlewaretoken: window.CSRF_TOKEN, 
        q: `query {"ProjectName":"${projectName}", "Query":${JSON.stringify(presenterJSON.Query)}}}`
    };
    $.post(url, param, function(response) {
        var answer = response.answer; //!response->answer 
        var resData = parseResponse(answer);
      
        resolve(resData);
        return;
    }).fail(reject);
  });
}


// ******************* data manipuilation *************************

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


function drawChart(data, settings, divId) {
  let chart;
   
  let xAxis = '';
  if (!settings.xAxis === ''){
   xAxis = "ID";
  }
  else{
   if (data[0].indexOf(settings.xAxis+' ') !== -1) {
     xAxis = settings.xAxis + ' ';
   }
  }
  if (settings.logScale) {
   var val = 0;
   for(var i=1; i<data.length; i++) {
     for(var j=0; j<data[i].length; j++) {
         try {
           val = Math.log(data[i][j]);                  
         } catch (e) {
           val = "0";
         }  
         data[i][j] = val.toFixed(2);
     }
   }
  } 
  var xAxisType = '';
  if (settings.categoryLabels) 
   xAxisType = 'category';
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
           }
       }
     }
   });
   d3.select(".c3-axis-x-label").attr("transform", "translate(0,-7)"); // premik labele gor (da se cela vidi)
  }
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

function drawTable(data, divId, height) {
  const table = document.createElement('table');
  table.className = 'w3-table w3-bordered w3-striped w3-border';
  table.id = divId+'Table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

 
  data[0].forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.slice(1).forEach(rowData => {
    const tr = document.createElement('tr');
    rowData.forEach(cellText => {
      const td = document.createElement('td');
      td.textContent = cellText;
      tr.appendChild(td);
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