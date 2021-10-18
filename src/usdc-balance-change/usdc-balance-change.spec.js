const {
  provideInitialize, provideHandleBlock, createAlert,
} = require('./usdc-balance-change');

const data = {};

describe('USDC balance change', () => {
  let handleBlock;

  beforeEach(async () => {
    // set up handler
    await (provideInitialize(data))();

    const handler = provideHandleBlock(data);
    handleBlock = async (blockEvent) => handler(blockEvent);

    // assign values for testing
    data.blockWindow = 5;
    data.pctChangeThreshold = 10;
  });

  describe('does not report', () => {
    it('when there is no account/contract address match', async () => {
      // TODO
    });

    it('when the balance change is below the threshold', async () => {
      // TODO
    });

    it('when the balance change is above the threshold but outside the block window', async () => {
      // TODO
    });
  });

  describe('reports', () => {
    it('when there is no account/contract address match', async () => {
      // TODO
    });

    it('when the balance change is above the threshold and within the block window', async () => {
      // TODO
    });
  });
});
