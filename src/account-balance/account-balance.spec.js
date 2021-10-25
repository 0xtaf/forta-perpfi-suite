const { createBlockEvent } = require('forta-agent');

const { createAlert, provideHandleBlock, provideInitialize } = require('./account-balance');

// Tests
describe('account balance monitoring', () => {
  describe('handleBlock', () => {
    let initializeData;
    let handleBlock;
    let everestId;

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

      ({ everestId } = initializeData);
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
        createAlert(
          'Maker',
          '0x2E8f9B6294aAdef4CE2Fc5acf78cbc04396240EA',
          4,
          mockThresholds.Maker,
          everestId,
        ),
        createAlert(
          'Arbitrageur',
          '0x07a808589962da5EAC737828fAc1BaCAF9C7c5e6',
          4,
          mockThresholds.Arbitrageur,
          everestId,
        ),
        createAlert(
          'CancelOrderKeeper',
          '0xD72c6C76903b1B1BB5A909F511c7E47cA845fA9D',
          4,
          mockThresholds.CancelOrderKeeper,
          everestId,
        ),
        createAlert(
          'Liquidator',
          '0x93fA06E81C25D7168A0D0Ce89b1A6A77E0722650',
          4,
          mockThresholds.Liquidator,
          everestId,
        ),
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
        createAlert(
          'Maker',
          '0x2E8f9B6294aAdef4CE2Fc5acf78cbc04396240EA',
          2900000000000000000,
          mockThresholds.Maker,
          everestId,
        ),
      ];

      expect(findings).toStrictEqual(alerts);
    });
  });
});
