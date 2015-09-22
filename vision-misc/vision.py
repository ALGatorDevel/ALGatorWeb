import json
import os
import logging
import urllib
import traceback
from ConfigParser import SafeConfigParser
from logging.handlers import RotatingFileHandler
from subprocess import Popen, PIPE, STDOUT
from flask import Flask, render_template, abort, make_response, request


app = Flask(__name__)
config = SafeConfigParser()
config.read(os.path.join(app.root_path, "ALGatorWV.conf"))


@app.route("/")
@app.route("/projects/")
def index():
    projects = {}
    for p in get_project_list():
        try:
            projects[p] = get_project_config(p)
        except: 
            projects[p] = {}

    if len(projects) == 0:
        return render_template("error.html", error="No projects found. Make sure algator_data_root is set correctly.")
    else:
        return render_template("project_index.html", projects=projects, title="Projects")


@app.route("/projects/<project_name>")
def project(project_name):
    if not project_exists(project_name):
        return render_template("error.html", error="Missing project directory: " + "PROJ-" + project_name), 404

    project_config = {}
    project_params = {}
    debug_arg = request.args.get("dbg", "")

    try:
        project_config = get_project_config(project_name)
        project_params = get_project_params(project_name)
    except ValueError as e:    # JSON parsing error
        app.logger.exception(e)
        if debug_arg == "true":
            return internal_error(e)
        else:
            return render_template("error.html", title=project_name, 
                error="Syntax error in JSON ({0}): {1}".format(os.path.basename(e.filename), e.message))
    except IOError as e:
        app.logger.exception(e)
        if debug_arg == "true":
            return internal_error(e)
        else:
            return render_template("error.html", title=project_name, 
                error="{0}: {1}".format(e.strerror, os.path.basename(e.filename)))

    return render_template("project.html", title=project_name, config=project_config, params=project_params)


@app.errorhandler(500)
def internal_error(exception):
    exception_name = type(exception).__name__
    exception_msg = str(exception)
    stack_trace = traceback.format_exc()

    debug_arg = request.args.get("dbg", "")
    if debug_arg == "true":
        return render_template("error.html", error="Application encountered an unexpected error", 
            parameters={exception_name: exception_msg}, stack_trace=stack_trace), 500
    else:
        return render_template("error.html", error="Application encountered an unexpected error"), 500


@app.route("/api/projects/<project>/query=<query>", methods=["GET"])
def run_query(project, query):
    data_root = config.get("algator", "algator_data_root")
    algator_jar = config.get("algator", "algator_jar")
    query = urllib.unquote(query)   #decode query

    p = Popen(["java", "-classpath", algator_jar, "algator.Analyse", "-d", data_root, 
        "-o", "S", project], stdout=PIPE, stdin=PIPE, stderr=STDOUT)
    
    output = p.communicate(input=query)[0]

    response = make_response(output)
    response.headers["Content-Type"] = "text/plain"
    return response
    

def project_exists(project):
    data_root = config.get("algator", "algator_data_root")
    path = "{0}/projects/PROJ-{1}".format(data_root, project)

    return os.path.isdir(path)


def get_project_list():
    """
    Returns algator project list
    """
    data_root = config.get("algator", "algator_data_root")
    projects_dir = os.path.join(data_root, "projects")

    if os.path.isdir(projects_dir):
        project_list = os.listdir(projects_dir)
        return [p.replace("PROJ-", "") for p in project_list]  # strip leading "PROJ-" substring
    else:
        return []  # return empty list if <algator_data_root> directory is missing


def get_project_config(project):
    """
    Returns dictionary containing project configuration
    """
    data_root = config.get("algator", "algator_data_root")
    path = "{0}/projects/PROJ-{1}/proj/{1}.atp".format(data_root, project)  # <project>.atp filepath

    try:
        return json.loads(open(path, "r").read(), strict=False)["Project"] 
    except ValueError as e:     # error parsing json
        e.filename = path       # save path and raise
        raise


def get_project_params(project):
    """
    Returns dictionary containing project input/output parameters
    """
    data_root = config.get("algator", "algator_data_root")
    directory = "{0}/projects/PROJ-{1}/proj".format(data_root, project)  
    
    try:
        filepath =  "{0}/{1}-em.atrd".format(directory, project)    # <project>-em.atrd filepath
        data = json.loads(open(filepath, "r").read(), strict=False)["ResultDescription"]

        for file in os.listdir(directory):
            if file.startswith(project) and file.endswith(".atrd") and not file.endswith("-em.atrd"):
                filepath = "{0}/{1}".format(directory, file)
                params = json.loads(open(filepath, "r").read(), strict=False)["ResultDescription"]["ResultParameters"]
                for param in params:
                    if param not in data["ResultParameters"]:
                        data["ResultParameters"].append(param)

        return data
    except ValueError as e:
        e.filename = filepath
        raise
    

def setup_logging():
    log_file = os.path.join(app.root_path, config.get("logging", "log_file"))
    max_log_size = int(config.get("logging", "max_log_size")) * 1024 * 1024

    file_handler = RotatingFileHandler(log_file, maxBytes=max_log_size)
    file_handler.setLevel(logging.ERROR)
    formatter = logging.Formatter("%(levelname)s - %(asctime)s - %(name)s - %(message)s")
    file_handler.setFormatter(formatter)
    app.logger.addHandler(file_handler)


setup_logging()


if __name__ == "__main__":
    app.run(host="0.0.0.0")
