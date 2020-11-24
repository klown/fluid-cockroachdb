/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
"use strict";

var fluid = require("infusion"),
    Sequelize = require("sequelize-cockroachdb");  // for SQL data types

fluid.setLogging(true);     // TODO: remove (for debugging)

fluid.registerNamespace("fluid.test.cockroachdb");

fluid.defaults("fluid.cockroachdb.request", {
    gradeNames: ["fluid.component"],
    databaseName:   "fluid_prefsdb",    // TODO: from enviroment variable?
    dialect:        "postgres",
    port:           26257,              // TODO: from enviroment variable?
    user:           "maxroach",
    password:       "",                 // TODO: make secure
    members: {
        // Reference to a sequelize instance that will handle the Postgres
        // requests, initialized onCreate.  Note that the database can be
        // non-existent when the sequelize member is initialized, but the
        // database must be up before it is used to make a request.
        sequelize:  null
    },
    listeners: {
        "onCreate": {
            funcName: "fluid.cockroachdb.initConnection",
            arguments: ["{that}"]
        }
    }
});

/**
 * Initiallize connection to the cockroachdb, using Sequelize.
 *
 * @param {Object} that - Contains the options for the connection and a member
 *                        to hold a reference to the connection.
 * @param {String} that.options.databaseName - Name of the database.
 * @param {String} that.options.user - Name of the user with admin access.
 * @param {String} that.options.password - User's password.
 * @param {String} that.options.dialect - The dialect for SQL requests,
 *                                        e.g. "postgres".
 * @param {Number} that.options.port - The port number for the connection.
 * @param {Object} that.sequelize - Object set herein to use for requests.
 *
 */
fluid.cockroachdb.initConnection = function (that) {
    that.sequelize = new Sequelize(
        that.options.databaseName, that.options.user, that.options.password, {
            dialect: that.options.dialect,
            port: that.options.port
        }
    );
};

fluid.defaults("fluid.cockroachdb.operations", {
    gradeNames: ["fluid.component"],
    members: {
        tables: {}
    },
    invokers: {
        createTables: {
            funcName: "fluid.cockroachdb.operations.createTables",
            args: ["{that}", "{arguments}.0"]
        },
        createOneTable: {
            funcName: "fluid.cockroachdb.operations.createOneTable",
            args: ["{that}", "{that}.request", "{arguments}.0"]
                                               // model definition
        },
        loadOneTable: {
            funcName: "fluid.cockroachdb.operations.loadOneTable",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // table data
        },
        loadTables: {
            funcName: "fluid.cockroachdb.operations.loadTables",
            args: ["{that}", "{arguments}.0"]
                             // table data
        },
        deleteTableData: {
            funcName: "fluid.cockroachdb.operations.deleteTableData",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // hard delete?
        },
        selectRows: {
            funcName: "fluid.cockroachdb.operations.selectRows",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // row contraints
        }, 
        retrieveValue: {
            funcName: "fluid.cockroachdb.operations.retrieveValue",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // constraints
        },
        insertRecord: {      
            funcName: "fluid.cockroachdb.operations.insertRecord",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // record
        },
        updateFields: {
            funcName: "fluid.cockroachdb.operations.updateFields",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // changes
       
        },
        deleteRecord: {
            funcName: "fluid.cockroachdb.operations.deleteRecord",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // identifier (primary key)
        }
    },
    components: {
        request: {
            type: "fluid.cockroachdb.request"
        }
    }
});

/**
 * Loop to define and create the database tables.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.request - An instance of fluid.cockroachdb.request
 * @param {Object} that.tables - List of references the created tables.
 * @param {Object} tableDefs - A list of table defintions.  TODO: document this.
 * @return {Promise} Final Promise of the sequence that created the tables.
 */
fluid.cockroachdb.operations.createTables = function (that, tableDefs) {
    var creationSequence = [];
    fluid.each(tableDefs, function (aTableDef) {
        creationSequence.push(that.createOneTable(aTableDef));
    });
    return fluid.promise.sequence(creationSequence);
};

/**
 * Define structure of a database table, and request it be created.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The resulting table is added to this list. 
 * @param {Object} request - An instance of fluid.cockroachdb.operations.request
 * @param {Object} tableDef - The table definition.
 * @param {Object} tableDef.options - Table columne (varies).
 * @return {Promise} Promise whose value is the created table.  A resolve
 *                   handler adds the table to that.tables.  A reject handler
 *                   logs a message.
 */
fluid.cockroachdb.operations.createOneTable = function (that, request, tableDef) {
    var theTable = tableDef(request.sequelize);

    // Force the destruction (drop) of any existing tablev before (re)creating
    // it.
    var createPromise = theTable.model.sync({force: true});
    createPromise.then(
        function (createdTable) {
            that.tables[createdTable.name] = createdTable;
        },
        function (error) {
            fluid.log("Failed to create table '", theTable.name, "' ", error);        
        }
    );
    return createPromise;
};

/*
 * Load data sets into the tables that this initializer knows about.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableData - List of name/value pairs for the tables.
 * @return {Promise} Final Promise of the sequence that loaded the tables.
 */
fluid.cockroachdb.operations.loadTables = function (that, tableData) {
    var tableNames = fluid.keys(tableData);
    var loadSequence = [];
    fluid.each(tableNames, function (aTableName) {
        loadSequence.push(that.loadOneTable(aTableName, tableData[aTableName]));
    });
    return fluid.promise.sequence(loadSequence);
};

/*
 * Load a data set into a table.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - Name of the table to load.
 * @param {Object} records - The table data -- array of objects containing
 *                           name/value pairs that match the column/values of
 *                           the table.
 * @param {Object} that.table[tableName] - The table to load.
 * @return {Promise} Promise whose value is loaded table.  Resolve and reject
 *                   handlers log the success/failure.
 */
fluid.cockroachdb.operations.loadOneTable = function (that, tableName, records) {
    var model = that.tables[tableName];
    if (model) {
        var loadPromise = model.bulkCreate(records);
        loadPromise.then(
            function (results) {
                fluid.log("Loaded ", results.length, " records into table '", tableName, "'");
            },
            function (error) {
                fluid.log("Failed to load table '", tableName, "'", error);
            }
        );
        return loadPromise;
    } else {
        return fluid.promise().resolve("No table defined for '" + tableName + "' dataset");   // TODO: error (reject)?
    }
};

/*
 * Flush or empty the contents of the named table -- delete all rows.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be deleted.
 * @param {Boolean} hardDelete - (Optional) Flag for soft vs. hard deletion.
 * @return {Promise} Promise whose value is the number of rows deleted.
 */
fluid.cockroachdb.operations.deleteTableData = function (that, tableName, hardDelete) {
    var model = that.tables[tableName];
    if (model) {
        // Empty 'where' option means: no row filtering (= all rows).
        if (hardDelete) {
            return model.destroy({force: hardDelete, where: {}});
        } else {
            return model.destroy({where: {}});
        }
    } else {
        return fluid.promise().resolve(0);
    }
};

/*
 * Retrieve the given row from the given table.
 * SELECT * FROM <tableName> WHERE <column>=<value>;
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be deleted.
 * @param {Object} rowInfo - Object containing a columnName/value pair.
 * @return {Promise} Promise whose value is an array of instances (can be empty).
 */
fluid.cockroachdb.operations.selectRows = function (that, tableName, rowInfo) {
    var model = that.tables[tableName];
    if (model) {
        return model.findAll({where: rowInfo});
    } else {
        return fluid.promise().resolve([]);
    }
    // SELECT * FROM <tableName> WHERE <column>=<value>;
};

/*
 * Retrieve the value at a given row/column in the given table.
 * SELECT <constraints.attributes> FROM <tableName> WHERE <valueSpec.where> 
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be deleted.
 * @param {Object} valueSpec - Specification of what to retrieve:
 * @param {Array} constraints.attributes - Array of column names; can be empty.
 * @param {Object} constraints.where - Restrictions on row; can be empty.
 * @return {Promise} Promise whose value is an array of instances (can be empty).
 */
fluid.cockroachdb.operations.retrieveValue = function (that, tableName, constraints) {
    var model = that.tables[tableName];
    if (model) {
        return model.findAll(constraints);
    } else {
        return fluid.promise().resolve([]);
    }
    // SELECT <constraints.attributes> FROM <tableName> WHERE <constraints.where> 
};

/*
 * Insert the given record into the given table.  Note that the fields of the
 * record must match the columns of the table.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be deleted.
 * @param {Object} record - Hash of name/value pairs.
 * @return {Promise} Promise whose value is an array of the record added and
 *                   whether it was added.
 */
fluid.cockroachdb.operations.insertRecord = function (that, tableName, record) {
    return that.loadOneTable(tableName, [record]);
};

/*
 * Delete the given identified record into the given table.  Examples of the
 * 'primaryKey' parameter:
 * - { "id": "F553B211-5BCD-41EA-9911-50646AE19D74"}
 * - { "name": "default"}
 * 
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table from which the record is deleted.
 * @param {Object} primaryKey - Identifier for the record to delete:
 * @param {Object} primaryKey.keyName - Primary key name.
 * @param {Object} primaryKey.value - Value of the primary key.
 * @return {Promise} Promise whose value is ???
 */
fluid.cockroachdb.operations.deleteRecord = function (that, tableName, primaryKey) {
    var model = that.tables[tableName];
    if (model) {
        return model.destroy({ where: primaryKey });
    } else {
        return fluid.promise().resolve([]);
    }
};

/*
 * Update the data in the given field(s) of the given table with the given
 * identifier and other constraints.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be deleted.
 * @param {Object} fieldData - Data to be inserted, and constraints:
 * @param {Object} fieldData.attributes - Hash of name/value pairs, to be
 *                                        inserted.
 * @param {Object} fieldData.where - Constraints on the insertion.  It must
 *                                   contain an identifier (primary key).
 * @return {Promise} Promise whose value is an array containing the number of
 *                   affected rows, and the actual affected rows.
 */
fluid.cockroachdb.operations.updateFields = function (that, tableName, fieldData) {
    var model = that.tables[tableName];
    if (model) {
        if (!fieldData.where) {
            return fluid.promise().reject("Missing primary key");
        } else {
            return model.update(fieldData.attributes, { where: fieldData.where });
        }
    } else {
        return fluid.promise.resolve([]);
    }
};
