const { createBlockEvent } = require('forta-agent');

// load agent specific constants
const {
  txThreshold: TX_THRESHOLD,
  timeWindowSeconds,
} = require('./pending-transactions.json');

const TIME_WINDOW_SECONDS = BigInt(timeWindowSeconds);

// initialize the variable that will serve as the callback passed to the 'provider.on' function
// within the provideHandleBlock() function
// by giving this variable module scope, each test will have the ability to modify the callback to
// inject data into pending transactions Array
let callbackFunction;

// mock the provider.on() function to imitate the JSON-RPC endpoint returning pending transactions
function mockProviderOn(blockTagString, callback) {
  callbackFunction = callback;
}

// load account addresses that will be monitored by the handler
const accountAddresses = require('../../account-addresses.json');

// now that the ethers.Provider constructor has been mocked, import the handler under test
const { 
  createAlert,
  provideHandleBlock,
  provideInitialize,
} = require('./pending-transactions');

describe('Perpetual Finance pending transaction agent', () => {
  let initialize;
  let handleBlock;
  let data;

  beforeEach(() => {
    data = {
      provider: {
        on: mockProviderOn,
      },
    };
  });

  describe('Pending transaction monitoring', () => {
    it('returns no findings for pending transactions received before first blockEvent', async () => {
      // initialize the data structure
      initialize = provideInitialize(data);
      await initialize();

      // create the handler, which will set the variable 'callbackFunction' to the callback that
      // 'provideHandleBlock' passes to provider.on()
      handleBlock = provideHandleBlock(data);

      // create and send a blockEvent to the handler to start its pending transaction processing
      const mockBlockEvent = createBlockEvent({
        block: {
          transactions: [],
          timestamp: 1,
        },
      });

      // attempt to add more pending transactions than the threshold
      for (let i = 0; i < (TX_THRESHOLD + 1); i++) {
        // call the callback function to add a pending transaction to the Array
        callbackFunction({
          hash: '0x'.concat(i.toString(16)),
          from: '0x'.concat(i.toString(16)),
        });
      }

      // handle the blockEvent
      const findings = await handleBlock(mockBlockEvent);

      // there should be no findings
      expect(findings).toStrictEqual([]);

      // there should be no pending transactions in the Array
      expect(data.pendingTransactions).toStrictEqual([]);
    });

    it('returns no findings if valid pending transactions occur outside time threshold', async () => {
      // initialize the data structure
      initialize = provideInitialize(data);
      await initialize();

      // create the handler
      handleBlock = provideHandleBlock(data);

      // create and send a blockEvent to initialize processing of pending transactions
      const blockTimestampFirst = 1;
      let mockBlockEvent = createBlockEvent({
        block: {
          transactions: [],
          timestamp: blockTimestampFirst,
        },
      });

      // handle the first blockEvent
      let findings = await handleBlock(mockBlockEvent);

      expect(findings).toStrictEqual([]);

      const mockAddress = accountAddresses.maker;
      const mockNumPendingTx = TX_THRESHOLD + 1;

      // now that the first blockEvent has been handled (with non-zero timestamp), the pending
      // transactions will added to the pendingTransactions Array
      for (let i = 0; i < mockNumPendingTx; i++) {
        // call the callback function to add a pending transaction to the Array
        // the transaction will have an address that we are monitoring
        callbackFunction({
          hash: '0x'.concat(i.toString(16)),
          from: mockAddress,
        });
      }

      // create another blockEvent with a timestamp that should cause all pending transactions to be
      // filtered out before the check for an alert
      const timeDelay = 5; // short delay so that all pending transactions were added without issue
      mockBlockEvent = createBlockEvent({
        block: {
          transactions: [],
          timestamp: TIME_WINDOW_SECONDS + BigInt(blockTimestampFirst) + BigInt(timeDelay),
        },
      });

      // handle the second blockEvent, which will trigger a check of the pending transactions and
      // create an alert
      findings = await handleBlock(mockBlockEvent);

      // assert the findings
      expect(findings).toStrictEqual([]);
    });

    it('returns findings for pending transactions that exceed the threshold within the time range', async () => {
      // initialize the data structure
      initialize = provideInitialize(data);
      await initialize();

      // create the handler
      handleBlock = provideHandleBlock(data);

      // create and send a blockEvent to initialize processing of pending transactions
      let mockBlockEvent = createBlockEvent({
        block: {
          transactions: [],
          timestamp: 1,
        },
      });

      // handle the first blockEvent
      let findings = await handleBlock(mockBlockEvent);

      expect(findings).toStrictEqual([]);

      const mockAddress = accountAddresses.maker;
      const mockNumPendingTx = TX_THRESHOLD + 1;
      const mockAccountName = 'maker';

      // now that the first blockEvent has been handled (with non-zero timestamp), the pending
      // transactions will added to the pendingTransactions Array
      for (let i = 0; i < mockNumPendingTx; i++) {
        // call the callback function to add a pending transaction to the Array
        // the transaction will have an address that we are monitoring
        callbackFunction({
          hash: '0x'.concat(i.toString(16)),
          from: mockAddress,
        });
      }

      // create another blockEvent that will trigger the alert
      mockBlockEvent = createBlockEvent({
        block: {
          transactions: [],
          timestamp: 2,
        },
      });

      // handle the second blockEvent, which will trigger a check of the pending transactions and
      // create an alert
      findings = await handleBlock(mockBlockEvent);

      // construct the expected finding Array (single finding)
      const expectedFinding = createAlert(mockAccountName, mockAddress, mockNumPendingTx);

      // assert the findings
      expect(findings).toStrictEqual([expectedFinding]);
    });

    it('returns no findings if the address is not in our Array of addresses', async () => {
      // initialize the data structure
      initialize = provideInitialize(data);
      await initialize();

      // create the handler
      handleBlock = provideHandleBlock(data);

      // create and send a blockEvent to initialize processing of pending transactions
      let mockBlockEvent = createBlockEvent({
        block: {
          transactions: [],
          timestamp: 1,
        },
      });

      // handle the first blockEvent
      let findings = await handleBlock(mockBlockEvent);

      expect(findings).toStrictEqual([]);

      const mockAddress = '0xFAKEADDRESS';
      const mockNumPendingTx = TX_THRESHOLD + 1;

      // now that the first blockEvent has been handled (with non-zero timestamp), the pending
      // transactions will added to the pendingTransactions Array
      for (let i = 0; i < mockNumPendingTx; i++) {
        // call the callback function to add a pending transaction to the Array
        // the transaction will have an address that we are monitoring
        callbackFunction({
          hash: '0x'.concat(i.toString(16)),
          from: mockAddress,
        });
      }

      // create another blockEvent that will trigger the alert
      mockBlockEvent = createBlockEvent({
        block: {
          transactions: [],
          timestamp: 2,
        },
      });

      // handle the second blockEvent, which will trigger a check of the pending transactions and
      // create an alert
      findings = await handleBlock(mockBlockEvent);

      // assert the findings
      expect(findings).toStrictEqual([]);
    });
  });
});
