# vision

from django.conf.urls import url

from vision import views

urlpatterns = [
    url(r'^$',         views.index,   name='index'),
    url(r'^project',   views.project, name='project'),
    url(r'^chart',     views.chart,   name='chart'),
    url(r'^test',      views.test,    name='test'),
]
