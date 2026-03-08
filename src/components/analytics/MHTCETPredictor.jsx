import ChartContainer from './ChartContainer';
import PredictionCard from './PredictionCard';
import SkeletonLoader from './SkeletonLoader';

/**
 * MHTCETPredictor - Main prediction component showing score predictions for all shift scenarios
 * Now accepts pre-computed predictions via performanceData prop from the service layer
 */
export default function MHTCETPredictor({ performanceData, loading = false }) {
  const predictions = performanceData;

  // Confidence level colors
  const confidenceColors = {
    High: 'text-green-400',
    Medium: 'text-yellow-400',
    Low: 'text-red-400'
  };

  // Confidence level descriptions
  const confidenceDescriptions = {
    High: 'Based on extensive data - highly reliable prediction',
    Medium: 'Based on moderate data - reasonably reliable prediction',
    Low: 'Limited data available - complete more tests for accurate predictions'
  };

  return (
    <ChartContainer
      title="MHT-CET Score Prediction"
      subtitle="Estimated exam scores based on your current performance"
      loading={loading}
    >
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonLoader type="card" count={3} />
        </div>
      ) : predictions ? (
        <div className="space-y-6">
          {/* Prediction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PredictionCard
              scenario="Easy"
              predictedScore={predictions.predictions.easy.score}
              percentile={predictions.predictions.easy.percentile}
              confidence={predictions.confidenceLevel}
            />
            <PredictionCard
              scenario="Moderate"
              predictedScore={predictions.predictions.moderate.score}
              percentile={predictions.predictions.moderate.percentile}
              confidence={predictions.confidenceLevel}
            />
            <PredictionCard
              scenario="Hard"
              predictedScore={predictions.predictions.hard.score}
              percentile={predictions.predictions.hard.percentile}
              confidence={predictions.confidenceLevel}
            />
          </div>

          {/* Confidence Indicator */}
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 text-sm font-medium">Prediction Confidence</span>
              <span className={`text-sm font-semibold ${confidenceColors[predictions.confidenceLevel]}`}>
                {predictions.confidenceLevel}
              </span>
            </div>

            {/* Confidence Meter */}
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-1000 ${predictions.confidenceLevel === 'High'
                    ? 'bg-green-500 w-full'
                    : predictions.confidenceLevel === 'Medium'
                      ? 'bg-yellow-500 w-2/3'
                      : 'bg-red-500 w-1/3'
                  }`}
              />
            </div>

            <p className="text-xs text-gray-400">
              {confidenceDescriptions[predictions.confidenceLevel]}
            </p>

            {/* Data Points */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-800">
              <div>
                <div className="text-lg font-semibold text-white">
                  {predictions.dataPoints.mockTestsCompleted}
                </div>
                <div className="text-xs text-gray-400">Mock Tests</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-white">
                  {Math.round(predictions.dataPoints.totalStudyHours)}h
                </div>
                <div className="text-xs text-gray-400">Study Time</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-white">
                  {predictions.dataPoints.questionsAttempted}
                </div>
                <div className="text-xs text-gray-400">Questions</div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3">
            <p className="text-xs text-teal-300">
              ℹ️ {predictions.disclaimer}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p>Complete more tests to see score predictions</p>
        </div>
      )}
    </ChartContainer>
  );
}
