class Environment {
  constructor() {
    this.blockID = 0;
    this.commands = new Map(); // mapping (blockID, commandID)
    this.data     = new Map(); // mapping (blockID, data)
  }
}
env = new Environment();

class Data {
  static get TEXT_DATA()  { return "TextData"; }    // tekstovni podatki
  static get ERROR_DATA() { return "ErrorData"; }   // sporočilo o napaki
  static get TABLE_DATA() { return "TableData"; }   // tabela podatkov
  static get PLOT_DATA()  { return "PlotData"; }    // tabela podatkov


  constructor(type) {
    this.type = type;
  }

  toHtml() {
    return "Type: " + this.type;
  }

  // action that is executed after the data div is inserted into document
  // at the moment only the PlotData requires postProcessing; other classes
  // provide all the information in the toHtml() method
  postProcess() {}
}

// V objektih TextData hranim tekstovne podatke (besedilo v več vrsticah).
// Primer tekstovnih podatkov: odgovor serverja, vsebina datoteke, ...
// Tekstovmne podatke prikažem v <pre> odseku, pred tem pa označim (<b>) vse  
// vrstice, ki se začenjajo z nevidnim znakom \u200B.
class TextData extends Data {
  constructor(textData) {
    super(Data.TEXT_DATA);
    this.textData = textData;
  }

  getTextData() {
    return this.textData;
  }

  toHtml() {
    var preText = '<pre class="panel" style="padding-left: 0px;padding-top: 0px;">'  +
                      this.textData.replace(/(\u200B.*\n)/g, "<b>$1</b>")        +
                  '</pre>';
    return preText;
  }
}
class ErrorData extends TextData {
  constructor(errorMsg) {
    super("Error: " + errorMsg);
    this.type = Data.ERROR_DATA;
  }
}
class TableData extends Data {
  constructor(rawData) {
    super(Data.TABLE_DATA);
    this.rawData = rawData;
    this.data = this.parseRawData(rawData);
  }

  parseRawData(rawData) {
    var data = [], i, j;
    var vrstice = this.rawData.split("\n");

    var header = ["ID"];
    for(i=0; i<vrstice[0].split(";").length;i++)
      header.push("H"+i);
    data.push(header);   

    for(i=0; i<vrstice.length; i++) {
      var vData  = [i+""];
      var vParts = vrstice[i].split(";");

      var allEmpty=1;
      for(j=0; j < vParts.length; j++) {
        if (vParts[j]) {
          vData.push(vParts[j]); allEmpty=0;
        } else
          vData.push("");
      }
      if (allEmpty != 1)
        data.push(vData);
    }
    return data;
  }

  // iz sebe naredi novo tabelo s stolpci, ki so nasteti v tabeli params
  rows(params) {
    var i, j, newRaw = "";
    var vrstice = this.rawData.split("\n");
    for(i=0; i<vrstice.length; i++) {
      var nVrstica  = "";
      var vParts = vrstice[i].split(";");
      for(j=0; j < vParts.length; j++) {
        if (params.includes(j+""))
          nVrstica += (nVrstica==="" ? "" : ";") + vParts[j];
      }    
      newRaw += (newRaw==="" ? "" : "\n") + nVrstica;
    }
    return new TableData(newRaw);
  }

  toHtml() {
    var i, j, tableContent = "";
    for(i=0; i<this.data.length; i++) {
      tableContent += "<tr>\n";
      for(j=0; j<this.data[i].length; j++) {
        tableContent += "  <td align='center' style='border-right: solid 1px #CCC; border-left: solid 1px #CCC;'>" 
                              + this.data[i][j] 
                        + "</td>\n"
      }
      tableContent+="</tr>\n";
    }
    var preText = '<table class="table table-hover table-condensed">'  +
                      tableContent           + 
                  '</table>';
    return preText;
  }
}

class PlotData extends Data {
  constructor(data, params, blockID) {
    super(Data.PLOT_DATA);
    this.data   = data;
    this.params = params;
    this.blockID = blockID;
  }
  toHtml() {
    var divID = "graph-" + this.blockID;
    var graphDiv = '<div id="'+divID+'" class="chart c3" style="height: 320px; position: relative;"></div>';
    return graphDiv;
  }
  postProcess() {
    var divID = "graph-" + this.blockID;
    
    var prms = Array.from(this.params);
    if (!prms.length != 0) prms = Array.from(this.data[0]);

    var settings = chartEditor.getDefaultSettings();
    settings.xAxis = prms[0];
    prms.shift();
    settings.yAxes = prms;


    chartEditor.drawChart(this.data, "#"+divID, settings);
  }  
}


function askServer(question, blockID, callback) {   
  var url = "/cpanel/askServer?q=" + question; 
  
  var data = {
      csrfmiddlewaretoken : window.CSRF_TOKEN,
      q : question,
  };

  $.ajax({
    url: url,
    type: "POST",
    data: data,

    error: function(err) {
      alert("Napak: " + err.toString()); 
    },    
    success: function(result) {
      callback(blockID, result.answer)
    }        
  });  
}

function processKey(event, blockID) {
  var chCode = ('charCode' in event) ? event.charCode : event.keyCode;
  if (chCode == 13)
    processQuestion(blockID);
}


function showAnswer(blockID, data) {  
  env.data.set(blockID+"", data);

  // če je vrstica za odgovor še skrita, jo prikažem ...
  document.getElementById("ansTR-" + blockID).style.display = "table-row";      
  // ... in vanjo vstavim podatke
  $("#cmdAnswer-" + blockID).html(data.toHtml());
  data.postProcess();
}


// show answer 
function showServerAnswer(blockID, serverAnswer) {  
  var data = new TextData(serverAnswer.replace(/<br>/g, "\n"));

  showAnswer(blockID, data);
}

function waitForServerAnswer(blockID, commandID) {
  // najprej ustavim morebitno akcijo, ki se je izvajal od prej (da ne pride do zombi akcij)
  stopCMD(blockID);
  
  env.commands.set(blockID, commandID);
  $("#cmdStatusB-"+blockID).attr('title', commandID);

  var timer = setInterval(function() {
      askServer("command output " + commandID, blockID, function(dID, ans) {
        if (ans.startsWith("_NO_OUTPUT_AVAILABLE_")) {
          clearInterval(timer);          
          $("#cmdStatusB-" + blockID).css("background","green");
        } else {
          $("#cmdStatusB-" + blockID).css("background","red");
          showServerAnswer(dID, ans)
        }
      });
    }, 500);  
}

function novElement() {
  env.blockID++;

  var cont = '                                                                                    \
    <div class="elt panel" id="cmdDiv-_hID_" style="border-style: solid; border-color: #eeeeee; overflow: scroll;">\
      <table class="panel" id="cmdTable-_hID_" width=100%>                                                      \
        <tr>                                                                                    \
            <td align=right style="width: 80px; min-width:80px">\
              <input id="cmdStatusB-_hID_" type="button" style="background-color: green; height: 9px; width: 9px;" value="" class="myBtn" onclick="stopCMD(_hID_);">\
              [%_hID_]:\
            </td>                                            \
            <td><input class="vpis" id="cmdQuestion-_hID_" type="text" style="width: 100%;" onKeyPress="processKey(event, _hID_);"/></td> \
            <td width="30"><input id="cmdDeleteB-_hID_" type="button" style="background-color: #eeeeee;" value="x" class="myBtn" onclick="deleteCMD(_hID_);"> \
            </td> \
        </tr> \
        <tr id="ansTR-_hID_" style="display: none;"> \
            <td valign=top align=right style="padding-top:7px;">└──>\
            </td> \
            <td style="border-top: 2px solid lightblue; padding-top:7px;">\
                <div id="cmdAnswer-_hID_" style="max-height: 300px; overflow: auto;"></div>   \
            </td>\
            <td valign=bottom>\
                <div style="height:12px; width: 100%; text-align: center;" draggable="true"\
                  ondragstart="dragStart(event)" ondrag="doDrag(event, _hID_)">▲</p>\
            </td>\
        </tr>\
      </table>\
    </div>\
  ';

  cont = cont.replace(/_hID_/g, env.blockID);
  $("#vsebina").append(cont);

  var vpis = document.getElementById("cmdQuestion-" + env.blockID);
  vpis.focus();
}


function deleteCMD(blockID) {
  var element = document.getElementById("cmdDiv-"+blockID);
  element.parentNode.removeChild(element);
}

function stopCMD(blockID) {
  var commandId = env.commands.get(blockID);
  if (commandId != null) {
    askServer("command stop " + commandId, blockID, function(dID, ans){
      console.log("Stoping command "+dID+" answer: " + ans);
    });
  }
}

function dragStart(event) {
  lastDragY = event.clientY;
}
function doDrag(event, blockID) {
  var curY = event.clientY;
  var divID = "cmdAnswer-"+blockID;
  
  var height = document.getElementById(divID).style.height;
  document.getElementById(divID).style.height = (lastDragY - curY)+"px" ;
  
  lastDragY = curY;
}



// Questions and Answers
function processQuestion(blockID) {
  // če je to vprašanje iz zadnjega taba, pred odgovorom ustvarim nov tab
  if (blockID == env.blockID) novElement();


  // pridobim cmdQuestion vpisno polje ...
  inp = document.getElementById("cmdQuestion-"+blockID);
  if (inp == null) return;
  // ... in preberem vprašanje
  vpr=inp.value; 

  // %1, %2, ... prikaz rezultata
  if (vpr.includes("%")) {
    processPercent(blockID, vpr);
  } else if (vpr.startsWith("$")) { // $execute == command run Execute;  $list == command list
    processCommand(blockID, vpr);
  } else {
    askServer(vpr, blockID, showServerAnswer);
  }
}

// prejel sem ukaz (command)
//$execute, $analyse, $admin, $version, $users ali $$list, $$stop ID, $$status ID, $$output ID
function processCommand(blockID, vpr) {
  var cmd = vpr.substring(1);

  if (cmd.startsWith("$")) { // ukazi list, status in stop se začnejo z $
    // ti ukazi vrnejo enkraten odgovor, zato uporabim "showServerAnswer"
    askServer("command " + cmd.substring(1), blockID, showServerAnswer);
  } else { // ostali ukazi (Execute, Analyse, ...)
    askServer("command run " + cmd, blockID, waitForServerAnswer);  
  }
  
}

// prejel sem ukaz, ki vsebuje % (torej sklic na prejšnji odgovor)
// primer: %3 trim table
// najprej pridobim prejšnji odgovor (vsebino %3), nato nad tem izvedem trim in table
function processPercent(blockID, vpr) {
  var params = [];
  var parts  = vpr.substring(1).split(" ");
  var data   = env.data.get(parts[0]);

  for(i=1; i<parts.length; i++) {
    switch (parts[i]) {
      case "even": 
        if (data.type === Data.TEXT_DATA) {       
          var vrstice = data.getTextData().split("\n");
          var ans="";
          for(j=0; j<vrstice.length; j++) 
            if (j%2 == 0) ans += vrstice[j] + "\n";
          data = new TextData(ans);
        } else {
          data = new ErrorData("Invalid argument to 'even': " + data.type);
        }  
        break;  

      case "odd": 
        if (data.type === Data.TEXT_DATA) {       
          var vrstice = data.getTextData().split("\n");
          var ans="";
          for(j=0; j<vrstice.length; j++) 
            if (j%2 != 0) ans += vrstice[j] + "\n";
          data = new TextData(ans);
        } else {
          data = new ErrorData("Invalid argument to 'odd': " + data.type);
        }  
        break;

      case "data": 
        if (data.type === Data.TEXT_DATA) {       
          var vrstice = data.getTextData().split("\n");
          var ans="";
          for(j=0; j<vrstice.length; j++) 
            if (vrstice[j].startsWith("\u200B")) ans += vrstice[j] + "\n";
          data = new TextData(ans);
        } else {
          data = new ErrorData("Invalid argument to 'data': " + data.type);
        }  
        break;

      case "table":
        if (data.type === Data.TEXT_DATA) {             
          data = new TableData(data.getTextData());
        } else {
          data = new ErrorData("Invalid argument to 'table': " + data.type);
        }
        break;

      case "rows":
        if (data.type === Data.TABLE_DATA) { 
          data = data.rows(params);         
          params = [];   
        } else {
          data = new ErrorData("Invalid argument to 'rows': " + data.type); 
        }
        break;

      case "plot":
        if (data.type === Data.TABLE_DATA) { 
          data = new PlotData(data.data, params, blockID);
          params = [];
        } else {
          data = new ErrorData("Invalid argument to 'plot': " + data.type); 
        }
        break;

      default:
        params.push(parts[i]);
    }
  }

  showAnswer(blockID, data);
}
1;