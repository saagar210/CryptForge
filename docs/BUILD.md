# Building CryptForge from Source

This guide walks through setting up a development environment and building CryptForge from source on Windows, macOS, and Linux.

## Prerequisites

### All Platforms

1. **Node.js 18+** and **npm 9+**
   - Download: https://nodejs.org/
   - Verify: `node --version` (should be ≥18.0.0)
   - Verify: `npm --version` (should be ≥9.0.0)

2. **Rust 1.70+**
   - Install: https://rustup.rs/
   - Follow platform-specific instructions below
   - Verify: `rustc --version` (should be ≥1.70.0)

3. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

---

### Linux-Specific Prerequisites

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install -y \
  libglib2.0-dev \
  pkg-config \
  libssl-dev \
  libgtk-3-dev \
  libwebkit2gtk-4.0-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  build-essential \
  curl \
  wget \
  file
```

**Fedora/RHEL:**

```bash
sudo dnf install -y \
  glib2-devel \
  pkg-config \
  openssl-devel \
  gtk3-devel \
  webkit2gtk4.0-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  gcc \
  gcc-c++ \
  curl \
  wget \
  file
```

**Arch:**

```bash
sudo pacman -S --needed \
  glib2 \
  pkg-config \
  openssl \
  gtk3 \
  webkit2gtk \
  libappindicator-gtk3 \
  librsvg \
  base-devel \
  curl \
  wget \
  file
```

---

### macOS-Specific Prerequisites

1. **Xcode Command Line Tools:**

```bash
xcode-select --install
```

2. **(Optional) Homebrew:**

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

No additional packages needed; macOS has all required libraries.

---

### Windows-Specific Prerequisites

1. **Visual Studio Build Tools:**
   - Download: https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++" workload
   - OR: Install Visual Studio Community with C++ support

2. **WebView2 Runtime** (auto-installed by Tauri):
   - Usually pre-installed on Windows 10/11
   - If missing: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

3. **Rust** (via rustup-init.exe):
   - Download: https://rustup.rs/
   - Run installer, follow prompts
   - Select default installation

---

## Clone Repository

```bash
git clone https://github.com/saagar210/CryptForge.git
cd CryptForge
```

---

## Install Dependencies

### Install Node.js Dependencies

```bash
npm install
```

**Expected output:**
```
added 234 packages, and audited 235 packages in 8s

52 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

### Install Tauri CLI (if not already installed)

```bash
# Install globally (recommended):
npm install -g @tauri-apps/cli

# Or use npx (no global install):
npx tauri --version
```

---

## Development Build (Hot Reload)

### Start Dev Server

```bash
npm run tauri dev
```

**What happens:**
1. Vite dev server starts on `http://localhost:1420`
2. React app builds (fast, incremental)
3. Rust backend compiles (slow on first run, fast after)
4. Tauri app window opens
5. Changes to frontend → instant hot reload
6. Changes to backend → Rust recompiles (5-15 seconds)

**Expected output:**
```
> tauri dev

  Running BeforeDevCommand (`npm run dev`)

     vite v6.0.0 dev server running at:

     ➜  Local:   http://localhost:1420/
     ➜  Network: use --host to expose
     ➜  press h + enter to show help

     Compiling cryptforge v0.1.0 (/home/user/CryptForge/src-tauri)
        Finished `dev` profile [unoptimized + debuginfo] target(s) in 34.21s
     Running `target/debug/cryptforge`
```

**Troubleshooting:**

- **Port 1420 already in use:** Kill other Vite process or change port in `tauri.conf.json`
- **Rust compile error:** Check Rust version (`rustc --version`), update with `rustup update`
- **glib error (Linux):** Re-run dependency install commands above

---

## Production Build

### Build Optimized Binary

```bash
# Build frontend:
npm run build

# Build Tauri app:
npm run tauri build
```

**What happens:**
1. TypeScript compiles
2. Vite builds optimized React bundle (minified, tree-shaken)
3. Rust compiles in release mode (optimized, stripped)
4. Tauri creates platform-specific installers

**Expected output:**
```
    Finished 2 bundles at:
        /home/user/CryptForge/src-tauri/target/release/bundle/deb/cryptforge_0.1.0_amd64.deb
        /home/user/CryptForge/src-tauri/target/release/bundle/appimage/cryptforge_0.1.0_amd64.AppImage
```

**Output Locations:**

| Platform | Path |
|----------|------|
| **Linux** | `src-tauri/target/release/bundle/appimage/cryptforge_*.AppImage` |
| **Linux** | `src-tauri/target/release/bundle/deb/cryptforge_*.deb` |
| **macOS** | `src-tauri/target/release/bundle/dmg/CryptForge_*.dmg` |
| **macOS** | `src-tauri/target/release/bundle/macos/CryptForge.app` |
| **Windows** | `src-tauri/target/release/bundle/msi/CryptForge_*.msi` |
| **Windows** | `src-tauri/target/release/bundle/nsis/CryptForge_*-setup.exe` |

**Build times:**

- **First build:** 5-10 minutes (downloads dependencies, compiles everything)
- **Incremental builds:** 1-3 minutes (only recompiles changed code)
- **CI builds:** 8-12 minutes (with caching)

---

## Testing

### Run All Tests

```bash
npm run verify
```

This runs:
1. `npm run verify:frontend` — TypeScript strict mode check + production build
2. `npm run verify:rust` — Cargo test (160 unit tests)

### Run Frontend Tests Only

```bash
npm run verify:frontend
```

**Output:**
```
> tsc && vite build

vite v6.0.0 building for production...
✓ 234 modules transformed.
dist/index.html                   0.51 kB │ gzip:  0.32 kB
dist/assets/index-Cw8p9Qja.css    12.45 kB │ gzip:  3.21 kB
dist/assets/index-B2nPQx7a.js    187.23 kB │ gzip: 61.02 kB
✓ built in 3.42s
```

### Run Rust Tests Only

```bash
npm run verify:rust
```

**Output:**
```
running 160 tests
test engine::state::tests::world_creation ... ok
test engine::state::tests::player_can_move ... ok
...
test persistence::database::tests::idempotent_migrations ... ok

test result: ok. 160 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 2.34s
```

### Run Specific Rust Test

```bash
cd src-tauri
cargo test pathfinding
```

---

## Code Quality

### Format Code

```bash
# Rust:
cd src-tauri
cargo fmt

# TypeScript/JavaScript:
npm run format  # (if added to package.json)
```

### Lint Code

```bash
# Rust:
cd src-tauri
cargo clippy

# TypeScript:
npm run lint  # (if added to package.json)
```

---

## Cleaning Build Artifacts

### Clean Node Modules

```bash
rm -rf node_modules
npm install
```

### Clean Rust Build

```bash
cd src-tauri
cargo clean
```

### Clean Everything

```bash
rm -rf node_modules
rm -rf src-tauri/target
npm install
```

**Use this if:**
- Build is behaving strangely
- Switching between dev/prod builds
- After updating Rust or Node versions

---

## Troubleshooting

### "error: linker `cc` not found" (Linux)

**Cause:** Missing build tools

**Fix:**
```bash
sudo apt-get install build-essential
```

### "error: failed to run custom build command for `openssl-sys`" (Linux)

**Cause:** Missing OpenSSL dev headers

**Fix:**
```bash
sudo apt-get install libssl-dev pkg-config
```

### "error: could not find `glib-2.0`" (Linux)

**Cause:** Missing GTK/glib dependencies

**Fix:**
```bash
sudo apt-get install libglib2.0-dev
```

### "LINK : fatal error LNK1181: cannot open input file 'user32.lib'" (Windows)

**Cause:** Missing Visual Studio Build Tools

**Fix:**
- Install Visual Studio Build Tools with "Desktop development with C++"
- Restart terminal after installation

### "xcrun: error: invalid active developer path" (macOS)

**Cause:** Xcode Command Line Tools not installed

**Fix:**
```bash
xcode-select --install
```

### Build is slow (>10 minutes)

**Cause:** First build or no caching

**Fix:**
- First builds are slow (normal)
- Subsequent builds use cache (faster)
- Use `cargo build --release` for optimized builds (slower but smaller binaries)

### "Error: No such file or directory" when running binary

**Cause:** Binary not found or wrong path

**Fix:**
```bash
# Find the binary:
find src-tauri/target -name "cryptforge" -o -name "cryptforge.exe"

# Run from correct path:
./src-tauri/target/release/cryptforge  # Unix
.\src-tauri\target\release\cryptforge.exe  # Windows
```

---

## Development Tips

### Fast Iteration

For fastest development loop:

1. **Keep `npm run tauri dev` running** — hot reload is instant for frontend changes
2. **Minimize Rust changes** — backend recompiles take 5-15s
3. **Use TypeScript strict mode** — catches bugs before runtime

### Debug Logging

```bash
# Enable Rust debug logs:
RUST_LOG=debug npm run tauri dev

# Enable Tauri debug logs:
TAURI_DEBUG=1 npm run tauri dev

# View browser console:
# Right-click in app → Inspect Element → Console
```

### VSCode Setup (Recommended)

**Extensions:**
- `rust-analyzer` — Rust language server
- `Tauri` — Tauri support
- `ESLint` — JavaScript/TypeScript linting
- `Prettier` — Code formatting

**Settings:**
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "editor.formatOnSave": true,
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

---

## CI/CD Build (GitHub Actions)

See `.github/workflows/ci.yml` for the automated build process:

```bash
# What CI does:
1. Checkout code
2. Install Node.js 18
3. Install Rust stable
4. Cache dependencies
5. Install platform dependencies
6. npm install
7. npm run verify:frontend
8. npm run verify:rust

# Runs on: ubuntu-latest, windows-latest, macos-latest
```

---

## Building for Different Architectures

### Apple Silicon (M1/M2) on macOS

```bash
# Default builds universal binary (x64 + arm64)
npm run tauri build

# Build for Apple Silicon only:
npm run tauri build -- --target aarch64-apple-darwin

# Build for Intel only:
npm run tauri build -- --target x86_64-apple-darwin
```

### ARM Linux (Raspberry Pi)

```bash
# Install cross-compilation tools:
rustup target add aarch64-unknown-linux-gnu

# Build:
npm run tauri build -- --target aarch64-unknown-linux-gnu
```

---

## Performance Profiling

### Rust Benchmarks

```bash
cd src-tauri
cargo bench
```

### React DevTools Profiler

1. Run `npm run tauri dev`
2. Right-click in app → Inspect Element
3. Go to "Profiler" tab
4. Click "Record" → interact with game → "Stop"
5. Analyze render times

---

## Related Files

- `.github/workflows/ci.yml` — CI pipeline
- `.github/workflows/release.yml` — Release automation
- `docs/RELEASE.md` — Release process
- `IMPLEMENTATION_PLAN.md` — Full project plan
- `package.json` — Frontend dependencies
- `src-tauri/Cargo.toml` — Rust dependencies
- `tauri.conf.json` — Tauri configuration
