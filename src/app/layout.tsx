import './globals.css'
import { Inter } from 'next/font/google'

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
      <body className={inter.className}>
        <script async src="/static/github-pages-coop-coep-workaround.js"></script>
        {children}
      </body>
    </html>
  )
}
