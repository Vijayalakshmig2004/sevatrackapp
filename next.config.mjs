/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_PUBLIC_EXPORT === 'true';

const nextConfig = {
  output: isExport ? 'export' : undefined,
  basePath: isExport ? '/sevatrackapp' : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

if (!isExport) {
  nextConfig.headers = async () => {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, 
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ];
  };
}

export default nextConfig;
