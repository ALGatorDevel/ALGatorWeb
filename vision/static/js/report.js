  /*
   * Function runs a query, process data returned and displays 
   * table or/and graph. DIV with id table[divID] (if exists) is filled 
   * array, DIV with id graph[divID] (if exists) is filled with graph
   */
  function fillReportData(askServer, divID, projectName, query, settings) {
      // URL to run a query by ajax call
      query = query.replace(/u&#39;/g, "'").replace(/&#39;/g, "'")
                   .replace(/ /g, "_!_")   .replace(/&lt;/g, "<")
                   .replace(/&gt;/g, ">").replace(/&#x27;/g, "'");

      thisUrl = askServer;  //request url
      
      data = {
        csrfmiddlewaretoken: window.CSRF_TOKEN,
        q : "getQueryResult " + projectName + " "+ query + " "+ settings["params"],
      };

      // clear the content of both table and graph
      $("#table" + divID).html("");$("#graf" + divID).html("");

      $.post(
          thisUrl,
          data,          
          function (response) {  
      
             answer = response.answer;
             data   = queryEditor.parseResponse(answer);
                         
             // Fill table data if div exists
             if (settings["hasTable"] && $("#table" + divID).length) {
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
                 chartEditor.drawChart(data, "#graf" + divID, settings);
             }       
      });

      return 1;
  }


function newPresenter(project, tip) {
  var url = '/vision/newPresenter';
  var data = {
    csrfmiddlewaretoken: window.CSRF_TOKEN,
    project: project,
    type: tip
  }; 
  $.post(
    url,
    data,
    function(response) {
      location.reload();
      location.href = "#"+response.answer;
    }
  );  
  return 1;          
}


function removePresenter(project, presenter) {
  var r = confirm("Delete presenter '" + presenter + "'?");
  if (r == true) {
    var url = '/cpanel/askServer?q=admin -rdp ' + project + ' ' + presenter;
    $.get(url, function( my_var ) {
      try {          
        answer = JSON.parse(my_var).answer;       
        //alert(answer);
        location.reload();        
      } catch (err) { }
    }, 'html');      
  }
  return 1;
};
