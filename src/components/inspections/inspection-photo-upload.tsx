"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ImagePlus, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  saveInspectionPhoto,
  deleteInspectionPhoto,
} from "@/actions/inspections";

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const POSITIONS = [
  "front",
  "back",
  "left_side",
  "right_side",
  "other",
] as const;

type InspectionPhoto = {
  id: string;
  url: string;
  fileName: string | null;
  position: string | null;
  caption: string | null;
  sortOrder: number | null;
};

type InspectionPhotoUploadProps = {
  inspectionId: string;
  tenantId: string;
  initialPhotos: InspectionPhoto[];
  disabled?: boolean;
};

type UploadingFile = {
  id: string;
  previewUrl: string;
};

export function InspectionPhotoUpload({
  inspectionId,
  tenantId,
  initialPhotos,
  disabled,
}: InspectionPhotoUploadProps) {
  const t = useTranslations("inspections.departure");
  const tCommon = useTranslations("common");
  const [photos, setPhotos] = useState<InspectionPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>("other");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (
          !ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])
        ) {
          toast.error(t("invalidFileType"));
          continue;
        }
        if (file.size > MAX_PHOTO_SIZE) {
          toast.error(t("fileTooLarge"));
          continue;
        }
        if (photos.length + uploading.length >= MAX_PHOTOS) {
          toast.error(t("maxPhotosReached"));
          return;
        }

        const uploadId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);

        setUploading((prev) => [...prev, { id: uploadId, previewUrl }]);

        try {
          const ext = file.name.split(".").pop() ?? "jpg";
          const storagePath = `${tenantId}/inspections/${inspectionId}/${crypto.randomUUID()}.${ext}`;
          const supabase = getSupabaseBrowserClient();

          const { error: uploadError } = await supabase.storage
            .from("inspection-photos")
            .upload(storagePath, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) throw new Error(uploadError.message);

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("inspection-photos")
            .getPublicUrl(storagePath);

          const result = await saveInspectionPhoto({
            inspectionId,
            url: publicUrl,
            fileName: file.name,
            position: selectedPosition,
          });

          if (!result.success) throw new Error(result.error);

          const newPhoto: InspectionPhoto = {
            id: result.data.id,
            url: publicUrl,
            fileName: file.name,
            position: selectedPosition,
            caption: null,
            sortOrder: photos.length,
          };

          setPhotos((prev) => [...prev, newPhoto]);
          toast.success(t("uploadSuccess"));
        } catch (err) {
          toast.error(
            `${t("uploadError")}: ${err instanceof Error ? err.message : "Unknown"}`
          );
        } finally {
          setUploading((prev) => prev.filter((u) => u.id !== uploadId));
          URL.revokeObjectURL(previewUrl);
        }
      }
    },
    [
      inspectionId,
      tenantId,
      photos.length,
      uploading.length,
      selectedPosition,
      t,
    ]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const photoId = deleteTarget;
    setDeleteTarget(null);

    const result = await deleteInspectionPhoto({ photoId, inspectionId });
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success(t("deleteSuccess"));
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {t("photos")}{" "}
          <span className="text-xs text-slate-400">
            ({photos.length}/{MAX_PHOTOS})
          </span>
        </span>
        {!disabled && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedPosition}
              onValueChange={setSelectedPosition}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {t(`positions.${pos}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS}
            >
              <ImagePlus className="mr-1 size-4" />
              {t("addPhoto")}
            </Button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {photos.length === 0 && uploading.length === 0 ? (
        <div
          className={
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-8 text-center" +
            (!disabled
              ? " cursor-pointer hover:border-blue-300 hover:bg-blue-50/50"
              : "")
          }
          onDrop={!disabled ? handleDrop : undefined}
          onDragOver={!disabled ? handleDragOver : undefined}
          onClick={!disabled ? () => fileInputRef.current?.click() : undefined}
        >
          <Upload className="mb-2 size-8 text-slate-300" />
          <p className="text-sm text-slate-500">{t("dropzone")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("dropzoneFormats")}</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          onDrop={!disabled ? handleDrop : undefined}
          onDragOver={!disabled ? handleDragOver : undefined}
        >
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square">
              <Image
                src={photo.url}
                alt={photo.fileName ?? "Inspection photo"}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="rounded-lg object-cover"
              />
              {photo.position && (
                <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {t(`positions.${photo.position}`)}
                </div>
              )}
              {!disabled && (
                <div className="absolute inset-0 flex items-end justify-center rounded-lg bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDeleteTarget(photo.id)}
                  >
                    <Trash2 className="mr-1 size-3" />
                    {tCommon("delete")}
                  </Button>
                </div>
              )}
            </div>
          ))}

          {uploading.map((upload) => (
            <div
              key={upload.id}
              className="relative flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50"
            >
              <Loader2 className="size-6 animate-spin text-blue-500" />
            </div>
          ))}

          {!disabled &&
            uploading.length === 0 &&
            photos.length < MAX_PHOTOS && (
              <div
                className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-200 transition-colors hover:border-blue-300 hover:bg-blue-50/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-1">
                  <ImagePlus className="size-5 text-slate-300" />
                  <span className="text-xs text-slate-400">
                    {t("addPhoto")}
                  </span>
                </div>
              </div>
            )}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePhotoTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deletePhotoDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
