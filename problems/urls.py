from django.urls import path
from . import views

urlpatterns = [
    path("project/",                      views.problem, name="problem"),

    path("get_computer_familes",          views.get_computer_familes,         name="get_computer_familes"),
    path("get_project_general_data",      views.get_project_general_data,     name="get_project_general_data"),
    path("get_project_properties",        views.get_project_properties,       name="get_project_properties"),
    path("get_project_html_description",  views.get_project_html_description, name="get_project_html_description"),
    path("get_testset",                   views.get_testset,                  name="get_testset"),
    path("get_testsets",                  views.get_testsets,                 name="get_testsets"),
    path("get_testset_files",             views.get_testset_files,            name="get_testset_files"),
    path("get_testsets_common_files",     views.get_testsets_common_files,    name="get_testsets_common_files"),
    path("get_testset_file",              views.get_testset_file,             name="get_testset_file"),
    path("remove_testset_file",           views.remove_testset_file,          name="remove_testset_file"),
    path("get_algorithm",                 views.get_algorithm,                name="get_algorithm"),
    path("get_algorithms",                views.get_algorithms,               name="get_algorithms"),
    path("get_presenter",                 views.get_presenter,                name="get_presenter"),
    path("get_presenters",                views.get_presenters,               name="get_presenters"),

    path("uploadmulti",                   views.uploadmulti,                  name="uploadmulti"),
]