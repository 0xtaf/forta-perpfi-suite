const ethers = require('ethers');

const {
  Finding, FindingSeverity, FindingType, getJsonRpcUrl,
} = require('forta-agent');

// load agent configuration parameters
const { PERPFI_EVEREST_ID } = require('../../agent-config.json');

// load agent specific constants
const {
  nanosecondsPerSecond,
  timeWindowSeconds,
  txThreshold: TX_THRESHOLD,
} = require('./pending-transactions.json');

// convert value to BigInt type
const NANOSECONDS_PER_SECOND = BigInt(nanosecondsPerSecond);
const TIME_WINDOW_SECONDS = BigInt(timeWindowSeconds);

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

// initialization data Object
const initializeData = {};

function provideInitialize(data) {
  return async function initialize() {
    // load account addresses to monitor
    const accountAddresses = require('../../account-addresses.json');

    // initialize the object that will track pending transactions for the addresses of interest
    const accountPendingTx = {};
    (Object.keys(accountAddresses)).forEach((name) => {
      const address = accountAddresses[name];
      accountPendingTx[address] = {
        name,
        transactions: [],
      };
    });

    // store the accounts information in the data argument
    data.accountPendingTx = accountPendingTx;

    // initialize the Array of pending transactions
    data.pendingTransactions = [];

    // initialize the block timestamp
    data.blockTimestamp = 0;

    // reset the start time value to correctly calculate time offsets between block timestamps
    // NOTE: use process.hrtime.bigint to ensure monotonically increasing timestamps
    data.startTime = process.hrtime.bigint();

    // set up an ethers provider to retrieve pending blocks
    const provider = new ethers.providers.JsonRpcProvider(getJsonRpcUrl());

    // register a function with the ethers provider to count pending transactions as they occur
    provider.on('pending', (tx) => {
      // this function will execute whenever the JSON-RPC provider sends a pending transaction
      if (data.blockTimestamp !== 0) {
        const deltaTime = (process.hrtime.bigint() - data.startTime) / NANOSECONDS_PER_SECOND;
        data.pendingTransactions.push({
          timestamp: data.blockTimestamp + deltaTime,
          hash: tx.hash,
          from: tx.from,
        });
      }
    });
  };
}

function provideHandleBlock(data) {
  return async function handleBlock(blockEvent) {
    const findings = [];

    // get the Array of transaction hashes that were processed as part of this block
    // these transaction hashes will be checked against our Array of pending transactions to remove
    // any that have been successfully processed
    const { blockTxs } = blockEvent.block;

    // update the timestamp with each block that arrives
    // the block timestamp will be set with each new blockEvent
    // to obtain better time resolution than the block timestamp (which is only expected to be
    // updated every 15 seconds or so), a local start time will be set when each blockEvent occurs
    // that local start time value will then be used to calculate a time offset after each block
    // timestamp whenever a pending transaction occurs
    data.blockTimestamp = BigInt(blockEvent.block.timestamp);
    data.startTime = process.hrtime.bigint();

    // iterate over the stored pending transactions
    let numTransactionsProcessed = 0;
    data.pendingTransactions.forEach((transaction) => {
      (Object.keys(data.accountPendingTx)).forEach((address) => {
        // is this transaction from an address of interest?
        if (transaction.from === address) {
          // add the transaction timestamp to the appropriate Array
          data.accountPendingTx[address].transactions.push({
            timestamp: transaction.timestamp,
            hash: transaction.hash,
          });
        }
      });
      numTransactionsProcessed += 1;
    });

    // by this point, we have iterated over the Array of pending transactions and stored the ones
    // that are of interest.
    // now we will remove the pending transactions that we iterated over
    for (let i = 0; i < numTransactionsProcessed; i += 1) {
      data.pendingTransactions.shift();
    }

    // filter out any transactions that were processed in the current block
    (Object.keys(data.accountPendingTx)).forEach((address) => {
      const txs = data.accountPendingTx[address].transactions;
      data.accountPendingTx[address].transactions = txs.filter(
        (tx) => blockTxs.indexOf(tx.hash) === -1,
      );
    });

    // iterate over stored pending transactions to count how many have occurred in the specified
    // duration
    (Object.keys(data.accountPendingTx)).forEach((address) => {
      while (data.accountPendingTx[address].transactions.length > 0) {
        const { timestamp } = data.accountPendingTx[address].transactions[0];
        const accountName = data.accountPendingTx[address].name;

        if (timestamp < (data.blockTimestamp - TIME_WINDOW_SECONDS)) {
          // the timestamp is outside the window, remove the transaction
          data.accountPendingTx[address].transactions.pop();
        } else {
          // check the number of pending transactions
          // if it is over our threshold, create an alert and add it to the findings Array
          const numPending = data.accountPendingTx[address].transactions.length;

          if (numPending > TX_THRESHOLD) {
            findings.push(createAlert(accountName, address, numPending));
          }
          break;
        }
      }
    });
    return findings;
  };
}

module.exports = {
  provideHandleBlock,
  handleBlock: provideHandleBlock(initializeData),
  provideInitialize,
  initialize: provideInitialize(initializeData),
};
