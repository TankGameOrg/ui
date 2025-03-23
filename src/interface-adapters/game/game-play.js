import { createSlice } from "@reduxjs/toolkit";

const foo = createSlice({
    name: "foo",
    initialState: { message: "Initial" },
    reducers: {
        doThing(state) {
            state.message = "Did thing updated";
        },
    },
});

export default foo.reducer;
export const {doThing} = foo.actions;
