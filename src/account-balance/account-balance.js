const BigNumber = require('bignumber.js');
const ethers = require('ethers');
const {
  getJsonRpcUrl, Finding, FindingSeverity, FindingType,
} = require('forta-agent');

const accountAddressesData = require('../../account-addresses.json');
const config = require('../../agent-config.json');

// Stores information about each account
const initializeData = {};

// Initializes data required for handler
function provideInitialize(data) {
  return async function initialize() {
    /* eslint-disable no-param-reassign */
    // assign configurable fields
    data.accountThresholds = config.accountBalance.accountThresholds;
    data.alertMinimumIntervalSeconds = config.accountBalance.alertMinimumIntervalSeconds;
    data.everestId = config.PERPFI_EVEREST_ID;

    data.accountAddresses = accountAddressesData;
    data.accountNames = Object.keys(data.accountThresholds);
    data.provider = new ethers.providers.JsonRpcProvider(getJsonRpcUrl());

    // initialize the start time and number of alerts since last finding for each account to 0
    data.startTime = 0;
    data.numAlertsSinceLastFinding = {};
    Object.values(data.accountAddresses).forEach((address) => {
      data.numAlertsSinceLastFinding[address] = 0;
    });
    /* eslint-enable no-param-reassign */
  };
}

// helper function to create alerts
function createAlert(accountName, accountBalance, thresholdEth, everestId, numAlerts) {
  const threshold = ethers.utils.parseEther(thresholdEth.toString());
  return Finding.fromObject({
    name: 'Perp.Fi Low Account Balance',
    description: `The ${accountName} account has a balance below ${thresholdEth} ETH`,
    alertId: 'AE-PERPFI-LOW-ACCOUNT-BALANCE',
    severity: FindingSeverity.Critical,
    type: FindingType.Degraded,
    protocol: 'Perp.Fi',
    everestId,
    metadata: {
      accountName,
      accountBalance: accountBalance.toString(),
      threshold: threshold.toString(),
      numAlertsSinceLastFinding: numAlerts.toString(),
    },
  });
}

function provideHandleBlock(data) {
  return async function handleBlock(blockEvent) {
    // upon the mining of a new block, check the specified accounts to make sure the balance of
    // each account has not fallen below the specified threshold
    const findings = [];
    const {
      accountThresholds, accountAddresses, accountNames, provider, everestId,
    } = data;
    if (!accountThresholds) {
      throw new Error('handleBlock called before initialization');
    }

    // get the block timestamp
    const blockTimestamp = new BigNumber(blockEvent.block.timestamp);
    let minTimeElapsed = false;

    await Promise.all(accountNames.map(async (accountName) => {
      const accountBalance = await provider.getBalance(accountAddresses[accountName]);

      /* eslint-disable no-param-reassign */
      // If balance < threshold add an alert to the findings
      if (accountBalance < (accountThresholds[accountName] * 1000000000000000000)) {
        // if less than the specified number of hours has elapsed, just increment the counter for
        // the number of alerts that would have been generated
        if (blockTimestamp.minus(data.startTime) < data.alertMinimumIntervalSeconds) {
          data.numAlertsSinceLastFinding[accountName] += 1;
        } else {
          minTimeElapsed = true;

          findings.push(createAlert(
            accountName,
            accountBalance,
            accountThresholds[accountName],
            everestId,
            data.numAlertsSinceLastFinding,
          ));

          // restart the alert counter
          data.numAlertsSinceLastFinding[accountName] = 0;
        }
      }
    }));

    if (minTimeElapsed) {
      data.startTime = new BigNumber(blockTimestamp.toString());
    }
    /* eslint-enable no-param-reassign */

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
