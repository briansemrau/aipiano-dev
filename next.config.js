/** @type {import('next').NextConfig} */

const CopyPlugin = require("copy-webpack-plugin");

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
        config.plugins.push(
            new CopyPlugin({
                patterns: [
                    {
                        from: 'node_modules/onnxruntime-web/dist/*.wasm',
                        to: (process.env.NODE_ENV === 'production') ? 'static/chunks/[name][ext]' : 'static/chunks/app/[name][ext]'
                    },
                ]
            })
        )
        return config
    }
}

module.exports = nextConfig
