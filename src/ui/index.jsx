/* global document, module */
import "./index.css";
import { render } from "preact";
import { App } from "./App.jsx";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { reducers } from "../interface-adapters/game/index.js";


let store = configureStore({
    reducer: reducers,
});

function renderApp() {
    render((
        <Provider store={store}>
            <App></App>
        </Provider>
    ), document.body);
}

renderApp();

if(module.hot) {
    module.hot.accept(["./App.jsx", "../interface-adapters/game/index.js"], () => {
        store.replaceReducer(reducers);
        renderApp();
    });
}
