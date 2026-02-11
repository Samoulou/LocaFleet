"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ImagePlus, Star, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  saveVehiclePhoto,
  deleteVehiclePhoto,
  setCoverPhoto,
} from "@/actions/vehicle-photos";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_SIZE,
} from "@/lib/validations/vehicle-photos";
import type { VehiclePhoto } from "@/actions/vehicle-photos";

type VehiclePhotoGalleryProps = {
  vehicleId: string;
  tenantId: string;
  initialPhotos: VehiclePhoto[];
  canEdit: boolean;
};

type UploadingFile = {
  id: string;
  file: File;
  progress: number;
  previewUrl: string;
};

export function VehiclePhotoGallery({
  vehicleId,
  tenantId,
  initialPhotos,
  canEdit,
}: VehiclePhotoGalleryProps) {
  const t = useTranslations("vehicles.photos");
  const tCommon = useTranslations("common");
  const [photos, setPhotos] = useState<VehiclePhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        // Client-side validation
        if (
          !ALLOWED_PHOTO_TYPES.includes(
            file.type as (typeof ALLOWED_PHOTO_TYPES)[number]
          )
        ) {
          toast.error(t("invalidFileType"));
          continue;
        }
        if (file.size > MAX_PHOTO_SIZE) {
          toast.error(t("fileTooLarge"));
          continue;
        }

        const uploadId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);

        setUploading((prev) => [
          ...prev,
          { id: uploadId, file, progress: 0, previewUrl },
        ]);

        try {
          // Upload to Supabase Storage
          const ext = file.name.split(".").pop() ?? "jpg";
          const storagePath = `${tenantId}/vehicles/${vehicleId}/${crypto.randomUUID()}.${ext}`;
          const supabase = getSupabaseBrowserClient();

          const { error: uploadError } = await supabase.storage
            .from("vehicle-photos")
            .upload(storagePath, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            throw new Error(uploadError.message);
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("vehicle-photos").getPublicUrl(storagePath);

          // Save DB record via server action
          const result = await saveVehiclePhoto({
            vehicleId,
            url: publicUrl,
            fileName: file.name,
          });

          if (!result.success) {
            throw new Error(result.error);
          }

          // Update local state
          const newPhoto: VehiclePhoto = {
            id: result.data.id,
            url: publicUrl,
            fileName: file.name,
            isCover: photos.length === 0 && uploading.length === 0,
            sortOrder: photos.length,
            createdAt: new Date(),
          };

          setPhotos((prev) => [...prev, newPhoto]);
          toast.success(t("uploadSuccess"));
        } catch (err) {
          toast.error(
            `${t("uploadError")}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        } finally {
          setUploading((prev) => prev.filter((u) => u.id !== uploadId));
          URL.revokeObjectURL(previewUrl);
        }
      }
    },
    [vehicleId, tenantId, photos.length, uploading.length, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!canEdit) return;
      handleFiles(e.dataTransfer.files);
    },
    [canEdit, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleSetCover = (photoId: string) => {
    startTransition(async () => {
      const result = await setCoverPhoto({ photoId, vehicleId });
      if (result.success) {
        setPhotos((prev) =>
          prev.map((p) => ({
            ...p,
            isCover: p.id === photoId,
          }))
        );
        toast.success(t("coverSuccess"));
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (photoId: string) => {
    setDeleteTarget(photoId);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const photoId = deleteTarget;
    setDeleteTarget(null);

    startTransition(async () => {
      const result = await deleteVehiclePhoto({ photoId, vehicleId });
      if (result.success) {
        setPhotos((prev) => {
          const remaining = prev.filter((p) => p.id !== photoId);
          // If deleted photo was cover and there are remaining photos,
          // the server already promoted the next one
          const deletedWasCover = prev.find((p) => p.id === photoId)?.isCover;
          if (deletedWasCover && remaining.length > 0) {
            remaining[0] = { ...remaining[0], isCover: true };
          }
          return remaining;
        });
        toast.success(t("deleteSuccess"));
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t("title")}</h2>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            <ImagePlus className="mr-2 size-4" />
            {t("addPhotos")}
          </Button>
        )}
      </div>

      {/* Hidden file input */}
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

      {/* Gallery grid or empty state */}
      {photos.length === 0 && uploading.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-12 text-center",
            canEdit &&
              "cursor-pointer hover:border-blue-300 hover:bg-blue-50/50"
          )}
          onDrop={canEdit ? handleDrop : undefined}
          onDragOver={canEdit ? handleDragOver : undefined}
          onClick={canEdit ? () => fileInputRef.current?.click() : undefined}
        >
          <Upload className="mb-3 size-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            {canEdit ? t("dropzone") : t("noPhotos")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {canEdit ? t("dropzoneFormats") : t("noPhotosDescription")}
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
          onDrop={canEdit ? handleDrop : undefined}
          onDragOver={canEdit ? handleDragOver : undefined}
        >
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square">
              <Image
                src={photo.url}
                alt={photo.fileName ?? "Vehicle photo"}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="rounded-lg object-cover"
              />

              {/* Cover badge */}
              {photo.isCover && (
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
                  <Star className="size-3 fill-current" />
                  {t("cover")}
                </div>
              )}

              {/* Hover overlay with actions */}
              {canEdit && (
                <div className="absolute inset-0 flex items-end justify-center gap-2 rounded-lg bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                  {!photo.isCover && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleSetCover(photo.id)}
                      disabled={isPending}
                    >
                      <Star className="mr-1 size-3" />
                      {t("setCover")}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleDelete(photo.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="mr-1 size-3" />
                    {t("delete")}
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Uploading indicators */}
          {uploading.map((upload) => (
            <div
              key={upload.id}
              className="relative flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50"
            >
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="size-6 animate-spin text-blue-500" />
                <span className="text-xs text-blue-600">{t("uploading")}</span>
              </div>
            </div>
          ))}

          {/* Drop zone placeholder when gallery has items */}
          {canEdit && uploading.length === 0 && (
            <div
              className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-200 transition-colors hover:border-blue-300 hover:bg-blue-50/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1">
                <ImagePlus className="size-6 text-slate-300" />
                <span className="text-xs text-slate-400">{t("addPhotos")}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t("deleteConfirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
