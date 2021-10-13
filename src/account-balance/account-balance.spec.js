const { createBlockEvent } = require('forta-agent');

const { createAlert, provideHandleBlock } = require('./account-balance');

// Tests
describe('eth balance monitoring', () => {
  describe('handleBlock', () => {
    it('Test when all account balances are greater than 3 ETH threshold', async () => {
      // mock the provider to return values greater than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4000000000000000000)),
      };

      // Build Block Event
      const blockEvent = createBlockEvent({});

      // Run agent
      const handleBlock = provideHandleBlock(mockProvider);
      const findings = await handleBlock(blockEvent);

      // Assertions
      expect(findings).toStrictEqual([]);
    });

    it('Test when all account balances are less than 3 ETH threshold', async () => {
      // mock the provider to return values less than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4)),
      };

      // Build Block Event
      const blockEvent = createBlockEvent({});

      // Run agent
      const handleBlock = provideHandleBlock(mockProvider);
      const findings = await handleBlock(blockEvent);

      // Assertions
      const alerts = [
        createAlert('maker', 4, 3),
        createAlert('arbitrageur', 4, 3),
        createAlert('cancel-order-keeper', 4, 3),
        createAlert('liquidator', 4, 3),
      ];

      expect(findings).toStrictEqual(alerts);
    });

    it('Test when only maker account balance is greater than 3 ETH threshold', async () => {
      // mock the provider to return values less than threshold if the maker account
      const mockProvider = {
        getBalance: jest.fn((accountAddress) => {
          // If this is the maker account, return 4 so it fires an alert
          if (accountAddress === '0x2E8f9B6294aAdef4CE2Fc5acf78cbc04396240EA') {
            return Promise.resolve(4);
          }
          return Promise.resolve(4000000000000000000);
        }),
      };

      // Build Block Event
      const blockEvent = createBlockEvent({});

      // Run agent
      const handleBlock = provideHandleBlock(mockProvider);
      const findings = await handleBlock(blockEvent);

      // Assertions
      const alerts = [
        createAlert('maker', 4, 3),
      ];

      expect(findings).toStrictEqual(alerts);
    });
  });
});
