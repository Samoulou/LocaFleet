// ============================================================================
// Tool definitions for OpenAI function calling
// ============================================================================

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "searchVehicles",
      description:
        "Search vehicles by brand, model, plate number, or status. Returns a list of matching vehicles.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search term for brand, model, or plate number. Use empty string to list all.",
          },
          status: {
            type: "string",
            description:
              "Filter by status: available, rented, maintenance, out_of_service. Omit to search all.",
          },
          limit: {
            type: "number",
            description: "Maximum results (default 20).",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getVehicleAvailability",
      description:
        "Find vehicles that are available for rental between a start date and end date.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in ISO 8601 format (YYYY-MM-DD).",
          },
          endDate: {
            type: "string",
            description: "End date in ISO 8601 format (YYYY-MM-DD).",
          },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "searchClients",
      description:
        "Search clients by first name, last name, email, or phone. Returns matching clients.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term. Use empty string to list all clients.",
          },
          limit: {
            type: "number",
            description: "Maximum results (default 20).",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getClientContracts",
      description:
        "Get rental contracts for a specific client. Returns contract summaries.",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "UUID of the client.",
          },
          status: {
            type: "string",
            description:
              "Filter by contract status: draft, approved, pending_cg, active, completed, cancelled. Omit for all.",
          },
        },
        required: ["clientId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getClientBalance",
      description:
        "Get the outstanding balance (unpaid invoices) for a specific client. Returns invoice list with amounts.",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "UUID of the client.",
          },
        },
        required: ["clientId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getContracts",
      description:
        "Get rental contracts filtered by status and/or date range. Returns contract summaries with client and vehicle info.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description:
              "Filter by status: draft, approved, pending_cg, active, completed, cancelled. Omit for all.",
          },
          startDateFrom: {
            type: "string",
            description: "Filter contracts starting on or after this date (YYYY-MM-DD).",
          },
          startDateTo: {
            type: "string",
            description: "Filter contracts starting on or before this date (YYYY-MM-DD).",
          },
          limit: {
            type: "number",
            description: "Maximum results (default 20).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getMaintenanceRecords",
      description:
        "Get maintenance records for a specific vehicle or all vehicles. Returns maintenance details.",
      parameters: {
        type: "object",
        properties: {
          vehicleId: {
            type: "string",
            description: "UUID of the vehicle. Omit to get records for all vehicles.",
          },
          status: {
            type: "string",
            description:
              "Filter by status: open, in_progress, completed. Omit for all.",
          },
          limit: {
            type: "number",
            description: "Maximum results (default 20).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getDashboardSummary",
      description:
        "Get a fleet overview summary: active rentals, returns due today, overdue returns, vehicles in maintenance, available vehicles, monthly revenue.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generateEmail",
      description:
        "Draft a professional email. Returns the subject and body text. The email is NOT sent.",
      parameters: {
        type: "object",
        properties: {
          recipientName: {
            type: "string",
            description: "Name of the recipient.",
          },
          purpose: {
            type: "string",
            description:
              "Purpose of the email: payment_reminder, booking_confirmation, return_reminder, maintenance_notice, other.",
          },
          language: {
            type: "string",
            description: "Language code: fr, de, it, en. Default is fr.",
          },
          details: {
            type: "string",
            description:
              "Additional context to include in the email (amounts, dates, contract numbers, etc.).",
          },
        },
        required: ["recipientName", "purpose"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getKPIs",
      description:
        "Get all business KPIs: fleet overview, contract stats, invoice stats, client stats, and dashboard intelligence (utilization rate, revenue per vehicle, avg contract duration, recurring clients, unpaid amounts, avg contract value).",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
] as const;

export type ToolName = (typeof TOOL_DEFINITIONS)[number]["function"]["name"];
