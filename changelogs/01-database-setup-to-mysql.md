# Migration to MySQL

Below are listed the steps to configure the Client to connect to MySQL. 
Most steps must be done manually, as they have to do with environment setup.

- Create a new DB schema with `CREATE SCHEMA algator`

- In settings.py, the `DATABASES` property was set to the following (should not have to be manually changed):
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'algator', # DB schema name

        'USER': 'algator',
        'PASSWORD': 'algator',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```

- We will need a MySQL driver for Python, which we can get here: https://pypi.org/project/MySQL-python/.
It can be installed with `pip`.

    - **If using Windows**, the installation will require some extra C++ redistributables, so to keep the process simple,
    the .whl file for it can be downloaded from https://www.lfd.uci.edu/~gohlke/pythonlibs/#mysql-python.
    Once downloaded, navigate to the root of your local Algator web repo and run `pip install <path_to_whl_file>`.
    The driver should be successfully installed.

- In the root of ALGatorWeb, run the commands `python manage.py makemigrations` and `python manage.py migrate`.
After these changes and after `python manage.py runserver`, the `algator` database should have all the defined tables
created within it, with the default data (like the Django permissions table) populated.

- **Note for the line above:** Locally, I got an
error running this the first time, but it seemed nonsensical. After trying again, the DB got populated normally
and the webpage was properly accessible. Should the above commands not work, we should investigate what's going on.

- Create a new superuser with `python manage.py createsuperuser`.

- The SQLite database was deleted with this commit, as it will no longer be used.

- You're all set!
