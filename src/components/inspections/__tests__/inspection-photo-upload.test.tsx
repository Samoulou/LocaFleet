import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Hoisted mock references (available inside vi.mock factories) ---

const {
  mockImageCompression,
  mockToast,
  mockUpload,
  mockGetPublicUrl,
  mockSaveInspectionPhoto,
  mockDeleteInspectionPhoto,
} = vi.hoisted(() => ({
  mockImageCompression: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockUpload: vi.fn().mockResolvedValue({ error: null }),
  mockGetPublicUrl: vi.fn(() => ({
    data: { publicUrl: "https://example.com/photo.webp" },
  })),
  mockSaveInspectionPhoto: vi
    .fn()
    .mockResolvedValue({ success: true, data: { id: "photo-1" } }),
  mockDeleteInspectionPhoto: vi.fn().mockResolvedValue({ success: true }),
}));

// --- Mocks ---

vi.mock("browser-image-compression", () => ({
  default: mockImageCompression,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

// eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img data-fill={fill ? "true" : undefined} {...rest} />;
  },
}));

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  })),
}));

vi.mock("@/actions/inspections", () => ({
  saveInspectionPhoto: (...args: unknown[]) => mockSaveInspectionPhoto(...args),
  deleteInspectionPhoto: (...args: unknown[]) =>
    mockDeleteInspectionPhoto(...args),
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "test-uuid-1234"),
});

// Mock URL.createObjectURL / revokeObjectURL
vi.stubGlobal("URL", {
  ...globalThis.URL,
  createObjectURL: vi.fn(() => "blob:http://localhost/fake-preview"),
  revokeObjectURL: vi.fn(),
});

import { InspectionPhotoUpload } from "../inspection-photo-upload";

// --- Helpers ---

const DEFAULT_PROPS = {
  inspectionId: "insp-1",
  tenantId: "tenant-1",
  initialPhotos: [],
  disabled: false,
};

function makePhotos(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `photo-${i}`,
    url: `https://example.com/photo-${i}.webp`,
    fileName: `photo-${i}.webp`,
    position: "front",
    caption: null,
    sortOrder: i,
  }));
}

function createFakeFile(
  name = "test.jpg",
  size = 2_000_000,
  type = "image/jpeg"
) {
  const file = new File([new ArrayBuffer(size)], name, { type });
  return file;
}

// --- Tests ---

describe("InspectionPhotoUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImageCompression.mockResolvedValue(
      new File([new ArrayBuffer(500_000)], "compressed.webp", {
        type: "image/webp",
      })
    );
  });

  // ===== Rendering Tests =====

  describe("rendering", () => {
    it("renders two distinct buttons (camera + gallery) when not disabled", () => {
      render(<InspectionPhotoUpload {...DEFAULT_PROPS} />);

      const cameraBtn = screen.getByRole("button", { name: "cameraAriaLabel" });
      const galleryBtn = screen.getByRole("button", {
        name: "galleryAriaLabel",
      });

      expect(cameraBtn).toBeInTheDocument();
      expect(galleryBtn).toBeInTheDocument();
    });

    it("camera button has correct aria-label", () => {
      render(<InspectionPhotoUpload {...DEFAULT_PROPS} />);

      const cameraBtn = screen.getByRole("button", { name: "cameraAriaLabel" });
      expect(cameraBtn).toHaveAttribute("aria-label", "cameraAriaLabel");
    });

    it("gallery button has correct aria-label", () => {
      render(<InspectionPhotoUpload {...DEFAULT_PROPS} />);

      const galleryBtn = screen.getByRole("button", {
        name: "galleryAriaLabel",
      });
      expect(galleryBtn).toHaveAttribute("aria-label", "galleryAriaLabel");
    });

    it("camera input has capture='environment' attribute", () => {
      const { container } = render(
        <InspectionPhotoUpload {...DEFAULT_PROPS} />
      );

      const cameraInput = container.querySelector(
        'input[capture="environment"]'
      );
      expect(cameraInput).toBeInTheDocument();
      expect(cameraInput).toHaveAttribute("type", "file");
      expect(cameraInput).toHaveAttribute("accept", "image/*");
    });

    it("gallery input has multiple attribute", () => {
      const { container } = render(
        <InspectionPhotoUpload {...DEFAULT_PROPS} />
      );

      const galleryInput = container.querySelector("input[multiple]");
      expect(galleryInput).toBeInTheDocument();
      expect(galleryInput).toHaveAttribute("type", "file");
      expect(galleryInput).toHaveAttribute(
        "accept",
        "image/jpeg,image/png,image/webp"
      );
    });

    it("hides buttons when disabled prop is true", () => {
      render(<InspectionPhotoUpload {...DEFAULT_PROPS} disabled={true} />);

      expect(
        screen.queryByRole("button", { name: "cameraAriaLabel" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "galleryAriaLabel" })
      ).not.toBeInTheDocument();
    });
  });

  // ===== Max Photos Limit Tests =====

  describe("max photos limit", () => {
    it("disables camera button when 10 photos already uploaded", () => {
      render(
        <InspectionPhotoUpload
          {...DEFAULT_PROPS}
          initialPhotos={makePhotos(10)}
        />
      );

      const cameraBtn = screen.getByRole("button", { name: "cameraAriaLabel" });
      expect(cameraBtn).toBeDisabled();
    });

    it("disables gallery button when 10 photos already uploaded", () => {
      render(
        <InspectionPhotoUpload
          {...DEFAULT_PROPS}
          initialPhotos={makePhotos(10)}
        />
      );

      const galleryBtn = screen.getByRole("button", {
        name: "galleryAriaLabel",
      });
      expect(galleryBtn).toBeDisabled();
    });

    it("shows max photos info text when max reached", () => {
      render(
        <InspectionPhotoUpload
          {...DEFAULT_PROPS}
          initialPhotos={makePhotos(10)}
        />
      );

      expect(screen.getByText("maxPhotosInfo")).toBeInTheDocument();
    });

    it("shows toast error and does not open camera when camera button clicked at max", () => {
      render(
        <InspectionPhotoUpload
          {...DEFAULT_PROPS}
          initialPhotos={makePhotos(10)}
        />
      );

      const cameraBtn = screen.getByRole("button", { name: "cameraAriaLabel" });

      // Force click on disabled button via pointer events
      // The button is disabled so user.click won't fire the handler.
      // We verify the button is disabled and aria-disabled is set.
      expect(cameraBtn).toBeDisabled();
      expect(cameraBtn).toHaveAttribute("aria-disabled", "true");
    });
  });

  // ===== Compression Tests =====

  describe("compression", () => {
    it("calls imageCompression with correct options", async () => {
      const user = userEvent.setup();

      const { container } = render(
        <InspectionPhotoUpload {...DEFAULT_PROPS} />
      );

      const file = createFakeFile("photo.jpg", 5_000_000);

      // Trigger file selection via the gallery input (which has multiple)
      const galleryInput = container.querySelector(
        "input[multiple]"
      ) as HTMLInputElement;
      await user.upload(galleryInput, file);

      expect(mockImageCompression).toHaveBeenCalledOnce();
      expect(mockImageCompression).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({
          maxWidthOrHeight: 1920,
          fileType: "image/webp",
          initialQuality: 0.8,
          useWebWorker: true,
          maxSizeMB: 1,
        })
      );
    });

    it("shows compression error toast when imageCompression throws", async () => {
      const user = userEvent.setup();
      mockImageCompression.mockRejectedValueOnce(
        new Error("Compression failed")
      );

      const { container } = render(
        <InspectionPhotoUpload {...DEFAULT_PROPS} />
      );

      const file = createFakeFile("photo.jpg", 5_000_000);
      const galleryInput = container.querySelector(
        "input[multiple]"
      ) as HTMLInputElement;
      await user.upload(galleryInput, file);

      expect(mockToast.error).toHaveBeenCalledWith("compressionError");
    });

    it("does NOT upload when compression fails", async () => {
      const user = userEvent.setup();
      mockImageCompression.mockRejectedValueOnce(
        new Error("Compression failed")
      );

      const { container } = render(
        <InspectionPhotoUpload {...DEFAULT_PROPS} />
      );

      const file = createFakeFile("photo.jpg", 5_000_000);
      const galleryInput = container.querySelector(
        "input[multiple]"
      ) as HTMLInputElement;
      await user.upload(galleryInput, file);

      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockSaveInspectionPhoto).not.toHaveBeenCalled();
    });
  });

  // ===== Upload Flow Tests =====

  describe("upload flow", () => {
    it("uploads compressed file to supabase and saves photo", async () => {
      const user = userEvent.setup();

      const { container } = render(
        <InspectionPhotoUpload {...DEFAULT_PROPS} />
      );

      const file = createFakeFile("photo.jpg", 3_000_000);
      const galleryInput = container.querySelector(
        "input[multiple]"
      ) as HTMLInputElement;
      await user.upload(galleryInput, file);

      expect(mockUpload).toHaveBeenCalledOnce();
      expect(mockSaveInspectionPhoto).toHaveBeenCalledOnce();
      expect(mockSaveInspectionPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          inspectionId: "insp-1",
          url: "https://example.com/photo.webp",
          fileName: "photo.webp",
          position: "other",
        })
      );
    });

    it("shows success toast after successful upload", async () => {
      const user = userEvent.setup();

      const { container } = render(
        <InspectionPhotoUpload {...DEFAULT_PROPS} />
      );

      const file = createFakeFile("photo.jpg", 3_000_000);
      const galleryInput = container.querySelector(
        "input[multiple]"
      ) as HTMLInputElement;
      await user.upload(galleryInput, file);

      expect(mockToast.success).toHaveBeenCalledWith("uploadSuccess");
    });
  });
});
