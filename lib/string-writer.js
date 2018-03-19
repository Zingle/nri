const {assign} = Object;
const {Writable} = require("stream");

/**
 * Create Writable stream that evaluates to the concatenated data written to
 * the stream when cast to a string.
 * @returns {Writable|string}
 */
function stringWriter() {
    var value = "";

    return assign(new Writable({write(s, _, cb) {value += s; cb();}}), {
        toString: () => value
    });
}

module.exports = stringWriter;