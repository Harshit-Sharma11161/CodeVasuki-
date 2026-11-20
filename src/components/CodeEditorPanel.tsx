import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Maximize2, Minimize2, Play, RotateCcw, Send, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { LANGUAGES, type LanguageId } from '@/lib/constants'
import { starterCodeFor, draftKey } from '@/lib/starterCode'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

export type EditorPanelProps = {
  problemId: string
  battleId?: string | null
  starterCodeJson: string | null
  language: LanguageId
  onLanguageChange: (l: LanguageId) => void
  code: string
  onCodeChange: (c: string) => void
  onRun: () => void
  onSubmit: () => void
  running: boolean
  submitting: boolean
  disabled?: boolean
}

export default function CodeEditorPanel({
  problemId,
  battleId,
  starterCodeJson,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onRun,
  onSubmit,
  running,
  submitting,
  disabled = false,
}: EditorPanelProps) {
  const { theme } = useTheme()
  const [fullscreen, setFullscreen] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const monacoLanguage = useMemo(
    () => LANGUAGES.find((l) => l.id === language)?.monaco ?? 'plaintext',
    [language],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const handleReset = () => {
    const fresh = starterCodeFor(starterCodeJson, language)
    onCodeChange(fresh)
    window.localStorage.removeItem(draftKey(problemId, language, battleId))
  }

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card',
        fullscreen && 'fixed inset-0 z-50 rounded-none',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as LanguageId)}
          className="h-8 w-auto min-w-[8.5rem] text-xs"
          aria-label="Language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </Select>

        <div className="flex items-center gap-1 rounded-lg border border-border px-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setFontSize((s) => Math.max(11, s - 1))}
            aria-label="Decrease font size"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-6 text-center font-mono text-xs text-muted-foreground">{fontSize}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setFontSize((s) => Math.min(22, s + 1))}
            aria-label="Increase font size"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={handleReset} disabled={disabled}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFullscreen((v) => !v)}
            aria-label="Toggle fullscreen"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={onRun} loading={running} disabled={disabled || submitting}>
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          <Button size="sm" onClick={onSubmit} loading={submitting} disabled={disabled || running}>
            <Send className="h-3.5 w-3.5" />
            Submit
          </Button>
        </div>
      </div>

      <div className={cn('min-h-0 flex-1', fullscreen ? 'h-[calc(100vh-3rem)]' : 'h-[420px]')}>
        <Editor
          height="100%"
          language={monacoLanguage}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={code}
          onChange={(v) => onCodeChange(v ?? '')}
          onMount={(ed) => {
            editorRef.current = ed
          }}
          options={{
            fontSize,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            autoIndent: 'full',
            wordWrap: 'on',
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 },
            readOnly: disabled,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            renderLineHighlight: 'line',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}
          loading={
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading editor…
            </div>
          }
        />
      </div>
    </div>
  )
}