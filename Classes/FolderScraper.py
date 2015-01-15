import os
import json

from Classes.Project import Project
from Classes.Algorithm import Algorithm


class FolderScraper(object):

    def __init__(self):

        #-------------------------------------------------------------------#
        # Main path used through out the class. This folder contains all the
        # json files of different type
        #-------------------------------------------------------------------#
        self.path = "../../data_root/projects/"

        #the render(output) lists of objects -> Array of Project objects
        self.projects_list = []

        #working dictionaries
        self.project_algorithms = {}
        self.project_descriptions = {}

        #-------------------------------------------------------------------#
        # Calls to main functions
        #-------------------------------------------------------------------#
        self.scrape_landing_folder()
        self.scrape_algorithms_folder()
        self.scrape_project_descriptions_folder()

        self.create_render_projects_list()

    def scrape_landing_folder(self):

        folder_list = os.listdir(self.path)

        for folder in folder_list:
            if folder.startswith("PROJ"):

                self.project_algorithms[folder] = \
                    self.project_descriptions[folder] = None

    def scrape_algorithms_folder(self):
        #finds all the json with algorithms in the self.path/PROJ-#/algs/ALG-#

        for folder in self.project_algorithms:
            subfolder_path = self.path + folder + "/algs"
            subfolders = os.listdir(subfolder_path)

            subfolder_solutions = []

            for subfolder in subfolders:
                if subfolder.startswith("ALG"):
                    algorithm_name = subfolder.split("-")[1]  # ALG-algorithm_name

                    algorithm_folder = self.path+folder+"/algs/"+subfolder+"/"
                    #open the filename
                    description_file = open(algorithm_folder+algorithm_name+".atal", 'r').read()

                    json_description = json.loads(description_file)

                    #open algorithms TECH description
                    if 'HTMLDescFile' in json_description['Algorithm']:
                        algorithm_html_description_file = json_description['Algorithm']['HTMLDescFile']

                        if algorithm_html_description_file != "":
                            path = algorithm_folder + 'doc/' + algorithm_html_description_file

                            if os.path.exists(path):
                                algorithms_current_tech_desc = open(path, 'r').read()
                                json_description['Algorithm']['ALGTechDesc'] = algorithms_current_tech_desc

                    subfolder_solutions.append(json_description)

                self.project_algorithms[folder] = subfolder_solutions

    def scrape_project_descriptions_folder(self):
    #finds all the json with project descriptions in the self.path/PROJ-#/*.atp

        project_folder = "/proj/"

        for folder in self.project_descriptions:

            proj_name = folder.split("-")[1]  # PROJ-proj_name

            #open the filename
            description_file = open(self.path+folder + project_folder + proj_name +".atp", 'r').read()

            json_description = json.loads(description_file)

            #open html description file
            if 'HTMLDescFile' in json_description['Project']:
                html_description_file = json_description['Project']['HTMLDescFile']

                path = self.path+folder + project_folder + 'doc/' + html_description_file

                if os.path.exists(path):
                    current_description = open(path, 'r').read()
                    json_description['Project']['HTMLDesc'] = current_description

            #open algorithms description
            if 'AlgDescHTML' in json_description['Project']:
                algorithms_html_description_file = json_description['Project']['AlgDescHTML']

                if algorithms_html_description_file != "":
                    path = self.path+folder + project_folder + 'doc/' + algorithms_html_description_file

                    if os.path.exists(path):
                        algorithms_current_desc = open(path, 'r').read()
                        json_description['Project']['ALGDesc'] = algorithms_current_desc

            #open algorithms TECH description
            if 'AlgTechDescHTML' in json_description['Project']:
                algorithms_html_tech_description_file = json_description['Project']['AlgTechDescHTML']

                if algorithms_html_tech_description_file != "":
                    path = self.path+folder + project_folder + 'doc/' + algorithms_html_tech_description_file

                    if os.path.exists(path):
                        algorithms_current_tech_desc = open(path, 'r').read()
                        json_description['Project']['ALGTechDesc'] = algorithms_current_tech_desc

            #open test sets TECH description
            if 'TestSetTechDescHTML' in json_description['Project']:
                test_sets_html_tech_description_file = json_description['Project']['TestSetTechDescHTML']

                if test_sets_html_tech_description_file != "":
                    path = self.path+folder + project_folder + 'doc/' + test_sets_html_tech_description_file

                    if os.path.exists(path):
                        test_sets_current_tech_desc = open(path, 'r').read()
                        json_description['Project']['TestSetTechDesc'] = test_sets_current_tech_desc

            #open test sets description
            if 'TestSetDescHTML' in json_description['Project']:
                test_sets_html_description_file = json_description['Project']['TestSetDescHTML']

                if test_sets_html_description_file != "":
                    path = self.path+folder + project_folder + 'doc/' + test_sets_html_description_file

                    if os.path.exists(path):
                        test_sets_current_desc = open(path, 'r').read()
                        json_description['Project']['TestSetDesc'] = test_sets_current_desc



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

            #append the project instance to the array
            self.projects_list.append(project_instance)