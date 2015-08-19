from django.conf.urls import url

from cpanel import views

urlpatterns = [
    url(r'^$', views.home, name='index'),
    url(r'^taskserver/', views.taskserver, name='taskserver'),
]
