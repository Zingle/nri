const {basename} = require("path");

/**
 * Show usage.
 * @param {string} script
 * @param {number} [exit]
 */
function usage(script, exit) {
	script = basename(script, ".js");

	console.log("Usage:");
	console.log(`  ${script} [--user=<user>] [--key=<key>] <path> <host>`);
	console.log(`  ${script} --help`);
	console.log();
	console.log("Install a local npm package to a remote host.");
	console.log();
	console.log("OPTIONS");
	console.log();
    console.log("     --help        Show this help.");
	console.log("  -u,--user=<user> Connect to host with specified user.");
	console.log("  -i,--key=<key>   Connect to host with specified key.");

	if (typeof exit === "number") process.exit(exit);
}

module.exports = usage;
