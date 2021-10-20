const ethers = require('ethers');
const BigNumber = require('bignumber.js');
const {
  Finding, FindingSeverity, FindingType, getJsonRpcUrl,
} = require('forta-agent');

// load agent config
const config = require('../../agent-config.json');

const initializeData = {};

// load account addresses
const accountAddresses = require('../../account-addresses.json');

// filter out accounts that were not in the 'accounts' list in the agent config file
(Object.keys(accountAddresses)).forEach((name) => {
  if (!config.usdcBalanceChange.accounts.includes(name)) {
    delete accountAddresses[name];
  }
});

// load contract addresses
const { contracts } = require('../../protocol-data.json');

// include only contracts that were in the 'contracts' list in the agent config file
const contractAddresses = {};
config.usdcBalanceChange.contracts.forEach((name) => {
  contractAddresses[name] = contracts[name].address;
});

// provide ABI for USDC balanceOf()
const { abi: usdcAbi } = require('../../abi/interface/IERC20Metadata.json');

// calculate the percentage change between two BigNumber values
function calcPercentChange(a, b) {
  const delta = a.minus(b).absoluteValue();
  return delta.div(a).multipliedBy(100);
}

// helper function to create alerts
function createAlert(address, name, balance, pctChange, blockWindow, everestId) {
  return Finding.fromObject({
    name: 'Perp.Fi USDC Balance Change',
    description: `The USDC balance of the ${name} account changed by ${pctChange}% `
    + `in the past ${blockWindow} blocks`,
    alertId: 'AE-PERPFI-USDC-BALANCE-CHANGE',
    protocol: 'Perp.Fi',
    severity: FindingSeverity.Medium,
    type: FindingType.Suspicious,
    everestId,
    metadata: {
      address,
      balance: balance.toString(),
      pctChange: pctChange.toString(),
    },
  });
}

function provideHandleBlock(data) {
  return async function handleBlock() {
    const {
      blockWindow, everestId, addresses, pctChangeThreshold, usdcContract,
    } = data;
    if (!addresses) {
      throw new Error('Called handler before initializing');
    }

    const findings = [];

    // update and check balances
    await Promise.all(Object.keys(addresses).map(async (address) => {
      // get balance for each address being monitored
      // Note:  If balanceOf() fails with a CALL_EXCEPTION code, it is likely that the
      //        USDC_ADDRESS is set incorrectly in agent-config.json
      let balance;
      try {
        const balanceEthersBN = await usdcContract.balanceOf(address);

        // convert from ethers BigNumber to JS BigNumber
        balance = new BigNumber(balanceEthersBN.toString());
      } catch (err) {
        console.error(err);
      } finally {
        // if balanceOf() threw an exception, balance will be undefined
        addresses[address].balanceHistory.push(balance);
      }

      // once we see blockWindow+1 blocks, we have enough data to check for a balance change
      //
      // e.g. to check two balances ~1 minute apart, assuming a block interval of ~15 seconds,
      //      we need 5 samples:
      //
      //      balanceHistory = [BAL1, BAL2, BAL3, BAL4, BAL5]
      //
      //      The time between when BAL1 and BAL5 were recorded will be approximately 1 minute
      //
      if (addresses[address].balanceHistory.length === blockWindow + 1) {
        // check oldest balance against current balance
        const oldBalance = addresses[address].balanceHistory[0];

        // calculate the percentage change in the balance
        // skip the check if we have an 'undefined' value from a failed balanceOf() call
        if ((oldBalance !== undefined) && (balance !== undefined)) {
          const pctChange = calcPercentChange(oldBalance, balance);

          // emit a finding if the threshold was met or exceeded
          if (pctChange >= pctChangeThreshold) {
            const { name } = addresses[address];
            findings.push(createAlert(address, name, balance, pctChange, blockWindow, everestId));
          }
        }

        // update for the next cycle - drop the oldest balance
        addresses[address].balanceHistory.shift();
      }
    }));

    return findings;
  };
}

function provideInitialize(data) {
  return async function initialize() {
    /* eslint-disable no-param-reassign */
    data.addresses = {};

    // combine the account and contract addresses into a single list to monitor
    const allAddresses = { ...accountAddresses, ...contractAddresses };

    // initialize the object that will track balances for the addresses of interest
    // also convert the addresses to lowercase at this step
    (Object.entries(allAddresses)).forEach(([name, address]) => {
      data.addresses[address.toLowerCase()] = {
        name,
        balanceHistory: [],
      };
    });

    // set up an ethers provider
    data.provider = new ethers.providers.JsonRpcProvider(getJsonRpcUrl());

    // USDC contract addresses for testing:
    // Mainnet: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    // Rinkeby: 0xeb8f08a975ab53e34d8a0330e0d34de942c95926
    // Arbitrum: 0xff970a61a04b1ca14834a43f5de4533ebddb5cc8 (check with arbiscan.io)
    data.USDC_ADDRESS = config.usdcBalanceChange.USDC_ADDRESS;

    // create a Contract object for querying the USDC contract
    data.usdcContract = new ethers.Contract(data.USDC_ADDRESS, usdcAbi, data.provider);

    // assign configurable fields
    data.blockWindow = config.usdcBalanceChange.blockWindow;
    data.pctChangeThreshold = config.usdcBalanceChange.pctChangeThreshold;
    data.everestId = config.PERPFI_EVEREST_ID;
    /* eslint-enable no-param-reassign */
  };
}

module.exports = {
  provideInitialize,
  initialize: provideInitialize(initializeData),
  provideHandleBlock,
  handleBlock: provideHandleBlock(initializeData),
};
