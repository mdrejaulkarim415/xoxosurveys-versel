'use client'

import { useState, useEffect } from 'react'

const DEFAULT_TELEGRAM = 'XoXoSurveysSupport'

let cachedUsername: string | null = null

export function useTelegramUsername() {
  const [username, setUsername] = useState(cachedUsername || DEFAULT_TELEGRAM)

  useEffect(() => {
    // If already cached, no need to fetch
    if (cachedUsername) return

    let cancelled = false

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.telegramSupportUsername) {
          cachedUsername = data.telegramSupportUsername
          setUsername(data.telegramSupportUsername)
        }
      })
      .catch(() => {
        // Use default on error
      })

    return () => { cancelled = true }
  }, [])

  return username
}
