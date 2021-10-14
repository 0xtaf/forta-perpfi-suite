const { provideInitialize, provideHandleTransaction, createAlert } = require('failed-transactions');

const initializeData = {};

const addressA = '0x' + 'A'.repeat(40);
const addressB = '0x' + 'B'.repeat(40);

describe('failed transactions handler tests', () => {
  let handleTransaction;

  beforeEach(async () => {
    // set up handler
    await (provideInitialize(initializeData))();
    handleTransaction = provideHandleTransaction(initializeData);

    // assign values for testing
    initializeData.addresses = { A: addressA };
  });

  describe('failed transactions does not report', () => {

  }

});
