from django.urls import path
from . import views

urlpatterns = [
    path("problem/",                views.problem, name="problem"),
]