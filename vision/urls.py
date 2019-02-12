# vision

from django.conf.urls import url

from vision import views

urlpatterns = [
    url(r'^chart',     views.chart,   name='chart'),
    url(r'^openPresenter',   views.openPresenter, name='openPresenter'),    
    url(r'^newPresenter',   views.newPresenter, name='newPresenter'),    
    url(r'^project',   views.project, name='project'),    
]
