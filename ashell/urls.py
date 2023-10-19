# ashell

from django.urls import path
from ashell import views

urlpatterns = [
    path('', views.ashell, name='ashell'),
    path('getWebpageVersion', views.getWebpageVersion, name='getWebpageVersion'),

]
