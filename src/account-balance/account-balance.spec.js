const { createBlockEvent } = require('forta-agent');

const { createAlert, provideHandleBlock, provideInitialize } = require('./account-balance');

// Tests
describe('account balance monitoring', () => {
  describe('handleBlock', () => {
    let initializeData;
    let handleBlock;

    const mockThresholds = {
      Maker: 3,
      Arbitrageur: 3,
      CancelOrderKeeper: 3,
      Liquidator: 3,
    };

    const mockAddresses = {
      Maker: '0',
      Arbitrageur: '1',
      CancelOrderKeeper: '2',
      Liquidator: '3',
    };

    beforeEach(async () => {
      initializeData = {};

      // Initialize the Handler
      await (provideInitialize(initializeData))();
      initializeData.accountThresholds = mockThresholds;
      initializeData.accountAddresses = mockAddresses;

      handleBlock = provideHandleBlock(initializeData);
    });

    it('Test when all account balances are greater than the threshold', async () => {
      // mock the provider to return values greater than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4000000000000000000)),
      };

      initializeData.provider = mockProvider;

      // Build Block Event
      const blockEvent = createBlockEvent({});

      // Run agent
      const findings = await handleBlock(blockEvent);

      // Assertions
      expect(findings).toStrictEqual([]);
    });

    it('Test when all account balances are less than the threshold', async () => {
      // mock the provider to return values less than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4)),
      };

      initializeData.provider = mockProvider;

      // Build Block Event
      const blockEvent = createBlockEvent({});

      // Run agent
      const findings = await handleBlock(blockEvent);

      // Assertions
      const alerts = [
        createAlert('Maker', 4, mockThresholds.Maker),
        createAlert('Arbitrageur', 4, mockThresholds.Arbitrageur),
        createAlert('CancelOrderKeeper', 4, mockThresholds.CancelOrderKeeper),
        createAlert('Liquidator', 4, mockThresholds.Liquidator),
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

      initializeData.provider = mockProvider;

      // Build Block Event
      const blockEvent = createBlockEvent({});

      // Run agent
      const findings = await handleBlock(blockEvent);

      // Assertions
      const alerts = [
        createAlert('Maker', 2900000000000000000, mockThresholds.Maker),
      ];

      expect(findings).toStrictEqual(alerts);
    });
  });
});
