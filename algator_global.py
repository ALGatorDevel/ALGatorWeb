from ALGatorWeb.settings import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'algator',
        'USER': 'algator',
        'PASSWORD': 'algator_abc',
        'HOST': 'algator.fri.uni-lj.si',
        'PORT': '3306',
    }
}

ALGATOR_SERVER = {
 'Hostname' : 'algator.fri.uni-lj.si',
 'Port'     : 12321
}

IS_PRODUCTION = False