# ALGator/urls.py

from django.urls import include, path

from login.views import *

from django.contrib import admin
admin.autodiscover()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),    
    path('', home),
    path('problems/', include(('problems.urls', 'problems'), namespace='problems')),
    path('register/', register),
    path('register/success/', register_success),
    path('home/', home),
    path('settings/', settings_page),
    path('login/', include(('login.urls', 'login'), namespace='login')),
    path('cpanel/', include(('cpanel.urls', 'cpanel'), namespace='cpanel')),
    path('vision/', include(('vision.urls', 'vision'), namespace='vision')),
    path('analysis/', include(('analysis.urls', 'analysis'), namespace='analysis')),
    path('ashell/', include(('ashell.urls', 'ashell'), namespace='ashell')),    
]

