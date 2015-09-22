import os
import json

from Classes.Project import Project
from Classes.Algorithm import Algorithm
from Classes.Testset import Testset
from Classes.GlobalConfig import GlobalConfig



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

    def readHTMLDesc(self, json_description, htmlDesc, desc, entity, loPath):
        if htmlDesc in json_description[entity]:
            html_description_file = json_description[entity][htmlDesc]

            if html_description_file != "":
                path = loPath + 'doc/' + html_description_file

                if os.path.exists(path):
                    current_desc = open(path, 'r').read()
                    json_description[entity][desc] = current_desc
                    

    def scrape_landing_folder(self):

        folder_list = os.listdir(self.data_root_path)

        for folder in folder_list:
            if folder.startswith("PROJ"):

                self.project_algorithms[folder] = \
                self.project_testsets[folder] = \
                self.project_descriptions[folder] = None


    def scrape_testsets(self):
        #find all testsets 
        
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

            #Single project instance
            project_instance = Project(project_name, project_desc, project_author, project_date, project_html_desc,
                                       algorithms_html_desc, algorithms_html_tech_desc, test_sets_html_desc,
                                       test_sets_html_tech_desc)

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
            

            #append the project instance to the array
            self.projects_list.append(project_instance)



scraper = FolderScraper()
print scraper.projects_list[0].name