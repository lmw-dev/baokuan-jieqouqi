---
inclusion: fileMatch
fileMatchPattern: ['**/*.py']
---
# Rule: Backend Error Handling Specification

## Description
This rule defines the standard strategy for handling and responding to errors in our FastAPI backend service. The AI must follow this pattern to ensure all error responses are consistent, informative, and secure.

## Core Principles

1.  **Never Crash:** The server must catch all foreseeable errors gracefully.
2.  **Standard Response Format:** Adhere to the `ApiResponse` format defined in `110-spec-api-design.mdc`.
3.  **Distinguish & Log Errors:** Correctly use 4xx for client errors and 5xx for server errors. Log all 5xx errors with full stack traces.
4.  **No Sensitive Data Leakage:** Client-facing error messages must be generic and safe.

## FastAPI Implementation Pattern
- Use custom exception classes inheriting from a base `APIException`.
- Use a centralized `@app.exception_handler` to catch these exceptions and format the standard JSON response.

### 1. Custom Exception Classes
Create a set of custom exception classes that inherit from a base `APIException`. Each exception will contain its corresponding HTTP status code and business error code.

**Example (`app/core/exceptions.py`):**

```python
from starlette import status

# A mapping from our business codes to user-friendly messages
ERROR_CODE_MAP = {
    2001: "Invalid parameters",
    4001: "Authentication failed",
    9001: "Internal server error"
}

class APIException(Exception):
    def __init__(self, code: int, message: str = None):
        self.code = code
        self.message = message or ERROR_CODE_MAP.get(code, "An unknown error occurred")

class InvalidParameterError(APIException):
    def __init__(self, message: str = None):
        super().__init__(code=2001, message=message)

class NotAuthenticatedError(APIException):
    def __init__(self, message: str = None):
        super().__init__(code=4001, message=message)
```

### 2. Centralized Exception Handler

Create a global exception handler using the `@app.exception_handler` decorator. This handler will catch our custom `APIException` and format the standard JSON response.

**Example (`main.py`):**

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette import status
from .core.exceptions import APIException

app = FastAPI()

@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST, # Or another appropriate 4xx code
        content={
            "code": exc.code,
            "message": exc.message,
            "data": None
        }
    )

# Also add a generic 500 error handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log the full exception and stack trace here!
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": 9001,
            "message": "An internal server error occurred.",
            "data": None
        }
    )
```

### 3. Usage in Route Handlers

Now, the route handlers can be very clean. Just raise the appropriate custom exception.

**Example (`app/api/routes/cards.py`):**

```python
from app.core.exceptions import InvalidParameterError

@router.post("/analysis-cards")
async def create_card(card_data: CardCreateSchema):
    if not card_data.title:
        raise InvalidParameterError("Card title cannot be empty.")
    
    # ... rest of the logic
```



---


