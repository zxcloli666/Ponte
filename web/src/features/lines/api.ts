import { api } from "@/shared/api/client";
import type { Sim, ExtraNumber } from "./store";

interface SimWithExtras extends Sim {
  extraNumbers?: ExtraNumber[];
}

/**
 * Fetch all SIMs (with nested extra numbers) for the current user.
 */
export async function getSims(): Promise<SimWithExtras[]> {
  return api.get("sims").json<SimWithExtras[]>();
}

/**
 * Load SIMs and extract extra numbers from nested data.
 */
export async function loadLines(): Promise<{
  sims: Sim[];
  extraNumbers: ExtraNumber[];
}> {
  const simsWithExtras = await getSims();

  const sims: Sim[] = simsWithExtras.map(
    ({ extraNumbers: _, ...sim }) => sim,
  );

  const extraNumbers: ExtraNumber[] = simsWithExtras.flatMap(
    (sim) => sim.extraNumbers ?? [],
  );

  return { sims, extraNumbers };
}
