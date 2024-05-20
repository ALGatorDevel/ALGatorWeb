class Testset:

    def __init__(self, name, short_name="", description="", 
                   html_description="", n=0, test_repeat=0, time_limit=1, quick_test=0, testset_files=[], description_file=""):
        self.name = name
        self.short_name = short_name
        self.description = description
        self.n = n
        self.test_repeat=test_repeat 
        self.time_limit=time_limit
        self.quick_test=quick_test
        self.testset_files=testset_files 
        self.description_file=description_file
        
    def __str__(self):
        return self.name
