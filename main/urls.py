from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="home"),
    path("problems/", views.problems, name="problems"),
    path('pAskServerAjax', views.pAskServerAjax, name='pAskServerAjax'),
    path('pAskServer', views.pAskServer, name='pAskServer'),
    path('uploadimage', views.uploadimage, name='uploadimage'),
    path('moveimages', views.moveimages, name='moveimages'),
]