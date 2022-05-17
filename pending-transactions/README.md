# Forta Perp.Fi Suite

Forta agent suite to monitor Perpetual Finance.

## Description

This agent monitors pending transactions of Perpetual Finance (Perp.Fi).

## Supported Chains

- Ethereum Rinkeby

## Alerts

<!-- -->
- AE-PERPFI-HIGH-PENDING-TX
  - Fired when the number of pending transactions for specific Perpetual Finance addresses exceeds a threshold
  - Severity is always set to "critical"
  - Type is always set to "degraded"
  - Metadata field contains Perp.Fi account name, account address, and number of pending transactions

## Test Data

To run all of the tests for this agent, use the following command: `npm run test`
