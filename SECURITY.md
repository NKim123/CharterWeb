# CharterAI Security Documentation

## 🔒 Security Review & Improvements

This document outlines the comprehensive security review and improvements made to CharterAI to protect against common web application vulnerabilities.

## 🛡️ Security Headers Implemented

### Content Security Policy (CSP)
- **Implemented**: Strict CSP headers in `vercel.json`
- **Protection**: Prevents XSS attacks by controlling resource loading
- **Coverage**: Scripts, styles, images, connections, frames

### Security Headers
- **X-Content-Type-Options**: `nosniff` - Prevents MIME type sniffing
- **X-Frame-Options**: `DENY` - Prevents clickjacking attacks  
- **X-XSS-Protection**: `1; mode=block` - Browser XSS filtering
- **Strict-Transport-Security**: Forces HTTPS connections
- **Referrer-Policy**: Controls referrer information leakage
- **Permissions-Policy**: Restricts access to sensitive browser APIs

## 🌐 CORS Security

### Previous Issues
- ❌ Wildcard origin (`*`) allowed any domain to make requests
- ❌ Could enable CSRF and unauthorized API access

### Improvements
- ✅ **Restricted Origins**: Only allow specific domains
- ✅ **Environment-based Configuration**: Dynamic origin validation
- ✅ **Credential Support**: Secure cookie handling
- ✅ **Max-Age Caching**: Reduces preflight requests

```typescript
// supabase/functions/_shared/cors.ts
export function getCorsHeaders(origin: string | null): Record<string, string>
```

## 🚫 Input Validation & Sanitization

### New Security Utilities (`src/lib/security.ts`)

#### HTML Sanitization
```typescript
sanitizeHtml(input: string): string
```
- Encodes dangerous HTML entities
- Prevents XSS in user-generated content

#### Prompt Injection Protection
```typescript
sanitizePromptInput(input: string): string
```
- Filters dangerous prompt injection patterns
- Protects AI models from manipulation
- Limits input length to prevent overflow

#### Location Input Validation
```typescript
sanitizeLocation(location: string): string
```
- Removes dangerous characters
- Validates input format and length

#### JWT Token Validation
```typescript
isValidJWT(token: string): boolean
extractUserIdFromJWT(token: string): string | null
```
- Validates JWT structure and format
- Safe token parsing with error handling

## ⏱️ Rate Limiting

### Client-Side Rate Limiting
```typescript
class ClientRateLimit
```
- **Chat Messages**: 10 messages per 5 minutes
- **Login Attempts**: 5 attempts per 15 minutes
- **Storage**: Uses localStorage for persistence

### Server-Side Rate Limiting
- **Trip Generation**: 10 trips per hour per user
- **Chat API**: 20 messages per 15 minutes per user
- **In-memory**: Map-based tracking (consider Redis for production)

## 🔐 Authentication & Authorization

### Magic Link Security
- **Email Validation**: Strict format checking
- **Input Sanitization**: Remove dangerous characters
- **Rate Limiting**: Prevent abuse of email sending
- **Error Sanitization**: Don't leak sensitive information

### Admin Access Control
- **Multi-layer Verification**: Client + server-side checks
- **Role Validation**: Check both user_metadata and app_metadata
- **Database Verification**: Test actual admin table access
- **Audit Logging**: Log unauthorized access attempts

### JWT Security
- **Structure Validation**: Verify token format
- **Safe Parsing**: Handle malformed tokens gracefully
- **User ID Extraction**: Secure payload reading

## 🤖 AI Security (Prompt Injection Prevention)

### Chat Function Protection
```typescript
// supabase/functions/chat_guide/index.ts
```

#### Input Validation
- **Message Array Validation**: Type and length checking
- **Content Sanitization**: Remove injection patterns
- **Length Limits**: Prevent token overflow

#### Dangerous Pattern Detection
- System instructions bypass attempts
- Role manipulation attempts
- Context switching patterns
- Instruction forgetting attempts

#### Output Filtering
- **Content Filtering**: Remove sensitive data patterns
- **Length Limits**: Maximum response size
- **Safe Streaming**: Sanitize real-time responses

### Trip Planning Protection
```typescript
// supabase/functions/plan_trip/index.ts
```
- **Comprehensive Input Validation**: All form fields
- **Location Sanitization**: Remove dangerous characters
- **Species Name Limits**: Prevent injection via species names

## 🗄️ Database Security

### Row Level Security (RLS)
- **Trips Table**: Users only see their own trips
- **Profiles Table**: Public read, owner write
- **Admin Tables**: Admin-only access with role checking
- **Usage Tracking**: User-specific data isolation

### SQL Injection Prevention
- **Parameterized Queries**: All database operations use Supabase client
- **Input Validation**: Server-side validation before DB operations
- **Type Safety**: TypeScript interfaces for all data structures

## 📊 Error Handling & Information Disclosure

### Secure Error Messages
```typescript
function getSafeErrorMessage(message: string): string
```
- **Client Errors**: Allow specific validation messages
- **Server Errors**: Generic messages to prevent information leakage
- **Rate Limit Errors**: Clear user guidance
- **System Errors**: Hidden from end users

### Logging Security
- **Sensitive Data Masking**: Email, keys, tokens automatically masked
- **Length Limits**: Prevent log overflow attacks
- **Safe Characters**: Filter dangerous log content
- **Error Sanitization**: Clean stack traces

## 🔍 Data Validation

### Frontend Validation (`src/schemas/trip.ts`)
- **Zod Schemas**: Comprehensive type and format validation
- **Length Limits**: All input fields have maximum lengths
- **Format Validation**: Date, time, email format checking
- **Range Validation**: Numeric inputs have min/max values

### Backend Validation
- **Redundant Validation**: Never trust client-side validation
- **Type Checking**: Verify all input types
- **Business Logic**: Check valid combinations
- **Sanitization**: Clean all inputs before processing

## 🌍 Environment Security

### Environment Variables
- **No Hardcoded Secrets**: All sensitive data in environment
- **Client vs Server**: Appropriate variable scoping
- **VITE_ Prefix**: Only safe variables exposed to frontend

### Production Configuration
- **ALLOWED_ORIGINS**: Set production domains
- **PRODUCTION_URL**: Configure for deployment
- **Rate Limit Settings**: Adjust for production traffic

## 📱 Client-Side Security

### XSS Prevention
- **Content Sanitization**: All user content escaped
- **Safe Rendering**: React's built-in XSS protection
- **Dynamic Content**: Sanitize all dynamic strings
- **URL Validation**: Validate external links

### Storage Security
- **IndexedDB**: Trip data stored locally (consider encryption)
- **localStorage**: Rate limiting data only
- **Session Storage**: Avoid for sensitive data
- **Cleanup**: Clear sensitive data on logout

## 🚀 Production Security Checklist

### Before Deployment
- [ ] Set ALLOWED_ORIGINS environment variable
- [ ] Configure PRODUCTION_URL 
- [ ] Review and test all rate limits
- [ ] Verify CSP headers work with all features
- [ ] Test admin access controls
- [ ] Validate error message sanitization

### Monitoring
- [ ] Set up error log monitoring
- [ ] Monitor rate limit violations
- [ ] Track unauthorized access attempts
- [ ] Review usage patterns for anomalies

### Regular Maintenance
- [ ] Update dependencies regularly
- [ ] Review and rotate API keys
- [ ] Audit admin user list
- [ ] Check for new security vulnerabilities

## 🔧 Development Best Practices

### Code Review
- Always sanitize user inputs
- Use TypeScript for type safety
- Validate on both client and server
- Follow principle of least privilege

### Testing
- Test with malicious inputs
- Verify rate limiting works
- Test unauthorized access scenarios
- Validate error handling

### Documentation
- Document all security measures
- Keep this file updated
- Train team on security practices
- Regular security reviews

## 📞 Security Contact

For security issues or questions:
- Review this documentation first
- Follow responsible disclosure
- Report vulnerabilities privately
- Include reproduction steps

## 🔄 Change Log

### 2024-01-XX - Initial Security Review
- Added comprehensive security headers
- Implemented input sanitization
- Added rate limiting
- Enhanced authentication security
- Improved error handling
- Added prompt injection protection
- Strengthened CORS policy
- Enhanced admin access controls

---

*This document should be reviewed and updated regularly as the application evolves.*