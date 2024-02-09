import json
import base64
import re

from Classes.GlobalConfig import globalConfig
from Classes.Project import Project
from Classes.Algorithm import Algorithm
from Classes.Testset import Testset

from Classes.ServerConnector import connector


class WEntities(object):

  def __init__(self):
    self.projects_path = globalConfig.projects_path

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


  # reads the project and returns an object of type Project. If deep = True all the information about the project
  # (including the information about its sub entities, like algorithms and test sets) are read entierly,
  # otherwise only basic information about the project is read
  def read_project(self, project_name, deep):

    response = connector.talkToServer('getData {"Type":"Project", "ProjectName":"%s"}'%project_name)
    
    try:
      server_response = json.loads(response)

      project_desc      = server_response["Answer"]['Description']
      project_author    = server_response["Answer"]['Author']
      project_date      = server_response["Answer"]['Date']
      
      project = Project(project_name, project_desc, project_author, project_date)    

      project.algorithms = self.get_algorithms_list(project_name, deep, server_response["Answer"]["Algorithms"])  
      project.testsets   = self.get_testsets_list(project_name, deep, server_response["Answer"]["TestSets"])  
      project.computers  = self.get_testsets_list(project_name, deep, server_response["Answer"]["Computers"])  

      if deep:      
        server_response = json.loads(connector.talkToServer('getData {"Type":"ProjectDocs", "ProjectName":"%s"}'%project_name))
        if server_response["Status"]==0:
          project_docs = server_response["Answer"]
          project.html_desc             = base64.b64decode(project_docs["Project"])
          project.algorithms_html_desc  = base64.b64decode(project_docs["Algorithm"])
          project.test_case_html_desc   = base64.b64decode(project_docs["TestCase"])
          project.test_sets_html_desc   = base64.b64decode(project_docs["TestSet"])
          project.project_ref_desc      = base64.b64decode(project_docs["References"])

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


        

        """
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
      """
      return project
      
    except Exception as exi:
      return Project("",)


    # reads the algorithm and returns an object of type Algorithm. If deep = True all the information about the algorithm
    # are read entierly, otherwise only basic information about the algorithm is read    
  def read_algorithm(self, project_name, algorithm_name, deep):
    """      
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
    """  
    algorithm = Algorithm(algorithm_name, ) 
    #algorithm = Algorithm(algorithm_name, algorithm_shortName, algorithm_desc, algorithm_author, algorithm_date, algorithm_language) 
    """
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
    """
    return algorithm

    
  def read_testset(self, project_name, testset_name, deep):
    """
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
    """
    testset = Testset(testset_name, )
    # testset = {"Name": testset_name, "Description": "desc?"}
    # testset = Testset(testset_name, testset_short_name, testset_description)
    """
      testset.test_repeat = testset_test_repeat
      testset.time_limit  = testset_time_limit
      testset.n           = testset_n

      if deep:
        testset_doc_path     = project_root_path + "/tests/doc";        
        testset.html_desc    = readHTMLDesc(testset_doc_path, getValue(json_description, 'TestSetDescHTML', testset_name + ".html")) 
      """
    return testset