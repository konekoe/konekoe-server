const helpers = require("./helpers.js");
//-------------------------------------------Helpers-------------------------------------


//------------------------------------Handlers---------------------------------------

async function change_selection({ selection }) {
  try {
    this.emit("change_logger", selection)
    
    const log = await helpers.readLog(selection);

    return { log };
  }
  catch (err) {
    return Promise.reject(err);
  }
};


module.exports = {
  change_selection,
}
