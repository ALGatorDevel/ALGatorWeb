"""
URL configuration for ALGatorWeb project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from ausers.views import *
import problems.views as pviews

from django.conf.urls.static import static
from django.conf import settings



urlpatterns = [
    path("", include(("main.urls", 'main'), namespace='main'), name="main"),

    path("ausers/", include(("ausers.urls", "ausers"), namespace="ausers"), name="ausers"),
    path("ashell/", include(("ashell.urls", "ashell"), namespace="ashell"), name="ashell"),
    
    path("projects/", include(("problems.urls", "problems"), namespace="problems"), name="problems"),

    path('project/<str:problemName>',     pviews.project, name="problem"),
    path('project/<str:problemName>/',    pviews.project, name="problemws"),

    path('permissions/', include(('ausers.urls', 'ausers'), namespace='auserş')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


