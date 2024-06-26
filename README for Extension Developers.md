<div align="center" id="madewithlua">
    <img src="https://i.postimg.cc/NMggZYqR/Group-7.png" width=100>
</div>

<h1 align="center">DevX AI</h1>

# Hello World (React + Create React App)

This is an implementation of the default [Hello World](https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/hello-world) sample extension that demonstrates how to set up and use a [React](https://reactjs.org/) + [Create React App](https://create-react-app.dev/) + [Webview UI Toolkit](https://github.com/microsoft/vscode-webview-ui-toolkit) webview extension.

![A screenshot of the sample extension.](./assets/hello-world.png)

## Documentation

For a deeper dive into how this sample works, read the guides below.

- [Extension structure](./docs/extension-structure.md)
- [Extension commands](./docs/extension-commands.md)
- [Extension development cycle](./docs/extension-development-cycle.md)

## Run The Sample

```bash
# Copy sample extension locally
npx degit microsoft/vscode-webview-ui-toolkit-samples/frameworks/hello-world-react-cra hello-world

# Navigate into sample directory
cd hello-world

# Install dependencies for both the extension and webview UI source code
npm run install:all

# Build webview UI source code
npm run build:webview

# Open sample in VS Code
code .
```

Once the sample is open inside VS Code you can run the extension by doing the following:

1. Press `F5` to open a new Extension Development Host window
2. Inside the host window, open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and type `Hello World (React + CRA): Show`
