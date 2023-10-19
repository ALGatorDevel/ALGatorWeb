# login

from django.urls import path

from login import views

urlpatterns = [
    path('', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('dologin/', views.dologin, name='dologin'),

]
