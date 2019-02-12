import json;
import base64;

class Presenter:

    def __init__(self, path, name, title, shorttitle, description, query, hasgraph,
                 xaxis, yaxes, graphtype, xaxistitle, yaxistitle, hastable, columns,
                 zoom, subchart, gridx, gridy, categorylabels, logscale, mandata):
        self.path = path
        self.name = name
        self.title = title 
        self.shorttitle = shorttitle
        self.description = description
        self.query = query
        self.hasgraph = hasgraph
        self.xaxis = xaxis
        self.yaxes = yaxes  
        self.graphtype = graphtype 
        self.xaxistitle = xaxistitle
        self.yaxistitle = yaxistitle
        self.hastable = hastable
        self.columns = columns
        self.zoom = zoom
        self.subchart = subchart
        self.gridx = gridx
        self.gridy = gridy  
        self.categorylabels = categorylabels
        self.logscale = logscale
        self.mandata = mandata    

        self.html_desc=""   
        self.tip=0


    # this method is used to create a JSON representation of settings used
    # to show presenter on web page; instead of creating javascript hashtable
    # for settings on several html pages, we create JSON string containing 
    # these settings (which can be later used on web pages).
    def settingsJSON(self):
        jsonArray={
          "path"           : self.path,
          "name"           : self.name,
          "xAxis"          : self.xaxis,
          "yAxes"          : self.yaxes,
          "xAxisTitle"     : self.xaxistitle,
          "yAxisTitle"     : self.yaxistitle,
          "graphType"      : self.graphtype,
          "hasGraph"       : self.hasgraph,
          "hasTable"       : self.hastable,
          "zoom"           : self.zoom,
          "gridX"          : self.gridx,
          "gridY"          : self.gridy,
          "subchart"       : self.subchart,
          "categoryLabels" : self.categorylabels,
          "logScale"       : self.logscale,
          "Title"          : self.title,
          "ShortTitle"     : self.shorttitle,
          "HasGraph"       : self.hasgraph,
          "HasTable"       : self.hastable,
          "Columns"        : self.columns,
          "htmlDesc"       : base64.b64encode(self.html_desc),
          "manData"        : base64.b64encode(json.dumps(self.mandata))
        }
        # the replacement of quotes (with _!_) was used to avoid problems in html;
        return json.dumps(jsonArray).replace("\"", "_!!_").replace("'", "_!_")
      

    def __str__(self):
        return self.name
