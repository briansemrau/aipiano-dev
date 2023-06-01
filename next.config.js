/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const nextConfig = {
    assetPrefix: isProd ? '/aipiano' : '',
    images: {
        unoptimized: true,
    },
    webpack: (config) => {
        config.resolve.alias.canvas = false
        // allow loading audio files
        config.module.rules.push({
            test: /\.(ogg|mp3|wav|mpe?g)$/i,
            use: [
                {
                    loader: 'file-loader',
                    options: {
                        publicPath: '/_next/static/sounds/',
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
