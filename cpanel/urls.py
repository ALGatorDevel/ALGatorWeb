# cpanel

from django.conf.urls import url

from cpanel import views

urlpatterns = [
    url(r'^$', views.home, name='index'),
    url(r'^taskserver/', views.taskserver, name='taskserver'),
    url(r'^project/', views.project, name='project'),
    url(r'^algorithm/', views.algorithm, name='algorithm'),
    url(r'^results', views.results, name='results'),
    url(r'^history', views.history, name='history'),
    url(r'^runTask', views.runtask, name='runtask'),
    url(r'^askServer', views.askServer, name='askServer'),
    url(r'^pAskServer', views.pAskServer, name='pAskServer'),
    url(r'^savePresenter', views.savePresenter, name='savePresenter'),    
    url(r'^panel/', views.panel, name='panel'),    
]
