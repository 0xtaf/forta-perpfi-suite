const ethers = require('ethers');

const {
  TransactionEvent,
  FindingType,
  FindingSeverity,
  Finding,
} = require('forta-agent');

// import the handler under test
const { handleTransaction, createAlert } = require('./ownership-change');

// import helper functions for loading the perp.fi contract addresses and abis
const common = require('../common');

// create constants to test the handler with
const contractName = 'ClearingHouse';
const clearingHouseAddress = (common.getAddressLayer2(contractName)).toLowerCase();
const clearingHouseAbi = common.getAbiLayer2(contractName, true);

const iface = new ethers.utils.Interface(clearingHouseAbi);

/**
 * TransactionEvent(type, network, transaction, receipt, traces, addresses, block)
 */
function createTxEvent({ logs, addresses }) {
  return new TransactionEvent(null, null, null, { logs }, [], addresses, null);
}

// tests
describe('ownership change event monitoring', () => {

  // logs data for test case: address match + topic match (should trigger a finding)
  const logsMatchEvent = [
    {
      address: clearingHouseAddress,
      topics: [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('OwnershipTransferred(address,address)')),
        ethers.constants.HashZero,
        ethers.constants.HashZero,
      ],
      name: 'OwnershipTransferred',
      data: `0x${'0'.repeat(64)}`,
      args: {
        newOwner: ethers.constants.AddressZero,
      },
    },
  ];

  // logs data for test case: address match + no topic match
  const logsNoMatchEvent = [
    {
      address: clearingHouseAddress,
      topics: [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Paused(address)')),
        ethers.constants.HashZero,
      ],
      data: `0x${'0'.repeat(64)}`,
    },
  ];

  // logs data for test case:  no address match
  const logsNoMatchAddress = [
    {
      address: ethers.constants.AddressZero,
    },
  ];

  describe('handleTransaction', () => {
    it('returns empty findings if contract address does not match', async () => {
      // build txEvent
      const txEvent = createTxEvent({
        logs: logsNoMatchAddress,
        addresses: { [ethers.constants.AddressZero]: true },
      });

      // run agent
      const findings = await handleTransaction(txEvent);

      // assertions
      expect(findings).toStrictEqual([]);
    });

    it('returns empty findings if contract address matches but not event', async () => {
      // build tx event
      const txEvent = createTxEvent({
        logs: logsNoMatchEvent,
        addresses: { [clearingHouseAddress]: true },
      });

      // run agent
      const findings = await handleTransaction(txEvent);

      // assertions
      expect(findings).toStrictEqual([]);
    });

    it('returns a finding if a target contract emits an event from its watchlist', async () => {
      const eventName = 'OwnershipTransferred';
      const contractName = 'ClearingHouse';
      const contractAddress = clearingHouseAddress;

      // build txEvent
      const txEvent = createTxEvent({
        logs: logsMatchEvent,
        addresses: { [clearingHouseAddress]: true },
      });

      // run agent
      const findings = await handleTransaction(txEvent);

      // create expected finding
      const log = logsMatchEvent[0];
      const expectedFinding = createAlert(log, eventName, contractName, contractAddress);

      // assertions
      expect(findings).toStrictEqual([expectedFinding]);

    });
  });
});
