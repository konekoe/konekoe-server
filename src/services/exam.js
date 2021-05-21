const { Exam, Config } = process.examDb.models;

const getExam = async (examCode) => Exam.findOne({ examCode })
      .populate("config")
      .exec();

const startExam = async (examCode, ip, port) => {
  try {

    const exam = await getExam(examCode);

    if (!exam)
      return Promise.reject(Error("No exam found!"));

    if (exam.active)
      return Promise.reject(Error("Exam is already active!"));

    exam.active = true;
    exam.ip = ip;
    exam.wsPort = port;

    const doc = await exam.save();

    process.READY_TO_EXIT.update("examStart", true);


    return [doc, Config.watch()]; 
  }
  catch (err) {
    return Promise.reject(err);
  }
};

const endExam = async (examCode) => {
  try {
    const exam = await Exam.findOne({ examCode }).exec();

    exam.active = false;

    await exam.save();
    return;
  }
  catch (err) {
    return Promise.reject(err);
  }
};

module.exports = {
  startExam,
  endExam,
  getExam
}
