const synthetics = require("Synthetics");

const canary = async function () {
  await synthetics.executeHttpStep(
    "Verify API returns successful response",
    process.env.API_ENDPOINT
  );
};

exports.handler = async () => {
  return await canary();
};
