const ethers = require('ethers');
const {
  provider: jsonRpcProvider,
  createAlert,
} = require('./agent-setup');

// load agent specific constants
const {
  timeWindowSeconds,
  pctChangeThreshold: PCT_CHANGE_THRESHOLD,
} = require('./usdc-balance-change.json');

const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

// convert value to BigInt type
const NANOSECONDS_PER_SECOND = BigInt(1e9);
const TIME_WINDOW_SECONDS = BigInt(timeWindowSeconds);

// load account addresses to monitor
const accountAddresses = require('../../account-addresses.json');

// load contract addresses to monitor
const contractAddresses = require('../../contract-addresses.json');

// combine the account and contract addresses into a single list to monitor
const addresses = { ...accountAddresses, ...contractAddresses };
console.log('addresses');

// provide ABI for USDC balanceOf()
const usdcAbi = [
  {
    constant: true,
    inputs: [{
      name: 'account',
      type: 'address',
    }],
    name: 'balanceOf',
    outputs: [{
      name: '',
      type: 'uint256',
    }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

// create a Contract object for querying the USDC contract
const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcAbi, jsonRpcProvider);

// initialize the object that will track balances for the addresses of interest
const balances = {};
console.log(addresses);
(Object.keys(addresses)).forEach((name) => {
  const address = addresses[name];
  balances[address] = {
    name,
    lastBalance: undefined,
    currentBalance: undefined,
  };
});

// calculate the percentage change between two values
function calcPercentChange(a, b) {
  return Math.abs((a - b) / a) * 100;
}

let startTime;
let now;

// this will effectively operate as our consumer in a producer/consumer model for obtaining balances
function provideHandleBlock(provider) {
  return async function handleBlock() {
    const findings = [];

    // on first run, just get initial balances and record the time
    if (!(startTime)) {
      startTime = process.hrtime.bigint();

      // get initial balances for each address being monitored
      await Promise.all(Object.keys(balances).map(async (address) => {
        const balance = await usdcContract.balanceOf();
        balances[address].lastBalance = balance;
        balances[address].currentBalance = balance;
      }));

      return findings;
    }

    // check if approximately TIME_WINDOW_SECONDS has elapsed
    // if yes, get updated balances and check if any changes cross the threshold
    // finally, update the start time and starting balances for the next cycle
    now = process.hrtime.bigint();
    const deltaTime = (now - startTime) / NANOSECONDS_PER_SECOND;
    if (deltaTime >= TIME_WINDOW_SECONDS) {
      // update balances
      await Promise.all(Object.keys(balances).map(async (address) => {
        const currentBalance = await usdcContract.balanceOf();
        balances[address].currentBalance = currentBalance;
      }));

      // check for balances that cross the threshold
      (Object.keys(balances)).forEach((address) => {
        // compare against previous balance
        const { lastBalance } = balances[address];
        const { currentBalance } = balances[address];
        const pctChange = calcPercentChange(lastBalance, currentBalance);

        // emit a finding if the threshold was exceeded
        if (pctChange > PCT_CHANGE_THRESHOLD) {
          createAlert(address, currentBalance, pctChange);
        }

        // update for next cycle
        balances[address].lastBalance = currentBalance;
        startTime = now;
      });
    }

    return findings;
  };
}

module.exports = {
  provideHandleBlock,
  handleBlock: provideHandleBlock(jsonRpcProvider),
};
