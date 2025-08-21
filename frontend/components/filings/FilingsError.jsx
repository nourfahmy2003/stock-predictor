export default function FilingsError({ message }) {
  return (
    <div className="p-8 text-center text-red-500" role="alert">
      Failed to load filings{message ? `: ${message}` : ''}
    </div>
  );
}
