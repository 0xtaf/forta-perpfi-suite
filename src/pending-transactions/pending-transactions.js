const {
  provider: jsonRpcProvider,
  createAlert,
} = require('./agent-setup');

// load agent specific constants
const {
  nanosecondsPerSecond,
  timeWindowSeconds,
  txThreshold: TX_THRESHOLD,
} = require('./pending-transactions.json');

// convert value to BigInt type
const NANOSECONDS_PER_SECOND = BigInt(nanosecondsPerSecond);
const TIME_WINDOW_SECONDS = BigInt(timeWindowSeconds);

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

// initialize the Array of pending transactions
const pendingTransactions = [];

let blockTimestamp = 0;

// reset the start time value to correctly calculate time offsets between block timestamps
// NOTE: use process.hrtime.bigint to ensure monotonically increasing timestamps
let startTime = process.hrtime.bigint();

function provideHandleBlock(provider) {
  // register a function with the ethers provider to count pending transactions as they occur
  provider.on('pending', (tx) => {
    // this function will execute whenever the JSON-RPC provider sends a pending transaction
    if (blockTimestamp !== 0) {
      const deltaTime = (process.hrtime.bigint() - startTime) / NANOSECONDS_PER_SECOND;
      pendingTransactions.push({
        timestamp: blockTimestamp + deltaTime,
        hash: tx.hash,
        from: tx.from,
      });
    }
  });

  return async function handleBlock(blockEvent) {
    const findings = [];

    // get the Array of transaction hashes that were processed as part of this block
    // these transaction hashes will be checked against our Array of pending transactions to remove
    // any that have been successfully processed
    const { transactions } = blockEvent.block;

    // update the timestamp with each block that arrives
    // the block timestamp will be set with each new blockEvent
    // to obtain better time resolution than the block timestamp (which is only expected to be
    // updated every 15 seconds or so), a local start time will be set when each blockEvent occurs
    // that local start time value will then be used to calculate a time offset after each block
    // timestamp whenever a pending transaction occurs
    blockTimestamp = BigInt(blockEvent.block.timestamp);
    startTime = process.hrtime.bigint();

    // iterate over the stored pending transactions
    let numTransactionsProcessed = 0;
    pendingTransactions.forEach((transaction) => {
      (Object.keys(accountPendingTx)).forEach((address) => {
        // is this transaction from an address of interest?
        if (transaction.from === address) {
          // add the transaction timestamp to the appropriate Array
          accountPendingTx[address].transactions.push({
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
      pendingTransactions.shift();
    }

    // filter out any transactions that were processed in the current block
    (Object.keys(accountPendingTx)).forEach((address) => {
      accountPendingTx[address].transactions = accountPendingTx[address].transactions.filter(
        (tx) => transactions.indexOf(tx.hash) === -1,
      );
    });

    // iterate over stored pending transactions to count how many have occurred in the specified
    // duration
    (Object.keys(accountPendingTx)).forEach((address) => {
      while (accountPendingTx[address].transactions.length > 0) {
        const { timestamp } = accountPendingTx[address].transactions[0];
        const accountName = accountPendingTx[address].name;

        if (timestamp < (blockTimestamp - TIME_WINDOW_SECONDS)) {
          // the timestamp is outside the window, remove the transaction
          accountPendingTx[address].transactions.pop();
        } else {
          // check the number of pending transactions
          // if it is over our threshold, create an alert and add it to the findings Array
          const numPending = accountPendingTx[address].transactions.length;

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
  accountPendingTx,
  pendingTransactions,
  provideHandleBlock,
  handleBlock: provideHandleBlock(jsonRpcProvider),
};
