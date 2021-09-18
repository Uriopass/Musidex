module.exports = {
    webpack: {
        configure: (webpackConfig, { env, paths }) => ({
            ...webpackConfig,
            resolve: {
                ...webpackConfig.resolve,
                symlinks: false
            }
        })
    }
}