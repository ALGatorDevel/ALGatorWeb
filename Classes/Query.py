import json;

class Query:

    def __init__(self, name, description, algorithms, testsets, parameters, indicators, 
                 groupby, filter, sortby, count, computerid):
        self.Name = name
        self.Description  = description 
        self.Algorithms   = algorithms
        self.TestSets     = testsets
        self.Parameters   = parameters
        self.Indicators   = indicators
        self.GroupBy      = groupby
        self.Filter       = filter
        self.SortBy       = sortby
        self.Count        = count
        self.ComputerID   = computerid

    def getJSONString(self):
        jsonArray={
          "Name"        : self.Name,
          "Description" : self.Description,
          "Algorithms"  : self.Algorithms,
          "TestSets"    : self.TestSets,
          "Parameters"  : self.Parameters,
          "Indicators"  : self.Indicators,
          "GroupBy"     : self.GroupBy,
          "Filter"      : self.Filter,
          "SortBy"      : self.SortBy,
          "Count"       : self.Count,
          "ComputerID"  : self.ComputerID
        }
        return json.dumps(jsonArray).replace("\"", "_!!_").replace("'", "_!_")


    def __str__(self):
        return self.name
