from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="home"),
    path("projects",     views.problems, name="problems"),
    path('pAskServer',   views.pAskServer, name='pAskServer'),
    path('uploadimage',  views.uploadimage, name='uploadimage'),
    path('moveimages',   views.moveimages, name='moveimages'),

    path("viewlog",   views.view_log_sessions, name="problems"),

    path("download",      views.download,      name="download"),
    path("howItWorks",    views.howItWorks,    name="howItWorks"),
    path("about",         views.about,         name="about"),
    path("faq",           views.faq,           name="faq"),
    path("screenshots",   views.screenshots,   name="screenshots"),
    path("contact",       views.contact,       name="contact"),
]