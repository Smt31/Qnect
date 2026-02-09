import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Home/Navbar';
import { getAuthToken, userApi, API_URL } from '../api';
import ImageCropperModal from '../components/common/ImageCropperModal';

export default function SettingsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    bio: '',
    location: '',
    avatarUrl: '',
    allowPublicMessages: true
  });

  const [uploading, setUploading] = useState(false);
  
  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const user = await userApi.getCurrentUser();
        setMe(user);
        setFormData({
          fullName: user.fullName || '',
          username: user.username || '',
          bio: user.bio || '',
          location: user.location || '',
          avatarUrl: user.avatarUrl || '',
          allowPublicMessages: user.allowPublicMessages ?? true
        });
      } catch (e) {
        setError(e.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error on edit
    setSuccess('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size exceeds 10MB limit');
      return;
    }

    // Read file as data URL for cropping
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setSelectedImage(reader.result);
      setShowCropper(true);
      // Reset file input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob) => {
    setShowCropper(false);
    
    // Create a File object from the Blob
    const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      setUploading(true);
      setError('');
      // Direct fetch for upload to handle FormData correctly (browser sets boundary)
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          // Do not set Content-Type, browser sets it with boundary
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: uploadData
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      const newAvatarUrl = data.url;
      
      setFormData(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
      
      // Persist the change immediately
      const updatedUser = await userApi.updateUserProfile({
        ...formData,
        avatarUrl: newAvatarUrl
      });
      setMe(updatedUser);
      setSuccess('Profile photo updated successfully!');
      
      setSelectedImage(null);
    } catch (e) {
      console.error(e);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedUser = await userApi.updateUserProfile(formData);
      setMe(updatedUser);
      setSuccess('Profile updated successfully!');

      // Optional: Navigate to profile after short delay or just stay here
      // window.scrollTo(0, 0); 
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F6]">
        <Navbar user={me} />
        <div className="max-w-[800px] mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm p-8 animate-pulse">
            <div className="h-24 w-24 bg-gray-200 rounded-full mb-6 mx-auto"></div>
            <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F6] pb-20">
      <Navbar user={me} />

      <div className="max-w-[800px] mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg border border-red-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-pink-600 px-8 py-6 text-white text-center">
            <h1 className="text-2xl font-bold">Edit Profile</h1>
            <p className="opacity-90 text-sm">Update your personal details and avatar</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center justify-center mb-8">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-100">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-3xl font-bold">
                        {formData.fullName?.[0] || 'U'}
                      </div>
                    )}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white">
                      <svg className="animate-spin w-8 h-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-500 font-medium">Click to upload new picture</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Full Name</label>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all outline-none"
                    placeholder="Your Name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Username</label>
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all outline-none"
                    placeholder="@username"
                  />
                  <p className="text-xs text-gray-400 pl-1">Must be unique</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all outline-none resize-none"
                  placeholder="Tell us a little about yourself..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Location</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all outline-none"
                    placeholder="City, Country"
                  />
                </div>
              </div>

              {/* Public Messages Setting */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Allow Public Messages</h3>
                    <p className="text-sm text-gray-500">Allow other users to send you messages</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowPublicMessages"
                      checked={formData.allowPublicMessages}
                      onChange={(e) => setFormData({...formData, allowPublicMessages: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/profile`)}
                  className="px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold shadow-lg shadow-red-200 hover:shadow-red-300 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>


      {/* Image Cropper Modal */}
      {showCropper && (
        <ImageCropperModal
          isOpen={showCropper}
          imageSrc={selectedImage}
          onCancel={handleCropCancel}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
