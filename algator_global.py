from ALGatorWeb.settings import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'algator',
        'USER': 'algator',
        'PASSWORD': 'algator_abc',
        'HOST': 'kepa.fri.uni-lj.si',
        #'HOST': 'localhost',
        'PORT': '3306',
    }
}

ALGATOR_SERVER = {
 #'Hostname' : 'kepa.fri.uni-lj.si',
 'Hostname' : 'localhost',
 'Port'     : 12321
}

IS_PRODUCTION = False