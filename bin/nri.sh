#!/bin/bash -e

if test $# -eq 0; then
    echo missing local package directory >&2
    exit 1
elif test $# -eq 1; then
    echo missing remote host >&2
    exit 1
fi

declare pkgdir=$(realpath "$1");    shift
declare host remote pkg
declare tmpdir=$(mktemp -d);        trap "rm -rf $tmpdir" EXIT

echo "bundling package"
pkg=$(cd $tmpdir; npm pack $pkgdir | tail -n1)

for host in "$@"; do
    echo "creating remote working directory on $host"
    remote=$(ssh $host mktemp -d)

    echo "copying bundle to $host:$remote"
    scp $tmpdir/$pkg $host:$remote >/dev/null

    echo "running installer from $host:$remote"
    ssh $host sudo -H npm install -g $remote/$pkg >/dev/null

    echo "cleaning up files on $host:$remote"
    ssh $host rm -fr $remote
done

echo "finished installing to $# hosts"
