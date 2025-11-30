import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Server,
  Activity,
  TrendingDown,
  Upload,
  Download,
  BarChart3,
} from 'lucide-react';

const GreenCloudDemo = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [timeStep, setTimeStep] = useState(0);
  const [metrics, setMetrics] = useState({
    energy: 0,
    slaViolations: 0,
    migrations: 0,
    activeServers: 8,
  });
  const [servers, setServers] = useState([]);
  const [algorithm, setAlgorithm] = useState('hybrid');
  const [workloadHistory, setWorkloadHistory] = useState([]);
  const [cloudSimData, setCloudSimData] = useState(null);
  const [simulationResults, setSimulationResults] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // Sample CloudSim data structure
  const sampleCloudSimData = {
    experimentName: 'PlanetLab Workload Test',
    timestamp: new Date().toISOString(),
    configuration: {
      hosts: 8,
      vmsPerHost: 10,
      workloadTrace: 'PlanetLab-20250115',
      duration: 24,
    },
    results: {
      static: {
        totalEnergy: 2450.5,
        slaViolations: 85,
        migrations: 120,
        avgPUE: 1.56,
      },
      reactive: {
        totalEnergy: 2180.3,
        slaViolations: 62,
        migrations: 245,
        avgPUE: 1.45,
      },
      proactive: {
        totalEnergy: 1850.7,
        slaViolations: 38,
        migrations: 180,
        avgPUE: 1.32,
      },
      hybrid: {
        totalEnergy: 1620.4,
        slaViolations: 22,
        migrations: 145,
        avgPUE: 1.24,
      },
    },
    workloadData: [
      { time: 0, avgCPU: 35.2, avgRAM: 45.3, activePMs: 8 },
      { time: 1, avgCPU: 42.8, avgRAM: 52.1, activePMs: 8 },
      { time: 2, avgCPU: 58.3, avgRAM: 61.4, activePMs: 7 },
      { time: 3, avgCPU: 72.5, avgRAM: 68.9, activePMs: 6 },
      { time: 4, avgCPU: 65.1, avgRAM: 58.2, activePMs: 6 },
      { time: 5, avgCPU: 48.7, avgRAM: 49.5, activePMs: 7 },
      { time: 6, avgCPU: 38.9, avgRAM: 42.8, activePMs: 7 },
      { time: 7, avgCPU: 31.2, avgRAM: 38.6, activePMs: 8 },
    ],
  };

  useEffect(() => {
    resetSimulation();
  }, []);

  const resetSimulation = () => {
    const initialServers = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      utilization: Math.random() * 40 + 20,
      vms: Math.floor(Math.random() * 3) + 1,
      status: 'active',
      predicted: null,
    }));
    setServers(initialServers);
    setTimeStep(0);
    setMetrics({
      energy: 0,
      slaViolations: 0,
      migrations: 0,
      activeServers: 8,
    });
    setWorkloadHistory([]);
    setIsRunning(false);
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeStep((t) => t + 1);

      setServers((prevServers) => {
        const newServers = prevServers.map((server) => {
          if (server.status === 'sleep') return server;

          const change = (Math.random() - 0.5) * 15;
          let newUtil = Math.max(0, Math.min(100, server.utilization + change));

          const predicted =
            algorithm === 'hybrid' || algorithm === 'proactive'
              ? newUtil + (Math.random() - 0.5) * 10 + 5
              : null;

          return {
            ...server,
            utilization: newUtil,
            predicted: predicted,
          };
        });

        let consolidated = [...newServers];
        let newMigrations = 0;
        let newSlaViolations = 0;

        if (algorithm === 'hybrid' || algorithm === 'proactive') {
          consolidated = consolidated.map((server) => {
            const threshold = algorithm === 'hybrid' ? 70 : 75;
            if (server.utilization < 20 && server.status === 'active') {
              return { ...server, status: 'sleep', utilization: 0 };
            }
            if (
              (server.predicted || server.utilization) > threshold &&
              server.vms > 1
            ) {
              newMigrations += 1;
              return {
                ...server,
                vms: server.vms - 1,
                utilization: server.utilization * 0.8,
              };
            }
            return server;
          });
        } else if (algorithm === 'reactive') {
          consolidated = consolidated.map((server) => {
            if (server.utilization > 85) {
              newMigrations += 1;
              newSlaViolations += 1;
              return {
                ...server,
                vms: Math.max(1, server.vms - 1),
                utilization: server.utilization * 0.85,
              };
            }
            if (server.utilization < 15 && server.status === 'active') {
              return { ...server, status: 'sleep', utilization: 0 };
            }
            return server;
          });
        }

        const activeCount = consolidated.filter(
          (s) => s.status === 'active'
        ).length;
        const energyIncrease =
          activeCount * 2 +
          consolidated.reduce((sum, s) => sum + s.utilization * 0.5, 0);

        setMetrics((prev) => ({
          energy: prev.energy + energyIncrease,
          slaViolations: prev.slaViolations + newSlaViolations,
          migrations: prev.migrations + newMigrations,
          activeServers: activeCount,
        }));

        return consolidated;
      });

      setWorkloadHistory((prev) => {
        const avgUtil =
          servers.reduce((sum, s) => sum + s.utilization, 0) / servers.length;
        return [...prev.slice(-20), avgUtil].slice(-20);
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isRunning, algorithm, servers]);

  const loadSampleCloudSimData = () => {
    setCloudSimData(sampleCloudSimData);
    alert(
      'Sample CloudSim data loaded! Check the "CloudSim Results" section below.'
    );
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          setCloudSimData(data);
          alert(
            `CloudSim data loaded: ${
              data.experimentName || 'Unnamed Experiment'
            }`
          );
        } catch (error) {
          alert(
            'Error parsing JSON file. Please ensure it matches the CloudSim output format.'
          );
        }
      };
      reader.readAsText(file);
    }
  };

  const exportResults = () => {
    const exportData = {
      liveSimulation: {
        algorithm,
        timeStep,
        metrics,
        servers,
      },
      cloudSimData,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `green-cloud-results-${Date.now()}.json`;
    a.click();
  };

  const getServerColor = (server) => {
    if (server.status === 'sleep') return 'bg-gray-300';
    if (server.utilization > 80) return 'bg-red-500';
    if (server.utilization > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const algorithmNames = {
    static: 'Static Threshold',
    reactive: 'Reactive',
    proactive: 'Proactive (LSTM)',
    hybrid: 'Hybrid (LSTM-DQN)',
  };

  const calculateImprovement = (baseline, value) => {
    const improvement = (((baseline - value) / baseline) * 100).toFixed(1);
    return improvement > 0 ? `↓${improvement}%` : `↑${Math.abs(improvement)}%`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Zap className="text-green-600" />
          Green Cloud Computing Demo
        </h1>
        <p className="text-gray-600">
          LSTM-DQN Hybrid Approach with CloudSim Integration
        </p>
      </div>

      {/* CloudSim Data Integration Panel */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow border-2 border-blue-200">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800">
          <BarChart3 size={24} />
          CloudSim Data Integration
        </h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={loadSampleCloudSimData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            <Download size={18} />
            Load Sample Data
          </button>

          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition cursor-pointer">
            <Upload size={18} />
            Upload CloudSim JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={exportResults}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            <Download size={18} />
            Export Results
          </button>

          {cloudSimData && (
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
            >
              <BarChart3 size={18} />
              {showComparison ? 'Hide' : 'Show'} Comparison
            </button>
          )}
        </div>

        {cloudSimData && (
          <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
            <p>
              <strong>Loaded:</strong> {cloudSimData.experimentName}
            </p>
            <p>
              <strong>Workload:</strong>{' '}
              {cloudSimData.configuration?.workloadTrace || 'Custom'}
            </p>
            <p>
              <strong>Duration:</strong>{' '}
              {cloudSimData.configuration?.duration || 'N/A'} hours
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} />}
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={resetSimulation}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              <RotateCcw size={20} />
              Reset
            </button>
          </div>

          <div className="text-lg font-semibold text-gray-700">
            Time Step: {timeStep}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {Object.entries(algorithmNames).map(([key, name]) => (
            <button
              key={key}
              onClick={() => {
                setAlgorithm(key);
                resetSimulation();
              }}
              className={`px-4 py-2 rounded transition ${
                algorithm === key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* CloudSim Comparison Panel */}
      {cloudSimData && showComparison && (
        <div className="bg-white rounded-lg p-6 mb-6 shadow border-2 border-orange-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            CloudSim Benchmark Results
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Algorithm</th>
                  <th className="p-3 text-right">Energy (kWh)</th>
                  <th className="p-3 text-right">SLA Violations</th>
                  <th className="p-3 text-right">Migrations</th>
                  <th className="p-3 text-right">Avg PUE</th>
                </tr>
              </thead>
              <tbody>
                {cloudSimData.results &&
                  Object.entries(cloudSimData.results).map(([alg, data]) => (
                    <tr
                      key={alg}
                      className={`border-t ${
                        alg === 'hybrid' ? 'bg-green-50 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3">{algorithmNames[alg] || alg}</td>
                      <td className="p-3 text-right">
                        {data.totalEnergy.toFixed(1)}
                        {alg !== 'static' && (
                          <span className="ml-2 text-xs text-green-600">
                            {calculateImprovement(
                              cloudSimData.results.static.totalEnergy,
                              data.totalEnergy
                            )}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {data.slaViolations}
                        {alg !== 'static' && (
                          <span className="ml-2 text-xs text-green-600">
                            {calculateImprovement(
                              cloudSimData.results.static.slaViolations,
                              data.slaViolations
                            )}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">{data.migrations}</td>
                      <td className="p-3 text-right">
                        {data.avgPUE.toFixed(2)}
                        {alg !== 'static' && (
                          <span className="ml-2 text-xs text-green-600">
                            {calculateImprovement(
                              cloudSimData.results.static.avgPUE,
                              data.avgPUE
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* CloudSim Workload Visualization */}
          {cloudSimData.workloadData && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-gray-700">
                CloudSim Workload Trace
              </h4>
              <div className="h-40 flex items-end gap-2">
                {cloudSimData.workloadData.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${point.avgCPU}%` }}
                    />
                    <span className="text-xs text-gray-600">
                      {point.activePMs}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Hour 0</span>
                <span>Hour {cloudSimData.workloadData.length - 1}</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Blue bars: CPU utilization | Numbers: Active PMs
              </p>
            </div>
          )}
        </div>
      )}

      {/* Live Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="text-yellow-500" size={24} />
            <h3 className="font-semibold text-gray-700">Energy</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {metrics.energy.toFixed(0)} kWh
          </p>
          {cloudSimData && cloudSimData.results && (
            <p className="text-xs text-gray-500 mt-1">
              CloudSim {algorithm}:{' '}
              {cloudSimData.results[algorithm]?.totalEnergy.toFixed(0) || 'N/A'}{' '}
              kWh
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="text-red-500" size={24} />
            <h3 className="font-semibold text-gray-700">SLA Violations</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {metrics.slaViolations}
          </p>
          {cloudSimData && cloudSimData.results && (
            <p className="text-xs text-gray-500 mt-1">
              CloudSim {algorithm}:{' '}
              {cloudSimData.results[algorithm]?.slaViolations || 'N/A'}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="text-blue-500" size={24} />
            <h3 className="font-semibold text-gray-700">Migrations</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {metrics.migrations}
          </p>
          {cloudSimData && cloudSimData.results && (
            <p className="text-xs text-gray-500 mt-1">
              CloudSim {algorithm}:{' '}
              {cloudSimData.results[algorithm]?.migrations || 'N/A'}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <Server className="text-green-500" size={24} />
            <h3 className="font-semibold text-gray-700">Active Servers</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {metrics.activeServers}/8
          </p>
        </div>
      </div>

      {/* Server Visualization */}
      <div className="bg-white rounded-lg p-6 shadow mb-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Physical Servers (Live Simulation)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {servers.map((server) => (
            <div key={server.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">
                  Server {server.id + 1}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    server.status === 'sleep' ? 'bg-gray-200' : 'bg-green-200'
                  }`}
                >
                  {server.status}
                </span>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Utilization</span>
                  <span>{server.utilization.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${getServerColor(
                      server
                    )}`}
                    style={{ width: `${server.utilization}%` }}
                  />
                </div>
              </div>

              {server.predicted !== null && (
                <div className="text-xs text-blue-600 mb-1">
                  Predicted: {server.predicted.toFixed(0)}%
                </div>
              )}

              <div className="text-xs text-gray-600">VMs: {server.vms}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Workload Trend */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Average Workload Trend (Live)
        </h3>
        <div className="h-32 flex items-end gap-1">
          {workloadHistory.map((val, idx) => (
            <div
              key={idx}
              className="flex-1 bg-blue-500 rounded-t transition-all"
              style={{ height: `${val}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Past</span>
          <span>Present</span>
        </div>
      </div>

      {/* JSON Format Guide */}
      <div className="mt-6 bg-gray-50 border border-gray-300 p-4 rounded">
        <h4 className="font-semibold text-gray-900 mb-2">
          CloudSim JSON Format
        </h4>
        <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
          {`{
  "experimentName": "Your Experiment Name",
  "configuration": {
    "hosts": 8,
    "workloadTrace": "PlanetLab-20250115"
  },
  "results": {
    "static": { "totalEnergy": 2450.5, "slaViolations": 85, "migrations": 120, "avgPUE": 1.56 },
    "reactive": { "totalEnergy": 2180.3, "slaViolations": 62, "migrations": 245, "avgPUE": 1.45 },
    "proactive": { "totalEnergy": 1850.7, "slaViolations": 38, "migrations": 180, "avgPUE": 1.32 },
    "hybrid": { "totalEnergy": 1620.4, "slaViolations": 22, "migrations": 145, "avgPUE": 1.24 }
  },
  "workloadData": [
    { "time": 0, "avgCPU": 35.2, "avgRAM": 45.3, "activePMs": 8 }
  ]
}`}
        </pre>
      </div>
    </div>
  );
};

export default GreenCloudDemo;
