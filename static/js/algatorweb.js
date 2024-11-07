function XcreateTable(data, divId, height) {
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



/**
 * Iz tabele odstranim vse vrstice, ki nimajo enako  
 * Iz tabele data odstranim vse stolpce, ki niso navedeni v seznamu yAxes. 
 * Na koncu doda še stolpec, v katerem je X os.
 * Vhod: data (tabela, ki jo vrne ALGator: prva vrstica je header, ostale vrstice
 * so podatki ločeni s podpičjem), x (ime X osi, npr "N"), yAxes (seznam y osi, 
 * na primer "Java7.TMin, *.TMax"
 */
function XgenerateXColumns(data, x, yAxes) {
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

function XfilterColumns(data, columns) {
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

function XprocessData(data){
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
    for (var i=0; i < data[0].length; i++) {
        resData[novIdx++]  = copyArray(transData[i]);
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



function XparseResponse (response) {        
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
  return newData;
}

function Xtranspose(tabela) {
  return tabela[0].map(function(col, i) { 
      return tabela.map(function(row) { 
        return row[i]; 
      });
    });    
}

function Xcontains(tab, value) {                
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

function XstrEndsWith(str, suffix) {
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



function XgetData(url, projectName, presenterJSON) {
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


async function XrefreshPresenterQuery(type, values, presenterJSON, presenterView, viewId){

  let data = [];
  Object.keys(presenterJSON.Query).forEach(key => {
      if(key == type)
      presenterJSON.Query[key] = values;
  });
  data = await getData(url, projectName, presenterJSON);
  // ce ustvarjamo nov presenter in view je table nimamo objekta graph
  if(presenterJSON[presenterView] !== undefined){
    if(presenterJSON[presenterView]["xAxis"] !== undefined && presenterJSON[presenterView]["xAxis"] !== ''){
      data = generateXColumns(data, presenterJSON[presenterView]["xAxis"], presenterJSON[presenterView]["yAxes"]);
      drawChart(data, presenterView, presenterJSON, viewId);
    }
  }
  else if(document.getElementById(viewId) !== null){
    if(data.length > 0){

      createTable(data, viewId, '500px')
    }
    else{
      console.log("Ni podatkov")
    }
  }
  return data;
}

async function XrefreshPresenterView(data, presenterView, presentersViewObject, values, presenterJSON, viewId){
  presenterJSON[presenterView][presentersViewObject] = values
  if(presenterView.includes('Graph')){
      graphData = generateXColumns(data, presenterJSON[presenterView]["xAxis"], presenterJSON[presenterView]["yAxes"]);
      drawChart(graphData, presenterView, presenterJSON, viewId);
  }
  else if(presenterView.includes('Table')){
      tableData = filterColumns(data, presenterJSON[presenterView]['Columns']);
      if(tableData.length > 0){
        createTable(tableData, viewId, '350px');
      }
      else{
        console.log("Ni podatkov")
      }
  }
}

function XfillXSelector(data, presenterJSON, presenterView, selectroId){
  if($('#'+selectroId).val() == null){
      let x = data[0];
      let XSelector = $('#'+selectroId);
      XSelector.empty();
      x.forEach(function(item) {
          let option = new Option(item, item); 
          XSelector.append(option); 
      });

      var preselectedX = presenterJSON[presenterView]["xAxis"]; 
      $('#'+selectroId).val(preselectedX);
  }
}

function XfillYSelector(data, presenterJSON, presenterView, selectroId){
  if($('#'+selectroId).val() == null){
      let y = data[0];
      let YSelector = $('#'+selectroId);
      YSelector.empty();
      let suffixes = new Set();
      y.forEach(function(item) {

          if (item.includes(".")) {
              let pieces = item.split(/[.]/);
              let suffix = pieces[pieces.length-1];
              suffixes.add('*.'+suffix);
          }
          
          let option = new Option(item, item); 
          YSelector.append(option); 
      });
      suffixes.forEach(function(item) {
          let option = new Option(item, item); 
          YSelector.append(option); 
      });
      var preselectedY = presenterJSON[presenterView]["yAxes"]; 
      $('#'+selectroId).val(preselectedY);
  }
}

function XfillColumns(data, presenterJSON, presenterView, selectroId){
  if($('#'+selectroId).val() == null){
      let columns = data[0];
      let suffixes = new Set();
      let columnsSelector = $('#'+selectroId);
      columnsSelector.empty();
      columns.forEach(function(item) {
          if (item.includes(".")) {
              let pieces = item.split(/[.]/);
              let suffix = pieces[pieces.length-1];
              suffixes.add('*.'+suffix);
          }

          let option = new Option(item, item); 
          columnsSelector.append(option); 
      });

      suffixes.forEach(function(item) {
          let option = new Option(item, item); 
          columnsSelector.append(option); 
      });

      var preselectedColumns = presenterJSON[presenterView]["Columns"]; 
      $('#'+selectroId).val(preselectedColumns);
  }
}

function XsetupCheckbox(data, presenterJSON, selector, layoutViewId, view, queryKey, defaultValue) {
  const $checkbox = $(selector);
  $checkbox.prop("checked", defaultValue).change(function() {
      let isChecked = $(this).prop("checked");
      refreshPresenterView(data, view, queryKey, isChecked, presenterJSON, layoutViewId);
  });
}

function XpopulateSelect(selectElement, optionsArray) {
  let select = $(selectElement);
  optionsArray.forEach(function(optionValue) {
      let option = new Option(optionValue, optionValue);
      select.append(option);
  });
}