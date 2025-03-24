// Main application namespace
const CameraServerSizer = {
    // Configuration constants
    config: {
        bitrateFactors: {
            resolutions: {
                '720p': 2,
                '1080p': 4,
                '2K': 6,
                '4K': 12,
                '8K': 24
            },
            compression: {
                'H.264': 1,
                'H.265': 0.6,
                'H.266': 0.45
            },
            activity: {
                'low': 0.75,
                'medium': 1,
                'high': 1.4
            }
        },
        raidMinDrives: {
            'RAID5': 3,
            'RAID6': 4,
            'RAID10': 4
        },
        mbpsToGBPerHour: 0.45,
        // VM sizing guidelines
        vmSizing: {
            // CPU overhead factor for virtualization
            cpuOverhead: 1.2,
            // VM sizes (predefined configurations)
            sizes: {
                small: {
                    maxCameras: 16,
                    cpuOverheadFactor: 1.3
                },
                medium: {
                    maxCameras: 32,
                    cpuOverheadFactor: 1.2
                },
                large: {
                    maxCameras: 64,
                    cpuOverheadFactor: 1.15
                },
                xlarge: {
                    maxCameras: 128,
                    cpuOverheadFactor: 1.1
                }
            },
            // Storage allocation strategies
            storageTypes: {
                local: {
                    description: "Local storage attached to VM",
                    useCases: "Smaller deployments, testing environments"
                },
                san: {
                    description: "Storage Area Network",
                    useCases: "Production environments, larger deployments"
                },
                hyperconverged: {
                    description: "Hyperconverged Infrastructure",
                    useCases: "Scalable environments, enterprise deployments"
                }
            }
        }
    },

    // Form input cache
    inputs: {},

    // Initialize the application
    init: function() {
        this.setupEventListeners();
        this.setupRealTimeValidation();
    },

    // Setup event listeners
    setupEventListeners: function() {
        // Show/hide hours per day input based on recording mode
        document.getElementById('recordingMode').addEventListener('change', function() {
            const hoursGroup = document.getElementById('hoursPerDayGroup');
            hoursGroup.style.display = this.value === 'custom' ? 'block' : 'none';
        });
        
        // Calculate button click handler
        document.getElementById('calculateBtn').addEventListener('click', this.handleCalculateClick.bind(this));
    },

    // Set up real-time validation
    setupRealTimeValidation: function() {
        const inputs = [
            'cameraCount', 
            'retentionDays', 
            'hoursPerDay', 
            'storageBuffer', 
            'maxCamerasPerServer',
            'filesystemOverhead'
        ];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            input.addEventListener('change', function() {
                // Clear just this input's error if it exists
                const errorElement = this.nextElementSibling;
                if (errorElement && errorElement.classList.contains('validation-error')) {
                    this.classList.remove('input-error');
                    errorElement.parentNode.removeChild(errorElement);
                }
            });
        });
    },

    // Handle calculate button click
    handleCalculateClick: function() {
        // First validate inputs
        if (this.validateInputs()) {
            try {
                // If valid, proceed with calculation
                this.gatherInputs();
                const results = this.calculateServerRequirements();
                this.displayResults(results);
                
                document.getElementById('results').style.display = 'block';
                document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                this.handleCalculationError(error);
            }
        } else {
            // Scroll to the first error
            const firstError = document.querySelector('.validation-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    },

    // Gather all inputs from the form
    gatherInputs: function() {
        this.inputs = {
            cameraCount: parseInt(document.getElementById('cameraCount').value),
            retentionDays: parseInt(document.getElementById('retentionDays').value),
            recordingMode: document.getElementById('recordingMode').value,
            hoursPerDay: document.getElementById('recordingMode').value === '24/7' ? 
                24 : parseInt(document.getElementById('hoursPerDay').value),
            resolution: document.getElementById('resolution').value,
            compression: document.getElementById('compression').value,
            frameRate: parseInt(document.getElementById('frameRate').value),
            motionActivity: document.getElementById('motionActivity').value,
            hardwareAcceleration: document.getElementById('hardwareAcceleration').value,
            hdSize: parseInt(document.getElementById('hdSize').value),
            redundancyLevel: document.getElementById('redundancyLevel').value,
            storageBuffer: parseInt(document.getElementById('storageBuffer').value) / 100,
            maxCamerasPerServer: parseInt(document.getElementById('maxCamerasPerServer').value),
            filesystemOverhead: parseInt(document.getElementById('filesystemOverhead').value) / 100
        };
    },

    // Validate all inputs
    validateInputs: function() {
        // Clear any existing error messages
        this.clearValidationErrors();
        
        let isValid = true;
        const errors = [];
        
        // Validate camera count
        const cameraCount = parseInt(document.getElementById('cameraCount').value);
        if (isNaN(cameraCount) || cameraCount < 1) {
            this.addValidationError('cameraCount', 'Please enter a valid number of cameras (minimum 1)');
            isValid = false;
        }
        
        // Validate retention days
        const retentionDays = parseInt(document.getElementById('retentionDays').value);
        if (isNaN(retentionDays) || retentionDays < 1) {
            this.addValidationError('retentionDays', 'Please enter a valid retention period (minimum 1 day)');
            isValid = false;
        }
        
        // Validate hours per day if custom recording mode is selected
        const recordingMode = document.getElementById('recordingMode').value;
        if (recordingMode === 'custom') {
            const hoursPerDay = parseInt(document.getElementById('hoursPerDay').value);
            if (isNaN(hoursPerDay) || hoursPerDay < 1 || hoursPerDay > 24) {
                this.addValidationError('hoursPerDay', 'Please enter valid hours between 1 and 24');
                isValid = false;
            }
        }
        
        // Validate storage buffer
        const storageBuffer = parseInt(document.getElementById('storageBuffer').value);
        if (isNaN(storageBuffer) || storageBuffer < 0 || storageBuffer > 100) {
            this.addValidationError('storageBuffer', 'Buffer must be between 0 and 100%');
            isValid = false;
        }
        
        // Validate max cameras per server
        const maxCamerasPerServer = parseInt(document.getElementById('maxCamerasPerServer').value);
        if (isNaN(maxCamerasPerServer) || maxCamerasPerServer < 1) {
            this.addValidationError('maxCamerasPerServer', 'Please enter a valid number (minimum 1)');
            isValid = false;
        }
        
        // Validate filesystem overhead
        const filesystemOverhead = parseInt(document.getElementById('filesystemOverhead').value);
        if (isNaN(filesystemOverhead) || filesystemOverhead < 0 || filesystemOverhead > 20) {
            this.addValidationError('filesystemOverhead', 'Overhead must be between 0 and 20%');
            isValid = false;
        }
        
        // Verify that the combination of parameters doesn't lead to unrealistic results
        if (isValid) {
            // Example: Check if total storage requirement exceeds realistic limits
            const resolution = document.getElementById('resolution').value;
            const highResolutions = ['4K', '8K'];
            
            if (highResolutions.includes(resolution) && cameraCount > 500 && retentionDays > 90) {
                errors.push('Warning: The combination of high resolution, large camera count, and long retention period may exceed practical storage limits.');
                this.displayGeneralWarning(errors);
            }
        }
        
        return isValid;
    },

    // Add validation error to a specific input
    addValidationError: function(inputId, errorMessage) {
        const inputElement = document.getElementById(inputId);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.textContent = errorMessage;
        
        // Add error styling to the input
        inputElement.classList.add('input-error');
        
        // Insert error message after the input element
        inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
    },

    // Display general warnings not tied to specific inputs
    displayGeneralWarning: function(warnings) {
        const warningContainer = document.createElement('div');
        warningContainer.className = 'general-warnings';
        
        warnings.forEach(warning => {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'warning-message';
            warningDiv.textContent = warning;
            warningContainer.appendChild(warningDiv);
        });
        
        // Add warnings before the results section
        const resultsElement = document.getElementById('results');
        resultsElement.parentNode.insertBefore(warningContainer, resultsElement);
    },

    // Clear all validation errors
    clearValidationErrors: function() {
        // Remove error styling from inputs
        const errorInputs = document.querySelectorAll('.input-error');
        errorInputs.forEach(input => {
            input.classList.remove('input-error');
        });
        
        // Remove error messages
        const errorMessages = document.querySelectorAll('.validation-error');
        errorMessages.forEach(error => {
            error.parentNode.removeChild(error);
        });
        
        // Remove general warnings
        const warnings = document.querySelectorAll('.general-warnings');
        warnings.forEach(warning => {
            warning.parentNode.removeChild(warning);
        });
    },

    // Handle calculation errors
    handleCalculationError: function(error) {
        console.error("Calculation error:", error);
        
        // Create an error message container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'general-warnings';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'warning-message';
        errorDiv.textContent = 'An error occurred during calculations. Please check your inputs and try again.';
        errorContainer.appendChild(errorDiv);
        
        // Add error details if available
        if (error.message) {
            const errorDetails = document.createElement('div');
            errorDetails.className = 'warning-message';
            errorDetails.textContent = `Error details: ${error.message}`;
            errorContainer.appendChild(errorDetails);
        }
        
        // Add error before the results section
        const resultsElement = document.getElementById('results');
        resultsElement.parentNode.insertBefore(errorContainer, resultsElement);
        
        // Scroll to the error
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    // Calculate server requirements
    calculateServerRequirements: function() {
        try {
            // Calculate bitrate based on resolution, compression, framerate and activity
            let bitrateMbps = this.calculateBitrate(
                this.inputs.resolution, 
                this.inputs.compression, 
                this.inputs.frameRate, 
                this.inputs.motionActivity
            );
            
            // Calculate storage requirements with proper unit conversion and overhead
            const bitrateGBPerHour = bitrateMbps * this.config.mbpsToGBPerHour;
            
            // Account for variable bitrate efficiency in custom hours mode
            const effectiveHoursMultiplier = this.inputs.recordingMode === 'custom' ? 
                this.getEffectiveHoursMultiplier(this.inputs.motionActivity) : 1;
            const effectiveHours = this.inputs.hoursPerDay * effectiveHoursMultiplier;
            
            const dailyStoragePerCamera = bitrateGBPerHour * effectiveHours;
            const totalRawStorageGB = dailyStoragePerCamera * this.inputs.cameraCount * this.inputs.retentionDays;
            const totalRawStorageTB = totalRawStorageGB / 1024;
            
            // Apply storage buffer
            const storageWithBufferTB = totalRawStorageTB * (1 + this.inputs.storageBuffer);
            
            // Apply filesystem overhead
            const storageWithOverheadTB = storageWithBufferTB * (1 + this.inputs.filesystemOverhead);
            
            // Calculate RAID configuration
            const raidConfig = this.calculateRaidConfiguration(
                storageWithOverheadTB, 
                this.inputs.hdSize, 
                this.inputs.redundancyLevel
            );
            
            // Calculate server resources
            const serversNeededForCameras = Math.ceil(this.inputs.cameraCount / this.inputs.maxCamerasPerServer);
            const serversNeededForStorage = Math.ceil(storageWithOverheadTB / raidConfig.usableCapacity);
            const serversNeeded = Math.max(serversNeededForCameras, serversNeededForStorage);
            const camerasPerServer = Math.ceil(this.inputs.cameraCount / serversNeeded);
            
            // Calculate CPU and RAM requirements
            const cpuCoresPerCamera = this.calculateCpuCoresPerCamera(
                this.inputs.resolution, 
                this.inputs.compression, 
                this.inputs.frameRate, 
                this.inputs.hardwareAcceleration
            );
            
            // Apply VM overhead to CPU calculation
            const vmSize = this.determineVMSize(camerasPerServer);
            const cpuOverheadFactor = this.config.vmSizing.sizes[vmSize].cpuOverheadFactor;
            const cpuCoresPerVM = Math.max(4, Math.ceil(camerasPerServer * cpuCoresPerCamera * cpuOverheadFactor));
            
            const ramPerVM = this.calculateRamRequirements(camerasPerServer, this.inputs.resolution);
            
            // Network bandwidth with proper overhead accounting
            const networkOverheadFactor = 1.1; // 10% overhead for network protocols
            const networkBandwidthMbps = camerasPerServer * bitrateMbps * networkOverheadFactor;
            
            // Determine number of physical hosts needed
            const physicalHostsNeeded = this.calculatePhysicalHosts(serversNeeded, cpuCoresPerVM, ramPerVM);
            
            return {
                bitrateMbps,
                dailyStoragePerCamera,
                totalRawStorageTB,
                storageWithBufferTB,
                storageWithOverheadTB,
                raidConfig,
                vmsNeeded: serversNeeded,
                camerasPerVM: camerasPerServer,
                cpuCoresPerVM,
                ramPerVM,
                networkBandwidthMbps,
                hardwareAcceleration: this.inputs.hardwareAcceleration,
                vmSize,
                physicalHostsNeeded
            };
        } catch (error) {
            console.error("Error in calculations:", error);
            throw new Error(`Calculation failed: ${error.message}`);
        }
    },
    
    // Determine VM size based on number of cameras
    determineVMSize: function(cameraCount) {
        const sizes = this.config.vmSizing.sizes;
        
        if (cameraCount <= sizes.small.maxCameras) return 'small';
        if (cameraCount <= sizes.medium.maxCameras) return 'medium';
        if (cameraCount <= sizes.large.maxCameras) return 'large';
        return 'xlarge';
    },
    
    // Calculate number of physical hosts needed
    calculatePhysicalHosts: function(vmCount, cpuCoresPerVM, ramPerVM) {
        // Typical enterprise server specs
        const coresPerPhysicalHost = 64; // Dual socket server with 32 cores per socket
        const ramPerPhysicalHost = 512; // GB
        
        // Calculate hosts needed based on CPU cores (with overcommit factor)
        const cpuOvercommitFactor = 4; // Typical for surveillance workloads
        const hostsNeededForCPU = Math.ceil((vmCount * cpuCoresPerVM) / (coresPerPhysicalHost * cpuOvercommitFactor));
        
        // Calculate hosts needed based on RAM (with smaller overcommit factor)
        const ramOvercommitFactor = 1.2; // More conservative for RAM
        const hostsNeededForRAM = Math.ceil((vmCount * ramPerVM) / (ramPerPhysicalHost * ramOvercommitFactor));
        
        // Take the higher of the two requirements
        return Math.max(hostsNeededForCPU, hostsNeededForRAM);
    },

    // Get effective hours multiplier based on motion activity
    getEffectiveHoursMultiplier: function(motionActivity) {
        // For custom hours mode, not all recording time has motion
        const activityMultipliers = {
            'low': 0.6,    // Only 60% of custom hours have meaningful motion
            'medium': 0.8, // 80% of custom hours have meaningful motion
            'high': 0.95   // 95% of custom hours have meaningful motion
        };
        
        return activityMultipliers[motionActivity] || 0.8;
    },
    
    // Calculate bitrate based on resolution, compression, and other factors
    calculateBitrate: function(resolution, compression, frameRate, motionActivity) {
        // Get base bitrate for the resolution
        let bitrate = this.config.bitrateFactors.resolutions[resolution] || 4;
        
        // Adjust for compression codec
        bitrate *= this.config.bitrateFactors.compression[compression] || 1;
        
        // Adjust for framerate (non-linear scaling)
        bitrate *= this.getFramerateMultiplier(frameRate);
        
        // Adjust for motion activity level
        bitrate *= this.config.bitrateFactors.activity[motionActivity] || 1;
        
        // Add small variability factor for real-world conditions
        const variabilityFactor = 0.95 + (Math.random() * 0.1); // 0.95-1.05
        bitrate *= variabilityFactor;
        
        return parseFloat(bitrate.toFixed(2));
    },
    
    // Get framerate multiplier for bitrate calculation
    getFramerateMultiplier: function(fps) {
        if (fps <= 5) return 0.5;
        if (fps <= 10) return 0.7;
        if (fps <= 15) return 1.0;
        if (fps <= 20) return 1.25;
        if (fps <= 30) return 1.6;
        return 2.0; // For higher frame rates
    },
    
    // Calculate CPU cores needed per camera
    calculateCpuCoresPerCamera: function(resolution, compression, frameRate, hardwareAcceleration) {
        // Base CPU requirements (cores per camera for 1080p, H.264, 15fps, no hardware acceleration)
        let baseCores = 0.25;
        
        // Resolution multipliers - more realistic scaling
        const resolutionMultipliers = {
            '720p': 0.5,
            '1080p': 1,
            '2K': 1.5,
            '4K': 2.5,
            '8K': 5
        };
        
        // Compression complexity multipliers - accounting for newer processors
        const compressionMultipliers = {
            'H.264': 1,
            'H.265': 1.3,  // More realistic for modern systems
            'H.266': 2.0   // More realistic for modern systems
        };
        
        // Hardware acceleration drastically reduces CPU needs
        const hwAccelMultipliers = {
            'none': 1,       // Full software encoding
            'partial': 0.4,  // Partial hardware acceleration
            'full': 0.15     // Full hardware acceleration
        };
        
        // Calculate cores needed with better scaling factors
        baseCores *= resolutionMultipliers[resolution] || 1;
        baseCores *= compressionMultipliers[compression] || 1;
        baseCores *= this.getFramerateCpuMultiplier(frameRate);
        baseCores *= hwAccelMultipliers[hardwareAcceleration] || 1;
        
        return parseFloat(baseCores.toFixed(2));
    },
    
    // Get framerate multiplier for CPU calculation
    getFramerateCpuMultiplier: function(fps) {
        if (fps <= 5) return 0.5;
        if (fps <= 10) return 0.8;
        if (fps <= 15) return 1.0;
        if (fps <= 20) return 1.3;
        if (fps <= 30) return 1.7;
        return 2.2;
    },
    
    // Calculate RAM requirements
    calculateRamRequirements: function(cameraCount, resolution) {
        // Base RAM for system (GB)
        const baseRam = 8;
        
        // RAM per camera based on resolution (GB)
        const ramPerCameraByResolution = {
            '720p': 0.15,
            '1080p': 0.25,
            '2K': 0.4,
            '4K': 0.7,
            '8K': 1.2
        };
        
        // Calculate total RAM with non-linear scaling
        let totalRam = baseRam + (cameraCount * (ramPerCameraByResolution[resolution] || 0.25));
        
        // Add non-linear scaling for large camera counts
        if (cameraCount > 32) {
            totalRam += Math.log2(cameraCount - 31) * 2;
        }
        
        // VM-specific overhead (hypervisor consumption, etc.)
        totalRam *= 1.1; // Add 10% for virtualization overhead
        
        // Round up to nearest 4GB for typical VM memory configurations
        return Math.ceil(totalRam / 4) * 4;
    },
    
    // Calculate RAID configuration
    calculateRaidConfiguration: function(requiredStorageTB, hdSizeTB, raidLevel) {
        let totalDrives;
        let usableCapacityMultiplier;
        let minDrives = this.config.raidMinDrives[raidLevel] || 4;
        
        try {
            // Calculate number of drives needed based on RAID level
            switch(raidLevel) {
                case 'RAID5':
                    // For RAID5, usable space is N-1 drives
                    usableCapacityMultiplier = (n) => (n - 1) * hdSizeTB * 0.93; // Account for RAID overhead
                    
                    // Calculate required drives based on storage needed
                    totalDrives = Math.ceil(requiredStorageTB / (hdSizeTB * 0.93)) + 1;
                    if (totalDrives < minDrives) totalDrives = minDrives;
                    break;
                    
                case 'RAID6':
                    // For RAID6, usable space is N-2 drives
                    usableCapacityMultiplier = (n) => (n - 2) * hdSizeTB * 0.93; // Account for RAID overhead
                    
                    // Calculate required drives based on storage needed
                    totalDrives = Math.ceil(requiredStorageTB / (hdSizeTB * 0.93)) + 2;
                    if (totalDrives < minDrives) totalDrives = minDrives;
                    break;
                    
                case 'RAID10':
                    // For RAID10, usable space is N/2 drives
                    usableCapacityMultiplier = (n) => (n / 2) * hdSizeTB * 0.96; // RAID10 has less overhead
                    
                    // Calculate required drives based on storage needed
                    totalDrives = Math.ceil(requiredStorageTB / (hdSizeTB * 0.48)) * 2;
                    if (totalDrives < minDrives) totalDrives = minDrives;
                    
                    // Ensure even number of drives
                    if (totalDrives % 2 !== 0) totalDrives++;
                    break;
                    
                default:
                    // Default to RAID6
                    usableCapacityMultiplier = (n) => (n - 2) * hdSizeTB * 0.93;
                    totalDrives = Math.ceil(requiredStorageTB / (hdSizeTB * 0.93)) + 2;
                    if (totalDrives < minDrives) totalDrives = minDrives;
            }
            
            // Calculate capacities
            const totalRawCapacity = totalDrives * hdSizeTB;
            const usableCapacity = usableCapacityMultiplier(totalDrives);
            
            return {
                totalDrives,
                raidLevel,
                hdSizeTB,
                totalRawCapacity,
                usableCapacity
            };
        } catch (error) {
            console.error("Error in RAID calculation:", error);
            throw new Error(`RAID configuration calculation failed: ${error.message}`);
        }
    },
    
    // Generate virtualization-specific recommendations
    generateVirtualizationRecommendations: function(results) {
        // Industry-standard hypervisor selection based on VM count and storage size
        let hypervisorRecommendation;
    
        if (results.vmsNeeded <= 4 && results.storageWithOverheadTB < 50) {
            hypervisorRecommendation = "VMware vSphere Essentials, Microsoft Hyper-V, or Proxmox VE (for small deployments with minimal HA requirements)";
        } else if (results.vmsNeeded <= 16) {
            hypervisorRecommendation = "VMware vSphere Standard, Microsoft Hyper-V with System Center, or XCP-ng (for medium-scale deployments with centralized management)";
        } else if (results.vmsNeeded <= 64) {
            hypervisorRecommendation = "VMware vSphere Enterprise Plus, Microsoft Hyper-V Datacenter, or Nutanix AHV (for large-scale environments requiring vMotion and DRS)";
        } else {
            hypervisorRecommendation = "VMware Cloud Foundation, Red Hat OpenShift Virtualization, or an enterprise Kubernetes-based hypervisor (for cloud-scale and hyperconverged environments)";
        }
    
        // Storage approach following industry best practices based on performance, scalability, and redundancy
        let storageApproach;
    
        if (results.storageWithOverheadTB < 20) {
            storageApproach = "Enterprise NVMe SSDs in a direct-attached (DAS) or NAS configuration with RAID10 for high IOPS and redundancy.";
        } else if (results.storageWithOverheadTB < 100) {
            storageApproach = "Hybrid storage (SSD + HDD) using a mid-tier SAN with dedicated iSCSI or Fiber Channel (FC) storage networking.";
        } else if (results.storageWithOverheadTB < 500) {
            storageApproach = "All-Flash SAN (AFA) or high-performance NVMe-based storage arrays with dual controllers and redundant paths.";
        } else {
            storageApproach = "Hyperconverged infrastructure (HCI) using vSAN, Nutanix, or Dell VxRail for scalable, high-availability storage with distributed redundancy.";
        }
    
        // High Availability (HA) recommendations following industry standards for redundancy and disaster recovery
        let highAvailabilityRecommendation;
    
        if (results.vmsNeeded <= 8) {
            highAvailabilityRecommendation = "Basic HA with failover clustering, scheduled VM snapshots, and offsite backups.";
        } else if (results.vmsNeeded <= 32) {
            highAvailabilityRecommendation = "Live migration (VMware vMotion, Hyper-V Live Migration) with redundant networking and backup replication.";
        } else if (results.vmsNeeded <= 64) {
            highAvailabilityRecommendation = "Fully redundant HA cluster with shared storage, automated failover (VMware HA, Hyper-V Failover Clustering), and geo-redundant backups.";
        } else {
            highAvailabilityRecommendation = "Active-active datacenters with geo-redundancy, stretch clusters, automated disaster recovery orchestration, and cloud-based DRaaS (Disaster Recovery as a Service).";
        }
    
        // Additional recommendation for best practices in networking
        let networkingRecommendation;
        
        if (results.vmsNeeded <= 16) {
            networkingRecommendation = "Dedicated VLANs for VM traffic, redundant gigabit Ethernet, and basic QoS policies.";
        } else if (results.vmsNeeded <= 64) {
            networkingRecommendation = "10GbE or Fiber Channel backbone, redundant switches, and network segmentation for security.";
        } else {
            networkingRecommendation = "25GbE or higher with spine-leaf architecture, SDN for automation, and encrypted VXLAN overlays for secure multi-site networking.";
        }
    
        return {
            hypervisorRecommendation,
            storageApproach,
            highAvailabilityRecommendation,
            networkingRecommendation,
            hostRecommendation: this.generateHostHardwareRecommendation(results)
        };
    },
    
    // Generate physical host hardware recommendations
    generateHostHardwareRecommendation: function(results) {
        // CPU Recommendation
        const totalCoresNeeded = results.vmsNeeded * results.cpuCoresPerVM;
        let cpuRecommendation;
    
        if (totalCoresNeeded <= 1) {
            cpuRecommendation = "Low-power single-core processor (e.g., Intel Atom, AMD Ryzen Embedded)";
        } else if (totalCoresNeeded <= 2) {
            cpuRecommendation = "Dual-core processor (e.g., Intel Core i3, AMD Ryzen 3)";
        } else if (totalCoresNeeded <= 4) {
            cpuRecommendation = "Quad-core server processor (e.g., Intel Xeon E, AMD Ryzen 5)";
        } else if (totalCoresNeeded <= 8) {
            cpuRecommendation = "Octa-core server processor (e.g., Intel Xeon E, AMD Ryzen 7)";
        } else if (totalCoresNeeded <= 16) {
            cpuRecommendation = "Single socket with AMD EPYC 7002/7003 or Intel Xeon Silver (16+ cores)";
        } else if (totalCoresNeeded <= 32) {
            cpuRecommendation = "Single socket with AMD EPYC 7003 or Intel Xeon Gold (32+ cores)";
        } else if (totalCoresNeeded <= 64) {
            cpuRecommendation = "Dual socket server with AMD EPYC 7003/9004 or Intel Xeon Gold (64+ cores)";
        } else if (totalCoresNeeded <= 128) {
            cpuRecommendation = "Dual socket server with AMD EPYC 9004 or Intel Xeon Platinum (128+ cores)";
        } else {
            cpuRecommendation = "Multiple high-core-count dual socket servers with AMD EPYC 9004 or Intel Xeon Platinum (128+ cores per server)";
        }
    
        // RAM Recommendation
        const totalRamNeeded = results.vmsNeeded * results.ramPerVM;
        let ramRecommendation;
    
        if (totalRamNeeded <= 4) {
            ramRecommendation = "4GB RAM per host (suitable for low-demand workloads)";
        } else if (totalRamNeeded <= 8) {
            ramRecommendation = "8GB RAM per host (minimal configuration for small deployments)";
        } else if (totalRamNeeded <= 16) {
            ramRecommendation = "16GB RAM per host (basic workloads and light processing)";
        } else if (totalRamNeeded <= 32) {
            ramRecommendation = "32GB RAM per host (good for small-scale deployments)";
        } else if (totalRamNeeded <= 64) {
            ramRecommendation = "64GB RAM per host (recommended for moderate workloads)";
        } else if (totalRamNeeded <= 128) {
            ramRecommendation = "128GB RAM per host (sufficient for video processing & analytics)";
        } else if (totalRamNeeded <= 256) {
            ramRecommendation = "256GB RAM per host (ideal for high-performance workloads)";
        } else if (totalRamNeeded <= 512) {
            ramRecommendation = "512GB RAM per host (optimal for dense VM environments)";
        } else if (totalRamNeeded <= 1024) {
            ramRecommendation = "1TB RAM per host (for massive-scale video processing and AI workloads)";
        } else {
            ramRecommendation = "1.5TB+ RAM per host (for enterprise-scale, AI, and high-memory applications)";
        }
    
        return {
            cpuRecommendation,
            ramRecommendation
        };
    },
    
    // Display calculation results
    displayResults: function(results) {
        try {
            // Storage Analysis
            document.getElementById('bitratePerCamera').textContent = `${results.bitrateMbps.toFixed(2)} Mbps`;
            document.getElementById('dailyStoragePerCamera').textContent = `${results.dailyStoragePerCamera.toFixed(2)} GB/day`;
            document.getElementById('totalRawStorage').textContent = `${results.totalRawStorageTB.toFixed(2)} TB`;
            document.getElementById('storageWithBuffer').textContent = `${results.storageWithBufferTB.toFixed(2)} TB`;
            document.getElementById('storageWithOverhead').textContent = `${results.storageWithOverheadTB.toFixed(2)} TB`;

            // Generate Storage Analysis Summary
            document.getElementById('storageAnalysis').innerHTML = `
                <p><strong>Storage Analysis Summary:</strong></p>
                <ul>
                    <li><strong>Per Camera Bitrate:</strong> ${results.bitrateMbps.toFixed(2)} Mbps</li>
                    <li><strong>Per Camera Daily Storage:</strong> ${results.dailyStoragePerCamera.toFixed(2)} GB/day</li>
                    <li><strong>Total Raw Storage Needed:</strong> ${results.totalRawStorageTB.toFixed(2)} TB</li>
                    <li><strong>Storage with Buffer:</strong> ${results.storageWithBufferTB.toFixed(2)} TB</li>
                    <li><strong>Final Storage Requirement (with Overhead):</strong> ${results.storageWithOverheadTB.toFixed(2)} TB</li>
                </ul>
                <p>For <strong>${this.inputs.cameraCount} cameras</strong> with a retention period of 
                <strong>${this.inputs.retentionDays} days</strong>, a total of 
                <strong>${results.storageWithOverheadTB.toFixed(2)} TB</strong> of usable storage is required, 
                accounting for buffer and filesystem overhead.</p>
                <p><strong>Recommendation:</strong> To ensure long-term reliability, consider RAID configurations optimized 
                for high write endurance and redundancy, such as RAID 6 or RAID 10.</p>
            `;

            // Update the headings to reflect VM-based storage allocation
            document.querySelectorAll('.server-heading').forEach(heading => {
                heading.textContent = heading.textContent.replace('Server', 'VM');
            });
            
            // RAID Configuration
            document.getElementById('raidLevel').textContent = results.raidConfig.raidLevel;
            document.getElementById('drivesNeeded').textContent = results.raidConfig.totalDrives;
            document.getElementById('driveSize').textContent = `${results.raidConfig.hdSizeTB} TB`;
            document.getElementById('totalRawCapacity').textContent = `${results.raidConfig.totalRawCapacity.toFixed(2)} TB`;
            document.getElementById('usableCapacity').textContent = `${results.raidConfig.usableCapacity.toFixed(2)} TB`;

            // Generate RAID Analysis
            document.getElementById('raidAnalysis').innerHTML = `
                <p><strong>Recommended RAID Configuration:</strong></p>
                <ul>
                    <li><strong>RAID Level:</strong> ${results.raidConfig.raidLevel} (optimized for ${getRaidBenefits(results.raidConfig.raidLevel)})</li>
                    <li><strong>Total Drives Required:</strong> ${results.raidConfig.totalDrives} × ${results.raidConfig.hdSizeTB} TB drives</li>
                    <li><strong>Raw Storage Capacity:</strong> ${results.raidConfig.totalRawCapacity.toFixed(2)} TB</li>
                    <li><strong>Usable Storage Capacity:</strong> ${results.raidConfig.usableCapacity.toFixed(2)} TB (after redundancy & overhead)</li>
                    <li><strong>Fault Tolerance:</strong> ${getRaidFaultTolerance(results.raidConfig.raidLevel)}</li>
                </ul>
                <p><strong>Note:</strong> Ensure proper disk monitoring and hot spare drives for higher resilience.</p>
            `;

            // Function to provide RAID benefits
            function getRaidBenefits(raidLevel) {
                const benefits = {
                    'RAID 0': 'high performance but no redundancy',
                    'RAID 1': 'mirroring for data protection',
                    'RAID 5': 'balanced performance and redundancy',
                    'RAID 6': 'extra fault tolerance with dual-parity',
                    'RAID 10': 'high performance and redundancy (striped mirroring)'
                };
                return benefits[raidLevel] || 'optimized redundancy and performance';
            }

            // Function to determine fault tolerance
            function getRaidFaultTolerance(raidLevel) {
                const faultTolerance = {
                    'RAID 0': 'No drive failure tolerance',
                    'RAID 1': 'Can tolerate 1 drive failure',
                    'RAID 5': 'Can tolerate 1 drive failure',
                    'RAID 6': 'Can tolerate up to 2 drive failures',
                    'RAID 10': 'Can tolerate up to 1 drive failure per mirrored pair'
                };
                return faultTolerance[raidLevel] || 'Varies based on configuration';
            }

            // VM Requirements
            document.getElementById('vmsNeeded').textContent = results.vmsNeeded;
            document.getElementById('camerasPerVM').textContent = results.camerasPerVM;
            document.getElementById('cpuCoresPerVM').textContent = results.cpuCoresPerVM;
            document.getElementById('ramPerVM').textContent = `${results.ramPerVM} GB`;
            document.getElementById('networkPerVM').textContent = `${Math.ceil(results.networkBandwidthMbps)} Mbps`;

            document.getElementById('vmAnalysis').innerHTML = `
                <p>Based on your requirements, we recommend deploying 
                <strong>${results.vmsNeeded} virtual machines</strong>, each handling 
                <strong>${results.camerasPerVM} cameras</strong>. Each VM should be configured with 
                <strong>${results.cpuCoresPerVM} CPU cores</strong> and
                <strong>${results.ramPerVM} GB of RAM</strong>, with a network connection capable of handling 
                <strong>${Math.ceil(results.networkBandwidthMbps)} Mbps</strong> of bandwidth.</p>
                <p>Recommended VM size: <strong>${results.vmSize.toUpperCase()}</strong></p>
            `;

            // Generate virtualization-specific recommendations
            const virtualRecs = this.generateVirtualizationRecommendations(results);

            // Physical Infrastructure
            document.getElementById('physicalHostsNeeded').textContent = results.physicalHostsNeeded;
            document.getElementById('hypervisorRecommendation').textContent = virtualRecs.hypervisorRecommendation;
            document.getElementById('storageApproach').textContent = virtualRecs.storageApproach;
            document.getElementById('cpuRecommendation').textContent = virtualRecs.hostRecommendation.cpuRecommendation;
            document.getElementById('ramRecommendation').textContent = virtualRecs.hostRecommendation.ramRecommendation;

            document.getElementById('physicalAnalysis').innerHTML = `
                <p>To host these VMs efficiently, you will need approximately 
                <strong>${results.physicalHostsNeeded} physical servers</strong>.</p>
                <p>We recommend <strong>${virtualRecs.hypervisorRecommendation}</strong> for this workload, with 
                <strong>${virtualRecs.storageApproach}</strong> for storage. Each physical host should have 
                <strong>${virtualRecs.hostRecommendation.cpuRecommendation}</strong> and 
                <strong>${virtualRecs.hostRecommendation.ramRecommendation}</strong>.</p>
            `;

            // Hardware Acceleration Note
            if (results.hardwareAcceleration !== 'none') {
                document.getElementById('hwAccelNote').innerHTML = `
                    <div class="note">
                        <p><strong>Hardware Acceleration Notice:</strong> The calculations assume 
                        <strong>${results.hardwareAcceleration} hardware acceleration</strong> is enabled for video processing.</p>
                        <ul>
                            <li><strong>Ensure compatibility:</strong> Verify that your hardware and software support this acceleration mode.</li>
                            ${results.hardwareAcceleration === 'full' ? 
                            '<li><strong>Full Acceleration:</strong> Requires dedicated server GPUs such as <strong>NVIDIA Tesla, Quadro, or RTX AI-enabled cards</strong>.</li>' :
                            '<li><strong>Partial Acceleration:</strong> May be available with <strong>integrated GPU (Intel QuickSync) or consumer-grade GPUs (NVIDIA GTX/RTX, AMD Radeon)</strong>.</li>'}
                            <li><strong>Driver & Codec Support:</strong> Ensure the required GPU drivers and video codecs (H.264, H.265) are installed and optimized.</li>
                        </ul>
                    </div>
                `;
                document.getElementById('hwAccelNote').style.display = 'block';
            } else {
                document.getElementById('hwAccelNote').style.display = 'none';
            }

            // Performance Recommendations
            let performanceRecs = `
                <li><strong>Network:</strong> Implement a dedicated VLAN for camera traffic with at least 
                ${Math.ceil(results.networkBandwidthMbps * results.vmsNeeded / 1000)} Gbps capacity. 
                Use redundant 10GbE+ connections for high-bandwidth deployments.</li>
                <li><strong>Storage:</strong> Use enterprise-grade storage rated for 24/7 surveillance workloads 
                (e.g., WD Purple Pro, Seagate SkyHawk AI) with optimized write endurance.</li>
                <li><strong>Compute:</strong> Enable CPU pinning and NUMA awareness to optimize VM performance for high-throughput workloads.</li>
            `;

            // Additional recommendations based on camera density
            if (results.camerasPerVM > 20) {
                performanceRecs += `
                    <li>Distribute cameras across multiple VMs to balance CPU load and improve fault tolerance.</li>
                    <li>Consider GPU acceleration (e.g., NVIDIA Tesla T4) for analytics-heavy workloads.</li>
                `;
            }

            if (results.vmsNeeded > 4) {
                performanceRecs += `
                    <li>Implement a load balancing solution (e.g., Nginx, HAProxy) for client connections to optimize traffic distribution.</li>
                    <li>Use SR-IOV or RDMA-enabled networking to minimize latency for large-scale deployments.</li>
                `;
            }

            document.getElementById('performanceRecommendations').innerHTML = performanceRecs;

            // Redundancy Recommendations
            let redundancyRecs = `
                <li><strong>High Availability:</strong> Implement VM HA (VMware HA, Hyper-V Failover Clustering) to ensure rapid recovery from host failures.</li>
                <li><strong>Storage Redundancy:</strong> Deploy a dual-controller SAN or hyperconverged storage with erasure coding for fault tolerance.</li>
                <li><strong>Network Redundancy:</strong> Use LACP or MLAG for network link aggregation, ensuring failover protection.</li>
            `;

            // If multiple physical hosts are needed, add additional failover recommendations
            if (results.physicalHostsNeeded > 1) {
            redundancyRecs += `
                <li>Deploy multiple recording servers with active-active or active-passive failover for uninterrupted video recording.</li>
                <li>Implement cross-site replication for disaster recovery in mission-critical environments.</li>
            `;
            }

            document.getElementById('redundancyRecommendations').innerHTML = redundancyRecs;

            // Scaling Recommendations
            let scalingRecs = '';
            const expansionCapacity = Math.floor((results.raidConfig.usableCapacity - results.storageWithOverheadTB) / 
                (results.storageWithOverheadTB / this.inputs.cameraCount));

            if (expansionCapacity > 0) {
                scalingRecs += `
                    <li>Your current storage configuration can support approximately <strong>${expansionCapacity} additional cameras</strong> 
                    before requiring an upgrade.</li>
                `;
            }

            scalingRecs += `
                <li><strong>Future CPU/RAM Needs:</strong> Reserve at least <strong>${Math.ceil(results.cpuCoresPerVM * 0.3)}</strong> additional CPU cores 
                and <strong>${Math.ceil(results.ramPerVM * 0.3)} GB</strong> of RAM per physical host for future expansion.</li>
                <li><strong>Storage Scaling:</strong> Consider a hyperconverged infrastructure or scale-out NAS (e.g., Dell VxRail, NetApp AFF) 
                for seamless compute and storage scaling.</li>
                <li><strong>Networking Expansion:</strong> Plan for 25GbE+ network uplinks if camera density increases significantly.</li>
            `;

            document.getElementById('scalingRecommendations').innerHTML = scalingRecs;
            
            // Show the results section
            document.getElementById('results').style.display = 'block';
        } catch (error) {
            console.error("Error displaying results:", error);
            this.handleCalculationError(error);
        }
    },
    
    // Generate a printable summary report
    generatePrintableSummary: function(results) {
        const summary = document.createElement('div');
        summary.className = 'printable-summary';
        
        // Create a header section
        const header = document.createElement('div');
        header.innerHTML = `
            <h2>Camera Server Sizing Summary Report</h2>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <p>Configuration: ${this.inputs.cameraCount} cameras, ${this.inputs.resolution} resolution, 
            ${this.inputs.retentionDays} days retention</p>
        `;
        summary.appendChild(header);
        
        // Create storage section
        const storageSection = document.createElement('div');
        storageSection.innerHTML = `
            <h3>Storage Requirements</h3>
            <ul>
                <li>Total Storage Needed: ${results.storageWithOverheadTB.toFixed(2)} TB</li>
                <li>Recommended RAID: ${results.raidConfig.raidLevel} with ${results.raidConfig.totalDrives} drives 
                of ${results.raidConfig.hdSizeTB} TB each</li>
                <li>Usable Capacity: ${results.raidConfig.usableCapacity.toFixed(2)} TB</li>
            </ul>
        `;
        summary.appendChild(storageSection);
        
        // Create VM section
        const vmSection = document.createElement('div');
        vmSection.innerHTML = `
            <h3>Virtual Machine Requirements</h3>
            <ul>
                <li>VMs Required: ${results.vmsNeeded}</li>
                <li>Per VM Specifications:
                    <ul>
                        <li>Cameras: ${results.camerasPerVM}</li>
                        <li>CPU Cores: ${results.cpuCoresPerVM}</li>
                        <li>RAM: ${results.ramPerVM} GB</li>
                        <li>Network Bandwidth: ${Math.ceil(results.networkBandwidthMbps)} Mbps</li>
                    </ul>
                </li>
                <li>Physical Hosts Required: ${results.physicalHostsNeeded}</li>
            </ul>
        `;
        summary.appendChild(vmSection);
        
        // Create recommendations section
        const recommendationsSection = document.createElement('div');
        recommendationsSection.innerHTML = `
            <h3>Key Recommendations</h3>
            <ul>
                <li>Hypervisor: ${virtualRecs.hypervisorRecommendation}</li>
                <li>Storage: ${virtualRecs.storageApproach}</li>
                <li>CPU: ${virtualRecs.hostRecommendation.cpuRecommendation}</li>
                <li>RAM: ${virtualRecs.hostRecommendation.ramRecommendation}</li>
            </ul>
        `;
        summary.appendChild(recommendationsSection);
        
        return summary;
    },
    
    // Export results to CSV format
    exportToCSV: function(results) {
        try {
            // Create CSV header row
            let csvContent = "Parameter,Value\n";
            
            // Add camera and storage information
            csvContent += `Number of Cameras,${this.inputs.cameraCount}\n`;
            csvContent += `Resolution,${this.inputs.resolution}\n`;
            csvContent += `Compression,${this.inputs.compression}\n`;
            csvContent += `Frame Rate,${this.inputs.frameRate} fps\n`;
            csvContent += `Motion Activity,${this.inputs.motionActivity}\n`;
            csvContent += `Recording Mode,${this.inputs.recordingMode}\n`;
            csvContent += `Hours Per Day,${this.inputs.hoursPerDay}\n`;
            csvContent += `Retention Period,${this.inputs.retentionDays} days\n`;
            csvContent += `Storage Buffer,${this.inputs.storageBuffer * 100}%\n`;
            csvContent += `Filesystem Overhead,${this.inputs.filesystemOverhead * 100}%\n`;
            
            // Add calculated results
            csvContent += `Bitrate Per Camera,${results.bitrateMbps} Mbps\n`;
            csvContent += `Daily Storage Per Camera,${results.dailyStoragePerCamera.toFixed(2)} GB/day\n`;
            csvContent += `Total Storage Needed,${results.storageWithOverheadTB.toFixed(2)} TB\n`;
            csvContent += `RAID Level,${results.raidConfig.raidLevel}\n`;
            csvContent += `Drives Needed,${results.raidConfig.totalDrives}\n`;
            csvContent += `Drive Size,${results.raidConfig.hdSizeTB} TB\n`;
            csvContent += `Usable Storage Capacity,${results.raidConfig.usableCapacity.toFixed(2)} TB\n`;
            csvContent += `VMs Needed,${results.vmsNeeded}\n`;
            csvContent += `Cameras Per VM,${results.camerasPerVM}\n`;
            csvContent += `CPU Cores Per VM,${results.cpuCoresPerVM}\n`;
            csvContent += `RAM Per VM,${results.ramPerVM} GB\n`;
            csvContent += `Network Bandwidth Per VM,${Math.ceil(results.networkBandwidthMbps)} Mbps\n`;
            csvContent += `Physical Hosts Needed,${results.physicalHostsNeeded}\n`;
            
            // Create a download link for the CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', 'camera_server_sizing_results.csv');
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return true;
        } catch (error) {
            console.error("Error exporting to CSV:", error);
            return false;
        }
    },
    
    // Save configuration as a preset
    saveConfigurationPreset: function() {
        try {
            // Gather all current inputs
            this.gatherInputs();
            
            // Create a preset object
            const preset = {
                name: prompt("Enter a name for this configuration preset:"),
                timestamp: new Date().toISOString(),
                configuration: JSON.parse(JSON.stringify(this.inputs))
            };
            
            // Don't save if the user cancels the prompt
            if (!preset.name) return false;
            
            // Get existing presets or initialize a new array
            let savedPresets = JSON.parse(localStorage.getItem('cameraServerPresets') || '[]');
            
            // Add new preset to the array
            savedPresets.push(preset);
            
            // Save back to localStorage
            localStorage.setItem('cameraServerPresets', JSON.stringify(savedPresets));
            
            alert(`Configuration "${preset.name}" has been saved successfully.`);
            return true;
        } catch (error) {
            console.error("Error saving preset:", error);
            alert("An error occurred while saving the configuration preset.");
            return false;
        }
    },
    
    // Load a saved preset
    loadConfigurationPreset: function(presetName) {
        try {
            // Get saved presets
            const savedPresets = JSON.parse(localStorage.getItem('cameraServerPresets') || '[]');
            
            // Find the requested preset
            const preset = savedPresets.find(p => p.name === presetName);
            
            if (!preset) {
                alert(`Preset "${presetName}" not found.`);
                return false;
            }
            
            // Apply the preset values to the form
            const config = preset.configuration;
            
            // Set all form fields from the configuration
            document.getElementById('cameraCount').value = config.cameraCount;
            document.getElementById('resolution').value = config.resolution;
            document.getElementById('compression').value = config.compression;
            document.getElementById('frameRate').value = config.frameRate;
            document.getElementById('motionActivity').value = config.motionActivity;
            document.getElementById('recordingMode').value = config.recordingMode;
            document.getElementById('hoursPerDay').value = config.hoursPerDay;
            document.getElementById('retentionDays').value = config.retentionDays;
            document.getElementById('hdSize').value = config.hdSize;
            document.getElementById('redundancyLevel').value = config.redundancyLevel;
            document.getElementById('storageBuffer').value = config.storageBuffer * 100;
            document.getElementById('filesystemOverhead').value = config.filesystemOverhead * 100;
            document.getElementById('maxCamerasPerServer').value = config.maxCamerasPerServer;
            document.getElementById('hardwareAcceleration').value = config.hardwareAcceleration;
            
            // Show/hide hours per day input based on recording mode
            const hoursGroup = document.getElementById('hoursPerDayGroup');
            hoursGroup.style.display = config.recordingMode === 'custom' ? 'block' : 'none';
            
            alert(`Configuration "${presetName}" has been loaded successfully.`);
            return true;
        } catch (error) {
            console.error("Error loading preset:", error);
            alert("An error occurred while loading the configuration preset.");
            return false;
        }
    },
    
    // Add export button to UI
    addExportButton: function() {
        const resultsDiv = document.getElementById('results');
        
        if (resultsDiv) {
            // Create export buttons container
            const exportContainer = document.createElement('div');
            exportContainer.className = 'export-container';
            exportContainer.style.marginTop = '20px';
            
            // Create CSV export button
            const csvButton = document.createElement('button');
            csvButton.className = 'button';
            csvButton.textContent = 'Export to CSV';
            csvButton.style.marginRight = '10px';
            csvButton.addEventListener('click', () => {
                this.gatherInputs();
                const results = this.calculateServerRequirements();
                this.exportToCSV(results);
            });
            
            // Create print button
            const printButton = document.createElement('button');
            printButton.className = 'button';
            printButton.textContent = 'Print Report';
            printButton.addEventListener('click', () => {
                window.print();
            });
            
            // Create save configuration button
            const saveConfigButton = document.createElement('button');
            saveConfigButton.className = 'button';
            saveConfigButton.textContent = 'Save Configuration';
            saveConfigButton.style.marginLeft = '10px';
            saveConfigButton.addEventListener('click', () => {
                this.saveConfigurationPreset();
            });
            
            // Add buttons to container
            exportContainer.appendChild(csvButton);
            exportContainer.appendChild(printButton);
            exportContainer.appendChild(saveConfigButton);
            
            // Add container to results
            resultsDiv.appendChild(exportContainer);
        }
    }
};

// Initialize the application when the script loads
document.addEventListener('DOMContentLoaded', function() {
    CameraServerSizer.init();
    CameraServerSizer.addExportButton();
    
    // Add a presets dropdown to the UI if needed
    const presets = JSON.parse(localStorage.getItem('cameraServerPresets') || '[]');
    
    if (presets.length > 0) {
        const formElement = document.getElementById('sizingForm');
        const presetsContainer = document.createElement('div');
        presetsContainer.className = 'form-section';
        presetsContainer.innerHTML = `
            <h3>Load Saved Configuration</h3>
            <div class="form-group">
                <label for="configPresets">Saved Configurations:</label>
                <select id="configPresets">
                    <option value="">-- Select a configuration --</option>
                    ${presets.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
                </select>
            </div>
            <button type="button" id="loadPresetBtn" class="button">Load Configuration</button>
        `;
        
        formElement.insertBefore(presetsContainer, formElement.firstChild);
        
        document.getElementById('loadPresetBtn').addEventListener('click', function() {
            const selectedPreset = document.getElementById('configPresets').value;
            if (selectedPreset) {
                CameraServerSizer.loadConfigurationPreset(selectedPreset);
            } else {
                alert('Please select a configuration to load.');
            }
        });
    }
});


// Function to fetch saved configurations
function fetchConfigurations() {
    const configDiv = document.getElementById("sidebar-configurations");
    
    if (!configDiv) {
        console.error("Sidebar element not found.");
        return;
    }

    // Retrieve saved configurations from localStorage
    const savedPresets = JSON.parse(localStorage.getItem('cameraServerPresets') || '[]');

    // Debugging: Check if presets exist
    console.log("Loaded Presets:", savedPresets);

    // Clear existing sidebar content
    configDiv.innerHTML = "";

    if (savedPresets.length === 0) {
        configDiv.innerHTML = "<p>No saved configurations</p>";
        return;
    }

    // Populate sidebar with saved configurations
    savedPresets.forEach(config => {
        const entry = document.createElement("div");
        entry.classList.add("config-item");
        entry.innerHTML = `
            <div style="border: 1px solid #ddd; padding: 10px; margin: 5px; border-radius: 5px;">
                <p><strong>Site:</strong> ${config.name}</p>
                <p><strong>Cameras:</strong> ${config.configuration.cameraCount}</p>
                <p><strong>Retention:</strong> ${config.configuration.retentionDays} days</p>
                <button onclick="loadConfiguration('${config.name}')">Load</button>
                <button onclick="deleteConfiguration('${config.name}')" style="background-color: red; color: white;">Delete</button>
            </div>`;
        configDiv.appendChild(entry);
    });
}

// Load configurations when the page is ready
document.addEventListener("DOMContentLoaded", fetchConfigurations);

// Function to save a configuration
function saveConfiguration(config) {
    fetch('/save-configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
    .then(() => {
        alert("Configuration saved!");
        fetchConfigurations();
    })
    .catch(error => console.error('Error saving configuration:', error));
}

function loadConfiguration(configName) {
    const savedPresets = JSON.parse(localStorage.getItem('cameraServerPresets') || '[]');
    
    const selectedConfig = savedPresets.find(preset => preset.name === configName);
    
    if (!selectedConfig) {
        alert("Configuration not found.");
        return;
    }

    console.log("Loading configuration:", selectedConfig);

    // Example: Populate form fields (update based on your form structure)
    document.getElementById("cameraCount").value = selectedConfig.configuration.cameraCount;
    document.getElementById("retentionDays").value = selectedConfig.configuration.retentionDays;
}

// Function to delete a saved configuration
function deleteConfiguration(configName) {
    let savedPresets = JSON.parse(localStorage.getItem('cameraServerPresets') || '[]');
    
    // Filter out the configuration to delete
    savedPresets = savedPresets.filter(config => config.name !== configName);
    
    // Save back to localStorage
    localStorage.setItem('cameraServerPresets', JSON.stringify(savedPresets));
    
    alert("Configuration deleted!");
    fetchConfigurations(); // Refresh the list
}