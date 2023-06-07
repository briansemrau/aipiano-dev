import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'

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
