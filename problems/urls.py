# problems

from django.conf.urls import url

from problems import views

urlpatterns = [
    url(r'^$', views.problems, name='index'),
    url(r'^details', views.pdetails, name='pdetails'),
    url(r'^algorithm', views.algorithm, name='algorithm'),

]