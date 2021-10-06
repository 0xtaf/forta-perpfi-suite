const ethers = require('ethers');

const {
  Finding, FindingSeverity, FindingType, getJsonRpcUrl,
} = require('forta-agent');

// load agent configuration parameters
const { perpfiEverestId: PERPFI_EVEREST_ID } = require('../../agent-config.json');

// set up an ethers provider to retrieve pending blocks
const provider = new ethers.providers.JsonRpcProvider(getJsonRpcUrl());

// helper function to create alerts
function createAlert(accountName, accountAddress, numPending) {
  return Finding.fromObject({
    name: 'Perp.Fi High Pending Transaction Count',
    description: `The ${accountName} had ${numPending} pending transactions in one minute`,
    alertId: 'AE-PERPFI-HIGH-PENDING-TX',
    protocol: 'Perp.Fi',
    severity: FindingSeverity.Low,
    type: FindingType.Degraded,
    everestId: PERPFI_EVEREST_ID,
    metadata: {
      accountName,
      accountAddress,
      numPending,
    },
  });
}

module.exports = {
  provider,
  createAlert,
};
