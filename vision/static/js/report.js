  /*
   * Function runs a query, process data returned and displays 
   * table or/and graph. DIV with id table[divID] (if exists) is filled 
   * array, DIV with id graph[divID] (if exists) is filled with graph
   */
  function fillReportData(askServer, divID, projectName, query, settings) {
      // URL to run a query by ajax call
      thisUrl = askServer + "?q=getQueryResult%20" + projectName + "%20"+ query + "%20"+ settings["params"];  //request url


      // clear the content of both table and graph
      $("#table" + divID).html("");$("#graf" + divID).html("");

      $.ajax({
          url: thisUrl,
          dataType: 'json',
      }). done(function (response) {  
         answer = response.answer;
         data   = queryEditor.parseResponse(answer);
                    
        // Fill table data if div exists
        if (settings["hasTable"] && $("#table" + divID).length){
           tag = "<th>"; antiTag="</th>";           
           answer = answer.trim().replace(/<br>/g, "\n");
           
           lines = answer.split(/\r\n|\r|\n/g); 
           table = "<table class='table table-striped'>";
           for (var i = 0; i < lines.length; i++) {
             parts = lines[i].split(";");
             table += "<tr>";
             for (var j=0; j < parts.length; j++) { 
               table += tag + parts[j] + antiTag;  
             }
             table += "</tr>";
            
             tag = "<td>"; antiTag="</td>";
            }
            table += "</table>";                   
            $("#table" + divID).html(table);
        }
        
        // Draw a graph if data and if div exists
        if (settings["hasGraph"] && data.length > 0 && $("#graf" + divID).length) {
            chartEditor.drawChart(data, settings["xaxis"], settings["yaxes"], "#graf" + divID, 
               { zoom: true,         //zoom enabled
                 type: settings["GraphTypes"],       //chart type
                 subchart: false,    //don't show subchart
                 xlabel: settings["XLabel"],
                 ylabel: settings["YLabel"],
                 gridx: true,       //x grid lines
                 gridy: true        //y grid lines
               });
        }       
      });

      return 1;
  }

