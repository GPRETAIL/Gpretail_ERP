/**
 * PageSkeleton — shimmer skeleton shown while a page is loading.
 *
 * Props:
 *   variant  {"form" | "table"}  — layout style (default "form")
 *   rows     {number}            — number of skeleton rows (default 8)
 */
const shimmer = "animate-pulse bg-gray-200 dark:bg-gray-700 rounded";

const HeaderSkeleton = () => (
  <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`${shimmer} w-5 h-5`} />
      <div className={`${shimmer} w-48 h-5`} />
    </div>
    <div className="flex items-center gap-2">
      <div className={`${shimmer} w-16 h-7 rounded-md`} />
      <div className={`${shimmer} w-16 h-7 rounded-md`} />
      <div className={`${shimmer} w-16 h-7 rounded-md`} />
    </div>
  </div>
);

const FormSkeleton = ({ rows = 8 }) => (
  <div className="flex-1 p-4 space-y-4">
    {/* Two column form layout */}
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`${shimmer} w-1/3 h-4`} />
            <div className={`${shimmer} flex-1 h-8 rounded-sm`} />
          </div>
        ))}
      </div>
    </div>
    {/* Bottom section placeholder */}
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className={`${shimmer} w-32 h-4 mb-3`} />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${shimmer} w-full h-8 rounded-sm`} />
        ))}
      </div>
    </div>
  </div>
);

const TableSkeleton = ({ rows = 6, cols = 8 }) => (
  <div className="flex-1 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header row */}
      <div className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-700">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`${shimmer} flex-1 h-4`} />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-2 p-3 border-b border-gray-100 dark:border-gray-700">
          {Array.from({ length: cols }).map((_, ci) => (
            <div
              key={ci}
              className={`${shimmer} flex-1 h-4`}
              style={{ width: `${45 + Math.random() * 40}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const PageSkeleton = ({ variant = "form", rows, cols }) => (
  <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
    <HeaderSkeleton />
    {variant === "table" ? (
      <TableSkeleton rows={rows} cols={cols} />
    ) : (
      <FormSkeleton rows={rows} />
    )}
  </div>
);

export default PageSkeleton;
