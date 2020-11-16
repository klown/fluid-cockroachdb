#!/bin/sh

# Copyright 2019-2020 OCAD University
#
# Licensed under the New BSD license. You may not use this file except in
# compliance with this License.
#
# You may obtain a copy of the License at
# https://github.com/GPII/universal/blob/master/LICENSE.txt

# Shuts down the docker database cluster, removes the docker containers, shuts
# down the "roachnet" network, and removes the log files.

# Use any command line arguments
if [ $# != '0' ]
then
    COCKROACH_MAIN_CONTAINER="$1"
fi

# Default values
COCKROACH_MAIN_CONTAINER=${COCKROACH_MAIN_CONTAINER:-"cockroachdb"}

log() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log "Stopping the containers for the cockroachdb nodes.."
docker stop "$COCKROACH_MAIN_CONTAINER" roach2 roach3

log "Removing the containers..."
docker rm "$COCKROACH_MAIN_CONTAINER" roach2 roach3

log "Shutting down the cockroachdb network..."
docker network rm roachnet

log "Removing the log files".
rm -rf "${PWD}/cockroach-data"
