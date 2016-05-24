import json;

class Presenter:

    def __init__(self, name, title, shorttitle, description, query, hasgraph,
                 xaxis, yaxes, graphtypes, xaxislabel, yaxislabel, hastable, columns):
        self.name = name
        self.title = title 
        self.shorttitle = shorttitle
        self.description = description
        self.query = query
        self.hasgraph = hasgraph
        self.xaxis = xaxis
        self.yaxes = json.dumps(yaxes)  # json.dumps is used to enable proper export of array to javascript
        self.graphtypes = json.dumps(graphtypes) 
        self.xaxislabel = xaxislabel
        self.yaxislabel = yaxislabel
        self.hastable = hastable
        self.columns = columns        

    def __str__(self):
        return self.name
