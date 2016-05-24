class Project(object):

    def __init__(self, name, description, author, project_date, html_desc, algorithms_html_desc,
                 algorithms_tech_html_desc, test_sets_html_desc, test_sets_html_tech_desc,
                 source_testcase, source_testsetiterator, source_algorithm):
        self.name = name
        self.description = description
        self.author = author
        self.project_date = project_date

        #descriptions
        self.html_desc = html_desc
        self.algorithms_html_desc = algorithms_html_desc
        self.algorithms_tech_html_desc = algorithms_tech_html_desc
        self.test_sets_html_desc = test_sets_html_desc
        self.test_sets_html_tech_desc = test_sets_html_tech_desc

        # project sourcecode
        self.source_testcase = source_testcase
        self.source_testsetiterator = source_testsetiterator
        self.source_algorithm = source_algorithm

        #array of algorithms
        self.algorithms = []
        self.testsets = []
        self.ProjPresenters = []
        self.MainProjPresenters = []
        self.AlgPresenters = []
        self.MainAlgPresenters = []
        self.algorithmReports = []