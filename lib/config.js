const {assign} = Object;
const {userInfo} = require("os");
const CLI = require("qwcli");
const usage = require("./usage");

/**
 * Create config from command-line arguments.
 * @param {string[]} argv
 * @returns {object}
 */
function argv(argv) {
	const options = defaults();
	const cli = CLI();

	cli.bind(CLI.head, (node, script) => assign(options, {node, script}));
	cli.bind(CLI.lead, (path, host) => assign(options, {path, host}));
	cli.bind(["-i", "--key"], key => assign(options, {key}));
	cli.bind(["-u", "--user"], user => assign(options, {user}));
	cli.bind(["-h", "--help"], () => usage(options.script, 0));
	
	const parse = cli.parser();

	try {
		argv = parse(argv);
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}

	if (argv.length) {
		console.error(`unexpected argument ${argv[0]}`);
		console.error(options);
		process.exit(1);
	}

	return options;
}

/**
 * Create default configuration.
 * @returns {object}
 */
function defaults() {
	const node = "node";
	const script = "nri.js";
	const path = process.cwd();
	const host = undefined;
	const user = userInfo().username;
	const key = undefined;

	return {node, script, path, host, user, key};
}

module.exports = {argv, defaults};