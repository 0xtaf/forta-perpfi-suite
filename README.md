# Forta Perp.Fi Suite

## Description

This agent monitors various aspects of Perpetual Finance (Perp.Fi).  The Perp.Fi suite currently contains
the following handlers:

- eth-balance

## Supported Chains

- Ethereum Rinkeby

## Alerts

- AE-PERPFI-LOW-ACCOUNT-BALANCE
  - Fired when an account in accounts.json has a balance lower than the threshold set in accounts.json
  - Severity is always set to "medium"
  - Type is always set to "degraded"
  - Metadata field contains account name, account balance and threshold


## Test Data

To run all of the tests for this agent, use the following command: `npm run test`
