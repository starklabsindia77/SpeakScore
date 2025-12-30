# SpeakScore SaaS Platform Documentation

SpeakScore is a modern, multi-tenant AI-driven English speaking assessment platform designed for recruiters and organizations to evaluate candidates' language proficiency efficiently and at scale.

## 1. Feature List

### 🛠️ Platform Administration (Super Admin)
- **Organization Provisioning**: Real-time creation of new organization accounts with dedicated database schemas.
- **Tenant Management**: List, monitor, and control all organizations on the platform.
- **Credit Allocation**: Manage credit balances for organizations to control assessment volume.
- **Service Control**: Quickly enable or disable organizations to manage access and subscriptions.
- **Platform Audit Logs**: View global logs for system events, provisioning, and high-level security audits.

### 🏢 Organization Management (Org Admin)
- **Dynamic RBAC**: Create custom roles (e.g., "Senior HR", "Junior Recruiter") with granular permissions.
- **Custom Terminology**: Define internal company terminology for user titles.
- **Team Management**: Invite team members and manage their access levels.
- **Credit Visibility**: Monitor organization-wide credit usage and balance.

### 📋 Assessment Operations (Recruiter)
- **Test Creation**: Design speaking assessments with custom question sets.
- **Candidate Management**: Invite candidates via secure, tokenized links.
- **Real-time Monitoring**: Track candidate progress from "Invited" to "Submitted".
- **AI-Powered Scoring**: Automatic evaluation of candidate responses for fluency, relevance, and accuracy.
- **Review Queue**: Access and review candidate recordings and transcripts for manual verification.

### 🎤 Candidate Experience
- **Browser-based Assessment**: No software installation required; works directly in modern web browsers.
- **Audio Recording**: Seamless integration for recording spoken responses to prompts.
- **Submission Flow**: Clear, step-by-step assessment journey from instructions to completion.

---

## 2. Core Architecture Highlights

### 🔒 Schema-per-Tenant Isolation
SpeakScore uses a high-security multi-tenant model. While all data lives in a single PostgreSQL database, each organization has its own **isolated schema** (`tenant_xyz`).
- **Security**: Data leakage between organizations is prevented at the database level.
- **Performance**: Queries are scoped to specific schemas, optimizing search and retrieval.
- **Maintenance**: Tenant-specific maintenance and migrations can be handled independently.

### ⚡ Technical Stack
- **Backend**: Fastify (Node.js) for high-performance API delivery.
- **Database**: PostgreSQL (Kysely ORM) with Redis for caching and background tasks.
- **Storage**: S3-compatible storage (e.g., Minio/AWS S3) for secure candidate audio recordings.
- **Frontend**: React with Tailwind CSS for a premium, responsive user interface.
- **Architecture**: Monorepo using `pnpm` workspaces for unified development of API, Web, and Shared packages.

---

## 3. User Roles & Capabilities

| Feature | Super Admin | Org Admin | Recruiter | Candidate |
| :--- | :---: | :---: | :---: | :---: |
| Create Organizations | ✅ | ❌ | ❌ | ❌ |
| Allocate Credits | ✅ | ❌ | ❌ | ❌ |
| Create Custom Roles | ❌ | ✅ | ❌ | ❌ |
| Manage Team | ❌ | ✅ | ❌ | ❌ |
| Create Tests | ❌ | ✅ | ✅ | ❌ |
| Invite Candidates | ❌ | ✅ | ✅ | ❌ |
| Take Assessment | ❌ | ❌ | ❌ | ✅ |
| View Platform Logs | ✅ | ❌ | ❌ | ❌ |
