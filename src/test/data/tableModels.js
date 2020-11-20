/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
"use strict"

var fluid = require("infusion");
var DataTypes = require('sequelize-cockroachdb').DataTypes;  // SQL data types

fluid.each(
    // Array of table/model definitions
    [{
        modelName: "rgb",
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true },
            "color": { "type": DataTypes.STRING(36) },
            "colourMap": { "type": DataTypes.JSONB }
        }
    },
    {
        modelName: "roster.preferenceset",
        "fields": {
            "name": { "type": DataTypes.STRING(64), "primaryKey": true },
            "description": { "type": DataTypes.STRING(64) },
            "prefs_json": { "type": DataTypes.JSONB }                
        }
    },
    {
        modelName: "massive",
        fields: {
            "text": { "type": DataTypes.TEXT }
        }
    },
    {
        modelName: "users",
        fields: {
            "id": { "type": DataTypes.STRING(64), "primaryKey": true },
            "rev": { "type": DataTypes.STRING(64) },
            "password_scheme": { "type": DataTypes.STRING(64) },
            "iterations": { "type": DataTypes.INTEGER },
            "username": { "type": DataTypes.STRING(64) },
            "type": { "type": DataTypes.STRING(16) },
            "name": { "type": DataTypes.STRING(16) },
            "email": { "type": DataTypes.STRING(32) },
            "roles": { "type": DataTypes.ARRAY(DataTypes.STRING(16)) },
            "signupTimestamp": { "type": DataTypes.DATE },
            "failedLoginAttempts": { "type": DataTypes.INTEGER },
            "derived_key": { "type": DataTypes.STRING },
            "salt": { "type": DataTypes.STRING },
            "emailVerificationTimestamp": { "type": DataTypes.DATE },
            "verified": { "type": DataTypes.BOOLEAN }
        }
    },
    {
        modelName: "nodata",
        fields: {}
    }],
    // For each model definition (above), export a function that defines the
    // the table model for cockroachdb/sequelize.
    function (aModelDef) {
        module.exports[aModelDef.modelName+"TableModel"] = function (sequelize) {
            var tableModel = {};
            tableModel.modelName = aModelDef.modelName;
            // Freezing the name inhibits pluralizing in the database.
            tableModel.model = sequelize.define(
                aModelDef.modelName, aModelDef.fields, {freezeTableName: true}
            );
            return tableModel;
        };
    }
);
