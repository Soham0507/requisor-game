import { useEffect, useState } from 'react'
import { fetchAdminOverview, fetchAdminPlayers, fetchPlayerAnswers } from '../lib/api'
import { exportToExcel, exportToPdf } from '../lib/export'
import type { AdminOverview, PlayerAnswerDetail, PlayerSummary } from '../types/game'
import CategoryManager from './admin/CategoryManager'

function resultLabel(a: PlayerAnswerDetail): string {
  if (a.selected_option === null) return 'Unanswered'
  return a.is_correct ? 'Correct' : 'Incorrect'
}

function exportButtonClass(): string {
  return 'dashed-outline rounded-full border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-brand-500/60 dark:bg-brand-900/60 dark:text-brand-300'
}

interface AdminDashboardProps {
  adminId: number
  onBack: () => void
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value * 100)}%`
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="dashed-outline rounded-xl border border-brand-200 bg-white/70 px-5 py-4 text-left shadow-sm dark:border-brand-800/60 dark:bg-brand-950/40">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-brand-950 dark:text-white">{value}</p>
    </div>
  )
}

export default function AdminDashboard({ adminId, onBack }: AdminDashboardProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [players, setPlayers] = useState<PlayerSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(null)
  const [answers, setAnswers] = useState<PlayerAnswerDetail[] | null>(null)
  const [answersError, setAnswersError] = useState<string | null>(null)
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [filterResult, setFilterResult] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all')
  const [filterValue, setFilterValue] = useState('all')

  const VALUE_OPTIONS = [200, 400, 600, 800, 1000]

  function resultOf(a: PlayerAnswerDetail): 'correct' | 'incorrect' | 'unanswered' {
    if (a.selected_option === null) return 'unanswered'
    return a.is_correct ? 'correct' : 'incorrect'
  }

  // Result and Value are filtered client-side over whatever date range is
  // currently loaded — no need to round-trip to the server for those.
  const filteredAnswers =
    answers?.filter(
      (a) =>
        (filterResult === 'all' || resultOf(a) === filterResult) &&
        (filterValue === 'all' || a.prize_value === Number(filterValue)),
    ) ?? null

  const hasActiveFilter = filterStart || filterEnd || filterResult !== 'all' || filterValue !== 'all'

  useEffect(() => {
    Promise.all([fetchAdminOverview(adminId), fetchAdminPlayers(adminId)])
      .then(([overviewData, playersData]) => {
        setOverview(overviewData)
        setPlayers(playersData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load admin data.'))
  }, [adminId])

  // `datetime-local` inputs have no timezone of their own — the browser
  // treats the value as local time when constructing a Date from it, which
  // is exactly what we want to convert to a UTC instant for the API.
  function loadAnswers(playerId: number, start: string, end: string) {
    setAnswers(null)
    setAnswersError(null)
    fetchPlayerAnswers(adminId, playerId, {
      start: start ? new Date(start).toISOString() : undefined,
      end: end ? new Date(end).toISOString() : undefined,
    })
      .then(setAnswers)
      .catch((err) => setAnswersError(err instanceof Error ? err.message : 'Failed to load answers.'))
  }

  function handleSelectPlayer(player: PlayerSummary) {
    setSelectedPlayer(player)
    setFilterStart('')
    setFilterEnd('')
    setFilterResult('all')
    setFilterValue('all')
    loadAnswers(player.id, '', '')
  }

  function handleApplyFilter() {
    if (selectedPlayer) loadAnswers(selectedPlayer.id, filterStart, filterEnd)
  }

  function handleClearFilter() {
    setFilterStart('')
    setFilterEnd('')
    setFilterResult('all')
    setFilterValue('all')
    if (selectedPlayer) loadAnswers(selectedPlayer.id, '', '')
  }

  function handleExportPlayersExcel() {
    if (!players) return
    exportToExcel(
      'players',
      'Players',
      players.map((p) => ({
        Username: p.username,
        Role: p.role,
        Games: p.games_played,
        'Best balance': p.best_balance,
        'Avg balance': p.average_balance !== null ? Math.round(p.average_balance) : null,
        Answers: p.questions_answered,
        'Accuracy (%)': p.accuracy !== null ? Math.round(p.accuracy * 100) : null,
      })),
    )
  }

  function handleExportPlayersPdf() {
    if (!players) return
    exportToPdf(
      'players',
      'Players',
      ['Username', 'Role', 'Games', 'Best balance', 'Avg balance', 'Answers', 'Accuracy'],
      players.map((p) => [
        p.username,
        p.role,
        p.games_played,
        p.best_balance !== null ? `$${p.best_balance.toLocaleString()}` : '—',
        p.average_balance !== null ? `$${Math.round(p.average_balance).toLocaleString()}` : '—',
        p.questions_answered,
        formatPercent(p.accuracy),
      ]),
    )
  }

  function handleExportAnswersExcel() {
    if (!filteredAnswers || !selectedPlayer) return
    exportToExcel(
      `${selectedPlayer.username}-answers`,
      'Answers',
      filteredAnswers.map((a) => ({
        Category: a.category_title,
        Prompt: a.prompt,
        Selected: a.selected_option ?? '',
        'Correct answer': a.correct_answer,
        Result: resultLabel(a),
        Value: a.prize_value,
        'Time taken (s)': a.time_taken_seconds,
        When: new Date(a.answered_at).toLocaleString(),
      })),
    )
  }

  function handleExportAnswersPdf() {
    if (!filteredAnswers || !selectedPlayer) return
    exportToPdf(
      `${selectedPlayer.username}-answers`,
      `${selectedPlayer.username}'s answers`,
      ['Category', 'Prompt', 'Selected', 'Correct answer', 'Result', 'Value', 'Time taken', 'When'],
      filteredAnswers.map((a) => [
        a.category_title,
        a.prompt,
        a.selected_option ?? '— (no answer)',
        a.correct_answer,
        resultLabel(a),
        `$${a.prize_value}`,
        a.time_taken_seconds !== null ? `${a.time_taken_seconds}s` : '—',
        new Date(a.answered_at).toLocaleString(),
      ]),
    )
  }

  return (
    <div className="flex flex-col gap-8 text-left">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-brand-950 dark:text-white">Admin Dashboard</h2>
        <button
          onClick={onBack}
          className="dashed-outline rounded-full border border-brand-300 bg-brand-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-brand-500/60 dark:bg-brand-900/60 dark:text-brand-300"
        >
          Back to game
        </button>
      </div>

      {error && (
        <div className="dashed-outline rounded-lg border border-crimson-400 bg-crimson-50 px-4 py-3 text-crimson-700 dark:border-crimson-500/60 dark:bg-crimson-950/40 dark:text-crimson-200">
          {error}
        </div>
      )}

      <CategoryManager adminId={adminId} />

      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Players" value={overview.total_players} />
          <StatCard label="Games played" value={overview.total_games_played} />
          <StatCard label="Answers logged" value={overview.total_answers} />
          <StatCard label="Overall accuracy" value={formatPercent(overview.overall_accuracy)} />
        </div>
      )}

      {overview && overview.category_accuracy.length > 0 && (
        <div className="dashed-outline rounded-xl border border-brand-200 bg-white/70 p-5 shadow-sm dark:border-brand-800/60 dark:bg-brand-950/40">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
            Accuracy by category
          </p>
          <div className="flex flex-col gap-2">
            {overview.category_accuracy.map((cat) => (
              <div key={cat.category_title} className="flex items-center gap-3">
                <span className="w-48 shrink-0 truncate text-sm font-semibold text-brand-900 dark:text-brand-100">
                  {cat.category_title}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/60">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.round(cat.accuracy * 100)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-bold text-brand-700 dark:text-brand-300">
                  {formatPercent(cat.accuracy)} ({cat.correct_answers}/{cat.total_answers})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {players && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-brand-950 dark:text-white">Players</h3>
            <div className="flex gap-2">
              <button onClick={handleExportPlayersExcel} className={exportButtonClass()}>
                Export Excel
              </button>
              <button onClick={handleExportPlayersPdf} className={exportButtonClass()}>
                Export PDF
              </button>
            </div>
          </div>
          <div className="dashed-outline overflow-hidden rounded-xl border border-brand-200 bg-white/70 shadow-sm dark:border-brand-800/60 dark:bg-brand-950/40">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 text-xs font-bold uppercase tracking-wide text-brand-600 dark:border-brand-800/60 dark:text-brand-400">
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Games</th>
                <th className="px-4 py-3">Best balance</th>
                <th className="px-4 py-3">Avg balance</th>
                <th className="px-4 py-3">Answers</th>
                <th className="px-4 py-3">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => handleSelectPlayer(p)}
                  className={`cursor-pointer border-b border-brand-100 transition last:border-0 hover:bg-brand-50 dark:border-brand-900/60 dark:hover:bg-brand-900/40 ${
                    selectedPlayer?.id === p.id ? 'bg-brand-100/70 dark:bg-brand-900/60' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-brand-950 dark:text-white">{p.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`dashed-outline rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        p.role === 'admin'
                          ? 'bg-brand-600 text-white'
                          : 'bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300'
                      }`}
                    >
                      {p.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-800 dark:text-brand-200">{p.games_played}</td>
                  <td className="px-4 py-3 text-brand-800 dark:text-brand-200">
                    {p.best_balance !== null ? `$${p.best_balance.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-brand-800 dark:text-brand-200">
                    {p.average_balance !== null ? `$${Math.round(p.average_balance).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-brand-800 dark:text-brand-200">{p.questions_answered}</td>
                  <td className="px-4 py-3 text-brand-800 dark:text-brand-200">{formatPercent(p.accuracy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        </div>
      )}

      {selectedPlayer && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-brand-950 dark:text-white">
              {selectedPlayer.username}&apos;s answers
            </h3>
            {filteredAnswers && filteredAnswers.length > 0 && (
              <div className="flex gap-2">
                <button onClick={handleExportAnswersExcel} className={exportButtonClass()}>
                  Export Excel
                </button>
                <button onClick={handleExportAnswersPdf} className={exportButtonClass()}>
                  Export PDF
                </button>
              </div>
            )}
          </div>

          <div className="dashed-outline flex flex-wrap items-end gap-3 rounded-xl border border-brand-200 bg-white/70 p-4 shadow-sm dark:border-brand-800/60 dark:bg-brand-950/40">
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              From
              <input
                type="datetime-local"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm font-medium normal-case text-brand-900 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              To
              <input
                type="datetime-local"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm font-medium normal-case text-brand-900 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Result
              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value as typeof filterResult)}
                className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm font-medium normal-case text-brand-900 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-100"
              >
                <option value="all">All</option>
                <option value="correct">Correct</option>
                <option value="incorrect">Incorrect</option>
                <option value="unanswered">Unanswered</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Value
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm font-medium normal-case text-brand-900 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-100"
              >
                <option value="all">All</option>
                {VALUE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    ${v}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={handleApplyFilter}
              className="dashed-outline rounded-full border border-brand-300 bg-brand-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-brand-500/60"
            >
              Apply filter
            </button>
            {hasActiveFilter && (
              <button
                onClick={handleClearFilter}
                className="dashed-outline rounded-full border border-brand-300 bg-brand-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-brand-500/60 dark:bg-brand-900/60 dark:text-brand-300"
              >
                Clear
              </button>
            )}
          </div>

          {answersError && (
            <div className="dashed-outline rounded-lg border border-crimson-400 bg-crimson-50 px-4 py-3 text-crimson-700 dark:border-crimson-500/60 dark:bg-crimson-950/40 dark:text-crimson-200">
              {answersError}
            </div>
          )}

          {!answersError && answers === null && (
            <p className="text-sm text-brand-700 dark:text-brand-300">Loading answers...</p>
          )}

          {filteredAnswers && filteredAnswers.length === 0 && (
            <p className="text-sm text-brand-700 dark:text-brand-300">
              {answers && answers.length > 0
                ? 'No answers match the current filters.'
                : "This player hasn't answered anything yet."}
            </p>
          )}

          {filteredAnswers && filteredAnswers.length > 0 && (
            <div className="dashed-outline overflow-hidden rounded-xl border border-brand-200 bg-white/70 shadow-sm dark:border-brand-800/60 dark:bg-brand-950/40">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-200 text-xs font-bold uppercase tracking-wide text-brand-600 dark:border-brand-800/60 dark:text-brand-400">
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Prompt</th>
                    <th className="px-4 py-3">Selected</th>
                    <th className="px-4 py-3">Correct answer</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Time taken</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnswers.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-brand-100 last:border-0 dark:border-brand-900/60"
                    >
                      <td className="px-4 py-3 text-brand-800 dark:text-brand-200">{a.category_title}</td>
                      <td className="max-w-xs px-4 py-3 text-brand-800 dark:text-brand-200">{a.prompt}</td>
                      <td className="px-4 py-3 text-brand-800 dark:text-brand-200">{a.selected_option ?? '— (no answer)'}</td>
                      <td className="px-4 py-3 text-brand-800 dark:text-brand-200">{a.correct_answer}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                            a.selected_option === null
                              ? 'bg-slate-200 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300'
                              : a.is_correct
                                ? 'bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-crimson-200 text-crimson-700 dark:bg-crimson-900/40 dark:text-crimson-300'
                          }`}
                        >
                          {a.selected_option === null ? 'Unanswered' : a.is_correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-800 dark:text-brand-200">${a.prize_value}</td>
                      <td className="px-4 py-3 text-brand-800 dark:text-brand-200">
                        {a.time_taken_seconds !== null ? `${a.time_taken_seconds}s` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-600 dark:text-brand-400">
                        {new Date(a.answered_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
