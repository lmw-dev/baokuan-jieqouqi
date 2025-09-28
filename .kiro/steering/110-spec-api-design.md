---
inclusion: fileMatch
fileMatchPattern: ['**/api/**/*.ts', '**/api/**/*.py']
---


## 1. Core Principles: RESTful & Resource-Oriented
- **HTTP Verbs:** Use standard HTTP methods correctly for CRUD operations.
  - **`GET`**: Retrieve resources.
  - **`POST`**: Create a new resource.
  - **`PATCH`**: Partially update an existing resource.
  - **`DELETE`**: Delete a resource.
- **Resource Naming:** Use `kebab-case`, plural nouns for resource URLs (e.g., `/analysis-cards`).

## 2. Unified Response Format
All API responses **must** follow this format. The HTTP status code indicates the transport-level outcome, while the `code` field indicates the business-level outcome.
```typescript
interface ApiResponse<T> {
  code: number;        // 业务状态码, 0 表示成功.
  message: string;     // 响应消息.
  data: T | null;      // 响应数据, 失败或无数据时为 null.
}
````

## 3. Standard HTTP Status Codes

  - **200 OK**: General success for `GET`, `PATCH`.
  - **201 Created**: Success after `POST`.
  - **204 No Content**: Success after `DELETE`.
  - **400 Bad Request**: Client-side validation error.
  - **401 Unauthorized**: Authentication failed or missing.
  - **403 Forbidden**: Authenticated but lacks permission.
  - **404 Not Found**: Resource not found.
  - **500 Internal Server Error**: Unexpected server error.

## 4. Error Handling & Codes

  - All error responses (4xx, 5xx) must use the unified response format.
  - Business error codes (`code` field) must be defined in and imported from `src/errors/codes.ts`.
  - **Example Error Response (HTTP 400):**

<!-- end list -->

```json
{
  "code": 2001, // Corresponds to ErrorCode.INVALID_PARAMETER
  "message": "参数错误：cardId不能为空",
  "data": null
}
```

## 5. JSON Payload Naming Convention

  - All request and response bodies **must** use JSON.
  - All keys/properties within the JSON body **must** use `snake_case` (e.g., `user_id`, `card_title`).

## 6. Pagination for Collections

  - `GET` requests that return a list of resources must support pagination.
  - **Query Parameters**: `page` (default: 1), `pageSize` (default: 10).
  - **Response `data` field format**:

<!-- end list -->

```typescript
{
  "list": T[],
  "pagination": {
    "total": number,
    "page": number,
    "pageSize": number
  }
}
```

## 7. API Documentation

  - Every endpoint **must** have a complete OpenAPI/Swagger docstring comment.

