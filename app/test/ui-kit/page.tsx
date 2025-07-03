'use client'

import { useState } from 'react'
import { Button, Input, Textarea, Modal, Card } from '@/components/ui'
import { 
  PlusIcon, 
  HeartIcon, 
  TrashIcon, 
  CheckIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import ClientShell from '@/components/ClientShell'

export default function UiKitPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [textareaValue, setTextareaValue] = useState('')

  return (
    <ClientShell>
      <div className="min-h-screen bg-slate-900 p-8 pt-24">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">UI Kit Demo</h1>
            <p className="text-slate-400">Тестирование новых компонентов дизайн-системы</p>
          </div>

          {/* Buttons Section */}
          <Card>
            <h2 className="text-2xl font-bold text-white mb-6">Buttons</h2>
            
            <div className="space-y-6">
              {/* Variants */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Variants</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="danger">Danger Button</Button>
                  <Button variant="success">Success Button</Button>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Sizes</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>

              {/* With Icons */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">With Icons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button icon={<PlusIcon />}>Create Post</Button>
                  <Button variant="secondary" icon={<HeartIcon />}>Like</Button>
                  <Button variant="danger" icon={<TrashIcon />} iconPosition="right">
                    Delete
                  </Button>
                </div>
              </div>

              {/* States */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">States</h3>
                <div className="flex flex-wrap gap-4">
                  <Button loading>Loading...</Button>
                  <Button disabled>Disabled</Button>
                  <Button fullWidth>Full Width Button</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Inputs Section */}
          <Card>
            <h2 className="text-2xl font-bold text-white mb-6">Inputs</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Basic Input"
                placeholder="Enter text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              
              <Input
                label="With Icon"
                placeholder="Search..."
                icon={<MagnifyingGlassIcon />}
              />
              
              <Input
                label="Email Input"
                type="email"
                placeholder="email@example.com"
                icon={<EnvelopeIcon />}
                helperText="We'll never share your email"
              />
              
              <Input
                label="With Error"
                placeholder="Required field"
                error="This field is required"
                value=""
              />
            </div>
          </Card>

          {/* Textarea Section */}
          <Card>
            <h2 className="text-2xl font-bold text-white mb-6">Textarea</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Textarea
                label="Basic Textarea"
                placeholder="Write something..."
                rows={4}
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
              />
              
              <Textarea
                label="Auto-resize Textarea"
                placeholder="This textarea will grow as you type..."
                autoResize
                rows={4}
                helperText="Auto-resizes based on content"
              />
              
              <Textarea
                label="With Character Count"
                placeholder="Limited to 200 characters..."
                showCharCount
                maxLength={200}
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
              />
              
              <Textarea
                label="With Error"
                placeholder="Description..."
                error="Description is too short"
                rows={4}
              />
            </div>
          </Card>

          {/* Cards Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Cards</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-2">Default Card</h3>
                <p className="text-slate-400">Basic card with default styling</p>
              </Card>
              
              <Card variant="glass">
                <h3 className="text-lg font-semibold text-white mb-2">Glass Card</h3>
                <p className="text-slate-400">Glassmorphism effect</p>
              </Card>
              
              <Card variant="bordered">
                <h3 className="text-lg font-semibold text-white mb-2">Bordered Card</h3>
                <p className="text-slate-400">Simple border style</p>
              </Card>
              
              <Card variant="elevated">
                <h3 className="text-lg font-semibold text-white mb-2">Elevated Card</h3>
                <p className="text-slate-400">With shadow elevation</p>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <Card hoverable clickable onClick={() => alert('Card clicked!')}>
                <h3 className="text-lg font-semibold text-white mb-2">Interactive Card</h3>
                <p className="text-slate-400">Hoverable and clickable</p>
              </Card>
              
              <Card variant="glass" padding="sm">
                <h3 className="text-lg font-semibold text-white mb-2">Small Padding</h3>
                <p className="text-slate-400">Compact content</p>
              </Card>
              
              <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold text-white mb-2">Large Padding</h3>
                <p className="text-slate-400">Spacious content</p>
              </Card>
            </div>
          </div>

          {/* Modal Section */}
          <Card>
            <h2 className="text-2xl font-bold text-white mb-6">Modal</h2>
            
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setModalOpen(true)}>
                Open Modal
              </Button>
            </div>
          </Card>
        </div>

        {/* Modal Demo */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example Modal"
          description="This is a demo of the new modal component"
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-slate-300">
              This modal demonstrates the new unified modal system with proper accessibility,
              focus management, and responsive design.
            </p>
            
            <Input
              label="Example Input"
              placeholder="Type something..."
              helperText="This input is inside the modal"
            />
            
            <Textarea
              label="Example Textarea"
              placeholder="Write your message..."
              rows={3}
            />
          </div>
        </Modal>
      </div>
    </ClientShell>
  )
} 