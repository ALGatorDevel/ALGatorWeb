import os

class EntitiesLister(object):

    def __init__(self, pp):
        self.projects_path = pp

    # This method lists the names of the projects that are available to the current user
    # Currently: mathod reads the content of the data_root/projects folder and returns
    #            all projects listed there
    # In the future: the list will be obtained by asking the ALGator for the projects that
    #            are available to the current user according to user's rights
    def get_projects_names(self):
        print "ppxp="+self.projects_path

        try: 
          projects_names = []  
          folder_list = os.listdir(self.projects_path)

          for folder in folder_list:   
            print folder         
            fullPath = self.projects_path + "/" + folder

            if os.path.isdir(fullPath) and folder.startswith("PROJ-"):            
              projects_names.append(folder[5:])              
        except:
            pass

        return projects_names


    # This method lists the names of the algorithms of the current project that are available to the current user
    # Currently: mathod reads the content of the data_root/projects/PROJ-peoject_name folder and returns
    #            all algorithms listed there
    # In the future: the list will be obtained by asking the ALGator for the algorithms that
    #            are available to the current user according to user's rights
    def get_algorithms_names(self, project_name):
        algorithms_names = []  
        try: 
          algorithms_path = self.projects_path + "/PROJ-"+project_name+"/algs/"
          folder_list = os.listdir(algorithms_path)
          for folder in folder_list:            
            fullPath = algorithms_path + "/" + folder

            if os.path.isdir(fullPath) and folder.startswith("ALG-"):            
              algorithms_names.append(folder[4:])              
        except Exception as exp:
            print exp

        return algorithms_names


    # This method lists the names of the test sets of the current project that are available to the current user
    # Currently: mathod reads the content of the data_root/projects/PROJ-peoject_name/tests folder and returns
    #            all test sets (files with the atts extension) listed there 
    # In the future: the list will be obtained by asking the ALGator for the testsets that
    #            are available to the current user according to user's rights
    def get_testsets_names(self, project_name):
        testsets_names = []  
        try: 
          testsets_path = self.projects_path + "/PROJ-"+project_name+"/tests/"
          folder_list = os.listdir(testsets_path)
          for fname in folder_list:                        
            if fname.endswith(".atts"):            
              testsets_names.append(fname[:-5])              
        except: 
            pass

        return testsets_names
