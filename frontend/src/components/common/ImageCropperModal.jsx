import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/canvasUtils';

const ImageCropperModal = ({ isOpen, imageSrc, onCancel, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onRotationChange = (rotation) => {
    setRotation(rotation);
  };

  const onZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setLoading(true);
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      alert('Failed to crop image');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-white">
          <h2 className="text-xl font-bold text-gray-800">Edit Photo</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative h-[400px] w-full bg-[#333]">
          <Cropper
            image={imageSrc}
            crop={crop}
            rotation={rotation}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onRotationChange={onRotationChange}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={onZoomChange}
            cropShape="round"
            showGrid={false}
          />
        </div>

        {/* Controls */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Rotation</label>
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                aria-labelledby="Rotation"
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold shadow-lg shadow-red-200 hover:shadow-red-300 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Save Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
