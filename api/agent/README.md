# Edufy Agent API

Controlled server-side bridge for ChatGPT Work or another automation layer.

## Required Environment Variables

Set these in Vercel or in the local server environment:

```env
EDUFY_AGENT_API_TOKEN=replace-with-a-long-random-token
FIREBASE_PROJECT_ID=edufy-makerlab
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@edufy-makerlab.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

You can also provide the complete Firebase service account JSON as base64:

```env
FIREBASE_SERVICE_ACCOUNT_BASE64=...
```

## Authentication

Every request must include:

```http
Authorization: Bearer <EDUFY_AGENT_API_TOKEN>
x-edufy-organization-id: makerlab-academy
```

Optional audit metadata:

```http
x-edufy-agent-actor: chatgpt-work
x-edufy-agent-tool: search_students
x-request-id: unique-request-id
```

## Module 1: Students

### Health

```http
GET /api/agent/health
```

### Search Students

```http
GET /api/agent/students/search?q=anas&limit=10
GET /api/agent/students/search?phone=0612345678
```

Search checks student name, parent name, email, parent phone, school, and login emails/usernames.

### Get Student

```http
GET /api/agent/students/{student_id}
```

### Get Student Account

```http
GET /api/agent/students/{student_id}/account
```

Returns the student, enrollments, payments, and a balance summary.

## Audit Logs

Every successful read action writes to:

```text
agent_audit_logs
```

Sensitive write modules should keep using this audit collection and add approval fields before modifying business records.
