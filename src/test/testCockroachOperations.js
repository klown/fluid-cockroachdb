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
require("./data/tableDataConfig.js");

jqUnit.module("CockroachDB operations unit tests.");

fluid.registerNamespace("fluid.tests.cockroachdb");

fluid.tests.cockroachdb.anotherUserToInsert =  {
    "id": "another.user:nonadmin",
    "rev": "4-b363c37b06fab359471bec4c12c8c36e",
    "password_scheme": "pbkdf2",
    "iterations": 10,
    "username": "carla",
    "type": "user",
    "name": "carla",
    "email": "carla@localhost",
    "roles": [
        "user"
    ],
    "signupTimestamp": new Date("2014-01-03T17:59:23.634Z"),
    "failedLoginAttempts": 0,
    "derived_key": "9ff4bc1c1846181d303971b08b65122a45174d04",
    "salt": "2653c80aabd3889c3dfd6e198d3dca93",
    "emailVerificationTimestamp": new Date("2014-01-03T18:00:30.787Z"),
    "verified": true
};

fluid.defaults("fluid.tests.cockroachdb.operations", {
    gradeNames: ["fluid.cockroachdb.operations"],
    members: {
        // Set onCreate
        tableInfo: {},
        rgbChartreuse: null,
        
        // For testing
        user: fluid.tests.cockroachdb.anotherUserToInsert,
        userChanges: {          // Changes that should succeed
            where: {
                id: "another.user:nonadmin"
            },
            attributes: {
                "verified": false, 
                "email": "carla@globalhost"
            }
        },
        missingIdentifier: {    // Changes that should fail
             attributes: {
                "verified": false, 
                "email": "carla@globalhost"
            }
        }
    },
    listeners: {
        "onCreate": {
            funcName: "fluid.tests.cockroachdb.operations.loadTableInfo",
            args: ["{that}"]
        }
    }
});

/*
 * Load the test table definitions and their data, and provide convenience
 * access to some of the data.
 *
 * @param {Object} that - Operations test component instance.
 * @param {Object} that.tableInfo - Where to store the table definitions and
 *                                  data.
 * @param {Object} that.rgbChartreuse - Reference to the "chartreuse" rgb data.
 */
fluid.tests.cockroachdb.operations.loadTableInfo = function (that) {
    that.tableInfo.tableDefs = require("./data/tableModels.js");
    that.tableInfo.tableData = fluid.tests.cockroachdb.tableDataConfig;
    that.rgbChartreuse = fluid.find(that.tableInfo.tableData.rgb, function(aColour) {
        if (aColour.id === "chartreuse") {
            return aColour;
        }
    });
};

fluid.defaults("fluid.tests.cockroachdb.operations.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        cockRoachTestOps: {
            type: "fluid.tests.cockroachdb.operations"
        },
        testCaseHolder: {
            type: "fluid.tests.cockroachdb.operations.testCaseHolder"
        }
    }
});

fluid.defaults("fluid.tests.cockroachdb.operations.testCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    modules: [{
        name: "Database operations tests",
        tests: [{
            name: "Database operations tests",
            sequence: [{
                funcName: "fluid.tests.cockroachdb.operations.testInit",
                args: ["{cockRoachTestOps}"]
            }, 
              // In the following, the first argument to the 'resolveArgs' or
              // 'rejectArgs' is a Sequelize Promise result
              {
                task: "{cockRoachTestOps}.createOneTable",
                args: ["{cockRoachTestOps}.tableInfo.tableDefs.rgbTableModel"],
                resolve: "fluid.tests.cockroachdb.operations.testCreateOneTable",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}.tables"]
            }, {
                task: "{cockRoachTestOps}.createTables",
                args: ["{cockRoachTestOps}.tableInfo.tableDefs"],
                resolve: "fluid.tests.cockroachdb.operations.testCreateTables",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}.tables"]
            }, {
                task: "{cockRoachTestOps}.loadOneTable",
                args: ["rgb", "{cockRoachTestOps}.tableInfo.tableData.rgb"],
                resolve: "fluid.tests.cockroachdb.operations.testLoadOneTable",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}.tableInfo.tableData.rgb"]
            }, {
                task: "{cockRoachTestOps}.deleteTableData",
                args: ["rgb", true],    // hard delete
                resolve: "fluid.tests.cockroachdb.operations.testDeleteTableData",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}", "rgb"]
            }, {
                task: "{cockRoachTestOps}.loadTables",
                args: ["{cockRoachTestOps}.tableInfo.tableData"],
                resolve: "fluid.tests.cockroachdb.operations.testLoadTables",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}.tableInfo.tableData"]
            }, {
                task: "{cockRoachTestOps}.selectRows",
                args: ["rgb", { color: "green" }],
                resolve: "fluid.tests.cockroachdb.operations.testSelectRows",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}.tableInfo.tableData.rgb"]
            }, {
                task: "{cockRoachTestOps}.retrieveValue",
                args: [
                    "rgb",
                    { attributes: ["colourMap"], where: { id: "chartreuse" } }
                ],
                resolve: "fluid.tests.cockroachdb.operations.testSelectValue",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}.rgbChartreuse", "colourMap"]
            }, {
                task: "{cockRoachTestOps}.insertRecord",
                args: ["users", "{cockRoachTestOps}.user"],
                resolve: "fluid.tests.cockroachdb.operations.testInsertRecord",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}.user"]
            }, {
                // Update a field with a proper identifier
                task: "{cockRoachTestOps}.updateFields",
                args: ["users", "{cockRoachTestOps}.userChanges"],
                resolve: "fluid.tests.cockroachdb.operations.testUpdateFields",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}", true]
            }, {
                // Update a field with no identifier -- should fail/reject
                task: "{cockRoachTestOps}.updateFields",
                args: ["users", "{cockRoachTestOps}.missingIdentifier"],
                reject: "fluid.tests.cockroachdb.operations.testUpdateFields",
                rejectArgs: ["{arguments}.0", "{cockRoachTestOps}", false]
            }, {
                task: "{cockRoachTestOps}.deleteRecord",
                args: ["roster.preferenceset", { "name": "default" }],
                resolve: "fluid.tests.cockroachdb.operations.testDeleteRecord",
                resolveArgs: ["{arguments}.0"]
            }/*, {
                task: "{cockRoachTestOps}.selectRows",
                args: ["users", { id: "another.user:nonadmin" }],
                resolve: "fluid.tests.cockroachdb.operations.testSelectValue",
                resolveArgs: ["{arguments}.0", "{cockRoachTestOps}", "user"]
            }*/]
        }]
    }]
})

fluid.tests.cockroachdb.operations.checkKeyValuePairs = function (keys, actualPairs, expectedPairs, msg) {
    fluid.each(keys, function (key) {
        jqUnit.assertDeepEq(
            msg + " for key '" + key + "'",
            actualPairs[key], expectedPairs[key]
        );
    });                
};

fluid.tests.cockroachdb.operations.testInit = function (cockRoachTestOps) {
    jqUnit.assertNotNull("Check operations instance is non-null", cockRoachTestOps);
    jqUnit.assertTrue("Check table test models and data",
        cockRoachTestOps.tableInfo &&
        cockRoachTestOps.tableInfo.tableDefs &&
        cockRoachTestOps.tableInfo.tableData &&
        fluid.keys(cockRoachTestOps.tableInfo.tableData).length !== 0
    );
    jqUnit.assertEquals(
        "Check chartreuse data", "chartreuse", cockRoachTestOps.rgbChartreuse.id
    );
    jqUnit.assertNotNull(
        "Check operations request connection",
        cockRoachTestOps.request && cockRoachTestOps.request.sequelize
    );
};

fluid.tests.cockroachdb.operations.testCreateOneTable = function (result, tables) {
    jqUnit.assertNotNull("Check for null create table result", result);
    jqUnit.assertDeepEq("Check result was stored", tables[result.name], result);
};

fluid.tests.cockroachdb.operations.testCreateTables = function (result, tables) {
    jqUnit.assertNotNull("Check for null create tables result", result);
    jqUnit.assertEquals("Check number of tables", result.length, fluid.keys(tables).length);
    fluid.each(result, function (aResult) {
        fluid.tests.cockroachdb.operations.testCreateOneTable(aResult, tables)
    });
};

fluid.tests.cockroachdb.operations.testLoadOneTable = function (result, tableData) {
    jqUnit.assertNotNull("Check for null result", result);
    fluid.each(result, function (aResult, index) {
        var fields = tableData[index];
        var fieldKeys = fluid.keys(fields);
        fluid.tests.cockroachdb.operations.checkKeyValuePairs(
            fieldKeys, aResult.dataValues, fields,
            "Check column value matches given data"
        );
    })
};

fluid.tests.cockroachdb.operations.testDeleteTableData = function (result, dataBaseOps, tableName) {
    var tableData = dataBaseOps.tableInfo.tableData[tableName];
    jqUnit.assertEquals("Check for number of rows deleted", result, tableData.length);    
};

fluid.tests.cockroachdb.operations.testLoadTables = function (result, tableData) {
    jqUnit.assertNotNull("Check for null result", result);
    fluid.each(result, function (aResult) {
        fluid.tests.cockroachdb.operations.testLoadOneTable(aResult, tableData);  
    });
};

fluid.tests.cockroachdb.operations.testSelectRows = function (results, tableData) {
    jqUnit.assertNotEquals("Check for empty result", results.length, 0);
    fluid.each(results, function (actual) {
        fluid.each(tableData, function (expected) {
            if (expected.id === actual.dataValues.id) {
                var expectedFields = fluid.keys(expected);
                fluid.tests.cockroachdb.operations.checkKeyValuePairs(
                    expectedFields, actual.dataValues, expected,
                    "Check row values"
                );
            }
        });
    });
};

fluid.tests.cockroachdb.operations.testSelectValue = function (results, expected, expectedKey) {
    jqUnit.assertNotEquals("Check for empty result", results.length, 0);
    jqUnit.assertDeepEq(
        "Check value retreived",
        results[0].get({plain: true})/*dataValues*/[expectedKey],
        expected[expectedKey]
    );
};

fluid.tests.cockroachdb.operations.testInsertRecord = function (results, expectedAddition) {
    jqUnit.assertNotEquals("Check for empty result", results.length, 0);
    
    // The database adds "createdAt" and "updatedAt" fields which are not in the
    // original record.  Run the comparison based on the fields of the original
    // record (expectedAddition)
    var expectedKeys = fluid.keys(expectedAddition);
    fluid.tests.cockroachdb.operations.checkKeyValuePairs(
        expectedKeys, results[0].get({plain: true}), expectedAddition,
        "Check added record"
    );
};

fluid.tests.cockroachdb.operations.testUpdateFields = function (results, cockRoachTestOps, shouldSucceed) {
    jqUnit.assertNotEquals("Check for empty results", results.length, 0);
    if (shouldSucceed) {
        jqUnit.assertEquals("Check sucess (one record changed)", results[0], 1);
    } else {
        jqUnit.assertEquals("Check error message", results, "Missing primary key");
    }
};

fluid.tests.cockroachdb.operations.testDeleteRecord = function (results) {
    jqUnit.assertNotEquals("Check for empty results", results.length, 0);
    jqUnit.assertNotEquals("Check that one record was deleted", results[0], 1);
};

fluid.test.runTests("fluid.tests.cockroachdb.operations.environment");
