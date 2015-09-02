"""
WSGI config for ALGator project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.6/howto/deployment/wsgi/
"""

# Old version; new version was written to provide envorinment variables
#import os
#os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ALGator.settings")
#
#from django.core.wsgi import get_wsgi_application
#application = get_wsgi_application()
# end


from django.core.handlers.wsgi import WSGIHandler
import django
import os

class WSGIEnvironment(WSGIHandler):

    def __call__(self, environ, start_response):

        os.environ['ALGATOR_ROOT'] = "/Users/Tomaz/Dropbox/FRI/ALGOSystem/ALGATOR_ROOT/"
        os.environ['JWE_ROOT'] = "/Users/Tomaz/Dropbox/FRI/ALGOSystem/JWE/prog"

        # os.environ['ALGATOR_ROOT'] = environ['ALGATOR_ROOT']
        # os.environ['JWE_ROOT'] = environ['JWE_ROOT']
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ALGator.settings")
        django.setup()
        return super(WSGIEnvironment, self).__call__(environ, start_response)

application = WSGIEnvironment()
