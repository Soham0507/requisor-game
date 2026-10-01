import { useEffect, useState } from 'react'
import {
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
  updateAdminQuestion,
  uploadAdminCategoryImage,
} from '../../lib/api'
import type { AdminCategoryDetail } from '../../types/game'
import CategoryCard from './CategoryCard'

const MAX_CATEGORIES = 5

interface CategoryManagerProps {
  adminId: number
}

export default function CategoryManager({ adminId }: CategoryManagerProps) {
  const [categories, setCategories] = useState<AdminCategoryDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  function refresh() {
    return fetchAdminCategories(adminId)
      .then(setCategories)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load categories.'))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId])

  async function handleCreate() {
    if (!newTitle.trim()) return
    setIsCreating(true)
    setCreateError(null)
    try {
      await createAdminCategory(adminId, newTitle.trim())
      setNewTitle('')
      await refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create category.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(categoryId: string) {
    await deleteAdminCategory(adminId, categoryId)
    await refresh()
  }

  return (
    <div className="dashed-outline flex flex-col gap-4 rounded-2xl border-2 border-brand-300 bg-white/50 p-5 shadow-sm dark:border-brand-700 dark:bg-brand-950/30">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-brand-950 dark:text-white">Manage Categories</h3>
        <span className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
          {categories ? `${categories.length}/${MAX_CATEGORIES}` : '—'}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-crimson-400 bg-crimson-50 px-4 py-3 text-crimson-700 dark:border-crimson-500/60 dark:bg-crimson-950/40 dark:text-crimson-200">
          {error}
        </div>
      )}

      {!error && categories === null && (
        <p className="text-sm text-brand-700 dark:text-brand-300">Loading categories...</p>
      )}

      {categories && (
        <div className="flex flex-col gap-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onSaveTitle={(title) => updateAdminCategory(adminId, category.id, { title }).then(refresh)}
              onSaveImageUrl={(imageUrl) =>
                updateAdminCategory(adminId, category.id, { image_url: imageUrl }).then(refresh)
              }
              onUploadImage={(file) => uploadAdminCategoryImage(adminId, category.id, file).then(refresh)}
              onDelete={() => handleDelete(category.id)}
              onSaveQuestion={(questionId, patch) =>
                updateAdminQuestion(adminId, category.id, questionId, patch).then(refresh)
              }
            />
          ))}
        </div>
      )}

      {categories && categories.length < MAX_CATEGORIES && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New category title"
            className="min-w-0 flex-1 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-950 outline-none focus:border-brand-500 dark:border-brand-700 dark:bg-brand-900/40 dark:text-white"
          />
          <button
            type="button"
            disabled={isCreating || !newTitle.trim()}
            onClick={() => void handleCreate()}
            className="rounded-full bg-brand-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? 'Adding...' : 'Add category'}
          </button>
        </div>
      )}
      {createError && <p className="text-xs font-semibold text-crimson-500 dark:text-crimson-400">{createError}</p>}
    </div>
  )
}
