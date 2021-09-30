# Forta Perp.Fi Suite
Forta agent suite to monitor Perpetual Finance.

## Description

This agent monitors various aspects of Perpetual Finance (Perp.Fi).  The Perp.Fi suite currently contains
the following handlers:

- ownership-change

## Supported Chains

- xDai

## Alerts

- AE-PERPFI-ADMIN-EVENT
  - Fired when a transaction log contains an OwnershipTransferred event for specific Perp.Fi contracts
  - Severity is always set to "low"
  - Type is always set to "suspicious"
  - Metadata field contains Perp.Fi contract name, contract address, event name, and new owner

## Test Data

To run all of the tests for this agent, use the following command: `npm run test`
