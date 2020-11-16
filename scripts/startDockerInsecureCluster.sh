#!/bin/sh

# Copyright 2020 OCAD University
#
# Licensed under the New BSD license. You may not use this file except in
# compliance with this License.
#
# You may obtain a copy of the License at
# https://github.com/GPII/universal/blob/master/LICENSE.txt

# Starts up an insecure cockroach database using a docker image: a cluster of three nodes
# A prerequisite is the cockroachDB docker image.  If it is not present, it is
# downloaded (pulled) from dockerhub.
#
# Note the docker image is preset to use these ports:
# - 26257/tcp for accessing the database
# - 8080/tcp for the web-based admin viewer

# Use command line arguments.  Assumes ALL or NONE are provided.
if [ $# != '0' ]
then
    CONTAINER_LABEL="$1"
    COCKROACHDB_LISTEN_PORT=$2
    COCKROACHDB_ADMIN_PORT=$3
    COCKROACH_MAIN_CONTAINER="$4"
    COCKROACH_USER=$5
    COCKROACHDB_IMAGE="$6"
fi

# Default values
COCKROACH_MAIN_CONTAINER=${COCKROACH_MAIN_CONTAINER:-"cockroachdb"}
CONTAINER_LABEL=${CONTAINER_LABEL:-"$COCKROACH_MAIN_CONTAINER-foo"}
COCKROACHDB_LISTEN_PORT=${COCKROACHDB_LISTEN_PORT:-26257}
COCKROACHDB_ADMIN_PORT=${COCKROACHDB_ADMIN_PORT:-8080}
COCKROACHDB_IMAGE=${COCKROACHDB_IMAGE:-"cockroachdb/cockroach:v20.1.7"}
COCKROACH_USER=${COCKROACH_USER:-"maxroach"}

log() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log "CONTAINER_LABEL: $CONTAINER_LABEL"
log "COCKROACHDB_LISTEN_PORT: $COCKROACHDB_LISTEN_PORT"
log "COCKROACHDB_ADMIN_PORT: $COCKROACHDB_ADMIN_PORT"
log "COCKROACH_MAIN_CONTAINER: $COCKROACH_MAIN_CONTAINER"
log "COCKROACH_USER: $COCKROACH_USER"
log "COCKROACHDB_IMAGE: $COCKROACHDB_IMAGE"

docker network create -d bridge roachnet

log "STARTING cockroachdb cluster in docker containers ..."
docker run -d \
    --label="$CONTAINER_LABEL" \
    --name="$COCKROACH_MAIN_CONTAINER" \
    --hostname=roach1 \
    --net roachnet \
    -p $COCKROACHDB_LISTEN_PORT:$COCKROACHDB_LISTEN_PORT -p $COCKROACHDB_ADMIN_PORT:$COCKROACHDB_ADMIN_PORT \
    -v "${PWD}/cockroach-data/roach1:/cockroach/cockroach-data" \
    $COCKROACHDB_IMAGE start --insecure --join=roach1,roach2,roach3

docker run -d \
    --name=roach2 \
    --hostname=roach2 \
    --net=roachnet \
    -v "${PWD}/cockroach-data/roach2:/cockroach/cockroach-data" \
    $COCKROACHDB_IMAGE start --insecure --join=roach1,roach2,roach3

docker run -d \
    --name=roach3 \
    --hostname=roach3 \
    --net=roachnet \
    -v "${PWD}/cockroach-data/roach3:/cockroach/cockroach-data" \
    $COCKROACHDB_IMAGE start --insecure --join=roach1,roach2,roach3

docker exec "$COCKROACH_MAIN_CONTAINER" ./cockroach init --insecure

log "Creating 'fluid_prefsdb' database ..."
docker exec -d "$COCKROACH_MAIN_CONTAINER" ./cockroach sql --insecure -e "
CREATE DATABASE fluid_prefsdb;
CREATE USER $COCKROACH_USER;
GRANT ALL ON DATABASE fluid_prefsdb TO $COCKROACH_USER;
"
