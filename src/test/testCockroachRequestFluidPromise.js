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
        queryResult: null,   // Set in the test (a Sequelize Promise)
    },
    invokers: {
        "checkAllDatabases": {
            funcName: "fluid.tests.cockroachdb.request.checkAllDatabases",
            args: ["{that}"]
        }
    }
});

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
//                task: "fluid.tests.cockroachdb.request.testCheckAllDatabases",
//                args: ["{databaseRequest}"],
                resolve: "fluid.tests.cockroachdb.request.testQueryResult",
                resolveArgs: ["{arguments}.0", "{databaseRequest}"]
            }]                // fluid promise result
        }]
    
    }]
});

fluid.tests.cockroachdb.request.testInit = function (databaseRequest) {
    fluid.log("Testing request initialization");
    jqUnit.assertNotNull(databaseRequest, "Check database request object is non-null");
    jqUnit.assertNotNull(databaseRequest.sequelize, "Check database connection is non-null");
};

fluid.tests.cockroachdb.request.testCheckAllDatabases = function (databaseRequest) {    
    // TODO:  is this 'conversion' to a fluid.promise needed?
    var fluidPromise = fluid.promise();
    databaseRequest.checkAllDatabases().then(
        function(result) {
            var sucessReq = databaseRequest;
            fluidPromise.resolve(result);   
        },
        function (error) {
            var failureReq = databaseRequest;
            fluidPromise.reject(error);
        }
    );
    return fluidPromise;
};

fluid.tests.cockroachdb.request.testQueryResult = function (result, databaseRequest) {
    fluid.log("testing query result");
    jqUnit.assertNotNull("Check for null query result", result);

    var dataBases = result[0];
    jqUnit.assertNotEquals("Check for empty query result", dataBases.length, 0);

    var ourDatabaseName = databaseRequest.options.databaseName;
    var ourDatabase = fluid.find(dataBases, function(aDatabase) {
        if (aDatabase.datname === ourDatabaseName) {
            return aDatabase;
        }
    }, null);
    jqUnit.assertNotNull(ourDatabase, "Check for '" + ourDatabaseName + "'");
};

fluid.test.runTests("fluid.tests.cockroachdb.request.environment");
