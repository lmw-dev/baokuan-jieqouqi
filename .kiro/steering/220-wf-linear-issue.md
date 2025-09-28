---
inclusion: manual
---
# Rule: Linear Issue Creation Guide

## Description
This rule provides a structured template for creating well-defined Feature or Task Issues in Linear. Use this rule when you need to define a new piece of work for the project.

## Workflow

When invoked, the AI will guide the user through the following steps to gather all necessary information.

### Step 1: Define the Core Task

The AI will ask for the following essential information:
1.  **Issue Title:** A concise, descriptive title for the task (e.g., "Implement User Profile Page").
2.  **Issue Type:** Is this a `Feature`, `Bug`, `Chore`, or `Refactor`?
3.  **Priority:** `High`, `Medium`, `Low`, or `No Priority`.

### Step 2: Write the Issue Description using the Template

The AI will then use the gathered information to populate the following Markdown template. The user should fill in the details for each section.

---

### **1. 🎯 Objective (Why are we doing this?)**
*(A single sentence describing the ultimate goal and the user value it provides.)*

### **2. 📝 Background & User Story**
*(Provide context. Who is this for? What problem does it solve?)*
**As a** [User Type],
**I want to** [Perform an action],
**So that I can** [Achieve a benefit].

### **3. 💡 Functional Requirements**
*(A checklist of what the feature must do.)*
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### **4. 约束与技术思考 (Technical Constraints & Thoughts)**
#### 4.1 业务流程图 (Business Process Diagram)
*(这张“业务流程图”，描述的是“数据和指令的旅程”。)*
```mermaid
 
```

#### 4.2 技术选型与约束 (Tech Stack & Constraints)
*(Any technical limitations, specific libraries to use, or initial architectural ideas. This is the "Pre-flight Check".)*
- **Must** use `[Library/Component]` for...
- **Must** follow the API design guide: `[[指南 - Git工作流与提交规范]]`
- Initial thought: Consider...

### **5. ✅ Acceptance Criteria (Definition of Done)**
*(A checklist of how to verify that the task is complete. This should be concrete and testable.)*
- [ ] The user can see...
- [ ] Clicking the button results in...
- [ ] The API endpoint `GET /...` returns a `200` status code with the correct payload.

### **6. 🌐 Out of Scope**
*(What we are explicitly NOT doing in this task.)*
- This task does not include...

---