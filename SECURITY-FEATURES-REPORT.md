# Security Features Report

**Project:** Real-time Student Activity Management (Node.js, Express, MongoDB, React)  
**Report type:** Full security feature inventory (existing implementations only)

---

## 1. Authentication & Authorization

### 1.1 Login system (username + password)

| Item | Detail |
|------|--------|
| **Purpose** | Authenticate users with username and password. |
| **Implementation** | `Backend/src/controllers/authControllers.js` — `signIn` |
| **Technology** | bcrypt.compare, JWT (jsonwebtoken), Session model, cookie-parser |
| **Flow** | Look up user by username → compare password with hashedPassword → create access token (JWT) and refresh token → store session → set refresh token in cookie, return access token in body. |
| **Security benefit** | Centralized, credential-based auth with hashed passwords and token-based sessions. |

### 1.2 Password hashing

| Item | Detail |
|------|--------|
| **Purpose** | Ensure passwords are never stored in plain text. |
| **Implementation** | `authControllers.js` (signUp, changePassword, resetPassword), `adminControllers.js` (createUser, updateUser), `ensureDefaultAdmin.js`, `ensureDefaultManager.js`, `scripts/createAdmin.js`, `scripts/createManager.js` |
| **Technology** | bcrypt (salt rounds: 10) |
| **Security benefit** | Protects passwords at rest; mitigates impact of DB compromise. |

### 1.3 Password reset (forgot password)

| Item | Detail |
|------|--------|
| **Purpose** | Allow users to reset password via email. |
| **Implementation** | `authControllers.js` — `requestPasswordReset`, `resetPassword`; `authRouters.js` — POST /forgot-password, POST /reset-password; `emailService.js` — sendPasswordResetEmail |
| **Technology** | Crypto random token, SHA-256 hashed token in DB, time-limited expiry (15 min), email link with token |
| **Security benefit** | Reset flow is token-based and time-limited; token stored hashed. |

### 1.4 User enumeration prevention (password reset)

| Item | Detail |
|------|--------|
| **Purpose** | Prevent attackers from discovering valid emails/usernames via forgot-password responses. |
| **Implementation** | `authControllers.js` — `requestPasswordReset` |
| **Behavior** | Same success message and HTTP 200 returned whether the account exists or not; no 404 or distinct message for “user not found”. |
| **Security benefit** | Reduces information leakage from the reset endpoint. |

### 1.5 Email verification

| Item | Detail |
|------|--------|
| **Purpose** | Verify email ownership before activating the account. |
| **Implementation** | `authControllers.js` — signUp (sends verification), `verifyEmail`; `emailService.js` — sendVerificationEmail; GET /verify-email |
| **Technology** | One-time token hashed (SHA-256) and stored; link in email with TTL (15 min) |
| **Security benefit** | Limits abuse of fake or wrong emails; signIn rejects unverified accounts. |

### 1.6 Role-based access control (RBAC)

| Item | Detail |
|------|--------|
| **Purpose** | Restrict API access by role (admin, manager, student, guest). |
| **Implementation** | `Middlewares/authMiddleware.js` — verifyToken, verifyAdmin, verifyManager, verifyStudent (buildRoleGuard); `server.js` — route mounting |
| **Technology** | JWT payload includes role; middleware checks req.user.role against allowed roles |
| **Route mapping** | /api/users → verifyToken; /api/admin → verifyAdmin; /api/manager → verifyManager; activities use verifyToken or optionalAuth where appropriate |
| **Security benefit** | Enforces least-privilege access per route group. |

### 1.7 JWT access token authentication

| Item | Detail |
|------|--------|
| **Purpose** | Authenticate API requests using a short-lived bearer token. |
| **Implementation** | `authMiddleware.js` — getTokenFromHeader, verifyToken; `authControllers.js` — signIn, refreshToken |
| **Technology** | jsonwebtoken, Authorization: Bearer &lt;token&gt;, ACCESS_TOKEN_SECRET from env |
| **Security benefit** | Stateless auth; token can expire (e.g. 30d) and be refreshed without re-login. |

### 1.8 Refresh token and server-side session

| Item | Detail |
|------|--------|
| **Purpose** | Issue new access tokens without re-entering password; revocable sessions. |
| **Implementation** | `authControllers.js` — signIn (creates session), signOut (deletes session), refreshToken; `models/Session.js` |
| **Technology** | Session collection (userId, refreshToken, expiresAt); TTL 14 days; cookie sends refresh token; refresh endpoint validates and issues new access token |
| **Security benefit** | Refresh token can be invalidated (signOut or DB delete); limits long-lived access if refresh is compromised. |

### 1.9 Secure cookie (refresh token)

| Item | Detail |
|------|--------|
| **Purpose** | Reduce risk of refresh token theft via XSS. |
| **Implementation** | `authControllers.js` — res.cookie("refreshToken", refreshToken, { httpOnly, secure, sameSite: "none", maxAge }) |
| **Technology** | httpOnly: true, secure: true, sameSite: "none" (for cross-origin frontend) |
| **Security benefit** | Cookie not readable by JavaScript; sent only over HTTPS when secure is true. |

### 1.10 Change password (authenticated)

| Item | Detail |
|------|--------|
| **Purpose** | Allow logged-in users to change their password. |
| **Implementation** | `authControllers.js` — changePassword; POST /change-password protected by verifyToken |
| **Technology** | Verify current password with bcrypt.compare; hash new password with bcrypt; update user |
| **Security benefit** | Requires current password; prevents takeover if only session is stolen. |

### 1.11 Password length enforcement

| Item | Detail |
|------|--------|
| **Purpose** | Enforce minimum password strength. |
| **Implementation** | `authControllers.js` (signUp, changePassword, resetPassword: min 8 chars); `adminControllers.js` (createUser: min 8 chars) |
| **Security benefit** | Reduces weak passwords and brute-force feasibility. |

### 1.12 Default admin/manager accounts

| Item | Detail |
|------|--------|
| **Purpose** | Bootstrap admin and manager accounts on first run. |
| **Implementation** | `utils/ensureDefaultAdmin.js`, `utils/ensureDefaultManager.js`; invoked after connectDB in `server.js` |
| **Technology** | Environment variables (DEFAULT_ADMIN_*, DEFAULT_MANAGER_*), bcrypt for password |
| **Security note** | Passwords are not logged to console. |

---

## 2. API & Network Security

### 2.1 CORS configuration

| Item | Detail |
|------|--------|
| **Purpose** | Restrict which origins can call the API. |
| **Implementation** | `server.js` — cors middleware with origin callback |
| **Technology** | cors package; allowedOrigins from CLIENT_URL and localhost (5173, 5174); credentials: true |
| **Security benefit** | Mitigates cross-origin abuse from arbitrary websites. |

### 2.2 Helmet security headers

| Item | Detail |
|------|--------|
| **Purpose** | Set secure HTTP response headers. |
| **Implementation** | `server.js` — app.use(helmet({ contentSecurityPolicy: false })) |
| **Technology** | helmet middleware |
| **Security benefit** | Headers such as X-Content-Type-Options, X-Frame-Options, etc. harden the server; CSP disabled for current frontend needs. |

### 2.3 Rate limiting (auth routes)

| Item | Detail |
|------|--------|
| **Purpose** | Limit authentication attempts per IP to reduce brute-force risk. |
| **Implementation** | `server.js` — authLimiter applied to /api/auth |
| **Technology** | express-rate-limit (windowMs: 15 min, max: 10 requests per IP) |
| **Security benefit** | Caps login/signup/forgot-password attempts per IP in a time window. |

### 2.4 Request body size limit

| Item | Detail |
|------|--------|
| **Purpose** | Limit JSON body size to reduce DoS and abuse. |
| **Implementation** | `server.js` — express.json({ limit: "1mb" }) |
| **Technology** | Express built-in |
| **Security benefit** | Rejects oversized payloads early. |

### 2.5 File upload validation

| Item | Detail |
|------|--------|
| **Purpose** | Restrict allowed file types and size for uploads. |
| **Implementation** | `utils/uploadMiddleware.js`; used in admin, manager, and activity routes |
| **Technology** | multer (diskStorage, fileFilter, limits) |
| **Rules** | Allowed: jpeg, jpg, png, gif, pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip, rar; both extension and mimetype checked; 50MB per file; uploadMultiple: max 10 files |
| **Security benefit** | Reduces risk of malicious file uploads and storage exhaustion. |

---

## 3. Data Protection

### 3.1 Token hashing (verification and reset)

| Item | Detail |
|------|--------|
| **Purpose** | Avoid storing raw tokens in the database. |
| **Implementation** | `authControllers.js` — hashToken (SHA-256); used for emailVerifyToken, passwordResetToken |
| **Technology** | Node crypto createHash("sha256") |
| **Security benefit** | Compromised DB does not expose usable verification or reset tokens. |

### 3.2 Environment variables for secrets

| Item | Detail |
|------|--------|
| **Purpose** | Keep secrets out of source code. |
| **Implementation** | All sensitive config (MONGODB_*, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, SMTP_*, DEFAULT_*_PASSWORD, etc.) read from process.env; dotenv.config() in server.js |
| **Technology** | dotenv |
| **Security benefit** | Secrets can differ per environment and are not committed. |

### 3.3 .env.example template

| Item | Detail |
|------|--------|
| **Purpose** | Document required env vars without real values. |
| **Implementation** | `Backend/.env.example` |
| **Security benefit** | Safe to commit; guides setup and reduces risk of committing .env. |

### 3.4 Excluding hashedPassword from responses

| Item | Detail |
|------|--------|
| **Purpose** | Never send password hashes to the client. |
| **Implementation** | authMiddleware (User.findById().select("-hashedPassword")); userControllers (authMe); adminControllers (listUsers, createUser — delete hashedPassword from response); managerControllers (student queries) |
| **Technology** | Mongoose .select("-hashedPassword") or object delete |
| **Security benefit** | Ensures hashedPassword is not exposed via API. |

### 3.5 Sensitive data not logged

| Item | Detail |
|------|--------|
| **Purpose** | Avoid logging passwords and tokens. |
| **Implementation** | ensureDefaultAdmin/ensureDefaultManager (no password in console); createManager (password not logged); emailService (log "To: [redacted]" when transporter missing) |
| **Security benefit** | Reduces credential leakage via log files or log aggregation. |

### 3.6 Safe error logging

| Item | Detail |
|------|--------|
| **Purpose** | Avoid logging full error objects (stack traces, request data). |
| **Implementation** | Auth, user, upload, manager controllers; authMiddleware; db.js; server.js — console.error(..., error?.message ?? "unknown") |
| **Security benefit** | Lowers risk of leaking sensitive data or internal details in logs. |

---

## 4. Vulnerability Protection

### 4.1 RegExp input escaping (search)

| Item | Detail |
|------|--------|
| **Purpose** | Prevent ReDoS and regex injection from user-controlled search. |
| **Implementation** | `utils/security.js` — escapeRegexForSearch; `adminControllers.js` and `managerControllers.js` — formatSearchRegex built on it |
| **Technology** | Escapes [.*+?^${}()|[\]\\] then new RegExp(escaped, "i") |
| **Security benefit** | User input is not used as raw regex; empty/invalid falls back to safe pattern. |

### 4.2 Status input sanitization

| Item | Detail |
|------|--------|
| **Purpose** | Allow only whitelisted status values. |
| **Implementation** | `adminControllers.js` — sanitizeStatusInput, resolveStatusFilter; `managerControllers.js` — sanitizeStatus |
| **Technology** | Whitelist (ACTIVITY_STATUSES, STATUS_FILTER_MAP) |
| **Security benefit** | Prevents invalid or injection-like status values in DB or logic. |

### 4.3 Input validation

| Item | Detail |
|------|--------|
| **Purpose** | Reject invalid or missing input before processing. |
| **Implementation** | authControllers (required fields, lengths); adminControllers (createUser: email format, password length); userControllers (updateUserProfile: email format, phone length) |
| **Technology** | Existence checks, length checks, regex for format |
| **Security benefit** | Reduces malformed data and potential injection paths. |

### 4.4 MongoDB (no SQL injection)

| Item | Detail |
|------|--------|
| **Purpose** | Use a data layer that does not rely on raw SQL. |
| **Implementation** | All persistence via Mongoose/MongoDB |
| **Technology** | Mongoose ODM, MongoDB |
| **Security benefit** | No SQL injection; queries are structured (with care for user-driven regex, addressed by escapeRegexForSearch). |

### 4.5 React frontend (XSS mitigation)

| Item | Detail |
|------|--------|
| **Purpose** | Reduce XSS risk in the UI. |
| **Implementation** | Frontend built with React |
| **Technology** | React’s default escaping in JSX |
| **Security benefit** | Rendered text is escaped by default unless dangerouslySetInnerHTML is used. |

### 4.6 Safe log message helper

| Item | Detail |
|------|--------|
| **Purpose** | Limit log size and avoid logging arbitrary user input. |
| **Implementation** | `utils/security.js` — safeLogMessage, MAX_LOG_STRING (200) |
| **Technology** | Truncation and type checks |
| **Security benefit** | Helps prevent log injection and oversized log entries. |

---

## 5. Logging & Monitoring

### 5.1 System log schema

| Item | Detail |
|------|--------|
| **Purpose** | Store audit-style logs (user, action, IP). |
| **Implementation** | `models/SystemLog.js` — schema with user, action, target, metadata (Map), ipAddress |
| **Technology** | Mongoose |
| **Security benefit** | Ready for recording sensitive actions and IP for forensics or monitoring. |

### 5.2 Admin dashboard overview

| Item | Detail |
|------|--------|
| **Purpose** | Let admins view high-level metrics and log-like data. |
| **Implementation** | `adminControllers.js` — getDashboardOverview; GET /admin/dashboard/overview (verifyAdmin) |
| **Technology** | Role-protected API |
| **Security benefit** | Log/overview data restricted to admin role. |

---

## 6. Backup & Recovery

### 6.1 Security and backup documentation

| Item | Detail |
|------|--------|
| **Purpose** | Document backup, restore, and security practices. |
| **Implementation** | `Backend/SECURITY.md` |
| **Contents** | mongodump/mongorestore examples; Atlas backup note; reminders on secrets, TLS, logs, debug routes |
| **Security benefit** | Ensures operators can recover data and follow basic security practices. |

### 6.2 TLS recommendation for MongoDB

| Item | Detail |
|------|--------|
| **Purpose** | Encourage encrypted DB connections in production. |
| **Implementation** | `SECURITY.md` and `Backend/.env.example` (comments) |
| **Security benefit** | Reduces risk of DB traffic interception. |

---

## 7. Dependency Overview (security-related)

| Package | Typical use |
|---------|-------------|
| bcrypt | Password hashing |
| jsonwebtoken | JWT sign/verify for access tokens |
| cookie-parser | Parse refresh token cookie |
| cors | CORS policy |
| helmet | Security headers |
| express-rate-limit | Auth rate limiting |
| dotenv | Load .env for secrets |
| multer | File upload with filters and limits |
| mongoose | MongoDB ODM (structured queries) |

---

## 8. Route Protection Summary

| Path prefix | Middleware | Allowed roles |
|-------------|------------|----------------|
| /api/auth | authLimiter (rate limit) | Public (signin, signup, forgot, reset, refresh, verify-email); change-password requires verifyToken |
| /api/activities | optionalAuth or verifyToken per route | Public read or authenticated (register, checkin, upload) |
| /api/users | verifyToken | Any authenticated user |
| /api/admin | verifyAdmin | admin |
| /api/manager | verifyManager | admin, manager |

---

## 9. Summary

The project implements a broad set of security features across authentication (login, hashing, reset, verification, RBAC, JWT, refresh sessions, secure cookies, password policy), API and network (CORS, Helmet, rate limiting, body limit, file upload validation), data protection (token hashing, env-based secrets, response sanitization, safe logging), and vulnerability mitigation (regex escaping, status sanitization, input validation, MongoDB, React escaping). Logging and monitoring are supported by a system log schema and an admin-only dashboard; backup and TLS are covered in documentation. This report only describes features that are present in the codebase and does not suggest or assume additional controls.
