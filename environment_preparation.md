Environment preparation
- [Install Django](#install-django)
- [Install Mysql server](#install-mysql-server)
- [Create database and run migrations](#create-database-and-run-migrations)
- [Run ALGatorWeb](#run-algatorweb)
<hr>

# Install Django
Install conda (docs.conda.io) and run

```bash
conda create -n algator # Create virtual environment
conda activate algator  # Activate virtual enviroment

# Install Python 3.10
conda install python==3.10 

# Install dependencies
pip install -r requirements.txt 
```

# Install Mysql server
Install stand-alone MySql server or run a docker image with, for example, the following command:

```
docker run -d --name mysql -v /path/data:/var/lib/mysql -v /path/my.cnf:/etc/mysql/my.cnf -e MYSQL_USER=algator -e MYSQL_PASSWORD=algator -e MYSQL_ROOT_PASSWORD=algator -e MYSQL_DATABASE=algator --restart=always -p 3306:3306  mysql
```


# Create database and run migrations
1. Create database

```sql
  create database algator;
```

2. Run django migrations

```bash
  python manage.py migrate --settings algator_global
```

3. Add SQL logic by running  `ausers/migration/after_migration.sql` script.


# Run ALGatorWeb

```bash
  python manage.py runserver --settings algator_global
```
