import React, { useState } from 'react';
import axios from 'axios';
import './Sora.css';

interface VideoGenerationParams {
  prompt: string;
  model: string;
  seconds: string;
  size: string;
  input_reference?: File | null;
}

const Sora: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('A calico cat playing a piano on stage');
  const [model, setModel] = useState<string>('sora-2');
  const [seconds, setSeconds] = useState<string>('4');
  const [size, setSize] = useState<string>('720x1280');
  const [inputReference, setInputReference] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [videoId, setVideoId] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setInputReference(file);
      
      // Создаем preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Функция для изменения размера изображения
  const resizeImage = (file: File, targetWidth: number, targetHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Рисуем изображение с новыми размерами
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          // Конвертируем canvas в blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png');
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  };

  const generateVideo = async () => {
    setLoading(true);
    setError('');
    setVideoUrl('');
    setVideoId('');

    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment variables');
      }

      // Создаем FormData для отправки
      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('seconds', seconds);
      formData.append('size', size);

      // Если есть reference изображение, изменяем его размер
      if (inputReference) {
        // Парсим размер (например, "720x1280")
        const [width, height] = size.split('x').map(Number);
        
        console.log(`Resizing image to ${width}x${height}...`);
        
        // Изменяем размер изображения
        const resizedBlob = await resizeImage(inputReference, width, height);
        
        // Добавляем изменённое изображение
        formData.append('input_reference', resizedBlob, 'reference.png');
      }

      // Запрос на генерацию видео
      const response = await axios.post(
        'https://api.openai.com/v1/videos',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Generation response:', response.data);
      
      // Получаем ID видео из ответа
      const generatedVideoId = response.data.id || response.data.video_id;
      
      if (generatedVideoId) {
        setVideoId(generatedVideoId);
        // Загружаем видео
        await downloadVideo(generatedVideoId, apiKey);
      } else {
        throw new Error('Video ID not found in response');
      }

    } catch (err: any) {
      console.error('Error generating video:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to generate video');
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = async (videoIdToDownload: string, apiKey: string) => {
    try {
      // Запрос на скачивание видео
      const response = await axios.get(
        `https://api.openai.com/v1/videos/${videoIdToDownload}/content`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          responseType: 'blob',
        }
      );

      // Создаем URL для blob
      const blob = new Blob([response.data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      
      console.log('Video downloaded successfully');
    } catch (err: any) {
      console.error('Error downloading video:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to download video');
    }
  };

  const retryDownload = async () => {
    if (videoId) {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      if (apiKey) {
        setLoading(true);
        setError('');
        await downloadVideo(videoId, apiKey);
        setLoading(false);
      }
    }
  };

  return (
    <div className="sora-container">
      <h1>Sora Video Generation</h1>

      <div className="form-section">
        <div className="form-group">
          <label htmlFor="prompt">Prompt:</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to generate..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="model">Model:</label>
          <div className="button-group">
            <button
              className={model === 'sora-2' ? 'active' : ''}
              onClick={() => setModel('sora-2')}
            >
              Sora-2
            </button>
            <button
              className={model === 'sora-1' ? 'active' : ''}
              onClick={() => setModel('sora-1')}
            >
              Sora-1
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="seconds">Duration (seconds):</label>
          <div className="button-group">
            <button
              className={seconds === '4' ? 'active' : ''}
              onClick={() => setSeconds('4')}
            >
              4s
            </button>
            <button
              className={seconds === '8' ? 'active' : ''}
              onClick={() => setSeconds('8')}
            >
              8s
            </button>
            <button
              className={seconds === '12' ? 'active' : ''}
              onClick={() => setSeconds('12')}
            >
              12s
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="size">Resolution (size):</label>
          <div className="button-group">
            <button
              className={size === '720x1280' ? 'active' : ''}
              onClick={() => setSize('720x1280')}
            >
              720x1280 (Portrait)
            </button>
            <button
              className={size === '1280x720' ? 'active' : ''}
              onClick={() => setSize('1280x720')}
            >
              1280x720 (Landscape)
            </button>
            <button
              className={size === '1080x1920' ? 'active' : ''}
              onClick={() => setSize('1080x1920')}
            >
              1080x1920 (Full HD Portrait)
            </button>
            <button
              className={size === '1920x1080' ? 'active' : ''}
              onClick={() => setSize('1920x1080')}
            >
              1920x1080 (Full HD)
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reference">Reference Image (Optional):</label>
          <input
            type="file"
            id="reference"
            accept="image/*"
            onChange={handleFileChange}
          />
          {inputReference && (
            <div className="image-preview-container">
              <p className="file-info">Selected: {inputReference.name}</p>
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <p className="preview-note">
                    This image will be resized to {size} before sending
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="generate-button"
          onClick={generateVideo}
          disabled={loading || !prompt}
        >
          {loading ? 'Generating...' : 'Generate Video'}
        </button>

        {videoId && !videoUrl && !loading && (
          <button
            className="retry-button"
            onClick={retryDownload}
          >
            Retry Download
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {videoUrl && (
        <div className="video-section">
          <h2>Generated Video:</h2>
          <video controls src={videoUrl} className="generated-video">
            Your browser does not support the video tag.
          </video>
          <a
            href={videoUrl}
            download="sora-generated-video.mp4"
            className="download-link"
          >
            Download Video
          </a>
        </div>
      )}
    </div>
  );
};

export default Sora;

