# analysis

from django.urls import path
from analysis import views

urlpatterns = [
    path('',      views.main,  name='main'),
    path('main',  views.main,  name='main'),
]