import { CheckCircle2, CircleAlert } from 'lucide-react';

export function SaveFeedback({
  type,
  message
}: {
  type: 'success' | 'error';
  message: string;
}) {
  return (
    <div
      aria-live="polite"
      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
        type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
      role="status"
    >
      {type === 'success' ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
      {message}
    </div>
  );
}
