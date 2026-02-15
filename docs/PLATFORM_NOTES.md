# Platform Testing & Notes

This document contains platform-specific testing procedures, known quirks, and installation notes for Windows, macOS, and Linux.

---

## Testing Checklist

Use this checklist when verifying a new release on each platform:

### ✅ Windows Testing (Windows 10/11 x64)

**Prerequisites:**
- Clean Windows 10 or 11 installation (VM acceptable)
- No prior CryptForge installation

**Installation Test:**
1. ⬜ Download `.msi` installer from GitHub Release
2. ⬜ Double-click installer
3. ⬜ UAC prompt appears (click "Yes")
4. ⬜ Installer wizard opens
5. ⬜ Choose install location (default: `C:\Program Files\CryptForge\`)
6. ⬜ Click "Install"
7. ⬜ Installation completes without errors
8. ⬜ Desktop shortcut created
9. ⬜ Start Menu entry created

**First Launch:**
1. ⬜ Launch from desktop shortcut
2. ⬜ **If unsigned:** Windows Defender SmartScreen appears
   - ⬜ Click "More info"
   - ⬜ Click "Run anyway"
3. ⬜ **If signed:** App launches directly (no warning)
4. ⬜ Main menu appears

**Gameplay Test:**
1. ⬜ Click "New Game"
2. ⬜ Select class (Warrior/Rogue/Mage)
3. ⬜ Game loads, floor 1 displays
4. ⬜ Movement works (WASD or arrow keys)
5. ⬜ Combat works (bump attack enemy)
6. ⬜ Inventory opens (I key)
7. ⬜ Save game (ESC → Main Menu → Save & Exit)
8. ⬜ Quit and relaunch
9. ⬜ Click "Continue"
10. ⬜ Game loads from save
11. ⬜ Play a full run (reach floor 2+)
12. ⬜ No crashes or freezes

**Uninstall Test:**
1. ⬜ Close CryptForge
2. ⬜ Control Panel → Programs → Uninstall a program
3. ⬜ Find "CryptForge"
4. ⬜ Click "Uninstall"
5. ⬜ Uninstaller runs without errors
6. ⬜ Verify: `C:\Program Files\CryptForge\` deleted
7. ⬜ Verify: Desktop shortcut deleted
8. ⬜ Verify: Start Menu entry deleted
9. ⬜ **Save data preserved** at: `C:\Users\<User>\AppData\Local\com.cryptforge.app\cryptforge.db`

---

### ✅ macOS Testing (macOS 10.13+ x64 or Apple Silicon)

**Prerequisites:**
- macOS 10.13 (High Sierra) or later
- Intel or Apple Silicon Mac
- No prior CryptForge installation

**Installation Test:**
1. ⬜ Download `.dmg` from GitHub Release
2. ⬜ Double-click `.dmg` file
3. ⬜ Disk image mounts
4. ⬜ Finder window opens showing CryptForge.app
5. ⬜ Drag `CryptForge.app` to Applications folder
6. ⬜ Eject disk image

**First Launch:**
1. ⬜ Open Applications folder
2. ⬜ Double-click CryptForge.app
3. ⬜ **If unsigned:**
   - ⬜ Gatekeeper warning: "CryptForge cannot be opened because the developer cannot be verified"
   - ⬜ Click "Cancel"
   - ⬜ Right-click CryptForge.app → "Open"
   - ⬜ Click "Open" in confirmation dialog
4. ⬜ **If signed & notarized:** App launches directly (no warning)
5. ⬜ Main menu appears

**Code Signature Verification (Optional):**
```bash
codesign --verify --verbose /Applications/CryptForge.app
# Expected (signed): "valid on disk"
# Expected (unsigned): "code object is not signed at all"

spctl --assess --verbose /Applications/CryptForge.app
# Expected (notarized): "accepted"
# Expected (not notarized): "rejected"
```

**Gameplay Test:**
1. ⬜ Click "New Game"
2. ⬜ Select class
3. ⬜ Game loads
4. ⬜ Movement works
5. ⬜ Combat works
6. ⬜ Inventory opens
7. ⬜ Save & quit
8. ⬜ Relaunch and continue
9. ⬜ Full run to floor 2+
10. ⬜ No crashes

**Uninstall Test:**
1. ⬜ Close CryptForge
2. ⬜ Drag `CryptForge.app` from Applications to Trash
3. ⬜ Empty Trash
4. ⬜ **Save data preserved** at: `~/Library/Application Support/com.cryptforge.app/cryptforge.db`

---

### ✅ Linux Testing (Ubuntu 20.04+, Fedora 35+, or Arch)

**Prerequisites:**
- Modern Linux distro (glibc 2.27+)
- X11 or Wayland
- No prior CryptForge installation

**Installation Test (AppImage):**
1. ⬜ Download `.AppImage` from GitHub Release
2. ⬜ Open terminal in Downloads folder
3. ⬜ Make executable:
   ```bash
   chmod +x cryptforge_*.AppImage
   ```
4. ⬜ Run:
   ```bash
   ./cryptforge_*.AppImage
   ```
5. ⬜ **If FUSE error:** Install FUSE2:
   ```bash
   # Ubuntu/Debian:
   sudo apt-get install libfuse2

   # Fedora:
   sudo dnf install fuse-libs

   # Arch:
   sudo pacman -S fuse2
   ```
6. ⬜ Retry: `./cryptforge_*.AppImage`
7. ⬜ Main menu appears

**Desktop Integration (Optional):**
1. ⬜ Move AppImage to `~/.local/bin/`:
   ```bash
   mv cryptforge_*.AppImage ~/.local/bin/cryptforge
   ```
2. ⬜ Create desktop entry:
   ```bash
   cat > ~/.local/share/applications/cryptforge.desktop <<EOF
   [Desktop Entry]
   Name=CryptForge
   Exec=$HOME/.local/bin/cryptforge
   Type=Application
   Categories=Game;
   Icon=application-x-executable
   EOF
   ```
3. ⬜ Verify: CryptForge appears in application launcher

**Gameplay Test:**
1. ⬜ Click "New Game"
2. ⬜ Select class
3. ⬜ Game loads
4. ⬜ Movement works
5. ⬜ Combat works
6. ⬜ Inventory opens
7. ⬜ Save & quit
8. ⬜ Relaunch and continue
9. ⬜ Full run to floor 2+
10. ⬜ No crashes

**Uninstall Test:**
1. ⬜ Close CryptForge
2. ⬜ Delete AppImage:
   ```bash
   rm ~/.local/bin/cryptforge
   rm ~/.local/share/applications/cryptforge.desktop
   ```
3. ⬜ **Save data preserved** at: `~/.local/share/com.cryptforge.app/cryptforge.db`

---

## Known Issues & Workarounds

### Windows

#### Issue: "Windows protected your PC" warning

**Cause:** Binary is unsigned or signed with non-EV certificate

**Impact:** Users must click "More info" → "Run anyway" on first launch

**Workaround:**
- Sign binary with EV certificate (expensive: $300+/year)
- OR: Add note in release: "This is expected; click 'Run anyway'"

**User instructions:**
```
1. Click "More info"
2. Click "Run anyway"
3. App will launch normally
```

---

#### Issue: Antivirus flags installer

**Cause:** False positive (common with Rust binaries)

**Impact:** Windows Defender or third-party AV may quarantine `.msi`

**Workaround:**
- Submit binary to Microsoft for analysis: https://www.microsoft.com/en-us/wdsi/filesubmission
- Users: Add exception in antivirus

---

#### Issue: High DPI scaling blurry

**Cause:** Windows DPI scaling

**Impact:** UI may appear blurry on 4K displays

**Workaround:**
- Right-click `CryptForge.exe` → Properties → Compatibility
- Check "Override high DPI scaling behavior"
- Select "Application" from dropdown
- Apply and restart

---

### macOS

#### Issue: "CryptForge cannot be opened because the developer cannot be verified"

**Cause:** Binary is not notarized

**Impact:** Gatekeeper blocks unsigned apps

**Workaround (for users):**
```
1. Right-click CryptForge.app
2. Click "Open"
3. Click "Open" in confirmation dialog
4. App launches and will open normally on future launches
```

**Workaround (for developers):**
- Sign with Developer ID certificate (see `docs/CODE_SIGNING.md`)
- Submit for notarization:
  ```bash
  xcrun notarytool submit CryptForge.dmg \
    --apple-id YOUR_EMAIL \
    --password APP_SPECIFIC_PASSWORD \
    --team-id YOUR_TEAM_ID
  ```

---

#### Issue: App crashes on Apple Silicon with Intel build

**Cause:** Rosetta 2 not installed

**Impact:** Intel-only builds won't run on M1/M2 Macs

**Workaround:**
- Install Rosetta 2:
  ```bash
  /usr/sbin/softwareupdate --install-rosetta --agree-to-license
  ```
- OR: Build universal binary:
  ```bash
  npm run tauri build -- --target universal-apple-darwin
  ```

---

#### Issue: "Permission denied" when launching from Downloads

**Cause:** macOS quarantine attribute on downloaded files

**Impact:** App won't launch from Downloads folder

**Workaround:**
```bash
# Remove quarantine attribute:
xattr -d com.apple.quarantine ~/Downloads/CryptForge.app

# Or move to Applications (macOS auto-removes quarantine):
mv ~/Downloads/CryptForge.app /Applications/
```

---

### Linux

#### Issue: "Error while loading shared libraries: libfuse.so.2"

**Cause:** FUSE2 not installed (AppImage dependency)

**Impact:** AppImage won't run

**Workaround:**
```bash
# Ubuntu/Debian:
sudo apt-get install libfuse2

# Fedora:
sudo dnf install fuse-libs

# Arch:
sudo pacman -S fuse2
```

---

#### Issue: "GLIBC_2.XX not found"

**Cause:** Built on newer Ubuntu than user's distro

**Impact:** AppImage won't run on older systems

**Workaround (developers):**
- Build on older Ubuntu (e.g., 20.04 instead of 22.04)
- Use older glibc version

**Workaround (users):**
- Upgrade distro
- OR: Build from source (see `docs/BUILD.md`)

---

#### Issue: Wayland compatibility

**Cause:** Tauri uses WebKit, which may have Wayland issues

**Impact:** Rendering artifacts or crashes on Wayland

**Workaround:**
```bash
# Force X11 backend:
GDK_BACKEND=x11 ./cryptforge_*.AppImage
```

---

#### Issue: Missing system tray icon

**Cause:** Desktop environment doesn't support system tray

**Impact:** No tray icon (but app still works)

**Workaround:**
- None needed; app is playable without tray icon
- Or use DE that supports tray (GNOME + TopIconsPlus extension, KDE, XFCE)

---

## Platform-Specific Features

### Windows
- ✅ Start Menu integration
- ✅ Desktop shortcut
- ✅ Uninstaller via Control Panel
- ✅ File associations (future: .cryptforge save files)
- ⚠️ Requires .NET Framework 4.7.2+ (auto-installed)

### macOS
- ✅ Drag-to-Applications install
- ✅ Native menubar integration
- ✅ Dock icon
- ✅ Auto-updates (if configured)
- ⚠️ First launch requires "Open" right-click (if unsigned)

### Linux
- ✅ No installation required (portable AppImage)
- ✅ Works on most distros
- ✅ Optional desktop integration
- ⚠️ Requires FUSE2 (one-time install)
- ⚠️ No auto-updates (manual download)

---

## Performance Notes

### Expected Performance

| Platform | Launch Time | Turn Resolution | Frame Rate |
|----------|-------------|-----------------|------------|
| **Windows 10/11** | 1-2 seconds | <10ms | 60 FPS |
| **macOS (Intel)** | 2-3 seconds | <10ms | 60 FPS |
| **macOS (M1/M2)** | 1-2 seconds | <5ms | 60 FPS |
| **Linux** | 1-3 seconds | <10ms | 60 FPS |

### If Performance is Slow

**Symptoms:**
- Launch takes >5 seconds
- Lag between input and movement
- Animations stutter

**Causes & Fixes:**

1. **Integrated graphics:**
   - Try: Close other apps, lower resolution
   - Expected: Slight slowdown but playable

2. **Old CPU (<2015):**
   - Try: Disable animations in Settings
   - Expected: Game still playable at 30 FPS

3. **Low RAM (<4GB):**
   - Try: Close browser, other apps
   - Expected: May swap to disk (slower)

4. **Debug build instead of release:**
   - Check: File size (debug: 200MB+, release: 50-100MB)
   - Fix: Download release build from GitHub Releases

---

## Save Data Locations

**Windows:**
```
C:\Users\<YourName>\AppData\Local\com.cryptforge.app\cryptforge.db
```

**macOS:**
```
~/Library/Application Support/com.cryptforge.app/cryptforge.db
```

**Linux:**
```
~/.local/share/com.cryptforge.app/cryptforge.db
```

**To backup save:**
```bash
# Windows (PowerShell):
Copy-Item "$env:LOCALAPPDATA\com.cryptforge.app\cryptforge.db" "backup.db"

# macOS/Linux:
cp ~/.local/share/com.cryptforge.app/cryptforge.db ~/backup.db
```

**To restore save:**
```bash
# Windows (PowerShell):
Copy-Item "backup.db" "$env:LOCALAPPDATA\com.cryptforge.app\cryptforge.db"

# macOS/Linux:
cp ~/backup.db ~/.local/share/com.cryptforge.app/cryptforge.db
```

---

## Testing VMs (Recommended)

For thorough testing, use clean VMs:

### Windows
- **VirtualBox** with Windows 10/11 evaluation ISO
- Download: https://www.microsoft.com/en-us/software-download/windows10
- License: Free 90-day trial

### macOS
- **VMware Fusion** or **Parallels** with macOS VM
- Requires: macOS host (can't legally run macOS in VirtualBox on non-Mac)
- OR: Use actual Mac hardware

### Linux
- **VirtualBox** with Ubuntu 22.04 LTS
- Download: https://ubuntu.com/download/desktop
- License: Free

---

## Automated Testing (Future)

**Current:** Manual testing on each platform

**Future Enhancements:**
- GitHub Actions self-hosted runners for UI testing
- Selenium/WebDriver integration tests
- Automated screenshot comparison
- Crash reporting via Sentry

---

## Release Checklist

Before marking release as "Published" (not Draft):

- ✅ Windows tested on Windows 10 or 11
- ✅ macOS tested on Intel or Apple Silicon
- ✅ Linux tested on Ubuntu, Fedora, or Arch
- ✅ All 3 binaries download without corruption
- ✅ Installer/DMG/AppImage works
- ✅ Game launches without errors
- ✅ Full gameplay tested (1-2 floors)
- ✅ Save/load works
- ✅ Uninstall cleans up properly
- ✅ No crashes or critical bugs
- ✅ Release notes updated

---

## Related Files

- `.github/workflows/release.yml` — Build automation
- `docs/RELEASE.md` — Release process
- `docs/BUILD.md` — Building from source
- `docs/CODE_SIGNING.md` — Certificate setup
