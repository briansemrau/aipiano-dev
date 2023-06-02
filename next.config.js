/** @type {import('next').NextConfig} */

const basePath = process.env.BASE_PATH || '/aipiano'

const nextConfig = {
    basePath: basePath,
    assetPrefix: `${basePath}/`,
    images: {
        unoptimized: true,
    },
    output: 'export',
    webpack: (config) => {
        config.resolve.alias.canvas = false
        // allow loading audio files
        config.module.rules.push({
            test: /\.(ogg|mp3|wav|mpe?g)$/i,
            use: [
                {
                    loader: 'file-loader',
                    options: {
                        publicPath: `${basePath}/_next/static/sounds/`,
                        outputPath: 'static/sounds/',
                        name: '[name].[ext]',
                        esModule: false,
                    },
                },
            ],
        })
        return config
    }
}

module.exports = nextConfig
