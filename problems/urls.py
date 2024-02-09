# problems

from django.urls import path

from problems import views

urlpatterns = [
    path('',             views.problems,  name='index'),
    path('pdetails',     views.pdetails,  name='pdetails'),
    path('adetails',     views.adetails,  name='adetails'),
    path('tdetails',     views.tdetails,  name='tdetails'),
    path('results',      views.results,   name='results'),
    path('ppasica',      views.ppasica,   name='ppasica'),
    path('prepasica',    views.ppasica,   name='prepasica'),
    path('txtresults',   views.txtresults,name='txtresults'),
    path('edit',         views.edit,      name='edit'),    
]