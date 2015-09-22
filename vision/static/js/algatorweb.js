/*jslint browser: true*/
/*global $, c3*/


var queryEditor = (function () {
    "use strict";

    var pub = {};   //public methods & properties

    var project;    //project name
    var query;      //current query
    var data;       //project data

    //DOM classes and IDs
    var QUERY_EDITOR = ".query-editor";
    var DATA_TABLE = "#alg-data-table";
    var QUERY_TEXT = ".pre-query-text";
    var FILTER = "#text-Filter";
    var GROUP_BY = "#text-GroupBy";
    var SORT_BY = "#text-SortBy";
    var DOWNLOAD_QUERY = "img.download-query";
    var DOWNLOAD_DATA = "img.download-data";

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
            if (key === "Filter" || key === "GroupBy" || key === "SortBy") {
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
        var newQuery = {};

        //loop through checkboxes and if checked push to query object
        checkboxes.each(function () {
            if (this.checked) {
                var element = $(this);
                var data_type = element.data("type");
                var data_value = element.data("value");
                var text = $("#text-" + data_type + "-" + data_value).val();

                if (!newQuery.hasOwnProperty(data_type)) {
                    newQuery[data_type] = [];
                }

                if (text === "") {
                    newQuery[data_type].push(data_value);
                } else {
                    newQuery[data_type].push(data_value + " AS " + text);
                }
            }
        });

        //filter, groupby, sortby
        newQuery.Filter = [filter.val()];
        newQuery.GroupBy = [groupBy.val()];
        newQuery.SortBy = [sortBy.val()];
        return newQuery;
    }

    /**
    *   Parses Algator query response
    *   @param {string} response - Algator query response.
    *   @returns {Array} newData
    */
    function parseResponse(response) {
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
        var encoded = encodeURIComponent(query);     //encode request string
        var url = "http://localhost:8000/cpanel/askServer?q=getQueryResult%20Sorting%20"+encoded;  //request url

        $.ajax({
            url: url,
            dataType: 'json',
        }). done(function (response) {  
           var answer = response.answer;;
           data = parseResponse(answer);
                    if (data.length > 0) {
                        populateTable();
                        chartEditor.load(data);
                    } else {
                        $(DATA_TABLE).empty();
                        chartEditor.unload();
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
            history.replaceState(null, "", window.location.pathname +   "?projectName=Sorting" + "&query=" + JSON.stringify(newQuery));  //set url query parameter
            query = newQuery;
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
            saveAs(blob, project + "-data.csv");
        }
    }

    /**
    *   Wires up queryEditor events
    */
    function wireEvents() {
        $(QUERY_EDITOR).on("click", "input[type=checkbox]", handleQueryChange);  //checkbox click
        $(QUERY_EDITOR).on("blur", "input[type=text]", handleQueryChange);       //textbox blur (lost focus)
        $(DOWNLOAD_QUERY).on("click", handleQueryDownload);
        $(DOWNLOAD_DATA).on("click", handleDataDownload);
    }

    /**
    *   Populates table with algator data
    */
    function populateTable() {
        var table = $(DATA_TABLE); 
        
        var populate_head = function () {
            var head = $('<thead>');
            var head_data = '<tr>';
            for (var i = 0; i < data[0].length; i++) {
                head_data += '<th>' + data[0][i] + '</th>';
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
                    body_data += '<td>';
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
        generateChart(chartData);
        populateXPanel();
        populateYPanel();
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

        $(Y_SELECTOR).on("click", "li", function() {    //y panel
            var id = $(this).data("value");
            if ($(this).hasClass("disabled-entry")) {
                $(this).removeClass("disabled-entry");
                $(this).find(".square").css("background", chart.color(id));
            } else {
                $(this).find(".square").css("background", "#fff");
                $(this).addClass("disabled-entry");
            }
            chart.toggle(id);
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
        x_selector.empty();

        for (var i = 0; i < chartData[0].length; i++) {
            var entry = $("<option>", {
                "value": chartData[0][i]
            });
            entry.text(chartData[0][i]);
            x_selector.append(entry);
        }
        $(x_selector).val(xAxis);
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

    function generateXColumn(data, x) {
        var newData = util.copyArray(data);
        var index = newData[0].indexOf(x);
        newData[0].push(x + " ");
        
        for (var i = 1; i < data.length; i++) {
            newData[i].push(newData[i][index]);
        }

        return newData;
    }

    /**
    *   Generates c3.js chart
    *   @param {Array} data
    */
    function generateChart(data) {
        data = generateXColumn(data, xAxis);  

        chart = c3.generate({
            data: {
                x: xAxis + " ",
                rows: data,
                type: settings.type
            },
            bindto: settings.bindTo,
            zoom: {
                enabled: settings.zoom
            },
            
            subchart: {
                show: settings.subchart
            },
            legend: {
                show: false
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
                    tick: {
                        fit: false
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
        var newArray = array.map(function (arr) {
            return arr.slice();
        });
        return newArray;
    };

    return pub;
})();
