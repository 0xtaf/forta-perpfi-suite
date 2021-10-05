const ethers = require('ethers');
const { createBlockEvent } = require('forta-agent');

const { createAlert, provideHandleBlock } = require('./eth-balance');

// Tests
describe('eth balance monitoring', () => {
  describe('handleBlock', () => {
    it('returns empty findings if balance is greater than threshold of 3 ETH', async () => {
      // mock the provider to return values greater than threshold
      mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(
          4000000000000000000,
        )),
      };


      // Build Block Event
      const blockEvent = createBlockEvent({
      });

      // Run agent
      const handleBlock = provideHandleBlock(mockProvider);
      const findings = await handleBlock(blockEvent);

      // Assertions
      expect(findings).toStrictEqual([]);
    });

    it('returns a finding if balance is less than threshold', async () => {
      // mock the provider to return values less than threshold
      mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(
          4,
        )),
      };

      // Build Block Event
      const blockEvent = createBlockEvent({
      });

      // Run agent
      const handleBlock = provideHandleBlock(mockProvider);
      const findings = await handleBlock(blockEvent);

      // Assertions
      const alerts = [
        createAlert('maker', 4, 3000000000000000000),
        createAlert('arbitrageur', 4, 3000000000000000000),
        createAlert('cancel-order-keeper', 4, 3000000000000000000),
        createAlert('liquidator', 4, 3000000000000000000)
      ];

      expect(findings).toStrictEqual(alerts);
    });
  });
});
