class Algorithm:

    def __init__(self, name, eid="", description="", short_name="",  date="", author="",  language="", source=""):
        self.name = name
        self.eid = eid
        self.description = description
        self.short_name = short_name
        self.date = date
        self.author = author
        self.language = language  
        self.source = source
        
    def __str__(self):
        return self.name
