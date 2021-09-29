# Forta Perp.Fi Suite

## Description

This agent monitors various aspects of Perpetual Finance (Perp.Fi).  The Perp.Fi suite currently contains
the following handlers:

- ownership-change

## Supported Chains

- xDai

## Alerts

- AE-PERPFI-ADMIN-EVENT
  - Fired when a transaction log contains an event that matches a list of Perp.Fi administrative events
  - Severity is always set to "low"
  - Type is always set to "suspicious"
  - Metadata field contains Perp.Fi contract name and address, and event name

## Test Data

To run all of the tests for this agent, use the following command: `npm run test`
