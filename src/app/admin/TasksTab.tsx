"use client";
import React, { useState, useEffect, useCallback } from "react";
import { 
  CheckCircle2, Circle, Clock, Plus, Trash2, 
  AlertCircle, User, Calendar, Loader2, X, Save,
  Filter, ChevronDown
} from "lucide-react";

interface Todo {
  id: string;
  task: string;
  description: string;
  assigned_to: string;
  due_date: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  is_private: boolean;
  created_by: string;
  created_at: string;
}

export default function TasksTab({ currentUserName, currentUserEmail }: { currentUserName?: string; currentUserEmail?: string }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    task: "",
    description: "",
    assigned_to: currentUserName || "Staff",
    due_date: "",
    priority: "medium" as Todo["priority"],
    is_private: false,
  });

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();
      if (Array.isArray(data.todos)) setTodos(data.todos);
    } catch (err) {
      console.error("Failed to fetch todos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAdd = async () => {
    if (!form.task.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          created_by: currentUserName || "Staff",
        }),
      });
      if (res.ok) {
        setForm({ ...form, task: "", description: "", due_date: "" });
        setShowAdd(false);
        fetchTodos();
      }
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: Todo["status"]) => {
    try {
      await fetch(`/api/todos?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setTodos(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await fetch(`/api/todos?id=${id}`, { method: "DELETE" });
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to delete todo:", err);
    }
  };

  const filtered = todos.filter(t => {
    if (filter === "mine") return t.assigned_to === currentUserName || t.assigned_to === currentUserEmail;
    if (t.is_private) return t.assigned_to === currentUserName || t.assigned_to === currentUserEmail;
    return true;
  });

  const todoList = filtered.filter(t => t.status === "todo");
  const inProgressList = filtered.filter(t => t.status === "in_progress");
  const doneList = filtered.filter(t => t.status === "done");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <CheckCircle2 size={20} className="text-[#4ADE80]" /> Activity Board
          </h2>
          <p className="text-xs text-gray-500 mt-1">Track tasks, deadlines, and team assignments</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[rgba(255,255,255,0.04)] p-1 rounded-xl border border-[rgba(255,255,255,0.08)]">
            <button 
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === "all" ? "bg-white/15 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
            >
              All Tasks
            </button>
            <button 
              onClick={() => setFilter("mine")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === "mine" ? "bg-white/15 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
            >
              My Tasks
            </button>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:opacity-90 shadow-[0_0_14px_rgba(59,130,246,0.35)] transition-all"
          >
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="glass rounded-2xl border border-white/15 p-5 shadow-[0_0_24px_rgba(56,189,248,0.08)] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Create New Task</h3>
            <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Task Name *</label>
              <input 
                value={form.task}
                onChange={e => setForm({...form, task: e.target.value})}
                placeholder="e.g. Follow up on lease"
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Assigned To</label>
              <input 
                value={form.assigned_to}
                onChange={e => setForm({...form, assigned_to: e.target.value})}
                placeholder="Name or Email"
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Due Date</label>
              <input 
                type="date"
                value={form.due_date}
                onChange={e => setForm({...form, due_date: e.target.value})}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Priority</label>
              <select 
                value={form.priority}
                onChange={e => setForm({...form, priority: e.target.value as Todo["priority"]})}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] outline-none"
              >
                <option value="low" className="bg-[#0A0F1A]">Low</option>
                <option value="medium" className="bg-[#0A0F1A]">Medium</option>
                <option value="high" className="bg-[#0A0F1A]">High Priority</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={form.is_private}
                  onChange={e => setForm({...form, is_private: e.target.checked})}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${form.is_private ? "bg-blue-500 border-blue-500" : "border-[rgba(255,255,255,0.2)] group-hover:border-blue-400"}`}>
                  {form.is_private && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Private (only I can see)</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs font-bold hover:text-white transition-all">Cancel</button>
            <button 
              onClick={handleAdd}
              disabled={saving || !form.task.trim()}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:opacity-90 shadow-[0_0_14px_rgba(59,130,246,0.35)] transition-all disabled:opacity-40"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Task
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <Loader2 size={32} className="animate-spin mb-4" />
          <p>Loading your activity board...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TODO COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Circle size={10} className="text-gray-600" /> To Do ({todoList.length})
              </h3>
            </div>
            <div className="space-y-3">
              {todoList.map(t => <TaskCard key={t.id} todo={t} onStatusChange={updateStatus} onDelete={deleteTodo} />)}
              {todoList.length === 0 && <div className="p-8 border border-dashed border-[rgba(255,255,255,0.05)] rounded-2xl text-center text-xs text-gray-700 italic">No pending tasks</div>}
            </div>
          </div>

          {/* IN PROGRESS COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
                <Clock size={10} /> In Progress ({inProgressList.length})
              </h3>
            </div>
            <div className="space-y-3">
              {inProgressList.map(t => <TaskCard key={t.id} todo={t} onStatusChange={updateStatus} onDelete={deleteTodo} />)}
              {inProgressList.length === 0 && <div className="p-8 border border-dashed border-[rgba(255,255,255,0.05)] rounded-2xl text-center text-xs text-gray-700 italic">No active tasks</div>}
            </div>
          </div>

          {/* DONE COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-[#4ADE80] uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={10} /> Completed ({doneList.length})
              </h3>
            </div>
            <div className="space-y-3">
              {doneList.map(t => <TaskCard key={t.id} todo={t} onStatusChange={updateStatus} onDelete={deleteTodo} />)}
              {doneList.length === 0 && <div className="p-8 border border-dashed border-[rgba(255,255,255,0.05)] rounded-2xl text-center text-xs text-gray-700 italic">Nothing completed yet</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ todo, onStatusChange, onDelete }: { todo: Todo, onStatusChange: (id: string, s: Todo["status"]) => void, onDelete: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const priorityColor = todo.priority === "high" ? "#EF4444" : todo.priority === "medium" ? "#FACC15" : "#94A3B8";

  return (
    <div className={`glass rounded-2xl border p-4 transition-all hover:border-[rgba(255,255,255,0.15)] group ${todo.status === 'done' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold text-white leading-snug ${todo.status === 'done' ? 'line-through decoration-gray-600' : ''}`}>
            {todo.task}
          </h4>
          {todo.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{todo.description}</p>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDelete ? (
            <button onClick={() => onDelete(todo.id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg"><CheckCircle2 size={12} /></button>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1 text-gray-600 hover:text-red-400 rounded-lg"><Trash2 size={12} /></button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <User size={10} /> {todo.assigned_to}
        </div>
        {todo.due_date && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <Calendar size={10} /> {new Date(todo.due_date).toLocaleDateString()}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter ml-auto" style={{ color: priorityColor }}>
          <AlertCircle size={10} /> {todo.priority}
        </div>
      </div>

      <div className="mt-4 flex gap-1.5">
        {todo.status !== 'todo' && (
          <button 
            onClick={() => onStatusChange(todo.id, 'todo')}
            className="flex-1 py-1.5 rounded-lg border border-[rgba(255,255,255,0.06)] text-[9px] font-bold text-gray-500 hover:text-white transition-colors"
          >
            Reset
          </button>
        )}
        {todo.status !== 'in_progress' && todo.status !== 'done' && (
          <button 
            onClick={() => onStatusChange(todo.id, 'in_progress')}
            className="flex-[2] py-1.5 rounded-lg bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.2)] text-[#FACC15] text-[9px] font-bold hover:bg-[rgba(250,204,21,0.2)] transition-colors"
          >
            Start
          </button>
        )}
        {todo.status !== 'done' && (
          <button 
            onClick={() => onStatusChange(todo.id, 'done')}
            className="flex-[2] py-1.5 rounded-lg bg-white/[0.04] border border-white/15 text-[#4ADE80] text-[9px] font-bold hover:border-white/30 hover:shadow-[0_0_10px_rgba(56,189,248,0.15)] transition-all"
          >
            Complete
          </button>
        )}
      </div>
    </div>
  );
}
