const ethers = require('ethers');
const { createBlockEvent } = require('forta-agent');

const { createAlert, handleBlock } = require('./eth-balance');

// Tests
describe('eth balance monitoring', () => {
  describe('handleBlock', () => {
    it('returns empty findings if balance is greater than threshold of 3 ETH', async () => {
      // Build Block Event
      const blockEvent = createBlockEvent({
      });

      // Run agent
      const findings = await handleBlock(blockEvent);

      // Assertions
      expect(findings).toStrictEqual([]);
    });

    it('returns a finding if balance is less than threshold', async () => {
      // Build Block Event
      const blockEvent = createBlockEvent({
      });

      // Run agent
      const findings = await handleBlock(blockEvent);
      const alert = [createAlert(accountName, accountBalance, threshold)];
      expect(findings).toStrictEqual(alert);
    });
  });
});
