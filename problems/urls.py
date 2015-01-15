from django.conf.urls import url

from problems import views

urlpatterns = [
    url(r'^$', views.problems, name='index'),
]