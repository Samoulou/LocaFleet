import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db";
import { submitTrialRequest } from "@/actions/trial-requests";

// ============================================================================
// Mocks
// ============================================================================

const sendEmailMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendEmailMock },
  })),
}));

// ============================================================================
// Constants
// ============================================================================

const REQUEST_ID = "b0000000-0000-4000-8000-000000000001";

const VALID_INPUT = {
  companyName: "Garage Lemania SA",
  contactName: "Jean Dupont",
  email: "jean.dupont@lemania.ch",
  phone: "+41 21 000 00 00",
  fleetSize: "31-60",
  message: "Nous gérons 45 véhicules.",
  locale: "fr",
  website: "",
};

// ============================================================================
// DB mock helpers
// ============================================================================

function mockInsertChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const values = vi.fn().mockReturnValue({ returning });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values, returning };
}

// ============================================================================
// submitTrialRequest
// ============================================================================

describe("submitTrialRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    sendEmailMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
  });

  it("creates a trial request with valid input", async () => {
    const { values } = mockInsertChain([{ id: REQUEST_ID }]);

    const result = await submitTrialRequest(VALID_INPUT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(REQUEST_ID);
    }
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: "Garage Lemania SA",
        contactName: "Jean Dupont",
        email: "jean.dupont@lemania.ch",
        phone: "+41 21 000 00 00",
        fleetSize: "31-60",
        locale: "fr",
      })
    );
  });

  it("stores null for omitted optional fields", async () => {
    const { values } = mockInsertChain([{ id: REQUEST_ID }]);

    const result = await submitTrialRequest({
      companyName: "Garage Lemania SA",
      contactName: "Jean Dupont",
      email: "jean.dupont@lemania.ch",
      fleetSize: "1-10",
    });

    expect(result.success).toBe(true);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, message: null })
    );
  });

  it("rejects invalid input with a French error message", async () => {
    const result = await submitTrialRequest({
      ...VALID_INPUT,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects non-object input", async () => {
    const result = await submitTrialRequest("garbage");

    expect(result.success).toBe(false);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("fakes success without inserting when honeypot is filled", async () => {
    const result = await submitTrialRequest({
      ...VALID_INPUT,
      website: "https://spam.example.com",
    });

    expect(result.success).toBe(true);
    expect(db.insert).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends a notification email when RESEND_API_KEY is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    mockInsertChain([{ id: REQUEST_ID }]);

    const result = await submitTrialRequest(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Garage Lemania SA"),
      })
    );
  });

  it("skips the email when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    mockInsertChain([{ id: REQUEST_ID }]);

    const result = await submitTrialRequest(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("still succeeds when the notification email fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    mockInsertChain([{ id: REQUEST_ID }]);
    sendEmailMock.mockRejectedValue(new Error("Resend down"));

    const result = await submitTrialRequest(VALID_INPUT);

    expect(result.success).toBe(true);
  });

  it("returns a French error when the DB insert fails", async () => {
    const returning = vi.fn().mockRejectedValue(new Error("DB down"));
    const values = vi.fn().mockReturnValue({ returning });
    vi.mocked(db.insert).mockReturnValue({ values } as never);

    const result = await submitTrialRequest(VALID_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Une erreur est survenue lors de l'envoi de votre demande"
      );
    }
  });
});
