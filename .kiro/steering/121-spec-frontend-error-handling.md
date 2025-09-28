---
inclusion: fileMatch
fileMatchPattern: ['**/*.ts', '**/*.tsx']
---
# Rule: Frontend Error Handling Specification (Next.js/React)

## Description
This rule defines the strategy for handling errors gracefully on the client side.

## Core Principles

### 1. Handling API Call Errors
- Use a centralized API client to handle and parse standard error responses from the backend.
- Display form-specific errors inline.
- Use a global notification system (e.g., Toast) for global errors (e.g., 500 Internal Server Error, network failure).

### 2. Handling Component Rendering Errors
- **Use React Error Boundaries.** Wrap major UI sections or pages with an `<ErrorBoundary>` component to prevent the entire app from crashing due to a rendering error in one component.
- The boundary should log the error and display a user-friendly fallback UI.

`## 2. Frontend Error Handling (Next.js / React)

### 1. Handling API Call Errors
- ****Centralized API Client:**** All `fetch` calls to our backend must be wrapped in a centralized API client (e.g., in `src/lib/api-client.ts`).
- ****Error Parsing:**** This client is responsible for parsing the standard JSON error response from the backend.
- ****Error Display Strategy:****  - For ****form submissions**** (e.g., login, creating a card), display the specific error message inline next to the relevant form field.
  - For ****global errors**** (e.g., 500 Internal Server Error, network failure), use a global notification system (like a Toast or a Banner) to inform the user that something went wrong, without crashing the page.

### 2. Handling Component Rendering Errors
- ****Use React Error Boundaries.**** To prevent a JavaScript error in a small part of the UI from crashing the entire application, we must wrap major sections of our UI (e.g., pages, complex components) with an Error Boundary component.
- **Example (`src/components/ErrorBoundary.tsx`):**

```typescript
  import React, { Component, ErrorInfo, ReactNode } from "react";

  interface Props {
    children?: ReactNode;
    fallback: ReactNode; // A fallback UI to render on error
  }

  interface State {
    hasError: boolean;
  }

  class ErrorBoundary extends Component<Props, State> {
    public state: State = {
      hasError: false,
    };

    public static getDerivedStateFromError(_: Error): State {
      return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      // Log the error to an external service here
      console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
      if (this.state.hasError) {
        return this.props.fallback;
      }

      return this.props.children;
    }
  }

  export default ErrorBoundary;`

```

### 3. Handling User Input Validation
- Implement client-side validation using libraries like **`react-hook-form`** and **`zod`** to provide immediate feedback to the user before submitting data to the backend.