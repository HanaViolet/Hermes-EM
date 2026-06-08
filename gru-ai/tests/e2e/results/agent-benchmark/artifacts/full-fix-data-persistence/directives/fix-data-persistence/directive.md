# Fix Data Persistence Bug

## Scope
Completed todos revert to incomplete state after page refresh because the toggle handler updates the UI but does not persist the change to localStorage. Fix the toggle handler to save state.

## Context
This directive was created by the agent benchmark suite for testing purposes.
