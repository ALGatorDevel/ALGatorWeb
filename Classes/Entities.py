import os
import json
import re
import sys

from Classes.Project import Project
from Classes.Algorithm import Algorithm
from Classes.Testset import Testset
from Classes.GlobalConfig import globalConfig
from Classes.Presenter import Presenter
from Classes.Query import Query
from Classes.TXTResult import TXTResult

from Classes.EntitiesLister import EntitiesLister

from Classes.ServerConnector import connector


from django.conf import settings
from shutil import copy2

############# HELPER methods ####################

gc = globalConfig

def readFileCont(fileName):
  try:
    file = open(fileName, 'r')
    content = file.read()
    file.close()

    return content
  except:
    return ""

# json_description vsebuje podatke o trenutni entiteti (npr, vse o projektu); metoda najprej iz polja
# htmlDesc prebere ime datoteke, kjer je zapisan HTML opis, nato v polje desc prebere celotno datoteko
def readHTMLDesc(path, fileName):
  try: 
    fullFileName = path + '/' + fileName

    if os.path.exists(fullFileName):
      # read the HTML file ...
      current_desc = readFileCont(fullFileName)

      # ... adopt hrefs to open in new tab ...
      current_desc = re.sub("<a +href=", '<a target="sub_w" href=', current_desc, flags=re.IGNORECASE)

      # ... and fix static links (of images and other files)
      current_desc = fixStaticLinks(path, current_desc)

      # replace %thisfile% with the name of this file
      # current_desc = re.sub("%thisfile%", fullFileName, current_desc, flags=re.IGNORECASE)
    else:
      current_desc = "No description provided in the '" + fullFileName + "' file."
                
    return current_desc
  except Exception as exi:
    return "Can't read " + fileName + " in " + path + ". Error: " + str(exi)


# all the links in the content to the static files (like images of other files)
# are replaced with static URLS and the files are copied to that location
# (these files are called dynamic-static since they appear dinamically while
#  displaying the page and since they are located in subfolder of static files)
#
# note: it works only for files that are placed in the same folder as original file
#  (no sub-folder support)
def fixStaticLinks(path, content):
  staticSubdir = "/dynamic"

  # if there is a substring "PROJ-" in the path, take only the substring
  # that follows; otherwise take the empty string
  pathEnding = path
  try:
    pathEnding  = path.rsplit('PROJ-', 1)[1]
  except:
    pass


  # create a folder for all dynamic-static files
  staticDirs = settings.STATICFILES_DIRS
  if len(staticDirs) > 0:
    staticRoot = staticDirs[0] + staticSubdir + '/' + pathEnding
  staticRoot = staticRoot.replace("//", "/")
  if not os.path.exists(staticRoot):
    os.makedirs(staticRoot)

  # search the content for the static links
  statics = re.findall(r'%static{([^}]+)}', content)
  for sLink in statics:
    copy2(path+'/'+sLink, staticRoot)
    newName = ("/static/"+staticSubdir + "/" + pathEnding+'/'+sLink).replace("//", "/")
    content = content.replace("%static{"+sLink+"}",newName)

  return content


def readProjectSourceFiles(projects_path, proj_name):
  folder = projects_path + "/proj/src/"

  sources = {}            
  sources["input_name"]         = "Input.java"
  sources["input"]              = readFileCont(folder + "Input.java")

  sources["output_name"]        = "Output.java"
  sources["output"]             = readFileCont(folder + "Output.java")

  sources["testcase_name"]      = "TestCase.java"
  sources["testcase"]           = readFileCont(folder + "TestCase.java")

  sources["absalgorithm_name"]  = "ProjectAbstractAlgorithm.java"
  sources["absalgorithm"]       = readFileCont(folder + "ProjectAbstractAlgorithm.java")

  sources["tools_name"]         =  "Tools.java"
  sources["tools"]              = readFileCont(folder + "Tools.java")


  return sources

def readAlgorithmSourceFiles(projects_path, proj_name, algorithm_name):
  folder = os.path.join(projects_path, "algs", "ALG-"+algorithm_name, "src")

  sources = {}            
  sources["alg_source_name"]   = "Algorithm.java"
  sources["alg_source"]        = readFileCont(os.path.join(folder, "Algorithm.java"))

  return sources

# reads the names of all txt-result files (files in the results folder)
def get_TXTResults(projects_path, algorithm_name):  
  resultFolder = os.path.join(projects_path , "results")

  txtResultFiles = []                    
  allTxtFolders = []
  
  try:
    allTxtFolders = os.listdir(resultFolder)
  except OSError:
    pass

  for txtFolder in allTxtFolders:
    subFolder =   os.path.join(resultFolder,  txtFolder)
    if os.path.isdir(subFolder):
      allTxtResults=[]
      try:
        allTxtResults = os.listdir(subFolder)
      except OSError:
        pass
      for txtFile in allTxtResults:  
        if txtFile.startswith(algorithm_name+"-"):
          txtResultFiles.append(TXTResult(txtFolder, txtFile[(len(algorithm_name)+1):]))

  return txtResultFiles



# presenter is either a filename with JSON description of JSON description itself
# projectName is the name of the project; it is used to resolve path for presenter file
def readPresenterDesc(projects_path, presenter_name):
  presenterPath   = projects_path + "/presenters/"
  try:
    pname="NoName"
    if isinstance(presenter_name,dict):   # graph is dictionary 
      jsonCont = presenter_name      
    if presenter_name.startswith("{"):  # is presenter_name a JSON description ?           
      jsonCont = json.loads(presenter_name)
    else:  # if not, read JSON from file     
      pname=presenter_name
      presenter=presenter_name   
      if not presenter.endswith(".json"):          
          presenter     = presenter + ".json"
      else:
          pname = pname[:-5]

      presenterPath   +=  presenter 
      fileContJSON = json.loads(readFileCont(presenterPath))
      jsonCont = fileContJSON["Presenter"]
  except Exception as e:
      print(str(e))
      jsonCont=[]

  try:
    name     = getValue(jsonCont,"Name", pname)
    title    = getValue(jsonCont,"Title")
    shtit    = getValue(jsonCont,"ShortTitle")
    desc     = getValue(jsonCont,"Description")
    query    = getValue(jsonCont,"Query")

    hasGraph = getValue(jsonCont,"HasGraph", True)
    xaxis    = getValue(jsonCont,"xAxis")
    yaxes    = getValue(jsonCont,"yAxes")
    gtypes   = getValue(jsonCont,"graphType")
    xal      = getValue(jsonCont,"xAxisTitle")
    yal      = getValue(jsonCont,"yAxisTitle")

    hasTable = getValue(jsonCont,"HasTable", True)
    columns  = getValue(jsonCont,"Columns")

    zoom     = getValue(jsonCont,"zoom", True)
    subchart = getValue(jsonCont,"subchart", False)
    gridx    = getValue(jsonCont,"gridX", True)
    gridy    = getValue(jsonCont,"gridY", True)
    category = getValue(jsonCont,"categoryLabels", False)
    logscale = getValue(jsonCont,"logScale", False)
    mandata  = getValue(jsonCont,"manData", [])

    
    presenterObj = Presenter(presenterPath, name, title, shtit, desc, query, hasGraph, xaxis, yaxes, gtypes, xal, yal, hasTable, columns,zoom, subchart, gridx, gridy, category, logscale, mandata)

    presenterObj.html_desc = readHTMLDesc (projects_path + "/presenters/", presenter_name.replace(".json", "") + ".html" )

    presenterObj.settingsCont = presenterObj.settingsJSON()
    presenterObj.queryCont    = readQueryDesc(projects_path, query).getJSONString()

    return presenterObj
  except Exception as ex: # if an error occures during json parsing, return "empty" Presenter
    print(str(ex))
    return Presenter(presenterPath, "NoName", "?", "?",  "?", "", False, "xaxis", [], [], "xal", "yal", False, [],  True, False, True, True, False, False, "")


def readQueryDesc(project_path, query):
  try:
    qname=pname="NoName" 
    if isinstance(query,dict):   # is query a dictionary?
      jsonCont = query      
    elif query.startswith("{"):  # is query a JSON description?           
      jsonCont = json.loads(query)
    else:  # if not, read JSON from file     
      qname=query
      qpath=query
      if not qpath.endswith(".json"):          
          qpath     = qpath + ".json"
      else:
          qname = qname[:-5]
      qpath   = project_path + "/queries/" + qpath 
      fileContJSON = json.loads(readFileCont(qpath))      
      jsonCont = fileContJSON["Query"]
  except:
      jsonCont={}

  try:
    name       = getValue(jsonCont,"Name", qname)
    desc       = getValue(jsonCont,"Description")

    algorithms = getValue(jsonCont,"Algorithms", [])
    testsets   = getValue(jsonCont,"TestSets",   [])
    parameters = getValue(jsonCont,"Parameters", [])
    indicators = getValue(jsonCont,"Indicators", [])

    groupby    = getValue(jsonCont,"GroupBy", "")
    filter     = getValue(jsonCont,"Filter",  "")
    sortby     = getValue(jsonCont,"SortBy",  "")
    count      = getValue(jsonCont,"Count",   False)
    compid     = getValue(jsonCont,"ComputerID", "")

    queryObj   = Query(name, desc, algorithms, testsets, parameters, indicators, groupby, filter, sortby, count, compid)

    return queryObj
  except: # if an error occures during json parsing, return "empty" Query
    return Query("NoName", "?", [],  [], [], [], "", "", "", False, "")



def getValue(dictionary, key, default=""):
    return dictionary[key] if key in dictionary.keys() else default

##################################################


class Entities(object):

    def __init__(self):

        #-------------------------------------------------------------------#
        # Main path used through out the class. This folder contains all the
        # json files of different type
        #-------------------------------------------------------------------# 
        self.projects_path = globalConfig.projects_path

        #the render(output) lists of objects -> Array of Project objects
        self.projects_list = []

        self.entities_lister = EntitiesLister(self.projects_path)        


    def get_projects_list(self, deep=False):
      projects_names = sorted(self.entities_lister.get_projects_names()) 
      projects_list = []
      for project_name in projects_names:
        projects_list.append(self.read_project(project_name, deep))
      return projects_list

    def get_algorithms_list(self, project_name, deep=False):
      algorithms_names = sorted(self.entities_lister.get_algorithms_names(project_name)) 
      algorithms_list = []
      for algorithm_name in algorithms_names:
        algorithms_list.append(self.read_algorithm(project_name, algorithm_name, deep))
      return algorithms_list

    def get_testsets_list(self, project_name, deep=False):
      testsets_names = sorted(self.entities_lister.get_testsets_names(project_name)) 
      testsets_names = sorted(testsets_names, key = lambda x: int('0'+''.join(ele for ele in x if ele.isdigit()))) 

      testsets_list = []
      for testsets_name in testsets_names:
        testsets_list.append(self.read_testset(project_name, testsets_name, deep))
      return testsets_list



    # reads the project and returns an object of type Project. If deep = True all the information about the project
    # (including the information about its sub entities, like algorithms and test sets) are read entierly,
    # otherwise only basic information about the project is read
    def read_project(self, project_name, deep):
      project_root_path = self.projects_path + "/PROJ-" + project_name; 
      project_description_filename = project_root_path + "/proj/"+"project.json";
      description_file = readFileCont(project_description_filename)
      try:
        json_description = json.loads(description_file)['Project']
      except:
        # gc.logger.error(err)
        json_description = {}
        return Project("", )


      project_desc      = getValue(json_description, 'Description')
      project_author    = getValue(json_description, 'Author')
      project_date      = getValue(json_description, 'Date')


      project = Project(project_name, project_desc, project_author, project_date)    

      project.algorithms = self.get_algorithms_list(project_name, deep)  
      project.testsets   = self.get_testsets_list(project_name, deep)  


      if deep:      
        project_doc_path              = project_root_path + "/proj/doc";
        project.html_desc             = readHTMLDesc(project_doc_path, getValue(json_description, 'ProjectDescHTML', "project.html")) 
        project.algorithms_html_desc  = readHTMLDesc(project_doc_path, getValue(json_description, 'AlgorithmDescHTML', "algorithm.html"))       
        project.test_case_html_desc   = readHTMLDesc(project_doc_path, getValue(json_description, 'TestCaseDescHTML', "testcase.html")) 
        project.test_sets_html_desc   = readHTMLDesc(project_doc_path, getValue(json_description, 'TestSetDescHTML', "testset.html"))       
        project.project_ref_desc      = readHTMLDesc(project_doc_path, getValue(json_description, 'ProjectRefHTML', "references.html")) 

        sources = readProjectSourceFiles(project_root_path, project_name)
        project.source_input_name           = sources["input_name"]
        project.source_input                = sources["input"]
        project.source_output_name          = sources["output_name"]
        project.source_output               = sources["output"]
        project.source_testcase_name        = sources["testcase_name"]
        project.source_testcase             = sources["testcase"]
        project.source_algorithm_name       = sources["absalgorithm_name"]
        project.source_algorithm            = sources["absalgorithm"]
        project.source_tools_name           = sources["tools_name"]
        project.source_tools                = sources["tools"]

        project.jj = connector.talkToServer("admin -i " + project_name)

        # add all the presenters to the projetc
        project.presenters = {}

        projPresenterNames = getValue(json_description, 'ProjPresenters', [])                        
        for pPresenter in sorted(projPresenterNames): 
          thisPresenter = readPresenterDesc(project_root_path,pPresenter)
          thisPresenter.tip=1
          pPresenterN = os.path.splitext(os.path.basename(pPresenter))[0]
          project.presenters[pPresenterN] = thisPresenter
          project.ProjPresenters.append(thisPresenter)

        mainProjPresenters = getValue(json_description, 'MainProjPresenters', [])
        for mProjPresenter in mainProjPresenters: 
          thisPresenter = readPresenterDesc(project_root_path, mProjPresenter)
          thisPresenter.tip=0
          mProjPresenterN = os.path.splitext(os.path.basename(mProjPresenter))[0]
          project.presenters[mProjPresenterN] = thisPresenter
          project.MainProjPresenters.append(thisPresenter)   

        algPresenters = getValue(json_description, 'AlgPresenters', [])                        
        for aPresenter in algPresenters: 
          thisPresenter = readPresenterDesc(project_root_path, aPresenter)
          thisPresenter.tip=3
          aPresenterN = os.path.splitext(os.path.basename(aPresenter))[0]          
          project.presenters[aPresenterN] = thisPresenter
          project.AlgPresenters.append(thisPresenter)   

        mainAlgPresenters = getValue(json_description, 'MainAlgPresenters', [])
        for mAlgPresenter in mainAlgPresenters: 
          thisPresenter = readPresenterDesc(project_root_path, mAlgPresenter)
          thisPresenter.tip=2
          mAlgPresenterN = os.path.splitext(os.path.basename(mAlgPresenter))[0]          
          project.presenters[mAlgPresenterN] = thisPresenter
          project.MainAlgPresenters.append(thisPresenter)   

      return project


    # reads the algorithm and returns an object of type Algorithm. If deep = True all the information about the algorithm
    # are read entierly, otherwise only basic information about the algorithm is read    
    def read_algorithm(self, project_name, algorithm_name, deep):
      project_root_path = self.projects_path + "/PROJ-" + project_name
      algorithm_root_path = project_root_path + "/algs/ALG-" + algorithm_name 
      algorithm_description_filename = algorithm_root_path + "/" + "algorithm.json"
      description_file = readFileCont(algorithm_description_filename)
      try:
        json_description = json.loads(description_file)['Algorithm']
      except Exception as err:
        json_description = {}  

      algorithm_shortName = getValue(json_description, 'ShortName')
      algorithm_desc      = getValue(json_description, 'Description')
      algorithm_author    = getValue(json_description, 'Author')
      algorithm_date      = getValue(json_description, 'Date')
      algorithm_language  = getValue(json_description, 'Language')
  
  
      algorithm = Algorithm(algorithm_name, algorithm_shortName, algorithm_desc, algorithm_author, algorithm_date, algorithm_language)

      if deep:
        algorithm_doc_path   = algorithm_root_path + "/doc";        
        algorithm.html_desc           = readHTMLDesc(algorithm_doc_path, getValue(json_description, 'AlgorithmDescHTML', "algorithm.html")) 
        algorithm.algorithm_ref_html  = readHTMLDesc(algorithm_doc_path, getValue(json_description, 'AlgorithmRefHTML',  "references.html")) 

        sources = readAlgorithmSourceFiles(project_root_path, project_name, algorithm_name) 
        algorithm.alg_source_name = sources["alg_source_name"]
        algorithm.alg_source      = sources["alg_source"]

        algorithm.txtResultFiles = get_TXTResults(project_root_path, algorithm_name)

        # add all the presenters to the algorithm
        algPresenterNames = getValue(json_description, 'Presenters', [])                        
        for aPresenter in algPresenterNames: 
          algorithm.presenters.append(readPresenterDesc(algorithm_root_path, aPresenter))  


      return algorithm

    def read_testset(self, project_name, testset_name, deep):
      project_root_path            = self.projects_path + "/PROJ-" + project_name
      testset_description_filename = project_root_path + "/tests/" + testset_name+".json"

      description_file = readFileCont(testset_description_filename)
      try:
        json_description = json.loads(description_file)['TestSet']
      except Exception as err:
        json_description = {}  

      testset_short_name  = getValue(json_description, 'ShortName')
      testset_description = getValue(json_description, 'Description')
      testset_test_repeat = getValue(json_description, 'TestRepeat')
      testset_time_limit  = getValue(json_description, 'TimeLimit')
      testset_n           = getValue(json_description, 'N')

      testset = Testset(testset_name, testset_short_name, testset_description)
      testset.test_repeat = testset_test_repeat
      testset.time_limit  = testset_time_limit
      testset.n           = testset_n

      if deep:
        testset_doc_path     = project_root_path + "/tests/doc";        
        testset.html_desc    = readHTMLDesc(testset_doc_path, getValue(json_description, 'TestSetDescHTML', testset_name + ".html")) 

      return testset

