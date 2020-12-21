
var queryEditor = (function () {
    "use strict";

    var pub = {};   //public methods & properties

    var project;    //project name
    var query;      //current query
    var data;       //project data

    var ajaxRequest; // current ajax request

    var innerChange = false; // true, wher a change in a query is due to inner rearangement of data

    //DOM classes and IDs
    var QUERY_EDITOR = ".query-editor";
    var DATA_TABLE = "#alg-data-table";
    var QUERY_TEXT = ".pre-query-text";
    var FILTER = "#text-Filter";
    var COUNT  = "#checkbox-Count";
    var COMPID = "#text-compID";
    var GROUP_BY = "#text-GroupBy";
    var SORT_BY = "#text-SortBy";
    var DOWNLOAD_QUERY = "img.download-query";
    var DOWNLOAD_DATA = "img.download-data";
    var DISPATCH_DATA = "img.dispatch-data";
    var COUNTID = "#checkbox-Count";

    /**
    *   Initializes queryEditor
    *   @param {string} project - Project name.
    */
    pub.init = function (project_name) {
        project = project_name;
        wireEvents();
    };

    /**
    *   
    *   @param {string} q    - Query string.
    *   @param {string} repl - parameter to be inserted to where $0 is placed
    */
    pub.setQuery = function(q, repl) {
        innerChange = true;
        try {
          if (typeof q === "string") {    
            q = JSON.parse(q);
          }

          Object.keys(q).forEach(function (key) {
            try {
              if (key === "Filter"  || key === "SortBy" || key == "ComputerID") {
                var cont = q[key].toString().replaceAll(","," & ");
                $("#text-" + key).val(cont);
              } else {
                var selector = "";                
                var nKey = key.toString().toUpperCase();
                switch (nKey) {
                    case "ALGORITHMS": selector="#AlgSelect"; break;
                    case "TESTSETS":   selector="#TSSelect"; break;
                    case "PARAMETERS": selector="#InParamSelect"; break;
                    case "INDICATORS": selector="#OutParamSelect"; break;
                    case "GROUPBY":    selector="#text-GroupBy"; break;
                }
                if (selector != "") {
                  var curValue = [];  
/*                  q[key].forEach(function(element, index, array) {
                    var split = element.split(" AS ");
                    curValue.push(split[0].replace("$0", repl));
                  });
                  try {
                    $(selector).val(curValue).trigger('change');
                  } catch(e) {}
*/
                  q[key].forEach(function(element, index, array) {
                    element = element.replace("$0", repl);
                    if (!$(selector).find("option[value='" + element + "']").length) {
                      var newOption = new Option(element, element, true, true);
                      $(selector).append(newOption);
                    } 
                    curValue.push(element);
                  });
                  try {
                    $(selector).val(curValue).trigger('change');
                  } catch(e) {}                  
                }
              }
            } catch (e) {}              
          });
        } catch (e) {}

        innerChange=false;        
        handleQueryChange(); 

        util.hideSave(); 

    };

    pub.getQuery = function() {
        return query;
    };

    pub.getData = function() {
        return data;
    };

   /**
    *   Generates a query object using current selection
    *   @return {Object} query
    */
    function generateQuery() {
        var checkboxes = $(QUERY_EDITOR + " input[type=checkbox]");
        var filter = $(FILTER);
        var groupBy = $(GROUP_BY);
        var sortBy = $(SORT_BY);
        var compID = $(COMPID);
        var countID = $(COUNTID);
        
        var newQuery = {};
        
        
        try {          
          if ($("#AlgSelect").data("select2")) {  
            newQuery["Algorithms"]=$("#AlgSelect").select2("val");
            newQuery["TestSets"]=$("#TSSelect").select2("val");
            newQuery["Parameters"]=$("#InParamSelect").select2("val");
            newQuery["Indicators"]=$("#OutParamSelect").select2("val");          
            newQuery["GroupBy"]=$("#text-GroupBy").select2("val");          
          }
        } catch (err) {}
       
        if (newQuery["Algorithms"]== undefined   || newQuery["Algorithms"] === null) newQuery["Algorithms"]=[];
        if (newQuery["TestSets"]== undefined     || newQuery["TestSets"]   === null) newQuery["TestSets"]  =[];
        if (newQuery["Parameters"]== undefined   || newQuery["Parameters"] === null) newQuery["Parameters"]=[];
        if (newQuery["Indicators"]== undefined   || newQuery["Indicators"] === null) newQuery["Indicators"]=[];
        if (newQuery["GroupBy"]   == undefined   || newQuery["GroupBy"]    === null) newQuery["GroupBy"]=[];

        
 
        //filter, groupby, sortby, COMPID
        newQuery.Filter = filter.val().split("&").map(Function.prototype.call, String.prototype.trim);        
        newQuery.SortBy = [sortBy.val()];
        newQuery.ComputerID = compID.val();
        newQuery.Count = countID.is(':checked') ? "1" : "0";

        return newQuery;
    }

    /**
    *   Parses Algator query response
    *   @param {string} response - Algator query response.
    *   @returns {Array} newData
    */
    pub.parseResponse = function (response) {
        response = response.trim().replace(/<br>/g, "\n");
        
        var lines = response.split(/\r\n|\r|\n/g); //.splice(3); //split lines

        var newData = [];
        for (var i = 0; i < lines.length; i++) {
            newData[i] = lines[i].split(";");
        }
        return newData;
    }

    /**
    *   Performs an ajax call requesting new data from the server
    /   @param {string} query - Algator query string.
    */
    function requestData(query) {
        // pred posiljanjem vse presledke v poizvedbi zamenjam z _!_
        var encoded = encodeURIComponent(query.replace(/ /g, "_!_"));     //encode request string    
        var serverName = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ":" + window.location.port : ""); 
        var url = serverName + "/cpanel/askServer?q=getQueryResult%20"+project+"%20"+encoded;  //request url

        // history.replaceState(null, "", url); 
        // history.replaceState(null, "", serverName +   "?projectName=" + project +  "&query=" + JSON.stringify(query));  //set url query parameter

        try {
          // prekličem prejšnji request. 
          ajaxRequest.abort();

          // POZOR: Server pa kljub temu še vedno procesira. Kako 
          // bi sporočil serverju, da preneha računati, saj 
          // odgovora ne bo sprejel nihče?

        } catch(err) {}

        $("#tblstatus").text("[Loading...]");
        ajaxRequest = $.ajax({
            url: url,
            dataType: 'json',
        }). done(function (response) {  
           $("#tblstatus").text("[Loaded]");            

           var answer = response.answer;
           data = queryEditor.parseResponse(answer);
                    if (data.length > 0) {
                        queryEditor.populateTable();
                        chartEditor.load(data);
                    } else {
                        $(DATA_TABLE).empty();
                        chartEditor.unload();
                        $("#tblstatus").text("[Empty]");
                    }
                //}    
        });
        return false;
    };
    
    

    /**
    *   Callback for events in query editor
    */
    function handleQueryChange() {
        if (innerChange) return;

        var newQuery = generateQuery();

        if (JSON.stringify(newQuery) !== JSON.stringify(query)) {   //check if there was an actual query change
            $(QUERY_TEXT).html(util.syntaxHighlight(newQuery));          //display query
            requestData(JSON.stringify(newQuery));                  //request new data
            query = newQuery;

            util.showSave();
        }
    }

    function handleQueryDownload() {
        if (query !== undefined) {
            var queryText = JSON.stringify(query, undefined, 2);
            var blob = new Blob([queryText], {type: "text/plain;charset=utf-8"});
            saveAs(blob, project + "-query.json");
        }
    }

    function handleDataDownload() {
        if (data !== undefined) {
            var csvText = data.map(function(line) { 
                return line.join(";");
            }).join("\n");

            var blob = new Blob([csvText], {type: "text/plain;charset=utf-8"});
            alert(project + "-data.csv");
            saveAs(blob, project + "-data.csv");
        }
    }

    // method finds changes in table (places where values in table differ from values in data)
    // and prepars a mapping; this mapping will be used to change values of array in the same
    // manner (when array will change due to reload, this mapping will be used to retain
    // used defined changes)
    function handleDispatchDownload() {        
      if (data !== undefined) {

        var curData = [];
        var curChanges = {};

        var i=0;
        var table = $("#alg-data-table");
        if (table) {
            table.find('tr').each(function (rowIndex, r) {
                var curRow = []; var j=0;

                $(this).find('th').each(function (colIndex, c) {    
                    curRow.push(c.textContent); j++;
                });

                $(this).find('td').each(function (colIndex, c) {    
                    curRow.push(c.textContent); 
                    if (data[i][j] != c.textContent) {
                        curChanges[j] = [];   // the j-th column has changed!
                    }                    
                    j++;
                });
                curData.push(curRow);
                i++;
            });
        }     

        var manData = {};
        var manDatas = [];
        Object.keys(curChanges).forEach(function(col) {
          var manSet={};
          manSet.Type="Column";
          manSet.Meta={};
          manSet.Meta.Name=curData[0][col];  
          manSet.Meta.Values=[];
          for (var k=1; k<curData.length; k++)
            manSet.Meta.Values.push(curData[k][col]);

          manDatas.push(manSet);
        });
        manData.Data=manDatas;

        chartEditor.setSettings({"manData" : JSON.stringify(manDatas)}); //'[{"Type":"Column", "Meta":{"Name":"ID", "Values":["A", "B", "C"]}}]'

        chartEditor.reload();
        util.showSave();
      }

    }    

    /**
    *   Wires up queryEditor events
    */
    function wireEvents() {
        $(".multiselect").on("change", handleQueryChange);
        $(QUERY_EDITOR).on("blur", "input[type=text]", handleQueryChange); 
        $(DOWNLOAD_QUERY).on("click", handleQueryDownload);
        $(DOWNLOAD_DATA).on("click", handleDataDownload);
        $(DISPATCH_DATA).on("click", handleDispatchDownload);
        $(COUNTID).on("change", handleQueryChange);
    }

    /**
    *   Populates table with algator data
    */
    pub.populateTable = function () {
        var table = $(DATA_TABLE); 
        table.empty();
        if (data.length != 0)  {
        
          var populate_head = function () {
            var head = $('<thead>');
            var head_data = '<tr>';
            for (var i = 0; i < data[0].length; i++) {
                head_data += '<th style="text-align:center;">' + data[0][i] + '</th>';
            }
            head_data += '</tr>';
            head.append(head_data);
            return head;
          };


          var populate_body = function () {
            var body = $('<tbody>');
            var body_data = '';
            for (var i = 1; i < data.length; i++) {
                body_data += '<tr>';
                for (var j = 0; j < data[i].length; j++) {
                    var curID = 'edi'+i+'x'+j;
                    body_data += '<td align="center" style="border-right: solid 1px #CCC; border-left: solid 1px #CCC; max-width:300px; height:20px; overflow-x:scroll; white-space: nowrap;">';
                    body_data +=   '<div id="'+curID+'" contenteditable="true">'
                    body_data +=     data[i][j];
                    body_data +=   '</div>'
                    body_data += '</td>';
                 
                }
                body_data += '</tr>';
            }
            body.append(body_data);
            return body;
          };
                
          table.append(populate_head());
          table.append(populate_body());
        }
    }

    return pub;
})();


var chartEditor = (function() {
    "use strict";

    var pub = {};   //public 

    // chart settings
    var settings = { 
        bindTo: "#chart",   //div id        

        xAxis:          "", // N?
        yAxes:          [],        
        zoom:           true,     //zoom enabled
        subchart:       false,    //don't show subchart                
        gridX:          true,     //x grid lines
        gridY:          true,     //y grid lines
        graphType:      "line",   //chart type
        xAxisTitle:     '',       // title above the x axis
        yAxisTitle:     '',       // title left to the y axis
        categoryLabels: false,    // Use category labels
        manData:        "",       // manual data sets (see applyManual)
        htmlDesc:       "",
        Title:          "",
        ShortTitle:     "",
        HasGraph:       true,
        HasTable:       true,
        Columns:        "",        
    };

    pub.getDefaultSettings = function() { return settings;};

    var chart;              //c3 chart
    var chartData = [[]];   //chart data

    //DOM classes and IDs
    var CHART_EDITOR = ".chart-editor";
    var CHART_SETTINGS_MODAL = "#chart-settings-modal"; 
    var X_SELECTOR = ".x-selector";
    var Y_SELECTOR = ".y-selector";
    var BUTTON_CHART_DATA = "#button-chart-data";
    var BUTTON_TOGGLE_EDITOR = "#button-toggle-editor";
    var BUTTON_SAVE_CHART_DATA = "#button-save-chart-data";
    var TEXTAREA_CHART_DATA = "#textarea-chart-data";

    var innerYAxisChange = false;

    pub.save = function() {
      settings.htmlDesc = btoa(settings.htmlDesc);
      settings.manData  = btoa(settings.manData);

      var data = {
        csrfmiddlewaretoken: window.CSRF_TOKEN,
        settings  : JSON.stringify(settings),
        query     : JSON.stringify(queryEditor.getQuery()),
      };
      var url = "/cpanel/savePresenter";

      $.post(
        url,
        data,
        function(response) {
          // alert(response.answer);
          util.hideSave();
        }
      ).always(function() {
        settings.htmlDesc = atob(settings.htmlDesc);
        settings.manData  = atob(settings.manData);
      });              
    };

    /** 
    *   Initializes chartEditor
    *   @param {string} div - Bind chart to div
    */
    pub.init = function(div) {
        settings.bindTo = div;
        wireEvents();
        pub.reloadSettings();
        pub.reload();
    };

    pub.getGraphData = function() {
      var curData = applyManual(util.copyArray(chartData), settings.manData);

      if (!settings.xAxis) settings.xAxis = "ID";
      curData = generateXColumns(curData, settings.xAxis, settings.yAxes); 
      return curData;
    }

    pub.setSettings = function(sts) {
        if (typeof sts === "string") {    
            try {sts = JSON.parse(sts);} catch (e) {}
        }

        if (sts != null) {
          Object.keys(sts).forEach(function (key) {
            try {              
              settings[key]=sts[key];

              if (key == "htmlDesc" || key == "manData")
                settings[key] = atob(settings[key])
            } catch (e) {}              
          });        
          pub.reloadSettings();

          util.hideSave(); 
        }
    };
    pub.reloadSettings = function() {        
        $("#zoom").           prop('checked', settings.zoom);        
        $("#subchart").       prop('checked', settings.subchart);        
        $("#gridX").          prop('checked', settings.gridX);        
        $("#gridY").          prop('checked', settings.gridY);        
        $("#categoryLabels"). prop('checked', settings.categoryLabels);        
        $("#logScale").       prop('checked', settings.logScale);  
        $("#HasGraph").       prop('checked', settings.HasGraph);  
        $("#HasTable").       prop('checked', settings.HasTable);  

        $("#graphType").val(settings.graphType);      

        $("#xAxisTitle").val(settings.xAxisTitle);        
        $("#yAxisTitle").val(settings.yAxisTitle);        
        $("#xAxis").val(settings.xAxis);        
        $("#Title").val(settings.Title);
        $("#ShortTitle").val(settings.ShortTitle);
        $("#Columns").val(settings.Columns);
        
        $("#manData").val(settings.manData);                
        $("#htmlDesc").val(settings.htmlDesc);        
          
        //$("#yAxes").val(settings.yAxes);
        
        var ySelector = $(Y_SELECTOR);
        var curValue = [];  
        if (settings.yAxes != null) {
          innerYAxisChange=true;
          try {
            for (var i = 0; i < settings.yAxes.length; i++ ) {
              let element = settings.yAxes[i];
              if (!$(ySelector).find("option[value='" + element + "']").length) {
                 var newOption = new Option(element, element, true, true);
                 $(ySelector).append(newOption);
               }  
               curValue.push(element);
            };
          } catch(e) {alert(e);}
          innerYAxisChange=false;                           
          ySelector.val(curValue).trigger('change');          
        }        
          
        pub.reload();
    }


    /**
    *   Loads new chart data
    */
    pub.load = function(data) {
        chartData = util.copyArray(data);
        if (!settings.xAxis)
          settings.xAxis = data[0][0];
        pub.reload();
    };

    /*  
    *   Redraws the chart with current data and repopulates the x/y 
    *   selection panels. 
    */
    pub.reload = function() {
      if (chartData != null && chartData.length > 1) {
        populateXPanel();
        populateYPanel();
        drawChart(chartData, "#main_chart", settings);        
      } else {
        drawChart([[]], "#main_chart", {});        
      }
    };    

    pub.unload = function() {
        chartData = [[]];
        pub.reload();
    };

    /*
    *   Toggles query editor visibility
    */
    pub.toggleQueryEditor = function () {
        var chartEditorParent = $(CHART_EDITOR).parent();
        var queryEditorParent = $(".query-editor").parent();

        $(queryEditorParent).toggleClass("hidden");
        $(chartEditorParent).toggleClass("col-md-9");
        $(chartEditorParent).toggleClass("fuck");
        pub.reload();
    };

    pub.drawChart = function(data, webControl, settings) {
        drawChart(data, webControl, settings);
    }

    /**
    *   Wires up chartEditor events
    */
    function wireEvents() {
        wireChartSettingsEvents();
        wireXYPanelEvents();
        wireChartDataEvents();
    }

    /**
    *   Wires up Chart Settings events
    */
    function wireChartSettingsEvents() {
        $(CHART_SETTINGS_MODAL).on("change", "input[type=checkbox]", function() {   //chart settings 
            var key = $(this).data("value");
            settings[key] = $(this).prop("checked");
            pub.reload();
            util.showSave();
        });

        $(CHART_SETTINGS_MODAL).on("change", "input[type=text], textarea, select", function() {     //chart type
            var name = $(this).attr('name'); 
            var val  = $(this).val();
            settings[name]=val;
            pub.reload();
            util.showSave();            
        });
    }

    /*
    *   Wires up X and Y panel events
    */
    function wireXYPanelEvents() {
        $(X_SELECTOR).on("change", function() {         //x panel
            settings.xAxis = $(this).val();            
            drawChart(chartData, "#main_chart", settings);        
            util.showSave();            
        });

        $(Y_SELECTOR).on("change", function() {    //y panel
            if (!innerYAxisChange) {
              settings.yAxes = $(this).val();
              drawChart(chartData, "#main_chart", settings);        
              util.showSave();            
            }
        });

        $(BUTTON_TOGGLE_EDITOR).click(function() {  //toggle editor button
            pub.toggleQueryEditor();
        });
    }

    function wireChartDataEvents() {
        $(BUTTON_CHART_DATA).click(function() {
            var textarea = $(TEXTAREA_CHART_DATA);
            var str = chartData.map(function(subarray) { return subarray.join(";"); }).join("\n");
            textarea.val(str);
        });

        $(BUTTON_SAVE_CHART_DATA).click(function() {
            var text = $(TEXTAREA_CHART_DATA).val();
            
            if (text.trim() !== "") {
                var data = text.trim().split("\n").map(function(line) {
                    return line.split(";");
                });
                pub.load(data);
            } else {
                pub.load([[]]);
            }
        });
    }

    /*
    *   Populates the x axis selection panel
    */
    function populateXPanel() {
        var x_selector = $(X_SELECTOR);
        var sel = x_selector.val();
        var xAxisSet = false;

        x_selector.empty();

        for (var i = 0; i < chartData[0].length; i++) {
            var entry = $("<option>", {
                "value": chartData[0][i]
            });
            entry.text(chartData[0][i]);
            x_selector.append(entry);
            if (sel==null) sel=chartData[0][i];

            if (chartData[0][i] == settings.xAxis) xAxisSet=true;
        }
        if (xAxisSet)
          $(x_selector).val(settings.xAxis);  
        else if (sel != null) {
          $(x_selector).val(sel);
          settings.xAxis=sel;
        }
    }

    /*
    *   Populates the y axis selection panel
    */
    function populateYPanel() {
        let y_selector = $(Y_SELECTOR);
        y_selector.empty();        

        let suffixes = new Set();

        for (let i = 0; i < chartData[0].length; i++) {

            if (chartData[0][i].includes(".")) {
                let pieces = chartData[0][i].split(/[.]/);
                let suffix = pieces[pieces.length-1];
                suffixes.add(suffix);
            }

            let entry = $("<option>", {
                "value": chartData[0][i],
                "data-value": chartData[0][i]
            });
            entry.text(chartData[0][i]);
            y_selector.append(entry);
        }

        suffixes.forEach(suffix => {
            let sufVal = "*."+suffix;
            let entry = $("<option>", {
                "value": sufVal,
                "data-value": sufVal
            });
            entry.text(sufVal);
            y_selector.prepend(entry);
        });
    }
    
    
//    function generateXColumn(data, x) {
//        var newData = util.copyArray(data);
//        var index = newData[0].indexOf(x);
//        newData[0].push(x + " ");
//        
//        for (var i = 1; i < data.length; i++) {
//            newData[i].push(newData[i][index]);
//        }
//
//        return newData;
//    }

    
    // transponirana 2D matrika
    function transpose(tabela) {
      return tabela[0].map(function(col, i) { 
          return tabela.map(function(row) { 
            return row[i]; 
          });
        });    
    }

    function strStartsWith(str, prefix) {
      return str.indexOf(prefix) === 0;
    }
    function strEndsWith(str, suffix) {
      return str.match(suffix+"$")==suffix;
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
              resData[novIdx++]  = util.copyArray(transData[i]);
            }    
          }
        
          resData[novIdx]     = util.copyArray(transData[xIndex]);
          resData[novIdx][0] += " ";

          var newData = transpose(resData);
        
          return newData; 
        } catch (err) {
            return data;
        } 
    }
    
    // prebere podatek o y oseh iz web kontrole "yAxesInput" in klice funkcijo generateXColumns
    function generateXColumn(data, x) {
        try {
          var yAxes = "ID";
          try {
              yAxes = $("#yAxesInput").val().split(" ");
          } catch (err) {}
          
         return generateXColumns(data, x, yAxes); 
      } catch (err) {
          return data;
      }
    }
    

    // manData gives instruction about how to change the data before creating a graph
    // manData is a JSON string that contains an array of manual sets.
    // A manual set can be of several type (like "Column" or "Formula"), 
    // currently only "Column" is supported.
    // A "Column" manual set changes values in a given column and requires the following Meta data:
    //    - Name ... the name of the column the changes apply to
    //    - Values ... an array of values for this column
    //    Example: {"Type":"Column", "Meta":{"Name":"ID", "Values":["10MB", 500, "30MB"]}}
    function applyManual(curData, manData) {
        try {
          var jMan = JSON.parse(manData);
          for (var i = 0; i < jMan.length; i++) {
            switch (jMan[i].Type) {
                case "Column":
                  var colName = jMan[i].Meta.Name;
                  var values  = jMan[i].Meta.Values;

                  //find column
                  var col = 0;
                  while(col < curData[0].length && curData[0][col] != colName) col++;
                  if (col < curData[0].length) {  // column exists
                    for (var j=0; j < values.length; j++) {
                        if (j < curData.length)
                          curData[j+1][col] = values[j].toString();
                    }
                  }
                  break;
            }            
          }
        } catch (err) {}
        return curData;
    }


    function drawChart(data, webControl, settings) {
        var curData = applyManual(util.copyArray(data), settings.manData);

        if (!settings.xAxis) settings.xAxis = "ID";
        curData = generateXColumns(curData, settings.xAxis, settings.yAxes);          
        //if (data.length < 1) return;        
        
        var xAxisType = '';
        if (settings.categoryLabels) xAxisType = 'category';

        if (settings.logScale) {
          var val = 0;
          for(var i=1; i<curData.length; i++) {
            for(var j=0; j<curData[i].length; j++) {
                try {
                  val = Math.log(curData[i][j]);                  
                } catch (e) {
                  val = "0";
                }  
                curData[i][j] = val.toFixed(2);
            }
          }
        }
        

        chart = c3.generate({
            data: {
                x: settings.xAxis + " ",                          
                rows: curData,
                type: settings.graphType
            },

            bindto: webControl,
            zoom: {
                enabled: settings.zoom
            },
            
            subchart: {
                show: settings.subchart
            },
            legend: {
                show: true
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
                    label: {
                        text: settings.xAxisTitle,
                        position: 'outer-center'
                    },
                    type: xAxisType,
                    tick: {
                        fit: settings.categoryLabels
                    }
                },
                y: {
                    label: {
                        text: settings.yAxisTitle,
                        position: 'outer-middle'
                    }
                }
            }
        });
    }
    return pub;
})();


var util = (function () {

    var pub = {};

    pub.showSave = function() {
      $("#labSaved").hide();
      $("#labSave").show();
    };
    pub.hideSave = function() {
      $("#labSaved").show(1000,function() {$("#labSaved").hide();});
      $("#labSave").hide();      
    };


    /**
    *   Return parameter value from the current URL
    */
    pub.getParameterFromURL = function (parameter) {
        parameter = parameter.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + parameter + "=([^&#]*)"), results = regex.exec(window.location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    /**
    *   Syntax highlight a JSON string
    */
    pub.syntaxHighlight = function (json) {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, undefined, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    };

    pub.copyArray = function (array) {
        if (typeof array !== 'undefined') {
          var newArray = array.map(function (arr) {
            return arr.slice();
          });
          return newArray;
        } else 
          return null;
    };

    return pub;
})();
