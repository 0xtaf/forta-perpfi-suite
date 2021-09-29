// import handlers
//const exampleHandler = require('./path/to/example-handler');

const handleTransaction = async (txEvent) => {
  const findings = (
    await Promise.all([
      // add handleTransaction from handlers
      // exampleHandler.handleTransaction(txEvent),
    ])
  ).flat();
  return findings;
};

module.exports = {
  handleTransaction,
};
