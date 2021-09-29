const ethers = require('ethers');
const { Finding, FindingSeverity, FindingType } = require('forta-agent');

// load any agent configuration parameters
const { perpfiEverestId } = require('../../agent-config.json');

// import helper functions for loading the perp.fi contract addresses and abis
const common = require('../common');

// load the contracts and events that we would like to monitor
const contractNamesEvents = require('./ownership-change-events.json');

// this is a toggle for using V1 instead of V2 for contracts that specify both
// i.e. ClearingHouse.sol and ClearingHouseV1.sol are both contracts
const useLegacy = true;

// iterate over the contracts to get their addresses and abis
const contractAddressesAbisEvents = [];
(Object.keys(contractNamesEvents)).forEach((contractName) => {
  // get the contract address
  const address = common.getAddressLayer2(contractName);

  // get the contract abi
  const abi = common.getAbiLayer2(contractName, useLegacy);

  // create ethers Interface object
  const iface = new ethers.utils.Interface(abi);

  contractAddressesAbisEvents.push({
    name: contractName,
    address: address.toLowerCase(),
    abi,
    events: contractNamesEvents[contractName],
    iface,
  });
});

// helper function to create alerts
function createAlert(log, eventName, contractName, contractAddress) {
  // construct a metadata object to include in the finding
  const metadata = {
    contractName,
    contractAddress,
    eventName,
  };

  // if this is an ownership transfer event, add the new owner address to the finding
  if (log.name === 'OwnershipTransferred') {
    // signature is OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
    //   args[0] is previousOwner, accessible using args.previousOwner
    //   args[1] is newOwner, accesible using args.newOwner
    metadata.newOwner = log.args.newOwner;
  }

  return Finding.fromObject({
    name: 'Perp.Fi Admin Event',
    description: `The ${eventName} event was emitted by the ${contractName} contract`,
    alertId: 'AE-PERPFI-ADMIN-EVENT',
    protocol: 'Perp.Fi',
    severity: FindingSeverity.Low,
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
  const filter = (log) => (contractData.events).indexOf(log.name) !== -1;
  const parsedLogs = perpfiLogs.map(parse).filter(filter);

  return parsedLogs;
}

async function handleTransaction(txEvent) {
  const findings = [];

  const { logs } = txEvent;

  contractAddressesAbisEvents.forEach((contractData) => {
    const parsedLogs = filterAndParseLogs(logs, contractData);
    parsedLogs.forEach((log) => {
      findings.push(createAlert(log, log.name, contractData.name, contractData.address));
    });
  });
  return findings;
}

module.exports = {
  handleTransaction,
  createAlert,
};
