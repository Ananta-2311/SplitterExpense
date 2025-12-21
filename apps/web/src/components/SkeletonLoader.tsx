interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
}

export function Skeleton({ className = '', height = 'h-4', width = 'w-full', rounded = true }: SkeletonProps) {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${height} ${width} ${rounded ? 'rounded' : ''} ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <Skeleton height="h-6" width="w-1/4" className="mb-4" />
      <Skeleton height="h-4" className="mb-2" />
      <Skeleton height="h-4" width="w-3/4" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <Skeleton height="h-6" width="w-1/3" className="mb-4" />
      <div className="h-[300px] flex items-center justify-center">
        <div className="w-full space-y-3">
          <Skeleton height="h-4" width="w-full" />
          <Skeleton height="h-4" width="w-5/6" />
          <Skeleton height="h-4" width="w-4/6" />
          <Skeleton height="h-4" width="w-3/6" />
        </div>
      </div>
    </div>
  );
}

export function SummaryCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <Skeleton height="h-4" width="w-1/2" className="mb-2" />
      <Skeleton height="h-8" width="w-2/3" />
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-2">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <Skeleton height="h-4" width="w-1/3" className="mb-2" />
          <Skeleton height="h-3" width="w-1/4" />
        </div>
        <Skeleton height="h-5" width="w-20" />
      </div>
    </div>
  );
}
