# Cockroach Database Components and API

Accessing the database involves setting up Postgres tables according to a table
definition, and adding, retrieving, and modifying the data within those tables.
A pair of fluid components have been defined for preforming these operations.
They provide an interface for common database access routines.

The interface is a combination of [CockroachDB](https://www.cockroachlabs.com)
and its implementation of [Sequelize](https://sequelize.readthedocs.io/en/v3).
As such, the actual calls to the database and its tables are given in the form
of `JSON` structures.  That is, to put something into the data base, or making a
query, involves json inputs that are compiled into Postgres and, from there,
into the proper Postgres data base structures.  Likewise, to retrieve something 
from the database, the return value is a json structure.

Nonetheless, raw SQL/Postgres requests are available through the full Sequelize
API.  Users of this library have access to Sequelize via an instance of the
[`fluid.cockroachdb.request` component](#fluidcockroachdbrequest).

Note that most of the functions return a `Promise`.  Sequelize uses the
[Bluebird](http://bluebirdjs.com/docs/why-promises.html) library, which
interested parties can read about.  This library of operations chooses to use
only the `then(), resolve(), and reject()` functions, and, in so doing, can
make used woith [Infusion's promise API](https://docs.fluidproject.org/infusion/development/promisesapi).

## APIs

The library consists of two fluid componenets, one that establishes a
connection to the data base (host, port, etc.) and another that executes the
operations themselves.  These are documented in what follows.

### `fluid.cockroachdb.request`

The request component is for initializing the connection with the database and
providing a (Postgres) wire to make requests of it.

#### Component options

| Option            | Type       | Description | Default |
| ----------------- | ---------- | ----------- | ------- |
| `databaseName`    | String     | Optional. Name of the database containing the tables | `"fluid_prefsdb"` |
| `dialect`         | String     | Optional. One of `"sql"`, `"mysql"`, `"sqlite"` or `"postgres"` | `"postgres"` |
| `port`            | Integer    | Optional. The port for the requests | `26257` |
| `user`            | String     | Optional. User administrator's name | `"maxroach"` |
| `password`        | String     | Optional (required for secure implemenations). User administrator's password | "" (empty string) | 

#### Component members

| Member            | Type       | Description |
| ----------------- | ---------- | ----------- |
| `sequelize`       | Object     | Full access to CockroachDB's Sequelize implementation.  When instantiated its dialect is set to the request component's `"dialect"` option, described above. |


When initialized, the request component establishes the connection with the
database as per its options.  It is then available for database queries.
However, the request instance is a member of the `fluid.cockroachdb.operations`
component described immediately following. Clients will use the operations
component for most of the interactions with the database and its tables.

### `fluid.cockroachdb.operations`

The majority of the database access operations is done using an instance of this
component.  Its structure and API are documented here:

#### Component members

| Member            | Type       | Description |
| ----------------- | ---------- | ----------- 
| `tables`          | Object     | Hash of Sequelize table models, keyed by the table name.  For example, if there is a table in the database named `"users""` table in, then access to its model is via `tables["users"]` |

#### Sub-components

| Component         | Type                            | Description |
| ----------------- | ----------                      | ----------- |
| `request`         | `fluid.cockroachdb.request`     | An instance of the request component [documented above](#fluidcockroachdbrequest) |


#### Operations API

##### `createOneTable(tableModel)`
- `tableModel Object` A Sequelize model definition structure
- Returns: `{Promise}` whose value is the model definition

Creates the table and sets up its rows as described by the `tableModel`
parameter. If the table already exists, it is deleted and re-created. The table
is empty after creation.

##### `createTables(tableModels)`
- `tableModels Object` A Hash of table names and their Sequelize model
definitions
- Returns: `{Promise}` whose value is an array of model definitions

Loop to create the tables by calling `createOneTable()` for each table model in
the input parameter.  Any existing tables are deleted and recreated.  The
returned promise is the result of running a `fluid.promise.sequence`.  The
created tables are empty.

##### `loadOneTable(tableName, records)`
- `tableName String` The name of the table to load with the given records
- `records Array` An array of JSON objects containing the data to store in the
given table.
- Returns: `{Promise}` whose value is an array of loaded instances.

Bulk load the given records into the given table.  The records' JSON field
names must match the column names of the table and the values of those fields
are the data to store in the column.  It is not necessary to have a field for
each column -- missing fields/columns are set to null values in the table.

##### `loadTables(tableData)`
- `tableData Object` A Hash of table names and the records to load.
- Returns: `{Promise}` whose value is an array of tables and their loaded
records.

For each table named in `tableData`, buik load the associated array of records
into that table using `loadOneTable()`.  The returned promise is the result of
running a `fluid.promise.sequence`.

##### `deleteTableData(tableName, hardDelete)`
- `tableName String` The name of the table whose data is to be deleted.
- `hardDelete Boollean` Flag indicating whether to execute a hard vs. soft
deletion.  A soft deletion leaves the date in a recoverable state.  A hard
deletion is irrevocable.
- Returns: `{Promise}` whose value is the number of rows deleted.

Deletes all of the data in the given table, leaving it empty.

##### `selectRows(tableName, rowInfo)`
- `tableName String` The name of the table whose data is to be retrieved.
- `rowInfo Object` Object containing a columnName/value pair.
- Returns: `{Promise}` whose value is an array of the row data retrieved, as
JSON objects.

Executes a `SELECT * FROM <tableName> WHERE <columnName>=<value>`.  The `WHERE`
consraint is defined by the `rowInfo` object.  An example, given a table with a
"colour" column with row values consisting of colour names, is
`{ colour: "green" }`.

##### `retrieveValue(tableName, constraints)`
- `tableName String` The name of the table whose data is to be retrieved.
- `constraints Object` A Hash of constraints containing an `attributes` array
and a `where` object.  Both can be empty.
- Returns: `{Promise}` whose value is an array of the data retrieved, as
JSON objects.

Retrieves a value or values based on the contraints provided.  The `attributes`
array member of the `constraints` parameter lists the relevant column names, and
the `where` object defines the WHERE contraint.  Both can be empty.  An
example is:

```
{
    attributes: ["id", "password_scheme", "username"],
    where: {
        iterations: 10
    }
}
```

This executes
`SELECT id, password_scheme, username FROM <tableName> WHERE iterations=10`.

An example of the return value is, assuming there are only two users in the
table that have logged into the system exactly 10 times:

```
[
    {
        id: "7D35672C-4E92-4662-8083-6432C179F9EE",
        password_schema: "pbkdf2",
        username: "carla",
        iterations: 10
    },
    {
        "id": "A5138D2A-3C64-4B49-8838-749EE12762DC",
        "password_scheme": "pbkdf2",
        "username"": "sammy",
        "iterations": 10,
    }
]
```

##### `insertRecord(tableName, record)`
- `tableName String` The name of the table into which to insert the record.
- `record Object` An JSON object containing the values to store in the table.
- Returns: `{Promise}` whose value is an array of the instance inserted, as a
JSON object.

Loads the given record into the given table.  The record's JSON field
names must match the column names of the table, and the values of those fields
are the data to store.  It is not necessary to have a field for each column
-- missing fields/columns are set to null values in the table.

##### `deleteRecord(tableName, primaryKey)`
- `tableName String` The name of the table whose data is to be deleted.
- `primaryKey String` A name/value pair given the primary key of the record to
delete.
- Returns: Promise whose value is the number of rows deleted.  It should be 1.

The `primaryKey` object give the name of the column that is a primary key, and
the row value to determine which row to delete.  For example: 

```
{ id: "7D35672C-4E92-4662-8083-6432C179F9EE"}
```

##### `updateFields(tableName, fieldData)`
- `tableName String` The name of the table whose data is to be retrieved.
- `fieldData Object` A Hash containing an `attributes` object and a `where`
`where` object.  The `where` object must contain the primary key, at least.
- Returns: `{Promise}` whose value is an array containing the number of
affected rows, and the actual affected rows.

Finds and updates the table's columns based on the fields in the `attributes`
object.  The `attributes` is a set of columnName and their (new) values.  The 
`where` object determines the row in the table to update and is the value of the
primary key.  For example to update a user's email address:

```
{
    attributes: {
        "email": "carla@localhost"
        "verified": false,
    },
    where: { id: "7D35672C-4E92-4662-8083-6432C179F9EE"}
}
```
