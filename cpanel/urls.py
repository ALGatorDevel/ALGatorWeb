# cpanel

from django.urls import path

from cpanel import views

urlpatterns = [
    path('', views.home, name='index'),
    path('algatorserver/', views.algatorserver, name='algatorserver'),
    path('project/', views.project, name='project'),
    path('algorithm/', views.algorithm, name='algorithm'),
    path('results', views.results, name='results'),
    path('history', views.history, name='history'),
    path('runTask', views.runtask, name='runtask'),
    path('askServer', views.askServer, name='askServer'),
    path('pAskServer', views.pAskServer, name='pAskServer'),
    path('savePresenter', views.savePresenter, name='savePresenter'),    
]
