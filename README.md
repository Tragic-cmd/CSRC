# Camera Server Sizing Calculator
 
A comprehensive web-based application for accurately sizing server and storage infrastructure for IP camera deployments. The tool models per-camera bitrate using codec, resolution, frame rate, and motion activity profiles to deliver precise storage, RAID, VM, and physical host recommendations.
 
## 📌 Table of Contents
 
1. [Installation](#installation)
2. [Usage](#usage)
3. [Features](#features)
4. [Calculation Methodology](#calculation-methodology)
5. [Security Considerations](#security-considerations)
6. [Limitations & Margins of Error](#limitations--margins-of-error)
7. [Contributing](#contributing)
8. [Contact](#contact)
 
---
 
## Installation
 
### Prerequisites
 
- Node.js (v16 or later) and npm
- A web browser
- Git
- SQLite3 (included via the `better-sqlite3` or `sqlite3` npm package)
 
### Steps to Install
 
```bash
# Clone the repository
git clone https://github.com/github-username/camera-server-sizer.git
 
# Navigate into the project directory
cd camera-server-sizer
 
# Install dependencies
npm install
 
# Start the server
npm start
```
 
The application will be accessible at `http://localhost:3000`.
 
---
 
## Usage
 
1. Register for a free account or log in.
2. Enter your deployment parameters — camera count, resolution, codec, frame rate, motion activity profile, recording mode, and retention period.
3. Configure RAID level, drive size, storage buffer, filesystem overhead, max cameras per VM, and HA redundancy.
4. Click **Calculate** to generate a full sizing report.
5. Save the configuration by name for later retrieval, export results to CSV, or print a formatted report.
 
### Add owner role to an account
 
```bash
cd path/to/your/project
sqlite3 users.db
```
```sql
UPDATE users SET role = 'owner' WHERE username = 'yourusername';
SELECT username, role FROM users WHERE username = 'yourusername';
```
 
---
 
## Features
 
- **User Authentication** — Secure registration, login, and profile management with bcrypt password hashing and session-based auth.
- **Advanced Bitrate Modelling** — Separate VBR and CBR paths per codec, with motion-weighted hourly bitrate averaging and adaptive minimum bitrate floors per resolution.
- **Motion Activity Profiles** — 10 named profiles (Very Low → Very High) plus Day Only, Night Only, and Rush Hours, each with calibrated active/idle hour splits and bitrate multipliers.
- **Codec Support** — MJPEG, H.264, H.264+, H.265, H.265 CBR, H.265+, and H.266.
- **Storage Sizing** — Per-camera daily storage, total raw storage, configurable growth buffer, and filesystem overhead.
- **RAID Configuration** — RAID 5, 6, 10, and 60 with auto-grouped 12-drive arrays, usable capacity, storage efficiency, fault tolerance, and estimated rebuild time.
- **VM Sizing** — CPU cores (codec, resolution, frame rate, and hardware acceleration aware), RAM (non-linear scaling), and per-VM network throughput.
- **Physical Host Sizing** — Host count based on CPU and RAM requirements with configurable N+1 or N+2 HA redundancy buffers.
- **Architecture Recommendations** — Hypervisor selection, storage architecture, HA strategy, and networking guidance scaled to deployment size.
- **Save & Load Configurations** — Named site configurations saved server-side and reloadable at any time.
- **Export & Print** — CSV export for BOM generation and a formatted print report for client proposals.
- **Dark Mode** — Full dark mode support with localStorage persistence.
 
---
 
## Calculation Methodology
 
### 1. Bitrate Calculation
 
Bitrate is modelled per codec mode (VBR or CBR):
 
- **Resolution factor** — baseline Mbps per resolution (720p → 8K)
- **Compression factor** — codec efficiency multiplier (e.g. H.265 = 0.7×, H.266 = 0.45× relative to H.264)
- **Framerate scaling** — non-linear power function (`fps / 30 ^ 0.95`), with a steeper penalty below 10 fps
- **Motion profile weighting** — motion and idle bitrates are calculated separately and averaged across 24 hours using the profile's active/idle hour split
- **Adaptive bitrate floor** — minimum bitrate enforced per resolution, codec, and framerate to prevent unrealistically low estimates
- **VBR vs CBR** — VBR codecs (H.264, H.265, H.265+, H.266) apply separate motion and idle efficiency multipliers; CBR codecs hold a constant bitrate
 
### 2. Storage Calculation
 
```
dailyGB       = bitrateMbps × 0.45 × recordingHoursPerDay
totalRawTB    = dailyGB × cameraCount × retentionDays / 1024
withBuffer    = totalRawTB × (1 + bufferFraction)
finalStorage  = withBuffer × (1 + filesystemOverheadFraction)
```
 
### 3. RAID Configuration
 
| Level   | Array Grouping       | Parity Drives | Efficiency         |
|---------|----------------------|---------------|--------------------|
| RAID 5  | Flexible             | 1             | (n−1) / n          |
| RAID 6  | Auto-grouped, 12 drives | 2          | 10/12 × 0.93       |
| RAID 10 | Mirrored pairs       | 50%           | n/2 × 0.96         |
| RAID 60 | 2× RAID 6 groups     | 2 per group   | 10/12 × 0.93       |
 
Rebuild time is estimated at ~150 GB/hr per failed drive.
 
### 4. VM & Host Sizing
 
- **CPU per camera** — base of 0.18 cores at 1080p / H.264 / 30fps, scaled by resolution multiplier, codec complexity, framerate, and hardware acceleration factor (full GPU = 0.12×, no acceleration = 1.0×)
- **RAM per VM** — base 8 GB + per-camera allocation by resolution, with non-linear scaling above 32 cameras and 10% virtualisation overhead
- **Physical hosts** — sized against dual-socket EPYC 9654 baselines (192 cores, 1 TB RAM) with a 2× CPU overcommit factor; HA buffer (N+1 or N+2) added on top
 
---
 
## Security Considerations
 
- **Password hashing** — bcrypt with cost factor 12
- **Session-based authentication** — server-side sessions with `express-session`
- **Input validation** — all user inputs validated server-side before database operations
- **Parameterised queries** — all database queries use parameterised statements to prevent SQL injection
- **Rate limiting** — brute-force mitigation on authentication endpoints
 
> ⚠️ HTTPS enforcement and secure session secret configuration are required for production deployments.
 
---
 
## Limitations & Margins of Error
 
- **Bitrate variability** — real-world bitrates fluctuate with scene complexity, lighting conditions, and encoder implementation. Results should be treated as well-informed estimates, not guaranteed values.
- **Codec implementation differences** — H.265 efficiency gains vary significantly between camera manufacturers and firmware versions.
- **Storage overhead** — filesystem and RAID overhead assumptions (default 5% filesystem, RAID efficiency per level) may differ from your specific hardware.
- **Hardware acceleration** — CPU reduction factors for partial/full/advanced acceleration are modelled on typical implementations; actual savings depend on GPU model and VMS software support.
- **Network conditions** — bandwidth estimates assume uncongested, dedicated camera network infrastructure.
 
Always validate results against real-world footage and hardware before finalising procurement.
 
---
 
## Contributing
 
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-branch-name`
3. Commit your changes: `git commit -am "Description of change"`
4. Push to the branch: `git push origin feature-branch-name`
5. Open a Pull Request
 
---
 
## Contact
 
📧 Email: codyshouey@outlook.com  
🐙 GitHub Issues: [Submit an Issue](https://github.com/Tragic-cmd/CSRC/issues)