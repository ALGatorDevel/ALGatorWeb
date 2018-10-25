# ALGator/urls.py

from django.conf.urls import patterns, include, url

from login.views import *

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
    url(r'accounts/', include('django.contrib.auth.urls')),    
    url(r'^$', home),
    url(r'^problems/', include('problems.urls', namespace='problems')),
    #url(r'^logout/$', home),
    url(r'^accounts/login/$', 'django.contrib.auth.views.login'),  # If user is not logged in, redirect to login
    url(r'^register/$', register),
    url(r'^register/success/$', register_success),
    url(r'^home/$', home),
    url(r'^settings/$', settings_page),
    url(r'^cpanel/', include('cpanel.urls', namespace='cpanel')),
    url(r'^vision/', include('vision.urls', namespace='vision'))

)

