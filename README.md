# Camera Server Sizing Tool

The **Camera Server Sizing Tool** is a web-based application that helps users calculate the server and storage requirements for IP camera deployments. This tool considers multiple factors such as camera resolution, frame rate, compression codec, storage retention period, and RAID configuration to provide accurate hardware sizing recommendations.

## Table of Contents

1. [Installation](https://github.com/Tragic-cmd/CSRC#installation)
       
2. [Usage](https://github.com/Tragic-cmd/CSRC#usage)
       
3. [Features](https://github.com/Tragic-cmd/CSRC#features)
       
4. [Calculation Methodology](https://github.com/Tragic-cmd/CSRC#calculation-methodology)
       
5. [Contributing](https://github.com/Tragic-cmd/CSRC#contributing)
       
6. [License](https://github.com/Tragic-cmd/CSRC#license)
       
7. [Contact](https://github.com/Tragic-cmd/CSRC#contact)
    

## Installation

### Prerequisites

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
npm install

# Start the server
npm start
```

## Usage

To use the Camera Server Sizing Tool:

1. Open your browser and navigate to `http://localhost:3000`.
    
2. Enter details such as the number of cameras, resolution, compression codec, and retention period.
    
3. Click on the **Calculate Requirements** button.
    
4. View detailed results, including storage, RAID configuration, and VM recommendations.
    

### Example Usage

```
# Start the application
npm start
```

After starting the server, access the tool through your browser to configure camera settings and receive recommendations.

## Features

- **User Authentication**: Register, login, and manage profiles securely.
    
- **Dynamic Storage Calculation**: Compute storage requirements based on selected parameters.
    
- **RAID Configuration Analysis**: Provides optimal RAID configurations.
    
- **Server Recommendation**: Estimates the number of servers required.
    
- **Dark Mode Support**: User-friendly interface with theme toggling.
    
- **Local Data Storage**: Saves previous configurations for quick access.
    
- **Performance Optimization Recommendations**: Suggests best practices for resource management.
    

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
        

## Contributing

We welcome contributions! Follow these steps:

1. Fork the repository
    
2. Create your feature branch: `git checkout -b feature-branch-name`
    
3. Commit your changes: `git commit -am 'Add new feature'`
    
4. Push to the branch: `git push origin feature-branch-name`
    
5. Open a pull request
    

## License

This project is licensed under the MIT License - see the [LICENSE](https://www.boot.dev/lessons/LICENSE) file for details.

## Contact

For any questions or feedback, reach out to:

- Email: codyshouey@outlook.com
    
- GitHub Issues: [Submit an Issue](https://github.com/Tragic-cmd/CSRC/issues)
    
