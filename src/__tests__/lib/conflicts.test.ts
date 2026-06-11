import { describe, it, expect, vi } from "vitest";
import { checkVehicleConflicts, checkEmployeeConflicts } from "@/lib/conflicts";
import type { DbLike } from "@/lib/number-utils";

const TENANT_ID = "a0000000-0000-4000-8000-000000000010";
const VEHICLE_ID = "b0000000-0000-4000-8000-000000000001";
const USER_ID = "c0000000-0000-4000-8000-000000000001";
const START = new Date("2026-07-01T08:00:00");
const END = new Date("2026-07-03T18:00:00");

/**
 * Stub DbLike whose select() resolves the next result in sequence,
 * whatever the chain shape (.from().innerJoin().where()).
 */
function makeDbx(results: unknown[][]) {
  let callIndex = 0;
  const select = vi.fn().mockImplementation(() => {
    const current = results[callIndex] ?? [];
    callIndex++;
    const resolved = Promise.resolve(current);
    const chain: Record<string, unknown> = {
      then: resolved.then.bind(resolved),
      catch: resolved.catch.bind(resolved),
    };
    chain.where = vi.fn().mockReturnValue(chain);
    chain.innerJoin = vi.fn().mockReturnValue(chain);
    const from = vi.fn().mockReturnValue(chain);
    return { from };
  });
  return {
    dbx: { select } as unknown as DbLike,
    select,
  };
}

const CONTRACT_ROW = {
  vehicleId: VEHICLE_ID,
  refId: "contract-1",
  refNumber: "CTR-2026-0001",
  startDate: new Date("2026-07-02T08:00:00"),
  endDate: new Date("2026-07-05T08:00:00"),
};

const EVENT_VEHICLE_ROW = {
  vehicleId: VEHICLE_ID,
  refId: "event-1",
  refNumber: "EVT-2026-0001",
  startDate: new Date("2026-07-01T08:00:00"),
  endDate: new Date("2026-07-02T08:00:00"),
};

describe("checkVehicleConflicts", () => {
  it("returns empty without querying when no vehicle ids", async () => {
    const { dbx, select } = makeDbx([]);

    const result = await checkVehicleConflicts(dbx, TENANT_ID, [], START, END);

    expect(result).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  it("merges contract and event conflicts with source labels", async () => {
    const { dbx, select } = makeDbx([[CONTRACT_ROW], [EVENT_VEHICLE_ROW]]);

    const result = await checkVehicleConflicts(
      dbx,
      TENANT_ID,
      [VEHICLE_ID],
      START,
      END
    );

    expect(select).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      source: "contract",
      refNumber: "CTR-2026-0001",
    });
    expect(result[1]).toMatchObject({
      source: "event",
      refNumber: "EVT-2026-0001",
    });
  });

  it("checks contracts only when sources is ['contract'] (blocking flow)", async () => {
    const { dbx, select } = makeDbx([[CONTRACT_ROW]]);

    const result = await checkVehicleConflicts(
      dbx,
      TENANT_ID,
      [VEHICLE_ID],
      START,
      END,
      { sources: ["contract"] }
    );

    expect(select).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("contract");
  });

  it("checks events only when sources is ['event']", async () => {
    const { dbx, select } = makeDbx([[EVENT_VEHICLE_ROW]]);

    const result = await checkVehicleConflicts(
      dbx,
      TENANT_ID,
      [VEHICLE_ID],
      START,
      END,
      { sources: ["event"] }
    );

    expect(select).toHaveBeenCalledTimes(1);
    expect(result[0].source).toBe("event");
  });

  it("returns empty when no overlaps found", async () => {
    const { dbx } = makeDbx([[], []]);

    const result = await checkVehicleConflicts(
      dbx,
      TENANT_ID,
      [VEHICLE_ID],
      START,
      END
    );

    expect(result).toEqual([]);
  });
});

describe("checkEmployeeConflicts", () => {
  it("returns empty without querying when no user ids", async () => {
    const { dbx, select } = makeDbx([]);

    const result = await checkEmployeeConflicts(dbx, TENANT_ID, [], START, END);

    expect(result).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  it("returns overlapping event assignments", async () => {
    const row = {
      userId: USER_ID,
      eventId: "event-1",
      eventNumber: "EVT-2026-0001",
      startDate: new Date("2026-07-02T08:00:00"),
      endDate: new Date("2026-07-04T08:00:00"),
    };
    const { dbx, select } = makeDbx([[row]]);

    const result = await checkEmployeeConflicts(
      dbx,
      TENANT_ID,
      [USER_ID],
      START,
      END
    );

    expect(select).toHaveBeenCalledTimes(1);
    expect(result).toEqual([row]);
  });
});
