"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { KeyRound } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { api } from "@/convex/_generated/api"

export function InviteAccept() {
  const accept = useMutation(api.users.acceptInvite)
  const router = useRouter()
  const { viewer } = useViewer()
  const [token, setToken] = React.useState("")
  const [pending, setPending] = React.useState(false)

  async function submit() {
    if (token.trim().length < 8) {
      toast("Token terlalu pendek")
      return
    }
    setPending(true)
    try {
      const next = await accept({ token: token.trim() })
      toast("Undangan diterima", {
        description: `Peran aktif: ${next.roles.join(", ")}.`,
      })
      setToken("")
      router.refresh()
      router.push("/ruang")
    } catch (error) {
      toast("Undangan gagal diterima", {
        description:
          error instanceof Error
            ? error.message
            : "Periksa token dan masa berlakunya.",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Undangan"
        title="Terima undangan peran."
        description="Tempel token yang dikirim pengelola. Token hanya berlaku untuk email akun ini dan tidak ditampilkan ulang."
        meta={
          <span className="text-[10px] text-ink-muted">
            {viewer?.email ?? "Sesi belum terbaca"}
          </span>
        }
      />

      <Panel eyebrow="Token" title="Aktifkan peran" className="max-w-xl">
        <div className="space-y-3">
          <div>
            <Label htmlFor="invite-token">Token undangan</Label>
            <Input
              id="invite-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-1.5 font-mono"
              autoComplete="off"
              spellCheck={false}
              placeholder="Tempel token dari pengelola"
            />
          </div>
          <p className="text-[10.5px] leading-relaxed text-ink-muted">
            Peran ditambahkan ke akun ini dan dicatat di log audit. Peran
            pengelola tidak mewarisi penilaian atau penjualan.
          </p>
          <Button
            onClick={() => void submit()}
            disabled={pending || token.trim().length < 8}
          >
            <KeyRound aria-hidden="true" />
            {pending ? "Memeriksa…" : "Terima undangan"}
          </Button>
        </div>
      </Panel>
    </div>
  )
}
