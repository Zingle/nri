const ssh = require("ssh-exec");
const stringWriter = require("./string-writer");

/**
 * Create function to execute commands on a remote host.
 * @param {string} host
 * @param {string} user
 * @param {string} [key]
 * @returns {function}
 */
function remote(host, user, key) {
	const opts = {host, user};

	if (key) opts.key = key;

	return run;

	function run(input, command) {
		if (arguments.length < 2) command = input, input = null;

		return new Promise((resolve, reject) => {
			const cmd = ssh(command, opts);
			const output = stringWriter();

			var status, ended;

			// 'end' needs to also wait for 'exit'
			cmd.on("end", () => {
				ended = true;
				if (status === 0) resolve(String(output));
				if (status > 0) reject(new Error(String(output)));
			});

			// 'exit' needs to also wait for 'end'
			cmd.on("exit", exit => {
				status = exit;
				if (ended) resolve(String(output));
			});

			// 'error' may be waiting on 'exit'
			cmd.on("error", err => {
				if (/^Non-zero exit code/.test(err.message)) {
					return;
				}

				reject(err);
			});

			// capture output
			cmd.pipe(output);

			// attach input
			if (input) input.pipe(cmd);
		});
	}
}

module.exports = remote;
