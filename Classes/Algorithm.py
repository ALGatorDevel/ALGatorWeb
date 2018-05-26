class Algorithm:

    def __init__(self, name, short_name, description,  author, date, language,
                 html_desc="", alg_source_name="", alg_source="",  algorithm_ref_html="", txtResultFiles=[]):
        self.name = name
        self.short_name = short_name
        self.description = description
        self.date = date
        self.author = author
        self.language = language  

        self.alg_source_name = alg_source_name
        self.alg_source = alg_source

        self.html_desc = html_desc
        
        self.algorithm_ref_html = algorithm_ref_html

        self.txtResultFiles = txtResultFiles

        self.presenters = []
        
    def __str__(self):
        return self.name
