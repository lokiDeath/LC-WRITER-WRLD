'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  X, Feather, BookOpen, Calendar, PenLine, Link as LinkIcon,
  Flag, Ban, MessageSquare, Pencil, Check, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type WritingStatus = 'Writing' | 'Editing' | 'Planning'

type WriterProfile = {
  username: string
  displayName: string
  bio: string
  avatar?: string
  joinDate: string
  currentProject?: string
  favoriteGenre: string
  writingStatus: WritingStatus
  publicProjects: { title: string; tagline: string }[]
  socialLinks: { label: string; url: string }[]
}

export type { WriterProfile }

type ProfileModalProps = {
  profile: WriterProfile
  isOwner: boolean
  onClose: () => void
  onMessage?: () => void
}

export function ProfileModal({ profile, isOwner, onClose, onMessage }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<WriterProfile>(profile)
  const [showReportConfirm, setShowReportConfirm] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)

  function handleSave() {
    toast.success('Profile updated.')
    setIsEditing(false)
  }

  function handleReport() {
    toast.success('Report submitted. Our moderators will review it.')
    setShowReportConfirm(false)
  }

  function handleBlock() {
    setIsBlocked(true)
    toast.success(`${profile.displayName} has been blocked.`)
  }

  function handleUnblock() {
    setIsBlocked(false)
    toast.success(`${profile.displayName} has been unblocked.`)
  }

  const statusColors: Record<WritingStatus, string> = {
    Writing: 'text-green-400/80 border-green-400/20 bg-green-400/5',
    Editing: 'text-amber-400/80 border-amber-400/20 bg-amber-400/5',
    Planning: 'text-blue-400/80 border-blue-400/20 bg-blue-400/5',
  }

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#14110f] border border-[rgba(201,169,110,0.12)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto lc-scroll mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header banner */}
        <div className="h-20 bg-gradient-to-b from-[#1a1612] to-[#14110f] relative">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-[#8a7c6b] hover:text-[#f8f5f2] hover:bg-[#0a0908] rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
          {isOwner && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#0a0908]/80 text-[#8a7c6b] hover:text-[#c9a96e] text-[10px] font-mono uppercase tracking-wider rounded-lg transition border border-[rgba(201,169,110,0.1)]">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
          {isEditing && (
            <button onClick={handleSave} className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#c9a96e] text-[#0a0908] text-[10px] font-mono uppercase tracking-wider rounded-lg transition">
              <Check className="w-3 h-3" /> Save
            </button>
          )}
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + name + username */}
          <div className="flex items-end gap-3 -mt-10 mb-4">
            <div className="w-16 h-16 rounded-full bg-[#3e2723] border-2 border-[#14110f] flex items-center justify-center shrink-0">
              {editData.avatar ? (
                <img src={editData.avatar} alt={editData.displayName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-2xl text-[#c9a96e] font-serif">{editData.displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editData.displayName}
                  onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                  className="bg-[#0a0908] border border-[rgba(201,169,110,0.15)] px-2 py-1 text-lg font-serif text-[#f8f5f2] rounded focus:outline-none focus:border-[rgba(201,169,110,0.3)] w-full"
                />
              ) : (
                <h2 className="text-lg font-serif text-[#f8f5f2] tracking-wide">{profile.displayName}</h2>
              )}
              <p className="text-xs text-[#8a7c6b]">@{profile.username}</p>
            </div>
          </div>

          {/* Writing status badge */}
          <div className="mb-4">
            {isEditing ? (
              <select
                value={editData.writingStatus}
                onChange={(e) => setEditData({ ...editData, writingStatus: e.target.value as WritingStatus })}
                className="bg-[#0a0908] border border-[rgba(201,169,110,0.15)] px-2 py-1 text-[11px] text-[#f8f5f2] rounded focus:outline-none"
              >
                <option>Writing</option>
                <option>Editing</option>
                <option>Planning</option>
              </select>
            ) : (
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded border', statusColors[profile.writingStatus])}>
                <PenLine className="w-3 h-3" /> Status: {profile.writingStatus}
              </span>
            )}
          </div>

          {/* Bio */}
          <div className="mb-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#5d4037] mb-1">Bio</p>
            {isEditing ? (
              <textarea
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                rows={3}
                className="w-full bg-[#0a0908] border border-[rgba(201,169,110,0.15)] px-3 py-2 text-sm text-[#c4b9a8] rounded focus:outline-none focus:border-[rgba(201,169,110,0.3)] resize-none"
              />
            ) : (
              <p className="text-sm text-[#c4b9a8] leading-relaxed italic">{profile.bio}</p>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Join date */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#5d4037] mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined</p>
              <p className="text-xs text-[#8a7c6b]">{profile.joinDate}</p>
            </div>
            {/* Favorite genre */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#5d4037] mb-1 flex items-center gap-1"><Feather className="w-3 h-3" /> Genre</p>
              {isEditing ? (
                <input type="text" value={editData.favoriteGenre} onChange={(e) => setEditData({ ...editData, favoriteGenre: e.target.value })} className="bg-[#0a0908] border border-[rgba(201,169,110,0.15)] px-2 py-1 text-xs text-[#f8f5f2] rounded focus:outline-none w-full" />
              ) : (
                <p className="text-xs text-[#8a7c6b]">{profile.favoriteGenre}</p>
              )}
            </div>
            {/* Current project */}
            <div className="col-span-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#5d4037] mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Current Project</p>
              {isEditing ? (
                <input type="text" value={editData.currentProject || ''} onChange={(e) => setEditData({ ...editData, currentProject: e.target.value })} placeholder="No current project listed" className="bg-[#0a0908] border border-[rgba(201,169,110,0.15)] px-2 py-1 text-xs text-[#f8f5f2] rounded focus:outline-none w-full" />
              ) : (
                <p className="text-xs text-[#8a7c6b]">{profile.currentProject || <span className="italic text-[#5d4037]">No current project listed</span>}</p>
              )}
            </div>
          </div>

          {/* Public projects */}
          <div className="mb-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#5d4037] mb-2">Public Projects</p>
            {profile.publicProjects.length > 0 ? (
              <div className="space-y-1.5">
                {profile.publicProjects.map((proj, i) => (
                  <div key={i} className="bg-[#0a0908] border border-[rgba(201,169,110,0.08)] rounded-lg px-3 py-2">
                    <p className="text-sm text-[#f8f5f2] font-medium">{proj.title}</p>
                    <p className="text-[11px] text-[#8a7c6b] italic">{proj.tagline}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#5d4037] italic">No public projects yet</p>
            )}
          </div>

          {/* Social links */}
          {profile.socialLinks.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#5d4037] mb-2">Links</p>
              <div className="space-y-1">
                {profile.socialLinks.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#8a7c6b] hover:text-[#c9a96e] transition">
                    <LinkIcon className="w-3 h-3" /> {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Safety & interaction controls */}
          {!isOwner && (
            <div className="pt-4 border-t border-[rgba(201,169,110,0.08)]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onMessage?.()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a96e] text-[#0a0908] text-[11px] font-medium uppercase tracking-wider rounded-lg hover:bg-[#d4b87a] transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Message
                </button>
                <button
                  onClick={() => setShowReportConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[rgba(201,169,110,0.12)] text-[#8a7c6b] text-[11px] font-medium uppercase tracking-wider rounded-lg hover:text-[#c9a96e] hover:border-[rgba(201,169,110,0.25)] transition"
                >
                  <Flag className="w-3.5 h-3.5" /> Report
                </button>
                <button
                  onClick={isBlocked ? handleUnblock : handleBlock}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 border text-[11px] font-medium uppercase tracking-wider rounded-lg transition',
                    isBlocked
                      ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                      : 'border-[rgba(201,169,110,0.12)] text-[#8a7c6b] hover:text-red-400 hover:border-red-500/20'
                  )}
                >
                  <Ban className="w-3.5 h-3.5" /> {isBlocked ? 'Unblock' : 'Block'}
                </button>
              </div>
            </div>
          )}

          {/* Edit mode: social links editor */}
          {isEditing && (
            <div className="mt-4 pt-4 border-t border-[rgba(201,169,110,0.08)]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#5d4037] mb-2">Social Links (optional)</p>
              {editData.socialLinks.map((link, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="text" value={link.label} onChange={(e) => { const next = [...editData.socialLinks]; next[i] = { ...link, label: e.target.value }; setEditData({ ...editData, socialLinks: next }) }} placeholder="Label" className="flex-1 bg-[#0a0908] border border-[rgba(201,169,110,0.15)] px-2 py-1 text-xs text-[#f8f5f2] rounded focus:outline-none" />
                  <input type="text" value={link.url} onChange={(e) => { const next = [...editData.socialLinks]; next[i] = { ...link, url: e.target.value }; setEditData({ ...editData, socialLinks: next }) }} placeholder="https://..." className="flex-1 bg-[#0a0908] border border-[rgba(201,169,110,0.15)] px-2 py-1 text-xs text-[#f8f5f2] rounded focus:outline-none" />
                </div>
              ))}
              <button onClick={() => setEditData({ ...editData, socialLinks: [...editData.socialLinks, { label: '', url: '' }] })} className="text-[10px] text-[#8a7c6b] hover:text-[#c9a96e] transition">+ Add link</button>
            </div>
          )}
        </div>

        {/* Report confirmation */}
        {showReportConfirm && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl z-50" onClick={() => setShowReportConfirm(false)}>
            <div className="bg-[#14110f] border border-red-500/20 rounded-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-semibold text-[#f8f5f2]">Report {profile.displayName}?</h3>
              </div>
              <p className="text-xs text-[#8a7c6b] mb-4">Our moderators will review this report. You won't be identified to the reported user.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowReportConfirm(false)} className="flex-1 border border-[rgba(201,169,110,0.12)] text-[#8a7c6b] py-2 text-xs uppercase tracking-wider hover:text-[#f8f5f2] rounded-lg transition">Cancel</button>
                <button onClick={handleReport} className="flex-1 bg-red-600 text-white py-2 text-xs uppercase tracking-wider hover:bg-red-700 rounded-lg transition">Submit Report</button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Default dummy profile for testing ───
export const DUMMY_PROFILE: WriterProfile = {
  username: 'unknown',
  displayName: 'Unknown Writer',
  bio: '',
  joinDate: '',
  favoriteGenre: '',
  writingStatus: 'Writing',
  publicProjects: [],
  socialLinks: [],
}

export const OWNER_PROFILE: WriterProfile = {
  username: 'owner',
  displayName: 'Owner',
  bio: '',
  joinDate: '',
  favoriteGenre: '',
  writingStatus: 'Writing',
  publicProjects: [],
  socialLinks: [],
}
