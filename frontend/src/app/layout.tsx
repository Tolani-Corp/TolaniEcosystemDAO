import { ThemeProvider } from '@/components/ThemeProvider'
import GovernanceShell from '@/components/GovernanceShell'
import { Providers } from '@/components/providers'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[var(--bg-page)] text-[var(--text-primary)] antialiased transition-colors duration-300">
        <Providers>
          <ThemeProvider>
            <GovernanceShell>{children}</GovernanceShell>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
