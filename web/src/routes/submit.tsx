import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { API_URL } from '../constants'
import { useState } from 'react'

export const Route = createFileRoute('/submit')({
  component: SubmitPage,
})

const submissionSchema = z.object({
  githubUrl: z
    .string()
    .url('Please enter a valid URL')
    .includes('github.com', { message: 'Must be a GitHub URL' }),
  submitterName: z.string().optional(),
  submitterEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
})

type SubmissionForm = z.infer<typeof submissionSchema>
type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'no-skills'

interface SkillFolder {
  name: string
  path: string
}

function SubmitPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle')
  const [skillFolders, setSkillFolders] = useState<SkillFolder[]>([])
  const [validationMessage, setValidationMessage] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
  } = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      githubUrl: '',
      submitterName: '',
      submitterEmail: '',
    },
  })

  const githubUrl = watch('githubUrl')

  const validateGitHubRepo = async (url: string) => {
    if (!url || !url.includes('github.com')) {
      setValidationStatus('idle')
      return
    }

    setValidationStatus('validating')
    setSkillFolders([])
    setValidationMessage('')

    try {
      const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+\/(.+))?/
      const match = url.match(urlPattern)
      if (!match) {
        setValidationStatus('invalid')
        setValidationMessage('Invalid GitHub URL format')
        return
      }

      const [, owner, repo, path] = match
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path || ''}`
      const response = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github.v3+json' } })

      if (!response.ok) {
        setValidationStatus('invalid')
        setValidationMessage('Repository or path not found')
        return
      }

      const contents = await response.json()
      if (!Array.isArray(contents)) {
        setValidationStatus('invalid')
        setValidationMessage('URL must point to a directory, not a file')
        return
      }

      const foundSkills: SkillFolder[] = []
      for (const item of contents) {
        if (item.type === 'dir') {
          const dirResponse = await fetch(item.url, { headers: { Accept: 'application/vnd.github.v3+json' } })
          if (dirResponse.ok) {
            const dirContents = await dirResponse.json()
            if (dirContents.some((file: any) => file.name.toLowerCase() === 'skill.md')) {
              foundSkills.push({ name: item.name, path: item.path })
            }
          }
        }
      }

      if (contents.some((item: any) => item.name.toLowerCase() === 'skill.md')) {
        foundSkills.unshift({ name: 'Current directory', path: path || 'root' })
      }

      if (foundSkills.length > 0) {
        setValidationStatus('valid')
        setSkillFolders(foundSkills)
        setValidationMessage(`Found ${foundSkills.length} skill${foundSkills.length > 1 ? 's' : ''}`)
      } else {
        setValidationStatus('no-skills')
        setValidationMessage('No skill.md files found in this directory')
      }
    } catch (error) {
      setValidationStatus('invalid')
      setValidationMessage('Error validating repository')
    }
  }

  const handleUrlBlur = () => {
    if (githubUrl && githubUrl.includes('github.com')) {
      validateGitHubRepo(githubUrl)
    }
  }

  const onSubmit = async (data: SubmissionForm) => {
    if (validationStatus === 'no-skills' || validationStatus === 'invalid') {
      toast.error('Invalid repository')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to submit skill')
      toast.success('Skill submitted successfully!')
      reset()
      setValidationStatus('idle')
      setSkillFolders([])
      setValidationMessage('')
    } catch (error) {
      toast.error('Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8 text-white text-center">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-extrabold uppercase mb-10">Submit a Skill</h1>
        <div className="bg-zinc-900 border border-white/5 p-8 rounded-2xl space-y-6">
          <input
            type="url"
            placeholder="GitHub Repository URL"
            className="w-full px-4 py-3 bg-black border border-white/5 rounded-xl text-white"
            {...register('githubUrl')}
            onBlur={handleUrlBlur}
          />
          {validationStatus === 'validating' && <p className="text-blue-400">Validating...</p>}
          {validationStatus === 'valid' && (
            <div className="space-y-1">
              <p className="text-green-400">{validationMessage}</p>
              {skillFolders.map((s, idx) => (
                <p key={idx} className="text-[10px] text-gray-500">{s.name}</p>
              ))}
            </div>
          )}
          {validationStatus === 'invalid' && <p className="text-red-400">{validationMessage}</p>}
          {validationStatus === 'no-skills' && <p className="text-yellow-400">{validationMessage}</p>}

          <input
            type="text"
            placeholder="Your Name (Optional)"
            className="w-full px-4 py-3 bg-black border border-white/5 rounded-xl text-white"
            {...register('submitterName')}
          />
          <input
            type="email"
            placeholder="Email Address (Optional)"
            className="w-full px-4 py-3 bg-black border border-white/5 rounded-xl text-white"
            {...register('submitterEmail')}
          />
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="w-full py-3 bg-white text-black font-bold rounded-xl uppercase tracking-widest disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Skill'}
          </button>
        </div>
      </div>
    </div>
  )
}