# Fix Missing API Error Handler

## Scope
The /api/todos endpoint returns a raw 500 error with stack trace when the database connection fails. Add proper error handling middleware that returns a JSON error response with appropriate status codes.

## Context
This directive was created by the agent benchmark suite for testing purposes.
