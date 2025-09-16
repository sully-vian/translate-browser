const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const { experiments } = require("webpack");

const distPath = path.resolve(__dirname, "dist");

const baseConfig = {
    entry: "./src/index.js",
    target: "web",
    resolve: {
        extensions: [".js"]
    }
}

// UMD Minified
const umdMinified = {
    ...baseConfig,
    output: {
        path: distPath,
        filename: "translate-browser.min.js",
        library: {
            name: "TranslateBrowser",
            type: "umd"
        },
        globalObject: "this"
    },
    mode: "production",
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()]
    }
};

const umdUnminified = {
    ...baseConfig,
    output: {
        path: distPath,
        filename: "translate-browser.js",
        library: {
            name: "TranslateBrowser",
            type: "umd"
        },
        globalObject: "this"
    },
    mode: "development",
    optimization: {
        minimize: false
    },
    devtool: false
};

const esmConfig = {
    ...baseConfig,
    output: {
        path: distPath,
        filename: "translate-browser.esm.js",
        library: {
            type: "module"
        }
    },
    experiments: {
        outputModule: true
    },
    mode: "production",
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()]
    }
}

module.exports = [umdMinified, umdUnminified, esmConfig];