# problems

from django.conf.urls import url

from problems import views

urlpatterns = [
    url(r'^$',         views.problems,  name='index'),
    url(r'^pdetails',  views.pdetails,  name='pdetails'),
    url(r'^adetails',  views.adetails,  name='adetails'),
    url(r'^tdetails',  views.tdetails,  name='tdetails'),
    url(r'^results',   views.results,   name='results'),
    url(r'^ppasica',   views.ppasica,   name='ppasica'),
    url(r'^prepasica',   views.ppasica,   name='prepasica'),
    url(r'^txtresults',   views.txtresults,   name='txtresults'),
]