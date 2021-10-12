const { Finding, FindingSeverity, FindingType } = require('forta-agent');

// load the module containing commonly used helper functions for Perpetual Finance
const common = require('../common');

// load any agent configuration parameters
const { perpfiEverestId } = require('../../agent-config.json');

// load the contract names that we would like to monitor
const contractNames = require('./contracts-to-monitor.json');

// set up a variable to hold initialization data used in the handler
const initializeData = {};

// helper function to create alerts
function createAlert(log, eventName, contractName, contractAddress) {
  // construct a metadata object to include in the finding
  const metadata = {
    contractName,
    contractAddress,
    eventName,
    newOwner: log.args.newOwner, // this will be present if the event is OwnershipTransferred
  };

  return Finding.fromObject({
    name: 'Perp.Fi Contract Ownership Change Event',
    description: `The ${eventName} event was emitted by the ${contractName} contract`,
    alertId: 'AE-PERPFI-OWNER-CHANGED-EVENT',
    protocol: 'Perp.Fi',
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
    everestId: perpfiEverestId,
    metadata,
  });
}

// helper function to filter logs based on contract addresses and event names
function filterAndParseLogs(logs, contractData) {
  // collect logs only from the contracts of interest
  const perpfiLogs = logs.filter((log) => log.address === contractData.address);

  // decode logs and filter on the ones we are interested in
  const parse = (log) => contractData.iface.parseLog(log);
  const filter = (log) => (log.name === 'OwnershipTransferred');
  const parsedLogs = perpfiLogs.map(parse).filter(filter);

  return parsedLogs;
}

function provideInitialize(data) {
  return async function initialize() {
    // load the contract addresses, abis, and ethers interfaces
    // eslint-disable-next-line no-param-reassign
    data.addressesAbis = common.getContractAddressesAbis(contractNames);
  };
}

function provideHandleTransaction(data) {
  return async function handleTransaction(txEvent) {
    const findings = [];

    const { logs } = txEvent;

    data.addressesAbis.forEach((contractData) => {
      const parsedLogs = filterAndParseLogs(logs, contractData);
      parsedLogs.forEach((log) => {
        findings.push(createAlert(log, log.name, contractData.name, contractData.address));
      });
    });
    return findings;
  };
}

module.exports = {
  provideInitialize,
  initialize: provideInitialize(initializeData),
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(initializeData),
  createAlert,
};
