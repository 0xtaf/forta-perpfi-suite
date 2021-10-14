# Forta Perp.Fi Suite

Forta agent suite to monitor Perpetual Finance.

## Description

This agent monitors various aspects of Perpetual Finance (Perp.Fi).  The Perp.Fi suite currently contains
the following handlers:

- admin-events

## Supported Chains

- Ethereum Rinkeby

## Alerts

<!-- -->
- AE-PERPFI-ADMIN-EVENT
  - Fired on any event in admin-events.json
  - Severity is set to the value in admin-events.json
  - Type is set to the value in admin-events.json
  - Metadata field contains contract name, contract address, event name, and event arguments

## Test Data

To run all of the tests for this agent, use the following command: `npm run test`
