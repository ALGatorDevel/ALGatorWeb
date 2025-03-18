from ALGatorWeb.settings import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'algator',
        'USER': 'algator',
        'PASSWORD': 'algator',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}

ALGATOR_SERVER = {  
 'Hostname' : 'localhost',
 'Port'     : 12321
}

IS_PRODUCTION = False