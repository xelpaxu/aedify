'use client'

import Image from 'next/image'
import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Camera, CheckCircle2, Loader2, Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { useAuth } from '@/src/lib/auth'

const BARANGAYS = ['Calumpang', 'San Juan', 'South Fundidor', 'Molo District']

const roleLabels: Record<string, string> = {
  'lgu-admin': 'LGU Administrator',
  'brgy-calumpang': 'Barangay Administrator · Calumpang',
  'brgy-sanjuan': 'Barangay Administrator · San Juan',
  'brgy-southfundidor': 'Barangay Administrator · South Fundidor',
  'sys-admin': 'System Administrator',
}

type ProfileForm = {
  firstName: string
  lastName: string
  phone: string
  location: string
  barangay: string
}

const emptyForm: ProfileForm = { firstName: '', lastName: '', phone: '', location: '', barangay: 'Molo District' }

export default function ProfilePage() {
  const { firebaseUser } = useAuth()
  const profile = useQuery(api.users.getUserByUid, firebaseUser ? { uid: firebaseUser.uid } : 'skip')

  if (!firebaseUser || profile === undefined) {
    return <div className="flex min-h-72 items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={28} /><span className="sr-only">Loading profile</span></div>
  }

  return <ProfileEditor key={profile?._id || firebaseUser.uid} profile={profile} />
}

type ProfileData = {
  _id?: Id<'users'>
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
  location?: string
  barangay?: string
  role?: string
  profileImageUrl?: string | null
} | null

function ProfileEditor({ profile }: { profile: ProfileData }) {
  const { user, firebaseUser } = useAuth()
  const generateUploadUrl = useMutation(api.users.generateProfileImageUploadUrl)
  const updateProfile = useMutation(api.users.updateFirebaseProfile)
  const names = (profile?.displayName || user?.displayName || '').trim().split(/\s+/)
  const [form, setForm] = useState<ProfileForm>(() => ({
    ...emptyForm,
    firstName: profile?.firstName || names[0] || '',
    lastName: profile?.lastName || names.slice(1).join(' '),
    phone: profile?.phone || '',
    location: profile?.location || '',
    barangay: profile?.barangay || 'Molo District',
  }))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('error'); setMessage('Please select an image file.'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus('error'); setMessage('Profile images must be smaller than 5 MB.'); return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setStatus('idle'); setMessage('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!firebaseUser || !form.firstName.trim() || !form.lastName.trim()) return
    setStatus('saving'); setMessage('')
    try {
      let profileImageId: Id<'_storage'> | undefined
      if (imageFile) {
        const uploadUrl = await generateUploadUrl()
        const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': imageFile.type }, body: imageFile })
        if (!response.ok) throw new Error('Image upload failed')
        profileImageId = (await response.json()).storageId as Id<'_storage'>
      }
      await updateProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || user?.email || '',
        ...form,
        ...(profileImageId ? { profileImageId } : {}),
      })
      setImageFile(null)
      setStatus('saved'); setMessage('Your profile has been updated.')
    } catch (error) {
      console.error('Profile update failed', error)
      setStatus('error'); setMessage('We could not save your profile. Please try again.')
    }
  }

  const imageSource = previewUrl || profile?.profileImageUrl || '/assets/logo/aedify.png'
  const role = profile?.role || user?.role || 'lgu-admin'

  return <div className="mx-auto w-full max-w-6xl pb-10 animate-fade-in-up">
    <div className="mb-7">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Account management</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Administrator profile</h1>
      <p className="mt-2 text-sm text-slate-500">Keep your command account and contact information current.</p>
    </div>

    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-lg ring-1 ring-slate-200">
          <Image src={imageSource} alt="Administrator profile" fill unoptimized className="object-cover" sizes="144px" />
        </div>
        <label className="mx-auto mt-5 flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2">
          <Camera size={16} /> Change photo
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} className="sr-only" />
        </label>
        <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">PNG, JPG, or WebP. Maximum 5 MB.</p>
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-3 rounded-2xl bg-teal-50 p-3.5 text-teal-800">
            <ShieldCheck size={20} className="shrink-0" />
            <div><p className="text-xs font-black">{roleLabels[role] || 'Administrator'}</p><p className="mt-0.5 text-[10px] text-teal-700">Authorized Aedify account</p></div>
          </div>
        </div>
      </aside>

      <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8"><h2 className="text-lg font-black text-slate-900">Personal information</h2><p className="mt-1 text-sm text-slate-500">Used for identification and operational communication.</p></div>
        <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <Field label="First name" icon={<UserRound size={16} />}><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="profile-input" autoComplete="given-name" /></Field>
          <Field label="Last name" icon={<UserRound size={16} />}><input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="profile-input" autoComplete="family-name" /></Field>
          <Field label="Email address" icon={<Mail size={16} />}><input value={firebaseUser?.email || user?.email || ''} disabled className="profile-input cursor-not-allowed bg-slate-50 text-slate-400" /><span className="mt-1.5 block text-[10px] text-slate-400">Managed by your sign-in account</span></Field>
          <Field label="Phone number" icon={<Phone size={16} />}><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="profile-input" placeholder="+63 900 000 0000" autoComplete="tel" /></Field>
          <Field label="Area of responsibility" icon={<MapPin size={16} />}><select value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} className="profile-input">{BARANGAYS.map((barangay) => <option key={barangay}>{barangay}</option>)}</select></Field>
          <Field label="Office / location" icon={<MapPin size={16} />}><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="profile-input" placeholder="Molo District Office" autoComplete="street-address" /></Field>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div aria-live="polite" className={`flex min-h-5 items-center gap-2 text-xs font-semibold ${status === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{status === 'saved' ? <CheckCircle2 size={16} /> : null}{message}</div>
          <button disabled={status === 'saving' || !firebaseUser} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">{status === 'saving' ? <><Loader2 size={16} className="animate-spin" />Saving...</> : 'Save changes'}</button>
        </div>
      </section>
    </form>
  </div>
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600">{icon}{label}</span>{children}</label>
}
