import { PortalHeader } from "../../components/portal";



export default function Layout({ children }) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${serif.variable} ${sans.variable}`}>
        <PortalHeader />
        {children}
      </body>
    </html>
  )
}