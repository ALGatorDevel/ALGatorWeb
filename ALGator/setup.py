__author__ = "tomaz"
__date__   = "$25.8.2015 15:28:42$"

from setuptools import setup, find_packages

setup (
       name='AWeb',
       version='0.1',
       packages=find_packages(),

       # Declare your packages' dependencies here, for eg:
       install_requires=['foo>=3'],

       # Fill in these to make your Egg ready for upload to
       # PyPI
       author='tomaz',
       author_email='',
      
       )

def setup_logging():
    log_file = os.path.join(app.root_path, config.get("logging", "log_file"))
    max_log_size = int(config.get("logging", "max_log_size")) * 1024 * 1024

    file_handler = RotatingFileHandler(log_file, maxBytes=max_log_size)
    file_handler.setLevel(logging.ERROR)
    formatter = logging.Formatter("%(levelname)s - %(asctime)s - %(name)s - %(message)s")
    file_handler.setFormatter(formatter)
    app.logger.addHandler(file_handler)
       