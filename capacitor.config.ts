import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.sevatrack.portal",
  appName: "SevaTrack",
  webDir: "out",
  server: {
    url: "https://grievance-redressal-portal-eta.vercel.app",
    cleartext: false
  }
}

export default config
