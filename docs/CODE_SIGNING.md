# Code Signing Setup Guide

This guide walks through setting up code signing for macOS and Windows binaries. Code signing ensures users can trust your application and prevents OS security warnings.

## Overview

| Platform | Required? | Impact if Skipped |
|----------|-----------|-------------------|
| **macOS** | Recommended | App shows "developer cannot be verified" warning; users must right-click → Open |
| **Windows** | Optional | App shows "Windows protected your PC" warning; users must click "More info" → Run anyway |
| **Linux** | Not needed | AppImage works without signing |

---

## macOS Code Signing

### Prerequisites

1. **Apple Developer Account** (required)
   - Enroll at: https://developer.apple.com/programs/
   - Cost: $99/year
   - Processing time: 1-2 business days

2. **Xcode Command Line Tools** (required on local Mac)
   ```bash
   xcode-select --install
   ```

### Step 1: Generate Developer ID Certificate

1. Go to: https://developer.apple.com/account/resources/certificates/list
2. Click **+** (Create a New Certificate)
3. Select: **Developer ID Application**
4. Click **Continue**
5. Follow CSR instructions:
   ```bash
   # On macOS: Open Keychain Access
   # Menu: Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
   # Email: your_email@example.com
   # Common Name: CryptForge Developer
   # Request: Saved to disk
   # Save as: CertificateSigningRequest.certSigningRequest
   ```
6. Upload the `.certSigningRequest` file
7. Click **Continue** → **Download**
8. Double-click downloaded certificate to add to Keychain

### Step 2: Export Certificate as .p12

1. Open **Keychain Access**
2. Select **login** keychain (left sidebar)
3. Select **My Certificates** category
4. Find: "Developer ID Application: [Your Name]"
5. Right-click → **Export "Developer ID Application: ..."**
6. Save as: `CryptForge_Developer_ID.p12`
7. Set a password (remember this—you'll need it)
8. Click **Save**
9. Enter Mac password to allow export

### Step 3: Convert Certificate to Base64

```bash
# On macOS or Linux
base64 -i CryptForge_Developer_ID.p12 | pbcopy
# Certificate is now in clipboard

# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("CryptForge_Developer_ID.p12")) | Set-Clipboard
```

### Step 4: Add Secrets to GitHub

1. Go to: https://github.com/saagar210/CryptForge/settings/secrets/actions
2. Click **New repository secret**

**Add these 4 secrets:**

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 file | From Step 3 |
| `APPLE_CERTIFICATE_PASSWORD` | Password you set in Step 2 | Your chosen password |
| `APPLE_SIGNING_IDENTITY` | Certificate name | See Step 5 below |
| `APPLE_TEAM_ID` | 10-character team ID | See Step 6 below |

### Step 5: Get Signing Identity

```bash
# On macOS:
security find-identity -v -p codesigning

# Output example:
#   1) ABCD1234EFGH5678IJKL9012MNOP3456QRST7890 "Developer ID Application: John Doe (ABCD1234XY)"

# Copy the FULL name in quotes:
# "Developer ID Application: John Doe (ABCD1234XY)"
```

Add this as `APPLE_SIGNING_IDENTITY` secret.

### Step 6: Get Team ID

1. Go to: https://developer.apple.com/account
2. Click **Membership** (left sidebar)
3. Find **Team ID** (10 characters, e.g., `ABCD1234XY`)
4. Copy and add as `APPLE_TEAM_ID` secret

### Step 7: Update tauri.conf.json (Optional)

The release workflow uses environment variables, but you can also configure in `tauri.conf.json`:

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": null,
      "entitlements": null,
      "exceptionDomain": null,
      "frameworks": [],
      "providerShortName": null,
      "signingIdentity": "Developer ID Application: [Your Name] ([Team ID])"
    }
  }
}
```

**Note:** Leaving `null` is fine; the workflow will use environment variables.

---

## Windows Code Signing (Optional)

### Prerequisites

1. **Windows Code Signing Certificate**
   - Purchase from: DigiCert, GlobalSign, or Sectigo
   - Cost: $100-$500/year
   - **OR** use self-signed cert (free but shows warnings)

2. **Certificate must be exportable as .pfx**

### Step 1: Export Certificate as .pfx

If you already have a certificate:

```powershell
# On Windows (PowerShell as Admin)
# Export from Certificate Store
certmgr.msc
# Navigate to: Personal → Certificates
# Right-click your code signing cert → All Tasks → Export
# Select: Yes, export the private key
# Format: Personal Information Exchange (.pfx)
# Set password
# Save as: CryptForge_Signing.pfx
```

### Step 2: Convert to Base64

```powershell
# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\CryptForge_Signing.pfx")) | Set-Clipboard
```

### Step 3: Add Secrets to GitHub

1. Go to: https://github.com/saagar210/CryptForge/settings/secrets/actions
2. Add these 2 secrets:

| Secret Name | Value |
|-------------|-------|
| `WINDOWS_CERTIFICATE` | Base64-encoded .pfx file |
| `WINDOWS_CERTIFICATE_PASSWORD` | .pfx password |

### Step 4: Update tauri.conf.json

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.comodoca.com"
    }
  }
}
```

**Note:** `certificateThumbprint` can be `null`; workflow will auto-detect from environment.

---

## Verification

### Verify macOS Signing Locally

```bash
# After building locally:
codesign --verify --verbose /Applications/CryptForge.app

# Expected output:
# /Applications/CryptForge.app: valid on disk
# /Applications/CryptForge.app: satisfies its Designated Requirement
```

### Verify Windows Signing Locally

```powershell
# After building:
signtool verify /pa CryptForge_0.1.0_x64-setup.msi

# Expected output:
# Successfully verified: CryptForge_0.1.0_x64-setup.msi
```

---

## Troubleshooting

### macOS: "No identity found"

**Cause:** Certificate not in Keychain or expired

**Fix:**
```bash
# List all code signing identities:
security find-identity -v -p codesigning

# If empty, re-download certificate from developer.apple.com
# Double-click to add to Keychain
```

### macOS: "User interaction is not allowed"

**Cause:** GitHub Actions can't access Keychain

**Fix:** This is expected in CI; the workflow handles it via environment variables

### Windows: "Certificate not found"

**Cause:** .pfx file corrupted or password wrong

**Fix:**
- Re-export .pfx with correct password
- Verify Base64 encoding is clean (no newlines)

### GitHub Actions: "Error loading certificate"

**Cause:** Base64 secret is malformed

**Fix:**
```bash
# Re-encode without newlines:
base64 -i cert.p12 | tr -d '\n' | pbcopy
```

---

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Account | $99 | Annual |
| Windows Code Signing Cert | $100-$500 | Annual |
| **Total (both platforms)** | **$199-$599** | **Annual** |

**Budget Option:** Skip Windows signing for MVP; users can still install (just shows warning).

---

## Security Best Practices

1. **Never commit certificates to Git**
   - Always use GitHub Secrets
   - Never hardcode passwords

2. **Rotate certificates annually**
   - Set calendar reminder
   - Update GitHub Secrets before expiry

3. **Use separate certs for dev/prod**
   - Dev: Self-signed (local testing)
   - Prod: Official cert (releases)

4. **Audit secret access**
   - GitHub → Settings → Secrets → Audit log
   - Check who accessed secrets

---

## Next Steps

After setting up secrets:

1. ✅ Verify all 4 macOS secrets are in GitHub (or 2 Windows secrets if using)
2. ✅ Proceed to create release workflow (`.github/workflows/release.yml`)
3. ✅ Test with: `git tag v0.1.0-alpha1 && git push origin v0.1.0-alpha1`
4. ✅ Check GitHub Actions tab for release build
5. ✅ Download and verify signed binaries

---

## Related Files

- `.github/workflows/release.yml` — Release workflow (uses these secrets)
- `tauri.conf.json` — Tauri bundle config
- `docs/RELEASE.md` — Release process documentation
