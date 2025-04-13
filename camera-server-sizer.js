// Main application namespace
const CameraServerSizer = {
    // Configuration constants
    config: {
        bitrateFactors: {
            resolutions: {
                '720p': 2.5,     // baseline at 30fps, H.264, medium motion
                '1080p': 4.0,
                '2K': 6.0,
                '4K': 12.0,
                '8K': 24.0
            },
            compression: {
                'MJPEG': {
                    factor: 4.0,
                    mode: 'CBR',
                    notes: 'MJPEG is extremely inefficient and rarely recommended except for legacy compatibility.'
                },
                'H.264': {
                    factor: 1.0,
                    mode: 'VBR',
                    efficiency: {
                        motion: 1.0,
                        idle: 0.4 // idle is usually far smaller for H.264 VBR
                    },
                    notes: 'Standard H.264 with motion-based variation (VBR modeled)'
                },
                'H.264+': {
                    factor: 0.9,
                    mode: 'CBR',
                    notes: 'Smart H.264 variant with improved efficiency'
                },
                'H.265': {
                    factor: 0.7,
                    mode: 'VBR',        // 30% reduction on average
                    efficiency: {
                        motion: 1.0,    // base bitrate multiplier
                        idle: 0.55      // VBR idle bitrate multiplier
                    },
                    notes: 'Realistic VBR usage; supports hybrid motion compression'
                },
                'H.265_CBR': {
                    factor: 0.7,
                    mode: 'CBR',
                    notes: 'CBR variant of H.265 (common in VMS configs)'
                },
                'H.265+': {
                    factor: 0.6,
                    mode: 'VBR',
                    efficiency: {
                        motion: 1.0,
                        idle: 0.4
                    },
                    notes: 'Smart codec variant (e.g., Hikvision H.265+)'
                },
                'H.266': {
                    factor: 0.45,
                    mode: 'VBR',
                    efficiency: {
                        motion: 1.0,
                        idle: 0.25
                    }
                }
            },
        
            motionProfiles: {
                veryLow: {
                    avgMotionHours: 2,
                    idleHours: 22,
                    motionFactor: 0.8,
                    idleFactor: 0.1,
                    description: "Extremely limited activity. Only occasional movement.",
                    examples: "Secure storage areas, server rooms, vacant buildings, emergency exits",
                    notes: "Ideal for motion-based recording with significant storage savings"
                },
                low: {
                    avgMotionHours: 4,
                    idleHours: 20,
                    motionFactor: 0.9,
                    idleFactor: 0.15,
                    description: "Limited daily activity with long periods of inactivity.",
                    examples: "Warehouses, offices after hours, utility rooms, archive storage, parking garages (overnight)",
                    notes: "Good candidate for scheduled quality/framerate reduction during off-hours"
                },
                lowMedium: {
                    avgMotionHours: 8,
                    idleHours: 16,
                    motionFactor: 1.0,
                    idleFactor: 0.2,
                    description: "Moderate activity during business hours, quiet otherwise.",
                    examples: "Office corridors, meeting rooms, storage facilities with daily operations, secondary entrances",
                    notes: "Benefits from business hours scheduling and potential weekend reductions"
                },
                medium: {
                    avgMotionHours: 12,
                    idleHours: 12,
                    motionFactor: 1.1,
                    idleFactor: 0.25,
                    description: "Regular activity throughout day with quieter nighttime periods.",
                    examples: "Retail floors, school hallways, office lobbies, restaurant dining areas, hotel reception",
                    notes: "Standard profile for most business environments with regular hours"
                },
                mediumHigh: {
                    avgMotionHours: 16,
                    idleHours: 8,
                    motionFactor: 1.2,
                    idleFactor: 0.3,
                    description: "Consistent activity with brief quiet periods.",
                    examples: "Busy retail locations, transportation waiting areas, hospital corridors, casino floors",
                    notes: "Higher baseline bitrate needed due to extended activity periods"
                },
                high: {
                    avgMotionHours: 20,
                    idleHours: 4,
                    motionFactor: 1.3,
                    idleFactor: 0.4,
                    description: "Constant activity with minimal downtime.",
                    examples: "Main entrances, busy street intersections, transit stations, airport security checkpoints",
                    notes: "Limited opportunity for bitrate reduction, even during off-hours"
                },
                veryHigh: {
                    avgMotionHours: 23,
                    idleHours: 1,
                    motionFactor: 1.4,
                    idleFactor: 0.5,
                    description: "Non-stop activity with almost no idle time.",
                    examples: "Major intersections, emergency room entrances, 24-hour retail, busy transit hubs",
                    notes: "Recommend CBR encoding as VBR offers minimal benefit with constant motion"
                },
                custom: {
                    configurable: true,
                    description: "User-defined motion profile with custom hour distribution",
                    notes: "Allows precise tuning for specific environments with unique activity patterns"
                },
                // Special purpose profiles
                dayOnly: {
                    avgMotionHours: 10,
                    idleHours: 14,
                    activePeriod: "06:00-20:00",
                    motionFactor: 1.0,
                    idleFactor: 0.3,
                    description: "Active only during daytime business hours.",
                    examples: "Banks, government offices, day-shift manufacturing",
                    notes: "Can be paired with scheduled recording to avoid unnecessary nighttime storage"
                },
                nightOnly: {
                    avgMotionHours: 10,
                    idleHours: 14,
                    activePeriod: "20:00-06:00",
                    motionFactor: 1.0,
                    idleFactor: 0.3,
                    description: "Active primarily during overnight hours.",
                    examples: "Night clubs, 24-hour manufacturing, overnight shipping facilities",
                    notes: "Inverse of day-only profile, with potential for daytime quality reduction"
                },
                rushHours: {
                    avgMotionHours: 6,
                    idleHours: 18,
                    activePeriods: ["07:00-09:00", "16:00-20:00"],
                    motionFactor: 1.0,
                    idleFactor: 0.4,
                    description: "Concentrated activity during morning and evening rush periods.",
                    examples: "Transit stations, commuter areas, school entrances, shift-change areas",
                    notes: "Benefits from scheduled quality changes for peak times"
                }
            },
        
            framerateScaling: function(fps) {
                const baseline = 30;
                if (fps < 10) return Math.pow(fps / baseline, 1.1); // steeper penalty
                return Math.pow(fps / baseline, 0.95);              // near-linear otherwise
                // This penalizes low-fps configurations more, which reflects real-world inefficiencies 
                // (low-fps has fewer I-frames to work with, worse motion comp)
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
            const {
                resolution, compression, frameRate, motionActivity,
                recordingMode, hoursPerDay, cameraCount, retentionDays,
                storageBuffer, filesystemOverhead, hdSize,
                redundancyLevel, maxCamerasPerServer, hardwareAcceleration
            } = this.inputs;
    
            // --- Bitrate and Storage ---
            const bitrateMbps = this.calculateBitrate(resolution, compression, frameRate, motionActivity);
            const gbPerHourPerCamera = bitrateMbps * this.config.mbpsToGBPerHour;
    
            const hoursMultiplier = (recordingMode === 'custom') ?
                this.getEffectiveHoursMultiplier(motionActivity) : 1;
            const recordingHoursPerDayPerCamera = hoursPerDay * hoursMultiplier;
    
            const dailyGbPerCamera = gbPerHourPerCamera * recordingHoursPerDayPerCamera;
            const totalGb = dailyGbPerCamera * cameraCount * retentionDays;
            const totalTb = totalGb / 1024;
    
            const storageWithBuffer = totalTb * (1 + storageBuffer);
            const storageWithOverhead = storageWithBuffer * (1 + filesystemOverhead);
    
            // --- RAID Configuration ---
            const raidConfig = this.calculateRaidConfiguration(storageWithOverhead, hdSize, redundancyLevel);
    
            // --- Server Count ---
            const serversForCameras = Math.ceil(cameraCount / maxCamerasPerServer);
            const serversForStorage = Math.ceil(storageWithOverhead / raidConfig.usableCapacity);
            const vmsNeeded = Math.max(serversForCameras, serversForStorage);
            const camerasPerVM = Math.ceil(cameraCount / vmsNeeded);
    
            // --- VM Sizing ---
            const vmSize = this.determineVMSize(camerasPerVM);
            const cpuOverheadFactor = this.config.vmSizing.sizes[vmSize].cpuOverheadFactor;
            const cpuPerCamera = this.calculateCpuCoresPerCamera(resolution, compression, frameRate, hardwareAcceleration);
            const cpuCoresPerVM = Math.max(4, Math.ceil(camerasPerVM * cpuPerCamera * cpuOverheadFactor));
    
            const ramPerVM = this.calculateRamRequirements(camerasPerVM, resolution);
    
            // --- Networking ---
            const networkOverhead = 1.1;
            const networkBandwidth = camerasPerVM * bitrateMbps * networkOverhead;
    
            // --- Host Calculation ---
            const physicalHostsNeeded = this.calculatePhysicalHosts(vmsNeeded, cpuCoresPerVM, ramPerVM);
    
            return {
                bitrateMbps,
                dailyStoragePerCamera: dailyGbPerCamera,
                totalRawStorageTB: totalTb,
                storageWithBufferTB: storageWithBuffer,
                storageWithOverheadTB: storageWithOverhead,
                raidConfig,
                vmsNeeded,
                camerasPerVM,
                cpuCoresPerVM,
                ramPerVM,
                networkBandwidthMbps: parseFloat(networkBandwidth.toFixed(2)),
                hardwareAcceleration,
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
        const ramPerPhysicalHost = 512; // Total RAM per host in GB
        
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
    calculateBitrate: function(resolution, compression, frameRate, motionProfileKey) {
        const {
            resolutions,
            compression: compressionMap,
            motionProfiles,
            framerateScaling
        } = this.config.bitrateFactors;

        const resolutionFactor = resolutions[resolution];
        const codec = compressionMap[compression];
        const motionProfile = motionProfiles[motionProfileKey];

        if (!resolutionFactor || !codec || !motionProfile) {
            throw new Error(`Unsupported resolution (${resolution}), compression (${compression}), or motion profile (${motionProfileKey})`);
        }

        // Custom profile handler
        if (motionProfileKey === 'custom' && motionProfile.configurable && typeof this.getCustomProfileBitrate === 'function') {
            return this.getCustomProfileBitrate(resolution, compression, frameRate);
        }

        const isVBR = codec.mode === 'VBR';
        const compressionFactor = codec.factor;
        const motionScalar = isVBR ? codec.efficiency?.motion || 1 : 1;
        const idleScalar = isVBR ? codec.efficiency?.idle || 1 : 1;

        const fpsFactor = typeof framerateScaling === 'function'
            ? framerateScaling(frameRate)
            : frameRate / 30;

        // Raw bitrate calculation
        let motionBitrate = resolutionFactor * compressionFactor * motionScalar * fpsFactor;
        let idleBitrate = resolutionFactor * compressionFactor * idleScalar * fpsFactor;

        // Apply motion profile multipliers
        if (motionProfile.motionFactor) motionBitrate *= motionProfile.motionFactor;
        if (motionProfile.idleFactor) idleBitrate *= motionProfile.idleFactor;

        // Scene entropy modifier (for idle stream VBR)
        if (isVBR && this.sceneComplexityFactors) {
            const idlePenalty = this.sceneComplexityFactors[this.sceneComplexity] || 1;
            idleBitrate *= idlePenalty;
        }

        // CBR = same bitrate always
        if (!isVBR) idleBitrate = motionBitrate;

        // Adaptive minimum bitrate floor based on resolution, codec, and framerate
        const getAdaptiveMinBitrate = (res, codecName, fps) => {
            const baseFloors = {
                '720p': 0.75,
                '1080p': 1.0,
                '1440p': 1.3,
                '2K': 1.4,
                '4K': 2.8,
                '5K': 3.8,
                '8K': 5.5,
                '12K': 9.5
            };

            // Safe default if unknown resolution
            let base = baseFloors[res] || 0.75;

            // Framerate influence: less than linear scaling, matches perceptual quality needs
            const fpsFactor = Math.pow(fps / 10, 0.65); // 10 fps baseline
            base *= fpsFactor;

            // Codec efficiency modifiers — smaller = more efficient
            const codecEfficiency = {
                'MJPEG': 1.4,
                'H.264': 1.0,
                'H.264+': 0.85,
                'H.265': 0.70,
                'H.265+': 0.60,
                'H.266/VVC': 0.50,
                'AV1': 0.55
            };

            const efficiency = codecEfficiency[codecName] || 1.0;
            base *= efficiency;

            // Scene complexity adjustments
            if (typeof this.sceneComplexity === 'string') {
                const complexityFactor = {
                    low: 0.95,
                    medium: 1.0,
                    high: 1.15,
                    extreme: 1.3
                };
                base *= complexityFactor[this.sceneComplexity] || 1.0;
            }

            return parseFloat(base.toFixed(2));
        };

        const minMotion = getAdaptiveMinBitrate.call(this, resolution, compression, frameRate);
        const minIdle = minMotion * 0.25;

        // Enforce bitrate floors
        motionBitrate = Math.max(motionBitrate, minMotion);
        idleBitrate = Math.max(idleBitrate, minIdle);

        const motionHours = motionProfile.avgMotionHours ?? 12;
        const idleHours = motionProfile.idleHours ?? (24 - motionHours);

        // Final scene adjustment after weighting
        const baseBitrate = ((motionBitrate * motionHours) + (idleBitrate * idleHours)) / 24;
        const sceneFactor = this.sceneComplexityFactors?.[this.sceneComplexity] || 1.0;
        const finalBitrate = baseBitrate * sceneFactor;

        // Apply final floor (same as motion)
        return parseFloat(Math.max(finalBitrate, minMotion).toFixed(2)); // Mbps
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
    calculateCpuCoresPerCamera: function(resolution, compression, frameRate, hardwareAcceleration, analyticsLevel = 'none', storageType = 'standard') {
        // Base CPU requirements (cores per camera for 1080p, H.264, 30fps, no hardware acceleration)
        let baseCores = 0.18;
        
        // Resolution multipliers - with more accurate scaling based on pixel count
        const resolutionMultipliers = {
            '480p': 0.25,  // 640x480 (0.3MP)
            '720p': 0.45,  // 1280x720 (0.9MP)
            '1080p': 1.0,  // 1920x1080 (2.1MP)
            '1440p': 1.7,  // 2560x1440 (3.7MP)
            '2K': 1.8,     // 2560x1600 (4.1MP)
            '4K': 3.2,     // 3840x2160 (8.3MP)
            '5K': 4.4,     // 5120x2880 (14.7MP)
            '8K': 7.0,     // 7680x4320 (33.2MP)
            '12K': 14.0    // 12288x6480 (79.6MP)
        };
    
        // Get raw resolution multiplier if specified format exists
        let resolutionMultiplier = resolutionMultipliers[resolution] || 1.0;
    
        // If resolution is specified as dimensions (e.g. "1920x1080")
        if (resolution.includes('x')) {
            const dimensions = resolution.split('x');
            if (dimensions.length === 2) {
                const pixelCount = parseInt(dimensions[0]) * parseInt(dimensions[1]);
                // Calculate relative to 1080p (2.1MP)
                resolutionMultiplier = pixelCount / (1920 * 1080);
                // Apply non-linear scaling for very high resolutions
                if (resolutionMultiplier > 2) {
                    resolutionMultiplier = Math.pow(resolutionMultiplier, 0.85);
                }
            }
        }
        
        // Compression complexity multipliers - fine-tuned for modern processors
        const compressionMultipliers = {
            'MJPEG': 0.7,   // Simple decompression
            'H.264': 1.0,   // Baseline reference
            'H.264+': 1.1,  // Advanced H.264 with smart encoding features
            'H.265': 1.2,   // More efficient but requires more processing
            'H.265+': 1.4,  // Smart H.265 variants (Hikvision, etc.)
            'H.266/VVC': 1.9, // Emerging codec, more complex encoding
            'AV1': 1.7      // Next-gen, highly efficient codec (but demanding)
        };
        
        // Framerates don't scale linearly with CPU usage
        // Non-linear scaling based on measured performance
        function getFramerateCpuMultiplier(fps) {
            const baseFrameRate = 30;
            if (fps <= 0) return 0.1; // Minimum load for stream handling
            if (fps <= 5) return 0.4; // Low framerates still have overhead
            if (fps <= 15) return 0.7; // Mid-range framerates
            if (fps === baseFrameRate) return 1.0; // Reference point
            // Non-linear scaling for higher framerates
            return Math.pow(fps / baseFrameRate, 0.8);
        }
        
        // Hardware acceleration based on real-world benchmarks
        const hwAccelMultipliers = {
            'none': 1.0,        // Full software encoding
            'partial': 0.35,    // Partial hardware acceleration (e.g., CUDA, QuickSync limited)
            'full': 0.12,       // Full hardware acceleration (modern GPU/NPU)
            'advanced': 0.08    // Latest generation hardware acceleration with AI cores
        };
        
        // Video analytics has significant impact on CPU requirements
        const analyticsMultipliers = {
            'none': 1.0,        // No analytics
            'basic': 1.4,       // Motion detection, simple analytics
            'standard': 2.0,    // Object detection, basic classification
            'advanced': 3.2,    // Object tracking, behavior analysis
            'ai': 4.5           // Full AI-powered analytics (if not offloaded to GPU)
        };
        
        // Storage type affects CPU usage (particularly for direct-to-disk streaming)
        const storageMultipliers = {
            'standard': 1.0,      // Regular storage
            'redundant': 1.1,     // RAID configurations need more processing
            'encrypted': 1.2,     // Encryption adds overhead
            'cloud': 1.15         // Cloud uploading adds processing requirements
        };
        
        // Calculate cores needed with improved scaling factors
        baseCores *= resolutionMultiplier;
        baseCores *= compressionMultipliers[compression] || 1.0;
        baseCores *= getFramerateCpuMultiplier(frameRate);
        baseCores *= hwAccelMultipliers[hardwareAcceleration] || 1.0;
        baseCores *= analyticsMultipliers[analyticsLevel] || 1.0;
        baseCores *= storageMultipliers[storageType] || 1.0;
        
        // Apply minimum value to prevent unrealistically low estimates
        return Math.max(0.05, parseFloat(baseCores.toFixed(3)));
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
            
            // RAID Configuration - UPDATED FOR NEW FORMAT
            document.getElementById('raidLevel').textContent = results.raidConfig.raidLevel;
            document.getElementById('drivesNeeded').textContent = results.raidConfig.totalDrives;
            document.getElementById('driveSize').textContent = `${results.raidConfig.hdSizeTB} TB`;
            document.getElementById('totalRawCapacity').textContent = `${results.raidConfig.totalRawCapacity.toFixed(2)} TB`;
            document.getElementById('usableCapacity').textContent = `${results.raidConfig.usableCapacity.toFixed(2)} TB`;
            
            // Add the new storage efficiency field
            if (document.getElementById('storageEfficiency')) {
                document.getElementById('storageEfficiency').textContent = results.raidConfig.storageEfficiency || 
                    `${(results.raidConfig.usableCapacity / results.raidConfig.totalRawCapacity * 100).toFixed(1)}%`;
            }
            
            // Handle multi-array configuration if present
            if (results.raidConfig.arrayCount && document.getElementById('arrayCount')) {
                // Show the array details section
                const arrayDetailsSection = document.getElementById('arrayDetailsSection');
                if (arrayDetailsSection) {
                    arrayDetailsSection.style.display = results.raidConfig.arrayCount > 1 ? 'block' : 'none';
                }
                
                // Update array count
                document.getElementById('arrayCount').textContent = results.raidConfig.arrayCount;
                
                // Generate array details
                if (document.getElementById('arrayDetails') && results.raidConfig.drivesPerArray) {
                    const arrayDetailsContainer = document.getElementById('arrayDetails');
                    arrayDetailsContainer.innerHTML = '';
                    
                    for (let i = 0; i < results.raidConfig.arrayCount; i++) {
                        const arrayDetail = document.createElement('div');
                        arrayDetail.className = 'array-detail-item';
                        arrayDetail.innerHTML = `
                            <h5>Array ${i + 1}</h5>
                            <div class="array-info">
                                <div class="array-info-item">
                                    <span class="array-info-label">Drives:</span>
                                    <span class="array-info-value">${results.raidConfig.drivesPerArray[i]}</span>
                                </div>
                                <div class="array-info-item">
                                    <span class="array-info-label">Usable Capacity:</span>
                                    <span class="array-info-value">${results.raidConfig.capacityPerArray[i].toFixed(2)} TB</span>
                                </div>
                            </div>
                        `;
                        arrayDetailsContainer.appendChild(arrayDetail);
                    }
                }
            }
    
            // Generate RAID Analysis with expanded information
            let raidAnalysisHTML = `
                <p><strong>Recommended RAID Configuration:</strong></p>
                <ul>
                    <li><strong>RAID Level:</strong> ${results.raidConfig.raidLevel} (optimized for ${getRaidBenefits(results.raidConfig.raidLevel)})</li>
                    <li><strong>Total Drives Required:</strong> ${results.raidConfig.totalDrives} × ${results.raidConfig.hdSizeTB} TB drives</li>
                    <li><strong>Raw Storage Capacity:</strong> ${results.raidConfig.totalRawCapacity.toFixed(2)} TB</li>
                    <li><strong>Usable Storage Capacity:</strong> ${results.raidConfig.usableCapacity.toFixed(2)} TB (after redundancy & overhead)</li>
                    <li><strong>Storage Efficiency:</strong> ${results.raidConfig.storageEfficiency || 
                        `${(results.raidConfig.usableCapacity / results.raidConfig.totalRawCapacity * 100).toFixed(1)}%`}</li>
                    <li><strong>Fault Tolerance:</strong> ${getRaidFaultTolerance(results.raidConfig.raidLevel)}</li>
            `;
            
            // Add array information if applicable
            if (results.raidConfig.arrayCount && results.raidConfig.arrayCount > 1) {
                raidAnalysisHTML += `
                    <li><strong>Array Configuration:</strong> ${results.raidConfig.arrayCount} separate arrays with maximum ${
                        Math.max(...(results.raidConfig.drivesPerArray || [12]))} drives per array</li>
                `;
            }
            
            raidAnalysisHTML += `
                </ul>
                <p><strong>Note:</strong> Ensure proper disk monitoring and hot spare drives for higher resilience.</p>
            `;
            
            // Add array-specific recommendations for multi-array setups
            if (results.raidConfig.arrayCount && results.raidConfig.arrayCount > 1) {
                raidAnalysisHTML += `
                <p><strong>Multi-Array Deployment:</strong> Storage requirement has been divided into ${
                    results.raidConfig.arrayCount} separate arrays to maintain optimal performance and rebuild times. 
                    Consider distributing these arrays across separate storage controllers for improved performance.</p>
                `;
            }
            
            document.getElementById('raidAnalysis').innerHTML = raidAnalysisHTML;
    
            // Function to provide RAID benefits
            function getRaidBenefits(raidLevel) {
                const benefits = {
                    'RAID0': 'high performance but no redundancy',
                    'RAID1': 'mirroring for data protection',
                    'RAID5': 'balanced performance and redundancy',
                    'RAID6': 'extra fault tolerance with dual-parity',
                    'RAID10': 'high performance and redundancy (striped mirroring)'
                };
                return benefits[raidLevel.replace(/\s+/g, '')] || 'optimized redundancy and performance';
            }
    
            // Function to determine fault tolerance
            function getRaidFaultTolerance(raidLevel) {
                const faultTolerance = {
                    'RAID0': 'No drive failure tolerance',
                    'RAID1': 'Can tolerate 1 drive failure',
                    'RAID5': 'Can tolerate 1 drive failure',
                    'RAID6': 'Can tolerate up to 2 drive failures',
                    'RAID10': 'Can tolerate up to 1 drive failure per mirrored pair'
                };
                return faultTolerance[raidLevel.replace(/\s+/g, '')] || 'Varies based on configuration';
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
                <li><strong>Network:</strong> Implement a QoS-enabled dedicated VLAN for camera traffic with at least 
                ${Math.ceil(results.networkBandwidthMbps * results.vmsNeeded / 1000)} Gbps capacity. Deploy redundant switches 
                with LACP-bonded 10GbE+ connections and configure jumbo frames for optimal throughput.</li>
                <li><strong>Storage:</strong> Utilize enterprise surveillance-rated NVMe storage in RAID 6 or RAID 10 configuration 
                with hot spares. Implement tiered storage with 7-10 day retention on primary storage and longer-term archiving on 
                lower-cost media. Install UPS with graceful shutdown capability.</li>
                <li><strong>Compute:</strong> Configure over-provisioning protection with at least 20% headroom for CPU/RAM. Enable 
                CPU pinning with NUMA awareness and dedicated GPU resources where applicable. Implement live migration capability for 
                maintenance without recording interruption.</li>
            `;
    
            // Additional recommendations based on camera density
            if (results.camerasPerVM > 20) {
                performanceRecs += `
                    <li><strong>Camera Distribution:</strong> Implement N+1 redundancy by distributing cameras across multiple VMs to balance processing load and maintain performance during partial system failures.</li>
                    <li><strong>Hardware Acceleration:</strong> Deploy purpose-built GPU acceleration (NVIDIA T4/A10/A30 or Intel QuickSync) to offload motion detection, video analytics, and AI processing from CPU cores, reducing system overhead by up to 60%.</li>
                `;
            }
            
            if (results.vmsNeeded > 4) {
                performanceRecs += `
                    <li><strong>Traffic Management:</strong> Implement an enterprise load balancer (F5, Citrix ADC, or NGINX Plus) with SSL offloading and connection persistence to optimize client connections and bandwidth utilization.</li>
                    <li><strong>Network Optimization:</strong> Utilize SR-IOV or RDMA-enabled network adapters with dedicated bandwidth allocation to minimize latency and maximize throughput for large camera deployments.</li>
                `;
            }
            document.getElementById('performanceRecommendations').innerHTML = performanceRecs;
            
            // Redundancy Recommendations
            let redundancyRecs = `
                <li><strong>High Availability:</strong> Implement N+1 host redundancy with automated VM failover (VMware HA/DRS, Hyper-V Failover Clustering) configured for &lt;30 second recovery time to ensure continuous recording during hardware failures.</li>
                <li><strong>Storage Redundancy:</strong> Deploy enterprise-class storage with dual controllers, battery-backed cache, and RAID 6/60 or erasure coding (minimum 2N protection). Maintain separate metadata volumes with higher redundancy levels.</li>
                <li><strong>Network Resilience:</strong> Implement full fabric redundancy with dual switches, MLAG/VPC configurations, and automatic link failure detection. Configure diverse physical paths for critical camera traffic.</li>
            `;
    
            // If multiple physical hosts are needed, add additional failover recommendations
            if (results.physicalHostsNeeded > 1) {
                redundancyRecs += `
                    <li><strong>Distributed Recording:</strong> Implement geographically dispersed recording servers in an N+1 or N+N active-active configuration with automatic failover orchestration and continuous replication to maintain recording integrity during server outages.</li>
                    <li><strong>Disaster Recovery:</strong> Configure asynchronous cross-site replication with RPO &lt;15 minutes and automated runbooks for failover activation. For mission-critical deployments, maintain hot standby systems with dedicated cross-connections and automatic takeover capability.</li>
                `;
            }
    
            document.getElementById('redundancyRecommendations').innerHTML = redundancyRecs;
    
            // Scaling Recommendations
            let scalingRecs = '';
            const expansionCapacity = Math.floor((results.raidConfig.usableCapacity - results.storageWithOverheadTB) /
                (results.storageWithOverheadTB / this.inputs.cameraCount));
            if (expansionCapacity > 0) {
                scalingRecs += `
                    <li><strong>Current Capacity:</strong> Your storage configuration supports approximately <strong>${expansionCapacity} additional cameras</strong> 
                    (${Math.round(expansionCapacity/this.inputs.cameraCount*100)}% growth) at current retention settings before requiring expansion. Plan upgrades when reaching 80% capacity to maintain optimal performance.</li>
                `;
            }
            scalingRecs += `
                <li><strong>Resource Planning:</strong> Reserve a minimum of <strong>${Math.ceil(results.cpuCoresPerVM * 0.3)}</strong> additional CPU cores
                and <strong>${Math.ceil(results.ramPerVM * 0.3)} GB</strong> RAM per host to accommodate future analytics, higher resolutions, or increased frame rates. Consider pre-allocating PCIe slots for additional GPU acceleration cards.</li>
                <li><strong>Infrastructure Scaling:</strong> Implement modular storage architecture using enterprise hyperconverged solutions (Dell VxRail, Nutanix NX, HPE SimpliVity) or scale-out NAS platforms (NetApp ONTAP, Dell PowerScale) with non-disruptive expansion capabilities and automated data tiering.</li>
                <li><strong>Bandwidth Growth:</strong> Deploy network infrastructure with upgrade paths to 25/100GbE (leaf-spine architecture recommended for large-scale deployments). Reserve rack space and power capacity for additional network switches to support camera expansion zones.</li>
            `;
            document.getElementById('scalingRecommendations').innerHTML = scalingRecs;
            
            // Show the results section
            document.getElementById('results').style.display = 'block';
        } catch (error) {
            console.error("Error displaying results:", error);
            this.handleCalculationError(error);
        }
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
    saveConfigurationPreset: async function () {
        try {
            // Gather all current inputs
            this.gatherInputs();

            // Retrieve the site name directly from the input field
            let name = document.getElementById('siteNameInput').value;

            // Validate site name
            if (!name || name.trim() === '') {
                alert("Configuration name cannot be empty.");
                return false;
            }

            // Trim any extra spaces from the name
            name = name.trim();

            // Add name to inputs (used as siteName on server)
            this.inputs.siteName = name;

            // Call the server save function
            const success = await saveConfigurationToServer(this.inputs);

            if (success) {
                console.log(`✅ Configuration "${name}" has been saved to the server.`);
                return true;
            } else {
                console.log("❌ Failed to save configuration to server.");
                return false;
            }
        } catch (error) {
            console.error("Error saving configuration:", error);
            alert("An error occurred while saving.");
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
            
            console.log(`✅ Configuration "${presetName}" has been loaded successfully.`);
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
});

// Save Configuration to Server
async function saveConfigurationToServer(config) {
    try {
        const response = await fetch('/save-configuration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const result = await response.json();

        if (result.success) {
            console.log("✅ Configuration saved to server!");
            loadSavedConfigurations(); // Refresh sidebar
            return true;
        } else {
            alert("Failed to save configuration.");
            console.error(result);
            return false;
        }
    } catch (err) {
        console.error("Network/server error:", err);
        alert("Error saving to server.");
        return false;
    }
}

// Load Configuration from Server
async function loadConfigurationById(configId) {
    try {
        console.log("Trying to load config ID:", configId);

        const response = await fetch(`/load-configuration?id=${configId}`);
        const data = await response.json();

        console.log("Response from /load-configuration:", data);

        if (!data.success || !data.configuration) {
            alert("Configuration not found.");
            return;
        }

        loadConfiguration(data.configuration); // <- assuming this sets the form fields
    } catch (err) {
        console.error("Error loading configuration:", err);
        alert("Error loading configuration.");
    }
}
/* Added to index.html
// Delete Configuration from Server
async function deleteConfiguration(configId) {
    if (!confirm("Are you sure you want to delete this configuration?")) return;
  
    try {
      const res = await fetch(`/delete-configuration?id=${configId}`, { method: 'DELETE' });
      const result = await res.json();
  
      if (result.success) {
        console.log("Configuration deleted.");
        loadSavedConfigurations(); // Reload the list
      } else {
        alert("Failed to delete configuration.");
      }
    } catch (err) {
      console.error("Error deleting configuration:", err);
      alert("Error deleting configuration.");
    }
  }
*/
