const ethers = require('ethers');

const {
  Finding, FindingSeverity, FindingType, getJsonRpcUrl,
} = require('forta-agent');

// load agent configuration parameters
const { perpfiEverestId: PERPFI_EVEREST_ID } = require('../../agent-config.json');

// set up an ethers provider to retrieve pending blocks
const provider = new ethers.providers.JsonRpcProvider(getJsonRpcUrl());

// helper function to create alerts
function createAlert(address, balance, pctChange) {
  return Finding.fromObject({
    name: 'Perp.Fi USDC Balance Change',
    description: `The USDC balance of address ${address} changed by ${pctChange} in one minute`,
    alertId: 'AE-PERPFI-USDC-BALANCE-CHANGE',
    protocol: 'Perp.Fi',
    severity: FindingSeverity.Medium,
    type: FindingType.Suspicious,
    everestId: PERPFI_EVEREST_ID,
    metadata: {
      address,
      balance,
      pctChange,
    },
  });
}

module.exports = {
  provider,
  createAlert,
};
