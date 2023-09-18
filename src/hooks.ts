import { SqueggData } from "@lasseborly/squegg-sdk";
import { useEffect, useState } from "react";

export type GripThreshold = number;

interface UseGrip {
  squeggData: SqueggData;
  gripThreshold: GripThreshold;
}

export function useGrip({ squeggData, gripThreshold }: UseGrip): number {
  const [grips, setGrips] = useState(0);
  useEffect(
    () => {
      const countsAsGrip = squeggData.strength > gripThreshold;
      const stoppedSqueezing = !squeggData.isSqueezing;
      const incrementGrip = (prevGrips: number) => prevGrips + 1;
      if (stoppedSqueezing && countsAsGrip) {
        setGrips(incrementGrip);
      }
    },
    // We only want to trigger this effect whenver isSqueezing updates.
    // If we did not limit it to such we would not be able to discern
    // when we were done triggering grips due to the not going to zero immediatly
    // after we are done squeezing. We could solve this with additional state mannagement
    // that would record the next value and compare it to the last and if strength is in decline
    // and we are no longer squeezing that would count as a grip.
    // To avoid the extra state mannagement we simply avoid listening to squeggData.strength changes.
    [squeggData.isSqueezing, gripThreshold] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return grips;
}
