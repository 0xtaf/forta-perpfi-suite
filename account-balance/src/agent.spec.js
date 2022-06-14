const { createBlockEvent } = require('forta-agent');

const { createAlert, provideHandleBlock, provideInitialize } = require('./agent');

const { accountBalance } = require('./agent-config.json');

const ALERT_MINIMUM_INTERVAL_SECONDS = accountBalance.alertMinimumIntervalSeconds;

// Tests
describe('account balance monitoring', () => {
  describe('handleBlock', () => {
    let initializeData;
    let handleBlock;

    const mockThresholds = {
      PriceKeeper: 3,
      PriceKeeper2: 3,
      PriceKeeper3: 3,
      PriceKeeper4: 3,
      PriceKeeper5: 3,
      PriceKeeper6: 3,
      Liquidator: 3,
      Liquidator2: 3,
      CollateralLiquidator: 3,
    };

    const mockAddresses = {
      PriceKeeper: '0xPRICEKEEPERADDRESS',
      PriceKeeper2: '0xPRICEKEEPER2ADDRESS',
      PriceKeeper3: '0xPRICEKEEPER3ADDRESS',
      PriceKeeper4: '0xPRICEKEEPER4ADDRESS',
      PriceKeeper5: '0xPRICEKEEPER5ADDRESS',
      PriceKeeper6: '0xPRICEKEEPER6ADDRESS',
      Liquidator: '0xLIQUIDATORADDRESS',
      Liquidator2: '0xLIQUIDATOR2ADDRESS',
      CollateralLiquidator: '0xCOLLATERALLIQUIDATORADDRESS',
    };

    beforeEach(async () => {
      initializeData = {};

      // Initialize the Handler
      await (provideInitialize(initializeData))();

      // update each account's address and threshold to use the mocked address and mocked threshold
      initializeData.accounts.forEach((account) => {
        /* eslint-disable no-param-reassign */
        account.accountAddress = mockAddresses[account.accountName];
        account.accountThresholds = mockThresholds[account.accountName];
        /* eslint-enable no-param-reassign */
      });

      handleBlock = provideHandleBlock(initializeData);
    });

    it('Test when all account balances are greater than the threshold', async () => {
      // mock the provider to return values greater than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4000000000000000000)),
      };

      initializeData.provider = mockProvider;

      const blockEvent = createBlockEvent({
        blockNumber: 12345,
        block: {
          timestamp: 1234567890,
        },
      });

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
      const blockEvent = createBlockEvent({
        blockNumber: 12345,
        block: {
          timestamp: 1234567890,
        },
      });

      // Run agent
      const findings = await handleBlock(blockEvent);

      // Assertions
      const alerts = [
        createAlert(
          'PriceKeeper',
          '0xPRICEKEEPERADDRESS',
          4,
          mockThresholds.PriceKeeper,
          0
        ),
        createAlert(
          'PriceKeeper2',
          '0xPRICEKEEPER2ADDRESS',
          4,
          mockThresholds.PriceKeeper2,
          0
        ),
        createAlert(
          'PriceKeeper3',
          '0xPRICEKEEPER3ADDRESS',
          4,
          mockThresholds.PriceKeeper3,
          0
        ),
        createAlert(
          'PriceKeeper4',
          '0xPRICEKEEPER4ADDRESS',
          4,
          mockThresholds.PriceKeeper4,
          0
        ),
        createAlert(
          'PriceKeeper5',
          '0xPRICEKEEPER5ADDRESS',
          4,
          mockThresholds.PriceKeeper5,
          0
        ),
        createAlert(
          'PriceKeeper6',
          '0xPRICEKEEPER6ADDRESS',
          4,
          mockThresholds.PriceKeeper6,
          0
        ),
        createAlert('Liquidator', '0xLIQUIDATORADDRESS', 4, mockThresholds.Liquidator, 0),
        createAlert(
          'Liquidator2',
          '0xLIQUIDATOR2ADDRESS',
          4,
          mockThresholds.Liquidator2,
          0
        ),
        createAlert(
          'CollateralLiquidator',
          '0xCOLLATERALLIQUIDATORADDRESS',
          4,
          mockThresholds.CollateralLiquidator,
          0
        ),
      ];

      expect(findings).toStrictEqual(alerts);
    });

    it('Test when only pricekeper account balance is less than the threshold', async () => {
      // mock the provider to return values less than threshold if this is the pricekeper account
      const mockProvider = {
        getBalance: jest.fn((accountAddress) => {
          // If this is the pricekeper account, return 2900000000000000000 so it fires an alert
          if (accountAddress === '0xPRICEKEEPERADDRESS') {
            return Promise.resolve(2900000000000000000);
          }
          return Promise.resolve(4000000000000000000);
        }),
      };

      initializeData.provider = mockProvider;

      // Build Block Event
      const blockEvent = createBlockEvent({
        blockNumber: 12345,
        block: {
          timestamp: 1234567890,
        },
      });

      // Run agent
      const findings = await handleBlock(blockEvent);

      // Assertions
      const alerts = [
        createAlert(
          'PriceKeeper',
          '0xPRICEKEEPERADDRESS',
          2900000000000000000,
          mockThresholds.PriceKeeper,
          0
        ),
      ];

      expect(findings).toStrictEqual(alerts);
    });

    it('Test returns no findings if last alert was created less than N hours ago', async () => {
      // mock the provider to return values less than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4)),
      };

      initializeData.provider = mockProvider;

      // create a timestamp
      const blockTimestamp = 1234567890;

      // create a timestamp for when the last alert was triggered, less than N hours ago
      const mockedTime = blockTimestamp - ALERT_MINIMUM_INTERVAL_SECONDS + 1;

      // build Block Event
      const blockEvent = createBlockEvent({
        blockNumber: 12345,
        block: {
          timestamp: blockTimestamp,
        },
      });

      // update the start time for each account in the initialized data
      initializeData.accounts.forEach((account) => {
        // eslint-disable-next-line no-param-reassign
        account.startTime = mockedTime;
      });

      // run agent
      const findings = await handleBlock(blockEvent);

      // assertions
      expect(findings).toStrictEqual([]);
    });

    it('Test returns findings if last alert was created greater than N hours ago', async () => {
      // mock the provider to return values less than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4)),
      };

      initializeData.provider = mockProvider;

      // create a timestamp
      const blockTimestamp = 1234567890;

      // create a timestamp for when the last alert was triggered, greater than N hours ago
      const mockedTime = blockTimestamp - ALERT_MINIMUM_INTERVAL_SECONDS - 1;

      // build Block Event
      const blockEvent = createBlockEvent({
        blockNumber: 12345,
        block: {
          timestamp: blockTimestamp,
        },
      });

      // update the start time for each account in the initialized data
      initializeData.accounts.forEach((account) => {
        // eslint-disable-next-line no-param-reassign
        account.startTime = mockedTime;
      });

      // run agent
      const findings = await handleBlock(blockEvent);

      // assertions
      const alerts = [
        createAlert(
          'PriceKeeper',
          '0xPRICEKEEPERADDRESS',
          4,
          mockThresholds.PriceKeeper,
          0
        ),
        createAlert(
          'PriceKeeper2',
          '0xPRICEKEEPER2ADDRESS',
          4,
          mockThresholds.PriceKeeper2,
          0
        ),
        createAlert(
          'PriceKeeper3',
          '0xPRICEKEEPER3ADDRESS',
          4,
          mockThresholds.PriceKeeper3,
          0
        ),
        createAlert(
          'PriceKeeper4',
          '0xPRICEKEEPER4ADDRESS',
          4,
          mockThresholds.PriceKeeper4,
          0
        ),
        createAlert(
          'PriceKeeper5',
          '0xPRICEKEEPER5ADDRESS',
          4,
          mockThresholds.PriceKeeper5,
          0
        ),
        createAlert(
          'PriceKeeper6',
          '0xPRICEKEEPER6ADDRESS',
          4,
          mockThresholds.PriceKeeper6,
          0
        ),
        createAlert('Liquidator', '0xLIQUIDATORADDRESS', 4, mockThresholds.Liquidator, 0),
        createAlert(
          'Liquidator2',
          '0xLIQUIDATOR2ADDRESS',
          4,
          mockThresholds.Liquidator2,
          0
        ),
        createAlert(
          'CollateralLiquidator',
          '0xCOLLATERALLIQUIDATORADDRESS',
          4,
          mockThresholds.CollateralLiquidator,
          0
        ),
      ];

      expect(findings).toStrictEqual(alerts);
    });

    it('Test returns findings and number of alerts since last finding is 2 when the previous 2 alerts were created less than N hours ago', async () => {
      // mock the provider to return values less than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4)),
      };

      initializeData.provider = mockProvider;

      // create a timestamp and block number
      let blockTimestamp = 1234567890;
      let blockNumber = 12345;

      // create a timestamp for when the last alert was triggered, less than N hours ago
      const mockedTime = blockTimestamp - 1;

      // build Block Event
      let blockEvent = createBlockEvent({
        blockNumber,
        block: {
          timestamp: blockTimestamp,
        },
      });

      // update the start time for each account in the initialized data
      initializeData.accounts.forEach((account) => {
        // eslint-disable-next-line no-param-reassign
        account.startTime = mockedTime;
      });

      // run agent
      let findings = await handleBlock(blockEvent);
      expect(findings).toStrictEqual([]);

      // create a new block but have the timestamp be within N hours
      blockNumber += 1;
      blockTimestamp += 20;

      blockEvent = createBlockEvent({
        blockNumber,
        block: {
          timestamp: blockTimestamp,
        },
      });

      // run agent again
      findings = await handleBlock(blockEvent);
      expect(findings).toStrictEqual([]);

      // create the last new block but have the timestamp be greater than N hours
      blockNumber += 1;
      blockTimestamp += ALERT_MINIMUM_INTERVAL_SECONDS;

      blockEvent = createBlockEvent({
        blockNumber,
        block: {
          timestamp: blockTimestamp,
        },
      });

      findings = await handleBlock(blockEvent);

      // assertions
      const alerts = [
        createAlert(
          'PriceKeeper',
          '0xPRICEKEEPERADDRESS',
          4,
          mockThresholds.PriceKeeper,
          2
        ),
        createAlert(
          'PriceKeeper2',
          '0xPRICEKEEPER2ADDRESS',
          4,
          mockThresholds.PriceKeeper2,
          2
        ),
        createAlert(
          'PriceKeeper3',
          '0xPRICEKEEPER3ADDRESS',
          4,
          mockThresholds.PriceKeeper3,
          2
        ),
        createAlert(
          'PriceKeeper4',
          '0xPRICEKEEPER4ADDRESS',
          4,
          mockThresholds.PriceKeeper4,
          2
        ),
        createAlert(
          'PriceKeeper5',
          '0xPRICEKEEPER5ADDRESS',
          4,
          mockThresholds.PriceKeeper5,
          2
        ),
        createAlert(
          'PriceKeeper6',
          '0xPRICEKEEPER6ADDRESS',
          4,
          mockThresholds.PriceKeeper6,
          2
        ),
        createAlert('Liquidator', '0xLIQUIDATORADDRESS', 4, mockThresholds.Liquidator, 2),
        createAlert(
          'Liquidator2',
          '0xLIQUIDATOR2ADDRESS',
          4,
          mockThresholds.Liquidator2,
          2
        ),
        createAlert(
          'CollateralLiquidator',
          '0xCOLLATERALLIQUIDATORADDRESS',
          4,
          mockThresholds.CollateralLiquidator,
          2
        ),
      ];

      expect(findings).toStrictEqual(alerts);
    });

    it('Test returns findings and number of alerts since last finding gets reset back to 0 after alert is generated', async () => {
      // mock the provider to return values less than threshold
      const mockProvider = {
        getBalance: jest.fn(() => Promise.resolve(4)),
      };

      initializeData.provider = mockProvider;

      // build Block Event
      const blockEvent = createBlockEvent({
        blockNumber: 12345,
        block: {
          timestamp: 1234567890,
        },
      });

      // artificially set the number of alerts since last finding to 2
      initializeData.accounts.forEach((account) => {
        // eslint-disable-next-line no-param-reassign
        account.numAlertsSinceLastFinding = 2;
      });

      // run agent
      const findings = await handleBlock(blockEvent);

      // assertions
      const alerts = [
        createAlert(
          'PriceKeeper',
          '0xPRICEKEEPERADDRESS',
          4,
          mockThresholds.PriceKeeper,
          2
        ),
        createAlert(
          'PriceKeeper2',
          '0xPRICEKEEPER2ADDRESS',
          4,
          mockThresholds.PriceKeeper2,
          2
        ),
        createAlert(
          'PriceKeeper3',
          '0xPRICEKEEPER3ADDRESS',
          4,
          mockThresholds.PriceKeeper3,
          2
        ),
        createAlert(
          'PriceKeeper4',
          '0xPRICEKEEPER4ADDRESS',
          4,
          mockThresholds.PriceKeeper4,
          2
        ),
        createAlert(
          'PriceKeeper5',
          '0xPRICEKEEPER5ADDRESS',
          4,
          mockThresholds.PriceKeeper5,
          2
        ),
        createAlert(
          'PriceKeeper6',
          '0xPRICEKEEPER6ADDRESS',
          4,
          mockThresholds.PriceKeeper6,
          2
        ),
        createAlert('Liquidator', '0xLIQUIDATORADDRESS', 4, mockThresholds.Liquidator, 2),
        createAlert(
          'Liquidator2',
          '0xLIQUIDATOR2ADDRESS',
          4,
          mockThresholds.Liquidator2,
          2
        ),
        createAlert(
          'CollateralLiquidator',
          '0xCOLLATERALLIQUIDATORADDRESS',
          4,
          mockThresholds.CollateralLiquidator,
          2
        ),
      ];

      expect(findings).toStrictEqual(alerts);

      // iterate through each account and make sure number of alerts since last finding has been
      // reset to 0
      initializeData.accounts.forEach((account) => {
        expect(account.numAlertsSinceLastFinding).toStrictEqual(0);
      });
    });
  });
});
