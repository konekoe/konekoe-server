const { readFile } = require("fs").promises;
const { join } = require("path");

const readLog = async (target) => {

    const date = new Date();

    const formatDateDigits = (digit) => {
      let str = String(digit);

      if (str.length > 1)
        return str;

      return 0 + str;

    };

    let filename = join(__dirname, "../../../log",
    (target) ?
    `${ target }/konekoe-student.log`
    :
    `konekoe-server-${ formatDateDigits(date.getDate()) }-${ formatDateDigits(date.getMonth() + 1) }-${ date.getFullYear() }.log`
    )

    try {
      const data = await readFile(filename, "utf8");

      //reverse the ordering of the lines.
      return data.split("\n").reverse().join("\n");
    }
    catch(err) {
      return Promise.reject(err);
    }
};

module.exports = {
  readLog
};