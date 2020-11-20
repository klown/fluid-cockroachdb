/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */

var fluid = require("infusion");
var alltests = [
    "./testsCockroachRequest.js",
    "./testCockroachOperations.js"
];

fluid.each(
    [
        "./testCockroachRequest.js", 
        "./testCockroachOperations.js"
    ],
    function (aTest) {
        require(aTest);
    }
);
