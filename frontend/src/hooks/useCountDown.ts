import { useState, useEffect, useCallback } from "react";

export function useCountdown(initialSeconds: number) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const [isActive, setIsActive] = useState(false);

    const start = useCallback(() => setIsActive(true), []);
    const pause = useCallback(() => setIsActive(false), []);
    const reset = useCallback(() => {
        setIsActive(false);
        setSeconds(initialSeconds);
    }, [initialSeconds]);

    useEffect(() => {
        if (!isActive || seconds <= 0) return;

        const interval = setInterval(() => {
            setSeconds((s) => s - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, seconds]);

    return { seconds, isActive, start, pause, reset };
}
