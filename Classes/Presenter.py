class Presenter:

    def __init__(self, name, title="", short_title="", description=""):
        self.name = name
        self.title = title
        self.short_title = short_title
        self.description = description
        self.query = ""
        self.Layout = []
        
    def __str__(self):
        return self.name
