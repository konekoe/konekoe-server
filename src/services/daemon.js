const examModels = process.examDb.models;
const { AuthKey } = process.authKeyDb.models;

const findConfig = (examCode) => examModels.Config.findOne({ examCode }).exec();

const findStudent = (studentId) => examModels.Student.findOne({ studentId }).exec();

const getAuthKey = async (student, exam) => {
  try {
    let result = await AuthKey.findOne({ student, exam }).exec();

    if (!result) {
      result = new AuthKey({ student, exam });
      result = await result.save();
    }

    return result;
  }
  catch (err) {
    return Promise.reject(err);
  }
  
};

const findFile = (_id) => examModels.File.findById(_id).exec();

const createExamFile = async (info, exam, student, fileType) => {
  const newFile = new examModels.File(info);
    const newExamFile = new examModels.ExamFile({ file: newFile._id, exam: exam });

    try {

      student[fileType].push(newExamFile._id);

      await newFile.save();
      await newExamFile.save();
      await student.save();

      return;
    }
    catch (err) {
      examModels.File.deleteOne({ _id: newFile._id });
      examModels.ExamFile.deleteOne({ _id: newExamFile._id });

      return Promise.reject(err);
    }
};

const recordUrl = async (student, exam, url) => {
  try {
    let newUrl = new examModels.ExamUrl({ exam, url });
    newUrl = await newUrl.save();

    student.urls = (student.urls || []).concat(newUrl._id);

    await student.save();
  }
  catch (err) {
    return Promise.reject(err);
  }
};

module.exports = {
  findConfig,
  findStudent,
  findFile,
  getAuthKey,
  createExamFile,
  recordUrl
}
