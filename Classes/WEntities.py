import json
import json
import base64
import re

from Classes.GlobalConfig import globalConfig
from Classes.Project import Project
from Classes.Algorithm import Algorithm
from Classes.Testset import Testset
from Classes.Presenter import Presenter

from Classes.ServerConnector import connector
from problems.utils import replaceStaticLinks
from problems.utils import traverse_and_transform

def getValue(dictionary, key, default=""):
    return dictionary[key] if key in dictionary.keys() else default

class WEntities(object):

  def get_projects_list(self, deep=False, projects_names=[]):
    if not projects_names:
      projects_names = json.loads(connector.talkToServer('getData {"Type":"Projects"}'))["Answer"]

    projects_list = []
    for project_name in projects_names:
      projects_list.append(self.read_project(project_name, deep))
    return projects_list

  def get_algorithms_list(self, project_name, deep=False, algorithms_names=[]):
    if not algorithms_names:
      algorithms_names = json.loads(connector.talkToServer('getData {"Type":"Project", "ProjectName":"%s"}'%project_name))["Answer"]["Algorithms"]
    algorithms_list = []
    for algorithm_name in algorithms_names:
      algorithms_list.append(self.read_algorithm(project_name, algorithm_name, deep))
    return algorithms_list

  def get_testsets_list(self, project_name, deep=False, testsets_names=[]):
    if not testsets_names:
      testsets_names = json.loads(connector.talkToServer('getData {"Type":"Project", "ProjectName":"%s"}'%project_name))["Answer"]["TestSets"]
    testsets_list = []
    for testset_name in testsets_names:
      testsets_list.append(self.read_testset(project_name, testset_name, deep))
    return testsets_list    

  def get_presenters(self, project_name, presenter_names=[]):
    presenters_list = []
    if presenter_names:
      for presenter_name in presenter_names:
        presenters_list.append(self.read_presenter(project_name, presenter_name))
    return presenters_list  


  # reads the project and returns an object of type Project. If deep = True all the information about the project
  # (including the information about its sub entities, like algorithms and test sets) are read entierly,
  # otherwise only basic information about the project is read
  def read_project(self, project_name, deep):

    response = connector.talkToServer('getData {"Type":"Project", "ProjectName":"%s"}'%project_name)

    try:
      server_response = json.loads(response)
      server_response = getValue(server_response, "Answer", [])

      project_desc      = server_response['Description']
      project_author    = server_response['Author']
      project_date      = server_response['Date']
      
      project = Project(project_name, project_desc, project_author, project_date)    

      project.json       = server_response

      project.algorithms = self.get_algorithms_list(project_name, deep, server_response["Algorithms"])  
      project.testsets   = self.get_testsets_list(project_name, deep, server_response["TestSets"])  

      # presenterjev ne preberem v objekt; za delo s presenterji se uporabljajo funkcije iz util.py,
      # presenterji se na stran prenesejo kot JSON string
      project.mpPresenters = self.get_presenters(project_name, server_response["MainProjPresenters"]) if 'MainProjPresenters' in server_response else []

      if deep:      
        server_response = json.loads(connector.talkToServer('getData {"Type":"ProjectDocs", "ProjectName":"%s"}'%project_name))
        if server_response["Status"]==0:
          project_docs = server_response["Answer"]
          project.html_desc             = replaceStaticLinks(base64.b64decode(project_docs["Project"]).decode("UTF-8")   ,project_name)
          project.algorithms_html_desc  = replaceStaticLinks(base64.b64decode(project_docs["Algorithm"]).decode("UTF-8") ,project_name)
          project.test_case_html_desc   = replaceStaticLinks(base64.b64decode(project_docs["TestCase"]).decode("UTF-8")  ,project_name)
          project.test_sets_html_desc   = replaceStaticLinks(base64.b64decode(project_docs["TestSet"]).decode("UTF-8")   ,project_name)
          project.project_ref_desc      = replaceStaticLinks(base64.b64decode(project_docs["References"]).decode("UTF-8"),project_name)
          project.doc_resources         = project_docs["Resources"]

        server_response = json.loads(connector.talkToServer('getData {"Type":"ProjectSources", "ProjectName":"%s"}'%project_name))
        if server_response["Status"]==0:
          project_src = server_response["Answer"]
          project.source_input                = base64.b64decode(project_src["Input"] or "").decode("utf-8")
          project.source_output               = base64.b64decode(project_src["Output"] or "").decode("utf-8")
          project.source_algorithm            = base64.b64decode(project_src["Algorithm"] or "").decode("utf-8")
          project.source_tools                = base64.b64decode(project_src["Tools"] or "").decode("utf-8")
          
          project.source_generators           = {}
          for genType in project_src["Generators"]:
            project.source_generators[genType] = base64.b64decode(project_src["Generators"][genType] or "").decode("utf-8")
          
          project.source_indicators           = {}
          for indName in project_src["Indicators"]:
            project.source_indicators[indName] = base64.b64decode(project_src["Indicators"][indName] or "").decode("utf-8")
            


        server_response = json.loads(connector.talkToServer('getData {"Type":"ProjectProps", "ProjectName":"%s"}'%project_name))
        if server_response["Status"]==0:
          project_props = server_response["Answer"]
          project.parameters  = project_props["Parameters"] or []
          project.generators  = project_props["Generators"] or []
          project.indicators  = project_props["EM indicators"] or []
          project.counters    = project_props["CNT indicators"] or []
        
      return project
      
    except Exception as exi:
      return Project(project_name)


    # reads the algorithm and returns an object of type Algorithm. If deep = True all the information about the algorithm
    # are read entierly, otherwise only basic information about the algorithm is read    
  def read_algorithm(self, project_name, algorithm_name, deep):
    deeps = "true" if deep else "false"
    response = connector.talkToServer(
      f"getData {{'Type':'Algorithm', 'ProjectName':'{project_name}', 'AlgorithmName':'{algorithm_name}', 'Deep':{deeps}}}")

    algorithm = Algorithm(algorithm_name)
    try:
      server_response = json.loads(response)
    except Exception as err:
      server_response = {}

    status = getValue(server_response, "Status", -1)
    if status == 0:
      server_response = server_response["Answer"]
      algorithm_description = getValue(server_response["Properties"], 'Description')
      algorithm_short_name  = getValue(server_response["Properties"], 'ShortName')
      algorithm_date        = getValue(server_response["Properties"], 'Date')
      algorithm_author      = getValue(server_response["Properties"], 'Author')
      algorithm_language    = getValue(server_response["Properties"], 'Language')
      algorithm = Algorithm(algorithm_name, algorithm_description, algorithm_short_name, algorithm_date, algorithm_author, algorithm_language)

      if deep:
        algorithm.source = getValue(server_response, "FileContent", "")
        algorithm.html   = replaceStaticLinks(getValue(server_response, "HtmlFileContent", ""), project_name)

    return algorithm
    
  def read_testset(self, project_name, testset_name, deep):

    deeps = "true" if deep else "false"
    response = connector.talkToServer(f"getData {{'Type':'Testset', 'ProjectName':'{project_name}', 'TestsetName':'{testset_name}', 'Deep':{deeps}}}")

    try:
      server_response = json.loads(response)
    except Exception as err:
      server_response = {}  

    status = getValue(server_response, "Status", -1)
    if status == 0:  
      server_response = server_response["Answer"]
      testset_short_name  = getValue(server_response["Properties"], 'ShortName')
      testset_description = getValue(server_response["Properties"], 'Description')
      testset_test_repeat = getValue(server_response["Properties"], 'TestRepeat', 1)
      testset_time_limit  = getValue(server_response["Properties"], 'TimeLimit', 1)
      testset_n           = getValue(server_response["Properties"], 'N', 1)
    
      testset = Testset(testset_name, testset_short_name, testset_description)
    
      testset.test_repeat = testset_test_repeat
      testset.time_limit  = testset_time_limit
      testset.n           = testset_n

      if deep:
        testset.description_file = getValue(server_response, "FileContent", "")
      
    return testset

  def read_presenter(self, project_name, presenter_name):
    response = connector.talkToServer(f"getData {{'Type':'Presenter', 'ProjectName':'{project_name}', 'PresenterName':'{presenter_name}'}}")

    presenter = Presenter(presenter_name)
    try:
      server_response = json.loads(response)
    except Exception as err:
      server_response = {}  

    status = getValue(server_response, "Status", -1)
    if status == 0:  
      server_response = server_response["Answer"]
      server_response = traverse_and_transform(server_response, lambda text: replaceStaticLinks(text, project_name))
      presenter_name        = getValue(server_response, 'Name')
      presenter_description = getValue(server_response, 'Description')
      presenter_title       = getValue(server_response, 'Title')
      presenter_short_title = getValue(server_response, 'ShortTitle')
    
      presenter = Presenter(presenter_name, presenter_title, presenter_short_title, presenter_description)

      # manjka se branje lastnosti query, layout in podrobnosti o vseh layoutih
    
    return presenter