const { createBlockEvent } = require('forta-agent');

const { createAlert, provideHandleBlock, provideInitialize } = require('./account-balance');

// Tests
describe('account balance monitoring', () => {
  describe('handleBlock', () => {
    let initializeData;
    let handleBlock;

    beforeEach(async () => {
      initializeData = {};

      // Initialize the Handler
      await (provideInitialize(initializeData))();
      handleBlock = provideHandleBlock(initializeData);
    });

    const mockAccounts = {
      maker: {
        address: '0',
        threshold: 3,
      },
      arbitrageur: {
        address: '1',
        threshold: 3,
      },
      'cancel-order-keeper': {
        address: '2',
        threshold: 3,
      },
      liquidator: {
        address: '3',
        threshold: 3,
      },
    };

    it('Test when all account balances are greater than the threshold', async () => {
      // mock the provider to return values greater than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4000000000000000000)),
      };

      // Build Block Event
      const blockEvent = createBlockEvent({});

      // Run agent
      initializeData.accounts = mockAccounts;
      initializeData.provider = mockProvider;
      const findings = await handleBlock(blockEvent);

      // Assertions
      expect(findings).toStrictEqual([]);
    });

    it('Test when all account balances are less than the threshold', async () => {
      // mock the provider to return values less than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4)),
      };

      // Build Block Event
      const blockEvent = createBlockEvent({});

      // Run agent
      initializeData.accounts = mockAccounts;
      initializeData.provider = mockProvider;
      const findings = await handleBlock(blockEvent);

      // Assertions
      const alerts = [
        createAlert('maker', 4, mockAccounts.maker.threshold),
        createAlert('arbitrageur', 4, mockAccounts.arbitrageur.threshold),
        createAlert('cancel-order-keeper', 4, mockAccounts['cancel-order-keeper'].threshold),
        createAlert('liquidator', 4, mockAccounts.liquidator.threshold),
      ];

      expect(findings).toStrictEqual(alerts);
    });

    it('Test when only maker account balance is less than the threshold', async () => {
      // mock the provider to return values less than threshold if this is the maker account
      const mockProvider = {
        getBalance: jest.fn((accountAddress) => {
          // If this is the maker account, return 2900000000000000000 so it fires an alert
          if (accountAddress === '0') {
            return Promise.resolve(2900000000000000000);
          }
          return Promise.resolve(4000000000000000000);
        }),
      };

      // Build Block Event
      const blockEvent = createBlockEvent({});

      // Run agent
      initializeData.accounts = mockAccounts;
      initializeData.provider = mockProvider;
      const findings = await handleBlock(blockEvent);

      // Assertions
      const alerts = [
        createAlert('maker', 2900000000000000000, 3),
      ];

      expect(findings).toStrictEqual(alerts);
    });
  });
});
