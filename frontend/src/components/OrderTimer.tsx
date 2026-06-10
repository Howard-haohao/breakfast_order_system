import { useEffect, useState } from 'react';

type Props = {
  submittedAt: string | null;
};

export default function OrderTimer({ submittedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!submittedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [submittedAt]);

  if (!submittedAt) return <span>未記錄</span>;

  const started = Date.parse(submittedAt);
  if (Number.isNaN(started)) return <span>未記錄</span>;

  const elapsedMs = Math.max(0, now - started);
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const text = `${minutes}:${pad(seconds)}`;

  const warnMs = 5 * 60 * 1000;
  const isOver = elapsedMs > warnMs;
  const className = isOver ? 'text-red-600 font-bold animate-pulse' : 'text-blue-600 font-semibold';

  return <span className={className}>{text}</span>;
}
