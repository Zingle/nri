#!/usr/bin/env node

const {assign} = Object;
const {realpath} = require("fs");
const {pack: tar} = require("tar-pack");
const readpkg = require("fstream-npm");
const config = require("../lib/config");
const remote = require("../lib/remote");

const {node, script, path, host, user, key} = config.argv(process.argv);

var ssh;

resolveKey()
    .then(makeInstallDir)
    .then(installDir => copyPackage(path, installDir))
    .then(install)
    .then(clean)
    .catch(err => {
        console.error(process.env.DEBUG ? err.stack : err.message);
        process.exit(1);
    });

function resolveKey() {
    return new Promise((resolve, reject) => {
        if (key) realpath(key, (err, path) => {
            ssh = err ? remote(host, user) : remote(host, user, path);
            resolve(path);
        }); else {
            ssh = remote(host, user);
            resolve(key);
        }
    });
}

function makeInstallDir() {
    console.info("creating remote working directory");
    return ssh("mktemp -d").then(output => output.trim());
}

function copyPackage(local, remote) {
    console.info(`copying ${local} to ${host}:${remote}`);
    const tarball = tar(readpkg(local));
    return ssh(tarball, `cd ${remote} && tar xz 2>&1`).then(() => remote);
}

function install(remote) {
    console.info(`running installer from ${remote} on ${host}`);
    return ssh(`sudo -H npm install -g --prefix ${path} 2>&1`)
        .then(() => remote);
}

function clean(remote) {
    console.info(`cleaning up ${host}:${remote}`);
    return ssh(`rm -rf ${remote}`);
}
