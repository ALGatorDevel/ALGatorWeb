# vision

from django.urls import path

from vision import views

urlpatterns = [
    path('chart',     views.chart,   name='chart'),
    path('openPresenter',   views.openPresenter, name='openPresenter'),    
    path('newPresenter',   views.newPresenter, name='newPresenter'),    
    path('project',   views.project, name='project'), 
    path('fcQueryEditor',   views.fcQueryEditor, name='fcQueryEditor'),    
]
