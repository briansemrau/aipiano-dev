'use client'
import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { useEffect } from 'react'

const basePath = process.env.BASE_PATH || '/aipiano'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AI Piano',
  description: 'Generates and plays piano music generated in the browser.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (window.crossOriginIsolated) {
        console.log("Cross-Origin Isolation is enabled. Skipping COOP/COEP Service Worker.")
        return
      }
      if (!window.isSecureContext) {
        console.log("Not in a secure context. Skipping COOP/COEP Service Worker.")
        return
      }
      navigator.serviceWorker.ready.then((registration) => {
        console.log("COOP/COEP Service Worker is ready.")
      })
      navigator.serviceWorker
        .register(`${basePath}/coi-serviceworker.js`)
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            console.log("Reloading page to make use of updated COOP/COEP Service Worker.");
            window.location.reload();
          });

          // If the registration is active, but it's not controlling the page
          console.log(registration)
          
          if (registration.active && !navigator.serviceWorker.controller) {
            //console.log("Reloading page to make use of COOP/COEP Service Worker.");
            //window.location.reload();
          }
        }).catch((error) => console.error("COOP/COEP Service Worker registration failed:", error))
    }
  }, [])
  return (
    <html lang="en" className="dark">
      <head>
        {/* <Script strategy='beforeInteractive' src={`${basePath}/github-pages-coop-coep-workaround.js`} /> */}
        {/* <Script strategy='beforeInteractive' src={`${basePath}/coi-serviceworker.js`} /> */}
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
