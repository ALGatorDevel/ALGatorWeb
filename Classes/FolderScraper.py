import os
import json

from Classes.Project import Project
from Classes.Algorithm import Algorithm
from Classes.Testset import Testset
from Classes.GlobalConfig import GlobalConfig
from Classes.Presenter import Presenter


class FolderScraper(object):

    def __init__(self):

        #-------------------------------------------------------------------#
        # Main path used through out the class. This folder contains all the
        # json files of different type
        #-------------------------------------------------------------------# 
        self.data_root_path = GlobalConfig().data_root_path

        #the render(output) lists of objects -> Array of Project objects
        self.projects_list = []

        #working dictionaries
        self.project_algorithms = {}
        self.project_testsets = {}
        self.project_descriptions = {}

        #-------------------------------------------------------------------#
        # Calls to main functions
        #-------------------------------------------------------------------#
        self.scrape_landing_folder()
        self.scrape_algorithms_folder()
        self.scrape_project_descriptions_folder()
        self.scrape_testsets()

        self.create_render_projects_list()

    def readFileCont(self, fileName):
        try:
            return open(fileName, 'r').read();
        except:
            return ""

    def readHTMLDesc(self, json_description, htmlDesc, desc, entity, loPath):
        if htmlDesc in json_description[entity]:
            html_description_file = json_description[entity][htmlDesc]

            if html_description_file != "":
                path = loPath + 'doc/' + html_description_file

                if os.path.exists(path):
                    current_desc = open(path, 'r').read()
                    json_description[entity][desc] = current_desc
                    
    def readProjectSourceFiles(self, projectKey):
        proj_name = projectKey.split("-")[1]    # PROJ-proj_name
        folder = self.data_root_path + "PROJ-" + proj_name + "/proj/src/"

        sources = {}            
        sources["testcase"]        = self.readFileCont(folder + proj_name + "TestCase.java")
        sources["testsetiterator"] = self.readFileCont(folder + proj_name + "TestSetIterator.java")
        sources["absalgorithm"]    = self.readFileCont(folder + proj_name + "AbsAlgorithm.java")

        return sources

    def scrape_landing_folder(self):

        folder_list = os.listdir(self.data_root_path)

        for folder in folder_list:
            if folder.startswith("PROJ"):

                self.project_algorithms[folder] = \
                self.project_testsets[folder] = \
                self.project_descriptions[folder] = None


    def scrape_testsets(self):
        #find all testsets 
        try:
            for folder in self.project_testsets:
                testset_subfolder = self.data_root_path + folder + "/tests/"
                testset_files = os.listdir(testset_subfolder)
            
                testsets = []
                for testset_file in testset_files:
                    if testset_file.endswith(".atts"):
                    
                        description_file = open(testset_subfolder+"/"+testset_file, 'r').read()                    
                        json_description = json.loads(description_file)
                    
                        #open testset TECH description
                        self.readHTMLDesc(json_description, 'HTMLDescFile', 'HTMLDesc', 'TestSet', testset_subfolder)

                        testsets.append(json_description)

                self.project_testsets[folder] = testsets
        except:
            pass
            
    def scrape_algorithms_folder(self):
        #finds all the json with algorithms in the self.path/PROJ-#/algs/ALG-#

        #folder: PROJ-*
        for folder in self.project_algorithms:
            subfolder_path = self.data_root_path + folder + "/algs"
            subfolders = os.listdir(subfolder_path)

            subfolder_solutions = []

            for subfolder in subfolders:
                if subfolder.startswith("ALG"):
                    algorithm_name = subfolder.split("-")[1]  # ALG-algorithm_name

                    algorithm_folder = self.data_root_path+folder+"/algs/"+subfolder+"/"
                    #open the filename
                    description_file = open(algorithm_folder+algorithm_name+".atal", 'r').read()

                    json_description = json.loads(description_file)

                    self.readHTMLDesc(json_description, 'HTMLDescFile', 'ALGTechDesc', 'Algorithm', algorithm_folder)

                    subfolder_solutions.append(json_description)

                self.project_algorithms[folder] = subfolder_solutions

    def scrape_project_descriptions_folder(self):
    #finds all the json with project descriptions in the self.path/PROJ-#/*.atp

        project_folder = "/proj/"

        for folder in self.project_descriptions:

            proj_name = folder.split("-")[1]  # PROJ-proj_name

            #open the filename
            description_file = open(self.data_root_path+folder + project_folder + proj_name +".atp", 'r').read()

            json_description = json.loads(description_file)
            
            curFolder = self.data_root_path+folder + project_folder

            #open html description file
            self.readHTMLDesc(json_description, 'HtmlDescFile', 'HTMLDesc', 'Project', curFolder)

            #open algorithms description
            self.readHTMLDesc(json_description, 'AlgDescHTML', 'ALGDesc', 'Project', curFolder)

            #open algorithms TECH description
            self.readHTMLDesc(json_description, 'AlgTechDescHTML', 'ALGTechDesc', 'Project', curFolder)

            #open test sets TECH description
            self.readHTMLDesc(json_description, 'TestSetTechDescHTML', 'TestSetTechDesc', 'Project', curFolder)

            #open test sets description
            self.readHTMLDesc(json_description, 'TestSetDescHTML', 'TestSetDesc', 'Project', curFolder)

            self.project_descriptions[folder] = json_description

    def create_render_projects_list(self):

        #projectKey is the same for self.project_descriptions
        for projectKey, project_description in self.project_descriptions.iteritems():

            #for ease of use
            current_project = project_description['Project']

            project_name = current_project['Name'] if 'Name' in current_project.keys() else ""
            project_desc = current_project['Description'] if 'Description' in current_project.keys() else ""
            project_author = current_project['Author'] if 'Author' in current_project.keys() else ""
            project_date = current_project['Date'] if 'Date' in current_project.keys() else ""              

            project_html_desc = current_project['HTMLDesc'] if 'HTMLDesc' in current_project.keys() else ""
            algorithms_html_desc = current_project['ALGDesc'] if 'ALGDesc' in current_project.keys() else ""
            algorithms_html_tech_desc = current_project['ALGTechDesc'] if 'ALGTechDesc' in current_project.keys() \
                else ""
            test_sets_html_desc = current_project['TestSetDesc'] if 'TestSetDesc' \
                in current_project.keys() else ""

            test_sets_html_tech_desc = current_project['TestSetTechDesc'] if 'TestSetTechDesc'\
                in current_project.keys() else ""

            sources = self.readProjectSourceFiles(projectKey)
            source_testcase        = sources["testcase"]
            source_testsetiterator = sources["testsetiterator"]
            source_algorithm       = sources["absalgorithm"]


            #Single project instance
            project_instance = Project(project_name, project_desc, project_author, project_date, project_html_desc,
                                       algorithms_html_desc, algorithms_html_tech_desc, test_sets_html_desc,
                                       test_sets_html_tech_desc, source_testcase, source_testsetiterator, source_algorithm)
                                        
            projPresenters = current_project['ProjPresenters'] if 'ProjPresenters' in current_project.keys() else []                        
            for pPresenter in projPresenters: 
              project_instance.ProjPresenters.append(self.readPresenterDesc(pPresenter, project_name))   

            mainProjPresenters = current_project['MainProjPresenters'] if 'MainProjPresenters' in current_project.keys() else []                        
            for mProjPresenter in mainProjPresenters: 
              project_instance.MainProjPresenters.append(self.readPresenterDesc(mProjPresenter, project_name))   

            algPresenters = current_project['AlgPresenters'] if 'AlgPresenters' in current_project.keys() else []                        
            for aPresenter in algPresenters: 
              project_instance.AlgPresenters.append(self.readPresenterDesc(aPresenter, project_name))   

            mainAlgPresenters = current_project['MainAlgPresenters'] if 'MainAlgPresenters' in current_project.keys() else []                        
            for mAlgPresenter in mainAlgPresenters: 
              project_instance.MainAlgPresenters.append(self.readPresenterDesc(mAlgPresenter, project_name))   


            #get algorithms for project name (projectKey)
            for algorithm in self.project_algorithms[projectKey]:

                #for ease of use
                current_algorithm = algorithm['Algorithm']

                alg_name = current_algorithm['Name'] if 'Name' in current_algorithm.keys() else ""
                alg_short_name = current_algorithm['ShortName'] if 'ShortName' in current_algorithm.keys() else ""
                alg_desc = current_algorithm['Description'] if 'Description' in current_algorithm.keys() else ""
                alg_date = current_algorithm['Date'] if 'Date' in current_algorithm.keys() else ""
                alg_author = current_algorithm['Author'] if 'Author' in current_algorithm.keys() else ""
                alg_html_desc = current_algorithm['ALGTechDesc'] if 'ALGTechDesc' in current_algorithm.keys() else ""

                #create instance
                project_algorithm = Algorithm(alg_name, alg_short_name, alg_desc, alg_html_desc, alg_author, alg_date)

                #append algorithm to project
                project_instance.algorithms.append(project_algorithm)
                
            try:
              for testset in self.project_testsets[projectKey]:

                #for ease of use
                current_testset = testset['TestSet']

                ts_name = current_testset['Name'] if 'Name' in current_testset.keys() else ""
                ts_short_name = current_testset['ShortName'] if 'ShortName' in current_testset.keys() else ""
                ts_desc = current_testset['Description'] if 'Description' in current_testset.keys() else ""                                
                ts_html_desc = current_testset['HTMLDesc'] if 'HTMLDesc' in current_testset.keys() else ""
                ts_n = current_testset['N'] if 'N' in current_testset.keys() else ""
                ts_test_repeat = current_testset['TestRepeat'] if 'TestRepeat' in current_testset.keys() else ""
                ts_time_limit = current_testset['TimeLimit'] if 'TimeLimit' in current_testset.keys() else ""
                ts_quick_test = current_testset['QuickTest'] if 'QuickTest' in current_testset.keys() else ""
                ts_files = current_testset['TestSetFiles'] if 'TestSetFiles' in current_testset.keys() else ""
                ts_desc_file = current_testset['DescriptionFile'] if 'DescriptionFile' in current_testset.keys() else ""                

                #create instance
                project_testset = Testset(ts_name, ts_short_name, ts_desc, ts_html_desc, \
                    ts_n, ts_test_repeat, ts_time_limit, ts_quick_test, ts_files, ts_desc_file)

                #append testset to project
                project_instance.testsets.append(project_testset)
            
            except:
                pass

            #append the project instance to the array
            self.projects_list.append(project_instance)

               

    # presenter is either a filename with JSON description of JSON description itself
    # projectName is the name of the project; it is used to resolve path for presenter file
    def readPresenterDesc(self, presenter, projectName):
        try:
          if isinstance(presenter,dict):   # graph is dictionary 
            jsonCont = presenter
          if presenter.startswith("{"):  # is presenter JSON description            
            jsonCont = json.loads(presenter)
          else:  # if not, read JSON from file        
            if not presenter.endswith(".atpd"):
                presenter = presenter + ".atpd"

            presenterPath   = self.data_root_path + "/PROJ-" + projectName + "/presenters/" + presenter 
            fileContJSON = json.loads(open(presenterPath, 'r').read())
            jsonCont = fileContJSON["Presenter"]
        except:
            pass
        
        try:
          name     = jsonCont["Name"]          if ("Name" in jsonCont) else "NoName"            
          title    = jsonCont["Title"]         if ("Title" in jsonCont) else ""          
          shtit    = jsonCont["ShortTitle"]    if ("ShortTitle" in jsonCont) else ""          
          desc     = jsonCont["Description"]   if ("Description" in jsonCont) else ""          
          query    = jsonCont["Query"]         if ("Query" in jsonCont) else ""

          hasGraph = jsonCont["HasGraph"]      if ("HasGraph" in jsonCont) else ""
          xaxis    = jsonCont["Xaxis"]         if ("Xaxis" in jsonCont) else ""
          yaxes    = jsonCont["Yaxes"]         if ("Yaxes" in jsonCont) else ""
          gtypes   = jsonCont["GraphTypes"]    if ("GraphTypes" in jsonCont) else ""
          xal      = jsonCont["XaxisLabel"]    if ("XaxisLabel" in jsonCont) else ""
          yal      = jsonCont["YaxisLabel"]    if ("YaxisLabel" in jsonCont) else ""

          hasTable = jsonCont["HasTable"]      if ("HasTable" in jsonCont) else ""
          columns  = jsonCont["Columns"]       if ("Columns" in jsonCont) else ""
          
          
          return Presenter(name, title, shtit, desc, query, 
            hasGraph, xaxis, yaxes, gtypes, xal, yal, hasTable, columns)
        except Exception as i: # if an error occures during json parsing, return "empty" graph
          print i
          return Presenter("NoName", "?", "?",  "?", "", "hasGraph", "xaxis", [], [], "xal", [], "hasTable", [] )                        
        


scraper = FolderScraper()

# pozenes lahko iz lupine: 
#   localhost:ALGatorWeb tomaz$ python Classes/FolderScraper.py
#
# (pozor, nastavi export PYTHONPATH=.)

# g = scraper.readReportDesc('{"Query": "query1", "Type": "Table", "Description": "This table presents minimum time of ...", "Title": "Minimum time of execution!", "Graph" : {"XaxisLabel": "N", "Description": "Average time for best three algorithms", "YaxisLabel": ["Average time"], "Yaxes": ["Java7.Tavg", "Hoare.Tavg"], "GraphTypes": ["Line", "Stair"], "Xaxis": "N"}}', "Sorting")
# g = scraper.readReportDesc('{"Query": "query1",  "Description": "This table presents minimum time of ...", "Title": "Minimum time of execution!", "Graph" : "graph1", "Table":""}', "Sorting")
# g = scraper.readPresenterDesc("apresenterx.atpd", "Sorting")
# print g.title
# print g.xaxis
# print g.yaxes
# print g.query
