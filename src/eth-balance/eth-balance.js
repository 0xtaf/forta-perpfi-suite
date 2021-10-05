const ethers = require('ethers');
const { getJsonRpcUrl, Finding, FindingSeverity, FindingType } = require('forta-agent');

// load required shared types
const accounts = require('./accounts.json');

// get account names
const accountNames = Object.keys(accounts);

// set up RPC provider
const provider = new ethers.providers.JsonRpcProvider(getJsonRpcUrl());

// helper function to create alerts
function createAlert(accountName, accountBalance, threshold) {
    return Finding.fromObject({
      name: 'Perp.Fi Account Balance Event',
      description: `The ${accountName} has a balance below ${threshold}`,
      alertId: 'AE-PERPFI-ACCOUNT-BALANCE-EVENT',
      severity: FindingSeverity.Low,
      type: FindingType.Suspicious,
        protocol: 'Perp.Fi',
      metadata: {
        accountName,
        accountBalance,
        threshold
      },
    });
  }

function provideHandleBlock(providerObject) {
  return async function handleBlock(blockEvent) {
    const findings = [];
    console.log('--------------------------------------------------------');
    console.log('providerObject: ' + providerObject);

    await Promise.all(accountNames.map(async (accountName) => {
      const accountBalance = await providerObject.getBalance(accounts[accountName].address);
      console.log(accountName + " balance: " + accountBalance + " threshold: " + accounts[accountName].threshold);
      console.log('--------------------------------------------------------');

      // If balance < threshold add an alert to the findings
      if (accountBalance < accounts[accountName].threshold) {
        // Alert on each item in parsedLogs
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
  handleBlock: provideHandleBlock(provider),
};
