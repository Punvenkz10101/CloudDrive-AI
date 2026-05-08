import { useEffect, useRef } from 'react';

export default function BehaviorTracker() {
  const data = useRef({
    mouseMoves: 0,
    clicks: 0,
    scrolls: 0,
    startTime: Date.now(),
  });

  useEffect(() => {
    const handleMouseMove = () => data.current.mouseMoves++;
    const handleClick = () => data.current.clicks++;
    const handleScroll = () => data.current.scrolls++;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);

    // Send interval data to backend every 30 seconds
    const interval = setInterval(() => {
      const duration = (Date.now() - data.current.startTime) / 1000;
      const payload = {
        mouseSpeed: data.current.mouseMoves / duration,
        clickFrequency: data.current.clicks / duration,
        scrollFrequency: data.current.scrolls / duration,
        duration,
      };

      fetch('/api/bot_classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
      
      // Reset after sending to capture active window slices
      data.current = {
        mouseMoves: 0,
        clicks: 0,
        scrolls: 0,
        startTime: Date.now(),
      };
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  return null; // Invisible global tracker
}
