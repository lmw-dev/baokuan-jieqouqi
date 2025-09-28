---
inclusion: fileMatch
fileMatchPattern: ['**/*.test.ts', '**/*.test.tsx', '**/test_*.py']
---
# Rule: Testing Guide and Strategy

## Description
This document defines the testing strategy and best practices for both frontend and backend services. The AI must follow these guidelines when writing tests. Our philosophy is to write pragmatic tests that provide confidence without excessive boilerplate.

---

## 1. General Testing Principles

- **Test Behavior, Not Implementation:** Tests should verify the public-facing behavior of a function or component, not its internal implementation details.
- **Clear Descriptions:** Each test case (`it` or `test` block) should have a clear, human-readable description of the behavior it is testing, e.g., `it('should return an error when the password is too short')`.
- **AAA Pattern:** Structure tests using the Arrange-Act-Assert pattern.
  1.  **Arrange:** Set up the test data and mocks.
  2.  **Act:** Execute the function or render the component being tested.
  3.  **Assert:** Check if the outcome matches the expectation.

---

## 2. Frontend Testing (web - Next.js)

- **Tools:** We will use **Vitest** for the test runner and **React Testing Library (RTL)** for rendering and interacting with components.
- **Focus:**
  - **Unit Tests:** Test complex hooks, utility functions, and data transformation logic. We do not unit-test simple, purely presentational components.
  - **Integration Tests:** Test user flows within a page, such as filling out a form and submitting it, or a component fetching and displaying data.
- **File Location:** Test files must be located alongside the component (e.g., `MyComponent.tsx` and `MyComponent.test.tsx`) 

### Example RTL Query:
- **Always** prefer user-facing queries like `getByRole`, `getByLabelText`, `getByText`.
- **Avoid** implementation-detail queries like `getByTestId` unless there is no other way.

---

## 3. Backend Testing (ai - FastAPI)

- **Tools:** We will use **Pytest** as our test runner.
- **Focus:**
  - **Unit Tests:** Test business logic within services, utility functions, and complex algorithms.
  - **Integration Tests (Most Important):** Test API endpoints. This is our primary focus for backend testing.
- **API Endpoint Test Strategy:**
  - Use FastAPI's `TestClient` to make requests to the API in-memory.
  - For each endpoint, test:
    - The "happy path" (successful response, `2xx` status code).
    - Expected error cases (e.g., invalid input, `4xx` status code).
    - Authentication and authorization logic (e.g., request fails without a token).
- **Database Interaction:**
  - Tests should **not** interact with the real database. Use mocking/patching (e.g., `unittest.mock.patch`) to simulate database responses.