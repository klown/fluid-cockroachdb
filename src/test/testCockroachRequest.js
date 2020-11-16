/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */

"use strict";

var fluid = require("infusion"),
    jqUnit = require("node-jqunit");
require("../js/cockroachOperations.js");

jqUnit.module("CockroachDB request unit tests.");

fluid.registerNamespace("fluid.tests.cockroachdb");

fluid.defaults("fluid.tests.cockroachdb.request", {
    gradeNames: ["fluid.cockroachdb.request"],
    allDatabasesQuery: "SELECT datname FROM pg_database;",
    members: {
        queryResult: null,  // Set in the test (a Sequelize Promise)
    },
    invokers: {
        "checkAllDatabases": {
            funcName: "fluid.tests.cockroachdb.request.checkAllDatabases",
            args: ["{that}"]
        }
    }
});

/*
 * Query cockroachdb for all of the databases it contains.
 *
 * @param {Object} that - Test request instance.
 * @param {Object} that.sequelize - Connection to cockroachdb.
 * @return {Promise} Promise returned by the request (Sequelize Promise).
 */
fluid.tests.cockroachdb.request.checkAllDatabases = function (that) {
    that.queryResult = that.sequelize.query(that.options.allDatabasesQuery);
    return that.queryResult;
};

fluid.defaults("fluid.tests.cockroachdb.request.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        databaseRequest: {
            type: "fluid.tests.cockroachdb.request"
        },
        testCaseHolder: {
            type: "fluid.tests.cockroachdb.request.testCaseHolder"
        }
    }
});

fluid.defaults("fluid.tests.cockroachdb.request.testCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    modules: [{
        name: "Database request test case",
        tests: [{
            name: "Check initialization and connection",
            sequence: [{
                funcName: "fluid.tests.cockroachdb.request.testInit",
                args: ["{databaseRequest}"]
            }, {
                task: "{databaseRequest}.checkAllDatabases",
                resolve: "fluid.tests.cockroachdb.request.testQueryResult",
                resolveArgs: ["{arguments}.0", "{databaseRequest}"]
            }]                // Sequelize Promise result
        }]
    
    }]
});

fluid.tests.cockroachdb.request.testInit = function (databaseRequest) {
    jqUnit.assertNotNull(databaseRequest, "Check database request object is non-null");
    jqUnit.assertNotNull(databaseRequest.sequelize, "Check database connection is non-null");
};

fluid.tests.cockroachdb.request.testQueryResult = function (result, databaseRequest) {
    jqUnit.assertNotNull("Check for null query result", result);

    var dataBases = result[0];
    jqUnit.assertNotEquals("Check for empty query result", dataBases.length, 0);

    var ourDatabaseName = databaseRequest.options.databaseName;
    var ourDatabase = fluid.find(dataBases, function(aDatabase) {
        if (aDatabase.datname === ourDatabaseName) {
            return aDatabase;
        }
    });
    jqUnit.assertNotNull(ourDatabase, "Check for '" + ourDatabaseName + "'");
};

fluid.test.runTests("fluid.tests.cockroachdb.request.environment");
