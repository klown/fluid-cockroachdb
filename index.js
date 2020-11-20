/* eslint-env node */
"use strict";
var fluid = require("infusion");

fluid.module.register("fluid-cockroachdb", __dirname, require);

require("./src/js/cockroachdbOperations");

fluid.registerNamespace("fluid.cockroachdb");
