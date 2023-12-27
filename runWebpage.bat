@echo off

set datoteka="%ALGATOR_ROOT%\anonymous"

if exist %datoteka% (
    echo Running ALGator webpage in anonymous mode
    python manage.py runserver
) else (
    echo Running ALGator webpage in global mode    
    python manage.py runserver --settings algator_global
)