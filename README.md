# Forta Perp.Fi Suite

## Description

This agent monitors various aspects of Perpetual Finance (Perp.Fi).  The Perp.Fi suite currently contains
the following handlers:

- usdc-balance-change

## Supported Chains

- Ethereum Rinkeby

## Alerts

<!-- -->
- AE-PERPFI-USDC-BALANCE-CHANGE
  - Fired when the USDC balance of a contract or account changes by 10% or more within
    approximately 1 minute
  - Severity is always set to "medium"
  - Type is always set to "suspicious"
  - Metadata field contains account/contract address, USDC balance, and percentage change

## Test Data

To run all of the tests for this agent, use the following command: `npm run test`
