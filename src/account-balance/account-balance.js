const ethers = require('ethers');
const {
  getJsonRpcUrl, Finding, FindingSeverity, FindingType,
} = require('forta-agent');

const accountData = require('./account-balance.json');

// Stores information about each account
const initializeData = {};

// Initializes data required for handler
function provideInitialize(data) {
  return async function initialize() {
    const accounts = accountData;
    const accountNames = Object.keys(accounts);
    const provider = new ethers.providers.JsonRpcProvider(getJsonRpcUrl());

    /* eslint-disable no-param-reassign */
    data.accounts = accounts;
    data.accountNames = accountNames;
    data.provider = provider;
    /* eslint-enable no-param-reassign */
  };
}

// helper function to create alerts
function createAlert(accountName, accountBalance, thresholdEth) {
  const threshold = thresholdEth * 1000000000000000000;
  return Finding.fromObject({
    name: 'Perp.Fi Low Account Balance',
    description: `The ${accountName} account has a balance below ${thresholdEth} ETH`,
    alertId: 'AE-PERPFI-LOW-ACCOUNT-BALANCE',
    severity: FindingSeverity.Medium,
    type: FindingType.Degraded,
    protocol: 'Perp.Fi',
    metadata: {
      accountName,
      accountBalance,
      threshold,
    },
  });
}

function provideHandleBlock(data) {
  return async function handleBlock() {
    const findings = [];
    const { accounts, accountNames, provider } = data;
    if (!accounts) throw new Error('handleBlock called before initialization');

    await Promise.all(accountNames.map(async (accountName) => {
      const accountBalance = await provider.getBalance(accounts[accountName].address);

      // If balance < threshold add an alert to the findings
      if (accountBalance < (accounts[accountName].threshold * 1000000000000000000)) {
        findings.push(createAlert(accountName, accountBalance, accounts[accountName].threshold));
      }
    }));

    return findings;
  };
}

// exports
module.exports = {
  createAlert,
  provideHandleBlock,
  handleBlock: provideHandleBlock(initializeData),
  provideInitialize,
  initialize: provideInitialize(initializeData),
};
