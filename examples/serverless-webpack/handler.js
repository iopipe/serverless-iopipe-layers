module.exports.handler = (event, context, callback) => {
  if (!context.iopipe || !context.iopipe.mark) {
    callback(new Error("No plugins"));
  }

  callback(null, 200);
};
