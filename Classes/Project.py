class Project(object):

    def __init__(self, name, description, author, date, 
                 html_desc="", algorithms_html_desc="", test_case_html_desc="", test_sets_html_desc="", project_ref_desc="",
                 source_testcase="", source_testsetiterator="", source_algorithm="", 
                 source_testcase_name="", source_testsetiterator_name="", source_algorithm_name=""):

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
        self.source_testcase = source_testcase
        self.source_testsetiterator = source_testsetiterator
        self.source_algorithm = source_algorithm
        self.source_testcase_name = source_testcase_name
        self.source_testsetiterator_name = source_testsetiterator_name
        self.source_algorithm_name = source_algorithm_name

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