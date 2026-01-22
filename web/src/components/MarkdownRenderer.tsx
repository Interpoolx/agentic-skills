import { useMemo } from 'react'

interface MarkdownRendererProps {
    content: string
    className?: string
}

/**
 * Simple markdown renderer that converts common markdown syntax to HTML
 * without requiring external dependencies like react-markdown
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    const html = useMemo(() => {
        if (!content) return ''

        let result = content

        // Escape HTML entities first
        result = result.replace(/&/g, '&amp;')
        result = result.replace(/</g, '&lt;')
        result = result.replace(/>/g, '&gt;')

        // Code blocks (```code```) - must be before inline code
        result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            return `<pre class="bg-[#0a0a0a] text-gray-300 p-6 rounded-xl overflow-x-auto text-[13px] my-6 border border-white/5 font-mono"><code class="language-${lang}">${code.trim()}</code></pre>`
        })

        // Inline code (`code`)
        result = result.replace(/`([^`]+)`/g, '<code class="bg-white/5 text-gray-300 px-1.5 py-0.5 rounded text-[13px] font-mono border border-white/5">$1</code>')

        // Headers (# ## ### etc.)
        result = result.replace(/^######\s+(.+)$/gm, '<h6 class="text-xs font-bold text-gray-500 mt-6 mb-2 tracking-widest font-mono">$1</h6>')
        result = result.replace(/^#####\s+(.+)$/gm, '<h5 class="text-sm font-bold text-gray-500 mt-6 mb-2 tracking-widest font-mono">$1</h5>')
        result = result.replace(/^####\s+(.+)$/gm, '<h4 class="text-base font-bold text-white mt-8 mb-3">$1</h4>')
        result = result.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-bold text-white mt-10 mb-4">$1</h3>')
        result = result.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-bold text-white mt-12 mb-6 pb-2 border-b border-white/5">$1</h2>')
        result = result.replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-12 mb-8">$1</h1>')

        // Bold and italic
        result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-200">$1</strong>')
        result = result.replace(/\*(.+?)\*/g, '<em class="italic text-gray-400">$1</em>')
        result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        result = result.replace(/__(.+?)__/g, '<strong class="font-bold text-gray-200">$1</strong>')
        result = result.replace(/_(.+?)_/g, '<em class="italic text-gray-400">$1</em>')

        // Links [text](url)
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>')

        // Horizontal rules
        result = result.replace(/^---+$/gm, '<hr class="my-10 border-white/5" />')
        result = result.replace(/^\*\*\*+$/gm, '<hr class="my-10 border-white/5" />')

        // Blockquotes
        result = result.replace(/^>\s+(.+)$/gm, '<blockquote class="border-l-2 border-gray-700 pl-6 py-4 my-8 bg-white/[0.02] text-gray-400 italic rounded-r-xl">$1</blockquote>')

        // Unordered lists (- or *)
        result = result.replace(/^[\-\*]\s+(.+)$/gm, '<li class="ml-6 list-disc text-gray-400 leading-relaxed">$1</li>')

        // Ordered lists (1. 2. etc.) - use different class to distinguish
        result = result.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-6 ordered-item text-gray-400 leading-relaxed">$1</li>')

        // Wrap consecutive <li> elements in <ul> or <ol>
        result = result.replace(/(<li class="ml-6 list-disc[^>]*>.*?<\/li>\n?)+/g, (match) => {
            return `<ul class="my-6 space-y-2 list-disc pl-6">${match}</ul>`
        })
        result = result.replace(/(<li class="ml-6 ordered-item[^>]*>.*?<\/li>\n?)+/g, (olMatch) => {
            return `<ol class="my-6 space-y-2 list-decimal pl-6">${olMatch}</ol>`
        })

        // Tables (basic support)
        result = result.replace(/^\|(.+)\|$/gm, (_tableRow, content) => {
            const cells = content.split('|').map((cell: string) => cell.trim())
            const isHeader = cells.some((cell: string) => cell.match(/^-+$/))
            if (isHeader) return '' // Skip separator row
            const cellTag = 'td'
            const cellsHtml = cells.map((cell: string) => `<${cellTag} class="border border-white/5 px-6 py-3 text-gray-400 text-[13px]">${cell}</${cellTag}>`).join('')
            return `<tr>${cellsHtml}</tr>`
        })

        // Wrap tables
        result = result.replace(/(<tr>.*?<\/tr>\n?)+/g, (tableMatch) => {
            return `<div class="overflow-x-auto my-8 rounded-xl border border-white/5 bg-[#0a0a0a]"><table class="w-full border-collapse">${tableMatch}</table></div>`
        })

        // Paragraphs - wrap standalone lines
        const lines = result.split('\n')
        const processedLines = lines.map(line => {
            const trimmed = line.trim()
            // Skip if already wrapped in HTML tags or empty
            if (!trimmed || trimmed.startsWith('<') || trimmed.startsWith('|')) {
                return line
            }
            return `<p class="text-gray-400 leading-relaxed mb-6 text-[15px] font-medium">${trimmed}</p>`
        })
        result = processedLines.join('\n')

        // Clean up empty paragraphs
        result = result.replace(/<p class="[^"]*"><\/p>/g, '')
        result = result.replace(/<p class="[^"]*">\s*<\/p>/g, '')

        return result
    }, [content])

    return (
        <div
            className={`markdown-content selection:bg-white/10 ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}
