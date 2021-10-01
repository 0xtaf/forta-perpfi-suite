const ethers = require('ethers');
const { getJsonRpcUrl } = require('forta-agent');

// load required shared types
const accounts = require('./accounts.json');

// get account names
const accountNames = Object.keys(accounts);

// set up RPC provider
const provider = new ethers.providers.JsonRpcProvider(getJsonRpcUrl());

// helper function to create alerts
function createAlert(accountName, accountBalance) {
    return Finding.fromObject({
      name: 'Perp.Fi Account Balance Event',
      description: `The ${accountName} has a balance below ${accountBalance}`,
      alertId: 'AE-PERPFI-ACCOUNT-BALANCE-EVENT',
      type: FindingType[eventType],  // What should this be?
      severity: FindingSeverity.Low,
      type: FindingType.Suspicious,
        protocol: 'Perp.Fi',
      metadata: {
        accountName,
        accountBalance,
      },
    });
  }

function provideHandleBlock(blockEvent) {

  return async function handleBlock(blockEvent) {
    const findings = [];

    await Promise.all(accountNames.map(async (accountName) => {
        const accountBalance = await provider.getBalance(accounts[accountName].address);
        console.log(accountName + " balance: " + accountBalance + " threshold: " + accounts[accountName].threshold);

        // If balance < threshold add an alert to the findings
        if (accountBalance < accounts[accountName].threshold) {

        }
    }));

     return findings;
  };
}

// exports
module.exports = {
  provideHandleBlock,
  handleBlock: provideHandleBlock(),  
};
