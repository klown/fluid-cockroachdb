# fluid-cockroachdb

The purpose of this module is to provide a set of common operations for
persistent storage of data, using a Postgres database.  The database is
implemented using [CockroachDB](https://www.cockroachlabs.com/) with
[Sequelize](https://sequelize.readthedocs.io/en/v3).  Documentation of the fluid
components is available in the `docs` folder.

## Getting started

The `scripts` folder provides a way to initialize a database to use with the
operations defined here.  It uses [Docker](https://www.docker.com/get-started)
to create a small local cluster of nodes.  If you have Docker installed, then
running the startup script will download the CockroachDB docker image and launch
it with the following configuration:

| Envionment variable        | Default Value | Description |
| -------------------------- | ------------- | ----------- |
| `COCKROACH_MAIN_CONTAINER` | `cockroachdb` | The main Docker container running the CockroachDB interface |
| `COCKROACHDB_LISTEN_PORT`  | `26257`       | Postgres TCP port for accessing the database |
| `COCKROACHDB_ADMIN_PORT`   | `8080`        | TCP port for the web-based admin viewer<br>`http://localhost:8080` |
| `COCKROACH_USER`           | `maxroach`    | User that has admin privileges for all tables in the database |

## Start Up

Use the provided script to start up the cluster and initialize the empty
`fluid-prefsdb` database.  The script uses the configuration described above,
but the values can be overridden by setting up the appropriate environment
variables (see below for an example).  The script is in the `scripts` folder and
can be run as follows:

```console
startDockerInsecureCluster.sh
```

If you wish to change, for example, the Postgres TCP port
`COCKROACHDB_LISTEN_PORT`, execute the script as follows:

```console
export COCKROACHDB_LISTEN_PORT=26258; startDockerInsecureCluster.sh
```

Note that this will create a `cockroach-data` directory within the folder where
the startup script was run from.  It contains logs and other information about
the cluster.

## Shut Down

When you wish to shut down the cluster, use the `stop` script:

```console
stopDockerInsecureCluster.sh
```

The only environment variable that the shut down script relies on is the main
container name, `COCKROACH_MAIN_CONTAINER`.

Note that when the shut down script is run, all of the `cockroach-data` files
will be deleted, including the directory itself.  If you wish to keep this
information, move the folder elsewhere before calling the shut down script.

## Database API

Documentation on database operations can be found in the
[`docs`](docs/Operations.md) folder.
