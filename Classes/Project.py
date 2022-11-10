class Project(object):

    def __init__(self, name="-noname-", description="", author="", date="", 
                 html_desc="", algorithms_html_desc="", test_case_html_desc="", 
                 test_sets_html_desc="", project_ref_desc="",
                 source_input="", source_output="", source_testcase="", 
                 source_algorithm="", source_tools="",
                 source_input_name="", source_output_name="", source_testcase_name="", 
                 source_algorithm_name="", source_tools_name=""):

        self.name        = name
        self.description = description
        self.author      = author
        self.date        = date

        #descriptions
        self.html_desc = html_desc
        self.algorithms_html_desc = algorithms_html_desc
        self.test_case_html_desc = test_case_html_desc
        self.test_sets_html_desc = test_sets_html_desc
        self.project_ref_desc = project_ref_desc

        # project sourcecode
        self.source_input = source_input
        self.source_output = source_output
        self.source_testcase = source_testcase
        self.source_algorithm = source_algorithm
        self.source_tools = source_tools

        self.source_input_name = source_input_name
        self.source_output_name = source_output_name
        self.source_testcase_name = source_testcase_name        
        self.source_algorithm_name = source_algorithm_name
        self.source_tools_name = source_tools_name

        #array of algorithms
        self.algorithms = []
        self.testsets = []
        self.ProjPresenters = []
        self.MainProjPresenters = []
        self.AlgPresenters = []
        self.MainAlgPresenters = []
        self.algorithmReports = []    

    def get_algorithm(self, algorithm_name):
      for algorithm in self.algorithms:
        if algorithm.name == algorithm_name:
          return algorithm
      return None   