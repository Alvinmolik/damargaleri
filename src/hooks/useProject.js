import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useProject(slug) {
  const [project, setProject]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!slug) return
    fetchProject()
  }, [slug])

  async function fetchProject() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        packages(*),
        checklist_phases(*, checklist_tasks(*)),
        budget_categories(*),
        invoices(*),
        vendors(*),
        documents(*),
        profiles!assigned_admin(full_name, wa_number)
      `)
      .eq('slug', slug)
      .single()

    if (error) setError(error)
    else setProject(data)
    setLoading(false)
  }

  // ── Checklist ──────────────────────────────────────────
  async function toggleTask(taskId, done) {
    const { error } = await supabase
      .from('checklist_tasks')
      .update({ done })
      .eq('id', taskId)
    if (!error) fetchProject()
  }

  async function addTask(phaseId, task) {
    const { error } = await supabase
      .from('checklist_tasks')
      .insert({
        phase_id: phaseId,
        project_id: project.id,
        text: task.text,
        pic: task.pic || 'Pasangan',
        location: task.loc || '—',
        due_date: task.due_date || null,
      })
    if (!error) fetchProject()
    return { error }
  }

  // ── Budget ─────────────────────────────────────────────
  async function updateBudgetCategory(id, data) {
    const { error } = await supabase
      .from('budget_categories')
      .update(data)
      .eq('id', id)
    if (!error) fetchProject()
    return { error }
  }

  async function addBudgetCategory(name) {
    if (!project?.id) return { error: new Error('No project') }
    const { error } = await supabase
      .from('budget_categories')
      .insert({ project_id: project.id, name, icon: '💸', allocated: 0, spent: 0 })
    if (!error) fetchProject()
    return { error }
  }

  // ── Invoice ────────────────────────────────────────────
  async function addInvoice(inv) {
    const { error } = await supabase
      .from('invoices')
      .insert({ ...inv, project_id: project.id })
    if (!error) fetchProject()
    return { error }
  }

  // ── Document ───────────────────────────────────────────
  async function addDocument(doc) {
    const { error } = await supabase
      .from('documents')
      .insert({ ...doc, project_id: project.id })
    if (!error) fetchProject()
    return { error }
  }

  // ── Cover image ────────────────────────────────────────
  async function updateCoverImage(file) {
    const ext = file.name.split('.').pop()
    const path = `covers/${project.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('project-assets')
      .upload(path, file, { upsert: true })
    if (uploadError) return { error: uploadError }

    const { data: { publicUrl } } = supabase.storage
      .from('project-assets')
      .getPublicUrl(path)

    // Add cache-busting to force refresh
    const urlWithCache = `${publicUrl}?t=${Date.now()}`

    const { error } = await supabase
      .from('projects')
      .update({ cover_image_url: urlWithCache })
      .eq('id', project.id)

    if (!error) fetchProject()
    return { error }
  }

  // ── Delete functions ───────────────────────────────────
  async function deleteTask(taskId) {
    const { error } = await supabase
      .from('checklist_tasks')
      .delete()
      .eq('id', taskId)
    if (!error) fetchProject()
    return { error }
  }

  async function deleteBudgetCategory(id) {
    const { error } = await supabase
      .from('budget_categories')
      .delete()
      .eq('id', id)
    if (!error) fetchProject()
    return { error }
  }

  async function deleteInvoice(id) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
    if (!error) fetchProject()
    return { error }
  }

  async function deleteDocument(id) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
    if (!error) fetchProject()
    return { error }
  }

  async function deleteVendor(id) {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)
    if (!error) fetchProject()
    return { error }
  }

  async function addVendor(vendor) {
    const { error } = await supabase
      .from('vendors')
      .insert({ ...vendor, project_id: project.id })
    if (!error) fetchProject()
    return { error }
  }

  return {
    project, loading, error, refetch: fetchProject,
    toggleTask, addTask, deleteTask,
    updateBudgetCategory, addBudgetCategory, deleteBudgetCategory,
    addInvoice, deleteInvoice,
    addDocument, deleteDocument,
    addVendor, deleteVendor,
    updateCoverImage,
  }
}
