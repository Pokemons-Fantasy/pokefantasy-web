import { useCallback, useEffect, useId, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadAvatar } from '../../api/auth';
import { useToastStore } from '../../store/toastStore';
import { extractErrorMessage } from '../../utils/errorMessage';
import { previewImageStyle } from '../../utils/avatarFile';
import { cropToJpeg, loadImage } from './cropImage';
import Modal from '../Modal';

const MAX_ZOOM = 4;

interface AvatarEditorModalProps {
  file: File;
  onClose: () => void;
}

interface LoadedImage {
  src: string;
  image: HTMLImageElement;
}

interface CropArea {
  /** En % de la imagen (vista previa). */
  percent: Area;
  /** En px de la imagen original (recorte). */
  pixels: Area;
}

/** Encuadre de la foto de perfil: arrastrar para mover, rueda / pinch / slider para el zoom. */
export default function AvatarEditorModal({ file, onClose }: AvatarEditorModalProps) {
  const titleId = useId();
  const zoomId = useId();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);

  // El object URL se crea y se libera en el mismo efecto (también bajo StrictMode).
  useEffect(() => {
    const src = URL.createObjectURL(file);
    let cancelled = false;
    loadImage(src)
      .then((image) => { if (!cancelled) setLoaded({ src, image }); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(src);
    };
  }, [file]);

  const onCropComplete = useCallback((percent: Area, pixels: Area) => setArea({ percent, pixels }), []);

  const save = useMutation({
    mutationFn: async ({ image, pixels }: { image: HTMLImageElement; pixels: Area }) =>
      uploadAvatar(await cropToJpeg(image, pixels)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['league-detail'] });
      addToast('success', 'Foto de perfil actualizada');
      onClose();
    },
    onError: (error) => addToast('error', extractErrorMessage(error, 'No se pudo guardar la foto')),
  });

  return (
    // Modal solo cierra por el fondo si la pulsación empezó en él: arrastrar la foto y soltar fuera no la pierde.
    <Modal labelledBy={titleId} onClose={onClose} className="avatar-editor">
      <h2 id={titleId}>Encuadra tu foto</h2>

      {loadFailed && (
        <p className="error" role="alert">
          No se puede abrir esta imagen. Prueba con una foto en JPG o PNG.
        </p>
      )}
      {!loaded && !loadFailed && <div className="avatar-editor-stage skeleton" aria-hidden="true" />}

      {loaded && (
        <>
          <div className="avatar-editor-stage">
            <Cropper
              image={loaded.src}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={MAX_ZOOM}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="avatar-editor-controls">
            <label htmlFor={zoomId}>Zoom</label>
            <input
              id={zoomId}
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            {area && (
              <div className="avatar-preview" aria-hidden="true">
                <img src={loaded.src} alt="" style={previewImageStyle(area.percent)} />
              </div>
            )}
          </div>
        </>
      )}

      <div className="avatar-editor-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button
          type="button"
          className="btn-primary"
          disabled={!loaded || !area || save.isPending}
          onClick={() => loaded && area && save.mutate({ image: loaded.image, pixels: area.pixels })}
        >
          {save.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}
