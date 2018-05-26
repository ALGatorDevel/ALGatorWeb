import os
import json
import re
import sys

from Classes.Project import Project
from Classes.Algorithm import Algorithm
from Classes.Testset import Testset
from Classes.GlobalConfig import GlobalConfig
from Classes.Presenter import Presenter
from Classes.TXTResult import TXTResult

from Classes.EntitiesLister import EntitiesLister

from django.conf import settings
from shutil import copy2


############# HELPER methods ####################

gc = GlobalConfig()

def readFileCont(fileName):
  try:
    return open(fileName, 'r').read()
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
      current_desc = re.sub("%thisfile%", fullFileName, current_desc, flags=re.IGNORECASE)
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
  sources["testcase_name"]   = proj_name + "TestCase.java"
  sources["testcase"]        = readFileCont(folder + proj_name + "TestCase.java")

  sources["testsetiterator_name"] = proj_name + "TestSetIterator.java"
  sources["testsetiterator"]      = readFileCont(folder + proj_name + "TestSetIterator.java")

  sources["absalgorithm_name"]  = proj_name + "AbsAlgorithm.java"
  sources["absalgorithm"]       = readFileCont(folder + proj_name + "AbsAlgorithm.java")

  return sources

def readAlgorithmSourceFiles(projects_path, proj_name, algorithm_name):
  folder = os.path.join(projects_path, "algs", "ALG-"+algorithm_name, "src")

  sources = {}            
  sources["alg_source_name"]   = algorithm_name + "Algorithm.java"
  sources["alg_source"]        = readFileCont(os.path.join(folder, algorithm_name + "Algorithm.java"))

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
  try:
    pname="NoName"
    if isinstance(presenter_name,dict):   # graph is dictionary 
      jsonCont = presenter_name      
    if presenter_name.startswith("{"):  # is presenter_name a JSON description ?           
      jsonCont = json.loads(presenter_name)
    else:  # if not, read JSON from file     
      pname=presenter_name
      presenter=presenter_name   
      if not presenter.endswith(".atpd"):          
          presenter     = presenter + ".atpd"
      else:
          pname = pname[:-5]

      presenterPath   = projects_path + "/presenters/" + presenter 
      fileContJSON = json.loads(readFileCont(presenterPath))
      jsonCont = fileContJSON["Presenter"]
  except:
      jsonCont=[]

  try:
    name     = getValue(jsonCont, "Name", pname)
    title    = getValue(jsonCont,"Title")
    shtit    = getValue(jsonCont,"ShortTitle")
    desc     = getValue(jsonCont,"Description")
    query    = getValue(jsonCont,"Query")

    hasGraph = getValue(jsonCont,"HasGraph", True)
    xaxis    = getValue(jsonCont,"Xaxis")
    yaxes    = getValue(jsonCont,"Yaxes")
    gtypes   = getValue(jsonCont,"GraphTypes")
    xal      = getValue(jsonCont,"XaxisLabel")
    yal      = getValue(jsonCont,"YaxisLabel")

    hasTable = getValue(jsonCont,"HasTable", True)
    columns  = getValue(jsonCont,"Columns")
    
    presenterObj = Presenter(name, title, shtit, desc, query, hasGraph, xaxis, yaxes, gtypes, xal, yal, hasTable, columns)

    presenterObj.html_desc = readHTMLDesc(projects_path + "/presenters/", presenter_name.replace(".atpd", "") + ".html" )

    return presenterObj
  except: # if an error occures during json parsing, return "empty" graph
    return Presenter("NoName", "?", "?",  "?", "", False, "xaxis", [], [], "xal", "yal", False, [] )                        



def getValue(dictionary, key, default=""):
    return dictionary[key] if key in dictionary.keys() else default

##################################################


class Entities(object):

    def __init__(self):

        #-------------------------------------------------------------------#
        # Main path used through out the class. This folder contains all the
        # json files of different type
        #-------------------------------------------------------------------# 
        self.projects_path = GlobalConfig().projects_path

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
      project_description_filename = project_root_path + "/proj/"+project_name+".atp";
      description_file = readFileCont(project_description_filename)
      try:
        json_description = json.loads(description_file)['Project']
      except IOError as err:
        gc.logger.error(err)
        json_description = {}


      project_desc      = getValue(json_description, 'Description')
      project_author    = getValue(json_description, 'Author')
      project_date      = getValue(json_description, 'Date')


      project = Project(project_name, project_desc, project_author, project_date)    

      project.algorithms = self.get_algorithms_list(project_name, deep)  
      project.testsets   = self.get_testsets_list(project_name, deep)  


      if deep:      
        project_doc_path      = project_root_path + "/proj/doc";
        project.html_desc             = readHTMLDesc(project_doc_path, getValue(json_description, 'ProjectDescHTML', "project.html")) 
        project.algorithms_html_desc  = readHTMLDesc(project_doc_path, getValue(json_description, 'AlgorithmDescHTML', "algorithm.html"))       
        project.test_case_html_desc   = readHTMLDesc(project_doc_path, getValue(json_description, 'TestCaseDescHTML', "testcase.html")) 
        project.test_sets_html_desc   = readHTMLDesc(project_doc_path, getValue(json_description, 'TestSetDescHTML', "testset.html"))       
        project.project_ref_desc      = readHTMLDesc(project_doc_path, getValue(json_description, 'ProjectRefHTML', "references.html")) 

        sources = readProjectSourceFiles(project_root_path, project_name)
        project.source_testcase_name        = sources["testcase_name"]
        project.source_testcase             = sources["testcase"]
        project.source_testsetiterator_name = sources["testsetiterator_name"]
        project.source_testsetiterator      = sources["testsetiterator"]
        project.source_algorithm_name       = sources["absalgorithm_name"]
        project.source_algorithm            = sources["absalgorithm"]


        # add all the presenters to the projetc
        projPresenterNames = getValue(json_description, 'ProjPresenters', [])                        
        for pPresenter in sorted(projPresenterNames): 
          project.ProjPresenters.append(readPresenterDesc(project_root_path,pPresenter))  

        mainProjPresenters = getValue(json_description, 'MainProjPresenters', [])
        for mProjPresenter in mainProjPresenters: 
          project.MainProjPresenters.append(readPresenterDesc(project_root_path, mProjPresenter))   

        algPresenters = getValue(json_description, 'AlgPresenters', [])                        
        for aPresenter in algPresenters: 
          project.AlgPresenters.append(readPresenterDesc(project_root_path, aPresenter))   

        mainAlgPresenters = getValue(json_description, 'MainAlgPresenters', [])
        for mAlgPresenter in mainAlgPresenters: 
          project.MainAlgPresenters.append(readPresenterDesc(project_root_path, mAlgPresenter))   

      return project


    # reads the algorithm and returns an object of type Algorithm. If deep = True all the information about the algorithm
    # are read entierly, otherwise only basic information about the algorithm is read    
    def read_algorithm(self, project_name, algorithm_name, deep):
      project_root_path = self.projects_path + "/PROJ-" + project_name
      algorithm_root_path = project_root_path + "/algs/ALG-" + algorithm_name 
      algorithm_description_filename = algorithm_root_path + "/" + algorithm_name+".atal"
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

        # add all the presenters to the projetc
        algPresenterNames = getValue(json_description, 'Presenters', [])                        
        for aPresenter in algPresenterNames: 
          algorithm.presenters.append(readPresenterDesc(algorithm_root_path, aPresenter))  


      return algorithm

    def read_testset(self, project_name, testset_name, deep):
      project_root_path            = self.projects_path + "/PROJ-" + project_name
      testset_description_filename = project_root_path + "/tests/" + testset_name+".atts"

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

