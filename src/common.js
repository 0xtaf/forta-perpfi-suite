// get the contents of the production deployment JSON
const productionAddresses = require('@perp/contract/metadata/production.json');

const contractAbiPaths = require('./contract-abi-paths.json');

// extract the layer1 and layer2 addresses
const {
  layers:
  {
    layer1:
    {
      contracts: layer1ContractObjects,
      externalContracts: layer1ExternalContractObjects,
    },
    layer2:
    {
      contracts: layer2ContractObjects,
      externalContracts: layer2ExternalContractObjects,
    },
  },
} = productionAddresses;

// private function that retrieves a contract address from an Array of Objects
function getAddress(contractObjects, contractName) {
  const objects = (Object.keys(contractObjects)).filter((name) => name === contractName);
  if (objects.length === 0) {
    throw new Error(`No entry for contract name: ${contractName}`);
  }
  if (objects.length > 1) {
    throw new Error(`More than one match for contract name: ${contractName}`);
  }
  return contractObjects[objects[0]].address;
}

// public function that retrieves a contract address for a layer-1 contract
function getAddressLayer1(contractName) {
  return getAddress(layer1ContractObjects, contractName);
}

// public function that retrieves a contract address for a layer-1 external contract
function getExternalAddressLayer1(contractName) {
  return getAddress(layer1ExternalContractObjects, contractName);
}

// public function that retrieves a contract address for a layer-2 contract
function getAddressLayer2(contractName) {
  return getAddress(layer2ContractObjects, contractName);
}

// public function that retrieves a contract address for a layer-2 external contract
function getExternalAddressLayer2(contractName) {
  return getAddress(layer2ExternalContractObjects, contractName);
}

// private function that retrieves an abi for a contract
function getAbi(contractObjects, contractName, useLegacy) {
  const objects = (Object.keys(contractObjects)).filter((name) => name === contractName);
  if (objects.length === 0) {
    throw new Error(`No matching contract for contract name: ${contractName}`);
  }
  if (objects.length > 1) {
    throw new Error(`More than one contract name match for contract name: ${contractName}`);
  }
  let contractSolName = contractObjects[objects[0]].name;

  // if the legacy contract is desired, check that it exists first
  if (useLegacy === true) {
    contractSolName += 'V1';
  }

  const abiPaths = (Object.keys(contractAbiPaths)).filter((name) => name === contractSolName);
  if (abiPaths.length === 0) {
    throw new Error(`No abi found for contract name ${contractSolName}`);
  }
  if (abiPaths.length > 1) {
    throw new Error(`More than one abi found for contract name ${contractSolName}`);
  }

  // it is typically bad form to perform dynamic imports/requires, but under the circumstances
  // that is what is needed here
  // eslint-disable-next-line import/no-dynamic-require,global-require
  const { abi } = require(contractAbiPaths[abiPaths[0]]);
  return abi;
}

// public function that retrieves an abi for a layer-1 contract
function getAbiLayer1(contractName, useLegacy) {
  return getAbi(layer1ContractObjects, contractName, useLegacy);
}

// public function that retrieves an abi for a layer-1 external contract
function getAbiExternalLayer1(contractName, useLegacy) {
  return getAbi(layer1ExternalContractObjects, contractName, useLegacy);
}

// public function that retrieves an abi for a layer-2 contract
function getAbiLayer2(contractName, useLegacy) {
  return getAbi(layer2ContractObjects, contractName, useLegacy);
}

// public function that retrieves an abi for a layer-2 external contract
function getAbiExternalLayer2(contractName, useLegacy) {
  return getAbi(layer2ExternalContractObjects, contractName, useLegacy);
}

module.exports = {
  getAddressLayer1,
  getExternalAddressLayer1,
  getAddressLayer2,
  getExternalAddressLayer2,
  getAbiLayer1,
  getAbiExternalLayer1,
  getAbiLayer2,
  getAbiExternalLayer2,
};
