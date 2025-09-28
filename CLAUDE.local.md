# **Local Project Context & Instructions**

This file contains sensitive or local machine-specific information for the AI.
It is gitignored and must not be shared.

## **1. Environment Variable (`.env`) Handling**

- **Rule**: The single source of truth for all local development environment variables is the `.env` file located at the **monorepo root**.
- **My Location**: `/Users/liumingwei/01-project/12-liumw/09-baokuan-jieqouqi/.env`
- **Your Action**: When a script or command (like `prisma migrate` or `docker-compose up`) needs environment variables, you must ensure you are configured to read them from this single root file. Our project scripts (`start-dev.sh`, `package.json` scripts) have already been configured to do this.

## **2. Python Virtual Environment (`venv`) Usage**

- **Rule**: When you need to run any Python or `pip` commands for the `11-baokuan-jieqouqi-ai` project, you **must** first activate its virtual environment.
- **Your Action**: Before running Python-related commands, you must first execute this command from the monorepo root:
  ```bash
  source 11-baokuan-jieqouqi-ai/venv/bin/activate