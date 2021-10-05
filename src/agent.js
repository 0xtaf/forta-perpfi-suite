const ownershipChange = require('./ownership-change/ownership-change');
const ethBalance = require('./eth-balance/eth-balance');

const handleBlock = async (blockEvent) => {
  const findings = (
    await Promise.all([
      ethBalance.handleBlock(blockEvent),
    ])
  ).flat();
  return findings;
};

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
  handleBlock,
  handleTransaction,
};
