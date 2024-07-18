import path from "node:path";
import childProcess from "node:child_process";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";
const { DefinePlugin } = webpack;

const { pathname } = new URL(import.meta.url);
const uiDirname = path.dirname(pathname);

// Collect version info
function getBuildInfo() {
    return childProcess.spawnSync(`"${uiDirname}/scripts/get-version" webpack`, { shell: true })
        .stdout.toString("utf-8")
        .replace(/(\r|\n)/g, "");
}

const buildInfo = process.env.BUILD_INFO || getBuildInfo();


export function webpackConfig({ appName, configFileUrl, jsxExclude }) {
    const version = `${appName} ${buildInfo}`;

    const { pathname } = new URL(configFileUrl);

    return {
        mode: process.env.NODE_ENV ?? "development",
        devtool: "source-map",
        entry: "./src/ui/index.jsx",
        output: {
            path: path.resolve(path.dirname(pathname), "dist"),
            filename: "tank-game.js",
        },
        plugins: [
            new DefinePlugin({
                "APP_VERSION": `"${version}"`,
                "BUILD_INFO": `"${buildInfo}"`,
            }),
            new HtmlWebpackPlugin({ title: "Tank Game", publicPath: "/" }),
        ],
        devServer: {
            static: {
                directory: path.join(uiDirname, "public"),
            },
            port: process.env["port"] ?? 3000,
            proxy: [
                {
                    context: ["/api/"],
                    target: "http://localhost:3333",
                }
            ],
            historyApiFallback: {
                index: "/",
            }
        },
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    exclude: jsxExclude,
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                ["@babel/preset-env", { targets: "defaults" }]
                            ],
                            plugins: [
                                ["@babel/plugin-transform-react-jsx", {
                                    "runtime": "automatic",
                                    "importSource": "preact",
                                }]
                            ]
                        }
                    }
                },
                {
                    test: /\.css$/,
                    use: ["style-loader", "css-loader"],
                },
            ]
        },
        resolve: {
            alias: {
                "react": "preact/compat",
                "react-dom/test-utils": "preact/test-utils",
                "react-dom": "preact/compat",
                "react/jsx-runtime": "preact/jsx-runtime",
                "#platform": path.resolve(uiDirname, "src/drivers/platforms/web"),
            },
        }
    };
}


export default function uiWebpackConfig() {
    return webpackConfig({
        appName: "TankGameUI",
        configFileUrl: import.meta.url,
        jsxExclude: /node_modules/,
    });
}