class Algorithm:

    def __init__(self, name, short_name, description, html_description, author, date):
        self.name = name
        self.short_name = short_name
        self.description = description
        self.html_description = html_description
        self.date = date
        self.author = author
        
    def __str__(self):
        return self.name
