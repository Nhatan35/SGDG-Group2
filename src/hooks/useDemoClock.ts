import { useEffect, useState } from "react";

const demoStart = new Date("2026-07-18T10:00:00.000Z").getTime();

export function useDemoClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => demoStart);

  useEffect(() => {
    const mountedAt = Date.now();
    const tick = () => setNow(demoStart + Date.now() - mountedAt);
    tick();
    const timer = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export function useSystemClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export function formatDuration(target: string | number, now: number) {
  const targetMs = typeof target === "number" ? target : new Date(target).getTime();
  const totalSeconds = Math.max(0, Math.floor((targetMs - now) / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  return days > 0 ? `${days} ngày ${parts}` : parts;
}
