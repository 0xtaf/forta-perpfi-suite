const { Finding, FindingSeverity, FindingType } = require('forta-agent');

// load the module containing commonly used helper functions for Perpetual Finance
const common = require('../common');

// load any agent configuration parameters
const { perpfiEverestId } = require('../../agent-config.json');
const adminEvents = require('./admin-events.json');

// set up a variable to hold initialization data used in the handler
const initializeData = {};

// get the Array of events for a given contract
function getEvents(contractName) {
  const events = adminEvents[contractName];
  if (events === undefined) {
    return {}; // no events for this contract
  }
  return events;
}

// helper function that converts the arguments so they can be in the metadata
// any field that has a key that is of type Number will be removed
// otherwise, all values are converted to strings so that BigNumbers are readable
function extractArgs(args) {
  const strippedArgs = {};
  Object.keys(args).forEach((key) => {
    if (Number.isNaN(Number(key))) {
      strippedArgs[key] = args[key].toString();
    }
  });
  return strippedArgs;
}

// helper function to create alerts
function createAlert(eventName, contractName, contractAddress, eventType, eventSeverity, args) {
  const strippedArgs = extractArgs(args);
  return Finding.fromObject({
    name: 'Perpetual Finance Admin Event',
    description: `The ${eventName} event was emitted by the ${contractName} contract`,
    alertId: 'AE-PERPFI-ADMIN-EVENT',
    type: FindingType[eventType],
    severity: FindingSeverity[eventSeverity],
    everestId: perpfiEverestId,
    protocol: 'Perp.Fi',
    metadata: {
      contractName,
      contractAddress,
      eventName,
      strippedArgs,
    },
  });
}

// helper function to filter logs based on contract addresses and event names
function filterAndParseLogs(logs, address, iface, eventNames) {
  // collect logs only from the contracts of interest
  const contractLogs = logs.filter((log) => log.address === address);
  if (contractLogs.length === 0) {
    return [];
  }

  // decode logs and filter on the ones we are interested in
  const parse = (log) => iface.parseLog(log);
  const filter = (log) => eventNames.indexOf(log.name) !== -1;
  const parsedLogs = contractLogs.map(parse).filter(filter);

  return parsedLogs;
}

function provideInitialize(data) {
  return async function initialize() {
    // get the contract names that have events that we wish to monitor
    const contractNames = Object.keys(adminEvents);

    // load the contract addresses, abis, and ethers interfaces
    // eslint-disable-next-line no-param-reassign
    data.contracts = common.getContractAddressesAbis(contractNames);
  };
}

function provideHandleTransaction(data) {
  return async function handleTransaction(txEvent) {
    const { contracts } = data;
    if (!contracts) throw new Error('handleTransaction called before initialization');

    const findings = [];

    // iterate over each contract name to get the address and events
    contracts.forEach((contract) => {
      // for each contract look up the events of interest
      const events = getEvents(contract.name);
      const eventNames = Object.keys(events);

      // filter down to only the events we want to alert on
      const parsedLogs = filterAndParseLogs(
        txEvent.logs,
        contract.address,
        contract.iface,
        eventNames,
      );

      // alert on each item in parsedLogs
      parsedLogs.forEach((parsedLog) => {
        findings.push(createAlert(
          parsedLog.name,
          contract.name,
          contract.address,
          events[parsedLog.name].type,
          events[parsedLog.name].severity,
          parsedLog.args,
        ));
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
