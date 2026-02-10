# Security Guide

OctateCode implements practical security to protect your code and API credentials.

## API Key Management

### Where Keys Are Stored

API keys are stored in VS Code's built-in storage service (`StorageService`):
- Stored locally in your user profile directory
- Never transmitted to OctateCode servers
- Only sent to the specific LLM provider when making requests
- Persisted encrypted in `user-data/globalStorage`

### How to Set API Keys

1. Open Command Palette: `Ctrl+Shift+P`
2. Run: `Void: Settings`
3. Select an LLM provider
4. Paste your API key
5. Keys are saved immediately

### API Key Security Best Practices

**DO:**
- Use provider-specific API keys (not master account)
- Rotate keys periodically in provider dashboard
- Monitor usage for suspicious activity
- Keep keys in your user profile only
- Use environment variables for team/CI setups

**DON'T:**
- Commit API keys to git repository
- Share keys via chat or email
- Use master account keys in development
- Store in config files that might be shared
- Paste keys into code samples

## What Gets Shared

### Explicitly Shared with LLMs

Only what you ask:
- Selected code when you ask a question
- Files you drag into chat window
- Current file context you mention
- `@file` references you add
- `@folder` references you include

### Never Sent to LLMs

- API keys or credentials
- Other open files (unless you include them)
- File system structure (unless you include it)
- Terminal history
- Entire workspace

### How to Control Context

```
# Share specific code
Select code → Type question in chat → LLM receives only selection

# Include a file
Type "@filename.ts" in chat → LLM gets full file

# Include a folder
Type "@folder-name/" in chat → LLM gets all files in folder

# Reference current file
Ask question while file is open → Type "@current" to include
```

## Collaboration Security

### P2P Model (Default)

When using collaboration:
- Peers connect directly (P2P)
- Room ID is the only secret
- No central server (unless you deploy one)
- Data flows only between connected peers

### Room Management

**Public Rooms:**
- Anyone with room ID can join
- Use for open collaboration

**Private Rooms:**
- Share room ID only with trusted people
- Scope code context shared

**Leaving a Room:**
- Click "Leave Room" to disconnect
- Stops receiving peer updates
- Data already synced stays local

### Sensitive Data in Rooms

**Don't share:**
- Passwords or credentials
- Database connection strings
- Customer/personal data (PII)
- Private keys or tokens

**Safe to share:**
- Source code
- Error logs
- Architecture questions
- Learning materials

## Local-First Architecture

### What Stays on Your Machine

- All source code files
- All settings and preferences
- LLM chat history
- Collaboration snapshots
- Workspace configuration

### Network Access

OctateCode connects to:
1. **LLM Providers** (OpenAI, Anthropic, etc.)
   - Only when you ask a question
   - Only code you explicitly share
   - Use provider's privacy policy

2. **MCP Servers** (if configured)
   - Optional integration for tools
   - Runs in main process
   - You control what data is shared

3. **Collaboration Peers** (if enabled)
   - Direct peer connection
   - File changes and chat messages
   - Room ID is access control

4. **Analytics** (optional, can be disabled)
   - Feature usage (anonymized)
   - Error telemetry
   - Settings → Advanced → Disable metrics

## Configuration Files

### Where Settings Are Stored

- `~/.vscode/` - VS Code user data
- `~/.octatecode/` - OctateCode-specific settings
- Workspace `.vscode/settings.json` - Per-project config

### Files Never to Commit

```gitignore
# API keys and credentials
.env
.env.local
.env.*.local

# User settings with API keys
~/.vscode/

# Third-party credentials
credentials.json
auth.json
*.pem
*.key
```

## Provider Security

### Check Provider's Policies

Each LLM provider has its own security model:

**OpenAI:**
- HTTPS encryption
- GDPR compliant (data deleted after 30 days by default)
- SOC 2 Type II certified
- Privacy policy: openai.com/privacy

**Anthropic:**
- HTTPS encryption
- GDPR compliant
- SOC 2 Type II certified
- Data privacy policy: claude.ai/privacy

**Ollama (Local):**
- Runs on your machine
- No internet required
- No external data transmission
- Full control over everything

**Other Providers:**
Check their respective documentation for:
- Data residency
- GDPR/CCPA compliance
- Encryption methods
- Retention policies
- Audit logging

## Self-Hosted Setup

For maximum security, run everything locally:

### 1. Install Ollama
```bash
# macOS
brew install ollama

# Windows
# Download from ollama.ai

# Start Ollama
ollama serve
```

### 2. Pull a Model
```bash
ollama pull llama2
ollama pull mistral
```

### 3. Configure OctateCode
- Settings → LLM Provider → Select "Ollama"
- Model → Select llama2 or mistral
- API URL: `http://127.0.0.1:11434` (default)

### 4. No Internet Required
- All processing stays on your machine
- No API keys needed
- No external data transmission

## Collaboration Security Checklist

- [ ] Store API keys securely (not in git)
- [ ] Review provider's privacy policy
- [ ] Know who's in your collaboration rooms
- [ ] Don't share sensitive data via chat
- [ ] Leave rooms when not collaborating
- [ ] Use local models for sensitive code
- [ ] Monitor API usage for anomalies

## Network & Encryption

### Over HTTPS

All provider API calls use:
- TLS 1.2+ encryption
- Certificate validation
- Standard HTTPS security

### Collaboration Protocol

P2P connections between peers use:
- WebRTC (encrypted by default)
- Room ID as access control
- Host relaying only (if configured)

### Local Execution

Self-hosted models:
- Runs on localhost
- No network exposure (unless configured)
- Full control over processes

## Audit & Monitoring

### What OctateCode Logs

- LLM requests sent (for billing)
- Features used (for analytics)
- Errors encountered (for debugging)
- User actions (for analytics)

### Disable Analytics

Settings → Advanced → Uncheck "Share usage analytics"

### Check Logs

Console logs are in:
- Mac/Linux: `~/.vscode/`
- Windows: `%APPDATA%\Code\`

## Security Incident Response

### Found a vulnerability?

1. **Don't open a public issue**
2. **Email security details privately** to the project maintainers
3. **Include reproduction steps**
4. **Allow 90 days for fix** before public disclosure

### Report Security Issues

Contact the project maintainers with:
- Description of vulnerability
- How to reproduce it
- Potential impact
- Suggested fix (if you have one)

## Summary

OctateCode prioritizes security through:

✅ Local storage of all code and settings
✅ Optional provider integrations with encryption
✅ P2P collaboration without central server
✅ No forced data transmission
✅ User control over what context is shared
✅ Support for self-hosted local models
✅ Standard TLS encryption for network requests

For questions about specific provider security, check their privacy documentation. For OctateCode-specific security concerns, refer to the main README or project documentation.
