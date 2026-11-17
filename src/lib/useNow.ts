// The current time, re-read every CLOCK_TICK_MS, so Home's greeting, date and quote stay
// current while it's open (context/details/1060, prototype `tick()`).
import { useEffect, useState } from 'react';

import { CLOCK_TICK_MS } from '@/constants/config';

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}
