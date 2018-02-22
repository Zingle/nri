#!/usr/bin/env node

const {assign} = Object;
const {realpath} = require("fs");
const {basename} = require("path");
const {userInfo} = require("os");
const {Writable} = require("stream");
const {pack: tar} = require("tar-pack");
const ssh = require("ssh-exec");
const readpkg = require("fstream-npm");

const user = userInfo().username;
const [node, script, path, host] = process.argv;

if (!path) usage(new Error("project path required"));
if (!host) usage(new Error("remote SSH host required"));

makeInstallDir()
    .then(installDir => copyPackage(path, installDir))
    .then(install)
    .then(clean)
    .catch(fail);

function makeInstallDir() {
    console.info("creating remote working directory");

    return new Promise((resolve, reject) => {
        const output = stringWriter();
        const cmd = ssh("mktemp -d", {user, host});

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
        const cmd = ssh(`cd ${remote} && tar xz 2>&1`, {user, host});

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
        const cmd = ssh(`cd ${path} && sudo -H npm install -g 2>&1`, {user, host});

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
        const cmd = ssh(`rm -fr ${remote}`, {user, host});

        cmd.on("error", reject);
        cmd.on("exit", code => {
            if (code) reject(new Error("could not cleanup install dir"));
            else resolve(remote);
        });
    });
}

function usage(err) {
    const name = basename(script, ".js");
    console.log(`Usage: ${name} <pkg-path> <host>`);
    if (err) fail(err);
}

function fail(err) {
    console.error(process.env.DEBUG ? err.stack : err.message);
    process.exit(1);
}

function stringWriter() {
    var value = "";

    return assign(new Writable({write(s, _, cb) {value += s; cb();}}), {
        toString: () => value
    });
}
