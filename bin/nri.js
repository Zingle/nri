#!/usr/bin/env node

const {assign} = Object;
const {realpath} = require("fs");
const {pack: tar} = require("tar-pack");
const ssh = require("ssh-exec");
const readpkg = require("fstream-npm");
const config = require("../lib/config");
const stringWriter = require("../lib/string-writer");

const {node, script, path, host, user, key} = config.argv(process.argv);
const sshopts = {host, user, key};

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
        if (!sshopts.key) resolve(sshopts.key);
        else realpath(sshopts.key, (err, path) => {
            if (!err) sshopts.key = path;
            resolve(sshopts.key);
        });
    });
}

function makeInstallDir() {
    console.info("creating remote working directory");

    return new Promise((resolve, reject) => {
        const output = stringWriter();
        const cmd = ssh("mktemp -d", sshopts);

        cmd.pipe(output);
        cmd.on("error", reject);
        cmd.on("exit", code => {
            if (code) reject(new Error("could not create install dir"));
            else resolve(String(output).trim());
        });
    });
}

function copyPackage(local, remote) {
    console.info(`copying ${local} to ${host}:${remote}`);

    return new Promise((resolve, reject) => {
        const tarball = tar(readpkg(local));
        const cmd = ssh(`cd ${remote} && tar xz 2>&1`, sshopts);

        cmd.pipe(process.stdout);
        cmd.on("error", reject);
        cmd.on("exit", code => {
            if (code) reject(new Error(`could not copy package`));
            else resolve(remote);
        });

        tarball.pipe(cmd);
    });
}

function install(remote) {
    console.info(`running installer from ${remote} on ${host}`);

    return new Promise((resolve, reject) => {
        const path = `${remote}/package`;
        const cmd = ssh(`sudo -H npm --prefix ${path} install -g 2>&1`, sshopts);

        cmd.pipe(process.stdout);
        cmd.on("error", reject);
        cmd.on("exit", code => {
            if (code) reject(new Error("could not install package"));
            else resolve(remote);
        });
    });
}

function clean(remote) {
    console.info(`cleaning up ${host}:${remote}`);

    return new Promise((resolve, reject) => {
        const cmd = ssh(`rm -fr ${remote}`, sshopts);

        cmd.on("error", reject);
        cmd.on("exit", code => {
            if (code) reject(new Error("could not cleanup install dir"));
            else resolve(remote);
        });
    });
}
