const ethers = require('ethers');
const { Finding, FindingSeverity, FindingType } = require('forta-agent');

// load the UniswapV3Factory abi
const {
  abi: uniswapV3FactoryAbi,
} = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');
const protocolData = require('../../protocol-data.json');

const baseTokens = ['vUSD', 'vBTC', 'vETH'];

// load any agent configuration parameters
const { perpfiEverestId } = require('../../agent-config.json');

// load the contracts that we would like to monitor
const contractNames = require('./contracts-to-monitor.json');

// iterate over the contracts to get their addresses, abis, and create ethers interfaces
const contractAddressesAbis = [];
contractNames.forEach((contractName) => {
  let address;
  let contractAbi;
  // get the contract address and abi
  if (contractName === 'UniswapV3Factory') {
    address = protocolData.externalContracts.UniswapV3Factory.toLowerCase();
    contractAbi = uniswapV3FactoryAbi;
  } else if (baseTokens.indexOf(contractName) !== -1) {
    if (contractName === 'vUSD') {
      address = protocolData.pools[0].quoteAddress.toLowerCase();
    }
    else {
      address = protocolData.contracts[contractName].address.toLowerCase();
    }
    // eslint-disable-next-line global-require,import/no-dynamic-require
    const { abi } = require('../../abis/BaseToken.json');
    contractAbi = abi;
  } else {
    address = protocolData.contracts[contractName].address.toLowerCase();
    // eslint-disable-next-line global-require,import/no-dynamic-require
    const { abi } = require(`../../abis/${contractName}.json`);
    contractAbi = abi;
  }

  const iface = new ethers.utils.Interface(contractAbi);

  // add a key/value pair for the contract name and address
  contractAddressesAbis.push({
    name: contractName,
    address,
    contractAbi,
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
    newOwner: log.args.newOwner, // this will be present if the event is OwnershipTransferred
  };

  return Finding.fromObject({
    name: 'Perp.Fi Contract Ownership Change Event',
    description: `The ${eventName} event was emitted by the ${contractName} contract`,
    alertId: 'AE-PERPFI-OWNER-CHANGED-EVENT',
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
  const filter = (log) => (log.name === 'OwnershipTransferred');
  const parsedLogs = perpfiLogs.map(parse).filter(filter);

  return parsedLogs;
}

async function handleTransaction(txEvent) {
  const findings = [];

  const { logs } = txEvent;

  contractAddressesAbis.forEach((contractData) => {
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
