export default function LoadingState({ message = 'Analyzing text and fetching citations...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}
