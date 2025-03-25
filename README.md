Camera Server Sizing Tool

The Camera Server Sizing Tool is a comprehensive web-based application designed to help users accurately calculate server and storage requirements for IP camera deployments. The tool factors in camera resolution, frame rate, compression codec, storage retention period, and RAID configuration to deliver precise hardware recommendations.

📌 Table of Contents

1. [Installation](https://github.com/Tragic-cmd/CSRC#installation)
       
2. [Usage](https://github.com/Tragic-cmd/CSRC#usage)
       
3. [Features](https://github.com/Tragic-cmd/CSRC#features)
       
4. [Calculation Methodology](https://github.com/Tragic-cmd/CSRC#calculation-methodology)

5. [Security Considerations](https://github.com/Tragic-cmd/CSRC#Security-Considerations)

6. [Limitations & Margins of Error](https://github.com/Tragic-cmd/CSRC#Limitations-&-Margins-of-Error)
       
7. [Contributing](https://github.com/Tragic-cmd/CSRC#contributing)
       
8. [License](https://github.com/Tragic-cmd/CSRC#license)
       
9. [Contact](https://github.com/Tragic-cmd/CSRC#contact)

## Installation

### Prerequisites

Before installing, ensure the following dependencies are met:

- Node.js (v16 or later) and npm installed on your system
    
- A web browser
    
- Git for cloning the repository

### Steps to Install


```
# Clone the repository
git clone https://github.com/github-username/camera-server-sizer.git

# Navigate into the project directory
cd camera-server-sizer

# Install required dependencies
npm install express body-parser jsonwebtoken bcrypt

# Start the server
npm start

```

The application will now be accessible at http://localhost:3000.

## Usage

    Open your browser and navigate to http://localhost:3000.

    Enter details such as number of cameras, resolution, compression codec, and retention period.

    Click on "Calculate Requirements" to generate results.

    View detailed storage, RAID, server, and bandwidth recommendations.

Example Usage

npm start

Once the server is running, access the tool via your browser, configure camera settings, and receive real-time recommendations.

## Features

![Screenshot 2025-03-23 005933](https://github.com/user-attachments/assets/ef421090-19f5-449f-9470-24083b8767f9)

    User Authentication: Secure login, registration, and profile management.

    Dynamic Storage Calculation: Estimates storage needs based on selected parameters.

    RAID Configuration Analysis: Suggests optimal RAID configurations for redundancy.

    Server Recommendation: Estimates the number of servers required based on camera load.

    Network Bandwidth Estimation: Ensures adequate network capacity for video streams.

    Performance Optimization Suggestions: Recommends best practices for efficient resource management.

    Dark Mode Support: User-friendly interface with theme toggling.

    Local Data Storage: Saves previous configurations for quick access.

## Calculation Methodology

The Camera Server Sizing Tool utilizes a set of formulas and pre-defined bitrate estimates to compute storage and processing needs:

1. **Bitrate Calculation**: The tool estimates bitrate based on camera resolution, frame rate, and compression codec:
    
    where:
    
    - `BaseBitrate` is derived from industry standards per resolution,
        
    - `FrameRateFactor` adjusts for the selected FPS,
        
    - `CompressionFactor` accounts for codec efficiency (e.g., H.264 vs. H.265).
        
2. **Storage Calculation**:
    
    where:
    
    - `Bitrate` is in bits per second,
        
    - `86400` is the number of seconds per day,
        
    - `8` converts bits to bytes,
        
    - `1024^3` converts bytes to terabytes.
        
    
    The total required storage is then adjusted based on retention period and additional factors such as filesystem overhead and RAID redundancy.
    
3. **Server Requirements**:
    
    - **CPU Estimation**: The CPU load is estimated based on the number of cameras, resolution, and enabled hardware acceleration.
        
    - **RAM Calculation**: RAM requirements are derived based on the number of concurrent video streams and processing demands.
        
    - **Network Bandwidth**: The required network bandwidth is calculated using the sum of all camera bitrates to ensure sufficient infrastructure capacity.

## Security Considerations

    User Authentication: Secure password hashing with bcrypt.

    JWT-based Authentication: Ensures session integrity and protects against unauthorized access.

    Input Validation: Prevents injection attacks and erroneous calculations.

    Rate Limiting: Mitigates brute-force attacks.

    Data Encryption: Secures sensitive user data.

    ⚠️ Note: Security features rely on proper server configuration and HTTPS enforcement in production.

## Limitations & Margins of Error

    Bitrate Variability: Actual bitrates may fluctuate due to real-world motion levels.

    Codec Efficiency Differences: Compression ratios vary between implementations of H.264, H.265, and MJPEG.

    Storage Overhead: Filesystem and RAID configurations can introduce overhead (usually 5-20%).

    CPU/GPU Acceleration Impact: Hardware acceleration significantly affects CPU load estimation.

    Network Congestion Considerations: Bandwidth estimates assume ideal network conditions.

To minimize error margins, always test with real-world footage and hardware.

## Contributing

We welcome contributions! To contribute:

    Fork the repository

    Create a new branch:


```
git checkout -b feature-branch-name
```

Make changes & commit:

```
git commit -am "Added new feature"
```

Push to the branch:

```
git push origin feature-branch-name
```

Submit a Pull Request

## License

This project is licensed under the MIT License – see the LICENSE file for details.

## Contact

For inquiries or feedback, reach out via:

📧 Email: codyshouey@outlook.com
🐙 GitHub Issues: Submit an Issue
