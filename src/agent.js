const ownershipChange = require('./ownership-change/ownership-change');

const handleTransaction = async (txEvent) => {
  const findings = (
    await Promise.all([
      ownershipChange.handleTransaction(txEvent),
    ])
  ).flat();
  return findings;
};

module.exports = {
  handleTransaction,
};
