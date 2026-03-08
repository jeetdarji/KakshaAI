import { useTheme } from '../../contexts/ThemeContext';

/**
 * SkeletonLoader - Loading placeholder with shimmer effect
 * Supports different types: card, chart, text
 */
export default function SkeletonLoader({ type = 'chart', count = 1 }) {
  const { isDark } = useTheme();
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const cardBg = isDark ? 'bg-[#1a1a1a] border-gray-800/50' : 'bg-white border-gray-200';
  const shimmer = isDark ? 'bg-gray-700/50' : 'bg-gray-200';
  const chartBg = isDark ? 'bg-gray-700/30' : 'bg-gray-100';

  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`${cardBg} rounded-xl p-6 border`}>
            <div className="animate-pulse">
              <div className={`h-4 ${shimmer} rounded w-1/3 mb-4`}></div>
              <div className={`h-8 ${shimmer} rounded w-1/2 mb-2`}></div>
              <div className={`h-3 ${shimmer} rounded w-1/4`}></div>
            </div>
          </div>
        );

      case 'chart':
        return (
          <div className="animate-pulse">
            <div className={`h-64 ${chartBg} rounded-lg flex items-end justify-around p-4 space-x-2`}>
              <div className={`${shimmer} rounded w-full h-32`}></div>
              <div className={`${shimmer} rounded w-full h-48`}></div>
              <div className={`${shimmer} rounded w-full h-40`}></div>
              <div className={`${shimmer} rounded w-full h-56`}></div>
              <div className={`${shimmer} rounded w-full h-44`}></div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="animate-pulse space-y-2">
            <div className={`h-4 ${shimmer} rounded w-full`}></div>
            <div className={`h-4 ${shimmer} rounded w-5/6`}></div>
            <div className={`h-4 ${shimmer} rounded w-4/6`}></div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {skeletons.map((i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
}
