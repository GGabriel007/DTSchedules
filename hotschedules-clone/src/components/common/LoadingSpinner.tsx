export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded h-10 w-10 border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
