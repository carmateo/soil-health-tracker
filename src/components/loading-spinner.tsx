import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex justify-center items-center">
      <Loader2 className={`h-${size/4} w-${size/4} animate-spin text-primary`} />
    </div>
  );
}
