export default function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
      <div className="relative">
        {/* Outer circle */}
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-spin">
        </div>
        {/* Inner circle - blue spinning part */}
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full animate-spin-fast border-t-transparent">
        </div>
      </div>
    </div>
  );
}