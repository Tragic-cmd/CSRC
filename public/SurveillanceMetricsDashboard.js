// SurveillanceMetricsDashboard.js
const { useState, useEffect } = React;

// Wait for the Recharts library to be available
function ensureRecharts() {
  if (window.Recharts) {
    return Promise.resolve(window.Recharts);
  }
  
  return new Promise((resolve) => {
    // Check every 100ms if Recharts is loaded
    const checkInterval = setInterval(() => {
      if (window.Recharts) {
        clearInterval(checkInterval);
        resolve(window.Recharts);
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error("Failed to load Recharts library");
      resolve({});
    }, 5000);
  });
}

// Define and export the component
async function initializeDashboard() {
  try {
    // Ensure Recharts is loaded
    const Recharts = await ensureRecharts();
    
    // Destructure components from Recharts
    const { 
      BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
      XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
      RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
    } = Recharts;
    
    // Define the component
    function SurveillanceMetricsDashboard(props) {
      const [data, setData] = useState(props.data || {
        cameraCount: 0,
        retentionDays: 0,
        storageMetrics: {
          bitrateMbps: 0,
          dailyStoragePerCamera: 0,
          totalRawStorageTB: 0,
          storageWithBufferTB: 0,
          storageWithOverheadTB: 0
        },
        raidConfig: {
          raidLevel: "",
          totalDrives: 0,
          hdSizeTB: 0,
          totalRawCapacity: 0,
          usableCapacity: 0,
          storageEfficiency: "",
          arrayCount: 1,
          drivesPerArray: [0],
          capacityPerArray: [0]
        },
        vmRequirements: {
          vmsNeeded: 0,
          camerasPerVM: 0,
          cpuCoresPerVM: 0,
          ramPerVM: 0,
          networkBandwidthMbps: 0
        },
        physicalInfra: {
          physicalHostsNeeded: 0,
          hypervisor: "",
          storageApproach: ""
        }
      });
    
      // Update data when props change
      useEffect(() => {
        if (props.data) {
          setData(props.data);
        }
      }, [props.data]);
    
      // Storage breakdown data for pie chart
      const storageBreakdownData = [
        { name: 'Raw Storage', value: data.storageMetrics.totalRawStorageTB },
        { name: 'Buffer', value: data.storageMetrics.storageWithBufferTB - data.storageMetrics.totalRawStorageTB },
        { name: 'System Overhead', value: data.storageMetrics.storageWithOverheadTB - data.storageMetrics.storageWithBufferTB }
      ];
    
      // Storage growth projection data
      const storageGrowthData = [];
      for (let i = 0; i <= data.retentionDays; i++) {
        storageGrowthData.push({
          day: i,
          storageGB: i * data.storageMetrics.dailyStoragePerCamera * data.cameraCount / 1000
        });
      }
    
      // VM resource allocation data
      const vmResourceData = [];
      for (let i = 0; i < data.vmRequirements.vmsNeeded; i++) {
        vmResourceData.push({
          name: `VM${i+1}`,
          cameras: data.vmRequirements.camerasPerVM,
          cpu: data.vmRequirements.cpuCoresPerVM,
          ram: data.vmRequirements.ramPerVM,
          network: data.vmRequirements.networkBandwidthMbps
        });
      }
    
      // Colors for charts
      const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    
      // Check if Recharts components are available
      if (!ResponsiveContainer) {
        return React.createElement('div', { className: 'dashboard-error' },
          "Error: Recharts components are not available. Please check your dependencies."
        );
      }
    
      return React.createElement('div', { className: 'dashboard-container' },
        // Header
        React.createElement('h2', { className: 'dashboard-title' }, 'Surveillance Camera System Dashboard'),
        
        // Key Metrics Summary
        React.createElement('div', { className: 'metrics-summary' },
          // Storage Summary
          React.createElement('div', { className: 'metric-card' },
            React.createElement('h3', null, 'Storage Summary'),
            React.createElement('div', { className: 'metric-data' },
              React.createElement('div', { className: 'metric-row' },
                React.createElement('span', null, 'Total Storage:'),
                React.createElement('span', { className: 'metric-value' }, 
                  `${data.storageMetrics.storageWithOverheadTB.toFixed(2)} TB`)
              ),
              React.createElement('div', { className: 'metric-row' },
                React.createElement('span', null, 'Per Camera:'),
                React.createElement('span', { className: 'metric-value' }, 
                  `${data.storageMetrics.dailyStoragePerCamera.toFixed(2)} GB/day`)
              ),
              React.createElement('div', { className: 'metric-row' },
                React.createElement('span', null, 'Retention:'),
                React.createElement('span', { className: 'metric-value' }, 
                  `${data.retentionDays} days`)
              )
            )
          ),
          
          // VM Requirements
          React.createElement('div', { className: 'metric-card' },
            React.createElement('h3', null, 'VM Requirements'),
            React.createElement('div', { className: 'metric-data' },
              React.createElement('div', { className: 'metric-row' },
                React.createElement('span', null, 'VMs Needed:'),
                React.createElement('span', { className: 'metric-value' }, 
                  data.vmRequirements.vmsNeeded)
              ),
              React.createElement('div', { className: 'metric-row' },
                React.createElement('span', null, 'Cameras per VM:'),
                React.createElement('span', { className: 'metric-value' }, 
                  data.vmRequirements.camerasPerVM)
              ),
              React.createElement('div', { className: 'metric-row' },
                React.createElement('span', null, 'Network:'),
                React.createElement('span', { className: 'metric-value' }, 
                  `${Math.ceil(data.vmRequirements.networkBandwidthMbps)} Mbps`)
              )
            )
          ),
          
          // RAID Configuration
          React.createElement('div', { className: 'metric-card' },
            React.createElement('h3', null, 'RAID Configuration'),
            React.createElement('div', { className: 'metric-data' },
              React.createElement('div', { className: 'metric-row' },
                React.createElement('span', null, 'RAID Level:'),
                React.createElement('span', { className: 'metric-value' }, 
                  data.raidConfig.raidLevel)
              ),
              React.createElement('div', { className: 'metric-row' },
                React.createElement('span', null, 'Drives:'),
                React.createElement('span', { className: 'metric-value' }, 
                  `${data.raidConfig.totalDrives} × ${data.raidConfig.hdSizeTB} TB`)
              ),
              React.createElement('div', { className: 'metric-row' },
                React.createElement('span', null, 'Efficiency:'),
                React.createElement('span', { className: 'metric-value' }, 
                  data.raidConfig.storageEfficiency)
              )
            )
          )
        ),
        
        // Storage Charts Row
        React.createElement('div', { className: 'charts-row' },
          // Storage Composition
          React.createElement('div', { className: 'chart-card' },
            React.createElement('h3', null, 'Storage Composition'),
            React.createElement('div', { className: 'chart-container' },
              React.createElement(ResponsiveContainer, { width: '100%', height: 300 },
                React.createElement(PieChart, null,
                  React.createElement(Pie, {
                    data: storageBreakdownData,
                    cx: '50%',
                    cy: '50%',
                    labelLine: false,
                    outerRadius: 80,
                    fill: '#8884d8',
                    dataKey: 'value',
                    label: ({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`
                  }, 
                    storageBreakdownData.map((entry, index) => 
                      React.createElement(Cell, { 
                        key: `cell-${index}`,
                        fill: COLORS[index % COLORS.length] 
                      })
                    )
                  ),
                  React.createElement(Tooltip, {
                    formatter: (value) => [`${value.toFixed(2)} TB`, 'Storage']
                  }),
                  React.createElement(Legend)
                )
              )
            )
          ),
          
          // Storage Growth
          React.createElement('div', { className: 'chart-card' },
            React.createElement('h3', null, 'Storage Growth Over Retention Period'),
            React.createElement('div', { className: 'chart-container' },
              React.createElement(ResponsiveContainer, { width: '100%', height: 300 },
                React.createElement(LineChart, {
                  data: storageGrowthData,
                  margin: { top: 5, right: 30, left: 20, bottom: 5 }
                },
                  React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
                  React.createElement(XAxis, { 
                    dataKey: 'day',
                    label: { value: 'Days', position: 'insideBottomRight', offset: -10 }
                  }),
                  React.createElement(YAxis, {
                    label: { value: 'Storage (TB)', angle: -90, position: 'insideLeft' }
                  }),
                  React.createElement(Tooltip, {
                    formatter: (value) => [`${(value).toFixed(2)} TB`, 'Storage']
                  }),
                  React.createElement(Line, {
                    type: 'monotone',
                    dataKey: 'storageGB',
                    name: 'Storage (TB)',
                    stroke: '#8884d8',
                    activeDot: { r: 8 }
                  })
                )
              )
            )
          )
        ),
        
        // VM and Performance Charts Row
        React.createElement('div', { className: 'charts-row' },
          // VM Resource Allocation
          React.createElement('div', { className: 'chart-card' },
            React.createElement('h3', null, 'VM Resource Allocation'),
            React.createElement('div', { className: 'chart-container' },
              React.createElement(ResponsiveContainer, { width: '100%', height: 300 },
                React.createElement(BarChart, {
                  data: vmResourceData,
                  margin: { top: 20, right: 30, left: 20, bottom: 5 }
                },
                  React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
                  React.createElement(XAxis, { dataKey: 'name' }),
                  React.createElement(YAxis),
                  React.createElement(Tooltip),
                  React.createElement(Legend),
                  React.createElement(Bar, { 
                    dataKey: 'cameras',
                    name: 'Cameras',
                    fill: '#8884d8'
                  }),
                  React.createElement(Bar, { 
                    dataKey: 'cpu',
                    name: 'CPU Cores',
                    fill: '#82ca9d'
                  }),
                  React.createElement(Bar, { 
                    dataKey: 'ram',
                    name: 'RAM (GB)',
                    fill: '#ffc658'
                  })
                )
              )
            )
          ),
          
          // Network Bandwidth Requirements
          React.createElement('div', { className: 'chart-card' },
            React.createElement('h3', null, 'Network Bandwidth Requirements'),
            React.createElement('div', { className: 'chart-container' },
              React.createElement(ResponsiveContainer, { width: '100%', height: 300 },
                React.createElement(BarChart, {
                  data: [
                    { name: 'Per Camera', bandwidth: data.storageMetrics.bitrateMbps },
                    { name: 'Per VM', bandwidth: data.vmRequirements.networkBandwidthMbps },
                    { name: 'Total System', bandwidth: data.vmRequirements.networkBandwidthMbps * data.vmRequirements.vmsNeeded }
                  ],
                  margin: { top: 20, right: 30, left: 20, bottom: 5 }
                },
                  React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
                  React.createElement(XAxis, { dataKey: 'name' }),
                  React.createElement(YAxis, {
                    label: { value: 'Bandwidth (Mbps)', angle: -90, position: 'insideLeft' }
                  }),
                  React.createElement(Tooltip, {
                    formatter: (value) => [`${value.toFixed(2)} Mbps`, 'Bandwidth']
                  }),
                  React.createElement(Legend),
                  React.createElement(Bar, { 
                    dataKey: 'bandwidth',
                    name: 'Bandwidth (Mbps)',
                    fill: '#00C49F'
                  })
                )
              )
            )
          )
        ),
        
        // RAID Array Visualization
        React.createElement('div', { className: 'chart-card raid-visualization' },
          React.createElement('h3', null, 'RAID Array Configuration'),
          React.createElement('div', { className: 'raid-arrays' },
            Array.from({ length: data.raidConfig.arrayCount || 1 }).map((_, arrayIndex) =>
              React.createElement('div', { 
                key: `array-${arrayIndex}`,
                className: 'raid-array'
              },
                React.createElement('h4', null, `Array ${arrayIndex + 1}`),
                React.createElement('div', { className: 'drives-container' },
                  Array.from({ 
                    length: data.raidConfig.drivesPerArray ? 
                      data.raidConfig.drivesPerArray[arrayIndex] : 
                      data.raidConfig.totalDrives / (data.raidConfig.arrayCount || 1) 
                  }).map((_, driveIndex) =>
                    React.createElement('div', { 
                      key: `drive-${arrayIndex}-${driveIndex}`,
                      className: 'drive'
                    }, 'HD')
                  )
                ),
                React.createElement('div', { className: 'array-capacity' },
                  `Usable: ${
                    data.raidConfig.capacityPerArray ? 
                      data.raidConfig.capacityPerArray[arrayIndex].toFixed(1) : 
                      (data.raidConfig.usableCapacity / (data.raidConfig.arrayCount || 1)).toFixed(1)
                  } TB`
                )
              )
            )
          ),
          React.createElement('div', { className: 'raid-summary' },
            React.createElement('div', { className: 'total-capacity' },
              'Total Usable Capacity: ',
              React.createElement('span', { className: 'capacity-value' }, 
                `${data.raidConfig.usableCapacity.toFixed(2)} TB`)
            ),
            React.createElement('div', { className: 'raid-efficiency' },
              `RAID ${data.raidConfig.raidLevel} - ${data.raidConfig.storageEfficiency} Efficiency`
            )
          )
        )
      );
    }
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .dashboard-container {
        font-family: Arial, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      .dashboard-title {
        text-align: center;
        margin-bottom: 20px;
        font-size: 24px;
        font-weight: bold;
      }
      .dashboard-error {
        color: red;
        text-align: center;
        padding: 20px;
        border: 1px solid red;
        margin: 20px;
        font-weight: bold;
      }
      .metrics-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .metric-card {
        background-color: #f9f9f9;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .metric-card h3 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 18px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 8px;
      }
      .metric-data {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .metric-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #eee;
      }
      .metric-row:last-child {
        border-bottom: none;
      }
      .metric-value {
        font-weight: bold;
      }
      .charts-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
        gap: 24px;
        margin-bottom: 24px;
      }
      .chart-card {
        background-color: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .chart-card h3 {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 18px;
      }
      .chart-container {
        height: 300px;
      }
      .raid-visualization {
        grid-column: 1 / -1;
      }
      .raid-arrays {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 16px;
        margin: 20px 0;
      }
      .raid-array {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 12px;
        background-color: #f5f5f5;
        min-width: 120px;
      }
      .raid-array h4 {
        text-align: center;
        margin-top: 0;
        margin-bottom: 12px;
        font-weight: bold;
      }
      .drives-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
      .drive {
        height: 64px;
        width: 32px;
        background-color: #4a90e2;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
      }
      .array-capacity {
        text-align: center;
        margin-top: 8px;
        font-size: 14px;
      }
      .raid-summary {
        text-align: center;
        margin-top: 16px;
      }
      .total-capacity {
        font-size: 18px;
        margin-bottom: 8px;
      }
      .capacity-value {
        font-weight: bold;
      }
      .raid-efficiency {
        font-size: 14px;
        color: #666;
      }
    `;
    document.head.appendChild(style);
    
    // Export the component
    window.SurveillanceMetricsDashboard = SurveillanceMetricsDashboard;
    
    console.log("SurveillanceMetricsDashboard component initialized successfully");
    return SurveillanceMetricsDashboard;
  } catch (error) {
    console.error("Error initializing SurveillanceMetricsDashboard:", error);
    // Return a simple error component
    return function ErrorComponent() {
      return React.createElement('div', { style: { color: 'red', padding: '20px' } },
        "Error loading dashboard components. Please check the console for details."
      );
    };
  }
}

// Initialize the component
initializeDashboard().catch(error => {
  console.error("Failed to initialize dashboard:", error);
});