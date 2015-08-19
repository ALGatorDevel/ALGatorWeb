from django.conf.urls import patterns, include, url

from login.views import *

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^polls/', include('polls.urls', namespace="polls")),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^$', home),
    url(r'^problems/$', include('problems.urls', namespace='problems')),
    url(r'^logout/$', logout_page),
    url(r'^accounts/login/$', 'django.contrib.auth.views.login'),  # If user is not logged in, redirect to login
    url(r'^register/$', register),
    url(r'^register/success/$', register_success),
    url(r'^home/$', home),
    url(r'^settings/$', settings_page),
    url(r'^cpanel/', include('cpanel.urls', namespace='cpanel'))
)

