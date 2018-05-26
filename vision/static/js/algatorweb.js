
var queryEditor = (function () {
    "use strict";

    var pub = {};   //public methods & properties

    var project;    //project name
    var query;      //current query
    var data;       //project data

    var ajaxRequest; // current ajax request

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
    *   @param {string} q - Query string.
    */
    pub.setQuery = function(q) {
        if (typeof q === "string") {    
            q = JSON.parse(q);
        }

        Object.keys(q).forEach(function (key) {
            if (key === "Filter" || key === "GroupBy" || key === "SortBy" || key == "ComputerID") {
                $("#text-" + key).val(q[key]);
            } else {
                q[key].forEach(function(element, index, array) {
                    var split = element.split(" AS ");
                    $("#checkbox-" + key + "-" + split[0]).prop("checked", true);
                    if (split.length == 2) {
                        $("#text-" + key + "-" + split[0]).val(split[1]); 
                    }       
                });
            }
        });
        handleQueryChange();
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
          }
        } catch (err) {}
       
        if (newQuery["Algorithms"]== undefined   || newQuery["Algorithms"] === null) newQuery["Algorithms"]=[];
        if (newQuery["TestSets"]== undefined     || newQuery["TestSets"]   === null) newQuery["TestSets"]  =[];
        if (newQuery["Parameters"]== undefined   || newQuery["Parameters"] === null) newQuery["Parameters"]=[];
        if (newQuery["Indicators"]== undefined   || newQuery["Indicators"] === null) newQuery["Indicators"]=[];

        
 
        //filter, groupby, sortby, COMPID
        newQuery.Filter = [filter.val()];
        newQuery.GroupBy = [groupBy.val()];
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

        history.replaceState(null, "", url); 
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
        var newQuery = generateQuery();

        if (JSON.stringify(newQuery) !== JSON.stringify(query)) {   //check if there was an actual query change
            $(QUERY_TEXT).html(util.syntaxHighlight(newQuery));          //display query
            requestData(JSON.stringify(newQuery));                  //request new data
            query = newQuery;
            //requestData(query);
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
                return line.join(",");
            }).join("\n");

            var blob = new Blob([csvText], {type: "text/plain;charset=utf-8"});
            alert(project + "-data.csv");
            saveAs(blob, project + "-data.csv");
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
        $(COUNTID).on("change", handleQueryChange);
    }

    /**
    *   Populates table with algator data
    */
    pub.populateTable = function () {
        var table = $(DATA_TABLE); 
        
        var populate_head = function () {
            var head = $('<thead>');
            var head_data = '<tr>';
            for (var i = 0; i < data[0].length; i++) {
                head_data += '<th align="center">' + data[0][i] + '</th>';
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
                    body_data += '<td align="center" style="border-right: solid 1px #CCC; border-left: solid 1px #CCC;">';
                    body_data += data[i][j];
                    body_data += '</td>';
                }
                body_data += '</tr>';
            }
            body.append(body_data);
            return body;
        };
        
        table.empty();
        table.append(populate_head());
        table.append(populate_body());
    }

    return pub;
})();


var chartEditor = (function() {
    "use strict";

    var pub = {};   //public 

    // chart settings
    var settings = {
        bindTo: "#chart",   //div id
        zoom: true,         //zoom enabled
        type: "line",       //chart type
        subchart: false,    //don't show subchart
        gridx: true,       //x grid lines
        gridy: true        //y grid lines
    };

    var chart;              //c3 chart
    var chartData = [[]];   //chart data
    var xAxis;              //column used as x axis

    //DOM classes and IDs
    var CHART_EDITOR = ".chart-editor";
    var CHART_SETTINGS_MODAL = "#chart-settings-modal"; 
    var X_SELECTOR = ".x-selector";
    var Y_SELECTOR = ".y-selector";
    var BUTTON_CHART_DATA = "#button-chart-data";
    var BUTTON_TOGGLE_EDITOR = "#button-toggle-editor";
    var BUTTON_SAVE_CHART_DATA = "#button-save-chart-data";
    var TEXTAREA_CHART_DATA = "#textarea-chart-data";

    /** 
    *   Initializes chartEditor
    *   @param {string} div - Bind chart to div
    */
    pub.init = function(div) {
        settings.bindTo = div;
        wireEvents();
        pub.reload();
    };

    /**
    *   Loads new chart data
    */
    pub.load = function(data) {
        chartData = data;
        xAxis = data[0][0];
        pub.reload();
    };

    pub.unload = function() {
        chartData = [[]];
        pub.reload();
    };

    /*  
    *   Redraws the chart with current data and repopulates the x/y 
    *   selection panels. 
    */
    pub.reload = function() {
        populateXPanel();
        generateChart(chartData);
        // populateYPanel();
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

    pub.drawChart = function(data, xAxis, yAxes, webControl, settings) {
        drawChart(data, xAxis, yAxes, webControl, settings);
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
            if ($(this).prop("checked")) {
                settings[key] = true;

            } else {
                settings[key] = false;
            }
            pub.reload();
        });

        $(CHART_SETTINGS_MODAL).on("change", "select", function() {     //chart type
            var val = $(this).val();
            settings.type = val;
            pub.reload();
        });
    }

    /*
    *   Wires up X and Y panel events
    */
    function wireXYPanelEvents() {
        $(X_SELECTOR).on("change", function() {         //x panel
            xAxis = $(this).val();            
            generateChart(chartData);
            populateYPanel();
        });

        $(Y_SELECTOR).on("change", function() {    //y panel
            generateChart(chartData);
            populateYPanel();
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

        x_selector.empty();

        for (var i = 0; i < chartData[0].length; i++) {
            var entry = $("<option>", {
                "value": chartData[0][i]
            });
            entry.text(chartData[0][i]);
            x_selector.append(entry);
        }
        $(x_selector).val(sel);
        xAxis = sel;
    }

    /*
    *   Populates the y axis selection panel
    */
    function populateYPanel() {
        var y_selector = $(Y_SELECTOR);
        y_selector.empty();

        for (var i = 0; i < chartData[0].length; i++) {
            var entry = chartData[0][i];
            var element = $("<li>", {
                "class": "list-group-item legend-entry",
                "data-value": entry
            });

            var sq = $("<div>", {
                "class": "square",
                "data-value": entry
            });
            $(sq).css("background", chart.color(entry));
            $(sq).css("border-color", chart.color(entry));

            element.text(entry);
            element.prepend(sq);
            y_selector.append(element);
        } 
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
          var yAxes = "N";
          try {
              yAxes = $("#yAxesInput").val().split(" ");
          } catch (err) {}
          
         return generateXColumns(data, x, yAxes); 
      } catch (err) {
          return data;
      }
    }
    
    /**
    *  Gets yAxes from web control "yAxesInput" and calls drawChart 
    */
    function generateChart(data) {        
        var yAxes = "N";
        try {
            yAxes = $("#yAxesInput").val().split(" ");
        } catch (err) {}
        drawChart(data, xAxis, yAxes, "#main_chart", settings);        
    }


    function drawChart(data, xAxis, yAxes, webControl, settings) {
        data = generateXColumns(data, xAxis, yAxes);          
        
        chart = c3.generate({
            data: {
                x: xAxis + " ",
                rows: data,
                type: settings.type
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
                    show: settings.gridx
                },
                y: {
                    show: settings.gridy
                }
            },
            transition : {
                duration: 500
            },
            axis : {
                x: {
                    label: {
                        text: settings.xlabel,
                        position: 'outer-center'
                    },

                    tick: {
                        fit: false
                    }
                },
                y: {
                    label: {
                        text: settings.ylabel,
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
