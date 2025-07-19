'use client'

import { useState, useRef } from 'react'
import { 
  PhotoIcon, 
  SparklesIcon, 
  PlayIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface UploadedImage {
  id: string
  url: string
  name: string
  uploadedAt: Date
}

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  style: string
  generatedAt: Date
  status: 'generating' | 'completed' | 'failed'
}

const GENERATION_STYLES = [
  { id: 'realistic', name: 'Realistic Portrait', description: 'Photorealistic style' },
  { id: 'artistic', name: 'Artistic', description: 'Artistic interpretation' },
  { id: 'fantasy', name: 'Fantasy Character', description: 'Fantasy/RPG style' },
  { id: 'anime', name: 'Anime Style', description: 'Japanese anime style' },
  { id: 'vintage', name: 'Vintage Photo', description: '1950s-80s vintage style' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Futuristic cyberpunk style' }
]

const SAMPLE_PROMPTS = [
  "A professional headshot in a modern office setting",
  "Fantasy warrior in medieval armor with magical aura",
  "Cyberpunk character with neon lighting and tech implants",
  "Elegant portrait in renaissance painting style",
  "Adventurer in a mystical forest with magical creatures",
  "Sci-fi space captain on the bridge of a starship"
]

export default function AITrainingPage() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [modelTrained, setModelTrained] = useState(false)
  
  const [selectedStyle, setSelectedStyle] = useState('realistic')
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        const newImage: UploadedImage = {
          id: Date.now().toString() + Math.random(),
          url,
          name: file.name,
          uploadedAt: new Date()
        }
        setUploadedImages(prev => [...prev, newImage])
      }
    })
    
    toast.success(`${files.length} photo(s) uploaded successfully`)
  }

  const removeImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id))
    toast.success('Photo removed')
  }

  const startTraining = async () => {
    if (uploadedImages.length < 10) {
      toast.error('Please upload at least 10 photos for better training results')
      return
    }

    setIsTraining(true)
    setTrainingProgress(0)
    
    // Simulate training progress
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsTraining(false)
          setModelTrained(true)
          toast.success('🎉 AI model training completed! You can now generate portraits.')
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 1000)
  }

  const generatePortrait = async () => {
    if (!modelTrained) {
      toast.error('Please train your AI model first')
      return
    }

    if (!customPrompt.trim()) {
      toast.error('Please enter a prompt for generation')
      return
    }

    setIsGenerating(true)
    
    const newGeneration: GeneratedImage = {
      id: Date.now().toString(),
      url: '', // Will be populated after generation
      prompt: customPrompt,
      style: selectedStyle,
      generatedAt: new Date(),
      status: 'generating'
    }
    
    setGeneratedImages(prev => [newGeneration, ...prev])

    // Simulate generation process
    setTimeout(() => {
      // Mock generated image URL
      const mockImageUrl = `https://picsum.photos/512/512?random=${Date.now()}`
      
      setGeneratedImages(prev => prev.map(img => 
        img.id === newGeneration.id 
          ? { ...img, url: mockImageUrl, status: 'completed' as const }
          : img
      ))
      
      setIsGenerating(false)
      toast.success('🎨 Portrait generated successfully!')
    }, 5000)
  }

  const useSamplePrompt = (prompt: string) => {
    setCustomPrompt(prompt)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI Portrait Training
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Train your personal AI model and generate custom portraits
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`px-3 py-1 rounded-full font-medium ${
                modelTrained 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                {modelTrained ? 'Model Ready' : 'Not Trained'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - Training */}
          <div className="space-y-6">
            
            {/* Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <PhotoIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Training Photos
                </h2>
              </div>
              
              <div 
                className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <PhotoIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Drop your portrait photos here or click to browse
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  Upload 10-20 high-quality portraits for best results
                </p>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                  Select Photos
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {/* Uploaded Images Grid */}
              {uploadedImages.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Uploaded Photos ({uploadedImages.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {uploadedImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                        />
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Training Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Cog6ToothIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Model Training
                </h2>
              </div>
              
              {!modelTrained && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Training Progress</span>
                    <span className="font-medium text-gray-900 dark:text-white">{Math.round(trainingProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${trainingProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              <button
                onClick={startTraining}
                disabled={isTraining || uploadedImages.length < 5 || modelTrained}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
              >
                {isTraining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Training Model...
                  </>
                ) : modelTrained ? (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Model Trained Successfully
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    Start Training
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Training typically takes 3-5 minutes with 10+ photos
              </p>
            </div>
          </div>

          {/* Right Column - Generation */}
          <div className="space-y-6">
            
            {/* Generation Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generate AI Portraits
                </h2>
              </div>
              
              {/* Style Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Art Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GENERATION_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedStyle === style.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {style.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {style.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Prompt Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prompt
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe the scene or character you want to create..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              
              {/* Sample Prompts */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sample Prompts
                </label>
                <div className="space-y-1">
                  {SAMPLE_PROMPTS.slice(0, 3).map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => useSamplePrompt(prompt)}
                      className="block w-full text-left px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Generate Button */}
              <button
                onClick={generatePortrait}
                disabled={!modelTrained || isGenerating || !customPrompt.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Generate AI Portrait
                  </>
                )}
              </button>
            </div>

            {/* Generated Images Gallery */}
            {generatedImages.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <EyeIcon className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Generated Gallery
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                        {image.status === 'generating' ? (
                          <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">Generating...</p>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={image.url}
                            alt={image.prompt}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      {image.status === 'completed' && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <div className="flex gap-2">
                            <button className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>
                            <button className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {image.prompt}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {image.style} • {image.generatedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 