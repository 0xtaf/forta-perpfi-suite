# Forta Perp.Fi Suite

Forta agent suite to monitor Perpetual Finance.

## Description

This agent monitors various aspects of Perpetual Finance (Perp.Fi).  The Perp.Fi suite currently contains
the following handlers:

- pending-transactions

## Supported Chains

- Ethereum Rinkeby

## Alerts

- AE-PERPFI-HIGH-PENDING-TX
  - Fired when the number of pending transactions for specific Perpetual Finance addresses exceeds a threshold
  - Severity is always set to "low"
  - Type is always set to "degraded"
  - Metadata fields contains Perp.Fi account name, account address, and number of pending transactions

## Test Data

To run all of the tests for this agent, use the following command: `npm run test`
