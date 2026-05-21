import { ThemeProvider } from '@/components/ThemeProvider'
import GovernanceShell from '@/components/GovernanceShell'
import { PagesProvider } from '@/context/pages-context'
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
            <PagesProvider>
              <GovernanceShell>{children}</GovernanceShell>
            </PagesProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
